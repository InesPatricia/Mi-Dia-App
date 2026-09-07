// The Progress screen: the range switch, the stat tiles, the streak chip, the area bars and the
// panel relating mood to productivity.
//
// The range switch is scoped to #rangeBtns, measured. Its buttons exist in the document while
// another view is showing, hidden, which is why the unscoped lookups the spec used resolved to one
// element and worked.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class ProgressPage {
  constructor(page) {
    this.page = page;
  }

  get ranges() {
    return this.page.locator('#rangeBtns');
  }

  /** One range by its label, for example "All" or "This week". */
  range(name) {
    return this.ranges.getByRole('button', { name, exact: true });
  }

  get statCards() {
    return this.page.locator('#statCards');
  }

  /**
   * The big number on one stat tile, anchored by the words printed under it.
   *
   * @param {string} label  the tile's own caption, for example "slots done"
   */
  statValue(label) {
    return this.statCards.locator('.scard', { hasText: label }).locator('.big');
  }

  get streakChip() {
    return this.page.locator('#streakChip');
  }

  /** The hours-per-area bars, as a set, so a spec can assert that there is at least one. */
  get areaBars() {
    return this.page.locator('#statBars').locator('*');
  }

  get moodInsight() {
    return this.page.locator('#moodInsight');
  }

  /** The per-mood bars, as a set. */
  get moodBars() {
    return this.page.locator('#moodBars').locator('.msg');
  }
}

module.exports = { ProgressPage };
