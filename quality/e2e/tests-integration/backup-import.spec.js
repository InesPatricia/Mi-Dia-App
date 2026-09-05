// Integration level: the backup import boundary.
//
// Import is the one place where data the app did not write gets into the store, so it is the one
// place where the store can be corrupted by a file. The end-to-end suite already covers the happy
// path as a user journey: export, delete something, import, see it come back. None of these cases
// are that. They are what happens when the file is wrong, and every one of them is reached without
// touching a screen, by setting the hidden file input the import button targets.
//
// Buffers rather than files on disk: the point is what the parser does with the bytes, and writing
// a temporary file first would only add a way for the test to fail for a reason of its own.

const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage } = require('../tests/helpers');

const SEEDED_TAGS = '["keep-me"]';

/** Hand the app a backup file without going near the Settings screen. */
async function importBackup(page, contents) {
  await page.locator('#importFile').setInputFiles({
    name: 'mi-dia-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
}

const toast = (page, text) => page.locator('.toast', { hasText: text });
const readKey = (page, key) => page.evaluate((name) => localStorage.getItem(name), key);

test.beforeEach(async ({ page }) => {
  // lang is seeded rather than left to the default so the assertions below read the message the
  // app actually produced, not the one the default happened to be on the day this was written.
  await seedStorage(page, { settings: { lang: 'en', onboarded: true }, tags: SEEDED_TAGS });
  await gotoApp(page);
});

test.describe('a file the app cannot use', () => {
  test('refuses a malformed file and leaves the store untouched', async ({ page }) => {
    await importBackup(page, '{ this is not json');

    await expect(toast(page, 'Invalid backup file')).toBeVisible();
    expect(await readKey(page, 'tags')).toBe(SEEDED_TAGS);
  });

  test('refuses an empty file', async ({ page }) => {
    await importBackup(page, '');

    await expect(toast(page, 'Invalid backup file')).toBeVisible();
    expect(await readKey(page, 'tags')).toBe(SEEDED_TAGS);
  });

  // The import only writes values that are already strings, because that is how the store holds
  // them. A file whose values were parsed into arrays and objects before it was saved therefore
  // restores nothing at all, and says so only in a count nobody reads: "0 entries". The export
  // never produces such a file, so this is about a hand-edited one, and it is the quietest way an
  // import can fail.
  test('skips a value that is not a string, and reports that it restored nothing', async ({ page }) => {
    await importBackup(page, JSON.stringify({ app: 'mi-dia', version: 1, data: { tags: ['dropped'] } }));

    await expect(toast(page, 'Import successful (0 entries)')).toBeVisible();
    expect(await readKey(page, 'tags')).toBe(SEEDED_TAGS);
  });
});

test.describe('a file the app accepts', () => {
  test('restores a key and reports how many entries it wrote', async ({ page }) => {
    await importBackup(page, JSON.stringify({
      app: 'mi-dia', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
      data: { tags: '["restored"]' },
    }));

    await expect(toast(page, 'Import successful (1 entries)')).toBeVisible();
    await expect.poll(() => readKey(page, 'tags')).toBe('["restored"]');
  });

  // The export stamps a version and the import never looks at it. That is worth pinning rather than
  // assuming: the field reads like a migration hook and is not one, so anybody planning a schema
  // change has to add the check first.
  test('accepts a dump that claims an older version, because the version is not read', async ({ page }) => {
    await importBackup(page, JSON.stringify({ app: 'mi-dia', version: 0, data: { tags: '["from-v0"]' } }));

    await expect.poll(() => readKey(page, 'tags')).toBe('["from-v0"]');
  });

  test('accepts a bare object with no data wrapper', async ({ page }) => {
    await importBackup(page, JSON.stringify({ tags: '["bare"]' }));

    await expect.poll(() => readKey(page, 'tags')).toBe('["bare"]');
  });

  // Import merges, it does not replace. A backup taken before a ritual existed will not delete that
  // ritual on restore, which is the forgiving behaviour and also means a restore cannot be used to
  // get back to a clean state.
  test('merges: a key the backup does not carry survives the import', async ({ page }) => {
    const ritualsBefore = await readKey(page, 'rituals');
    expect(JSON.parse(ritualsBefore).length).toBeGreaterThan(0);

    await importBackup(page, JSON.stringify({ data: { tags: '["merged"]' } }));

    await expect.poll(() => readKey(page, 'tags')).toBe('["merged"]');
    expect(await readKey(page, 'rituals')).toBe(ritualsBefore);
  });
});
