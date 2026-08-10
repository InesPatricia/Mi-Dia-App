// Navigation tests: the flower petals, bottom bar, hero back, bloom menu and
// intention modal all route to the right view / state.
//
// Locator strategy: lead with user-facing locators. Nav controls now carry i18n
// aria-labels (default UI language = EN), modals expose role="dialog" — so we use
// getByRole by accessible name. View/menu STATE has no semantic locator, so it is
// asserted on attributes (data-view, aria-expanded). The bloom scrim is a structural
// overlay with no accessible name, so it is reached by id (#bloomScrim).
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

// Accessible name (EN) of each petal -> the view id suffix it activates (#view-<v>).
const PETALS = [
  { name: 'Journal', v: 'journal' },
  { name: 'Respiro', v: 'calm' },
  { name: 'Calendar', v: 'cal' },
  { name: 'Progress', v: 'stats' },
  { name: 'Projects', v: 'proj' },
];

test.describe('navigation', () => {
  test('each flower petal switches to its view', async ({ page }) => {
    await gotoApp(page);
    // The flower lives inside #view-day, so it is only visible on the Day view —
    // return Home (bottom bar) between petals to reach the next one.
    for (const { name, v } of PETALS) {
      // Tapping a petal should switch to its view
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', v);
      // Tapping Home should return to the Day view
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
    }
  });

  test('bottom bar routes Home and Profile', async ({ page }) => {
    await gotoApp(page);
    // Tapping Profile should open the Profile view
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'profil');

    // Tapping Home should return to the Day view
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
  });

  test('hero back arrow returns to the Day view from a secondary view', async ({ page }) => {
    await gotoApp(page);
    // Open a secondary view (Journal)
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'journal');

    // The hero back arrow (distinct name from the bottom-bar "Home") should go back to Day
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
  });

  test('the + button toggles the bloom quick-add menu', async ({ page }) => {
    await gotoApp(page);
    const fab = page.getByRole('button', { name: 'Quick add', exact: true });
    const bloom = page.getByRole('dialog', { name: /add/i });

    // Should start collapsed
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    // Tapping + should open the bloom menu
    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await expect(bloom).toBeVisible();

    // Tapping the scrim should close it again
    await page.locator('#bloomScrim').click();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(bloom).toBeHidden();
  });

  test('the flower centre opens the daily-intention modal', async ({ page }) => {
    await gotoApp(page);
    const modal = page.getByRole('dialog', { name: /intention/i });
    // Should start hidden
    await expect(modal).toBeHidden();

    // Tapping the flower centre should open the intention dialog with its text field
    await page.getByRole('button', { name: /intention/i }).click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox')).toBeVisible();
  });
});
