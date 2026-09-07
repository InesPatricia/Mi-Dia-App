// Calendar tests: Month/Year toggle, month navigation, the grid renders the right number of day
// cells, and seeded data drives the "lens" overlays (Plan = progress ring, Mood = glow). Data is
// injected before load.
//
// Migrated to the page object layer. The local openCalendar helper asserted, so that assertion is
// now in the spec, and the two segmented controls are scoped to their own containers.
const { test, expect } = require('../fixtures/app.fixture');
const { dayKey } = require('./helpers');

const daysInThisMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

test.describe('calendar', () => {
  test('Month/Year segmented toggle swaps the panels', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // default = the Month panel
    await expect(app.calendar.monthPanel).toBeVisible();
    // selecting Year swaps to the Year panel
    await app.calendar.scope('Year').click();
    await expect(app.calendar.yearPanel).toBeVisible();
    await expect(app.calendar.monthPanel).toBeHidden();

    // selecting Month swaps back
    await app.calendar.scope('Month').click();
    await expect(app.calendar.monthPanel).toBeVisible();
  });

  test('prev / next navigation changes the title; Today returns', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Calendar');

    // capture the current month title, then go to the previous month
    const current = await app.calendar.title.textContent();
    await app.calendar.previousMonth.click();
    // the title changed (moved off the current month)
    await expect(app.calendar.title).not.toHaveText(current);

    // Today returns to the current month
    await app.calendar.today.click();
    await expect(app.calendar.title).toHaveText(current);
  });

  test('the month grid renders one cell per day of the month', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Calendar');
    // one non-empty day cell per day of the current month
    await expect(app.calendar.dayCells).toHaveCount(daysInThisMonth());
  });

  test('seeded blocks + mood drive the Plan ring and the Mood glow on today', async ({ app }) => {
    await app.launch({
      ['day:' + dayKey()]: [
        { id: 'a', title: 'Task A', cat: 'coaching', time: '', dur: 30, tags: [], done: true, date: dayKey() },
        { id: 'b', title: 'Task B', cat: 'coaching', time: '', dur: 30, tags: [], done: false, date: dayKey() },
      ],
      ['journal:' + dayKey()]: { text: 'note', mood: 5 },
    });
    await app.day.tapPetal('Calendar');

    // Plan lens (default): today's cell shows a progress ring
    await expect(app.calendar.todayCell.locator('.lring')).toBeVisible();

    // switch to the Mood lens: today's cell shows a mood glow
    await app.calendar.lens('Mood').click();
    await expect(app.calendar.todayCell.locator('.glow')).toBeVisible();
  });
});
