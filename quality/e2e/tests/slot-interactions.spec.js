// Slot-interaction tests for the Day plan: done toggle, delete (two-tap), reschedule, the hide-done
// filter, and Outlook-style overlap clustering.
//
// Locators: each slot is anchored by its user-typed title (a stable, user-facing anchor). Inside a
// slot, controls that HAVE a name are reached by role (the move buttons; the hide-completed filter
// via its label); controls with no accessible name (the time pill is a span) are reached
// structurally within the anchored block. The persisted model is checked with readBlocks().
// Backlog: the time pill has no accessible name, which is an accessibility gap in the application;
// instrumenting it the way v128 instrumented the tick would let this use getByRole too.
//
// Migrated to the page object layer. The local addSlot helper became two branchless methods on the
// Day page object, addSlot and addTimedSlot, because the composer's two commit paths are not
// interchangeable and every call here wants one or the other rather than a choice made at runtime.
const { test, expect } = require('../fixtures/app.fixture');
const { readBlocks } = require('./helpers');

test.describe('slot interactions', () => {
  test('tapping the tick marks a slot done (and persists)', async ({ app, page }) => {
    await app.launch();
    await app.day.addSlot('Read book');

    // v128: the tick is a real role="button" with an i18n aria-label + aria-pressed
    const tick = app.day.tick('Read book');
    await tick.click();
    await expect(app.day.block('Read book')).toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'true');

    // the done state is persisted to the model
    expect((await readBlocks(page)).find((entry) => entry.title === 'Read book').done).toBe(true);

    // toggling again clears it
    await tick.click();
    await expect(app.day.block('Read book')).not.toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'false');
  });

  test('two-tap delete removes a slot', async ({ app }) => {
    await app.launch();
    await app.day.addSlot('Temp task');

    const remove = app.day.blockDelete('Temp task');
    await remove.click(); // first tap arms it, and the label changes to ask for confirmation
    await remove.click(); // second tap confirms

    // the slot is removed from the Day list
    await expect(app.day.list.getByText('Temp task')).toHaveCount(0);
  });

  test('rescheduling to Tomorrow removes the slot from today', async ({ app }) => {
    await app.launch();
    await app.day.addSlot('Move me');

    await app.day.timePill('Move me').click(); // open the inline editor
    await app.day.moveButton('Move me', 'Tomorrow').click();

    // moved to tomorrow -> no longer on today's list
    await expect(app.day.list.getByText('Move me')).toHaveCount(0);
  });

  test('the "hide completed" filter hides done slots', async ({ app }) => {
    await app.launch();
    await app.day.addSlot('Keep me');
    await app.day.addSlot('Done one');

    // mark one of the two slots done
    await app.day.tick('Done one').click();
    await expect(app.day.block('Done one')).toHaveClass(/done/);

    // enable the "hide completed" filter
    await app.day.filters.click();
    await app.day.hideCompleted.check();

    // the done slot is hidden, the open one stays
    await expect(app.day.list.getByText('Done one')).toHaveCount(0);
    await expect(app.day.list.getByText('Keep me')).toBeVisible();
  });

  test('overlapping timed slots render side-by-side in a cluster', async ({ app }) => {
    await app.launch();
    await app.day.addTimedSlot('Sync A', { time: '10:00', dur: 60 }); // 10:00 to 11:00
    await app.day.addTimedSlot('Sync B', { time: '10:30', dur: 60 }); // 10:30 to 11:30, overlapping

    // the two overlapping slots form a single side-by-side cluster
    await expect(app.day.clusters).toHaveCount(1);
    await expect(app.day.clusters.locator('.block')).toHaveCount(2);
    await expect(app.day.clusters.getByText('Sync A')).toBeVisible();
    await expect(app.day.clusters.getByText('Sync B')).toBeVisible();
  });
});

// The celebration overlay had no coverage at all, which is why this block exists.
//
// It matters beyond the feature. BUG-001 is a class-name collision: the ritual module borrows the
// celebrate class to restart a pulse, and the unscoped overlay rule that owns that name drags
// position:fixed and inset:0 onto the ritual tick, which then sits over the flower and cannot be
// tapped again. The fix that removes the collision at its source scopes the overlay rule to the one
// element it was written for, and nothing in this suite would have noticed if that went wrong. Now
// something does.
test.describe('the day-finished celebration', () => {
  // The assertion that guards the scoping fix. If the overlay ever loses the rule that hides it, it
  // sits over the whole app from first paint, and this is the only thing that would say so.
  test('stays hidden while the day is unfinished', async ({ app }) => {
    await app.launch();
    await app.day.addSlot('Still to do');

    await expect(app.day.block('Still to do')).toBeVisible();
    await expect(app.celebration.overlay).toBeHidden();
  });

  test('appears when the last open slot is ticked, and clears itself', async ({ app }) => {
    await app.launch();
    await app.day.addSlot('The only thing');

    // maybeCelebrate runs inside the tick handler, so the overlay is up before the click resolves.
    // It removes itself after about two seconds, which is why nothing here waits before asserting.
    await app.day.tick('The only thing').click();
    await expect(app.celebration.overlay).toBeVisible();

    // and it is a moment, not a state: it puts itself away without another interaction
    await expect(app.celebration.overlay).toBeHidden();
  });
});
