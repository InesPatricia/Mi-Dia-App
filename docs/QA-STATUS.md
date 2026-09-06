# QA arc status

The one file to open to know where this work stands. A person reads **Now** and stops. An agent
starting cold reads all of it and needs nothing else.

**This file is not free-form notes.** Part of it is generated from the repository, and
`node quality/tools/qa-status.mjs --check` refuses a phase marked DONE whose files are not there. A
status nobody re-checks drifts, and a stale status is worse than none: the next reader builds on a
floor that was never poured.

---

## Now

**Phase:** 6. Phases 0 through 5 are done.

**Branch state:** pull request 54 is merged, so everything through phase 4 is on `main`. This branch
and `origin/main` differ by that merge commit and by nothing else: `git diff 247e1a6 origin/main` is
empty, so phase 5 was built on exactly the content `main` carries and no merge was needed to start
it.

Phase 5 itself is **in the working tree and not committed**. Committing, pushing and opening the
pull request were not asked for and are Ines's call. Four files are involved:
`quality/tools/mutate.mjs`, `quality/tools/mutate.test.mjs`,
`quality/tools/MUTATION-REPORT.md`, and one probe added to `quality/tools/qa-status.mjs`.

**Next action:** phase 6, the end-to-end architecture. The baseline it will be measured against is
recorded, which was the whole point of doing phase 5 first. Re-run `node quality/tools/mutate.mjs`
after the refactor and compare: a mutant caught before and not caught after means the refactor
swallowed an assertion.

**Blocked on:** nothing.

**Open items, none of them blocking:**

- `quality/unit` is not linted. ESLint refuses files above its config's directory and the only
  install sits in `quality/e2e`. Closing it needs an install whose config sits at or above
  `quality/`, which is a change to how this repository installs tooling, not a one-line fix.
- The workflow repeats the project list that the `test` script in `quality/e2e/package.json` already
  defines. Having the shard command call that script deletes the duplication rather than guarding it.
- Four checks that can block a merge have no test file of their own: `quality/tools/qa-status.mjs`,
  `quality/tools/check-skips.mjs`, `quality/e2e/count-tests.js` and `quality/e2e/validate-build.js`.
  The sentence in `docs/REPO-LAYOUT.md` that says every checker ships with one is not true, and the
  honest end state is to write them rather than to narrow the sentence.
- Rule 9 of the documentation gate reads commands written in documents but not the npm scripts those
  commands now point at.
- **Two coverage holes the mutation audit found, both recorded in `quality/e2e/specs/BUGS.md`.**
  TD-004: the write that gives a new user their two default rituals can be removed entirely and the
  whole functional suite still passes, because every ritual spec seeds its own data. TD-005: the
  cycle phase boundary can move by a day and only the unit level notices, although the phase is on
  screen. Both are the shape of case phase 7 is for.
- **`quality/tools/mutate.test.mjs` is deliberately not wired into CI**, which is a departure from
  every other checker in that folder. It asserts the audit's anchors against the promoted build in
  `public/`, so a future build promotion would turn a required check red over a report rather than
  over the release. That would make half the audit a merge gate, which the decisions table below
  rejected on purpose. A stale anchor still stops the audit loudly at run time, where it belongs. If
  that trade is wrong, amend the decision rather than quietly wiring it up.
- `quality/tools/verify-live.mjs` could compare the required-check list in `docs/RUNBOOK.md` against
  what GitHub actually enforces. Confirmed reachable through `gh`.
- Two product defects are waiting for a session on `staging`, both with a verdict and the evidence
  already recorded in `quality/e2e/specs/BUGS.md`: BUG-001, a class-name collision that makes a
  ritual tick untappable after one tap, and BUG-004, a backup import that restores nothing and
  reports success.
- **Expect one red on the reconcile after this merges.** `staging` still carries the narrow rule 4,
  with no bare-count pattern, and its copy of `docs/testing-notes.md` still states a hardcoded test
  count. Both were measured across the two worktrees, not predicted. When the widened rule arrives
  there it will report that number, which is the gate working on first contact rather than a new
  defect. The fix is the same one this branch made: delete the figure and point at the runner, since
  that file lives on branches that legitimately report different counts.

**Two ordering rules that cost rework if broken:**

- Phase 6 comes after phases 3, 4 and 5. The unit and integration levels decide which end-to-end
  tests stop carrying arithmetic, and the mutation baseline has to be recorded before the refactor
  moves anything, or there is nothing to compare against.
- Phase 7 comes after phase 6, so new specs are written once, in the final shape.

---

## Findings carried forward

Each of these cost a session to learn, and each applies to work that has not been done yet.

1. **A gate that is armed is not a gate that has run.** `qa-status.mjs --check` was wired into CI in
   phase 2 and failed twelve seconds into the first push, two phases later. It embedded the branch
   name in a block it then compared byte for byte, and a pull request is checked out detached, where
   `rev-parse --abbrev-ref HEAD` answers `HEAD`. It could not pass on a pull request by construction,
   and nothing local could have found it. Push earlier than feels necessary.
2. **A hand-written list drifts behind the thing it describes.** In one arc: the skip checker's
   directory list, the npm script's project list, the schema document's key table, and a sentence in
   the repository layout. Where a list can be derived, derive it. Where it cannot, keep it in one
   place and make it fail closed.
3. **Prose is the one claim the documentation gate cannot check.** Rule 1 catches a path that no
   longer resolves. Nothing catches a sentence that says three directories when there are four.
4. **A mutation that did not apply looks exactly like a mutation nothing caught.** Anchors have to be
   unique and have to be verified as applied. A multi-line anchor matches nothing in a CRLF file, and
   a replacement of the first occurrence lands wherever that happens to be.
5. **An equivalent mutation is not an uncaught one.** Code guarded twice does not change behaviour
   when one guard is removed. That is a fact about the code, not a hole in the suite, and it needs a
   verdict of its own.
6. **A mutation harness restores from its own copy, never from git.** A `git checkout --` used to
   undo a mutation discarded a document's uncommitted correction, which then had to be rewritten.

---

## Progress

Status is one of NOT STARTED, IN PROGRESS, DONE, BLOCKED, DROPPED. Proof is the command that settles
it, never an opinion. Update this table by hand, then run `node quality/tools/qa-status.mjs`.

| Phase | Delivers | Status | Proof |
|---|---|---|---|
| 0 | Land the status system on main, reconcile, branch, baseline | DONE | `node quality/tools/check-docs.mjs` |
| 1 | Point defects, and the count rule that missed one | DONE | `node quality/tools/check-docs.mjs` |
| 2 | Linting, and the status check armed in CI | DONE | `npx eslint .` inside the e2e folder |
| 3 | Unit level over the pure calc layer | DONE | `node --test` inside the unit folder |
| 4 | Integration level over the persistence boundary | DONE | `npx playwright test --project=integration` |
| 5 | Mutation audit: the tool, and the baseline table | DONE | `node quality/tools/mutate.mjs` |
| 6 | Page objects, fixtures, shared strings, renames | NOT STARTED | `npm test` inside the e2e folder |
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
| 2 | yes eslint config present; yes status check wired into CI | COMPLETE |
| 3 | yes module loader present; yes ritual calc tests present; yes cycle calc tests present | COMPLETE |
| 4 | yes schema spec present; yes import spec present; yes integration project declared | COMPLETE |
| 5 | yes tool present; yes baseline report committed; yes tool has its own tests | COMPLETE |
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

Done. Four files, in `quality/unit/`: the loader `load-module.mjs`, the calc tests
`ritual-calc.test.mjs` and `cycle-calc.test.mjs`, and `load-module.test.mjs` for the loader itself,
which the plan did not ask for.

The seam already existed and was declared: `src/modules/ritual.js` and `src/modules/cycle.js` both
mark a calc block as pure and export it for exactly this. The plan said the sandbox would need
stubs. It needs none: both modules load in a vm context whose global object starts empty, and that
is now checked on every run instead of having been read once.

**Three deviations from what this section originally said, and why.**

1. **The proof command changed** from `node --test quality/unit/` to `cd quality/unit && node
   --test`. The first form does not work: on Node 24 a positional argument is a file to run, not a
   directory to search, so it exits with MODULE_NOT_FOUND before running anything. A glob argument
   works there and needs a Node new enough to accept one, and naming the files explicitly means a
   file added later silently never runs. Running the runner with no argument from inside the folder
   depends on none of that, and it is the same shape as the phase 2 proof beside it.
2. **A fourth file was added** for the loader. `plainCopy` is the kind of helper that fails by
   silently doing nothing, and it did: its first version copied a sandbox array with `map`, which
   builds the result through the source array's own constructor and therefore returned another
   sandbox value. Every check in `quality/tools` ships with its own test file for this reason and
   the loader is no different.
3. **The tests pin the timezone to UTC.** Every function here works in local midnight, so the
   result should not depend on whether it ran on a laptop at UTC+2 or on a runner at UTC. The pin
   also keeps the daylight-saving case below genuinely open rather than half answered, since UTC has
   no transition to cross.

Cases that still cannot be written: a streak crossing a daylight-saving change, a log of four
hundred days, a duplicated day in the log, a future date in the log, and a frequency with an empty
day list, where the behaviour is undefined nowhere and undocumented everywhere.

It runs in the fast `validate` job, as `cd ../unit && node --test`. No path argument, because a
directory positional works on Node 20 and not on Node 24, and a glob needs a runner new enough to
expand one. A relative `cd` rather than a step-level working directory, because the job already
carries a default and GitHub's syntax reference does not say how the two combine. Both halves were
run on a real Node 20 before being trusted, and the step has since run green in CI.

It is still not linted, for the reason named in **Now**.

### Phase 4. Integration level

Done. A Playwright project named `integration` with its own directory,
`quality/e2e/tests-integration/`, holding `storage-schema.spec.js` and `backup-import.spec.js`. No
clicks, no navigation between views, no assertion about appearance. The workflow's shard command
names it beside the gated project, so the authoring zone still stays out of a merge.

**Three deviations from what this section originally said, and why.**

1. **"Write through the module API" is not possible.** There is no module API to write through. The
   build inlines every module inside the application's single closure, so `Ritual`, `Cycle` and
   `Store` are all a ReferenceError from the page, measured rather than assumed. The writes this
   level exercises are therefore the ones the application makes on its own: the first-run seed, a
   reload, and the backup import, which is reached by setting the hidden file input the import
   button targets. That is still the persistence boundary and it is still not a user journey.
2. **"Check the documented shape" ran into a document that was wrong.** See BUG-003, now closed.
   `docs/DATA_SCHEMA.md` named three keys the application had never written, got all three shapes
   wrong and omitted four more. It is corrected, and the spec now parses its key table rather than
   keeping a second copy, so a key written without a row turns the suite red. That is what finally
   satisfies this section's own sentence.
3. **"An older version key" turned out to be a case with nothing to assert,** because the import
   never reads the version. Kept as a test anyway, and renamed to say so: the field looks like a
   migration hook and is not one, which is worth pinning before somebody plans a schema change
   around it.

Two additions the section did not ask for, both because the level would otherwise be invisible to
the checks that already exist: the ESLint config now covers `tests-integration`, and
`count-tests.js` reports the level beside the other four.

### Phase 5. Mutation audit

Done. Three files: the harness `quality/tools/mutate.mjs`, its own tests
`quality/tools/mutate.test.mjs`, and the committed baseline `quality/tools/MUTATION-REPORT.md`. One
probe was added to `quality/tools/qa-status.mjs` so a later session cannot drop the test file
silently.

Six mutants across two modules, run against three levels plus a control run. **One survived, and it
was put there to.** The results worth carrying forward are in the report, and two of them are holes
rather than reassurances:

- The end-to-end suite catches all three ritual arithmetic defects through the same two tests. The
  unit level catches them in about a second; the functional suite needs six minutes to say the same
  thing through a screen. That is the measurement behind invariant 5.
- **The first-run seed can be removed entirely and every functional test still passes.** Only the
  integration level notices, because every ritual spec writes its own `rituals` key before the page
  loads, so nothing in `quality/e2e/tests/` ever boots a user who has none. Recorded as TD-004 in
  `quality/e2e/specs/BUGS.md`.
- **Both browser levels are blind to the cycle phase arithmetic.** `cycle-phase-off-by-one` moves
  the menstrual boundary by a day and only the unit level notices, although the phase is on screen.
  Recorded as TD-005.
- `streak-guard-bound` survived every level and the verdict is **equivalent, not a gap**: it is the
  safety bound of a loop that breaks within a handful of iterations, so no reachable input can tell
  3999 from 4000. It is in the catalogue precisely so the report's hardest column exists on a real
  case, since finding 5 demands that verdict and no run had ever produced one.

**Five deviations from what this section originally said, and why.**

1. **The mutation goes into two files, not "the build".** The unit level loads
   `src/modules/ritual.js` in a sandbox and the browser levels serve `public/index.html`, which are
   two copies of the same code. Mutating one of them would have each level answering about a
   different program while the report filed both answers in one row. That the calc block is
   byte-identical in both is asserted against the real tree rather than assumed.
2. **A control run was added.** Not asked for, and the audit is worthless without it: a red level
   says nothing about a mutant if the suite was already failing beforehand. The tool refuses to
   continue unless every level it was asked to run is green first.
3. **"Done-check ignoring today" became an off-by-one, and two mutants were added.** `isDone`
   returning a flat false is caught by the same two tests as the other arithmetic mutants and
   teaches nothing they do not. Changing `>= 0` to `> 0` covers the asked-for case, since a log
   holding only today puts today at index 0, and it is closer to the shape a real edit takes. The
   suggested set also sampled one module, which is a hole a report cannot caveat its way out of, so
   `cycle-phase-off-by-one` covers a second one. `streak-guard-bound` is there to make the SURVIVED
   column exist on a real case rather than only in the harness's own tests.
4. **Retries are pinned to 0 during the audit.** A retry absorbs a transient failure, and here a
   failure is the signal being measured. The suite's measured flake rate over 415 executions is 0,
   so nothing is hidden by turning them off.
5. **The tool ships with a test file that is not in CI.** See the open items above. Wiring it into
   the required job would make a build promotion fail a merge gate over this report, which
   contradicts the decision that the audit is a manual run. Raised rather than done.

**The two requirements this arc had already paid for**, both from running the audit by hand in
phases 3 and 4, are both implemented and both were broken on purpose and watched to fail:

- **An anchor that is not unique, or that does not match, is refused.** A replacement of the first
  occurrence lands wherever that happens to be, and a multi-line anchor matches nothing at all in a
  file with CRLF endings, which the harness now translates rather than misses. Every file is read
  back after writing, so an application that did not happen cannot be read as a mutation nothing
  caught.
- **An equivalent mutation is not an uncaught one.** The tool reports SURVIVED and stops there; the
  verdict is a person's, written into the report under Verdicts. Exercised on a real case:
  `streak-guard-bound` survived every level and the written verdict is that it is equivalent.

Whether each mutation was really applied is settled by observation rather than by trust. The three
arithmetic mutants turned two levels red on the same edit. `seed-writes-nothing` turned the
integration level red while the end-to-end level stayed green, on the same mutated `public/index.html`
inside the same staging, which is what proves the served build carried the defect and the functional
suite ran against it without noticing.

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
- `docs/REPO-LAYOUT.md` gains a row for the unit directory. Done already, in phase 4, because the
  same section had been made wrong by the integration level and both belonged in one edit.
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
