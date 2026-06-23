# Testing notes — Smoke vs Sanity (and on complex systems)

> Reference notes (general testing theory + how it maps to Mi Día). Not a spec — the
> project's concrete test setup lives in `CLAUDE.md` ("Test harness" section).

## 1. Definitions
- **Smoke** = "is it up? did the build boot?" — **broad and shallow**, many screens, zero depth,
  fast, usually **read-only**. Catches catastrophic / deploy-level failures.
- **Sanity** = "does it work? do the critical flows behave correctly?" — **narrow and deep**, a few
  flows verified seriously, **writes/reads data**, touches integrations. Catches **logic / business**
  regressions.
- **Full regression** = everything else (rare, optional, heavy cases) — the complete net, pre-merge.

## 2. The key idea: which variable are you testing
- **Code** is pinned early (unit/integration/regression in CI) and via an **immutable artifact**
  (the same build/hash promoted across all environments).
- **Environment** (config, secrets, DB, integrations, scale, network) is the variable that remains →
  that is why you re-test **per environment**, not per code change.
- Spatial rule: **the closer to prod, the more realistic, the thinner, and the more non-destructive**;
  the further left, the more controlled and the deeper.

## 3. Smoke vs Sanity — concrete differences
| Criterion | Smoke | Sanity |
|---|---|---|
| Question | is it up? | does it work? |
| Depth | shallow, broad | deep, narrow |
| Writes data? | no (or trivial) | yes (test accounts + cleanup) |
| Real integrations? | only a "they're up" ping | yes (Stripe sandbox, SMTP, queues) |
| Duration | seconds | minutes (webhooks, async) |
| A failure means | deploy/infra broken → **rollback** | a business flow is broken → investigate |
| How many | many, superficial | few, chosen (the "if this breaks, we're down" ones) |

## 4. On complex systems: what runs where
| Environment | Tests | Gates? | Why |
|---|---|---|---|
| Local/dev | unit, component | — | feedback in seconds |
| **CI (pre-merge)** | unit + integration + most regression (mocks) | **YES** (gate merge) | catch logic regressions cheaply |
| **Staging (prod-like)** | smoke + **sanity** + E2E on real integrations + contract + perf + security | **YES** (gate promotion) | first env with real config+integrations → here "does it transfer?" becomes a test |
| **Canary / blue-green** | smoke + thin sanity on a small % + metrics | **YES** (auto-rollback) | real prod infra, small blast radius |
| **Prod (100%)** | post-deploy smoke + **synthetic monitoring** + alerting | informational + alarm | confirm delivery, don't re-prove logic |

## 5. "Does pre-merge sanity transfer to prod?"
- **Don't assume it.** You rely on a **chain of trust**:
  1. **Immutable artifact** — same build in every env (only config differs).
  2. **Prod-like staging** — re-run sanity there with real config+integrations (turn the assumption
     into a test).
  3. **Canary + rollback** — confirm live, gradually, reversibly.
  4. **Synthetics in prod** — non-destructive sanity, continuous, on test accounts.
- Smoke does **not** re-prove logic; it proves the environment got **exactly the tested artifact** and
  is healthy.

## 6. Mechanisms that replace "re-run everything on prod"
- **Immutable promotion** (verified hash dev→staging→prod).
- **Staging gate** (smoke + sanity required before prod).
- **Canary / blue-green** + **auto-rollback** on smoke/metric failure.
- **Synthetic monitoring** (smoke+sanity in prod, read-only/cleanup, test accounts).
- **Feature flags** — decouple **deploy** (bytes on the server, validated by smoke) from **release**
  (turned on gradually, with a kill-switch).
- **Data on prod**: never on real data → test tenants/accounts + deletion.

## 7. Concrete example (payment)
- **Smoke:** `/payments/health` = 200, checkout page renders, SDK loaded. → "nothing is down", but I
  do NOT know whether a payment goes through.
- **Sanity:** test account → card `4242…` → 3DS → wait for the **webhook** → order becomes `paid` in
  the DB → receipt email sent → **clean up** the order. → proves the whole chain.

## 8. Mi Día specifics (why smoke-only on prod is OK here)
- The app is **single-file, client-only, no backend / no per-env build** → identical bytes + logic runs
  in the browser. So sanity **does** transfer, and smoke (which confirms prod serves that exact
  artifact) is enough. This holds **only** because of the architecture; with a backend you would need
  staging + sanity on prod.
- What we built:
  - **`e2e/` (64 tests, pre-merge)** = the **sanity + regression** layer (add-flow, persistence,
    journal, slots, i18n…).
  - **`smoke-preview.yml`** = **pre-merge gate** on the Cloudflare PR preview (prevents a broken build).
  - **`smoke-prod.yml`** = **post-deploy net** on the live URL (detects, does not prevent).
- Limit: the post-deploy smoke only **alerts** (email + red X), it does not auto-rollback → rollback =
  1 click in the Cloudflare dashboard (Deployments → previous → "Rollback to this deployment") or
  `git revert <commit> && push`.

## 9. Placement rules (one line each)
- **On prod, read-only, broad → smoke** (deploy integrity).
- **Writes data / checks the model / critical flow → sanity** (logic correctness), on staging/local,
  pre-merge.
- **Rare / optional / heavy → regression**, pre-merge.
- The most useful red line: **"does the test write data?"** If yes → it is not a prod smoke; push it
  down into sanity on a test environment.
