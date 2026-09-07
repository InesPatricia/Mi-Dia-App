// Guided onboarding tests (v150+): the carousel runs for a NEW user (no settings.onboarded), Skip
// dismisses it and marks onboarded, choosing an identity writes settings.identity, the
// "Create your first ritual" CTA drops into the creation sheet, and it can be re-run from Settings.
//
// The launch helper marks the user onboarded by DEFAULT (the functional suite is a returning user);
// these tests opt out to exercise the fresh-launch flow.
//
// Migrated to the page object layer. The last test reached Settings through raw data attributes,
// which was a SIXTH spelling of that navigation: phase 0 counted five, all of them by accessible
// name, and this one went under them. It is now the same call as every other.
const { test, expect } = require('../fixtures/app.fixture');
const { readSettings } = require('./helpers');

const FRESH = { onboarded: false };

test.describe('onboarding', () => {
  test('a new user sees the onboarding overlay on first launch', async ({ app }) => {
    await app.launch({}, FRESH);
    await expect(app.onboarding.overlay).toHaveClass(/show/);
    await expect(app.onboarding.brand).toContainText('Mi');
  });

  test('Skip dismisses it, marks onboarded, and it does not return on reload', async ({ app, page }) => {
    await app.launch({}, FRESH);
    await app.onboarding.skip.click();
    await expect(app.onboarding.overlay).not.toHaveClass(/show/);
    expect((await readSettings(page)).onboarded).toBe(true);
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    // the overlay is built lazily on open, so for a returning user it never exists at all
    await expect(app.onboarding.overlay).toHaveCount(0);
  });

  test('choosing an identity writes settings.identity', async ({ app, page }) => {
    await app.launch({}, FRESH);
    await app.onboarding.next.click(); // -> identity step
    await app.onboarding.identityOptions.first().click(); // "a calm person"
    expect((await readSettings(page)).identity).toBe('a calm person');
  });

  test('the Back button returns to the previous step', async ({ app }) => {
    await app.launch({}, FRESH);
    await app.onboarding.next.click(); // identity
    await app.onboarding.next.click(); // plan
    await expect(app.onboarding.planInput).toBeVisible();
    await app.onboarding.back.click(); // back to identity
    await expect(app.onboarding.identityChips).toBeVisible();
  });

  test('the "Create your first ritual" CTA closes onboarding and opens the creation sheet', async ({ app, page }) => {
    await app.launch({}, FRESH);
    for (let i = 0; i < 4; i++) await app.onboarding.next.click(); // -> ritual step (index 4)
    await expect(app.onboarding.ritualCta).toBeVisible();
    await app.onboarding.ritualCta.click();
    await expect(app.onboarding.overlay).not.toHaveClass(/show/);
    await expect(app.rituals.sheet).toHaveClass(/show/);
    expect((await readSettings(page)).onboarded).toBe(true);
  });

  test('a returning user boots without onboarding but can re-run it from Settings', async ({ app }) => {
    await app.launch(); // returning user (onboarded=true)
    await expect(app.onboarding.overlay).toHaveCount(0);
    // Profile -> Settings -> "Revisit what you can do"
    await app.openSettings();
    await app.onboarding.replay.click();
    await expect(app.onboarding.overlay).toHaveClass(/show/);
  });
});
