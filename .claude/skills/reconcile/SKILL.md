---
name: reconcile
description: Bring main into staging so the two branches stop drifting, resolving conflicts by one rule — structure from main, product content from staging. Use when Ines says "adu main in staging", "sincronizeaza branch-urile", "reconciliaza", after any pull request lands on main, or when check-docs rule 6 reports that CLAUDE.md has forked. NOT for shipping to production (that is /ship) and NOT for publishing work in progress (that is /staging).
---

# reconcile — main into staging, by one rule

**Respond in Romanian without diacritics.** Code and commands stay English.

## What this is for

`Mi-Dia-App` and `Mi-Dia-QA` are two worktrees of one repository at different branches. Work flows
**branch → main → staging**, never sideways. When something lands on `main` — a gate, a layout, a
document — `staging` has to receive it, or the two start describing different projects.

They have drifted before, and the cost was not abstract: the QA worktree spent a while instructing
agents to build a feature that had already shipped on `staging`, because its copy of `CLAUDE.md` was
fourteen commits stale.

## The rule

> **Structure comes from `main`. Product content stays on `staging`.**

Everything follows from that. Structure is the layout, the tooling, the workflows, the gate, the
router, the skills. Product content is the current build and the tests that belong to it.

| Conflict on | Take | Because |
|---|---|---|
| `CLAUDE.md`, `docs/`, `README.md` | main | the router must be byte-identical everywhere — that is rule 6 |
| `quality/**`, `.github/workflows/**`, `.gitignore` | main | one toolchain, or the gates disagree |
| `.claude/skills/**` | main | a skill that names a branch-specific file is a bug, not a variant |
| `src/mi-dia-vNN.html`, `public/index.html`, `public/sw.js` | staging | that is the build staging is actually running |
| a spec for a staging-only feature | staging | at its path under `main`'s layout |

The awkward case is a **rename/rename**: `main` moved a build while `staging` advanced to a newer
one. The answer is the newer build at the newer path — `staging`'s content, `main`'s location — and
the superseded version disappears, which is what should have happened anyway.

## If you are on `staging` and want your work on `main`

Read this before doing anything, because the obvious move is the wrong one.

**Do not merge `staging` into `main`.** Not with a merge, not with a pull request from `staging`.
`staging` is behind on structure by design — it receives, it does not send — so that merge quietly
reverts whatever `main` has gained since the last reconciliation. This is not hypothetical. On
11 August 2026 a `staging → main` merge would have undone a rewritten README, three skills
translated into English, the `SKILL.md` naming standard (reinstating a file tracked twice under two
cases), the pre-commit hook, and rule 8 of the gate. All of it, in one green merge, with nothing
reporting a problem.

What to do instead, depending on what the work is:

| The work is | How it reaches `main` |
|---|---|
| a product build — a feature living in the single-file app | **`/ship`**, which promotes a `src/mi-dia-vNN.html` to `public/index.html`. A build is promoted, never merged. |
| something orthogonal — a doc, a test, a workflow, a tool | a branch **off `main`**, then a pull request. Cherry-pick it across if it was written on staging. |
| structure that staging invented — a gate, a layout, a skill | the same: redo it on a branch off `main`. It was made in the wrong place, and that is worth saying out loud rather than smuggling it through. |

In every case, **reconcile first**: bring `main` into `staging` with the steps below, confirm the
three gates are clean, and only then ship or branch. Work built on a stale structure tends to
conflict with the real one at exactly the wrong moment.

## Steps

1. **Orient.** Never start without knowing where you are.
   ```bash
   git branch --show-current && git worktree list
   git log --oneline staging..main     # what staging is about to receive
   ```

2. **Update main first**, in whichever worktree holds it.
   ```bash
   git fetch --all --prune
   git merge --ff-only origin/main
   ```

3. **Merge, without committing**, so you see the whole conflict set before touching anything.
   ```bash
   git checkout staging
   git merge main --no-commit
   git diff --name-only --diff-filter=U
   ```

4. **Resolve by category, not file by file.** `--theirs` is `main`, `--ours` is `staging`.
   ```bash
   git checkout --theirs <structure files> && git add <them>
   ```
   Handle builds by hand: put staging's content at main's path, and delete the superseded one.
   **Check the content before trusting a rename** — a rename/rename conflict can leave the same body
   at two paths, and `cmp` on the wrong pair will tell you they match. Compare hashes.

5. **Verify before committing.** All three, every time.
   ```bash
   node .claude/skills/ship/validate.mjs
   node quality/tools/check-docs.mjs
   cd quality/e2e && npx playwright test --grep-invert @visual
   ```
   Rule 6 turning green is the signal that the reconciliation actually worked: it means the router
   is identical again. If it is still red, the merge is not finished.

6. **Commit and push**, saying in the message which side won where and why.

## Traps

**Never commit with `git add -A` in the App worktree.** It sweeps the work-in-progress build, the
scratch assets and `.wrangler/`, which holds account data — into a public repository. This has
happened twice. Stage explicit paths.

**A router change does not belong on `staging`.** If a merge conflicts on `CLAUDE.md` because
`staging` edited it, that edit was made in the wrong place: it should have gone through `main`.
Take main's version and redo the change as a pull request.

**A leftover directory after a move.** Git moves tracked files; gitignored artefacts stay behind, so
an old path can survive as a folder full of `node_modules`. Check for empty shells afterwards, and
move the installed dependencies rather than reinstalling them.

**A tracked file can vanish from disk.** A merge that involves renamed directories can leave a file
in the index and not in the working tree — it has happened three times here, twice to a skill. The
gate reports a broken link to a file git swears exists. Check for it, and restore:

```bash
git ls-files | while read -r f; do [ -e "$f" ] || echo "missing: $f"; done
git checkout -- .
```

**An improvement made during a reconciliation is stranded on `staging`.** This flows one way. Anything
you learn while merging — a new trap, a better step — belongs on `main`, as its own pull request, or
it will never reach the other branch.

**Skills can differ silently.** After the merge, confirm both branches carry the same set:
```bash
diff <(git ls-tree -r --name-only main .claude/skills/ | cut -d/ -f3 | sort -u) \
     <(git ls-tree -r --name-only staging .claude/skills/ | cut -d/ -f3 | sort -u)
```

## Done means

Rule 6 passes on `staging`, the three gates are clean, both branches list the same skills, and the
push has landed. Anything less and the drift is still there — just quieter.
