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
  // addInitScript runs on EVERY navigation (incl. reloads), so seed idempotently — only when
  // the key is absent. Otherwise a reload would clobber changes the app persisted (e.g. a ritual
  // checked in-app then reloaded to prove persistence). Mirrors real localStorage semantics.
  await page.addInitScript((data) => {
    for (const [key, value] of Object.entries(data)) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }
  }, entries);
}

/**
 * Load the app and wait until it has booted (body[data-view] is set by setView()).
 * @param {import('@playwright/test').Page} page
 */
async function gotoApp(page, opts = {}) {
  // v150: the guided onboarding overlay auto-runs for NEW users (no settings.onboarded).
  // The functional suite tests a RETURNING user, so default to marking onboarded=true
  // (merged into any settings a prior seedStorage set). The onboarding spec opts out
  // with gotoApp(page, { onboarded: false }) to exercise the fresh-launch flow.
  if (opts.onboarded !== false) {
    await page.addInitScript(() => {
      try {
        const raw = localStorage.getItem('settings');
        const settings = raw ? JSON.parse(raw) : {};
        if (settings.onboarded !== true) {
          settings.onboarded = true;
          localStorage.setItem('settings', JSON.stringify(settings));
        }
      } catch { /* ignore */ }
    });
  }
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
      const key = localStorage.key(i);
      if (key && key.indexOf('day:') === 0) {
        try { out.push(...JSON.parse(localStorage.getItem(key))); } catch { /* ignore */ }
      }
    }
    return out;
  });
}

/**
 * Read the rituals the app has persisted (localStorage "rituals" JSON array).
 * Lets tests assert on the ritual data model (log, cue, streak-derivation) directly.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<object>>}
 */
async function readRituals(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('rituals') || '[]'); } catch { return []; }
  });
}

/**
 * Read the settings object (localStorage "settings" JSON). Handy for asserting
 * settings.onboarded / settings.identity after onboarding flows.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>}
 */
async function readSettings(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('settings') || '{}'); } catch { return {}; }
  });
}

/**
 * Build a ritual object for seeding, with a `log` of consecutive days ending YESTERDAY
 * (so today is left un-checked — the common "streak of N, today pending" setup, which lets
 * tests then tap the check for today). Pass an explicit `over.log` to control it precisely.
 * @param {object} over  fields to override (id, name, color, icon, cue, log, ...)
 * @param {number} logDays  streak length ending yesterday (today NOT included)
 */
function ritual(over = {}, logDays = 0) {
  const log = [];
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0); cursor.setDate(cursor.getDate() - 1); // start yesterday
  for (let i = 0; i < logDays; i++) { log.push(keyForLocal(cursor)); cursor.setDate(cursor.getDate() - 1); }
  return Object.assign({
    id: 'r_seed_' + Math.random().toString(36).slice(2, 7),
    name: 'Test ritual', identity: '', color: '--sea', icon: 'breath',
    twoMin: '2-min version', cue: { type: 'time', value: '08:00' },
    freq: 'daily', area: '', createdAt: '2026-01-01', log,
  }, over);
}
function keyForLocal(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

/**
 * Storage date key, mirroring the app's keyFor(): "YYYY-MM-DD" (zero-padded).
 * @param {Date} date
 */
function keyFor(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

/**
 * Key for a day relative to today (offset in days, default 0 = today). Used to seed
 * `day:<key>` / `journal:<key>` entries the data-driven views (Calendar/Progress) read.
 * @param {number} offset
 */
function dayKey(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return keyFor(date);
}

module.exports = { seedStorage, gotoApp, readBlocks, readRituals, readSettings, ritual, keyFor, dayKey };
