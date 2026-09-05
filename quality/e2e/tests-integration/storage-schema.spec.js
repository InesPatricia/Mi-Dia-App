// Integration level: what the app writes to storage, and whether it matches the contract.
//
// There is no backend, so localStorage is the whole persistence layer and this file is the only
// place that checks it as a layer. The end-to-end suite reaches storage too, but always through a
// screen: it taps a control and then reads a key to prove the tap landed. Here the screen is not
// the subject. The subject is the boundary between the application's own code and the store.
//
// A browser is still the host, and deliberately so. The code that writes these keys is inlined
// inside the application's single closure and is reachable from nowhere else, which the loader in
// quality/unit cannot help with: nothing is exported. Running the real page is the only way to
// exercise the real writer.
//
// No clicks and no navigation between views. A reload is used where a reload is the thing being
// tested, which is what "does this survive" means.

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage } = require('../tests/helpers');

const SCHEMA_DOC = path.join(__dirname, '..', '..', '..', 'docs', 'DATA_SCHEMA.md');

/**
 * Read the key names out of one markdown table in the schema document.
 *
 * This is what makes the document the contract rather than a description of one. The table used to
 * name three keys the application had never written, and nothing caught it, because nothing was
 * reading it. Now a key the app writes without a row here turns this file red.
 *
 * It throws rather than returning an empty list when it cannot find the table. A parser that
 * quietly finds nothing turns this whole check into a test that passes for free, which is the
 * failure mode this repository keeps finding in its own tools.
 */
function keysUnder(heading) {
  const document = fs.readFileSync(SCHEMA_DOC, 'utf8');
  const section = document.split(/^## /m).find((part) => part.startsWith(heading));
  if (!section) throw new Error(`DATA_SCHEMA.md has no "## ${heading}" section`);

  // The FIRST contiguous table in the section, and only that one. A section reaches to the next
  // level-two heading, so it carries its own subsections, and `## Keys` has a `### settings` under
  // it with a table of field names. Collecting every pipe-row in the section swept those in as if
  // they were storage keys, which quietly made the documented set larger than the document. Found
  // by emptying the key table on purpose and watching the check pass anyway.
  const lines = section.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('|'));
  if (start < 0) throw new Error(`DATA_SCHEMA.md "## ${heading}" has no table`);

  const rows = [];
  for (let i = start; i < lines.length && lines[i].startsWith('|'); i++) {
    if (!/^\|\s*-+/.test(lines[i])) rows.push(lines[i]);
  }

  const names = rows
    .slice(1) // the header row
    .flatMap((row) => row.split('|')[1].split(','))
    .map((cell) => cell.trim().replace(/`/g, ''))
    .filter(Boolean);

  if (names.length < 5) {
    throw new Error(`DATA_SCHEMA.md "## ${heading}" parsed to ${names.length} key(s), which cannot be right`);
  }
  return names;
}

/**
 * A documented name is either exact, or a family with its own identifier in the key. Both forms
 * appear in the table: `settings` is one key, `day:YYYY-MM-DD` and `proj:<project id>` are prefixes.
 */
function accounts(documented, key) {
  return documented.some((name) => (name.includes(':') ? key.startsWith(name.split(':')[0] + ':') : name === key));
}

/**
 * Everything in the store, as the store holds it. Values stay strings, because that is what
 * localStorage returns and what the backup import writes back.
 */
function readStorage(page) {
  return page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      out[key] = localStorage.getItem(key);
    }
    return out;
  });
}

// Both lists come out of the document, not out of this file. Two copies of a contract is how the
// document drifted in the first place.
const DOCUMENTED_KEYS = keysUnder('Keys');
const DOCUMENTED_MARKERS = keysUnder('First-run and migration markers');

// The documented ritual record. The streak is absent on purpose and that absence is the contract.
const RITUAL_FIELDS = [
  'area', 'color', 'createdAt', 'cue', 'freq', 'icon', 'id', 'identity', 'log', 'name', 'twoMin',
];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

test.describe('what a first run writes', () => {
  test('writes no key that the schema document does not account for', async ({ page }) => {
    await gotoApp(page);
    const written = Object.keys(await readStorage(page)).sort();
    expect(written.length).toBeGreaterThan(5);

    const undocumented = written.filter(
      (key) => !accounts(DOCUMENTED_KEYS, key) && !accounts(DOCUMENTED_MARKERS, key),
    );
    expect(
      undocumented,
      'these keys are in storage and in no table in docs/DATA_SCHEMA.md. Add the row, or stop writing the key.',
    ).toEqual([]);
  });

  test('writes every collection as JSON of the documented type', async ({ page }) => {
    await gotoApp(page);
    const stored = await readStorage(page);

    for (const key of ['areas', 'projects', 'rituals', 'shortcuts', 'tags']) {
      expect(Array.isArray(JSON.parse(stored[key])), `${key} should be a JSON array`).toBe(true);
    }
    const settings = JSON.parse(stored.settings);
    expect(Array.isArray(settings)).toBe(false);
    expect(typeof settings).toBe('object');
  });

  test('seeds the two default rituals with exactly the documented fields', async ({ page }) => {
    await gotoApp(page);
    const rituals = JSON.parse((await readStorage(page)).rituals);

    expect(rituals.length).toBeGreaterThan(0);
    for (const ritual of rituals) {
      expect(Object.keys(ritual).sort()).toEqual(RITUAL_FIELDS);
      expect(Object.keys(ritual.cue).sort()).toEqual(['type', 'value']);
      expect(Array.isArray(ritual.log)).toBe(true);
      expect(ritual.createdAt).toMatch(YMD);
    }
  });

  // The schema document's headline rule, and the one that keeps the app free of desync bugs: a
  // stored counter and a log can disagree, a derived one cannot. Nothing in the record may carry a
  // streak, a record streak or a done count.
  test('stores no derived value beside the log it would come from', async ({ page }) => {
    await seedStorage(page, {
      rituals: [{
        id: 'r_derived', name: 'Breathe', identity: '', cue: { type: 'time', value: '08:00' },
        twoMin: '3 breaths', area: '', color: '--sea', icon: 'breath', freq: 'daily',
        log: ['2026-01-13', '2026-01-14', '2026-01-15'], createdAt: '2026-01-01',
      }],
      rit_seeded_v1: '1',
    });
    await gotoApp(page);

    const rituals = JSON.parse((await readStorage(page)).rituals);
    expect(rituals).toHaveLength(1);
    expect(Object.keys(rituals[0]).sort()).toEqual(RITUAL_FIELDS);
    expect(JSON.stringify(rituals[0])).not.toMatch(/streak|record|count/i);
  });
});

test.describe('the shape survives a reload', () => {
  // The seed marker is the source of truth for "is this a first run". If a reload could re-seed,
  // every returning user would collect duplicate rituals, which is the failure this key exists to
  // prevent and which nothing else in the suite covers.
  test('a second boot does not seed a second set of rituals', async ({ page }) => {
    await gotoApp(page);
    const first = (await readStorage(page)).rituals;
    expect(JSON.parse(first).length).toBeGreaterThan(0);

    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));

    await expect.poll(async () => (await readStorage(page)).rituals).toBe(first);
  });

  test('a cycle config in the documented shape comes back unchanged', async ({ page }) => {
    const cycle = {
      periods: [{ start: '2026-01-01', bleed: 5 }, { start: '2026-01-29', bleed: 4 }],
      length: 28, period: 5, enabled: true,
    };
    await seedStorage(page, { cycle });
    await gotoApp(page);
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));

    const stored = JSON.parse((await readStorage(page)).cycle);
    expect(stored.periods).toEqual(cycle.periods);
    expect(stored.length).toBe(28);
    expect(stored.period).toBe(5);
    expect(stored.enabled).toBe(true);
  });

  // Dates are strings in a fixed format everywhere in the store, never Date objects, because a
  // Date does not survive JSON and a locale-formatted string does not sort.
  test('every date the store holds is a zero-padded day string', async ({ page }) => {
    await seedStorage(page, {
      cycle: { periods: [{ start: '2026-01-01', bleed: 5 }], length: 28, period: 5, enabled: true },
      rituals: [{
        id: 'r_dates', name: 'Breathe', identity: '', cue: { type: 'time', value: '08:00' },
        twoMin: '3 breaths', area: '', color: '--sea', icon: 'breath', freq: 'daily',
        log: ['2026-01-05', '2026-01-06'], createdAt: '2026-01-01',
      }],
      rit_seeded_v1: '1',
    });
    await gotoApp(page);
    const stored = await readStorage(page);

    for (const entry of JSON.parse(stored.cycle).periods) expect(entry.start).toMatch(YMD);
    for (const ritual of JSON.parse(stored.rituals)) {
      expect(ritual.createdAt).toMatch(YMD);
      for (const day of ritual.log) expect(day).toMatch(YMD);
    }
  });
});
