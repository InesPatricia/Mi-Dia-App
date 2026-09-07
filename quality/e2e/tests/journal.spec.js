// Journal + Stare (mood) tests for the redesigned journal (v125+).
// Locators: mood discs carry i18n aria-labels (EN mood names), so getByRole by name, scoped to the
// mood band. The permission-pause / emotion-wheel chips are dynamic generated content with no
// stable name, so they are reached structurally within their containers. The free text area is
// found by its placeholder. State (selection, low-mood pause) is asserted on class / visibility.
//
// Migrated to the page object layer. The local openJournal helper asserted the view had changed,
// which a page object may not do; that assertion is now in the one test where the navigation is
// part of what is being checked, and the other three simply navigate.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('journal + mood', () => {
  test('selecting a mood updates the mood word and (high mood) shows no pause', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Journal');
    await expect(app.view).toHaveAttribute('data-view', 'journal');

    // pick the "Clear" mood disc
    await app.journal.moodOption('Clear').click();

    // the mood word + selected-disc state both reflect the choice
    await expect(app.journal.moodWord).toHaveText('Clear');
    await expect(app.journal.moodOption('Clear')).toHaveClass(/sel/);
    // "Clear" (mood 5) is not a low mood -> the permission pause stays hidden
    await expect(app.journal.permissionPause).toBeHidden();
  });

  test('a low mood reveals the permission pause + emotion-wheel drilldown', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Journal');

    // pick a low mood ("Rainy")
    await app.journal.moodOption('Rainy').click();

    // the permission pause appears with a "one breath" link
    await expect(app.journal.permissionPause).toBeVisible();
    await expect(app.journal.breathLink).toBeVisible();

    // drill down: pick the first emotion core -> sub-emotions appear -> pick the first
    await app.journal.coreEmotions.first().click();
    await expect(app.journal.subEmotionList).toBeVisible();
    await app.journal.subEmotions.first().click();

    // the chosen emotion chip is shown
    await expect(app.journal.chosenEmotion).toBeVisible();
  });

  test('journal text + mood autosave and survive a reload', async ({ app, page }) => {
    await app.launch();
    await app.day.tapPetal('Journal');

    // set a mood + write some text
    await app.journal.moodOption('Fair').click();
    await app.journal.textField.fill('Reflection entry 123');

    // navigating away flushes the debounced save; then reload from storage
    await app.goHome();
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await app.day.tapPetal('Journal');

    // text + selected mood are restored from storage
    await expect(app.journal.textField).toHaveValue('Reflection entry 123');
    await expect(app.journal.moodOption('Fair')).toHaveClass(/sel/);
  });

  test('export buttons are available', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Journal');
    // both export buttons are present. Each label carries an icon character before its word, so
    // the lookup is a substring match rather than an exact one.
    await expect(app.journal.exportButton('Word')).toBeVisible();
    await expect(app.journal.exportButton('PDF')).toBeVisible();
  });
});
