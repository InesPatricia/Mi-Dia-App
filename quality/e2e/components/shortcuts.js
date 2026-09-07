// The shortcuts block on the Day screen: the curated pills, the per-pill instant add, the inline
// editor that creates one, and the edit mode that deletes one.
//
// A component rather than part of the Day page object, because it is a self-contained block with
// its own state (normal versus edit mode) and its own editor, and it is large enough that folding
// it into the day plan would make that object about two things.
//
// Locator notes carried over from the spec it replaces: pills are anchored by their visible label,
// the per-pill add carries an i18n aria-label, and the edit toggle is an icon-only control with no
// accessible name, so it is reached by its stable id.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class Shortcuts {
  constructor(page) {
    this.page = page;
  }

  /** The grid of shortcut pills. */
  get chips() {
    return this.page.locator('#chips');
  }

  /** One shortcut by its label, as the accessibility tree exposes it. */
  shortcut(name) {
    return this.chips.getByRole('button', { name, exact: true });
  }

  /** One pill as a container, for the controls that live inside it. */
  pill(label) {
    return this.page.locator('.scpill', { hasText: label });
  }

  /** The per-pill control that adds an untimed slot without opening the composer. */
  addInstantly(label) {
    return this.pill(label).getByRole('button', { name: 'Add instantly (no time)', exact: true });
  }

  /** The control that opens the inline editor for a new shortcut. */
  get addShortcut() {
    return this.chips.getByRole('button', { name: /Add a shortcut/ });
  }

  get form() {
    return this.page.locator('#scForm');
  }

  /**
   * The name field of that editor.
   *
   * Matched on the start of its placeholder rather than the whole of it, which ends in an ellipsis
   * character. A substring is what getByPlaceholder does by default, it is what the journal spec
   * already relies on, and it keeps the source ASCII.
   */
  get nameField() {
    return this.page.getByPlaceholder('Shortcut name');
  }

  get submit() {
    return this.form.getByRole('button', { name: 'Add', exact: true });
  }

  /** The edit toggle. Icon only, with no accessible name, so it is reached by id. */
  get editToggle() {
    return this.page.locator('#scEditBtn');
  }

  /** The delete control that edit mode puts on each pill. A deliberate two-tap confirm. */
  pillDelete(label) {
    return this.pill(label).locator('.scp-x');
  }
}

module.exports = { Shortcuts };
