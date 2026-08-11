---
name: verify-live
description: Verify a claim in the environment that actually serves it, before saying it works. Use BEFORE telling Ines that a page renders, a link resolves, a deploy is correct, or a boundary holds — and whenever a local check passes but the real place has not been looked at. Covers GitHub-rendered pages (README, docs, mermaid diagrams), Cloudflare Pages deployments (what is really published), and CI-only conditions that a local run cannot reproduce. NOT for running the test suite (that is /ship) and NOT for the documentation gate (that is check-docs).
---

# verify-live — check it where it runs

**Respond in Romanian without diacritics.** Code and commands stay English.

## Why this exists

In one day, the same mistake was made four times. Each time something was correct locally and wrong
where it runs, and each time the local check gave a confident green.

| What was believed | What was true |
|---|---|
| The documentation gate works | It failed the first pull request it saw. CI checks out a PR as a **detached HEAD**, so branch detection returned `HEAD` and every branch rule silently stopped applying. |
| The diagram is fine | It rendered on mermaid 10 **and** 11 locally. GitHub renders with HTML labels disabled and **strips** the tags rather than failing, so the words fused: `docs/DATA_SCHEMA.mdwhat is stored`. It still drew. |
| The docs are no longer published | Every path answered `200` — including ones that are not published. Cloudflare falls back to the app for unknown paths, so **the status code proved nothing**. |
| The README links are fine | Four were 404s. A markdown link resolves **literally**, relative to the file it sits in, so moving a file breaks every link to it even though the file exists. |

The pattern is always the same: **the wrong thing was checked.** A local renderer instead of the real
one. A status code instead of a body. A working tree instead of CI's checkout.

## The rule

> Before you tell Ines something works, open the place it works and look at it.

Not "it should render". Not "the path exists". Look.

If you cannot reach the real environment — no network, no deploy yet — then **say that**, and say what
you did check instead. An honest "unverified, here is why" is worth more than a confident green that
turns out to be a fallback page.

## How

```bash
# a rendered page: render errors, fused labels, every relative link probed
node quality/tools/verify-live.mjs --page https://github.com/<owner>/<repo>/blob/<branch>/README.md

# a deployed site: is a path really published? compares bodies, not status codes
node quality/tools/verify-live.mjs --site https://mi-dia-app.pages.dev \
  --hidden "CLAUDE.md,docs/DATA_SCHEMA.md,quality/tools/check-docs.mjs"
```

The script needs Playwright, which lives in `quality/e2e`. If it complains, run `npm ci` there.

**Verify on a branch before main.** Push the branch, load its page — `/blob/<branch>/README.md` —
and only then open the pull request. GitHub renders any branch, so there is no reason to find out
after merging.

## The three traps, in full

**A `200` is not evidence.** A static host answers 200 for paths it does not serve, by falling back
to the app. Compare the **body**: the app's HTML means the file is not published; the file's contents
mean it is. This is the check that tells you whether a build-output boundary actually holds.

**Local mermaid is not GitHub's mermaid.** The npm package accepts HTML inside labels; GitHub strips
it. The symptom is not an error — it is a diagram that draws with words run together. `check-docs`
rule 7 fails on HTML in a mermaid label for exactly this reason, so run the gate too, but confirm
with your eyes.

**CI is not your working tree.** A pull request is a detached HEAD at the merge commit, so
`git rev-parse --abbrev-ref HEAD` answers `HEAD`. Reproduce it before trusting a branch-aware check:

```bash
git worktree add --detach /tmp/ci-sim HEAD
cd /tmp/ci-sim && GITHUB_HEAD_REF=<branch> node quality/tools/check-docs.mjs
```

Remove the worktree afterwards with `git worktree remove --force /tmp/ci-sim`.

## When a check disagrees with what you see

Trust the environment, not the checker — then fix the checker. Every disagreement today was the
checker being too lenient, and each one became a new rule:

- a path that "exists somewhere" is fine in prose and wrong for a link → rule 1 splits them
- HTML in a mermaid label → rule 7
- a badge judged by two different rules → rule 4 delegates to one authority

A checker that passed something the real environment rejects has a bug. Find it before moving on.

## Done means

You looked at the real page or the real deployment, and you can say **what** you saw — not that it
should be fine. If a screenshot is worth more than a sentence, take one.
