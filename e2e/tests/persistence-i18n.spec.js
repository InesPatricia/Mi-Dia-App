// Persistence + i18n: data survives a reload (localStorage via the Store layer), the
// language switch re-labels the whole UI (including the i18n aria-labels added in v126),
// and the backup export produces a download.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

const PH_EN = 'What do you want to do today?';

test.describe('persistence', () => {
  test('a created slot survives a page reload', async ({ page }) => {
    await gotoApp(page);

    const title = page.getByPlaceholder(PH_EN);
    await title.fill('Persisted task');
    await title.press('Enter');
    await expect(page.locator('#list').getByText('Persisted task')).toBeVisible();

    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));

    // re-rendered from localStorage, no re-entry needed
    await expect(page.locator('#list').getByText('Persisted task')).toBeVisible();
  });

  test('the backup export produces a JSON download', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^mi-dia-backup-.*\.json$/);
  });
});

test.describe('i18n', () => {
  test('switching to Romanian re-labels the UI and the accessible names', async ({ page }) => {
    await gotoApp(page);

    // EN baseline
    await expect(page.getByRole('button', { name: 'Journal', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(PH_EN)).toBeVisible();

    await page.getByRole('button', { name: 'RO', exact: true }).click();

    // visible text + the petal's aria-label both follow the language (v126 a11y fix)
    await expect(page.getByPlaceholder('Ce vrei')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jurnal', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Journal', exact: true })).toHaveCount(0);

    // and the switcher reflects the active language
    await expect(page.getByRole('button', { name: 'RO', exact: true })).toHaveClass(/sel/);
  });
});
