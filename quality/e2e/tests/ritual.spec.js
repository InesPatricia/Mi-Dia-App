// Ritual module tests (v145+): the Home "My rituals" section + check/streak, the
// creation sheet (suggestion chip / written + habit stacking), never-miss-twice, the
// Progress history block + explicit backfill, and the "check marks TODAY" rule (v154).
//
// Locators: ritual cards are anchored by their user-typed name (.r-card hasText); the
// check is a role=button with an i18n aria-label ("Check the ritual", EN default). The
// section only renders when rituals exist, so every test seeds them. gotoApp marks the
// user onboarded by default, so the onboarding overlay never covers the app here.
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, readRituals, ritual, dayKey } = require('./helpers');

const card = (page, name) => page.locator('.r-card', { hasText: name });
const tick = (page, name) => card(page, name).locator('.r-tick');

test.describe('rituals', () => {
  test('seeded rituals render the Home section with names + streak', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ name: 'Morning breathing' }, 5)] });
    await gotoApp(page);
    await expect(page.locator('#ritualMount .r-card', { hasText: 'Morning breathing' })).toBeVisible();
    await expect(card(page, 'Morning breathing').locator('.r-n')).toHaveText('5');
    // summary "N / M today" is present
    await expect(page.locator('#ritualMount .r-sum')).toBeVisible();
  });

  test('tapping the check marks the ritual done, bumps the streak, and persists', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ id: 'r_a', name: 'Move' }, 3)] });
    await gotoApp(page);
    // 3-day streak; today not yet checked -> shows 3, not done
    await expect(card(page, 'Move').locator('.r-n')).toHaveText('3');
    await tick(page, 'Move').click();
    await expect(card(page, 'Move')).toHaveClass(/done/);
    await expect(tick(page, 'Move')).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'Move').locator('.r-n')).toHaveText('4');
    // persisted: today's key is in the log
    let rits = await readRituals(page);
    expect(rits[0].log).toContain(dayKey(0));
    // survives reload
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await expect(card(page, 'Move')).toHaveClass(/done/);
  });

  test('the check always marks TODAY, even while viewing another day (v154)', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ name: 'Water', log: [] })] });
    await gotoApp(page);
    // navigate the Day view back one day, then check the ritual
    await page.locator('#prev').click();
    await tick(page, 'Water').click();
    const rits = await readRituals(page);
    expect(rits[0].log).toEqual([dayKey(0)]); // today, NOT the viewed (previous) day
  });

  test('create via a suggestion chip: two taps add a NEW ritual at the top', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ name: 'Existing' }, 2)] });
    await gotoApp(page);
    await page.locator('#ritualMount .r-add').click();
    await expect(page.locator('#ritSheet')).toHaveClass(/show/);
    await page.locator('.rs-chip[data-key="breath"]').click();
    await page.locator('#rsSave').click();
    await expect(page.locator('#ritSheet')).not.toHaveClass(/show/);
    // the new ritual is first and carries a NEW badge + a time cue by default
    const rits = await readRituals(page);
    expect(rits.length).toBe(2);
    expect(rits[0].cue.type).toBe('time');
    await expect(page.locator('#ritualMount .r-card').first().locator('.r-badge')).toBeVisible();
  });

  test('create written + "after a ritual" stores a habit-stacking cue', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ id: 'r_anchor', name: 'Anchor' }, 1)] });
    await gotoApp(page);
    await page.locator('#ritualMount .r-add').click();
    await page.locator('#rsName').fill('Play guitar');
    await page.locator('#rsSeg button[data-cue="after"]').click();
    await page.locator('#rsSave').click();
    const rits = await readRituals(page);
    const fresh = rits.find((r) => r.name === 'Play guitar');
    expect(fresh).toBeTruthy();
    expect(fresh.cue.type).toBe('after');
    expect(fresh.cue.value).toBe('r_anchor');
  });

  test('never-miss-twice: a missed prior day surfaces the warm 2-min chip', async ({ page }) => {
    // done 2 days ago, but NOT yesterday and NOT today -> missed the prior due day
    await seedStorage(page, { rituals: [ritual({ name: 'Reading', log: [dayKey(-2)] })] });
    await gotoApp(page);
    await expect(card(page, 'Reading')).toHaveClass(/miss/);
    await expect(card(page, 'Reading').locator('.r-mini2')).toBeVisible();
  });

  test('Progress shows the history block; a past calendar cell backfills a day', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ id: 'r_h', name: 'Breathe', log: [dayKey(0)] })] });
    await gotoApp(page);
    await page.locator('.petal[data-v="stats"]').click();
    await expect(page.locator('#ritStatsMount .rst-panel')).toBeVisible();
    // tap the cell 3 days ago -> it becomes done in the log
    const target = dayKey(-3);
    await page.locator('#ritStatsMount .rst-c[data-day="' + target + '"]').click();
    const rits = await readRituals(page);
    expect(rits[0].log).toContain(target);
  });

  test('backup export includes rituals and import restores them', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ id: 'r_bk', name: 'Gratitude' }, 4)] });
    await gotoApp(page);
    const dl = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => window.__miExport && window.__miExport()),
    ]).then(([d]) => d);
    const fs = require('fs');
    const p = await dl.path();
    const dump = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(dump.data.rituals).toBeTruthy();
    expect(JSON.parse(dump.data.rituals)[0].name).toBe('Gratitude');
    // wipe + import restores
    await page.evaluate(() => localStorage.removeItem('rituals'));
    await page.locator('#importFile').setInputFiles(p);
    await page.waitForTimeout(600);
    const rits = await readRituals(page);
    expect(rits.some((r) => r.name === 'Gratitude')).toBe(true);
  });

  test('i18n: switching to Romanian relabels the section header', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ name: 'Respiro' }, 1)] });
    await gotoApp(page);
    await expect(page.locator('#ritualMount .r-t')).toHaveText('My rituals');
    await page.locator('#langBar button[data-l="ro"]').click();
    await expect(page.locator('#ritualMount .r-t')).toHaveText('Ritualurile mele');
  });

  // v156: manage rituals — the Edit toggle turns each card into a two-tap delete; tapping a card
  // body opens the creation sheet prefilled and saves the edit in place (id + log preserved).
  test('edit mode: two-tap delete removes a ritual (default or custom) and persists', async ({ page }) => {
    await seedStorage(page, { rituals: [
      ritual({ id: 'r_x', name: 'Remove me' }, 2),
      ritual({ id: 'r_y', name: 'Keep me' }, 1),
    ] });
    await gotoApp(page);
    await page.locator('#ritualMount .r-editbtn').click();
    await card(page, 'Remove me').locator('.r-del').click();               // first tap arms
    await expect(card(page, 'Remove me').locator('.r-del.arm')).toBeVisible();
    await card(page, 'Remove me').locator('.r-del').click();               // second tap deletes
    await expect(card(page, 'Remove me')).toHaveCount(0);
    await expect(card(page, 'Keep me')).toBeVisible();
    const rits = await readRituals(page);
    expect(rits.map((r) => r.name)).toEqual(['Keep me']);
  });

  test('edit mode: tapping a card opens the sheet prefilled and saves in place', async ({ page }) => {
    await seedStorage(page, { rituals: [ritual({ id: 'r_e', name: 'Old name' }, 4)] });
    await gotoApp(page);
    await page.locator('#ritualMount .r-editbtn').click();
    await card(page, 'Old name').locator('.r-body').click();
    await expect(page.locator('#ritSheet')).toHaveClass(/show/);
    await expect(page.locator('#rsName')).toHaveValue('Old name');
    await page.locator('#rsName').fill('New name');
    await page.locator('#rsSave').click();
    await expect(page.locator('#ritSheet')).not.toHaveClass(/show/);
    await expect(card(page, 'New name')).toBeVisible();
    await expect(card(page, 'Old name')).toHaveCount(0);
    const rits = await readRituals(page);
    expect(rits.length).toBe(1);
    expect(rits[0].id).toBe('r_e');       // edited in place, not recreated
    expect(rits[0].log.length).toBe(4);    // streak/log preserved
  });
});
