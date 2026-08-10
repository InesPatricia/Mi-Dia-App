// Guided onboarding tests (v150+): the carousel runs for a NEW user (no settings.onboarded),
// "Skip" dismisses it and marks onboarded, choosing an identity writes settings.identity, the
// "Create your first ritual" CTA drops into the creation sheet, and it can be re-run from Settings.
//
// gotoApp marks the user onboarded by DEFAULT (the functional suite is a returning user); these
// tests opt out with gotoApp(page, { onboarded: false }) to exercise the fresh-launch flow.
const { test, expect } = require('@playwright/test');
const { gotoApp, readSettings } = require('./helpers');

const overlay = (page) => page.locator('#onbOverlay');

test.describe('onboarding', () => {
  test('a new user sees the onboarding overlay on first launch', async ({ page }) => {
    await gotoApp(page, { onboarded: false });
    await expect(overlay(page)).toHaveClass(/show/);
    await expect(page.locator('.onb-brand')).toContainText('Mi');
  });

  test('Skip dismisses it, marks onboarded, and it does not return on reload', async ({ page }) => {
    await gotoApp(page, { onboarded: false });
    await page.locator('#onbSkip').click();
    await expect(overlay(page)).not.toHaveClass(/show/);
    expect((await readSettings(page)).onboarded).toBe(true);
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    const onb = page.locator('#onbOverlay');
    await expect(onb).toHaveCount(0); // overlay is built lazily on open; never opens for a returning user
  });

  test('choosing an identity writes settings.identity', async ({ page }) => {
    await gotoApp(page, { onboarded: false });
    await page.locator('#onbNext').click(); // -> identity step
    await page.locator('#onbIdChips button').first().click(); // "a calm person"
    expect((await readSettings(page)).identity).toBe('a calm person');
  });

  test('the Back button returns to the previous step', async ({ page }) => {
    await gotoApp(page, { onboarded: false });
    await page.locator('#onbNext').click(); // identity
    await page.locator('#onbNext').click(); // plan
    await expect(page.locator('#onbPlanInput')).toBeVisible();
    await page.locator('#onbBack').click(); // back to identity
    await expect(page.locator('#onbIdChips')).toBeVisible();
  });

  test('the "Create your first ritual" CTA closes onboarding and opens the creation sheet', async ({ page }) => {
    await gotoApp(page, { onboarded: false });
    for (let i = 0; i < 4; i++) await page.locator('#onbNext').click(); // -> ritual step (index 4)
    await expect(page.locator('#onbRitualCta')).toBeVisible();
    await page.locator('#onbRitualCta').click();
    await expect(overlay(page)).not.toHaveClass(/show/);
    await expect(page.locator('#ritSheet')).toHaveClass(/show/);
    expect((await readSettings(page)).onboarded).toBe(true);
  });

  test('a returning user boots without onboarding but can re-run it from Settings', async ({ page }) => {
    await gotoApp(page); // returning user (onboarded=true)
    const onb = page.locator('#onbOverlay');
    await expect(onb).toHaveCount(0);
    // Profile -> Settings -> "Revisit what you can do"
    await page.locator('.bnav[data-v="profil"]').click();
    await page.locator('#profMode button[data-m="setari"]').click();
    await page.locator('#onbReplayBtn').click();
    await expect(page.locator('#onbOverlay')).toHaveClass(/show/);
  });
});
