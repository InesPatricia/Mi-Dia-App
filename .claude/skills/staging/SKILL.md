---
name: staging
description: Take work in progress onto the permanent `staging` branch and publish it to an isolated Cloudflare preview (staging.mi-dia-app.pages.dev) without touching production (`main`). Use when Ines says "du pe staging", "vreau sa vad pe staging", "preview", "staging environment", "arata-mi live inainte de ship". This is NOT /ship, which promotes to production on main — staging is the shop window you test in before release.
---

# /staging — an isolated preview before release

**Reply in Romanian without diacritics.** Code, commits and commands stay English. Run from the
repository root (`Mi-Dia-App/`).

Mi Día deploys to **Cloudflare Pages from GitHub**: `main` becomes production at
`mi-dia-app.pages.dev`, and any non-production branch gets its own preview at
`<branch>.mi-dia-app.pages.dev`. This skill uses a **permanent `staging` branch** so the shop window
is always at the same bookmarkable URL, fully isolated from production.

**Scope.** This covers the application in this repository. Separate prototypes live in their own
Cloudflare projects with their own sources, and never travel through this repo — if a task involves
one of those, this is the wrong skill.

**How it relates to the others:**

- `/staging` publishes work in progress to a preview. It never touches `main`.
- `/ship` promotes to production: `public/index.html`, the `CACHE` bump, the docs, a push to `main`.
- `/reconcile` brings `main` back into `staging` so the two stop drifting.
- Normal flow: build slices → **`/staging`** (see it live, get device feedback) → when it is right,
  **`/ship`**.

## The safety rules

1. **Never push to `main` when you only want staging.** Production deploys exclusively from `main`.
2. **Staging is a different subdomain**, so its cache, service worker and localStorage are completely
   isolated from production. No collisions, and nobody's data gets damaged.
3. **The preview URL is public**, if undiscoverable. The repository is public anyway, so nothing
   extra is exposed — but do not put real personal data into what gets served.
4. **Every push to `staging` refreshes the same URL.** The latest version is always there.
5. **Commit per slice, not one monolith.** Slices give clean rollback points and mark exactly where
   each feature enters, which is the cut line for a partial promotion. Note what "cherry-pick"
   actually means here — see the principle below.

## Steps

### 0. Check where you are starting from

```bash
git rev-parse --abbrev-ref HEAD && git status -sb
```

The work to publish is whatever is uncommitted in the working tree, or already on a working branch.
Confirm with Ines exactly what is going, which is usually everything uncommitted.

### 1. Get the work onto `staging`

- **If `staging` does not exist yet**, from the branch holding the work: `git checkout -b staging`.
  Uncommitted changes travel with you, so `main` stays clean.
- **If `staging` already exists**, `git checkout staging` and commit the work in progress. If it has
  diverged and needs resynchronising from scratch, `git reset --hard <ref>` will do it — but that is
  destructive, so ask Ines first.

### 2. Commit per slice

- Group by logical slice, not one enormous commit. The `src/mi-dia-vNN.html` files are already clean
  per-slice snapshots, so one commit per slice or version.
- Cross-cutting e2e tests and tooling go in their own clearly labelled commits (`test:`, `chore:`).
- **Stage explicit paths. Never `git add -A` in this worktree.** It has twice swept the
  work-in-progress build, scratch assets and `.wrangler/`, which holds account data, into a staged
  commit in a public repository. `.githooks/pre-commit` refuses those now, but treat the hook as a
  backstop rather than a reason to stop looking.
- Commit messages in English, ending with the project's `Co-Authored-By` line.

### 3. Optional: make the build coherent for the preview

- `public/index.html` should be a copy of the `src/mi-dia-vNN.html` you want to see on staging.
  Compare sizes or diff them to confirm.
- `public/sw.js` is **network-first**, so the preview serves the new build even when `CACHE` still
  names an older version. **Do not bump `CACHE` for staging** — that belongs to `/ship`, and bumping
  it here only creates a pointless diff against production. A fresh subdomain has no stale cache
  anyway.

### 4. Push, which triggers the preview

```bash
git push -u origin staging     # first time
git push origin staging        # afterwards
```

**Do not push to `main`.** Ask Ines before pushing, since a push reaches outside the machine. The
preview appears in a minute or two at **`https://staging.mi-dia-app.pages.dev`** — the branch name
becomes the subdomain, truncated to 28 characters.

### 5. What CI does, all of it informational

A push to `staging` triggers the Cloudflare preview build, `smoke-preview.yml` (7 smoke tests
against the preview) and `e2e.yml` on the branch. None of them blocks anything in production. A
failing smoke here is a useful signal before `/ship`.

### 6. Report

Give Ines the URL, which slices are on it, and the reminder that headless is not a real Android
device (`docs/DEVICE-PASS.md`).

## If the preview never appears

Cloudflare → Workers & Pages → **mi-dia-app** → Settings → Builds & deployments → **Preview
deployments → "All non-production branches"**. This cannot be verified from the CLI without
authentication, so it is a manual check for Ines if the subdomain fails to generate.

## The construction principle behind partial promotion

Mi Día is **one HTML file**. What production serves is `public/index.html`, a copy of a whole
`src/mi-dia-vNN.html`. Every slice is a complete snapshot of the application, not a patch. Two
consequences follow, and any agent new to this repository needs both:

- **`git cherry-pick` does not isolate a feature here.** Cherry-picking a slice commit only adds an
  inactive `src/mi-dia-vNN.html` to the branch. It does not change `public/index.html`, so the
  feature does not go live. Cherry-pick is clean only for orthogonal changes: a document, a test,
  `sw.js`, an additive module file.
- **Partial promotion means choosing the build.** "Ship feature X, hold the rest" means promoting
  the `vNN` at which X is complete and nothing unwanted has landed yet. That `vNN` becomes
  `public/index.html` — a `/ship` aimed at an intermediate build rather than the newest one.

**How to build so partial promotion stays possible:**

1. **Order the work** so anything you might want to ship early is complete at an earlier `vNN`, and
   optional, risky or additive features come **last**. Then holding them back is just not promoting
   past their line.
2. **A genuinely independent feature** belongs on its own branch off `main`, rather than stacked on
   top of staging's work in progress, or as an additive module file with a small mount point. That
   is the closest thing here to a separately shippable unit.
3. **Every `vNN` must be a coherent, shippable state** — validators and e2e green, no half-built
   features — or it is not a valid cut line. Order features; do not interleave them.
4. **Reconcile the tests too.** If you promote an intermediate `vNN`, the e2e specs covering later
   features must not run against that build. They are held back with the feature they belong to.

## Promoting from staging to production

**Never merge `staging` into `main`, and never open a pull request from it.** `staging` is behind on
structure by design — it receives layout, gates, tooling and documentation from `main`, it does not
send them — so that merge reverts whatever `main` has gained since the last reconciliation, in bulk
and without a single check reporting it. Production is reached by **promoting a build**, not by
merging a branch.

Run `/reconcile` first, so staging holds main's current structure, then:

- **The whole arc**: `/ship`, which promotes the newest `vNN`, bumps `CACHE`, syncs the docs and
  pushes `main`.
- **Partial**: `/ship` aimed at the cut-line `vNN` rather than the newest — see Step 1 of `/ship`.
  Not `git cherry-pick` of feature code, which does not work here. Only possible if the work was
  ordered with the held-back feature last.
- **Orthogonal** (a doc, a test, `sw.js`, an additive module): that genuinely can be cherry-picked
  onto `main` through a pull request, since `main` is branch-protected.
