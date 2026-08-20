# Repository layout

Where everything lives, and why it lives there. Read this before
[`QA-ARCHITECTURE.md`](QA-ARCHITECTURE.md), which describes the pipeline that runs on top of this
layout.

**No file counts in here on purpose.** An earlier draft had a tidy table of how many files each
directory held. Every number in it was already wrong on the day it was committed, because the commits
that added the agent scaffolding had landed while the numbers were being typed. A count nothing
re-derives is a claim that ages in silence, which is the defect the documentation gate exists to
catch. The taxonomy is the useful part; the arithmetic is available from `git ls-files`.

## Two directories, one repository

`Mi-Dia-App` and `Mi-Dia-QA` look like two projects and are not. They are **two worktrees of one git
repository**, checked out at different branches. Same history, same remote, two windows open at once.

| Directory | Branch | What it is for |
|---|---|---|
| `Mi-Dia-App` | `staging` | the product arc, one feature slice at a time |
| `Mi-Dia-QA` | `main` | shipped production, plus the gates, tools and documentation |

**Why two rather than one.** The application is a single self-contained HTML file. Working on a
feature and on the test infrastructure in the same folder means a `git checkout` between every
context switch, with a stash on each side. Two worktrees give two live contexts instead. The only
physical difference beyond the branch is that the product worktree also holds the gitignored corpus
it needs, and this one does not.

**Never assume the state of the other one.** Run `git worktree list` and `git branch --show-current`
before believing anything about a branch you are not standing on. The same filename describes
different states of the app depending on which window you are looking at.

## Which way work flows

**A branch, then `main`, then `staging`. Never `staging` into `main`.**

`main` carries the structure: the layout, the gates, the tooling, the documentation and the skills.
`staging` carries the product arc, which is usually behind on all of it. Merging that direction
reverts structure in bulk and silently, which is a very quiet way to lose a week.

The product reaches production by **promoting a build**, not by merging a branch. When the two drift
far enough that rule 6 of the documentation gate reports the router has forked, that is the
reconciliation asking to happen rather than a bug in the gate.

## The top level

| Path | What it holds |
|---|---|
| `public/` | what is actually served: the promoted build, the service worker, headers, redirects |
| `src/` | the source build and the feature modules that get inlined into it |
| `docs/` | the documentation, its history and its screenshots |
| `quality/` | everything that checks something |
| `.github/` | the workflows |
| `.claude/` | the skills a session can invoke |
| `.githooks/` | the local guard that runs before a commit |
| `CLAUDE.md` | the session router: what is true on every branch, and nothing that changes per build |

**Builds are numbered, and only the current one stays on disk.** Many build files have existed across
this repository's history and one is tracked at a time. That is not a contradiction of the
never-edit-in-place rule: the rollback point is the git history, not a pile of files in `src/`. A
previous build is recovered with `git show`, not by looking for it in a listing.

## Inside quality/

There is no `tests/` at the root, no `scripts/`, no `ci/`. Everything that verifies anything lives in
one place, split by **the question it answers** rather than by the technology that answers it.

| Subsystem | The question it answers |
|---|---|
| `quality/e2e/` | does the feature work? |
| `quality/tools/` | do the gates themselves work? |
| `quality/evals/` | does the AI part of the loop produce good results? |
| `quality/perf/` | is it fast enough? |
| `quality/security/` | which risks are accepted, and which are new? |

`quality/tools/` is the row worth pointing at when somebody asks what is unusual here. It holds the
checkers, and every one of them ships with its own test file. A gate is a claim that something is
true, and a gate nobody has watched fail is an untested claim wearing the costume of a check.

Inside `quality/e2e/`, the same idea applies one level down:

| Directory | What it is |
|---|---|
| `tests/` | the reviewed suite that gates every merge |
| `tests-generated/` | the quarantine where agent-drafted tests land, gating nothing |
| `tests-prod/` | the post-deploy smoke, run against a live URL under its own config |

Three directories because they answer three different questions, and none of them ever run together.
The full account of the agent half is in [`AGENTIC-QA.md`](AGENTIC-QA.md).

## Two things called a spec

The word appears twice in this repository and means two opposite things. Confusing them is the most
likely misreading of the whole layout.

| | [`SPEC-TEMPLATE.md`](../quality/e2e/SPEC-TEMPLATE.md) | `quality/e2e/specs/*.plan.md` |
|---|---|---|
| Written by | a person | the planner agent |
| Written when | **before** the feature exists | **after** it exists |
| Source of truth | the agreed behaviour | the running application |
| Used for | keeping implementer and tester honest | drafting tests to generate |

They sit at opposite ends of the same feature. One precedes the code and describes what it should do;
the other follows the code and describes what it does.

**That difference is also the risk, and it is worth saying out loud.** An agent-written plan takes the
running application as ground truth, so if a feature shipped with a defect, the plan records the
defect as the specification and the generated test will defend it against its own fix. Nothing in the
agent pipeline can catch that, because the agent has no idea what the feature was supposed to do. A
human-written feature spec is the only thing that does, which is why the older artifact is not
superseded by the newer one. They cover different failures.
