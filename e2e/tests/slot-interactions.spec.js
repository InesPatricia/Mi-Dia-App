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

    const b = block(page, 'Read book');
    // v128: the tick is now a real role="button" with an i18n aria-label + aria-pressed
    const tick = b.getByRole('button', { name: 'Mark as done' });
    await tick.click();
    await expect(b).toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'true');

    expect((await readBlocks(page)).find((x) => x.title === 'Read book').done).toBe(true);

    // toggling again clears it
    await tick.click();
    await expect(b).not.toHaveClass(/done/);
    await expect(tick).toHaveAttribute('aria-pressed', 'false');
  });

  test('two-tap delete removes a slot', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Temp task');

    const del = block(page, 'Temp task').locator('.del');
    await del.click(); // first tap arms ("✕ sigur?")
    await del.click(); // second tap confirms

    await expect(page.locator('#list').getByText('Temp task')).toHaveCount(0);
  });

  test('rescheduling to Tomorrow removes the slot from today', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Move me');

    const b = block(page, 'Move me');
    await b.locator('.time').click(); // open the inline editor
    await b.getByRole('button', { name: 'Tomorrow', exact: true }).click();

    await expect(page.locator('#list').getByText('Move me')).toHaveCount(0);
  });

  test('the "hide completed" filter hides done slots', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Keep me');
    await addSlot(page, 'Done one');

    await block(page, 'Done one').getByRole('button', { name: 'Mark as done' }).click();
    await expect(block(page, 'Done one')).toHaveClass(/done/);

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByLabel('hide completed').check();

    await expect(page.locator('#list').getByText('Done one')).toHaveCount(0);
    await expect(page.locator('#list').getByText('Keep me')).toBeVisible();
  });

  test('overlapping timed slots render side-by-side in a cluster', async ({ page }) => {
    await gotoApp(page);
    await addSlot(page, 'Sync A', { time: '10:00', dur: 60 }); // 10:00–11:00
    await addSlot(page, 'Sync B', { time: '10:30', dur: 60 }); // 10:30–11:30 (overlaps)

    const cluster = page.locator('.cluster');
    await expect(cluster).toHaveCount(1);
    await expect(cluster.locator('.block')).toHaveCount(2);
    await expect(cluster.getByText('Sync A')).toBeVisible();
    await expect(cluster.getByText('Sync B')).toBeVisible();
  });
});
