// Cycle (opt-in) tests: OFF by default (no cycle chrome), and enabling the Settings switch
// surfaces the Rhythm lens and the cycle setup access in the Calendar.
//
// Migrated to the page object layer. Both local helpers are gone: openSettings was one of the five
// ways this suite used to reach that screen, and openCalendar asserted the view had changed, which
// a page object may not do. That assertion now sits in the spec, once, where a reader can see which
// step it belongs to.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('cycle (opt-in)', () => {
  test('is OFF by default, so the Calendar shows no cycle chrome', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // only Plan + Mood lenses, and the cycle setup access is hidden
    await expect(app.calendar.lens('Rhythm')).toHaveCount(0);
    await expect(app.calendar.cycleSetup).toBeHidden();

    // and the Settings opt-in switch is off
    await app.openSettings();
    await expect(app.profile.cycleSwitch).not.toBeChecked();
  });

  test('enabling the switch surfaces the Rhythm lens + access', async ({ app }) => {
    await app.launch();
    await app.openSettings();

    // toggle the opt-in switch on
    await app.profile.cycleSwitch.click();
    await expect(app.profile.cycleSwitch).toBeChecked();

    // back to the Calendar, which is reached through the flower on the Day screen
    await app.goHome();
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // the Rhythm lens now exists; selecting it reveals the cycle setup access
    await expect(app.calendar.lens('Rhythm')).toBeVisible();
    await app.calendar.lens('Rhythm').click();
    await expect(app.calendar.cycleSetup).toBeVisible();
  });
});
