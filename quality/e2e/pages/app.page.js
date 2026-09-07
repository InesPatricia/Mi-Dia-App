// The application itself: launching it, and the chrome that is on every screen.
//
// WHY A PAGE OBJECT LAYER AT ALL
//   Phase 0 measured five different ways to reach one screen, spread across five specs, two of them
//   helpers local to a single file. That is not a style problem. It means a change to how a screen
//   is reached has five places to land and no way to tell whether it landed in all of them, and it
//   means a reader cannot answer "how does a test get to Settings" without reading five files.
//
// THE ONE RULE THIS LAYER LIVES BY
//   A page object never asserts. It returns locators and it performs actions; the spec holds every
//   assertion. Two reasons, and the second is the one that bites: a failure then names the behaviour
//   that broke instead of naming a helper, and the assertion keeps Playwright's auto-waiting, which
//   is what makes a fixed wait unnecessary anywhere in this suite.
//
//   It is enforced rather than promised. eslint.config.mjs refuses a call to `expect` anywhere under
//   pages/ or components/.
//
// WHAT IS NOT HERE
//   No waiting after a navigation. `open()` clicks and returns. The spec's next web-first assertion
//   retries until the view has actually changed, so a wait here would add a second synchronisation
//   point that can fail with a worse message than the assertion it precedes.
// STEPS
//   The composite actions below are wrapped in test.step, so a trace and the HTML report say
//   "open the settings screen" instead of listing two clicks the reader has to reassemble.
//
//   Only the composite ones. A single-click action like goHome already appears in the trace as a
//   click with its own locator, and wrapping that adds a layer of nesting without adding a fact.
//   A step that says no more than the line inside it is noise, and noise is how a report stops
//   being read.
const { test } = require('@playwright/test');
const { seedStorage, gotoApp } = require('../tests/helpers');
const { ProfilePage } = require('./profile.page');
const { DayPage } = require('./day.page');
const { CalendarPage } = require('./calendar.page');
const { FocusTimer } = require('../components/focus-timer');
const { BloomMenu } = require('../components/bloom-menu');
const { IntentionModal } = require('../components/intention-modal');
const { JournalPage } = require('./journal.page');
const { RespiroPage } = require('./respiro.page');
const { ProgressPage } = require('./progress.page');
const { Shortcuts } = require('../components/shortcuts');
const { Celebration } = require('../components/celebration');
const { Onboarding } = require('../components/onboarding');
const { Rituals } = require('../components/rituals');
const { ProjectsPage } = require('./projects.page');

class AppPage {
  constructor(page) {
    this.page = page;
    this.profile = new ProfilePage(page);
    this.day = new DayPage(page);
    this.calendar = new CalendarPage(page);
    this.focusTimer = new FocusTimer(page);
    this.bloomMenu = new BloomMenu(page);
    this.intentionModal = new IntentionModal(page);
    this.journal = new JournalPage(page);
    this.respiro = new RespiroPage(page);
    this.progress = new ProgressPage(page);
    this.shortcuts = new Shortcuts(page);
    this.celebration = new Celebration(page);
    this.onboarding = new Onboarding(page);
    this.rituals = new Rituals(page);
    this.projects = new ProjectsPage(page);
  }

  /**
   * Seed storage and open the app.
   *
   * Replaces the seedStorage-then-gotoApp pair at the top of nearly every test. The seed stays an
   * argument rather than becoming a Playwright option fixture: the data differs per test, and
   * `test.use` is per file or per describe, so making it a fixture would push every test that seeds
   * differently into a describe block of its own.
   *
   * @param {Record<string, unknown>} seed   storage keys to write before the page loads
   * @param {{onboarded?: boolean}} options  pass onboarded:false to meet the guided overlay
   */
  async launch(seed = {}, options = {}) {
    await test.step(`launch the app with ${Object.keys(seed).length} seeded key(s)`, async () => {
      await seedStorage(this.page, seed);
      await gotoApp(this.page, options);
    });
  }

  /**
   * The element carrying `data-view`, which is how the app says which screen is showing.
   *
   * Returned as a locator rather than read, so the spec writes
   * `await expect(app.view).toHaveAttribute('data-view', 'profil')` and gets the retry with it.
   */
  get view() {
    return this.page.locator('body');
  }

  /**
   * The document element, which carries `data-theme`.
   *
   * The theme has no semantic locator, so it is asserted on the attribute. It lives here rather
   * than on a screen because an early script in the head applies it before paint, on every view.
   */
  get root() {
    return this.page.locator('html');
  }

  /**
   * The bottom navigation bar.
   *
   * Scoped on purpose, and this is the scoping that phase 0 measured as necessary. On the Profile
   * screen the accessible name "Profile" belongs to two controls: this tab, and the segmented
   * control inside #profMode. An unscoped getByRole for it resolves to two elements and throws a
   * strict mode violation. No test presses Profile while already on Profile today, which is the
   * only reason the suite is green, and a page object that did not scope this would introduce the
   * failure the moment any test navigated from Profile to Profile.
   */
  get bottomBar() {
    return this.page.locator('.bottombar');
  }

  /**
   * The moon and sun glyph in the hero, which toggles the theme.
   *
   * Chrome rather than a screen control, measured on the Day, Profile and Calendar views, where it
   * is visible on all three. It sat on DayPage first, on the assumption that a control in the hero
   * belongs to the screen under it, and the measurement said otherwise.
   *
   * Reached by its accessible name, in English, the default interface language. The name is stable
   * across both states while the text swaps between the two glyphs, so the name is the handle and
   * the text is what a test asserts on.
   */
  get themeToggle() {
    return this.page.getByRole('button', { name: 'Toggle dark theme' });
  }

  /**
   * One button of the language switcher, which is also in the hero and also on every view.
   *
   * Scoped to #langBar. The codes are two letters, which is exactly the kind of name that starts
   * matching something else the day a screen grows a control called "EN".
   *
   * @param {string} code  "RO", "ES" or "EN"
   */
  languageButton(code) {
    return this.page.locator('#langBar').getByRole('button', { name: code, exact: true });
  }

  /** Tap a tab in the bottom bar by its accessible name. */
  async tapTab(name) {
    await this.bottomBar.getByRole('button', { name, exact: true }).click();
  }

  /**
   * The hero back arrow, which returns to the Day view from a secondary one.
   *
   * A distinct accessible name from the bottom bar Home, on purpose, so the two are separable
   * by a test and by a screen reader.
   */
  get backToHome() {
    return this.page.getByRole('button', { name: 'Back to home', exact: true });
  }

  /** One control of the bottom bar, as a locator, for a spec that asserts on it rather than taps. */
  tab(name) {
    return this.bottomBar.getByRole('button', { name, exact: true });
  }

  /**
   * The quick-add control.
   *
   * In the bottom bar and visible on every view, measured on Day and Profile, which is why it is
   * chrome rather than part of the day plan it adds to.
   */
  get quickAdd() {
    return this.tab('Quick add');
  }

  async goHome() {
    await this.tapTab('Home');
  }

  async openProfile() {
    await this.tapTab('Profile');
  }

  /**
   * The one path to the settings screen.
   *
   * Phase 0 counted five ways to do this across five specs, differing in whether the Settings
   * lookup was scoped to #profMode and whether the name match was exact. All five worked, which is
   * why nothing ever forced them together, and it also meant a change to the segmented control had
   * five places to land with no way to tell whether it reached all of them.
   */
  async openSettings() {
    await test.step('open the settings screen', async () => {
      await this.openProfile();
      await this.profile.openSettings();
    });
  }
}

module.exports = { AppPage };
