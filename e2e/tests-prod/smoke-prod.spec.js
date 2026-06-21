// POST-DEPLOY smoke suite — runs against the LIVE production site after a deploy to main.
// Goal: a fast "is prod actually up and the new build healthy?" check, NOT full coverage
// (the local e2e suite already does deep coverage before merge). Read-only: it navigates and
// asserts, it never writes user data. Locators mirror the main suite (user-facing EN names;
// a fresh CI browser has no saved settings, so the default UI language is English).
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('../tests/helpers');

const BASE = process.env.PROD_URL || 'https://mi-dia-app.pages.dev';

test.describe('post-deploy smoke (production)', () => {
  test('home loads on the Day view with the brand, no real console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);

    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
    await expect(page.getByRole('heading', { name: /Mi D/i })).toBeVisible();

    // Ignore service-worker / favicon / manifest noise that is normal on the real host.
    const real = errors.filter((e) => !/favicon|ServiceWorker|sw\.js|manifest/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('the service worker file is served and carries a mi-dia cache', async ({ page }) => {
    const res = await page.request.get(`${BASE}/sw.js`);
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toMatch(/CACHE\s*=\s*"mi-dia-/);
  });

  test('core flower navigation is present', async ({ page }) => {
    await gotoApp(page);
    for (const name of ['Journal', 'Respiro', 'Calendar', 'Progress', 'Projects']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('the Journal opens and the writing card is ready', async ({ page }) => {
    await gotoApp(page);
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'journal');
    // the free-text area (by its EN placeholder) and the olive writing card are present
    await expect(page.getByPlaceholder(/Write freely/i)).toBeVisible();
    await expect(page.locator('#view-journal .jwrite-card')).toBeVisible();
  });
});
