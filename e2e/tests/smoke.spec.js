// Smoke tests: the app boots cleanly into a known baseline state.
// Locator strategy: lead with user-facing locators (getByRole/getByText). Default UI
// language is EN, so accessible names are the English i18n values. State that has no
// semantic locator (selected language, active view) is asserted on attributes/classes.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('smoke', () => {
  test('app loads with no console errors and lands on the Day view', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoApp(page);

    // Default view is the day plan (view state -> attribute assertion).
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');

    // Brand is a real <h1> heading.
    await expect(page.getByRole('heading', { name: /Mi D/i })).toBeVisible();

    // No console / page errors during boot. (Filter out SW/network noise from file host.)
    const real = errors.filter((e) => !/favicon|ServiceWorker|sw\.js/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('default language is English and the switcher reflects it', async ({ page }) => {
    await gotoApp(page);
    // The EN/ES/RO buttons keep stable text across languages -> getByRole by name.
    // "selected" is visual state with no semantic locator, so assert the .sel class.
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveClass(/sel/);
  });

  test('core navigation chrome is present', async ({ page }) => {
    await gotoApp(page);
    // Petals + bottom bar carry i18n aria-labels (EN names below); flower centre = intention.
    for (const name of ['Journal', 'Respiro', 'Calendar', 'Progress', 'Projects']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quick add', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /intention/i })).toBeVisible();
  });
});
