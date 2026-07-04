// Smoke tests: the app boots cleanly into a known baseline state.
// Locator strategy: lead with user-facing locators (getByRole/getByText). Default UI
// language is EN, so accessible names are the English i18n values. State that has no
// semantic locator (selected language, active view) is asserted on attributes/classes.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('smoke', () => {
  test('app loads with no console errors and lands on the Day view', async ({ page }) => {
    // Collect any console / page errors thrown while the app boots
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoApp(page);

    // Should open on the Day view by default
    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');

    // Should show the brand title (a real <h1> heading)
    await expect(page.getByRole('heading', { name: /Mi D/i })).toBeVisible();

    // Should boot with no real console/page errors (ignore SW/network noise from the file host)
    const real = errors.filter((e) => !/favicon|ServiceWorker|sw\.js/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('default language is English and the switcher reflects it', async ({ page }) => {
    await gotoApp(page);
    // Should mark EN as the active language (the .sel class is the visual "selected" state)
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveClass(/sel/);
  });

  test('core navigation chrome is present', async ({ page }) => {
    await gotoApp(page);
    // Should show all 5 bottom tabs (by their EN i18n aria-labels)
    for (const name of ['Today', 'Journal', 'Respiro', 'Calendar', 'You']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    // Should show the flower-centre intention button + the "My projects" link on Home
    await expect(page.getByRole('button', { name: /intention/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My projects', exact: true })).toBeVisible();
  });
});
