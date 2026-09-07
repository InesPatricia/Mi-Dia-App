// The focus timer overlay, opened from the Day header.
//
// A component rather than a page, because it is not a view: it is raised over whatever is showing
// and the app's `data-view` does not change while it is up. Its own visibility is carried by the
// class `show` on the overlay, which is what a spec asserts on.
//
// The plan for this phase named three components, rituals, the garden and onboarding. This is a
// fourth, found while migrating the spec that drives it. The list was a sketch rather than a census.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class FocusTimer {
  constructor(page) {
    this.page = page;
  }

  /** The control in the Day header that raises the overlay. */
  get openButton() {
    return this.page.locator('#focusBtn');
  }

  /** The overlay itself. Carries the class `show` while it is up. */
  get overlay() {
    return this.page.locator('#focusOverlay');
  }

  /** The remaining time, as the overlay renders it, for example "25:00". */
  get time() {
    return this.page.locator('#tTime');
  }

  /**
   * One duration preset, by position.
   *
   * By index because the presets carry their minutes as their own text and nothing else, so a name
   * lookup would be a lookup on the value the test is about to assert. The order is [15, 25, 45, 60].
   *
   * @param {number} index  zero-based
   */
  preset(index) {
    return this.page.locator('#tPresets button').nth(index);
  }

  get closeButton() {
    return this.page.locator('#focusClose');
  }

  async open() {
    await this.openButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

module.exports = { FocusTimer };
