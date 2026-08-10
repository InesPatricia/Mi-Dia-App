// Focus timer (Day-header overlay) and a full backup export -> import roundtrip.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

const PH = 'What do you want to do today?';
const block = (page, title) => page.locator('.block', { hasText: title });

test.describe('focus timer', () => {
  test('the Focus button opens the timer overlay; a preset sets the time; it closes', async ({ page }) => {
    await gotoApp(page);

    // the Focus button opens the timer overlay at the default time
    await page.locator('#focusBtn').click();
    const overlay = page.locator('#focusOverlay');
    await expect(overlay).toHaveClass(/show/);
    await expect(page.locator('#tTime')).toHaveText('25:00'); // default

    // tapping the 45-minute preset updates the displayed time
    // presets are [15, 25, 45, 60] -> index 2 = 45
    await page.locator('#tPresets button').nth(2).click();
    await expect(page.locator('#tTime')).toHaveText('45:00');

    // closing the overlay hides it again
    await page.locator('#focusClose').click();
    await expect(overlay).not.toHaveClass(/show/);
  });
});

test.describe('backup roundtrip', () => {
  test('export then re-import restores a deleted slot', async ({ page }) => {
    await gotoApp(page);

    // 1) create a slot
    const title = page.getByPlaceholder(PH);
    await title.fill('Roundtrip task');
    await title.press('Enter');
    await expect(page.locator('#list').getByText('Roundtrip task')).toBeVisible();

    // 2) export -> capture the downloaded backup file
    await page.getByRole('button', { name: 'You', exact: true }).click();
    await page.locator('#profMode').getByRole('button', { name: 'Settings', exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export/i }).click(),
    ]);
    const backupPath = await download.path();

    // 3) delete the slot back on the Day view
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    const del = block(page, 'Roundtrip task').locator('.del');
    await del.click();
    await del.click();
    await expect(page.locator('#list').getByText('Roundtrip task')).toHaveCount(0);

    // 4) import the backup (hidden file input) -> importData re-renders the day
    await page.getByRole('button', { name: 'You', exact: true }).click();
    await page.locator('#profMode').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#importFile').setInputFiles(backupPath);

    // 5) back to the Day view -> the slot is restored from the backup
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(page.locator('#list').getByText('Roundtrip task')).toBeVisible();
  });
});
