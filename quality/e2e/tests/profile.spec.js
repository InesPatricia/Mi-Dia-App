// Profile tests: the Profile/Settings segmented view, the name field feeding the greeting, and
// seeded daily intentions surfacing in "recent intentions".
//
// First spec migrated to the page object layer. The two local helpers it used to carry, openProfile
// and seg, are now AppPage.openProfile and ProfilePage.segment, where every other spec can reach
// them. openProfile also used to assert the view had changed; that assertion has moved into the one
// test that is actually about navigation, because a helper that asserts hides which line failed.
const { test, expect } = require('../fixtures/app.fixture');
const { dayKey } = require('./helpers');

test.describe('profile', () => {
  test('the Profile/Settings segment swaps the panels', async ({ app }) => {
    await app.launch();
    await app.openProfile();
    await expect(app.view).toHaveAttribute('data-view', 'profil');

    // default segment = the overview panel
    await expect(app.profile.overviewPanel).toBeVisible();
    await expect(app.profile.settingsPanel).toBeHidden();

    // selecting Settings swaps to the settings panel
    await app.profile.openSettings();
    await expect(app.profile.settingsPanel).toBeVisible();
    await expect(app.profile.overviewPanel).toBeHidden();

    // selecting Profile swaps back to the overview
    await app.profile.openOverview();
    await expect(app.profile.overviewPanel).toBeVisible();
  });

  test('setting a name updates the greeting', async ({ app }) => {
    await app.launch();
    await app.openProfile();

    // type a name in the Settings name field
    await app.profile.openSettings();
    await app.profile.nameField.fill('Ines');

    // back on the overview the greeting includes the name
    await app.profile.openOverview();
    await expect(app.profile.greeting).toContainText('Ines');
  });

  test('seeded daily intentions appear in "recent intentions"', async ({ app }) => {
    await app.launch({
      ['intent:' + dayKey(0)]: 'Be present',
      ['intent:' + dayKey(-1)]: 'Move gently',
    });
    await app.openProfile();

    // both seeded intentions surface in the "recent intentions" list
    await expect(app.profile.recentIntentions).toContainText('Be present');
    await expect(app.profile.recentIntentions).toContainText('Move gently');
  });
});
