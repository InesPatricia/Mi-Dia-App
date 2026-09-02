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

### Candidate fixes, none of them applied or verified

- Rename the ritual module's pulse class so it cannot collide, for example `r-celebrate`. Smallest
  blast radius, since only the ritual module uses it.
- Scope the overlay rule to the element it was written for, instead of leaving `.celebrate` global.
- Have the specific rule reset what it does not want to inherit. Least attractive, because it leaves
  the collision in place and depends on remembering it forever.

Do NOT "fix" this in the test. Retrying, forcing the click, adding a wait, or softening the assertion
all turn a real defect into a green tick.

### What it blocks

Scenario 1.2 stays red until the CSS is fixed, deliberately. Its mutation-register entry, deleting
the un-check branch in `toggleCheck`, cannot be exercised through a real tap either, because the tap
never reaches that function.

### Not checked

- Whether it reproduces on a real Android device. Headless Chromium at phone viewport is not a phone.
- Whether the same collision affects any other element that takes the `celebrate` class.

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
