# QA architecture — gates and nets

The whole quality pipeline in one picture. The core distinction: **gates block** (a red gate stops
a change before it reaches `main`), while **nets observe** (they run after the fact and report,
tuned to tolerate noise so they don't cry wolf). Getting that calibration right — zero tolerance on
gates, budgets-with-headroom on nets — is a deliberate design choice, not an accident.

```mermaid
flowchart TD
    subgraph PRE["Before merge — GATES (block)"]
        PR["Pull request"] --> E2E["e2e\nvalidate build → 2 shards → merge report\n(required check)"]
        PR --> CFP["Cloudflare builds\na preview deployment"]
        CFP --> SP["smoke-preview\nwait-for-preview → 7 smoke\n+ Lighthouse shift-left (informational)"]
        PR --> DOCS["docs\ncheck-docs 9 rules + its own 27 tests\n(reports, not required)"]
        E2E -. on failure .-> TRIAGE["ai-triage agent\ncomments a likely cause on the PR\n(helper, via workflow_run)"]
    end

    E2E --> MERGE{{"merge to main\n(branch-protected)"}}
    SP --> MERGE

    MERGE --> DEPLOY["Cloudflare Pages\ndeploys production (CD)"]

    subgraph POST["After deploy — NETS (observe)"]
        DEPLOY --> SPROD["smoke-prod\nwait-for-deploy → 7 smoke\n→ Lighthouse budgets"]
        DEPLOY --> VL["verify-live\nrendered README + published boundary\nweekly too, for link rot"]
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
    class SPROD,ZAP,VL net;
    class TRIAGE,EVALS,K6,DEPS,DOCS helper;
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
- **Nets (green):** `smoke-prod` re-checks the live site after deploy; `verify-live` opens the
  published README in a real browser and asks the live site which paths it actually serves;
  `zap-baseline` scans weekly. They report and, where budgets apply, fail only on hard regressions —
  headroom is built in so network noise doesn't raise false alarms.

  `verify-live` cannot be a gate, and the reason is worth stating: both things it looks at only
  exist *after* a merge. GitHub renders the README from the default branch, and Cloudflare publishes
  on push. It also draws the gate/net line inside itself. A file served by the **origin** means the
  `public/` boundary broke, which is a defect in this repository, so it fails. A file served only
  from the **CDN's cache** is a copy taken before that file was withdrawn, expiring under a TTL
  nothing here can shorten — so it warns, with the hours remaining, and the run stays green. Failing
  over something nobody can act on is how a check gets ignored on the day it matters.
- **Helpers (gold):** the `ai-triage` agent (explains a failure), `evals` (agentic pass-rate),
  `perf-k6` (latency baseline), Dependabot (proposes updates), and `docs` assist but never block.

  **`docs` is in the helper column deliberately, and that is a finding rather than a design.** The
  workflow does fail on a broken rule, and it runs on every pull request — but it is not on the
  required-checks list, so a red run reports and stops nothing. By this document's own standard that
  makes it a reporter, not a gate. Adding `check docs` to the required checks is a settings change,
  not a code change, and it is the one thing that would make the documentation genuinely gated
  rather than merely checked.

## The one rule

Measure first, then set thresholds below the measurement so real problems ring the alarm and noise
doesn't — and audit the pipeline itself, because a gate that never runs is worse than no gate: it
looks like coverage while providing none.
