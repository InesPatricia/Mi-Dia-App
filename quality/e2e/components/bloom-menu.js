// The bloom quick-add menu, raised by the plus control in the bottom bar.
//
// A component: it is a dialog over whatever view is showing, and `data-view` does not change while
// it is up. Its open state is carried by aria-expanded on the control that raises it, which is also
// what a screen reader is told, so that is what a spec asserts on.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class BloomMenu {
  constructor(page) {
    this.page = page;
  }

  /** The menu itself, as the accessibility tree exposes it. */
  get dialog() {
    return this.page.getByRole('dialog', { name: /add/i });
  }

  /**
   * The scrim behind the menu, which closes it.
   *
   * By id, because a scrim is a structural overlay with no accessible name and nothing a user would
   * call it. It is the one locator here that a screen reader would never reach, which is the point:
   * tapping outside is a pointer gesture, and the keyboard route to closing it belongs to phase 7.
   */
  get scrim() {
    return this.page.locator('#bloomScrim');
  }
}

module.exports = { BloomMenu };
