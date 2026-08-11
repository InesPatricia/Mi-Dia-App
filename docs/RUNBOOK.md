# Runbook

What to do when something is wrong. Written for the moment you actually need it: production looks
broken, or a check went red and you do not know what it is telling you.

The rest of this repository explains how things are meant to work. This file is for when they are not.

---

## First: find out what is actually live

Nothing here says which build is in production, because a file that says so goes stale. Ask the site.

```bash
curl -s https://mi-dia-app.pages.dev/sw.js | grep -o 'CACHE = "[^"]*"'
```

That name is the promoted build. Compare it with what the repository thinks it shipped:

```bash
grep -o 'CACHE = "[^"]*"' public/sw.js
node .claude/skills/ship/validate.mjs
```

If the live name is older than the repository's, the deploy has not finished or has failed. If they
match but the app looks old **to you specifically**, it is your browser's service worker, not the
deploy — see [the cache trap](#the-cache-trap) below.

---

## Production is broken

**Roll back first, diagnose second.** The build is one self-contained file, so a rollback is complete
and instant: there is no partial state to reconcile.

1. **Cloudflare dashboard → the project → Deployments → the last good one → Rollback.** One click,
   takes effect at the edge in seconds. This is the fastest path and it does not need a git operation.
2. Then make the repository agree, so the next push does not re-deploy the broken build:
   ```bash
   git revert <the merge commit>     # prefer this: it keeps the history honest
   git push origin main
   ```
3. Confirm the live service worker went back:
   ```bash
   curl -s https://mi-dia-app.pages.dev/sw.js | grep -o 'CACHE = "[^"]*"'
   ```

**Recovering an old build.** The working tree keeps only the promoted build. Every earlier one is in
git history:

```bash
git log --oneline --all -- 'src/mi-dia-v*.html'
git show <commit>:src/mi-dia-vNN.html > /tmp/old.html
```

---

## A check went red

The required checks on `main` are exactly `validate build`, `test (shard 1/2)`, `test (shard 2/2)`
and `preview smoke`. Everything else reports and blocks nothing — deliberately. If a check is not on
that list, a red mark is information, not a stop sign.

| Check | What it means | What to do |
|---|---|---|
| **validate build** | The single-file build is structurally broken: unbalanced `<div>`, or an inline script does not parse. | `node quality/e2e/validate-build.js` locally. It names the block and the line. |
| **test (shard n/2)** | A behaviour or stored-state assertion failed. | `cd quality/e2e && npx playwright test --grep-invert @visual`. Open the HTML report: `npm run test:report`. Every test leaves a screenshot of its final state, pass or fail. |
| **preview smoke** | The Cloudflare preview deployment does not serve a working app. | Open the preview URL from the pull request. If the page is fine, the poller timed out — re-run the job before assuming a real failure. |
| **docs** | A documentation link is dead, a test count disagrees with the runner, the router acquired a build number, or archived history went missing. | `node quality/tools/check-docs.mjs`. It names the file and the rule. |
| **smoke-prod** | Production failed its post-deploy check. | This one is a net, not a gate — the deploy already happened. Treat it as a page: check the live site yourself, then roll back if it is real. |
| **zap-baseline** | A new security finding that is not an accepted risk. | `docs/SECURITY-NOTES.md` lists what is accepted and why. Anything else is new; triage it before dismissing it. |

**If a check is green and you do not believe it**, that instinct is worth acting on. This repository
has shipped a gate that ran green while testing nothing, twice. Confirm the job actually did work:
open its log and look for the assertion, not the checkmark.

---

## The cache trap

The app is a PWA with a service worker, which means **your browser will happily serve you the old
version after a correct deploy**. Before concluding anything is broken:

- Open the site in a private window, or
- DevTools → Application → Service Workers → Unregister, then hard-reload.

The cache name is bumped on every release precisely so this resolves itself for real users. If it was
not bumped, `validate.mjs` fails on version sync — which is the whole point of that check.

---

## A deploy is not appearing

1. Is the push on the right branch? `main` deploys production; `staging` deploys its own preview on a
   separate subdomain, with its own cache and its own storage.
2. Did Cloudflare build? The pull request gets a comment from the Cloudflare bot with the deployment
   status and the preview URL.
3. Is `public/` still the build output directory? It is declared in `wrangler.toml`, not in the
   dashboard. If a change to that file was reverted, the site would serve the repository root
   instead — the app would still work, but the documentation and test files would be published too.
   Check with a path that should **not** exist publicly:
   ```bash
   curl -s https://mi-dia-app.pages.dev/CLAUDE.md | head -c 40
   ```
   The app's HTML means the boundary holds. The file's contents mean it does not.

> A `200` proves nothing here. Cloudflare serves the app as a fallback for unknown paths, so every
> path returns 200. Always compare the **body** — which is what this does for you:
>
> ```bash
> node quality/tools/verify-live.mjs --site https://mi-dia-app.pages.dev --hidden "CLAUDE.md,docs/DATA_SCHEMA.md"
> ```

### A file you removed is still being served

Found on 11 August 2026, by the first real run of the `verify-live` net: `/CLAUDE.md` was live on
production, 6,184 bytes of it, weeks after the reorganisation moved everything except `public/` off
the CDN. The origin was correct the whole time. **Cloudflare's edge was serving a copy cached before
the move**, under `s-maxage=604800`, so it had up to seven days left to run.

Tell the two apart before doing anything, because the fixes have nothing in common. Ask the origin
directly, with a query string the edge has never seen:

```bash
curl -s "https://mi-dia-app.pages.dev/CLAUDE.md?cachebust=$RANDOM" | head -c 40
curl -sI https://mi-dia-app.pages.dev/CLAUDE.md | grep -iE 'cf-cache-status|age'
```

The app's HTML from the cache-buster, plus `CF-Cache-Status: HIT` and a large `Age` on the plain
request, means the origin is fine and you are looking at a remnant. Purge it: Cloudflare dashboard →
the `mi-dia-app` project → **Caching → Purge cache**, single URL. It takes about thirty seconds, and
`verify-live` going green afterwards is how you know it worked.

If instead the cache-buster returns the file itself, the origin really is publishing it, and the
build output directory is the thing to check.

The lesson worth keeping: **removing a file from the origin does not unpublish it.** Anything
withdrawn from a CDN needs a purge, and until then the internet still has it.

---

## Something looks wrong on GitHub, not in the app

The README is the project's front door and it renders client-side.

- **A diagram shows "Unable to render rich display"** or its labels have words fused together
  (`docs/DATA_SCHEMA.mdwhat is stored`): there is HTML inside a mermaid label. GitHub renders mermaid
  with HTML labels disabled and strips the tags rather than failing. `check-docs` rule 7 catches this
  — run it before assuming GitHub is at fault.
- **A link 404s.** A markdown link resolves literally, relative to the file it sits in, so moving a
  file breaks every link to it even though the file still exists. `check-docs` rule 1 checks links
  strictly for this reason.
- Verify by loading the page, not by reasoning about it. Local rendering does not reproduce GitHub.

```bash
node quality/tools/verify-live.mjs --page https://github.com/InesPatricia/Mi-Dia-App/blob/main/README.md
```

---

## Working across the two worktrees

`Mi-Dia-App` and `Mi-Dia-QA` are two worktrees of **one** repository at different branches. The same
filename can describe different states of the app.

```bash
git branch --show-current
git worktree list
git log --oneline main..staging     # what staging has that production does not
```

Never assume the state of the other one. Before building anything that sounds already-built, check
whether it shipped on the other branch.

**Propagating a change**: it flows `branch → main → staging`, never sideways. When merging `main`
into `staging`, the rule is **structure from `main`, product content from `staging`** — the layout,
the tooling and the router come from `main`; the current build and its tests stay on `staging`. The
full procedure, including the conflict table and the traps, is the `reconcile` skill.

---

## Before you ship

```bash
node .claude/skills/ship/validate.mjs        # version sync, syntax, div balance
node quality/tools/check-docs.mjs            # documentation gate
cd quality/e2e && npx playwright test --grep-invert @visual
```

Zero failures on all three, then promote. The device pass on a real Android phone is still a manual
step, and headless Chromium does not replace it: native pickers, `backdrop-filter` and font
rendering all differ. The list is [`DEVICE-PASS.md`](DEVICE-PASS.md), organised by what a headless
browser cannot tell you rather than by feature.
