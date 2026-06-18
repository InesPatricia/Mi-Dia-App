// Shortcuts block tests (v112+): tap a pill to PRE-FILL the composer, the per-pill "+"
// to add instantly (no time), add a new shortcut, and delete one in edit mode.
//
// Locators: shortcut pills are anchored by their visible label (getByRole/hasText). The
// per-pill "+" has an i18n aria-label ("Add instantly (no time)") and is scoped to its
// pill. The ✎ edit toggle is an icon-only control reached by its stable id (#scEditBtn).
const { test, expect } = require('@playwright/test');
const { gotoApp, readBlocks } = require('./helpers');

const PH = 'What do you want to do today?';
const ADD_DIRECT = 'Add instantly (no time)';

const chips = (page) => page.locator('#chips');
const pill = (page, label) => page.locator('.scpill', { hasText: label });

test.describe('shortcuts', () => {
  test('the 3 curated defaults are shown', async ({ page }) => {
    await gotoApp(page);
    for (const name of ['Coaching session', '4F reflection', 'Movement / walk']) {
      await expect(chips(page).getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('tapping a shortcut pre-fills the composer (does not add a slot)', async ({ page }) => {
    await gotoApp(page);
    await chips(page).getByRole('button', { name: 'Coaching session', exact: true }).click();

    // composer is now expanded and the title is pre-filled...
    await expect(page.locator('#composer')).toHaveClass(/active/);
    await expect(page.getByPlaceholder(PH)).toHaveValue('Coaching session');
    // ...but nothing is committed yet
    await expect(page.locator('#list').getByText('Coaching session')).toHaveCount(0);
  });

  test('the per-pill "+" adds an untimed slot instantly', async ({ page }) => {
    await gotoApp(page);
    await pill(page, 'Movement / walk').getByRole('button', { name: ADD_DIRECT, exact: true }).click();

    await expect(page.locator('#list').getByText('Movement / walk')).toBeVisible();
    const block = (await readBlocks(page)).find((b) => b.title === 'Movement / walk');
    expect(block.time).toBe(''); // untimed
  });

  test('adding a new shortcut makes it appear in the grid', async ({ page }) => {
    await gotoApp(page);
    await chips(page).getByRole('button', { name: /Add a shortcut/ }).click();

    const form = page.locator('#scForm');
    await expect(form).toBeVisible();
    await page.getByPlaceholder('Shortcut name…').fill('Morning pages');
    await form.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(chips(page).getByRole('button', { name: 'Morning pages', exact: true })).toBeVisible();
  });

  test('edit mode deletes a shortcut (two-tap)', async ({ page }) => {
    await gotoApp(page);
    await page.locator('#scEditBtn').click(); // enter edit mode -> pills show ✕

    const x = pill(page, 'Movement / walk').locator('.scp-x');
    await x.click(); // arms
    await x.click(); // confirms

    await expect(chips(page).getByRole('button', { name: 'Movement / walk', exact: true })).toHaveCount(0);
  });
});
