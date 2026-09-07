// The suite's entry point: `test` and `expect`, with the application already wired up.
//
// A spec requires this instead of '@playwright/test' and gets an `app` fixture holding the page
// objects. The `page` fixture is still there for anything that has no page object yet, so migrating
// one spec at a time does not need a flag day.
//
// Why a fixture rather than a helper the spec calls. Playwright builds it per test, tears it down
// per test, and reports a failure inside it as a fixture failure rather than as the first
// assertion of the test, which is the difference between "setup broke" and "the app is wrong".
//
// It deliberately does NOT launch the app. Nearly every test seeds different storage before the
// page loads, and seeding has to happen before the navigation, so an auto-launching fixture would
// have to take its data through `test.use`, which is per file or per describe. Tests would then be
// grouped by what they seed rather than by what they are about. `await app.launch({...})` is one
// line at the top of a test and keeps the seed next to the test that needs it.
// The two annotations below are what make the whole harness type-checkable. Playwright's `extend`
// carries the fixture's type through to every spec, and in JavaScript there is no syntax for the
// type argument that would tell it what `app` is. Without them the checker reports "Property 'app'
// does not exist" in every test in the suite, which is a hundred false alarms hiding whatever real
// one might be among them. With them, a typo anywhere under pages/ or components/ is an error at
// the call site. See jsconfig.json for why the check exists at all.
const base = require('@playwright/test');
const { AppPage } = require('../pages/app.page');

/** @typedef {InstanceType<typeof AppPage>} App */
/** @typedef {{ app: App }} AppFixtures */

const test = base.test.extend(
  /** @type {import('@playwright/test').Fixtures<AppFixtures, {}, import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions, import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions>} */ ({
    app: async ({ page }, use) => {
      await use(new AppPage(page));
    },
  }),
);

module.exports = { test, expect: base.expect };
