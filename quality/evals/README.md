# evals/ · a runnable agentic-AI eval harness

A small, self-contained example of how you test a non-deterministic LLM task. It is the companion to
the theory in [`../../docs/AGENTIC-QA.md`](../../docs/AGENTIC-QA.md), except this one runs, and has
been run, which turns out to be a meaningfully different claim.

**Subject under test:** an extractor that turns a planning sentence ("Coffee with Ana at 3pm") into
structured JSON `{title, time, category}`, a task borrowed from the app's own day-planner domain. The
app itself ships no LLM. This exists to show the method.

## How a case is scored

1. **Property assertions**, deterministic and free. Valid JSON, a non-empty title, a category from
   the allowed set, a time present only when the sentence implies one, and no fields beyond the
   three in the schema. That last one matters, since a model that helpfully adds `location` has
   quietly stopped answering the question it was asked. Exact string matching never appears, because
   the output is probabilistic and an exact-match suite would spend its life being flaky.
2. **LLM-as-judge.** A second model reads the answer against the reference and returns a verdict with
   a reason. It only sees answers that already passed the property checks, since paying a model to
   grade broken JSON is a strange hobby.

The suite passes on an aggregate **pass-rate floor**, default 80%, mirroring how the k6 layer asserts
p(95) rather than the mean.

## The judge, and what keeps it honest

`EVAL_JUDGE_MODEL` points the judge at a different model from the subject, because a model marking
its own homework grades generously. Every run writes each case's real output beside its verdict, so
the judge can be contradicted by anyone who cares to look.

It has **never been calibrated** against human verdicts over a set. Until it is, treat it as a useful
second opinion with a well-argued voice.

## Proof it runs

[`sample-run.json`](sample-run.json) is a real captured run of the full set, `openai/gpt-oss-20b:free`
answering and `nvidia/nemotron-3-super-120b-a12b:free` judging, scoring 9 of 10 against the 80%
floor. Here is the judge doing its job on a case the property checks had already cleared:

```json
{ "id": "dentist", "status": "pass",
  "got": { "title": "Dentist appointment", "time": "10:15", "category": "health" },
  "judge": { "correct": true,
             "reason": "Model answer matches reference answer exactly; title captures activity,
                        time and category match the intent" }
}
```

"Dentist appointment at quarter past ten" became `10:15`, which no property assertion could have
confirmed on its own. That is the whole reason the second layer exists.

The one failure is the interesting row:

```json
{ "id": "read-evening", "status": "fail",
  "got": { "title": "Read my book", "time": null, "category": "learning" },
  "detail": "category learning != rest" }
```

The sentence was "Read my book for an hour tonight". Every property holds and the disagreement is
purely about taxonomy, since the model files reading under learning while the reference calls it
rest. It stays in the dataset on purpose. A golden set where every answer is obvious is flattering
itself, and this case is the living argument for scoring a rate instead of demanding per-case
equality.

Earlier runs make the same point from the other direction. A smaller model dropped the "3pm" from
"Coffee with Ana at 3pm" on one run after getting it right twice that morning. Same input, same
prompt, different answer, which is exactly why the gate is a floor over a set.

## Who tests the scorer

```bash
node quality/evals/run.mjs --self-test    # 13 fixtures, no key, no model, about a second
```

The harness scores a probabilistic system, so its own scorer had better be deterministic and
correct. Thirteen fixtures push made-up answers through the property checks and the JSON parser, and
assert the verdict each one deserves, including an invented `location` field, a hallucinated time, a
category from outside the set, and a model that replies with an apology instead of JSON. They need no
API key, which is why they gate every pull request while the eval itself stays a manual run.

It was armed by breaking it. Removing the invented-field check turns the run red with exit 1, which
is the only evidence that a green result ever meant anything.

## Three outcomes, so a red build means one thing

| Exit | Meaning |
|---|---|
| `0` | at or above the floor |
| `1` | the model dropped below the floor, which is a real regression |
| `2` | too little of the set was measurable, so the run is `INCONCLUSIVE` |

A rate limit, a 5xx or a request that never left the machine is tagged `INFRA`, leaves the
denominator, and gets reported separately. Scoring those as wrong answers is how a rate-limited
afternoon gets mistaken for a model regression. This has already paid for itself twice, once when the
free-tier daily quota ran out mid-run, and once when a stray em dash in an HTTP header made every
single request throw before it left the laptop.

## Running it

```bash
# key goes in .env.local (gitignored): OPENROUTER_API_KEY=... or ANTHROPIC_API_KEY=...
node --env-file=.env.local quality/evals/run.mjs
EVAL_LIMIT=2 node --env-file=.env.local quality/evals/run.mjs  # 4 requests, about 40 seconds
node quality/evals/run.mjs --list-free                         # which models cost nothing today
```

Or trigger the `evals` workflow from Actions. With no key at all it prints how to enable itself and
exits 0, because a missing secret should never turn a build red.

`--list-free` exists because OpenRouter renames and retires free slugs constantly. The first default
written into this file was already dead by the time it first ran, which felt like a fair warning.
Same rule as the test count, ask the source instead of writing the answer down.

| Env var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` | whichever is set picks the provider, Anthropic wins if both |
| `EVAL_PROVIDER` | `anthropic` or `openrouter`, to force one |
| `EVAL_MODEL` | the model under test |
| `EVAL_JUDGE_MODEL` | the judge, defaults to `EVAL_MODEL` |
| `EVAL_THRESHOLD` | pass-rate floor, `0..1`, default `0.8` |
| `EVAL_MIN_COVERAGE` | how much of the set must be measurable before a verdict is allowed, default `0.8` |
| `EVAL_MAX_TOKENS` | answer budget, default `1200` |
| `EVAL_LIMIT` | run only the first N cases, to smoke-test the runner cheaply |

The token budget has a story. It used to be 400, and reasoning models kept returning empty content
at random, which looked like an unstable model until the usage figures showed reasoning tokens
coming out of the same allowance as the answer. The instrument was starving them.

Empty responses get retried before anything is concluded from them. Free pools hand back a 200 with
no content now and then, and the identical request usually succeeds seconds later. An empty response
holds no answer, so it cannot be a wrong answer, and that is what makes retrying it fair. Retrying a
missing answer is legitimate, retrying a wrong one would be gaming the result. If it never fills in,
the case is reported as unmeasurable rather than blamed on the model.

One thing deliberately left undone. When a model returns empty content with perfectly good JSON
sitting in its `reasoning` field, the harness still refuses to use it. The contract under test is
what the model hands over as its answer, and reading its scratchpad would be marking work it never
submitted.

## Honest scope

This demonstrates eval methodology on a representative task. It is not a test of the shipped app,
which has no agent in it. One run of ten cases is also not a baseline, so the 80% floor remains a
reasonable guess rather than a measured threshold, and deriving it properly needs several runs, the
way the performance budgets were derived. Still on the list: guardrail and prompt-injection cases,
trajectory checks over which tools an agent called, and cost and latency treated as budgets.
