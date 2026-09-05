# Known defects and open questions

A backlog, not a report. Every entry is something a person could pick up and act on, written so that
picking it up does not require re-deriving how it was found.

## How an entry is written

- **Status** is one of CONFIRMED, UNCONFIRMED, or OPEN QUESTION. CONFIRMED means somebody reproduced
  it deliberately and can do it again on demand. UNCONFIRMED means it was observed once, in one
  configuration, and the generalisation has not been tested. OPEN QUESTION means the facts are known
  and their meaning is not.
- **Evidence** is a command or a file path, never a recollection.
- **Not checked** is mandatory. An entry that claims no limits is an entry nobody can trust.
- Nothing here is fixed as a side effect of other work. These are separate changes, each with its own
  diff, so the fix is reviewable next to the defect it closes.

This file was opened on 2026-08-20, while the repository's focus was on learning the Playwright MCP
agent workflow rather than on fixing the application. The defects below were found BY that workflow,
which is the reason they are recorded rather than acted on immediately.

---

## BUG-001. A CSS class-name collision makes the ritual tick untouchable after a check

**Status** CONFIRMED
**Severity** High. It is reachable by a normal user with two taps, and it breaks the control it
decorates.
**Found by** The generated test for scenario 1.2, on its first run. See
`specs/ritual-1.2-dead-ends.md` for the full investigation log.

### What happens

Check a ritual on Home, then try to un-check it. The second tap never lands. The tick is also no
longer where it was: it is pinned to the top left corner of the viewport, overlapping the flower,
while the card it belongs to has no tick at all.

### Root cause

Two rules claim the same class name, and the specific one does not cover everything the general one
sets.

1. `public/index.html` defines an unscoped rule for the full-screen congratulations overlay:
   `.celebrate{position:fixed;inset:0;pointer-events:none;display:none;...}`
2. The ritual module calls `celebrate(id)`, which adds that same class to the card's tick purely to
   restart a pulse animation.
3. The rule the ritual module means to hit, `#ritualMount .r-tick.celebrate`, sets `animation` and
   nothing else. `position` and `pointer-events` therefore fall through to rule 1.

`display:none` does NOT leak, because `#ritualMount .r-tick` has higher specificity and sets
`display:grid`. That detail matters: it is why the runner reports the element as visible, enabled and
stable, and then hangs on hit-testing, instead of failing fast on visibility.

`celebrate(id)` is called only on the branch where a ritual becomes done, so a check triggers it and
an un-check does not. The blast radius is the same in practice, because the check comes first.

The tick recovers on the next re-render of `#ritualMount`, since the renderer reassigns `innerHTML`
and rebuilds the cards. The trap is that the usual way to trigger a re-render is to tap a tick, and
this tick is the one that no longer works. Checking a different ritual repairs it.

### Evidence

```
cd quality/e2e
npx playwright test tests-generated/second-tap-un-checks-a-done-ritual.spec.js \
  --project=generated --retries=0 --workers=1
```

The run fails at the second `tick.click()` with:

```
<div class="flower"> from <div class="bloom-wrap"> subtree intercepts pointer events
```

Independently measured with `document.elementFromPoint` at the tick's centre, before and after a
check:

```
BEFORE  tick {x:334, y:647, w:28, h:28}
AFTER   tick {x:0,   y:0,   w:28, h:28}
```

The `AFTER` rectangle is the signature of `position:fixed; inset:0`.

### A wrong diagnosis, recorded so nobody repeats it

The first reading of that geometry was that the flower had grown over the tick and was swallowing the
tap, and the proposed fix was `pointer-events: none` on `.bloom-wrap`. **Both are wrong.** The flower
never moved. The tick was teleported onto it. The proposed fix would also have broken real behaviour,
since `toggleBloom`, `closeBloom` and `bloomAction` are live handlers in that area.

The general lesson: a measurement can be correct and its explanation still wrong. Reading the CSS
settled it; inferring from coordinates did not.

### Candidate fixes, measured 2026-09-05

Still present in the promoted build, reproduced on demand before anything was tried. Each candidate
was then applied to that build on its own, the quarantined test run against it, and the build
restored. **All three turn scenario 1.2 green**, so "does it work" does not separate them. What
separates them is what each one leaves behind.

| Candidate | 1.2 green | What it leaves behind |
|---|---|---|
| F1, rename the ritual pulse class to `r-celebrate` | yes | the global `.celebrate` rule keeps carrying layout, so the next element to take that name falls in the same hole |
| F2, scope the overlay rule to `#celebrate` | yes | nothing. The class name stops carrying layout at all |
| F3, reset what the specific rule inherits | yes | the collision, plus a rule that works only while somebody remembers why it is there |

**Take F2.** It removes the class of defect rather than this instance of it, and it is also the
smallest diff of the three: two selectors, no JavaScript. The one element that rule was written for
already carries `id="celebrate"`, so the scoping costs nothing.

**F2 needed coverage first, and now has it.** The celebration overlay had no automated test
anywhere, which meant the better fix was the one nobody could verify. `tests/slot-interactions.spec.js`
now covers it: hidden while the day is unfinished, raised when the last open slot is ticked, and
clearing itself afterwards. Both cases were broken on purpose and watched go red. With F2 applied,
they stay green and the quarantined test turns green in the same run.

### Not fixed here, and where it belongs

This branch is `qa/test-architecture`, which the router reserves for tests, gates and tooling rather
than application changes. The fix is a new build on `staging`, which is at v185 while the build
promoted in this worktree is v172. Editing the promoted file in place would break the versioning
law, and cutting a v173 here would fork the numbering against staging.

Do NOT "fix" this in the test. Retrying, forcing the click, adding a wait, or softening the assertion
all turn a real defect into a green tick.

### What it blocks

Scenario 1.2 stays red until the CSS is fixed, deliberately. Its mutation-register entry, deleting
the un-check branch in `toggleCheck`, cannot be exercised through a real tap either, because the tap
never reaches that function.

### Not checked

- Whether it reproduces on a real Android device. Headless Chromium at phone viewport is not a phone.
- Whether the same collision affects any other element that takes the `celebrate` class. Only one
  element in the build carries it as markup, and it is the overlay, but that was read rather than
  exercised.
- What F2 does to the confetti, which is created as children of the overlay. The tests assert that
  the overlay appears and clears, not that sixty coloured squares fall correctly.
- Whether it reproduces with a real finger on a real device, which is the only place `pointer-events`
  and hit-testing behave for certain.

### Checked, with one loose end

The whole gated suite was run against the build with F2 applied, both projects, and it passed. Two
navigation cases needed a retry and were reported flaky. They are not obviously related: F2 changes
which selector owns the overlay's positioning, and those two are about petal routing and the bottom
bar.

That run also reported a wall clock of over eight hours for a suite that normally takes minutes,
which says the machine was not in a normal state for it, so the flake is more likely about the run
than about the change. Re-running the navigation spec three times over on the restored build gave
fifteen of fifteen with no retries. Recorded rather than dismissed: the phase 0 baseline measured no
flake at all across four hundred and fifteen executions, so two is a change from a known number and
the next full run should be watched.

---

## BUG-002. The tick's centre can sit under the bottom bar

**Status** UNCONFIRMED
**Severity** Unknown until it is generalised.
**Found by** Incidental measurement while investigating BUG-001.

At one scroll position in the 393x851 viewport, `document.elementFromPoint` at the tick's centre
returned the `.bottombar` element rather than the tick.

This did not break the test, because Playwright scrolls an element into view before clicking, and
after that scroll the tick was clear. A human who has scrolled to that exact position would tap the
bottom bar instead of the ritual.

### Evidence

```
BEFORE  hit: bottombar   tick {x:334, y:647}
```

### Not checked

Everything that would make this a real defect. It was observed at one scroll offset, in one viewport,
with one ritual seeded. Before treating it as a bug, measure the tick's centre against
`elementFromPoint` across scroll positions and across a list long enough to push cards under the bar.

---

## OPEN-001. Production and local `public/index.html` are not the same file

**Status** OPEN QUESTION

The page served from production and the local `public/index.html` differ in size, 645628 bytes
against 653390 at the time of writing. Both contain the three pieces of BUG-001, so the defect is
present in both, but the divergence itself has not been explained.

This matters beyond this bug. If the two differ, then any local reproduction is evidence about the
local file only, and every "verified in production" claim needs the fetch to prove it.

### Not checked

Which build is promoted, when it was promoted, and whether the difference is meaningful or an
artefact of how the page is served. Start from the `CACHE` name in `sw.js`.

---

## Test debt

Not defects, but the reason a defect this visible survived a green suite.

**TD-001. Nothing in the functional suite taps the same control twice.** The only second tap in
`tests/ritual.spec.js` is on the delete button, which is a deliberate two-tap confirm. Scenario 1.2 is
the first thing in the repository to press the same tick again. A control that behaves differently on
its second activation is a common defect shape and the suite has no coverage of it anywhere.

---

## Harness notes

Operational, not product defects. Recorded because they cost time and will cost it again.

**HN-001. Stopping a background `playwright test` on Windows does not stop its children.** Both the
`npx` parent and the test process survive, along with any worker. Two live runners competing for port
5173 look exactly like a broken harness: runs produce no output at all and hang for minutes. After
stopping a background run, list surviving Playwright processes and kill them by pid before starting
another.

**HN-002. When a run goes quiet, do not theorise about the test body.** Two cheap diagnostics settle
it in seconds: list the tests, then run the seed test alone. Both returning fast and clean means the
harness is fine and the problem is in the scenario or the app.

**HN-003. MCP test-server processes outlive the agent session that started them.** They were left
running after the generator session. Check for them before blaming a later run.

---

## OPEN-002. main and staging have drifted far enough to need reconciling

**Status** CLOSED, 2026-09-02. Reconciled. What happened is recorded at the end of this entry,
including the three predictions here that did not hold.

Measured 2026-08-20, on the merge base at that date:

```
staging ahead of main    37 commits
main ahead of staging     4 commits

quality/tools/check-skips.mjs        exists on main, not on staging
quality/e2e/tests-generated/         exists on main, not on staging
quality/e2e/tests/garden.spec.js     exists on staging, not on main
src/mi-dia-v172.html  ->  v184       836 lines apart
```

The four commits main is ahead by are structure: the silent-skip checker, the quarantine project and
the agent scaffolding. Staging does not have any of it, so work generated there today would not be
covered by the boundaries this repository just spent a week building.

This is the situation `/reconcile` exists for, and rule 6 of the documentation gate is the thing that
will report it. Recorded here because a number this large stops being obvious once it is normal.

### Measured, 2026-08-20

`git merge-tree --write-tree origin/main staging` computes the merge without touching either branch:

```
conflicts   0
```

The merged tree is what the reconciliation rule asks for, checked file by file rather than assumed.
Structure arrives: `check-skips.mjs`, `tests-generated/seed.spec.js`, `tests-generated/strings.js`,
`specs/ritual.plan.md` and this file are all absent from staging today and all present after. Product
survives: `tests/garden.spec.js` stays, and `src/` holds staging's build rather than reverting to
main's older one, because git resolved the rename correctly.

The first attempt used the local `main` ref, which was two merges stale, and reported that the plan
and this file would not arrive. The numbers did not fit what was known to be on main, which is what
prompted the second look. Recorded because a stale ref produces a confident wrong answer rather than
an error.

### Still not checked

Zero textual conflicts is not zero semantic conflicts. Both branches edited roughly fifteen files
under `quality/e2e/tests/`, and git can merge those line by line into a suite that does not run.
Nobody has executed the merged tree. The reconciliation is finished when the suite is green on
staging afterwards, not when the merge command exits.

Two things will land on staging that were never enforced there, and either may go red on first
contact, which is them working rather than failing. `check-skips.mjs` refuses a `test.skip` that
carries no reason, and the commit hook now refuses an added em dash.

### What actually happened, 2026-09-02

Reconciled with the `reconcile` skill. Thirty-eight commits, not thirty-seven: both branches moved
in the two weeks between the measurement and the merge.

The structure arrived as predicted, all of it: the skip checker, the quarantine project and its
seed, the plan, and this file. `tests/garden.spec.js` survived, and `src/` kept the staging build.

Three things the entry got wrong, all worth keeping because each one is a lesson about predicting a
merge from a measurement taken earlier.

**Zero conflicts became two.** `git merge-tree` was right on the day it ran and out of date by the
time the merge happened. `docs/testing-notes.md` conflicted on content and `quality/e2e/specs/README.md`
on modify against delete. Both resolved from main, by the structure rule.

**Neither of the two predicted first-contact failures happened, and a third one did.** The skip
checker passes on staging. The commit hook did refuse, but not over an em dash: it refused the
entire work-in-progress build over thirty emoji, all thirty of which were already sitting unchanged
in the committed previous build. The versioning law writes every build as a new file, so a per-line
ratchet has nothing to be new against. That was fixed before the reconcile, on its own branch.

**A previous reconciliation had already lost files, silently.** The modify-against-delete conflict
was git offering back a file that the merge of 2026-08-16 had dropped inside its own merge commit,
with nothing reporting it. `src/mi-dia-v172.html` went the same way and was left out deliberately
this time, since staging has moved well past it. Nothing in the pipeline would have caught either.

The open question at the end of this entry is answered: the merged tree does run. The gated suite is
green on staging, eighty-five of eighty-five, and the documentation gate passes all ten rules with
rule 6 green, which is the signal the routers match again.

---

## TD-002. Nothing gates markdown that GitHub renders differently from its source

**Status** CONFIRMED, and one instance is fixed. The gap is not.

`SPEC-TEMPLATE.md` carried `# Feature spec ... <NAME>` and a table cell containing `<key>`. GitHub
treats angle brackets as HTML and strips them, so the rendered title read as a heading with a
dangling dash and no subject, and the table cell lost half its content. Both are now wrapped in
backticks.

The instance was found by opening the page on GitHub, not by any check. Rule 7 of the documentation
gate already encodes exactly this reasoning for mermaid labels, where HTML is stripped and words fuse
together. The same failure in ordinary markdown is ungated.

Two things make this class expensive: it is invisible in the source, so review does not catch it, and
it only appears in the place a reader actually looks.

### A candidate rule 10

Refuse a bare `<PLACEHOLDER>` outside a code span or fence, in any scanned doc. The hard part is not
the detection, it is the exceptions: real HTML in markdown is legal and this repository may want it
somewhere. Worth writing only with a test that proves it does not fire on a legitimate use.

### Not checked

Whether other rendered defects exist that the source hides. Only two documents have ever been opened
on GitHub and compared against their source.

---

## TD-003. The production smoke's same-origin 404 scan cannot fail for a missing app asset

**Status** CONFIRMED. Reproduced on demand, on both deployed environments.

`tests-prod/smoke-prod.spec.js` collects every same-origin response with `status() >= 400` and
asserts the list is empty. On Cloudflare Pages that list cannot fill, because the host answers an
unknown path with the single-page fallback rather than a 404:

```
curl -o /dev/null -w "%{http_code} %{size_download}" https://mi-dia-app.pages.dev/definitely-not-here.js
200 645628

curl -o /dev/null -w "%{http_code} %{size_download}" https://staging.mi-dia-app.pages.dev/definitely-not-here.js
200 669943
```

645628 is the byte length of the promoted `index.html`. The host is serving the page, with a 200, in
place of the asset that is missing.

Confirmed a second way: a `fetch()` for a non-existent same-origin path, injected into the page after
load and before the scan, does not appear in the collected list. The listener is fine. There is
nothing for it to collect.

Only Cloudflare's own namespace returns a real status: `/cdn-cgi/nope` answers 404. No application
asset lives there, so no reachable regression can produce a 4xx.

**Why it still matters.** The failure this was written to catch is real and the consequence is worse
than a 404: a `<script src="...">` whose target is missing receives HTML with a 200, and the parser
fails on it. That surfaces as a console error, and the same test does assert that console errors are
empty, so the failure class is covered. It is covered by a different assertion than the one whose
name promises it.

**Candidate fixes**, none applied here.

- Assert on `content-type` rather than on status: a request for a `.js` or `.css` path that comes
  back `text/html` is the actual defect, and it is detectable.
- Add a `404.html` to the Pages output, which makes the host return a real 404 for unknown paths and
  restores the assertion as written.
- Delete the scan and rely on the console-error assertion, saying so, rather than keeping a check
  that reads as coverage it does not provide.

The first is the smallest and needs no hosting change.

### Not checked

Whether the same fallback applies to every content type, or only to paths without an extension the
host recognises. Both probes used a `.js` extension. Whether any Pages configuration turns the
fallback off. Whether the console-error assertion actually fires on an HTML-served script, which
would settle how much real coverage remains: that needs a build with a deliberately broken asset
reference, which is a change to the application rather than to the suite.

---

## BUG-003. The schema document names three keys the application has never written

**Status** CLOSED, 2026-09-03. The document is corrected and the integration level now reads it, so
the same drift cannot repeat silently. What changed, and what the fix itself turned up, is at the
end of this entry. Everything above that section is left as it was written, because the measurement
is the useful part and editing it after the fact would hide how the defect was found.

Was: CONFIRMED. Reproduced on demand, against the promoted build and against the build in
progress on `staging`.
**Severity** High for a reader, none for a user. Nothing is broken at runtime. What is broken is the
document `CLAUDE.md` routes you to before touching persistence, which means anybody who trusts it
writes code against keys that do not exist.
**Found by** Writing the integration level, phase 4 of the QA arc, which was asked to check the
documented shape and could not.

### What the document says, and what the app does

`docs/DATA_SCHEMA.md` calls itself "the complete persistence contract" and lists `blocks`, `cats`
and `journal` as storage keys since v23. None of the three has ever been a key.

| Documented | Actually written | Note |
|---|---|---|
| `blocks` | `day:YYYY-MM-DD` | one key per day, not one collection |
| `cats` | `areas` | `CATS` is an in-memory index rebuilt from `areas` by `rebuildCats()`, never stored |
| `journal` | `journal:YYYY-MM-DD` | one key per day |

All three shapes are wrong too, each in its own way.

| Documented shape | What is actually stored |
|---|---|
| `cats`: `{ id, label, color }` | an `areas` entry is `{ id, emoji, color, soft, ink, defMin }`, with no `label` |
| `blocks`: `[{ id, title, cat, time, dur, tags[], done, date }]` | `addBlock` builds `{ id, title, cat, time, dur, tags, done }`. No block has ever carried a `date`; the date is the key |
| `journal`: `{ text, mood, event }` | `saveJournal` writes `{ text, mood, event, emotion }` |

The missing `emotion` is the most interesting of the three, because the document did keep up once:
it records that the older `comp` field was dropped in v52. `emotion` arrived with the emotion wheel
in the v90 to v97 arc and was never added.

Keys the document does not mention anywhere: `shortcuts`, `calmlog:YYYY-MM-DD` (a per-day list of
`{ id, ts }`), `proj:<id>`, `activeTimer`, and the first-run markers `sc_default3_v117`,
`mig_clear_4f_v2`, `mig_tags_v2`, `mig_tags_v3`. The migration flags `mig_proj_v1` and `mig_proj_v2`
appear in prose but not in the table.

**The Since column is not part of the defect.** Every one of `areas`, `shortcuts`, `day:`,
`calmlog:` and `proj:` is present in `mi-dia-v22.html`, the earliest numbered build in this
repository, so the document's v23 is right about their age and wrong only about their names.

**A trap for the next reader.** `docs/history/BUILD-LOG.md` carries "dropdown Arie reparat
(`cats`->`areas`)" in the v151 to v153 entry, which reads like a storage key rename that the
document simply missed. It is not one. That entry is about the area dropdown, and no build in this
repository has ever written a `cats` key.

### Evidence

No build in this repository has ever written a `cats` key, across the whole history:

```
git log --all --oneline -S'Store.set("cats"' -- '*.html'      no commits
git log --all --oneline -S'Store.set("areas"' -- '*.html'     back to the first commit
```

The age of each undocumented key was read the same way, then confirmed by looking inside the
earliest numbered build rather than trusting a commit date, since this history was rewritten when
the repository was made public:

```
git show c46c20f:mi-dia-v22.html | grep -c 'Store.set("shortcuts"'    1
```

**A note on method, because one of these greps is misleading.** Enumerating keys with
`grep 'Store.set("<literal>'` undercounts: `calmlog:` is written through a computed key inside
`logCalm`, so a literal search says it is exported and never written, which is false. The key list
below was taken from a real boot and from the export's own key list, not from grep alone.

A first run leaves exactly these keys, read out of `localStorage` after boot:

```
areas  mig_clear_4f_v2  mig_proj_v1  mig_proj_v2  mig_tags_v2  mig_tags_v3
projects  rit_seeded_v1  rituals  sc_default3_v117  settings  shortcuts  tags
```

That list is now asserted by `quality/e2e/tests-integration/storage-schema.spec.js`, so a key added
without a decision goes red. The list in that file is the measured one, with a comment pointing
here, because a test that asserted the document would be red against a correct application.

### Not checked

- Whether `intent:`, `tags`, `projects`, `settings`, `cycle` and `rituals` match their documented
  shapes. Only the three wrong names and the three shapes above were compared field by field.
- Whether the `mig_*` markers are all still doing something, or whether some describe a migration
  no living install still needs.
- Whether the commit dates survived the history rewrite that made this repository public. The
  ordering was used as evidence and the dates were not.

### Checked, and clean

No other document repeats the wrong names: `grep -rn` across `docs/`, `README.md`, `CLAUDE.md` and
`quality/` finds them only in `DATA_SCHEMA.md` itself, in the build-log line quoted above, and in
the files that describe this defect.

### What was done, 2026-09-03

The three names and the three shapes were corrected, and the keys the document never mentioned were
added with the shapes measured from the source: `shortcuts`, `calmlog:YYYY-MM-DD`, `proj:<project
id>` and `activeTimer`. The markers got a table of their own. The **Since** values did not move.

Then the part that matters more than the correction: the document became the contract instead of a
description of one. `quality/e2e/tests-integration/storage-schema.spec.js` parses the key column out
of the two tables and fails if the application writes anything that is not in them. A key added
without a row now turns the suite red, which is the only arrangement in which this defect cannot
come back the same way.

Broken on purpose, five ways, each caught with its own message: a documented key loses its row, a
documented marker loses its row, the app writes a key nobody documented, the heading is renamed so
the parser cannot find the table, and the table body is emptied while the heading stays.

**The fix had a defect of its own, found by the fourth of those.** The first parser collected every
pipe-row in the section, and a markdown section runs to the next level-two heading, so it swept in
the field table under `### settings` as though `lang` and `theme` were storage keys. The documented
set was quietly larger than the document. Emptying the key table on purpose is what exposed it: the
check still passed, on rows that had nothing to do with keys. It now reads the first contiguous
table only, and refuses to run on a section it cannot parse.

**And a process note worth more than the fix.** While breaking the gate, a `git checkout --` was
used to restore the document and discarded every uncommitted correction in it, which then had to be
rewritten from scratch. The restore in a mutation harness has to come from a copy the harness itself
holds. The same script also carried anchors with a literal newline, which match nothing in a CRLF
file and report themselves as mutations nothing caught, which is the same trap phase 3 hit.

---

## BUG-004. A backup whose values are not strings restores nothing, quietly

**Status** CONFIRMED. Reproduced on demand.
**Severity** Medium. It needs a file the app did not produce, and when it happens the user is told
the import succeeded.
**Found by** The integration level, writing the malformed-input cases for backup import.

### What happens

`importData` writes only the values that are already strings:

```js
for(const k of Object.keys(data)){ if(typeof data[k]==="string"){ await Store.set(k, data[k]); n++; } }
```

The store holds strings, so a genuine export always satisfies this. A file that has been through any
tool that parses and re-serialises JSON does not: its `tags` is an array, not a string containing an
array. Every key is skipped, the store is untouched, and the toast reports "Import successful (0
entries)", which reads as success.

The `version` field that could have caught this is written by the export and never read by the
import. It looks like a migration hook and is not one.

### Evidence

`quality/e2e/tests-integration/backup-import.spec.js` pins both halves: a dump with an array value
imports nothing and reports zero, and a dump claiming `version: 0` is imported anyway.

### Candidate fixes, none applied

- Serialise a non-string value instead of skipping it, so `{"tags": ["a"]}` restores as
  `'["a"]'`. Smallest change, and it makes a hand-written backup work.
- Refuse the file when nothing was written, rather than reporting a successful import of nothing.
- Read `version` and refuse a dump the running build does not know how to read. Largest change and
  the only one that also covers a future schema change.

The second is the smallest honest fix: it does not guess what the user meant, and it stops the
message that says the opposite of what happened.

### Not checked

- Whether any real tool produces such a file. This was constructed, not found in the wild.
- What happens to a value that is a string but not the JSON the key expects. The import writes it
  through, and the loader for that key is what decides, which is a different question from this one.
