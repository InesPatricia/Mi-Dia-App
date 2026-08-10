---
name: pipeline-guard
description: Audit the Mi Día CI/CD pipeline itself — confirm the gates actually fire, keep feature branches current with main, and triage Dependabot / dependency failures. Encodes the maintenance lessons learned: a gate that never runs (the dead smoke-preview trigger), a stale branch failing against workflows main has evolved, and a dependency bump that surfaces a stale runtime (Playwright 1.62 needing Node 20). Use when Ines says "check the pipeline / CI", "is the gate actually running", "verifica pipeline-ul", "a green CI is not a working CI", "why did Dependabot fail", "is my branch up to date", or before merging a long-lived branch. NOT a code review of the app.
---

# /pipeline-guard — audit your own pipeline

The core lesson: **a CI that doesn't fail is not the same as a CI that works.** Periodically
verify the gates run what you think they run, and that branches are current before merge.

## Checks

1. **Do the gates actually fire?** For each workflow (`e2e`, `smoke-preview`, `smoke-prod`,
   `zap-baseline`, `perf-k6`, `ai-triage`), look at the Actions history: has it run recently, on
   the events it claims? A workflow with **zero runs ever** is a dead gate — how the
   `smoke-preview` trigger silently died when Cloudflare stopped emitting `deployment_status`.
   Fix by re-pointing the trigger (it now runs on `pull_request` and waits on the Cloudflare
   check-run via `e2e/wait-for-preview.js`).

2. **Is the branch current with main?** Before merging a branch that has been open a while, or
   when a PR fails on a step tied to a file that exists on main, check the merge base. A branch
   created before a fix was merged will **lack that file** and fail (how the agentic branch failed:
   the workflow from main called `wait-for-preview.js`, which the stale branch didn't have). Fix:
   `git merge origin/main` into the branch, push, re-run.

3. **Triage a Dependabot / dependency failure.** Read the failing logs before judging the bump.
   Often the bump is fine and reveals something else is stale — Playwright 1.62 failed because CI
   pinned **Node 18 (EOL)**; the fix was to move CI to Node 20, then let the bump rebase on top
   (`@dependabot rebase`). Principle: **Dependabot proposes, the gates dispose** — an automated
   update never skips the gates, and a rejected update often points at stale infrastructure.

4. **Least privilege still holds?** Each workflow should request only the permissions it needs
   (`contents: read` by default; writes only where justified, e.g. `pull-requests: write` for the
   triage agent, which runs via `workflow_run` so PR input can't reach the secret).

## Guardrails

- Read-only diagnosis first. Any fix ships through the normal PR + gates.
- Keep `.zap/rules.tsv` ⇄ `SECURITY-NOTES.md` and the shard count ⇄ badge/README in sync when a
  change touches them.
- This is git-visible: write in English.
