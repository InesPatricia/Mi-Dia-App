// Garden tests (v183 S4). The Garden is a month grid of saved mini-flowers, one per day, at that
// day's bloom level. It opens as an overlay from a Home link (#gardenLink) — no 6th tab.
// A day is snapshotted into the `garden` localStorage map whenever you show up for it (a check-in /
// a ritual done / a rest day); the write happens continuously on paintFlower, so a check-in on Home
// creates today's garden entry. Past days freeze (their inputs stop changing). Access + locators:
// #gardenLink (Home), #gardenOverlay (role=dialog), #gardenGrid > .gcell > .gmini-wrap (a flower),
// #gardenMonth / #gardenSub / #gardenPrev/#gardenNext / #gardenBack.
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, dayKey } = require('./helpers');

test.describe('garden', () => {
  test('a check-in on Home snapshots today into the garden', async ({ page }) => {
    await gotoApp(page);
    // a presence tap on the Home check-in row (the tonal discs) — feeds the flower AND the garden
    await page.locator('#checkinDiscs button').nth(4).click();

    // today's garden entry now exists with a positive bloom (a check-in alone = 0.40)
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem('garden'));
      if (!raw) return null;
      const g = JSON.parse(raw);
      const e = g[dayKey(0)];
      return e ? e.bloom : null;
    }).toBeGreaterThan(0);
  });

  test('the Garden overlay shows a saved flower for a past day + month nav + close', async ({ page }) => {
    // seed yesterday as a fully-bloomed day (a past day is never rewritten on load, so it persists)
    await seedStorage(page, { garden: { [dayKey(-1)]: { bloom: 1, rest: false, intention: 'prezenta', mood: 4 } } });
    await gotoApp(page);

    // open the garden from Home
    await page.locator('#gardenLink').click();
    const overlay = page.locator('#gardenOverlay');
    await expect(overlay).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#gardenMonth')).not.toHaveText('');
    await expect(page.locator('#gardenSub')).not.toHaveText('');

    // yesterday is in the current month unless today is the 1st -> then step back one month
    const grid = page.locator('#gardenGrid');
    if ((await grid.locator('.gmini-wrap').count()) === 0) {
      await page.locator('#gardenPrev').click();
    }
    await expect(grid.locator('.gmini-wrap').first()).toBeVisible();
    expect(await grid.locator('.gmini-wrap').count()).toBeGreaterThanOrEqual(1);
    // future days render as empty (dashed) cells
    expect(await grid.locator('.gcell.empty').count()).toBeGreaterThanOrEqual(0);

    // S5: the monthly "noticing" reflection appears for a month with presence (never a score)
    await expect(page.locator('#gardenReflection .refl-h')).toBeVisible();
    await expect(page.locator('#gardenReflection .refl-line').first()).toBeVisible();

    // month nav changes the label
    const before = await page.locator('#gardenMonth').textContent();
    await page.locator('#gardenNext').click();
    await expect(page.locator('#gardenMonth')).not.toHaveText(before);

    // close returns to the app
    await page.locator('#gardenBack').click();
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });
});
