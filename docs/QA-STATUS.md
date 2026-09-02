# QA arc status

The one file to open to know where this work stands. A person reads **Now** and stops. An agent
starting cold reads all of it and needs nothing else.

**This file is not free-form notes.** Part of it is generated from the repository, and
`node quality/tools/qa-status.mjs --check` refuses a phase marked DONE whose files are not there. A
status nobody re-checks drifts, and a stale status is worse than none: the next reader builds on a
floor that was never poured.

---

## Now

**Phase:** 1. Phase 0 is done and pushed.

**Next action:** the point defects. Retire the hand-rolled report script and its npm entry, replace
the two fixed waits with conditions, and widen rule 4 of the documentation gate so a bare test count
cannot slip past it again. Detail below.

**Blocked on:** nothing.

**Phase 0 verified where it runs.** The preview at `staging.mi-dia-app.pages.dev` serves byte for
byte what is committed, compared against the git blob rather than the working copy, which differs by
one byte per line on this machine. Both branches list the same skills.

**What phase 0 delivered:**

- The status system and the commit gate's build baseline are on `main`.
- `qa/test-architecture` is cut from `main`. Everything after this happens here.
- The baseline is in `quality/tools/BASELINE.md`: wall clock, flake rate over 415 executions, spec
  line count, and the number of distinct ways the suite opens one screen.
- `staging` has been reconciled with `main`, and `v185` is committed there on its own.

**The step order in this phase was wrong, and was corrected.** The plan said commit the build first
and reconcile second. That could not work: `.githooks/` is versioned per branch, so `staging` ran the
gate without a build baseline and refused `v185` over thirty inherited emoji. The fix reaches
`staging` only through the reconcile. Reversed, and the reason the original order existed, keeping
the build out of a merge, does not apply to an untracked file.

**Two things the reconciliation surfaced, both recorded rather than repaired here.**

The previous reconciliation dropped two files that `main` had, inside its own merge commit, with
nothing reporting it: `quality/e2e/specs/README.md` and the promoted build it carried. The README is
restored. Losing the build is defensible, since `staging` has moved well past it, but it was a
silent choice rather than a stated one.

The one test in the ungated `generated` project fails, and fails the same way on `main`: a
decorative element above the ritual tick intercepts the second click, so it times out before
reaching the assertion it was written to make. Its commit calls it red on purpose, which is true,
but not for the reason the name suggests. Worth a look on its own, and it belongs in the defect
backlog rather than inside a merge.

**One thing the baseline corrected.** The plan said two of the five ways to open Settings were
latent strict-mode failures. Measured against the running app, all four Settings locator forms
resolve to exactly one element. The ambiguity is on Profile, unscoped, which resolves to two
elements once you are on the Profile screen and throws when clicked a second time. Triggered on
demand rather than inferred. Phase 6 has to scope that locator or the refactor introduces the
failure.

**Two ordering rules that cost rework if broken:**

- Phase 6 comes after phases 3, 4 and 5. The unit and integration levels decide which end-to-end
  tests stop carrying arithmetic, and the mutation baseline has to be recorded before the refactor
  moves anything, or there is nothing to compare against.
- Phase 7 comes after phase 6, so new specs are written once, in the final shape.

**Known unarmed promise:** `qa-status.mjs --check` is not wired into CI yet. Phase 2 arms it. Until
then this file is checked only when somebody runs it by hand. The commit gate's own tests are armed,
in the fast `validate` job, and confirmed running on the CI runner.

---

## Progress

Status is one of NOT STARTED, IN PROGRESS, DONE, BLOCKED, DROPPED. Proof is the command that settles
it, never an opinion. Update this table by hand, then run `node quality/tools/qa-status.mjs`.

| Phase | Delivers | Status | Proof |
|---|---|---|---|
| 0 | Land the status system on main, reconcile, branch, baseline | DONE | `node quality/tools/check-docs.mjs` |
| 1 | Point defects, and the count rule that missed one | NOT STARTED | `node quality/tools/check-docs.mjs` |
| 2 | Linting, and the status check armed in CI | NOT STARTED | `npx eslint .` inside the e2e folder |
| 3 | Unit level over the pure calc layer | NOT STARTED | `node --test quality/unit/` |
| 4 | Integration level over the persistence boundary | NOT STARTED | `npx playwright test --project=integration` |
| 5 | Mutation audit: the tool, and the baseline table | NOT STARTED | `node quality/tools/mutate.mjs` |
| 6 | Page objects, fixtures, shared strings, renames | NOT STARTED | `npx playwright test --project=mobile-chromium` |
| 7 | Offline, keyboard and focus trap, aria contract | NOT STARTED | `node quality/e2e/count-tests.js --check` |
| 8 | Documentation, and the published page | NOT STARTED | `node quality/tools/check-docs.mjs` |

---

## Derived state

<!-- qa-status:derived:start -->

> Generated by `node quality/tools/qa-status.mjs`. Do not edit this block by hand.

- Worktree branch: `qa/test-architecture`
- Authoritative test count: `node quality/e2e/count-tests.js`. This file keeps no second copy.

| Phase | Evidence found on disk | State |
|---|---|---|
| 0 | not machine-checkable, a merge and a set of measurements leave no single file behind | UNVERIFIABLE |
| 1 | yes make-report retired; n/a vacuous assertion gone; yes fixed waits removed; yes count rule widened | COMPLETE |
| 2 | no eslint config present; no status check wired into CI | NONE |
| 3 | no module loader present; no ritual calc tests present; no cycle calc tests present | NONE |
| 4 | no schema spec present; no import spec present; no integration project declared | NONE |
| 5 | no tool present; no baseline report committed | NONE |
| 6 | no pages present; no components present; no fixtures present; no strings present | NONE |
| 7 | no offline spec present; no keyboard spec present; no aria contract present; no pixel baselines retired | NONE |
| 8 | no architecture doc carries the four levels | NONE |

<!-- qa-status:derived:end -->

---

## Phase detail

Enough to execute without the session that produced it. Files that do not exist yet are shown in
code blocks rather than as inline paths, because an inline path is a claim that something is there
and the documentation gate checks that claim.

### Phase 0. Land the status system, reconcile, branch, baseline

1. **Land this file and its tool on `main` first.** They exist only in local commits on
   `qa/architecture-doc`. Cutting the working branch from `main` before that gives a branch on which
   the closing ritual cannot run, because neither the file nor the checker is there.

   This ordering was wrong in the first draft of this plan and a later session caught it: the
   document that tracks the work did not exist on the branch the work was told to start from. Worth
   remembering as a shape, since anything that records progress has to reach the ground before the
   thing it records.

2. On `staging`, commit the work-in-progress build on its own so it does not ride along in a merge.

   The commit gate refuses it until the baseline fix lands. A build is a new file, so every mark
   it inherited reads as one it introduces, and `v185` was refused over thirty emoji that all sit
   unchanged in the committed `v184`. The fix gives a new build the build it succeeds as its
   baseline. Four lines `v185` genuinely adds still carry an em dash, in its own comments, and
   have to lose it first.

   This has to happen before the reconcile, not after. `main` carries the stricter gate, which
   checks em dashes in source as well, and the reconcile brings it to `staging`.

3. Run the `reconcile` skill. Conflicts resolve one way: structure from `main`, product content from
   `staging`.
4. Open `qa/test-architecture` from `main`, in the QA worktree. Everything after this happens there.
5. Record the numbers this arc will be measured against, because a cleanup without a measurement is
   a matter of taste: suite wall-clock time, the real flake rate from a `--repeat-each=5` run, how
   many distinct locator strategies exist for one action, and total spec line count. Recorded in
   `quality/tools/BASELINE.md`, with the commands and the machine they were taken on.

### Phase 1. Point defects

Split by branch, because one of these lives elsewhere.

On the working branch:

- Retire the hand-rolled report script under the e2e folder, its npm script, and the untracked
  report it produced. It duplicated `playwright merge-reports`, its output was dozens of tests out
  of date, and it ran every project including the ungated authoring zone, so its totals counted a
  test that is red by design. Done.
- `quality/e2e/tests/ritual.spec.js` has a fixed wait around the backup import. Replace it with
  `expect.poll` on the stored rituals.
- `quality/e2e/tests-prod/smoke-prod.spec.js` has a fixed wait before the 404 scan. Replace it with
  a load-state wait.
- Widen rule 4 in `quality/tools/check-docs.mjs`. Its patterns require a word beside the number,
  "end-to-end tests" or "Playwright tests" or "smoke tests", so a bare parenthesised count slipped
  through unnoticed in `docs/testing-notes.md` and stayed wrong for months. Name the new pattern
  `BARE_TEST_COUNT`, add a test to `quality/tools/check-docs.test.mjs` that fails without it, and
  fix the stale figure. Done. The figure was removed rather than corrected: that document lives on
  both branches, which report different counts, so any number written there is wrong on one of them.

On `staging`, as its own change: the Garden spec there has three defects. An assertion that a count
is at least zero, which can never fail. A branch that takes a different path depending on whether
today is the first of the month. And a non-retrying count where a web-first assertion belongs.

### Phase 2. Linting, and arming the status check

- Flat ESLint config in the e2e folder with the Playwright plugin. Rules as errors: no fixed waits,
  no conditional in a test, every test asserts something, no forced clicks, no page pause, and a
  minimum identifier length with the canonical loop index exempted. Pin exact rule names from the
  plugin documentation at install time. Do not write them from memory.
- Add both `npx eslint` and `node quality/tools/qa-status.mjs --check` to the fast `validate` job in
  the e2e workflow, next to the test-count check. This is what makes the unarmed promise above true.

### Phase 3. Unit level

```
quality/unit/
  load-module.mjs        runs a module in a vm sandbox and returns its _calc surface
  ritual-calc.test.mjs
  cycle-calc.test.mjs
```

The seam already exists and is declared: `src/modules/ritual.js` marks its calc block as pure and
exports it for exactly this. Verified that nothing in that block touches the DOM, storage or any host
global, so the sandbox needs only stubs. If a module turns out to do work at definition time, fall
back to evaluating the calc surface in the page and say so rather than quietly changing approach.

Cases that cannot be written today: a streak crossing a daylight-saving change, a log of four hundred
days, a duplicated day in the log, a future date in the log, and a frequency with an empty day list,
where the behaviour is undefined nowhere and undocumented everywhere.

### Phase 4. Integration level

```
quality/e2e/tests-integration/
  storage-schema.spec.js    write through the module API, read storage, check the documented shape
  backup-import.spec.js     malformed JSON, an older version key, a value that is not an array
```

A Playwright project named `integration` with its own test directory. No clicks, no navigation, no
assertions about appearance. Add it by name to the workflow command, which currently pins the gated
project explicitly so the ungated authoring zone cannot sneak into a merge.

### Phase 5. Mutation audit

```
quality/tools/mutate.mjs
quality/tools/MUTATION-REPORT.md
```

Apply known mutations to the build and assert that each produces at least one red test, recording
which one. Suggested set: due-today always false, streak always zero, done-check ignoring today, and
the seed helper writing nothing.

The output column that matters is the last one: mutations nothing caught. **Record the baseline
here, before the refactor.** Its whole value is the before-and-after comparison.

Manual run, not a required check. Its failure means the tests are weaker than assumed, which is
information rather than a reason to block a merge.

### Phase 6. E2E architecture

```
quality/e2e/pages/         app, day, journal, calendar, respiro, profile, progress, projects
quality/e2e/components/    rituals, garden, onboarding
quality/e2e/fixtures/      app.fixture.js
quality/e2e/strings/       en.js
```

One page object per view. Rituals, the garden and onboarding are not views, so they are components.
A page object holds locators and actions and never asserts, so the spec keeps the assertion and its
auto-waiting.

The fixture replaces the seed-and-launch pair repeated at the top of every test.
`quality/e2e/tests/helpers.js` stays and shrinks to the data layer. It is good; do not rewrite it.

Migrate one spec at a time, suite green after each. Start with the profile, theme, cycle,
timer-backup and persistence specs, because between them they contain five different ways to open the
same settings screen, two of which are latent strict-mode failures. Rename variables in the same
diff. A separate rename-only commit across twenty specs cannot be reviewed.

Re-run the mutation audit afterwards and compare against the phase 5 baseline. A mutation that was
caught before and is not caught after means the refactor swallowed an assertion.

### Phase 7. New coverage

Written after the refactor so it is written once, in the final shape.

```
quality/e2e/tests/offline.spec.js
quality/e2e/tests/keyboard-a11y.spec.js
quality/e2e/tests/aria-contract.spec.js
```

- Offline: go offline, reload, the app starts and the data is there. Plus the service worker
  registering, and a changed cache name producing the new build on the second open. This is the
  property that defines the product and it has no automated coverage at all today.
- Keyboard: for each of the four overlays, it opens from the keyboard, focus enters, tab does not
  escape behind it, escape closes, focus returns to the trigger. **Expect some of these to fail on
  the first run.** Record what fails in the defect backlog and fix it in a separate change
  immediately afterwards, not as a side effect here.
- Aria contract: replaces the screenshot spec. An accessibility snapshot is independent of operating
  system and fonts, so unlike pixel baselines it can actually run in CI. Remove the visual tag filter
  from the config and retire the baseline-generating workflow once it has nothing left to generate.

The suite grows here, so the published count moves and the badge must be updated. The count check
enforces that.

### Phase 8. Documentation and the page

- `docs/QA-ARCHITECTURE.md` gains the four levels and the test architecture. Use the exact heading
  "Four levels", which is what the status tool probes for.
- `docs/testing-notes.md` gains the same four levels beside its existing smoke and sanity discussion.
- `README.md` gains the architecture note in its testing section.
- `docs/REPO-LAYOUT.md` gains a row for the unit directory.
- A published page for a reader outside the repository. Lead with the incidents, not the diagram: the
  gate that ran green and enforced nothing, the pixel baselines invalidated silently, the package
  install that hung for ninety-eight minutes on a required check, the repair agent that was allowed
  to skip tests. Then the four levels as the explanation. Then a before-and-after from the migration.
  Close with what is not covered.

---

## Decisions already taken

Do not reopen these. If one turns out to be wrong, say so and ask for an explicit amendment rather
than quietly working around it.

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Where the work happens | reconcile `staging` first, then a branch off `main` | working straight on `staging`, which contradicts the branch law and collides with the build in progress there |
| Test architecture | a thin page object layer plus fixtures | a full classic page object model, which buys recognition and costs maintenance; and leaving it alone, which keeps five ways to open one screen |
| Levels | four: unit, integration, end to end, delivery | folding delivery into end to end, which is the most common way those two get confused |
| Existing end-to-end tests | none are deleted in this arc | deleting the ones the unit level makes redundant, which is silent loss of coverage inside a refactor diff |
| Test tags | none | a smoke and sanity and regression taxonomy, which costs maintenance and buys nothing at this suite size |
| Mutation audit | a manual run with a committed report | a required check, since its failure is information rather than a reason to block a merge |
| Screenshot baselines | replaced by accessibility snapshots | regenerating pixel baselines on Linux, which keeps a check that is expensive to hold still |

## Left out on purpose

Named so nobody adds them back by accident, and so the published page can say what is not covered.

- Clock control for streak arithmetic. The unit level absorbs most of the reason for it.
- A WebKit or mobile Safari project. The suite runs one mobile Chromium project.
- A real device pass. Headless Chromium is not a phone, and an accessibility snapshot says nothing
  about how a screen actually looks. This stays manual, in `docs/DEVICE-PASS.md`.

---

## Invariants

These hold for every phase. Breaking one is a defect regardless of whether the suite is green.

1. **A page object never asserts.** It returns locators. The spec holds every assertion, so a failure
   names the behaviour instead of the helper, and the assertion keeps its auto-waiting.
2. **No fixed waits.** Assert the condition instead. For stored state, poll it.
3. **No conditional branch in a test.** A test that takes two paths tells you nothing about which one
   ran.
4. **No test is disabled without a written reason.** `quality/tools/check-skips.mjs` enforces it, and
   an agent may never skip a test on its own authority.
5. **Every new case goes to the lowest level that can hold it.** This is what stops the end-to-end
   suite from growing without limit.
6. **Numbers are derived, never typed.** `quality/e2e/count-tests.js` owns the test count. This file
   keeps no numbers of its own.
7. **Nothing lands in git with an emoji or an em dash.** The commit hook refuses it.
8. **A check that has never failed is not a check.** Break the thing on purpose, watch it go red, and
   only then keep it. Every tool in this arc was found to have a defect this way, including the one
   that generates the block above.

---

## How to update this file

At the end of any session that moved the work:

1. Edit **Now** and the **Progress** table by hand. Those are the human parts.
2. Run `node quality/tools/qa-status.mjs`. It rewrites the derived block and refuses a phase that
   claims more than the repository can show.
3. If a phase is finished, make sure its proof command in the table actually passes.

A note on the derived block: it reports evidence found on disk, which is weaker than proof. A file
existing does not mean it is any good. The proof column in the progress table is the real standard,
and a human still has to run it.
