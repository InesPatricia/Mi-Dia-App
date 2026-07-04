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

// view -> how to navigate to it from the Day view (S1: nav is the bottom tab bar; the flower is decor).
// Progres lives under the "You" (profil) tab segment; Proiecte is reached from a Home link.
const NAV = {
  day:       null,                                   // default
  journal:   { tab: 'journal' },
  respiro:   { tab: 'calm' },                        // Respiro's internal view id is "calm"
  calendar:  { tab: 'cal' },
  progress:  { tab: 'profil', segment: 'progres' },  // You tab -> Progress segment
  projects:  { projlink: true },                     // "My projects" link on Home
  profile:   { tab: 'profil' },
  settings:  { tab: 'profil', segment: 'setari' },
};

async function gotoView(page, view) {
  const spec = NAV[view];
  if (!spec) return; // day
  // always return to Day first
  await page.evaluate(() => { const b = document.querySelector('.tabbar .tab[data-v="day"]'); if (b) b.click(); });
  await page.waitForTimeout(300);
  if (spec.projlink) {
    await page.evaluate(() => { const el = document.getElementById('projLink'); if (el) el.click(); });
  } else if (spec.tab) {
    await page.evaluate((v) => { const el = document.querySelector('.tabbar .tab[data-v="' + v + '"]'); if (el) el.click(); }, spec.tab);
  }
  await page.waitForTimeout(500);
  if (spec.segment) {
    // profil view: Profil/Progres/Setari segment (Progres routes to the stats view)
    await page.evaluate((m) => { const b = document.querySelector('#profMode button[data-m="' + m + '"]'); if (b) b.click(); }, spec.segment);
    await page.waitForTimeout(400);
  }
}

async function shoot({ file, out, view = 'day', theme = 'light' }) {
  const url = 'file:///' + file.replace(/\\/g, '/');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // mark onboarded so the guided overlay doesn't cover Home (mirrors gotoApp in the e2e suite)
  await page.addInitScript(() => {
    try { const s = JSON.parse(localStorage.getItem('settings') || '{}'); if (s.onboarded !== true) { s.onboarded = true; localStorage.setItem('settings', JSON.stringify(s)); } } catch (e) {}
  });
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
