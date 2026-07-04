// Navigation tests: the iOS-style bottom TAB BAR (S1 "living flower" arc) routes every
// view; the flower is now decor (no longer a menu). Progres lives under the "You" tab
// (a Profil/Progres/Setari segment); Proiecte is reached from a "My projects" link on Home.
//
// Locator strategy: lead with user-facing locators. Tabs carry i18n aria-labels
// (default UI language = EN) so we use getByRole by accessible name. View STATE has no
// semantic locator, so it is asserted on the body[data-view] attribute.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Accessible name (EN) of each bottom tab -> the view id it activates (#view-<v>).
const TABS = [
  { name: 'Journal', v: 'journal' },
  { name: 'Respiro', v: 'calm' },
  { name: 'Calendar', v: 'cal' },
  { name: 'You', v: 'profil' },
  { name: 'Today', v: 'day' },
];

test.describe('navigation', () => {
  test('the bottom tab bar switches to each view', async ({ page }) => {
    await gotoApp(page);
    for (const { name, v } of TABS) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', v);
    }
  });

  test('Progres is reached from the "You" tab segment', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'You', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'profil');
    // the Profil/Progres/Setari segment: tapping Progress opens the stats view
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'stats');
    // the "You" tab stays active while on Progres (owner-map)
    await expect(page.locator('.tabbar .tab[data-v="profil"]')).toHaveClass(/active/);
  });

  test('Proiecte is reached from the "My projects" link on Home', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'My projects', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'proj');
  });

  test('hero back arrow returns to the Day view from a secondary view', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'journal');

    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
  });

  test('the intention pill opens the daily-intention modal', async ({ page }) => {
    await gotoApp(page);
    const modal = page.getByRole('dialog', { name: /intention/i });
    await expect(modal).toBeHidden();

    // the flower is decor now; the pill under it (accessible name "What's your intention?") is the editor
    await page.getByRole('button', { name: /intention/i }).click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox')).toBeVisible();
  });
});
