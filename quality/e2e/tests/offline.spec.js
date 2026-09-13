// Offline, which is the property the product is defined by and the only one with no coverage.
//
// The app is a single file with no backend and no accounts, so "it works with no network" is not a
// nice-to-have on top of the features: it is the reason the features are allowed to live in
// localStorage at all. Until this file existed, nothing in the suite loaded the app twice, and
// nothing looked at the service worker. A worker that silently stopped registering would have
// passed every one of the eighty-seven functional tests.
//
// WHAT IS ASSERTED, AND WHAT EACH ONE WOULD CATCH
//   1. The worker registers and reaches the page, and the shell is in the cache it names. Catches a
//      registration that throws, a worker that never activates, and an install that caches nothing.
//   2. The app starts with the network cut, and the data that was there is still there. Catches the
//      fetch handler losing its cache fallback, which is the failure a user meets on a plane.
//   3. A worker whose cache name differs from an existing cache deletes that cache when it
//      activates. Catches the eviction in the activate handler going away, which is how a phone
//      keeps serving a build that was replaced weeks ago.
//
// WHY THE CACHE NAME IS READ RATHER THAN WRITTEN DOWN
//   sw.js names its cache after the promoted version, and serve-build.js rewrites that name when
//   the suite is pointed at a candidate with MI_BUILD. A literal here would therefore be wrong on
//   every candidate run, and wrong on the promoted build the day it is promoted. The spec fetches
//   the worker that is actually being served and parses it with the pattern serve-build.js and the
//   release validator already share, so there is one spelling of that rule rather than three.
//
// WHY THE THIRD TEST PLANTS A CACHE INSTEAD OF DEPLOYING A SECOND BUILD
//   The honest way to test a deploy is to change the served sw.js mid-run. That directory is shared
//   by every parallel worker, so one test editing it would decide what the others saw. A cache
//   left under an older name is what a previous build leaves behind, and deleting it is the
//   behaviour under test, so the stand-in exercises the same branch without writing to disk.
//
// OFFLINE REACHES THE WORKER, NOT ONLY THE PAGE. context.setOffline propagates to the service
// worker's own session in the installed Playwright (doUpdateOffline in playwright-core walks
// this.serviceWorkers() alongside this.pages()). Read there rather than assumed, because a fetch
// that still succeeded inside the worker would make the offline test green for the wrong reason.
const { test, expect } = require('../fixtures/app.fixture');
const { dayKey } = require('./helpers');
const { CACHE_PATTERN } = require('../serve-build');

// An older build's cache. Only ever created by the test, and never a name any build declares.
const PREVIOUS_BUILD_CACHE = 'mi-dia-v0';

/**
 * The cache name declared by the worker the server is actually serving.
 *
 * Branchless on purpose: a pattern that stops matching yields "mi-dia-undefined", which fails the
 * comparison with a message naming the value, rather than throwing from inside a helper.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function servedCacheName(request) {
  const response = await request.get('/sw.js');
  const [, version] = CACHE_PATTERN.exec(await response.text()) ?? [];
  return `mi-dia-${version}`;
}

/**
 * The script URL of the worker currently controlling the page, or an empty string if none is.
 *
 * A string rather than a boolean so a failing poll says what it saw.
 * @param {import('@playwright/test').Page} page
 */
function controllingScript(page) {
  return page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '');
}

/**
 * Every cache name the origin holds.
 * @param {import('@playwright/test').Page} page
 */
function cacheNames(page) {
  return page.evaluate(() => caches.keys());
}

/**
 * The request URLs held in one cache.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function cachedUrls(page, name) {
  return page.evaluate(
    (cacheName) => caches.open(cacheName)
      .then((cache) => cache.keys())
      .then((requests) => requests.map((request) => request.url)),
    name,
  );
}

test.describe('offline', () => {
  test('the service worker registers, controls the page, and caches the shell it names', async ({ app, page, request, baseURL }) => {
    await app.launch();

    // registered is not the same as in control: a worker that installs and never activates leaves
    // the page on the network, which is the state this asserts is not reached
    await expect.poll(() => controllingScript(page)).toContain('/sw.js');

    // the cache is named after the build being served, which is what lets the next build collect it
    const current = await servedCacheName(request);
    await expect.poll(() => cacheNames(page)).toContain(current);

    // and the shell is in it, since that is the entry an offline start reads
    await expect.poll(() => cachedUrls(page, current)).toContain(`${baseURL}/`);
  });

  test('the app starts with the network cut, and the seeded day is still there', async ({ app, page, context }) => {
    const today = dayKey();
    await app.launch({
      ['day:' + today]: [
        { id: 'off1', title: 'Offline slot', cat: 'coaching', time: '', dur: 30, tags: [], done: false, date: today },
      ],
    });
    await expect(app.day.block('Offline slot')).toBeVisible();

    // the worker has to be in control before the network is cut, or the reload never reaches it
    await expect.poll(() => controllingScript(page)).toContain('/sw.js');

    await context.setOffline(true);
    await page.reload();

    // the app boots from the cached shell
    await expect(app.view).toHaveAttribute('data-view', 'day');
    await expect(app.day.brandHeading).toBeVisible();
    // and the data, which never left the device, is on screen
    await expect(app.day.block('Offline slot')).toBeVisible();
  });

  test('activating a worker deletes a cache left under a previous build name', async ({ app, page }) => {
    await app.launch();
    await expect.poll(() => controllingScript(page)).toContain('/sw.js');

    // what a previous build leaves behind: its own cache, holding its own shell
    await page.evaluate(
      (cacheName) => caches.open(cacheName)
        .then((cache) => cache.put('/', new Response('<!doctype html><title>previous build</title>', {
          headers: { 'content-type': 'text/html' },
        }))),
      PREVIOUS_BUILD_CACHE,
    );
    await expect.poll(() => cacheNames(page)).toContain(PREVIOUS_BUILD_CACHE);

    // a deploy is a new worker activating. Unregistering and reloading makes the application's own
    // registration line install one, so the test drives the app rather than replacing it.
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration?.unregister()));
    await page.reload();
    await expect.poll(() => controllingScript(page)).toContain('/sw.js');

    // the activate handler deletes every cache that is not the one this build names
    await expect.poll(() => cacheNames(page)).not.toContain(PREVIOUS_BUILD_CACHE);
  });
});
