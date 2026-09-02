// spec: specs/ritual.plan.md 1.2
// seed: tests-generated/seed.spec.js
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, readRituals, ritual, dayKey } = require('../tests/helpers');
const STRINGS = require('./strings');

test.describe('Check / Un-check Toggle', () => {
  test('Second tap on a done ritual un-checks it (toggle off)', async ({ page }) => {
    // 1. Seed one ritual with log = [dayKey(-1), dayKey(-2)] (2-day streak, not done today). Navigate to Home.
    await seedStorage(page, {
      settings: { lang: 'ro', onboarded: true },
      rituals: [ritual({ id: 'r_toggle', name: 'Move', log: [dayKey(-1), dayKey(-2)] })],
    });
    await gotoApp(page);

    const card = page.locator('#ritualMount .r-card').filter({ hasText: 'Move' });
    const tick = card.getByRole('button', { name: STRINGS.tickLabel });

    await expect(card.locator('.r-n')).toHaveText('2');
    await expect(tick).toHaveAttribute('aria-pressed', 'false');

    // 2. Click the tick once.
    await tick.click();
    await expect(tick).toHaveAttribute('aria-pressed', 'true');
    await expect(card.locator('.r-n')).toHaveText('3');
    let rits = await readRituals(page);
    expect(rits[0].log).toContain(dayKey(0));

    // 3. Click the tick a second time on the same ritual.
    await tick.click();
    await expect(tick).toHaveAttribute('aria-pressed', 'false');
    await expect(card.locator('.r-n')).toHaveText('2');
    rits = await readRituals(page);
    expect(rits[0].log).not.toContain(dayKey(0));

    // 4. Reload the page.
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await expect(tick).toHaveAttribute('aria-pressed', 'false');
    await expect(card.locator('.r-n')).toHaveText('2');
  });
});
