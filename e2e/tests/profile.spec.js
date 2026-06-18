// Profile tests: the Profile/Settings segmented view, the name field feeding the
// greeting, and seeded daily intentions surfacing in "Intenții recente".
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, dayKey } = require('./helpers');

async function openProfile(page) {
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'profil');
}
// the segment shares the name "Profile" with the bottom bar -> scope to #profMode
const seg = (page, name) => page.locator('#profMode').getByRole('button', { name, exact: true });

test.describe('profile', () => {
  test('the Profile/Settings segment swaps the panels', async ({ page }) => {
    await gotoApp(page);
    await openProfile(page);

    await expect(page.locator('#prof-overview')).toBeVisible();
    await expect(page.locator('#prof-settings')).toBeHidden();

    await seg(page, 'Settings').click();
    await expect(page.locator('#prof-settings')).toBeVisible();
    await expect(page.locator('#prof-overview')).toBeHidden();

    await seg(page, 'Profile').click();
    await expect(page.locator('#prof-overview')).toBeVisible();
  });

  test('setting a name updates the greeting', async ({ page }) => {
    await gotoApp(page);
    await openProfile(page);

    await seg(page, 'Settings').click();
    await page.getByPlaceholder('e.g. Ines').fill('Ines');

    await seg(page, 'Profile').click();
    await expect(page.locator('#pfHello')).toContainText('Ines');
  });

  test('seeded daily intentions appear in "recent intentions"', async ({ page }) => {
    await seedStorage(page, {
      ['intent:' + dayKey(0)]: 'Be present',
      ['intent:' + dayKey(-1)]: 'Move gently',
    });
    await gotoApp(page);
    await openProfile(page);

    const recent = page.locator('#pfRecent');
    await expect(recent).toContainText('Be present');
    await expect(recent).toContainText('Move gently');
  });
});
