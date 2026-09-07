// The Profile screen: the Profile/Settings segmented control, and the panels it swaps between.
//
// The segmented control and the bottom navigation bar both carry a button whose accessible name is
// "Profile". Measured in the running app rather than read off the build, because the labels are
// injected from the i18n table at runtime and are not in the markup: the segment sits in
// `div#profMode.segmented`, the tab sits in `div.bottombar`. Every locator here is scoped to the
// first of those, and AppPage scopes the second.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class ProfilePage {
  constructor(page) {
    this.page = page;
  }

  /** The segmented control that swaps the two panels. */
  get segments() {
    return this.page.locator('#profMode');
  }

  /**
   * One segment by its label, scoped so "Profile" cannot also match the bottom bar tab.
   * @param {string} name  "Profile" or "Settings"
   */
  segment(name) {
    return this.segments.getByRole('button', { name, exact: true });
  }

  async openSettings() {
    await this.segment('Settings').click();
  }

  async openOverview() {
    await this.segment('Profile').click();
  }

  get overviewPanel() {
    return this.page.locator('#prof-overview');
  }

  get settingsPanel() {
    return this.page.locator('#prof-settings');
  }

  /** The name field on the Settings panel. Reached by its placeholder, which is what a user sees. */
  get nameField() {
    return this.page.getByPlaceholder('e.g. Ines');
  }

  /** The greeting on the overview panel, which is what the name field feeds. */
  get greeting() {
    return this.page.locator('#pfHello');
  }

  /** The recent intentions list on the overview panel. */
  get recentIntentions() {
    return this.page.locator('#pfRecent');
  }

  /** The dark theme switch on the Settings panel. Carries the class `on` while it is on. */
  get darkThemeToggle() {
    return this.page.locator('#themeToggleSet');
  }

  /**
   * The cycle opt-in switch on the Settings panel.
   *
   * Kept as the ARIA role, which is the locator a user's assistive technology would use, but scoped
   * to the panel. Measured: exactly one element with role=switch is on the page while Settings is
   * open, so the unscoped form the specs used was not ambiguous. It was one added switch away from
   * being ambiguous, and the scope costs nothing.
   */
  get cycleSwitch() {
    return this.settingsPanel.getByRole('switch');
  }

  /**
   * The button that downloads a full backup.
   *
   * Matched on a case-insensitive word rather than the exact label, which is how the spec already
   * reached it. The label has carried different copy across builds and the button is the only one
   * on the panel that matches either way.
   */
  get exportButton() {
    return this.page.getByRole('button', { name: /export/i });
  }

  /**
   * The hidden file input the import button targets.
   *
   * Set directly with setInputFiles, which is how Playwright drives a picker the operating system
   * would otherwise own. There is no user-facing locator for it, by design: the visible control is
   * the import button, and clicking that opens a native dialog no test can reach.
   */
  get importInput() {
    return this.page.locator('#importFile');
  }
}

module.exports = { ProfilePage };

