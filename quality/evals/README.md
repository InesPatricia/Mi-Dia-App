# evals/ — a runnable agentic-AI eval harness

A small, self-contained example of **how you test a non-deterministic LLM task** — the method the
QA-for-agentic-AI role needs, made concrete. It complements the theory in
[`../docs/AGENTIC-QA.md`](../docs/AGENTIC-QA.md): here it actually runs.

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
     what property checks can't see. (Caveat: the judge itself must be trusted; its rubric is kept
     tight and its verdicts are checkable against the references.)
- The suite passes if the pass-rate is at or above the floor (default 80%), mirroring how the k6
  layer uses p(95) instead of the mean.

**Run it**
```bash
export ANTHROPIC_API_KEY=sk-...     # or set it as a GitHub Actions secret
node evals/run.mjs                  # prints a table + pass-rate; exits non-zero below the floor
```
Or trigger the `evals` workflow (Actions → evals → Run workflow). Without the key, it cleanly
no-ops — a missing key is never a red build.

**Honest scope:** this is a *demonstration* of eval methodology on a representative task, not a
test of the shipped app (which has no agent). Next steps a real product would add: guardrail /
prompt-injection cases, trajectory checks (which tools an agent called), and cost/latency budgets.
