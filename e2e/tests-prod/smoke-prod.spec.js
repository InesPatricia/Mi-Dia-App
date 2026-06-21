// POST-DEPLOY smoke suite — runs against the LIVE production site after a deploy to main.
// Goal: a fast "is prod up and the new build healthy?" check across ALL views, NOT full
// coverage (the local e2e suite already does deep coverage before merge). Read-only: it
// navigates and asserts, it never writes journal/day user data. Locators mirror the main
// suite (user-facing EN names; a fresh CI browser has no saved settings, so the default UI
// language is English).
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('../tests/helpers');

const BASE = process.env.PROD_URL || 'https://mi-dia-app.pages.dev';
const ORIGIN = new URL(BASE).origin;

// Petal label (EN aria-label) -> the body[data-view] it should switch to.
const PETALS = [
  ['Journal', 'journal'],
  ['Respiro', 'calm'],
  ['Calendar', 'cal'],
  ['Progress', 'stats'],
  ['Projects', 'proj'],
];

test.describe('post-deploy smoke (production)', () => {
  test('home boots on the Day view, brand shows, no console errors or same-origin 404s', async ({ page }) => {
    const errors = [];
    const badResponses = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      const u = new URL(r.url());
      // only same-origin app assets; favicon 404 is benign noise on the host
      if (u.origin === ORIGIN && r.status() >= 400 && !/favicon/i.test(u.pathname)) {
        badResponses.push(`${r.status()} ${u.pathname}`);
      }
    });

    await gotoApp(page);
    await page.waitForTimeout(500); // let late assets (fonts/hero) settle for the 404 scan

    await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
    await expect(page.getByRole('heading', { name: /Mi D/i })).toBeVisible();

    expect(badResponses, badResponses.join('\n')).toEqual([]);
    const real = errors.filter((e) => !/favicon|ServiceWorker|sw\.js|manifest/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('the service worker file is served and carries a mi-dia cache', async ({ page }) => {
    const res = await page.request.get(`${BASE}/sw.js`);
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toMatch(/CACHE\s*=\s*"mi-dia-/);
  });

  test('the PWA manifest is linked (installable)', async ({ page }) => {
    await gotoApp(page);
    // manifest is an inline data URI <link rel="manifest"> in <head>
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /.+/);
  });

  test('all 7 views render without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);

    // The flower petals live inside #view-day (only clickable on Day), so return Home
    // (bottom bar, always visible) between petals. Profile is a bottom-bar item.
    for (const [name, view] of PETALS) {
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', 'day');
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('body')).toHaveAttribute('data-view', view);
    }
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'profil');

    const real = errors.filter((e) => !/favicon|ServiceWorker|sw\.js|manifest/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('core flower navigation is present', async ({ page }) => {
    await gotoApp(page);
    for (const [name] of PETALS) {
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

  test('switching language EN -> RO relabels the navigation (i18n)', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole('button', { name: 'Journal', exact: true })).toBeVisible();
    // language switcher lives in the header (visible on open)
    await page.getByRole('button', { name: 'RO', exact: true }).click();
    // the Journal petal's accessible name now follows RO ("Jurnal")
    await expect(page.getByRole('button', { name: 'Jurnal', exact: true })).toBeVisible();
  });
});
