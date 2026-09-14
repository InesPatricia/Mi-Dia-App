// What a brand new user sees, which is the one experience that cannot be retried.
//
// TD-004 in specs/BUGS.md, found by the phase 5 mutation audit rather than by reading the suite.
// `seedDefaults` in the ritual module is what gives a new user their two starting rituals. Make it
// return before it writes anything and the entire functional suite still passes, because every
// ritual spec seeds its own data through addInitScript and the application's own seed path is
// therefore never taken. The integration level notices; nothing that drives a browser does.
//
// WHY IT IS A FILE OF ITS OWN
//   Not in ritual.spec.js, whose header says every test there seeds rituals, and which is right to.
//   A test that must NOT seed cannot live in a file whose whole convention is seeding: the next
//   person to add a beforeEach there would silently delete this coverage and no check would say so.
//   The empty store is the fixture, and the filename is what makes that visible.
//
// WHAT IS DELIBERATELY NOT SEEDED
//   Only `settings.onboarded`, which app.launch sets so the guided carousel does not cover the
//   screen. Everything else is absent, so the application decides what storage holds. That is the
//   whole point: this is the only path where the app, rather than a test, writes the first data.
const { test, expect } = require('../fixtures/app.fixture');
const { readRituals } = require('./helpers');

test.describe('first run', () => {
  test('a brand new user is given the two default rituals, on screen and in storage', async ({ app, page }) => {
    // no rituals key, no rit_seeded_v1: the application has to create both
    await app.launch();

    // on screen, which is the half the mutation audit found nothing watching.
    //
    // By name line rather than by card. The second default is habit-stacked on the first, so its
    // cue text reads "after Morning breathing" and anchoring a card on that string matches both.
    await expect(app.rituals.cards).toHaveCount(2);
    await expect(app.rituals.names).toHaveText([/^Morning breathing/, /^A thought of gratitude/]);

    // and persisted, so a reload does not produce a second pair
    await expect.poll(() => readRituals(page).then((rituals) => rituals.map((one) => one.id)))
      .toEqual(['r_seed_breath', 'r_seed_thanks']);
  });

  test('the seed runs once, so a reload does not add another pair', async ({ app, page }) => {
    await app.launch();
    await expect(app.rituals.cards).toHaveCount(2);

    await page.reload();

    // the guard key is what makes this true, and it is the thing a mutation would remove
    await expect(app.rituals.cards).toHaveCount(2);
    await expect.poll(() => readRituals(page).then((rituals) => rituals.length)).toBe(2);
  });
});
