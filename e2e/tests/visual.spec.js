// Visual regression for the DESIGN-LOCKED signature components. Tagged @visual so CI
// (Linux) can skip it — snapshot baselines are OS-specific (font rendering differs), and
// these baselines are generated on the dev machine (Windows). Run locally with:
//   npm run test:visual            (creates missing baselines)
//   npx playwright test visual.spec.js --update-snapshots   (refresh after an intended change)
//
// We snapshot stable components (the radial flower + the bottom bar), NOT full screens —
// the hero's date + rotating daily phrase would make full-page shots differ every day.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('visual regression @visual', () => {
  test('flower navigation looks unchanged', async ({ page }) => {
    await gotoApp(page);
    // the radial flower navigation must match its locked baseline
    await expect(page.locator('.flower')).toHaveScreenshot('flower-nav.png');
  });

  test('bottom bar looks unchanged', async ({ page }) => {
    await gotoApp(page);
    // the fixed bottom bar must match its locked baseline
    await expect(page.locator('.bottombar')).toHaveScreenshot('bottom-bar.png');
  });
});
