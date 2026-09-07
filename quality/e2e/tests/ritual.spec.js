// Ritual module tests (v145+): the Home "My rituals" section + check/streak, the creation sheet
// (suggestion chip / written + habit stacking), never-miss-twice, the Progress history block +
// explicit backfill, and the "check marks TODAY" rule (v154).
//
// Locators: ritual cards are anchored by their user-typed name; the check carries an i18n
// aria-label and aria-pressed since v128. The section only renders when rituals exist, so every
// test seeds them.
//
// That last sentence is also a coverage hole, and the mutation audit is what proved it. Because
// every test here seeds its own rituals, nothing in the functional suite ever boots a user who has
// none, so the application's own first-run seed can be deleted entirely without turning anything
// red. See TD-004 in specs/BUGS.md. This migration does not fix it, on purpose: closing it is a new
// test rather than a refactor, and it belongs in phase 7.
//
// Migrated to the page object layer. The two module-level helpers are now the Rituals component,
// and two structural navigations, a petal by data attribute and the language switch by data
// attribute, are now the same calls every other spec uses.
const { test, expect } = require('../fixtures/app.fixture');
const { readRituals, ritual, dayKey } = require('./helpers');

test.describe('rituals', () => {
  test('seeded rituals render the Home section with names + streak', async ({ app }) => {
    await app.launch({ rituals: [ritual({ name: 'Morning breathing' }, 5)] });
    await expect(app.rituals.card('Morning breathing')).toBeVisible();
    await expect(app.rituals.streak('Morning breathing')).toHaveText('5');
    // summary "N / M today" is present
    await expect(app.rituals.summary).toBeVisible();
  });

  test('tapping the check marks the ritual done, bumps the streak, and persists', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ id: 'r_a', name: 'Move' }, 3)] });
    // 3-day streak; today not yet checked -> shows 3, not done
    await expect(app.rituals.streak('Move')).toHaveText('3');
    await app.rituals.tick('Move').click();
    await expect(app.rituals.card('Move')).toHaveClass(/done/);
    await expect(app.rituals.tick('Move')).toHaveAttribute('aria-pressed', 'true');
    await expect(app.rituals.streak('Move')).toHaveText('4');
    // persisted: today's key is in the log
    const rits = await readRituals(page);
    expect(rits[0].log).toContain(dayKey(0));
    // survives reload
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await expect(app.rituals.card('Move')).toHaveClass(/done/);
  });

  test('the check always marks TODAY, even while viewing another day (v154)', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ name: 'Water', log: [] })] });
    // navigate the Day view back one day, then check the ritual
    await app.day.previousDay.click();
    await app.rituals.tick('Water').click();
    const rits = await readRituals(page);
    expect(rits[0].log).toEqual([dayKey(0)]); // today, NOT the viewed (previous) day
  });

  test('create via a suggestion chip: two taps add a NEW ritual at the top', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ name: 'Existing' }, 2)] });
    await app.rituals.addButton.click();
    await expect(app.rituals.sheet).toHaveClass(/show/);
    await app.rituals.sheetSuggestion('breath').click();
    await app.rituals.sheetSave.click();
    await expect(app.rituals.sheet).not.toHaveClass(/show/);
    // the new ritual is first and carries a NEW badge + a time cue by default
    const rits = await readRituals(page);
    expect(rits.length).toBe(2);
    expect(rits[0].cue.type).toBe('time');
    await expect(app.rituals.cards.first().locator('.r-badge')).toBeVisible();
  });

  test('create written + "after a ritual" stores a habit-stacking cue', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ id: 'r_anchor', name: 'Anchor' }, 1)] });
    await app.rituals.addButton.click();
    await app.rituals.sheetName.fill('Play guitar');
    await app.rituals.sheetCue('after').click();
    await app.rituals.sheetSave.click();
    const rits = await readRituals(page);
    const fresh = rits.find((rit) => rit.name === 'Play guitar');
    expect(fresh).toBeTruthy();
    expect(fresh.cue.type).toBe('after');
    expect(fresh.cue.value).toBe('r_anchor');
  });

  test('never-miss-twice: a missed prior day surfaces the warm 2-min chip', async ({ app }) => {
    // done 2 days ago, but NOT yesterday and NOT today -> missed the prior due day
    await app.launch({ rituals: [ritual({ name: 'Reading', log: [dayKey(-2)] })] });
    await expect(app.rituals.card('Reading')).toHaveClass(/miss/);
    await expect(app.rituals.twoMinuteChip('Reading')).toBeVisible();
  });

  test('Progress shows the history block; a past calendar cell backfills a day', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ id: 'r_h', name: 'Breathe', log: [dayKey(0)] })] });
    await app.day.tapPetal('Progress');
    await expect(app.rituals.historyPanel).toBeVisible();
    // tap the cell 3 days ago -> it becomes done in the log
    const target = dayKey(-3);
    await app.rituals.historyCell(target).click();
    const rits = await readRituals(page);
    expect(rits[0].log).toContain(target);
  });

  test('backup export includes rituals and import restores them', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ id: 'r_bk', name: 'Gratitude' }, 4)] });
    const dl = await Promise.all([
      page.waitForEvent('download'),
      // __miExport is the application's own export function, reached directly rather than through
      // the Settings button, because this test is about what the dump contains rather than about
      // the control that produces it. Declared here because it is not part of any Window type: it
      // is a global the build happens to expose, which is worth saying out loud rather than
      // silencing with a cast to any.
      page.evaluate(() => {
        const win = /** @type {Window & { __miExport?: () => unknown }} */ (window);
        return win.__miExport && win.__miExport();
      }),
    ]).then(([download]) => download);
    const fs = require('fs');
    const downloadPath = await dl.path();
    const dump = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    expect(dump.data.rituals).toBeTruthy();
    expect(JSON.parse(dump.data.rituals)[0].name).toBe('Gratitude');
    // wipe + import restores
    await page.evaluate(() => localStorage.removeItem('rituals'));
    await app.profile.importInput.setInputFiles(downloadPath);

    // The import is asynchronous and writes to storage, not to the DOM, so there is nothing on
    // the page to assert against and no web-first assertion to inherit the waiting from. Poll the
    // stored value instead of sleeping: a fixed wait is a guess that is either too short on a
    // loaded machine or wasted on every run that did not need it.
    await expect
      .poll(async () => (await readRituals(page)).map((rit) => rit.name))
      .toContain('Gratitude');
  });

  test('i18n: switching to Romanian relabels the section header', async ({ app }) => {
    await app.launch({ rituals: [ritual({ name: 'Respiro' }, 1)] });
    await expect(app.rituals.sectionTitle).toHaveText('My rituals');
    await app.languageButton('RO').click();
    await expect(app.rituals.sectionTitle).toHaveText('Ritualurile mele');
  });

  // v156: manage rituals. The Edit toggle turns each card into a two-tap delete; tapping a card
  // body opens the creation sheet prefilled and saves the edit in place (id + log preserved).
  test('edit mode: two-tap delete removes a ritual (default or custom) and persists', async ({ app, page }) => {
    await app.launch({ rituals: [
      ritual({ id: 'r_x', name: 'Remove me' }, 2),
      ritual({ id: 'r_y', name: 'Keep me' }, 1),
    ] });
    await app.rituals.editToggle.click();
    await app.rituals.cardDelete('Remove me').click();               // first tap arms
    await expect(app.rituals.cardDeleteArmed('Remove me')).toBeVisible();
    await app.rituals.cardDelete('Remove me').click();               // second tap deletes
    await expect(app.rituals.card('Remove me')).toHaveCount(0);
    await expect(app.rituals.card('Keep me')).toBeVisible();
    const rits = await readRituals(page);
    expect(rits.map((rit) => rit.name)).toEqual(['Keep me']);
  });

  test('edit mode: tapping a card opens the sheet prefilled and saves in place', async ({ app, page }) => {
    await app.launch({ rituals: [ritual({ id: 'r_e', name: 'Old name' }, 4)] });
    await app.rituals.editToggle.click();
    await app.rituals.cardBody('Old name').click();
    await expect(app.rituals.sheet).toHaveClass(/show/);
    await expect(app.rituals.sheetName).toHaveValue('Old name');
    await app.rituals.sheetName.fill('New name');
    await app.rituals.sheetSave.click();
    await expect(app.rituals.sheet).not.toHaveClass(/show/);
    await expect(app.rituals.card('New name')).toBeVisible();
    await expect(app.rituals.card('Old name')).toHaveCount(0);
    const rits = await readRituals(page);
    expect(rits.length).toBe(1);
    expect(rits[0].id).toBe('r_e');       // edited in place, not recreated
    expect(rits[0].log.length).toBe(4);    // streak/log preserved
  });
});
