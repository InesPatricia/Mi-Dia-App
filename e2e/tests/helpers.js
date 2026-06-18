// Shared test helpers for the Mi Dia e2e suite.
//
// The app's Store layer falls back to localStorage when window.storage is absent
// (always the case in a plain browser), so we can seed/inspect state directly.
// seedStorage writes localStorage BEFORE the page loads, via addInitScript, so the
// app boots into a known state (language, day blocks, settings...).

/**
 * Seed localStorage before the app loads. Keys mirror the data model in CLAUDE.md
 * (e.g. "settings", "day:<key>", "intent:YYYY-MM-DD"). Values are stored as the app
 * stores them: JSON.stringify'd objects/arrays, plain strings for scalar keys.
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, any>} entries  key -> value (objects are JSON-stringified)
 */
async function seedStorage(page, entries = {}) {
  await page.addInitScript((data) => {
    for (const [k, v] of Object.entries(data)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, entries);
}

/**
 * Load the app and wait until it has booted (body[data-view] is set by setView()).
 * @param {import('@playwright/test').Page} page
 */
async function gotoApp(page) {
  await page.goto('/');
  // setView() sets data-view on <body> once the app initialises.
  await page.waitForFunction(() => document.body.hasAttribute('data-view'));
}

/**
 * Read all day-plan blocks the app has persisted to localStorage (across every "day:" key).
 * Lets tests assert on the stored data model (e.g. dur/cat/time) rather than only the DOM.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<object>>}
 */
async function readBlocks(page) {
  return page.evaluate(() => {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('day:') === 0) {
        try { out.push(...JSON.parse(localStorage.getItem(k))); } catch (e) { /* ignore */ }
      }
    }
    return out;
  });
}

/**
 * Storage date key, mirroring the app's keyFor(): "YYYY-MM-DD" (zero-padded).
 * @param {Date} d
 */
function keyFor(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * Key for a day relative to today (offset in days, default 0 = today). Used to seed
 * `day:<key>` / `journal:<key>` entries the data-driven views (Calendar/Progress) read.
 * @param {number} offset
 */
function dayKey(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return keyFor(d);
}

module.exports = { seedStorage, gotoApp, readBlocks, keyFor, dayKey };
