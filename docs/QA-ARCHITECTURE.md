# QA architecture — gates and nets

The whole quality pipeline in one picture. The core distinction: **gates block** (a red gate stops
a change before it reaches `main`), while **nets observe** (they run after the fact and report,
tuned to tolerate noise so they don't cry wolf). Getting the reglaj right — zero tolerance on
gates, budgets-with-headroom on nets — is a deliberate design choice, not an accident.

```mermaid
flowchart TD
    subgraph PRE["Before merge — GATES (block)"]
        PR["Pull request"] --> E2E["e2e\nvalidate build → 2 shards → merge report\n(required check)"]
        PR --> CFP["Cloudflare builds\na preview deployment"]
        CFP --> SP["smoke-preview\nwait-for-preview → 7 smoke\n+ Lighthouse shift-left (informational)"]
        E2E -. on failure .-> TRIAGE["ai-triage agent\ncomments a likely cause on the PR\n(helper, via workflow_run)"]
    end

    E2E --> MERGE{{"merge to main\n(branch-protected)"}}
    SP --> MERGE

    MERGE --> DEPLOY["Cloudflare Pages\ndeploys production (CD)"]

    subgraph POST["After deploy — NETS (observe)"]
        DEPLOY --> SPROD["smoke-prod\nwait-for-deploy → 7 smoke\n→ Lighthouse budgets"]
    end

    subgraph SCHED["Scheduled / manual"]
        ZAP["zap-baseline\nweekly · passive · tripwire"]
        K6["perf-k6\nmanual · CDN latency"]
        EVALS["evals\nmanual · agentic pass-rate"]
    end

    DEPS["Dependabot\nproposes updates"] -.-> PR

    classDef gate fill:#6b1f3a,stroke:#4a1526,color:#fff;
    classDef net fill:#2e5e3a,stroke:#1e3f27,color:#fff;
    classDef helper fill:#7a5c1e,stroke:#5a4315,color:#fff;
    class E2E,SP gate;
    class SPROD,ZAP net;
    class TRIAGE,EVALS,K6,DEPS helper;
```

## Reading it

- **Gates (wine):** `e2e` and `smoke-preview` run on every PR; `main` is branch-protected, so a red
  gate physically stops the merge. Zero tolerance — these must be green.

  "Blocks the merge" is a claim about **configuration**, not about intent, so here is the
  configuration it rests on. The required status checks on `main` are exactly:
  `validate build`, `test (shard 1/2)`, `test (shard 2/2)`, `preview smoke`.
  Anything not on that list runs and reports but does not block, however gate-like it looks in a
  diagram. `smoke-preview` spent a while in precisely that state: the workflow had been repaired
  after it was found never to fire, but it was never added to the required list, so it ran green
  and stopped nothing. Verify this list against the branch-protection settings, not against the
  existence of a workflow file — a workflow and a rule that enforces it are two different things.
- **Nets (green):** `smoke-prod` re-checks the live site after deploy; `zap-baseline` scans weekly.
  They report and, where budgets apply, fail only on hard regressions — headroom is built in so
  network noise doesn't raise false alarms.
- **Helpers (gold):** the `ai-triage` agent (explains a failure), `evals` (agentic pass-rate),
  `perf-k6` (latency baseline), and Dependabot (proposes updates) assist but never block on noise.

## The one rule

Measure first, then set thresholds below the measurement so real problems ring the alarm and noise
doesn't — and audit the pipeline itself, because a gate that never runs is worse than no gate: it
looks like coverage while providing none.
