# Agentic AI in this project's QA

This repo uses AI agents in its quality process, and documents how one would *test* an agentic
system. Two distinct things — kept separate on purpose, because interviews conflate them:

- **Part 1 — AI *as a QA tool*:** agents that help test this app (a failure-triage agent; the
  native Playwright planner/generator/healer).
- **Part 2 — testing *an agentic system*:** the principles and vocabulary for QA'ing a product
  that is itself built on LLM agents.

> **Honest scope note (same style as the README):** the agents below are *assistants with a human
> in the loop*, not autonomous deciders. The triage agent proposes a hypothesis; a person still
> reads it. The Playwright agents draft and repair tests; a person still reviews the diff and the
> deterministic e2e suite remains the source of truth. AI here reduces toil and shortens the loop
> — it does not replace the gates.

---

## Part 1 — AI as a QA tool in this repo

### 1a. The failure-triage agent (`ai-triage.yml` + `scripts/ai-triage.mjs`)

**What it does.** When the `e2e` suite fails on a pull request, the agent reads two artifacts —
the **PR diff** ("what changed") and the **failing test logs** ("what broke") — asks Claude to
correlate them, and posts one PR comment: likely cause, most suspect file, local repro steps, and
a confidence level. It updates that same comment on re-runs instead of stacking new ones.

**Why it is genuinely "agentic".** It *perceives* real state (logs, diff), *reasons* over it, and
*acts* in the world (comments on the PR), triggered by an event, with a human in the loop. That is
a small but real autonomous agent — not just a chatbot.

**The security decision (the interview-grade part).** It is triggered by `workflow_run`, **not**
`pull_request`. A `workflow_run` job executes the workflow file from the **default branch**, so the
API-key secret and the write permission are never reachable by a hostile PR that edits the workflow.
Principle: **untrusted input (the PR) is processed by trusted code (from `main`)** — a form of
privilege separation. Getting this wrong is a real, documented way secrets get stolen from CI.

**Fail-safe by design.** No `ANTHROPIC_API_KEY` secret → the script logs "no key" and exits 0. Any
error is caught and the run still succeeds. A broken *helper* must never turn a PR red — only the
real gates do that.

**To enable it:** add an `ANTHROPIC_API_KEY` secret in *Settings → Secrets and variables → Actions*.
Until then the workflow runs and cleanly no-ops.

### 1b. The native Playwright agents (`e2e/.claude/agents/`)

Playwright 1.61 ships three agent definitions, scaffolded here with
`npx playwright init-agents --loop claude`. They drive the `playwright-test` MCP server (see
`e2e/.mcp.json`), which gives the agent real browser tools (navigate, snapshot, run a test, read
console). Each is a Markdown file with a role, a toolset, and instructions:

| Agent | Role | Use it when |
|---|---|---|
| **planner** | Explores the app and writes a **test plan** (Markdown in `specs/`) | You want structured coverage before writing code |
| **generator** | Turns a plan into **real Playwright specs** | You have a plan and want the tests written |
| **healer** | Debugs a **failing** test using live browser tools and proposes a fix | A test breaks and you want a first-pass repair |

**How this pairs with what already exists.** The 85-test suite is hand-authored and deterministic —
that stays the trustworthy core. The agents are for *speed at the edges*: drafting a plan for a new
feature, generating first-pass specs to refine, or proposing a repair for a flaky/broken test that a
human then verifies. This is the "self-healing tests" idea, grounded — with the deterministic suite
as the safety net, never replaced by the agent.

> **Portability note:** `e2e/.mcp.json` was generated on Windows and wraps the server in `cmd /c`.
> On macOS/Linux use `"command": "npx", "args": ["playwright", "run-test-mcp-server"]`.

---

## Part 2 — How to test an *agentic AI system*

If the product under test is itself built on LLM agents, classic assertions break. The good news:
the *principles* are the ones already used in this repo — baseline, thresholds with tolerance,
triage, fail-loudly — only the object being measured is now probabilistic. The bridge:

| Classic QA here | Agentic-AI equivalent |
|---|---|
| `expect(text).toBe('X')` (deterministic) | **Property assertions** — output *contains* the right data, is under N words, invents no fields |
| p(95) threshold, not the mean (k6) | **Eval pass-rate** over a set, not a single case: "≥95% of the golden set correct" |
| Measured baseline → budget | **Golden dataset** of inputs with reference answers, scored repeatedly release-over-release |
| Smoke checks the console, not just the page | **Trajectory testing** — assert the *steps* an agent took (which tools, in what order), not only the final answer |
| ZAP tripwire (new alert = red) | **Guardrail tests** — try to push the agent off-course (prompt injection, forbidden output) and assert it refuses |

**Key concepts, defined:**

- **Non-determinism** — the same input can produce different output each run; you cannot assert exact
  equality, so you assert *properties* (schema valid, contains X, length bound, no hallucinated field).
- **Evals** — the "tests" of an AI system: a **golden dataset** (inputs + reference/acceptable
  answers) run repeatedly, scored in aggregate (a pass-rate), not a single binary check.
- **LLM-as-judge** — using a model to grade another model's output against a rubric; powerful but the
  judge itself must be calibrated (spot-check its verdicts against human judgement).
- **Trajectory** — for agents, the *path* matters: which tools were called, with what arguments, in
  what order. A right answer reached by a wrong/unsafe path can still be a failure.
- **Guardrails** — the safety rules (no secrets leaked, no destructive tool call, refuse injected
  instructions). **Prompt injection** — untrusted text that tries to be read as a command — is the
  agentic cousin of XSS/SQL injection: the same "input treated as instruction" failure, one layer up.
- **Cost & latency** — real, testable non-functional requirements for agentic products (tokens per
  task, tool-call count, wall-clock), the way p(95) and payload size are here.

**Interview one-liner (bridges the whole portfolio):** *"The principles carry over from classic QA —
baseline, thresholds with noise tolerance, triage, fail loudly — only the object is probabilistic.
Where I put a p(95) threshold on k6 instead of asserting the mean, on an agent I put a pass-rate
threshold on an eval set instead of asserting exact output; where a smoke test checks the console,
an agent test checks the tool-call trajectory."*
