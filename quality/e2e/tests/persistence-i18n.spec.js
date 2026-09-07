// Persistence + i18n: data survives a reload (localStorage via the Store layer), the language
// switch re-labels the whole UI (including the i18n aria-labels added in v126), and the backup
// export produces a download.
//
// Migrated to the page object layer. The Profile-then-Settings pair here was the fifth spelling of
// that navigation in the suite, and it is now the same call as the other four.
//
// The Romanian copy stays written out in the i18n test rather than moving to a strings module. That
// module holds text where the text is the thing under test, and here it is: the test is about which
// language's words are on screen, so naming both of them in the test is the point rather than
// duplication.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('persistence', () => {
  test('a created slot survives a page reload', async ({ app, page }) => {
    await app.launch();

    // create a slot via the fast path (type a title + Enter)
    await app.day.titleField.fill('Persisted task');
    await app.day.titleField.press('Enter');
    // the new slot is on the Day list
    await expect(app.day.list.getByText('Persisted task')).toBeVisible();

    // reload the page (forces a fresh render from localStorage)
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));

    // re-rendered from localStorage, no re-entry needed
    await expect(app.day.list.getByText('Persisted task')).toBeVisible();
  });

  test('the backup export produces a JSON download', async ({ app, page }) => {
    await app.launch();

    // open Profile -> Settings where the backup controls live
    await app.openSettings();

    // tapping Export should trigger a file download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.profile.exportButton.click(),
    ]);
    // the download is a timestamped backup JSON
    expect(download.suggestedFilename()).toMatch(/^mi-dia-backup-.*\.json$/);
  });
});

test.describe('i18n', () => {
  test('switching to Romanian re-labels the UI and the accessible names', async ({ app, page }) => {
    await app.launch();

    // EN baseline
    await expect(app.day.petal('Journal')).toBeVisible();
    await expect(app.day.titleField).toBeVisible();

    // switch the UI language to Romanian
    await app.languageButton('RO').click();

    // visible text + the petal's aria-label both follow the language (v126 a11y fix)
    await expect(page.getByPlaceholder('Ce vrei')).toBeVisible();
    await expect(app.day.petal('Jurnal')).toBeVisible();
    await expect(app.day.petal('Journal')).toHaveCount(0);

    // and the switcher reflects the active language
    await expect(app.languageButton('RO')).toHaveClass(/sel/);
  });
});
