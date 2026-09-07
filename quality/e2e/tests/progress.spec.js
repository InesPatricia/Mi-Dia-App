// Progress (stats) tests: the range switch re-renders, and seeded DONE blocks + journal moods drive
// the stat tiles, streak chip, hours-per-area bars and the panel relating mood to productivity.
// Only DONE blocks count toward the tiles (see renderStats).
//
// Migrated to the page object layer. The local openProgress helper asserted, so that assertion is
// now in the spec, and the range switch is scoped to its own container.
const { test, expect } = require('../fixtures/app.fixture');
const { dayKey } = require('./helpers');

function doneBlock(id, dur, off = 0) {
  return { id, title: id, cat: 'coaching', time: '', dur, tags: [], done: true, date: dayKey(off) };
}

test.describe('progress', () => {
  test('the range switch updates the active button', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Progress');
    await expect(app.view).toHaveAttribute('data-view', 'stats');

    // selecting the "All" range marks it active and de-selects the others
    await app.progress.range('All').click();
    await expect(app.progress.range('All')).toHaveClass(/sel/);
    await expect(app.progress.range('This week')).not.toHaveClass(/sel/);
  });

  test('seeded done blocks drive the stat tiles + streak + area bars', async ({ app }) => {
    await app.launch({
      ['day:' + dayKey()]: [doneBlock('A', 30), doneBlock('B', 60)], // 2 done, 90 min, 1 active day
    });
    await app.day.tapPetal('Progress');

    // the tiles count the 2 done blocks across 1 active day
    await expect(app.progress.statValue('slots done')).toHaveText('2');
    await expect(app.progress.statValue('active days')).toHaveText('1');

    // a plan today -> streak chip visible; an area with time -> at least one bar
    await expect(app.progress.streakChip).toBeVisible();
    await expect(app.progress.areaBars).not.toHaveCount(0);
  });

  test('with 3+ journal days the mood panel shows an insight', async ({ app }) => {
    await app.launch({
      ['journal:' + dayKey(0)]: { text: 'a', mood: 5 },
      ['journal:' + dayKey(-1)]: { text: 'b', mood: 3 },
      ['journal:' + dayKey(-2)]: { text: 'c', mood: 4 },
      // a done block each day so they count as active in the "All" range
      ['day:' + dayKey(0)]: [doneBlock('x', 30, 0)],
      ['day:' + dayKey(-1)]: [doneBlock('y', 30, -1)],
      ['day:' + dayKey(-2)]: [doneBlock('z', 30, -2)],
    });
    await app.day.tapPetal('Progress');
    // widen to the "All" range so the 3 seeded journal days are included
    await app.progress.range('All').click();

    // the panel relating mood to productivity renders an insight + per-mood bars
    await expect(app.progress.moodInsight).not.toBeEmpty();
    await expect(app.progress.moodBars).not.toHaveCount(0);
  });
});
