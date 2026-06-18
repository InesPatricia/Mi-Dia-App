// Calendar tests: Month/Year toggle, month navigation, the grid renders the right number
// of day cells, and seeded data drives the "lens" overlays (Plan = progress ring,
// Mood = glow). Data is injected with seedStorage before load.
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, dayKey } = require('./helpers');

const daysInThisMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
};

async function openCalendar(page) {
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'cal');
}

test.describe('calendar', () => {
  test('Month/Year segmented toggle swaps the panels', async ({ page }) => {
    await gotoApp(page);
    await openCalendar(page);

    await expect(page.locator('#cal-month')).toBeVisible();
    await page.getByRole('button', { name: 'Year', exact: true }).click();
    await expect(page.locator('#cal-year')).toBeVisible();
    await expect(page.locator('#cal-month')).toBeHidden();

    await page.getByRole('button', { name: 'Month', exact: true }).click();
    await expect(page.locator('#cal-month')).toBeVisible();
  });

  test('prev / next navigation changes the title; Today returns', async ({ page }) => {
    await gotoApp(page);
    await openCalendar(page);

    const title = page.locator('#calTitle');
    const current = await title.textContent();
    await page.locator('#calPrev').click();
    await expect(title).not.toHaveText(current);

    await page.locator('#calToday').click();
    await expect(title).toHaveText(current);
  });

  test('the month grid renders one cell per day of the month', async ({ page }) => {
    await gotoApp(page);
    await openCalendar(page);
    await expect(page.locator('#calGrid .cell.lens:not(.empty)')).toHaveCount(daysInThisMonth());
  });

  test('seeded blocks + mood drive the Plan ring and the Mood glow on today', async ({ page }) => {
    await seedStorage(page, {
      ['day:' + dayKey()]: [
        { id: 'a', title: 'Task A', cat: 'coaching', time: '', dur: 30, tags: [], done: true, date: dayKey() },
        { id: 'b', title: 'Task B', cat: 'coaching', time: '', dur: 30, tags: [], done: false, date: dayKey() },
      ],
      ['journal:' + dayKey()]: { text: 'note', mood: 5 },
    });
    await gotoApp(page);
    await openCalendar(page);

    // Plan lens (default): today's cell shows a progress ring
    await expect(page.locator('#calGrid .cell.today .lring')).toBeVisible();

    // switch to the Mood lens: today's cell shows a mood glow
    await page.locator('#calLensWrap').getByRole('button', { name: 'Mood', exact: true }).click();
    await expect(page.locator('#calGrid .cell.today .glow')).toBeVisible();
  });
});
