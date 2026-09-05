# QA arc status

The one file to open to know where this work stands. A person reads **Now** and stops. An agent
starting cold reads all of it and needs nothing else.

**This file is not free-form notes.** Part of it is generated from the repository, and
`node quality/tools/qa-status.mjs --check` refuses a phase marked DONE whose files are not there. A
status nobody re-checks drifts, and a stale status is worse than none: the next reader builds on a
floor that was never poured.

---

## Now

**Phase:** 5. Phases 0 through 4 are done.

**Next action:** the mutation audit. A tool and a committed baseline report, recorded **before** the
phase 6 refactor moves anything, because the whole value of the report is the comparison afterwards.
Detail below, and it now carries two requirements learned by running the audit by hand twice.

**Blocked on:** nothing.

**Not pushed:** everything since the last push. Ten commits on this branch, five for phase 1 and
five for phase 2. Phases 3 and 4 are in the working tree and not committed. One commit on `staging`
carries phase 1's other half.

**What phase 4 delivered.** A Playwright project named `integration` with its own directory,
`quality/e2e/tests-integration/`, holding `storage-schema.spec.js` for what the app writes and
`backup-import.spec.js` for what a file can do to it. No clicks and no navigation between views. A
reload is used where a reload is the thing being tested.

Three things were wired up so the level is not decorative. The lint now covers the new directory,
which took one line and was verified by breaking a rule inside it. `count-tests.js` reports the
level, because a file that calls itself the single source of truth for how many tests exist cannot
be blind to a whole level. And the CI shard command names both gated projects, since the flag is
variadic and the authoring zone still has to stay out.

**The open item from phase 3 is half closed.** The unit level now runs in the fast `validate` job.
The command is `node --test` with no path argument, from inside the folder: a directory positional
works on Node 20 and does not on Node 24, and a glob needs a runner new enough to expand one, while
searching the working directory needs neither. Node 20 is what CI pins, and the whole unit level was
run on a real Node 20, fetched with `npx node@20`, rather than argued from the documentation.

**Still open, with the reason measured rather than assumed:** `quality/unit` is not linted. The only
ESLint install in this repository sits in `quality/e2e/node_modules`, and ESLint refuses to lint a
file above its config's directory. Tried and rejected: passing `../unit` as a path, passing it with
an explicit `--config`, and adding a `files: ['../unit/**/*.mjs']` block, which reports every file
as ignored. Closing this needs an ESLint install whose config sits at or above `quality/`, which is
a change to how this repository installs tooling and belongs in its own decision.

**Two findings, both recorded in `quality/e2e/specs/BUGS.md` rather than fixed here.**

- **BUG-003, now closed.** `docs/DATA_SCHEMA.md`, the file the router sends you to before touching
  persistence, named three keys the application has never written and got all three of their shapes
  wrong. It said `blocks`, `cats` and `journal`; the app writes `day:<date>`, `areas` and
  `journal:<date>`, and it also writes four keys the document did not mention. Corrected from the
  source, with the markers given a table of their own. The **Since** values did not move: every one
  of those keys is already in the earliest build in the repository.

  **The document is now the contract, not a description of one.** The integration spec parses the
  key column out of it and fails if the app writes anything with no row, so this drift cannot repeat
  quietly. That is what finally satisfies the phase's own sentence, "check the documented shape",
  which could not be done while the document disagreed with the application.
- **BUG-004.** A backup file whose values are not strings restores nothing and reports "Import
  successful (0 entries)". The `version` field that could have caught it is written by the export
  and never read by the import.

**The finding worth carrying.** Seven mutations were applied to the promoted build, one at a time,
each reverted after the run. Five were caught on the first pass. Neither of the two misses was a
gap in the tests, and that distinction is the lesson:

- One anchor, `daysCache=null;`, occurs twelve times in the build, so the replacement landed on the
  first occurrence and modelled nothing at all. A mutation that reports itself as uncaught when it
  was never applied is worse than no mutation, because it sends the next person to rewrite a test
  that was already correct.
- The other was an **equivalent mutation**. Removing the first-run seed guard changes no observable
  behaviour, because the seeding block is protected twice, by the marker and by a check that the
  cache is empty. Both have to go before anything is different. Rewritten as a two-part mutation, it
  was caught.

Phase 5 has to handle both: refuse an anchor that is not unique, and give an equivalent mutation a
verdict of its own rather than counting it as a hole in the suite.

**Three defects this arc introduced, found by reviewing the unpushed work rather than by any check.**
All three are fixed here, and the pattern in them is the same: a change widened what the pipeline
does, and the things that describe the pipeline stayed where they were.

- **A gate went blind on the zone it was meant to guard.** `quality/tools/check-skips.mjs` carried a
  hand-written list of gated directories. Phase 4 made `tests-integration/` merge-blocking and
  phase 3 added `quality/unit/`, and neither was added to that list, so a skipped test in the two
  newest gated directories was invisible to the one check written to see it. Its file filter only
  matched the Playwright spec suffix too, so listing the unit directory without widening the filter
  would have read none of it. Both fixed, and the pattern now covers node:test's spellings, `it` and
  `todo`, and the `{ skip: true }` options object. Verified by planting a disabled test in each zone in each
  spelling and watching every one go red, and by planting a properly justified one and watching it
  pass.
- **The local command stopped matching the gate.** `npm test` ran one project while CI ran two, so a
  developer could get a green the merge gate would not agree with. It now runs the same pair, proved
  by comparing what each selects rather than by reading the strings, and `test:functional`,
  `test:integration` and `test:unit` name the levels individually.
- **Two documents were made false and nothing noticed.** `docs/REPO-LAYOUT.md` said three
  directories that never run together; there are four and two of them run together. Its subsystem
  table was also missing `quality/unit/`, which retires the item phase 8 had for it.
  `docs/RUNBOOK.md` gave a reproduction command for a failed shard that ran only one of the two
  projects the shard runs.

**The lesson worth carrying from those three:** a gate whose scope is a hand-written list drifts
behind the thing it guards, and prose is the one kind of claim the documentation gate cannot check.
Rule 9 reads documented commands but not the npm scripts they now point at, which is the same shape
of gap, still open.

**Two defects in the fixes themselves, both found by breaking them.** The parser that made
`DATA_SCHEMA.md` executable first read every table row in the section, and a markdown section runs
to the next level-two heading, so it swept in the settings field table as though `lang` and `theme`
were storage keys: the documented set was larger than the document. And restoring a mutated file
with `git checkout` discarded the uncommitted correction it was supposed to protect, which had to be
rewritten. A mutation harness restores from its own copy, never from git, and its anchors have to
tolerate CRLF or they match nothing and report themselves as misses.

`quality/unit` now has a `package.json` whose only script is the test run, so the level has a home
and one way to run it. The ESLint question stays where it was.

**BUG-001 got its answer, and it is not a fix in this worktree.** The highest-value thing in the
backlog is a confirmed high-severity defect in the application: a class-name collision that makes a
ritual tick untappable after the first tap, reachable by anyone in two taps. It was reproduced on
demand against the promoted build before anything was touched, using the test that has been sitting
red by design in the quarantine since August.

All three candidate fixes recorded for it were then applied one at a time and measured. All three
turn that test green, so working is not what separates them. The one to take scopes the overlay rule
to the single element it was written for, because it removes the class of defect instead of this
instance of it, and it is also the smallest diff.

**The better fix was the one nobody could verify, which turned out to be the real finding.** The
celebration overlay it touches had no automated coverage anywhere. That is now written, in the spec
that owns the interaction which raises it: hidden while the day is unfinished, raised when the last
open slot is ticked, and clearing itself. Both cases were broken on purpose. With the fix applied
they stay green and the quarantined test goes green in the same run.

The fix itself belongs on `staging`, as a new build. This branch is reserved for tests, gates and
tooling, the promoted build here is well behind staging, and editing a promoted file in place would
break the versioning law. The full verdict, with the table of candidates, is in the BUG-001 entry.

The suite grew, so the published count moved. The badge, the README sentence and the coverage line
in `docs/APP-REFERENCE.md` were all updated from what the runner reports, which is the check that
made the drift impossible to miss.

**What is not verified.** The two workflow edits have never run in CI, because this branch is not
pushed. What was checked instead: the file parses as YAML and the two steps come out of the parser
in the shape they are meant to have; both shard commands were run
locally exactly as written, both green, and between them they accounted for every test in the two
gated projects; and the unit step was run from the directory the job defaults to, since it uses a
relative `cd` rather than a step-level working directory, which GitHub's syntax reference does not
say how to resolve against an existing default. None of that is the same as watching the job go
green, and the first push has to look.

**Two ordering rules that cost rework if broken:**

- Phase 6 comes after phases 3, 4 and 5. The unit and integration levels decide which end-to-end
  tests stop carrying arithmetic, and the mutation baseline has to be recorded before the refactor
  moves anything, or there is nothing to compare against.
- Phase 7 comes after phase 6, so new specs are written once, in the final shape.

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
| 2 | yes eslint config present; yes status check wired into CI | COMPLETE |
| 3 | yes module loader present; yes ritual calc tests present; yes cycle calc tests present | COMPLETE |
| 4 | yes schema spec present; yes import spec present; yes integration project declared | COMPLETE |
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

Two things the unit level does not have yet, both named in **Now**: it is not in CI, and it is not
linted.

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
2. **"Check the documented shape" ran into a document that is wrong.** See BUG-003. The specs assert
   the measured contract and name the divergence in a comment that points at the entry, because a
   spec asserting the document would be red against a correct application. Correcting
   `docs/DATA_SCHEMA.md` is its own change and has not been made.
3. **"An older version key" turned out to be a case with nothing to assert,** because the import
   never reads the version. Kept as a test anyway, and renamed to say so: the field looks like a
   migration hook and is not one, which is worth pinning before somebody plans a schema change
   around it.

Two additions the section did not ask for, both because the level would otherwise be invisible to
the checks that already exist: the ESLint config now covers `tests-integration`, and
`count-tests.js` reports the level beside the other four.

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

**Two requirements this arc has already paid for**, both from running the audit by hand in phases 3
and 4, and both about the same thing: the tool must never report a hole in the suite that is not
there.

- **Refuse an anchor that is not unique, and refuse one that does not match.** A replacement of the
  first occurrence lands wherever that happens to be, and a multi-line anchor matches nothing at all
  in a file with CRLF endings. Both failures look exactly like a mutation nothing caught. Every
  mutation has to report whether it was actually applied, and the applied text has to be checked,
  not assumed.
- **An equivalent mutation is not an uncaught one.** Some code is guarded twice, and removing one
  guard changes no observable behaviour. That is a fact about the code, not a gap in the tests, and
  it needs a verdict of its own in the report. Two of the three first-pass misses across those two
  phases were of these kinds, and neither meant what it appeared to mean.

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
