# evals/ — a runnable agentic-AI eval harness

A small, self-contained example of **how you test a non-deterministic LLM task** — the method the
QA-for-agentic-AI role needs, made concrete. It complements the theory in
[`../../docs/AGENTIC-QA.md`](../../docs/AGENTIC-QA.md): here it actually runs, and it has been run.

**Subject under test:** an extractor that turns a planning sentence ("Coffee with Ana at 3pm")
into structured JSON `{title, time, category}` — a task from the app's own day-planner domain.
The app ships no LLM; this exists to demonstrate the method.

**What it shows**
- `dataset.json` — a **golden dataset**: inputs + reference answers + the properties each output must hold.
- `run.mjs` — scores every case two ways and requires a **pass-rate**, not a per-case pass:
  1. **Property assertions** (deterministic): valid JSON, `category` in the allowed set, a time
     present only when one is implied. We assert *properties*, never exact strings, because the
     output is non-deterministic.
  2. **LLM-as-judge**: a second model call grades semantic correctness against the reference — for
     what property checks can't see.
- The suite passes if the pass-rate is at or above the floor (default 80%), mirroring how the k6
  layer uses p(95) instead of the mean.

**Two things the judge design gets right, and one it doesn't**
- The judge runs **only on structurally valid answers** — no point paying a model to grade JSON that
  already failed a property check.
- `EVAL_JUDGE_MODEL` lets the judge be a **different model from the subject**. A model grading its
  own output has a self-preference bias, which inflates the pass-rate exactly where you need
  honesty. Same-model judging is the default only because a single key must still work.
- It is **not calibrated**. Its verdicts have not been scored against human judgement over a set.
  Until they are, the judge is a useful second opinion, not an authority — which is why every run
  writes `last-run.json` with each case's actual output beside its verdict, so the judge can be
  contradicted.

## Providers

The harness is a **method, not a vendor**. Both transports sit behind one `chat()` seam, so the same
dataset and the same scoring can be pointed at a different model to compare them.

| Env var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` | whichever is set picks the provider (Anthropic wins if both) |
| `EVAL_PROVIDER` | `anthropic` \| `openrouter`, to force one |
| `EVAL_MODEL` | the model under test |
| `EVAL_JUDGE_MODEL` | the judge; defaults to `EVAL_MODEL` |
| `EVAL_THRESHOLD` | pass-rate floor, `0..1` (default `0.8`) |
| `EVAL_MAX_TOKENS` | answer budget (default `1200`) — see the reasoning-token note below |
| `EVAL_LIMIT` | run only the first N cases: smoke-test the harness without paying for the set |

**Run it**
```bash
# put the key in .env.local (gitignored) — OPENROUTER_API_KEY=... or ANTHROPIC_API_KEY=...
node --env-file=.env.local quality/evals/run.mjs
node quality/evals/run.mjs --list-free      # which OpenRouter models cost nothing today
```
Or trigger the `evals` workflow (Actions → evals → Run workflow). Without a key, it cleanly
no-ops — a missing key is never a red build.

`--list-free` exists because OpenRouter's free slugs are renamed and retired constantly: the first
default written into this file was already dead when it was first run. Same rule as the test count —
**derive the answer, don't write it down.**

## What the first real run found

Scored `inclusionai/ling-3.0-tiny:free`, judged by `openai/gpt-oss-20b:free`: **9/10, a 90%
pass-rate against an 80% floor.** Three defects surfaced, and all three were in the harness, not in
the models:

1. **An em dash in an HTTP header.** `X-Title` carried `—` (U+2014); header values are ByteString,
   so `fetch` threw before a single request left the machine and all ten cases failed identically.
   A uniform failure across a whole suite is never a finding about the subject.
2. **The token budget starved reasoning models.** `max_tokens` was an unexamined constant of 400,
   and reasoning tokens are spent from the *same* budget (`usage.completion_tokens_details.
   reasoning_tokens`). The model hit the cap mid-thought and returned empty content — intermittently,
   so it looked like an unstable model rather than a harness setting.
3. **A libuv assertion on exit.** `process.exit()` with a socket still open replaced the real exit
   code with a crash on Windows. A harness that lies about its own exit code is worse than none.

Deliberately **not** done: reading the answer out of the model's `reasoning` field when `content`
came back empty, even though the JSON was often sitting right there. The contract under test is what
the model returns *as its answer*, not what it thought on the scratchpad.

The single failing case is the interesting one. `"Read my book for an hour tonight"` was classified
`learning` against a reference of `rest` — a genuine taxonomy ambiguity, not a bug. It stays in the
set on purpose: **a golden dataset with no ambiguous case is lying about how hard the task is**, and
it is the living argument for scoring a rate rather than demanding per-case equality.

Model selection turned out to be a measurable decision rather than a preference. Of six free models
probed on one trivial JSON request: two returned clean JSON (1.1 s and 8.9 s), one leaked its
chain-of-thought into `content`, one returned `content: null` with the answer in `reasoning`, one was
429 from a shared upstream pool, and one answered correctly in 30 seconds. Cost and latency are
testable non-functional requirements, the same way `p(95)` is in the load layer.

**Honest scope:** this is a *demonstration* of eval methodology on a representative task, not a test
of the shipped app (which has no agent). One run of ten cases is also not a baseline — the 80% floor
is still a reasonable guess, not a measured threshold, and deriving it needs several runs the way the
performance budgets were derived. Next steps a real product would add: guardrail / prompt-injection
cases, trajectory checks (which tools an agent called), and cost/latency budgets.
