// Focus timer (Day-header overlay) and a full backup export then import roundtrip.
//
// Migrated to the page object layer. The two Profile-then-Settings pairs it carried, written a
// third way again, are now one call. The focus timer became a component rather than a page,
// because it is raised over whatever is showing and the app's data-view does not change while it
// is up.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('focus timer', () => {
  test('the Focus button opens the timer overlay; a preset sets the time; it closes', async ({ app }) => {
    await app.launch();

    // the Focus button opens the timer overlay at the default time
    await app.focusTimer.open();
    await expect(app.focusTimer.overlay).toHaveClass(/show/);
    await expect(app.focusTimer.time).toHaveText('25:00'); // default

    // tapping the 45-minute preset updates the displayed time
    // presets are [15, 25, 45, 60] -> index 2 = 45
    await app.focusTimer.preset(2).click();
    await expect(app.focusTimer.time).toHaveText('45:00');

    // closing the overlay hides it again
    await app.focusTimer.close();
    await expect(app.focusTimer.overlay).not.toHaveClass(/show/);
  });
});

test.describe('backup roundtrip', () => {
  test('export then re-import restores a deleted slot', async ({ app, page }) => {
    await app.launch();

    // 1) create a slot
    await app.day.titleField.fill('Roundtrip task');
    await app.day.titleField.press('Enter');
    await expect(app.day.list.getByText('Roundtrip task')).toBeVisible();

    // 2) export -> capture the downloaded backup file
    await app.openSettings();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.profile.exportButton.click(),
    ]);
    const backupPath = await download.path();

    // 3) delete the slot back on the Day view. The delete is a deliberate two-tap confirm.
    await app.goHome();
    const del = app.day.blockDelete('Roundtrip task');
    await del.click();
    await del.click();
    await expect(app.day.list.getByText('Roundtrip task')).toHaveCount(0);

    // 4) import the backup through the hidden file input -> importData re-renders the day
    await app.openSettings();
    await app.profile.importInput.setInputFiles(backupPath);

    // 5) back to the Day view -> the slot is restored from the backup
    await app.goHome();
    await expect(app.day.list.getByText('Roundtrip task')).toBeVisible();
  });
});
