# Scenario 1.2: what did not work

A log of the dead ends hit while generating and running the test for scenario 1.2 of
`specs/ritual.plan.md`, "Second tap on a done ritual un-checks it (toggle off)".

It exists so nobody pays for the same wrong turns twice. The plan says what to build. This says what
already failed, who observed it, and which explanations were tried and thrown away.

Written 2026-08-20, against the build served from `public/index.html` at that date.

## 1. The click that never lands, which is the actual finding

The second tap on the tick does not fail. It hangs, then times out.

Run it and the runner reports:

    > 30 |     await tick.click();
    <div class="flower"> from <div class="bloom-wrap"> subtree intercepts pointer events

Root cause, read in the source and confirmed three ways:

- `public/index.html` has an unscoped rule for the full screen congratulations overlay:
  `.celebrate{position:fixed;inset:0;pointer-events:none;display:none;...}`.
- The ritual code calls `celebrate(id)` after a check, which puts that same class name on the card's
  tick to restart its pulse animation.
- The rule the ritual code intends, `#ritualMount .r-tick.celebrate`, sets `animation` and nothing
  else, so `position` and `pointer-events` fall through to the overlay rule.

The tick is therefore pinned to the top left corner of the viewport and made untouchable. The failure
screenshot under the test-results folder shows it parked over the flower while the card it belongs to
has no tick at all, so this is visible to a user and not only to a test runner.

**Do not treat this as a flaky click.** Retrying it, forcing it, adding a wait, or softening the
assertion all hide a real defect. The spec file is red on purpose and stays red until the CSS
collision is fixed.

## 2. Tooling dead ends, in the order they cost time

**Running the spec with default flags produced no output at all.** The first run, plain
`npx playwright test --project=generated --grep "Second tap" --reporter=line`, sat for five minutes
without printing a line and was stopped. Nothing was captured.

**Stopping a background run did not stop its children.** After the stop, both the `npx` parent and
the Playwright test process were still alive, along with a stranded worker. On Windows this is the
default outcome, not an accident.

**The second attempt inherited the first one's mess.** Re-running with `--timeout=20000 --retries=0
--workers=1` and stdout redirected to a file also produced zero bytes, this time over four minutes.
The cause was not the flags. Two runners were competing for the same server on port 5173.

**What actually unblocked it:** list the surviving processes, stop them by pid, then run once. A
single clean run finished in about thirty seconds and failed exactly where predicted.

The lesson worth keeping: after stopping a background `playwright test` on this machine, confirm no
Playwright process survived before starting another run. Two live runners look exactly like a broken
harness.

**An unset variable ate a download.** `curl -o "$TMPDIR/prod.html"` exited 2, because `$TMPDIR` is
not set in this shell, so the output path was empty. Use an explicit path.

## 3. Explanations that were tried and rejected

Each of these looked plausible while the run was silent. None of them was the cause.

| Hypothesis | Why it was dropped |
|---|---|
| The stdout redirect was buffering the output | The first run had no redirect and printed nothing either |
| `npx` was blocking on a prompt to install `http-server` | It is already present in the local `node_modules/.bin`, and port 5173 was already listening |
| The config or the harness was broken | Two cheap diagnostics returned fast and clean, listing the tests, and running the seed test alone, which passed |
| The `_busy` guard was swallowing the second activation | The click never reaches `toggleCheck`. It fails during hit-testing, inside the browser |

The two cheap diagnostics are the reusable part. When a run goes quiet, list the tests and run the
seed alone before theorising about the test body.

## 4. Claims from the generator agent that did not survive checking

The agent found the defect and named the colliding rules correctly. Three details in its report were
wrong or overstated, and are corrected here because the wrong version is the more memorable one.

**"The class is added after every toggle, check or uncheck."** No. `celebrate(id)` sits inside the
branch that runs only when the ritual becomes done, so only a check adds it. The blast radius is the
same, since the check happens first, but the mechanism is not symmetric.

**"Unreachable for the rest of that page's life."** Overstated. The ritual renderer reassigns the
mount's `innerHTML`, so any re-render rebuilds the cards and drops the stale class. The tick is dead
until the next render, and the catch is that it cannot be triggered from that tick. Checking a
different ritual repairs it.

**"`display:none` applies to the tick."** It does not. `#ritualMount .r-tick` has the higher
specificity and sets `display:grid`, so only `position` and `pointer-events` leak through. This is
worth getting right, because it explains why the runner reports the element as visible, enabled and
stable and then hangs, instead of failing fast on visibility.

## 5. Why the existing suite never caught this

Nothing in the functional suite taps a tick twice. The only second tap in `tests/ritual.spec.js` is
on the delete button. Scenario 1.2 is the first thing in the repo to press the same tick again, which
is why a defect this visible survived a green suite.

A consequence for promotion: the mutation register's entry for this scenario, deleting the
un-check branch in `toggleCheck`, cannot be exercised through a real tap while the CSS collision
stands, because the tap never reaches that function.

## 6. What was not checked

- Production was verified by fetching the page and grepping it for the three colliding pieces. All
  three are present and the fetch returned 200. Nobody opened production in a browser and tapped the
  tick.
- The file served from production was not byte identical to the local `public/index.html` at the time
  of writing, 645628 against 653390 bytes, so a build difference exists between them and was not
  investigated.
- Headless Chromium at phone viewport size is not an Android device. The device pass is still manual.
- The MCP test server processes from the generator session were left running afterwards.
