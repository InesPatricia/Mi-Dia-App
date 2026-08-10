// Cycle (opt-in) tests: OFF by default (no cycle chrome), and enabling the Settings
// switch surfaces the Rhythm lens + "Ritmul meu" access in the Calendar.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

const openCalendar = async (page) => {
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'cal');
};
const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
};

test.describe('cycle (opt-in)', () => {
  test('is OFF by default — no cycle chrome in the Calendar', async ({ page }) => {
    await gotoApp(page);
    await openCalendar(page);

    // only Plan + Mood lenses (no Rhythm), and the "Ritmul meu" access is hidden
    await expect(page.locator('#calLensWrap').getByRole('button', { name: 'Rhythm', exact: true })).toHaveCount(0);
    await expect(page.locator('#cycleSetupBtn')).toBeHidden();

    // and the Settings opt-in switch is off
    await openSettings(page);
    await expect(page.getByRole('switch')).not.toBeChecked();
  });

  test('enabling the switch surfaces the Rhythm lens + access', async ({ page }) => {
    await gotoApp(page);
    await openSettings(page);

    // toggle the opt-in switch on
    const sw = page.getByRole('switch');
    await sw.click();
    await expect(sw).toBeChecked();

    // back to the Calendar -> the Rhythm lens now exists; selecting it reveals access
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await openCalendar(page);

    // the Rhythm lens now exists; selecting it reveals the "Ritmul meu" access
    const rhythm = page.locator('#calLensWrap').getByRole('button', { name: 'Rhythm', exact: true });
    await expect(rhythm).toBeVisible();
    await rhythm.click();
    await expect(page.locator('#cycleSetupBtn')).toBeVisible();
  });
});
