// The Journal screen: the mood band, and the permission pause and emotion wheel a low mood opens.
//
// The wheel is modelled here rather than as a component because it is rendered inside the Journal
// view rather than raised over it. If a later spec shows it appearing elsewhere, that is the signal
// to move it, and the way to tell is to measure it on two views rather than to reason about it.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class JournalPage {
  constructor(page) {
    this.page = page;
  }

  /** The mood band. Scoped, because the weather names it uses are ordinary words. */
  get mood() {
    return this.page.locator('#mood');
  }

  /** One mood by its label, for example "Rainy". */
  moodOption(name) {
    return this.mood.getByRole('button', { name, exact: true });
  }

  /** The core emotions offered by the permission pause. */
  coreEmotion(name) {
    return this.page.locator('#ppCores').getByRole('button', { name, exact: true });
  }

  /** The sub-emotions offered once a core one is chosen. */
  subEmotion(name) {
    return this.page.locator('#ppSubs').getByRole('button', { name, exact: true });
  }

  /** The routing suggestion the wheel produces. */
  get route() {
    return this.page.locator('#ppRoute');
  }

  /** The control inside the suggestion that follows it. */
  get routeFollow() {
    return this.route.locator('.pp-rgo');
  }

  /** The word the screen shows for the chosen mood. */
  get moodWord() {
    return this.page.locator('#moodWord');
  }

  /** The permission pause, which a low mood reveals and a high one leaves hidden. */
  get permissionPause() {
    return this.page.locator('#permPause');
  }

  /** The one-breath link the pause offers. Matched in both languages the spec may run in. */
  get breathLink() {
    return this.page.getByRole('button', { name: /breath|respira/i });
  }

  /** Every core emotion, as a set, for a spec that takes the first rather than a named one. */
  get coreEmotions() {
    return this.page.locator('#ppCores button');
  }

  /** The sub-emotion container, which appears once a core one is chosen. */
  get subEmotionList() {
    return this.page.locator('#ppSubs');
  }

  get subEmotions() {
    return this.subEmotionList.locator('button');
  }

  /** The chip showing the emotion that was chosen. */
  get chosenEmotion() {
    return this.page.locator('#ppChosen');
  }

  /** The free text area, reached by the start of its placeholder. */
  get textField() {
    return this.page.getByPlaceholder('Write freely');
  }

  /**
   * One export control.
   *
   * Matched on a substring rather than exactly, because each label carries an icon character before
   * its word and an exact match would have to reproduce that character in the test.
   */
  exportButton(name) {
    return this.page.getByRole('button', { name });
  }
}

module.exports = { JournalPage };
