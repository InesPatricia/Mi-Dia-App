// Progress (stats) tests: the range switch re-renders, and seeded DONE blocks + journal
// moods drive the stat tiles, streak chip, hours-per-area bars and the mood↔productivity
// panel. Only DONE blocks count toward the tiles (see renderStats).
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, dayKey } = require('./helpers');

function doneBlock(id, dur, off = 0) {
  return { id, title: id, cat: 'coaching', time: '', dur, tags: [], done: true, date: dayKey(off) };
}

async function openProgress(page) {
  // Progres lives under the "You" tab (Profil/Progres/Setari segment)
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'stats');
}

test.describe('progress', () => {
  test('the range switch updates the active button', async ({ page }) => {
    await gotoApp(page);
    await openProgress(page);

    // selecting the "All" range marks it active and de-selects the others
    const all = page.getByRole('button', { name: 'All', exact: true });
    await all.click();
    await expect(all).toHaveClass(/sel/);
    await expect(page.getByRole('button', { name: 'This week', exact: true })).not.toHaveClass(/sel/);
  });

  test('seeded done blocks drive the stat tiles + streak + area bars', async ({ page }) => {
    await seedStorage(page, {
      ['day:' + dayKey()]: [doneBlock('A', 30), doneBlock('B', 60)], // 2 done, 90 min, 1 active day
    });
    await gotoApp(page);
    await openProgress(page);

    // the tiles count the 2 done blocks across 1 active day
    const cards = page.locator('#statCards');
    await expect(cards.locator('.scard', { hasText: 'slots done' }).locator('.big')).toHaveText('2');
    await expect(cards.locator('.scard', { hasText: 'active days' }).locator('.big')).toHaveText('1');

    // a plan today -> streak chip visible; an area with time -> at least one bar
    await expect(page.locator('#streakChip')).toBeVisible();
    await expect(page.locator('#statBars').locator('*')).not.toHaveCount(0);
  });

  test('with 3+ journal days the mood↔productivity panel shows an insight', async ({ page }) => {
    await seedStorage(page, {
      ['journal:' + dayKey(0)]: { text: 'a', mood: 5 },
      ['journal:' + dayKey(-1)]: { text: 'b', mood: 3 },
      ['journal:' + dayKey(-2)]: { text: 'c', mood: 4 },
      // a done block each day so they count as active in the "All" range
      ['day:' + dayKey(0)]: [doneBlock('x', 30, 0)],
      ['day:' + dayKey(-1)]: [doneBlock('y', 30, -1)],
      ['day:' + dayKey(-2)]: [doneBlock('z', 30, -2)],
    });
    await gotoApp(page);
    await openProgress(page);
    // widen to the "All" range so the 3 seeded journal days are included
    await page.getByRole('button', { name: 'All', exact: true }).click();

    // the mood↔productivity panel renders an insight + per-mood bars
    await expect(page.locator('#moodInsight')).not.toBeEmpty();
    await expect(page.locator('#moodBars').locator('.msg')).not.toHaveCount(0);
  });
});
