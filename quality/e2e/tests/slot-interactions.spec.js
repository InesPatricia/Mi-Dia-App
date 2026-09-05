// Slot-interaction tests for the Day plan: done toggle, delete (two-tap), reschedule,
// the hide-done filter, and Outlook-style overlap clustering.
//
// Locators: each slot is anchored by its user-typed title via getByText / hasText (a
// stable, user-facing anchor). Inside a slot, controls that HAVE a name use getByRole
// (the "Tomorrow"/… move buttons; the "hide completed" filter checkbox via its label);
// controls with no accessible name (the done tick = a <div>, the time pill = a <span>)
// are reached structurally WITHIN the anchored block. The persisted model is checked
// with readBlocks(). (Backlog: the tick + time pill have no accessible name — an a11y
// gap; instrumenting them like v126 would let these use getByRole too.)
const { test, expect } = require('@playwright/test');
const { gotoApp, readBlocks } = require('./helpers');

const PH = 'What do you want to do today?';

// add an activity through the composer; optionally set a native time + a duration chip.
async function addSlot(page, title, { time, dur } = {}) {
  await page.getByPlaceholder(PH).fill(title);
  if (dur) await page.getByRole('button', { name: String(dur), exact: true }).click();
  if (time) await page.locator('#composer').getByLabel('Time').fill(time);
  if (time || dur) {
    await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  } else {
    await page.getByPlaceholder(PH).press('Enter');
  }
}

const block = (page, title) => page.locator('.block', { hasText: title });

test.describe('slot interactions', () => {
  test('tapping the tick marks a slot done (and persists)', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Read book');

    const slot = block(page, 'Read book');
    // v128: the tick is now a real role="button" with an i18n aria-label + aria-pressed
    const tick = slot.getByRole('button', { name: 'Mark as done' });
    await tick.click();
    await expect(slot).toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'true');

    // the done state is persisted to the model
    expect((await readBlocks(page)).find((entry) => entry.title === 'Read book').done).toBe(true);

    // toggling again clears it
    await tick.click();
    await expect(slot).not.toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'false');
  });

  test('two-tap delete removes a slot', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Temp task');

    const del = block(page, 'Temp task').locator('.del');
    await del.click(); // first tap arms ("✕ sigur?")
    await del.click(); // second tap confirms

    // the slot is removed from the Day list
    await expect(page.locator('#list').getByText('Temp task')).toHaveCount(0);
  });

  test('rescheduling to Tomorrow removes the slot from today', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Move me');

    const slot = block(page, 'Move me');
    await slot.locator('.time').click(); // open the inline editor
    await slot.getByRole('button', { name: 'Tomorrow', exact: true }).click();

    // moved to tomorrow -> no longer on today's list
    await expect(page.locator('#list').getByText('Move me')).toHaveCount(0);
  });

  test('the "hide completed" filter hides done slots', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Keep me');
    await addSlot(page, 'Done one');

    // mark one of the two slots done
    await block(page, 'Done one').getByRole('button', { name: 'Mark as done' }).click();
    await expect(block(page, 'Done one')).toHaveClass(/done/);

    // enable the "hide completed" filter
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByLabel('hide completed').check();

    // the done slot is hidden, the open one stays
    await expect(page.locator('#list').getByText('Done one')).toHaveCount(0);
    await expect(page.locator('#list').getByText('Keep me')).toBeVisible();
  });

  test('overlapping timed slots render side-by-side in a cluster', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Sync A', { time: '10:00', dur: 60 }); // 10:00–11:00
    await addSlot(page, 'Sync B', { time: '10:30', dur: 60 }); // 10:30–11:30 (overlaps)

    // the two overlapping slots form a single side-by-side cluster
    const cluster = page.locator('.cluster');
    await expect(cluster).toHaveCount(1);
    await expect(cluster.locator('.block')).toHaveCount(2);
    await expect(cluster.getByText('Sync A')).toBeVisible();
    await expect(cluster.getByText('Sync B')).toBeVisible();
  });
});

// The celebration overlay had no coverage at all, which is why this block exists.
//
// It matters beyond the feature. BUG-001 is a class-name collision: the ritual module borrows the
// `celebrate` class to restart a pulse, and the unscoped overlay rule that owns that name drags
// `position:fixed; inset:0` onto the ritual tick, which then sits over the flower and cannot be
// tapped again. The fix that removes the collision at its source scopes the overlay rule to the one
// element it was written for, and nothing in this suite would have noticed if that went wrong. Now
// something does.
test.describe('the day-finished celebration', () => {
  const overlay = (page) => page.locator('#celebrate');

  // The assertion that guards the scoping fix. If the overlay ever loses the rule that hides it, it
  // sits over the whole app from first paint, and this is the only thing that would say so.
  test('stays hidden while the day is unfinished', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Still to do');

    await expect(block(page, 'Still to do')).toBeVisible();
    await expect(overlay(page)).toBeHidden();
  });

  test('appears when the last open slot is ticked, and clears itself', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'The only thing');

    // maybeCelebrate runs inside the tick handler, so the overlay is up before the click resolves.
    // It removes itself after about two seconds, which is why nothing here waits before asserting.
    await block(page, 'The only thing').getByRole('button', { name: 'Mark as done' }).click();
    await expect(overlay(page)).toBeVisible();

    // and it is a moment, not a state: it puts itself away without another interaction
    await expect(overlay(page)).toBeHidden();
  });
});
