// Smoke tests: the app boots cleanly into a known baseline state.
// Locator strategy: lead with user-facing locators (getByRole/getByText). Default UI language is
// EN, so accessible names are the English i18n values. State that has no semantic locator (selected
// language, active view) is asserted on attributes/classes.
//
// Migrated to the page object layer. The petal and bottom bar lookups were unscoped here; through
// the page objects they are scoped to the flower and the bottom bar, which is the same set of
// elements today and stops being the same the day a screen grows a control with one of these names.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('smoke', () => {
  test('app loads with no console errors and lands on the Day view', async ({ app, page }) => {
    // Collect any console / page errors thrown while the app boots
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    await app.launch();

    // Should open on the Day view by default
    await expect(app.view).toHaveAttribute('data-view', 'day');

    // Should show the brand title (a real <h1> heading)
    await expect(app.day.brandHeading).toBeVisible();

    // Should boot with no real console/page errors (ignore SW/network noise from the file host)
    const real = errors.filter((text) => !/favicon|ServiceWorker|sw\.js/i.test(text));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('default language is English and the switcher reflects it', async ({ app }) => {
    await app.launch();
    // Should mark EN as the active language (the .sel class is the visual "selected" state)
    await expect(app.languageButton('EN')).toHaveClass(/sel/);
  });

  test('core navigation chrome is present', async ({ app }) => {
    await app.launch();
    // Should show all 5 flower petals (by their EN i18n aria-labels)
    for (const name of ['Journal', 'Respiro', 'Calendar', 'Progress', 'Projects']) {
      await expect(app.day.petal(name)).toBeVisible();
    }
    // Should show the bottom bar (Home + Profile)
    await expect(app.tab('Home')).toBeVisible();
    await expect(app.tab('Profile')).toBeVisible();
    // Should show the quick-add (+) button and the flower-centre intention button
    await expect(app.quickAdd).toBeVisible();
    await expect(app.day.intentionButton).toBeVisible();
  });
});
