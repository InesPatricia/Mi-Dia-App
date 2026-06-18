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
    // The flower lives inside #view-day, so it is only visible on the Day view.
    // Return Home (bottom bar) between petals to reach the next one.
    for (const { name, v } of PETALS) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', v);
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
    }
  });

  test('bottom bar routes Home and Profile', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'profil');

    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
  });

  test('hero back arrow returns to the Day view from a secondary view', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'journal');

    // On secondary views the back affordance has its own accessible name (distinct from
    // the bottom-bar "Home", so getByRole stays unambiguous).
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
  });

  test('the + button toggles the bloom quick-add menu', async ({ page }) => {
    await gotoApp(page);
    const fab = page.getByRole('button', { name: 'Quick add', exact: true });
    const bloom = page.getByRole('dialog', { name: /add/i });

    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await expect(bloom).toBeVisible();

    // close via the scrim (structural overlay, no accessible name)
    await page.locator('#bloomScrim').click();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(bloom).toBeHidden();
  });

  test('the flower centre opens the daily-intention modal', async ({ page }) => {
    await gotoApp(page);
    const modal = page.getByRole('dialog', { name: /intention/i });
    await expect(modal).toBeHidden();

    await page.getByRole('button', { name: /intention/i }).click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox')).toBeVisible();
  });
});
