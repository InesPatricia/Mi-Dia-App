#!/usr/bin/env node
/*
 * shoot.js — reusable "one view × one theme" screenshot for Mi Día.
 * Stops us from re-writing throwaway shot.js each session (retro item 3).
 *
 * Usage:
 *   node shoot.js <htmlFile> <out.png> <view> <theme>
 *     htmlFile : absolute path to a mi-dia-vNN.html (or index.html)
 *     out.png  : where to write the screenshot
 *     view     : day | journal | respiro | calendar | progress | projects | profile | settings
 *     theme    : light | dark        (default: light)
 *
 * Notes:
 *  - Phone-first: renders at 412px / DPR 2 (matches the e2e mobile-chromium viewport).
 *  - Dark is set via the REAL hero toggle (#themeToggle) after boot, so it doesn't race
 *    the early applyTheme() re-apply (a bug we hit doing screenshots by hand).
 *  - Full-page for scrolling views; the hero/flower fit at viewport height for `day`.
 */
const { chromium } = require('playwright');

// view -> how to navigate to it from the Day view
const NAV = {
  day:       null,                                   // default
  journal:   { petal: 'journal' },
  respiro:   { petal: 'calm' },                      // Respiro's internal view id is "calm"
  calendar:  { petal: 'cal' },
  progress:  { petal: 'stats' },
  projects:  { petal: 'proj' },
  profile:   { bnav: 'profil' },
  settings:  { bnav: 'profil', segment: 'settings' },
};

async function gotoView(page, view) {
  const spec = NAV[view];
  if (!spec) return; // day
  // always return to Day first (flower petals only exist there)
  await page.evaluate(() => { const b = document.querySelector('.bnav[data-v="day"]'); if (b) b.click(); });
  await page.waitForTimeout(300);
  if (spec.petal) {
    await page.evaluate((v) => { const el = document.querySelector('.petal[data-v="' + v + '"]'); if (el) el.click(); }, spec.petal);
  } else if (spec.bnav) {
    await page.evaluate((v) => { const el = document.querySelector('.bnav[data-v="' + v + '"]'); if (el) el.click(); }, spec.bnav);
  }
  await page.waitForTimeout(500);
  if (spec.segment === 'settings') {
    await page.evaluate(() => { const b = document.querySelector('#profMode button:last-child, [data-pm="settings"]'); if (b) b.click(); });
    await page.waitForTimeout(400);
  }
}

async function shoot({ file, out, view = 'day', theme = 'light' }) {
  const url = 'file:///' + file.replace(/\\/g, '/');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => document.body.hasAttribute('data-view')).catch(() => {});
  await page.waitForTimeout(900);
  if (theme === 'dark') { await page.click('#themeToggle').catch(() => {}); await page.waitForTimeout(450); }
  await gotoView(page, view);
  await page.screenshot({ path: out, fullPage: view !== 'day' });
  await browser.close();
}

module.exports = { shoot, VIEWS: Object.keys(NAV) };

if (require.main === module) {
  const [file, out, view = 'day', theme = 'light'] = process.argv.slice(2);
  if (!file || !out) { console.error('usage: node shoot.js <htmlFile> <out.png> <view> <theme>'); process.exit(1); }
  shoot({ file, out, view, theme })
    .then(() => console.log('shot -> ' + out + '  (' + view + ' / ' + theme + ')'))
    .catch((e) => { console.error(e); process.exit(1); });
}
