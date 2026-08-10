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

**Skills can differ silently.** After the merge, confirm both branches carry the same set:
```bash
diff <(git ls-tree -r --name-only main .claude/skills/ | cut -d/ -f3 | sort -u) \
     <(git ls-tree -r --name-only staging .claude/skills/ | cut -d/ -f3 | sort -u)
```

## Done means

Rule 6 passes on `staging`, the three gates are clean, both branches list the same skills, and the
push has landed. Anything less and the drift is still there — just quieter.
