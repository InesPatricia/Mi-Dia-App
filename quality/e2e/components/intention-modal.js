// The daily intention modal, opened from the centre of the flower.
//
// A component rather than a page, for the same reason as the bloom menu: it is a dialog over the
// Day view and does not change `data-view`.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class IntentionModal {
  constructor(page) {
    this.page = page;
  }

  get dialog() {
    return this.page.getByRole('dialog', { name: /intention/i });
  }

  /** The field the intention is typed into, reached through the dialog's own role. */
  get field() {
    return this.dialog.getByRole('textbox');
  }
}

module.exports = { IntentionModal };
