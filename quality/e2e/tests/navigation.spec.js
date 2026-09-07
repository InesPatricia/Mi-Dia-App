// Navigation tests: the flower petals, bottom bar, hero back, bloom menu and intention modal all
// route to the right view / state.
//
// Locator strategy: lead with user-facing locators. Nav controls carry i18n aria-labels (default UI
// language = EN), modals expose role="dialog", so we use getByRole by accessible name. View and
// menu STATE has no semantic locator, so it is asserted on attributes (data-view, aria-expanded).
// The bloom scrim is a structural overlay with no accessible name, so it is reached by id.
//
// Migrated to the page object layer. Every lookup here was unscoped; the petals are now scoped to
// the flower and the tabs to the bottom bar, which is what keeps "Profile" unambiguous once the
// Profile screen is showing.
const { test, expect } = require('../fixtures/app.fixture');

// Accessible name (EN) of each petal -> the view id it activates.
const PETALS = [
  { name: 'Journal', viewId: 'journal' },
  { name: 'Respiro', viewId: 'calm' },
  { name: 'Calendar', viewId: 'cal' },
  { name: 'Progress', viewId: 'stats' },
  { name: 'Projects', viewId: 'proj' },
];

test.describe('navigation', () => {
  test('each flower petal switches to its view', async ({ app }) => {
    await app.launch();
    // The flower lives inside the Day view, so it is only visible there. Return Home between
    // petals to reach the next one.
    for (const { name, viewId } of PETALS) {
      // Tapping a petal should switch to its view
      await app.day.tapPetal(name);
      await expect(app.view).toHaveAttribute('data-view', viewId);
      // Tapping Home should return to the Day view
      await app.goHome();
      await expect(app.view).toHaveAttribute('data-view', 'day');
    }
  });

  test('bottom bar routes Home and Profile', async ({ app }) => {
    await app.launch();
    // Tapping Profile should open the Profile view
    await app.openProfile();
    await expect(app.view).toHaveAttribute('data-view', 'profil');

    // Tapping Home should return to the Day view
    await app.goHome();
    await expect(app.view).toHaveAttribute('data-view', 'day');
  });

  test('hero back arrow returns to the Day view from a secondary view', async ({ app }) => {
    await app.launch();
    // Open a secondary view (Journal)
    await app.day.tapPetal('Journal');
    await expect(app.view).toHaveAttribute('data-view', 'journal');

    // The hero back arrow (distinct name from the bottom-bar "Home") should go back to Day
    await app.backToHome.click();
    await expect(app.view).toHaveAttribute('data-view', 'day');
  });

  test('the + button toggles the bloom quick-add menu', async ({ app }) => {
    await app.launch();

    // Should start collapsed
    await expect(app.quickAdd).toHaveAttribute('aria-expanded', 'false');
    // Tapping + should open the bloom menu
    await app.quickAdd.click();
    await expect(app.quickAdd).toHaveAttribute('aria-expanded', 'true');
    await expect(app.bloomMenu.dialog).toBeVisible();

    // Tapping the scrim should close it again
    await app.bloomMenu.scrim.click();
    await expect(app.quickAdd).toHaveAttribute('aria-expanded', 'false');
    await expect(app.bloomMenu.dialog).toBeHidden();
  });

  test('the flower centre opens the daily-intention modal', async ({ app }) => {
    await app.launch();
    // Should start hidden
    await expect(app.intentionModal.dialog).toBeHidden();

    // Tapping the flower centre should open the intention dialog with its text field
    await app.day.intentionButton.click();
    await expect(app.intentionModal.dialog).toBeVisible();
    await expect(app.intentionModal.field).toBeVisible();
  });
});
