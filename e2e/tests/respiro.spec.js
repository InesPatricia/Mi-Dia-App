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

    // switching to "Wake me up" hides the sub-segment and shows the energy cards
    await page.getByRole('button', { name: 'Wake me up', exact: true }).click();
    await expect(page.locator('#calmMode')).toBeHidden(); // energy mode hides the sub-segment
    await expect(page.locator('#calmGrid .calmcard')).not.toHaveCount(0);

    // switching back to "Calm me" restores the Breathing/Somatic sub-segment
    await page.getByRole('button', { name: 'Calm me', exact: true }).click();
    await expect(page.locator('#calmMode')).toBeVisible();
  });

  test('the Breathing/Somatic sub-segment switches the list', async ({ page }) => {
    await gotoApp(page);
    await openRespiro(page);

    // capture the current first card title, then switch to the Somatic sub-segment
    const firstTitle = await page.locator('#calmGrid .cc-title').first().textContent();
    await page.getByRole('button', { name: 'Somatic / vagus nerve', exact: true }).click();
    // the Somatic segment is now active
    await expect(page.getByRole('button', { name: 'Somatic / vagus nerve', exact: true })).toHaveClass(/sel/);
    // the list content changed
    await expect(page.locator('#calmGrid .cc-title').first()).not.toHaveText(firstTitle);
  });

  test('opening an exercise shows the player, and it can be closed', async ({ page }) => {
    await gotoApp(page);
    await openRespiro(page);

    // opening the first exercise shows the player overlay with the breathing stage
    await page.locator('#calmGrid .calmcard').first().click();
    const player = page.locator('#calmPlayer');
    await expect(player).toHaveClass(/show/);
    await expect(player.locator('#cpBreath')).toBeVisible(); // first breathing exercise

    // closing the player hides the overlay again
    await page.locator('#cpClose').click();
    await expect(player).not.toHaveClass(/show/);
  });
});
