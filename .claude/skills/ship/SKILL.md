---
name: ship
description: The full release ritual for Mi Día — promote the newest src/mi-dia-vNN.html to public/index.html, bump CACHE in public/sw.js, run the deterministic validators (validate.mjs: version sync + node --check + div balance) and the e2e suite, then at Step 4 **proactively and completely sync the documentation, the memory files and the skills** (CHANGELOG plus the right satellite in docs/ — DATA_SCHEMA for new keys, DESIGN_SYSTEM for tokens, APP-REFERENCE for behaviour, history/BUILD-LOG for per-version detail; README, every memory file plus MEMORY.md, any affected skill; consistency verified with check-docs.mjs rather than by eye; CLAUDE.md is never touched at release; do not wait to be asked), then commit + tag vNN + push straight to main with explicit confirmation (a push auto-deploys to Cloudflare). Use when Ines says "livreaza", "ship", "da drumul la vNN", "promoveaza", "push", "deploy".
---

# /ship — the Mi Día release ritual

Automates the delivery chain described in `docs/APP-REFERENCE.md` ("File / versioning workflow" and
"Deployment"). Run it from the repository root (`Mi-Dia-App/`). **Never push without Ines's explicit
confirmation** — a push to `main` triggers an auto-deploy on Cloudflare Pages.

Where the version actually lives in this project (discovered, not a `var VERSION`):

- **`src/mi-dia-vNN.html`** — the build itself, produced during development, before `/ship`.
- **`public/index.html`** — a byte-identical copy of the newest build. This is the promoted one, and
  `public/` is the build output directory, so it is the only place the CDN reads from.
- **`public/sw.js`** — `const CACHE = "mi-dia-vNN"`, which is what forces the old PWA cache out on
  deploy.
- **`CHANGELOG.md`** and the files in **`docs/`** — the documentation. `CLAUDE.md` holds no version
  and is not touched at release.

## Step 0 — Pre-flight, read-only

1. `git status --short`, and `git branch --show-current` to see where you are.
2. Run the deterministic validator against the current state:
   ```bash
   node .claude/skills/ship/validate.mjs
   ```
   - **Any FAIL → stop** and report exactly what failed. Never ship on top of broken code.
   - A WARN does not block; you resolve those at Step 4 (stale docs, superseded builds in the tree).
   - Note the `mi-dia-vNN` it detects as `vOLD`.
3. Run the full e2e suite, which is the real gate:
   ```bash
   cd quality/e2e && npm test
   ```
   If anything fails, report exactly what and stop. If Ines has just run it green in this same
   session you may skip it, but say clearly that you skipped it and why.

## Step 1 — Decide which version ships

- Normally a newer `src/mi-dia-v(N+1).html` already exists. Confirm with Ines that this is the build
  to release, and note the number as `vNEW`.
- If `public/index.html` is already byte-identical to `src/mi-dia-vNEW.html` **and** `public/sw.js`
  already names `vNEW` (validate.mjs said "version sync OK" at Step 0 and `vOLD == vNEW`), the
  promotion is already done. Skip Step 2 and say so.

## Step 2 — Promote and bump, in both places

With Ines's confirmation on `vNEW`:

1. **Promote**, byte-identical:
   ```bash
   cp src/mi-dia-vNEW.html public/index.html
   ```
2. **`public/sw.js`**: `const CACHE = "mi-dia-vOLD";` → `"mi-dia-vNEW";`, one targeted edit.
3. The git tag comes at Step 5, not here.

## Step 3 — Re-validate, and now it has to be green

```bash
node .claude/skills/ship/validate.mjs
```

Required: `[1]` version sync OK (`public/index.html == src/mi-dia-vNEW.html == CACHE mi-dia-vNEW`),
`[2]` zero syntax errors, `[3]` balanced divs, **FAIL: 0**. Resolve WARN `[5]` (docs) at Step 4 and
WARN `[6]` (superseded builds) at Step 5. If a FAIL appeared, fix it before continuing.

## Step 4 — Sync the documentation, the memory and the skills, completely

**Always do this at `/ship`, on your own initiative.** Ines should not have to ask for it.

At the end of an arc, everything that describes the application has to be true: complete, correct,
consistent, and in the spirit of the product (Mediterranean quiet luxury; honest about limits; a
living document, edited in place rather than versioned; Romanian without diacritics in prose, code
comments in English). Work from the **real diff** (`git diff`, `git log`), never from memory. Go
through each of these and update what changed, skipping only what is demonstrably current — and say
what you skipped.

1. **`CHANGELOG.md`** — the `vOLD→vNEW` arc entry, in the style already there. Mark the new one
   "(current)" and take that mark off the previous.
2. **The satellites in `docs/`** — every kind of change has exactly one home. You are no longer
   hunting for "all the stale places": if you are unsure where something belongs, the answer is one
   file, not three.
   - a new `localStorage` key (structure, migrations, what is in the backup) →
     **`docs/DATA_SCHEMA.md`**, with the build in the *Since* column;
   - a token, a theme rule, typography, radius → **`docs/DESIGN_SYSTEM.md`**;
   - new behaviour, a new module source, a change to the add flow or to i18n →
     **`docs/APP-REFERENCE.md`**;
   - the fine per-version detail, what each `vNN` did and why → **`docs/history/BUILD-LOG.md`**.

   **`CLAUDE.md` is not touched at release.** It carries no version, no test count and no current
   arc, because it is the same file on `main`, on `staging` and in the QA worktrees, and any number
   written into it would be wrong on every branch but one. `node quality/tools/check-docs.mjs` fails
   if one reappears.
3. **`README.md`**, the public shop window — badges (the test count), features, the module list, the
   Romanian description, and any number or version that appears in it.
4. **The memory files**, which live outside this repository under `~/.claude/`, in the per-project
   `memory/` directory — update every file whose facts changed (test count, current build, feature
   status, current arc) plus the pointers in that directory's index. If a feature moved from "in
   design" to "shipped", rewrite the file rather than editing its description.
5. **The skills** (`.claude/skills/*`) — if the arc introduced or changed a flow, a gate or a
   convention (a new e2e helper, a validation rule, a QA step), update the skill it belongs to,
   including this one, and `validate.mjs` if a new check appeared. Note that some skills are local
   only and gitignored; they still need updating, they just will not appear in a commit.
6. **Consistency**, which you no longer check by eye:
   ```bash
   node .claude/skills/ship/validate.mjs    # version sync: sw.js CACHE ↔ index.html ↔ src build
   node quality/tools/check-docs.mjs        # dead paths, test counts, history, neutral router
   ```
   The test count is never written from memory anywhere. Its source is
   `node quality/e2e/count-tests.js`.

Run both again: `validate.mjs` with no WARN `[5]`, `check-docs` exiting 0. The memory files and the
skills are caught by no validator, so you check those by hand — that is your responsibility on every
ship. If the release is only the promotion of a version that was already documented in full, say
explicitly what you verified and that it was current.

## Step 5 — Commit, tag, push — ask before the push

Releases go **straight to main**. Show Ines the exact commands and wait for a yes before running the
push, because a push is an external action that auto-deploys:

```bash
git rm src/mi-dia-vX.html src/mi-dia-vY.html    # only builds superseded by vNEW
git add <explicit paths>
git commit -m "feat: mi-dia-vNEW — <short summary>"
git tag -l vNEW                                  # check FIRST whether the tag exists
git tag vNEW                                     # only if the line above printed nothing
git push origin main && git push --tags
```

- **`git rm`**: delete only the `src/mi-dia-vNN.html` files older than `vNEW` (the list comes from
  validate.mjs WARN `[6]`). The tree keeps the latest build and `public/index.html`; everything
  earlier stays in git history, recoverable with `git show <commit>:src/mi-dia-vNN.html`.
- **Stage explicit paths. Never `git add -A` in this worktree.** It has twice swept the
  work-in-progress build, scratch assets and `.wrangler/`, which holds account data, into a staged
  commit in a public repository. `.githooks/pre-commit` now refuses those, but the hook is a
  backstop, not a licence to be careless.
- **Tag**: run `git tag -l vNEW` first. If it already exists, do not recreate it — skip straight to
  `git push --tags`.
- **The commit message**: one clear line in the style of the history (`git log --oneline`), in
  English, ending with the co-author line the harness requires.
- **No `--no-verify`, no `--force`.**

## Step 6 — Confirm the deploy

After the push, tell Ines:

- Cloudflare Pages is git-connected, so the deploy lands in about one to two minutes on
  https://mi-dia-app.pages.dev/.
- CI runs `smoke-prod.yml` post-merge: it waits for the new `CACHE` to appear in the live `/sw.js`,
  then smokes the seven views. `verify-live.yml` separately checks the published README and the
  `public/` boundary.
- A quick local check if you want one:
  ```bash
  cd quality/e2e && npm run wait:deploy && npm run smoke:prod
  ```
- **Ines's manual step remains**: the real-Android pass — native pickers, blur, fonts, axe contrast
  on velvet. Headless is not a device. The list is in `docs/DEVICE-PASS.md`.

---

### Notes

- **The validator** (`validate.mjs`) has no dependencies — ESM, plain `node`. It catches a
  desynchronised version (`sw.js` CACHE ↔ `public/index.html` ↔ `src/mi-dia-vNN.html`), a
  `SyntaxError` in any `<script>` block, unbalanced `<div>`s, curly quotes in HTML attributes
  (WARN), stale docs (WARN), and superseded builds left in the tree (WARN).
- **FAIL blocks the ship; WARN only reports.** Run it at Step 0, Step 3 and Step 4.
- **What it does not cover, and stays with you or the device**: axe contrast on velvet, native
  pickers, blur and backdrop, fonts (Ephesis and `background-clip: text`), and real Android UX.
