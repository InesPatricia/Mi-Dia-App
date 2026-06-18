// Respiro tests: the Calm me / Wake me direction toggle, the Breathing/Somatic
// sub-segment, and opening + closing an exercise player.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

async function openRespiro(page) {
  await page.getByRole('button', { name: 'Respiro', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'calm');
}

test.describe('respiro', () => {
  test('the Calm/Wake direction toggle swaps the content', async ({ page }) => {
    await gotoApp(page);
    await openRespiro(page);

    // default = Calm me -> the Breathing/Somatic sub-segment is shown
    await expect(page.locator('#calmMode')).toBeVisible();

    await page.getByRole('button', { name: 'Wake me up', exact: true }).click();
    await expect(page.locator('#calmMode')).toBeHidden(); // energy mode hides the sub-segment
    await expect(page.locator('#calmGrid .calmcard')).not.toHaveCount(0);

    await page.getByRole('button', { name: 'Calm me', exact: true }).click();
    await expect(page.locator('#calmMode')).toBeVisible();
  });

  test('the Breathing/Somatic sub-segment switches the list', async ({ page }) => {
    await gotoApp(page);
    await openRespiro(page);

    const firstTitle = await page.locator('#calmGrid .cc-title').first().textContent();
    await page.getByRole('button', { name: 'Somatic / vagus nerve', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Somatic / vagus nerve', exact: true })).toHaveClass(/sel/);
    // the list content changed
    await expect(page.locator('#calmGrid .cc-title').first()).not.toHaveText(firstTitle);
  });

  test('opening an exercise shows the player, and it can be closed', async ({ page }) => {
    await gotoApp(page);
    await openRespiro(page);

    await page.locator('#calmGrid .calmcard').first().click();
    const player = page.locator('#calmPlayer');
    await expect(player).toHaveClass(/show/);
    await expect(player.locator('#cpBreath')).toBeVisible(); // first breathing exercise

    await page.locator('#cpClose').click();
    await expect(player).not.toHaveClass(/show/);
  });
});
