// Shortcuts block tests (v112+): tap a pill to PRE-FILL the composer, the per-pill add control to
// add instantly (no time), add a new shortcut, and delete one in edit mode.
//
// Locators: shortcut pills are anchored by their visible label. The per-pill add carries an i18n
// aria-label ("Add instantly (no time)") and is scoped to its pill. The edit toggle is an icon-only
// control with no accessible name, reached by its stable id.
//
// Migrated to the page object layer. The two module-level helpers are now the Shortcuts component,
// which is where a later spec can find them.
const { test, expect } = require('../fixtures/app.fixture');
const { readBlocks } = require('./helpers');

test.describe('shortcuts', () => {
  test('the 3 curated defaults are shown', async ({ app }) => {
    await app.launch();
    // each of the 3 curated default shortcuts is shown
    for (const name of ['Coaching session', '4F reflection', 'Movement / walk']) {
      await expect(app.shortcuts.shortcut(name)).toBeVisible();
    }
  });

  test('tapping a shortcut pre-fills the composer (does not add a slot)', async ({ app }) => {
    await app.launch();
    await app.shortcuts.shortcut('Coaching session').click();

    // composer is now expanded and the title is pre-filled...
    await expect(app.day.composer).toHaveClass(/active/);
    await expect(app.day.titleField).toHaveValue('Coaching session');
    // ...but nothing is committed yet
    await expect(app.day.list.getByText('Coaching session')).toHaveCount(0);
  });

  test('the per-pill add control adds an untimed slot instantly', async ({ app, page }) => {
    await app.launch();
    await app.shortcuts.addInstantly('Movement / walk').click();

    await expect(app.day.list.getByText('Movement / walk')).toBeVisible();
    const block = (await readBlocks(page)).find((entry) => entry.title === 'Movement / walk');
    expect(block.time).toBe(''); // untimed
  });

  test('adding a new shortcut makes it appear in the grid', async ({ app }) => {
    await app.launch();
    // open the add-shortcut inline editor
    await app.shortcuts.addShortcut.click();

    // fill the name and submit
    await expect(app.shortcuts.form).toBeVisible();
    await app.shortcuts.nameField.fill('Morning pages');
    await app.shortcuts.submit.click();

    // the new shortcut appears in the grid
    await expect(app.shortcuts.shortcut('Morning pages')).toBeVisible();
  });

  test('edit mode deletes a shortcut (two-tap)', async ({ app }) => {
    await app.launch();
    await app.shortcuts.editToggle.click(); // enter edit mode, which puts a delete control on each pill

    // two taps on the pill's delete control: the first arms it, the second confirms
    const remove = app.shortcuts.pillDelete('Movement / walk');
    await remove.click(); // arms
    await remove.click(); // confirms

    // the deleted shortcut is gone from the grid
    await expect(app.shortcuts.shortcut('Movement / walk')).toHaveCount(0);
  });
});
