// Seed test for the Playwright authoring agents (planner, generator, healer).
//
// A seed test is a single test whose only job is to leave the app in the state the suite assumes,
// and then stop. The agents run it and PAUSE inside it, so whatever this file sets up is the state
// they explore, plan against and generate code from.
//
// WHY IT IS WRITTEN BY HAND
//   If no file matching *seed* exists in the target project's testDir, the MCP server creates
//   `<testDir>/seed.spec.ts` itself, containing an empty test that navigates nowhere. Two problems
//   with letting that happen here. It would land in ./tests, the gated suite, and change the test
//   count the README badge is checked against. And an empty seed means the planner explores what a
//   brand-new visitor sees, which for Mi Dia is the onboarding overlay -- precisely the screen
//   gotoApp() exists to suppress, because the functional suite tests a RETURNING user.
//
// WHY IT IMPORTS THE REAL HELPERS
//   So it cannot drift. The moment this file grows its own idea of "logged in and ready", the
//   agents start planning against an app state that no real test ever runs in.
//
// USAGE
//   planner_setup_page / generator_setup_page with:
//     project:  "generated"
//     seedFile: "tests-generated/seed.spec.js"
const { test } = require('@playwright/test');
const { gotoApp, seedStorage } = require('../tests/helpers');

test.describe('Mi Dia', () => {
  // A seed asserts nothing on purpose: it leaves the app in a known state and stops, so the
  // authoring agents explore from there. The header of this file explains why it is hand-written.
  // The rule is right about every other file in this folder, so it stays on and this one site
  // carries the reason. The directive has to be the line immediately before the code.
  // eslint-disable-next-line playwright/expect-expect -- a seed has no assertions by design
  test('seed', async ({ page }) => {
    await seedStorage(page, { settings: { lang: 'ro', onboarded: true } });
    await gotoApp(page);
    // Nothing else. Scenarios start from here.
  });
});
