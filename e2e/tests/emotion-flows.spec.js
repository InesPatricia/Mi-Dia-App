// Deeper journal/respiro flows: the emotion-wheel routing (F3) from a named emotion to
// Calm/Energy, and the Body scan player (scan stage + tone/voice mode).
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('emotion routing + body scan', () => {
  test('naming a low-mood emotion routes to Respiro (F3)', async ({ page }) => {
    await gotoApp(page);
    // open the Journal view
    await page.getByRole('button', { name: 'Journal', exact: true }).click();

    // low mood -> permission pause + emotion wheel
    await page.locator('#mood').getByRole('button', { name: 'Rainy', exact: true }).click();
    // "Sadness" core routes to energy; pick it + a sub-emotion
    await page.locator('#ppCores').getByRole('button', { name: 'Sadness', exact: true }).click();
    await page.locator('#ppSubs').getByRole('button', { name: 'Lonely', exact: true }).click();

    // the routing suggestion appears; following it opens Respiro
    const route = page.locator('#ppRoute');
    await expect(route).toBeVisible();
    await route.locator('.pp-rgo').click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'calm');
  });

  test('the Body scan opens its scan stage with a tone/voice toggle', async ({ page }) => {
    await gotoApp(page);
    // open Respiro and the Somatic sub-segment
    await page.getByRole('button', { name: 'Respiro', exact: true }).click();
    await page.getByRole('button', { name: 'Body', exact: true }).click();

    // open the Body scan exercise
    await page.locator('#calmGrid .calmcard', { hasText: 'Body scan' }).click();

    // the player opens on the somatic + scan stage
    const player = page.locator('#calmPlayer');
    await expect(player).toHaveClass(/show/);
    await expect(page.locator('#cpSomatic')).toBeVisible();
    await expect(page.locator('#scanStage')).toBeVisible();
    // scan-specific mode switch (tone vs voice) with two options
    await expect(page.locator('#scanMode')).toBeVisible();
    await expect(page.locator('#scanMode button')).toHaveCount(2);
  });
});
