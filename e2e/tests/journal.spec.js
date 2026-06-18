// Journal + Stare (mood) tests for the redesigned journal (v125+).
// Locators: mood discs carry i18n aria-labels (EN mood names), so getByRole by name,
// scoped to #mood. The permission-pause / emotion-wheel chips are dynamic generated
// content with no stable name -> reached structurally within their containers. The free
// text area is found by its placeholder. State (selection, low-mood pause) is asserted on
// class / visibility.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

const PH_JOURNAL = 'Write freely'; // start of the EN ph_journal placeholder

// open the Journal view from the flower
async function openJournal(page) {
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'journal');
}

test.describe('journal + mood', () => {
  test('selecting a mood updates the mood word and (high mood) shows no pause', async ({ page }) => {
    await gotoApp(page);
    await openJournal(page);

    const mood = page.locator('#mood');
    await mood.getByRole('button', { name: 'Clear', exact: true }).click();

    await expect(page.locator('#moodWord')).toHaveText('Clear');
    await expect(mood.getByRole('button', { name: 'Clear', exact: true })).toHaveClass(/sel/);
    // "Clear" (mood 5) is not a low mood -> the permission pause stays hidden
    await expect(page.locator('#permPause')).toBeHidden();
  });

  test('a low mood reveals the permission pause + emotion-wheel drilldown', async ({ page }) => {
    await gotoApp(page);
    await openJournal(page);

    await page.locator('#mood').getByRole('button', { name: 'Rainy', exact: true }).click();

    const pause = page.locator('#permPause');
    await expect(pause).toBeVisible();
    await expect(page.getByRole('button', { name: /breath|respira/i })).toBeVisible();

    // drill down: pick the first emotion core -> sub-emotions appear -> pick the first
    await page.locator('#ppCores button').first().click();
    const subs = page.locator('#ppSubs');
    await expect(subs).toBeVisible();
    await subs.locator('button').first().click();

    // the chosen emotion chip is shown
    await expect(page.locator('#ppChosen')).toBeVisible();
  });

  test('journal text + mood autosave and survive a reload', async ({ page }) => {
    await gotoApp(page);
    await openJournal(page);

    await page.locator('#mood').getByRole('button', { name: 'Fair', exact: true }).click();
    await page.getByPlaceholder(PH_JOURNAL).fill('Reflection entry 123');

    // navigating away flushes the debounced save; then reload from storage
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await openJournal(page);

    await expect(page.getByPlaceholder(PH_JOURNAL)).toHaveValue('Reflection entry 123');
    await expect(page.locator('#mood').getByRole('button', { name: 'Fair', exact: true })).toHaveClass(/sel/);
  });

  test('export buttons are available', async ({ page }) => {
    await gotoApp(page);
    await openJournal(page);
    // the buttons carry an emoji prefix ("📄 Word") -> substring match, not exact
    await expect(page.getByRole('button', { name: 'Word' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible();
  });
});
