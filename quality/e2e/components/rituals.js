// The rituals block on the Home screen, its creation sheet, and its history panel on Progress.
//
// A component rather than part of the Day page object: it is a self-contained module with its own
// mount point, its own sheet, and its own surface on another screen. The largest one in the suite,
// which is why the spec that drives it was the longest file in tests/.
//
// Locator notes carried from that spec: cards are anchored by the user-typed name, which is the
// stable user-facing handle. Several controls inside a card have no accessible name and are reached
// by class within the anchored card. The tick does have one since v128, and it also carries
// aria-pressed, which is what the spec asserts on.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class Rituals {
  constructor(page) {
    this.page = page;
  }

  /** The mount point the module renders into. */
  get mount() {
    return this.page.locator('#ritualMount');
  }

  /** The section header, which the language switch relabels. */
  get sectionTitle() {
    return this.mount.locator('.r-t');
  }

  /** The "N / M today" summary. */
  get summary() {
    return this.mount.locator('.r-sum');
  }

  /** One ritual card, anchored by its user-typed name. */
  card(name) {
    return this.mount.locator('.r-card', { hasText: name });
  }

  /** Every card, in render order, for a spec that asserts on which one is first. */
  get cards() {
    return this.mount.locator('.r-card');
  }

  /** The check on one card. */
  tick(name) {
    return this.card(name).locator('.r-tick');
  }

  /** The streak number on one card. */
  streak(name) {
    return this.card(name).locator('.r-n');
  }

  /** The warm two-minute chip a missed prior day surfaces. */
  twoMinuteChip(name) {
    return this.card(name).locator('.r-mini2');
  }

  /** The control that opens the creation sheet. */
  get addButton() {
    return this.mount.locator('.r-add');
  }

  /** The creation sheet. Carries the class "show" while it is up. */
  get sheet() {
    return this.page.locator('#ritSheet');
  }

  /** One suggestion chip in the sheet, by the key it carries. */
  sheetSuggestion(key) {
    return this.page.locator(`.rs-chip[data-key="${key}"]`);
  }

  get sheetName() {
    return this.page.locator('#rsName');
  }

  /** One cue option in the sheet, by the cue type it sets. */
  sheetCue(type) {
    return this.page.locator(`#rsSeg button[data-cue="${type}"]`);
  }

  get sheetSave() {
    return this.page.locator('#rsSave');
  }

  /** The edit toggle, which turns each card into a two-tap delete. */
  get editToggle() {
    return this.mount.locator('.r-editbtn');
  }

  /** The delete control edit mode puts on a card. A deliberate two-tap confirm. */
  cardDelete(name) {
    return this.card(name).locator('.r-del');
  }

  /** The same control once the first tap has armed it. */
  cardDeleteArmed(name) {
    return this.card(name).locator('.r-del.arm');
  }

  /** The body of a card, which in edit mode opens the sheet prefilled. */
  cardBody(name) {
    return this.card(name).locator('.r-body');
  }

  /** The history panel on the Progress screen. */
  get historyPanel() {
    return this.page.locator('#ritStatsMount .rst-panel');
  }

  /** One day cell in that panel, by its storage day key. */
  historyCell(dayKey) {
    return this.page.locator(`#ritStatsMount .rst-c[data-day="${dayKey}"]`);
  }
}

module.exports = { Rituals };
