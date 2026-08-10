---
name: perf-check
description: Run and interpret the Mi Día performance layer — Lighthouse CI budgets and the k6 CDN smoke — and decide whether to tighten (ratchet) the thresholds. Reads the measured baseline, compares a run against the budgets in lighthouserc.cjs and the thresholds in quality/perf/smoke.js, explains any regression by category/route, and proposes a threshold ratchet only after several green runs. Use when Ines says "run k6 / a load test", "check performance / Lighthouse scores", "verifica performanta", "did perf regress", "should we tighten the budgets", or when the lighthouse job in smoke-prod flags a warning. NOT for security (use /security-triage).
---

# /perf-check — performance run + interpretation

Encapsulates the performance-baseline discipline: **measure first, set thresholds below the
baseline so real regressions fail and network noise doesn't.** Two independent tools, two
different questions.

Honest scope: k6 measures **CDN/edge delivery of a static PWA** (the shell + companion files),
NOT application logic — that is the e2e suite's job. Lighthouse measures the single-user
experience (FCP/LCP/TBT/CLS) + PWA/a11y/best-practices.

## Steps

1. **Know the baseline.** Current measured baseline (production): perf ≈ 0.62, a11y ≈ 0.95,
   best-practices ≈ 0.96, PWA ≈ 0.88; k6 p(95) ≈ 410 ms, 0% failures. Error floors and per-route
   thresholds live in `lighthouserc.cjs` and `quality/perf/smoke.js`, each with a written rationale.

2. **Lighthouse.** It runs automatically post-deploy (smoke-prod) and informationally on each PR
   preview (shift-left). To read a run: open the run summary (the `lh-summary.mjs` table) or the
   `lighthouse-report` artifact. Compare each category to its budget; a category below its error
   floor is a real regression, a metric past its warn value is drift to watch.

3. **k6.** Manual only (`perf-k6` workflow → Run workflow, or `k6 run quality/perf/smoke.js` locally with
   a portable binary). Read the `k6-summary.mjs` table: p(95) < 500 ms overall, < 600 ms per route.
   If one route fails while the aggregate passes, the per-route split has done its job — name the
   slow file (usually `/` , the ~1 MB shell).

4. **Explain, don't just report.** Attribute any regression to a cause (a new blocking asset, a
   heavier module, a cold preview vs. warm edge). Home-network k6 runs are noisy; the authoritative
   numbers come from CI. Never game a threshold to make a noisy run green.

5. **Ratchet (only when earned).** After ~5–10 consistently green CI runs, tighten the relevant
   floor toward the real distribution (e.g. perf 0.50 → 0.55) in `lighthouserc.cjs`, with the
   reason in the comment. Ship the change through the normal PR + gates.

## Guardrails

- k6 is polite by design (5 VUs / 30 s) against our own site — do not turn it into a stress test.
- Keep the PWA category: `@lhci/cli` is pinned to 0.13.x (Lighthouse 11). Don't bump it without
  accepting the loss of the PWA category.
- This is git-visible: write comments and notes in English.
