// The Respiro screen: the direction toggle, the Breathing and Body sub-segment, the exercise grid,
// and the player an exercise opens.
//
// The player is here rather than in components/ because it is part of this screen: `data-view`
// stays on the Respiro view while it is up, and it is reached only from this grid.
//
// Both segmented controls are scoped to their own container, measured rather than assumed:
// "Body" sits in #calmMode, "Calm me" and "Wake me up" sit in #calmDir. The specs reached all three
// unscoped, which worked because the names are unique on this screen today.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class RespiroPage {
  constructor(page) {
    this.page = page;
  }

  /** The direction toggle: "Calm me" or "Wake me up". */
  get directions() {
    return this.page.locator('#calmDir');
  }

  direction(name) {
    return this.directions.getByRole('button', { name, exact: true });
  }

  /** The sub-segment shown in calm mode: "Breathing" or "Body". Hidden in energy mode. */
  get segments() {
    return this.page.locator('#calmMode');
  }

  segment(name) {
    return this.segments.getByRole('button', { name, exact: true });
  }

  /** The grid of exercises. */
  get grid() {
    return this.page.locator('#calmGrid');
  }

  /** Every exercise card, as a set, so a spec can assert how many there are. */
  get cards() {
    return this.grid.locator('.calmcard');
  }

  /** Every card title, in grid order. */
  get cardTitles() {
    return this.grid.locator('.cc-title');
  }

  /**
   * The cards that are exercises, excluding the featured finder card that leads the Breathing grid
   * since v172. A spec that wants "the first exercise" means this one.
   */
  get exerciseCards() {
    return this.grid.locator('.calmcard:not(.finder-card)');
  }

  /** One exercise card, anchored by the title a user reads on it. */
  card(title) {
    return this.grid.locator('.calmcard', { hasText: title });
  }

  /** The player. Carries the class `show` while it is up. */
  get player() {
    return this.page.locator('#calmPlayer');
  }

  /** The breathing stage of the player. */
  get breathStage() {
    return this.player.locator('#cpBreath');
  }

  /** The somatic panel of the player. */
  get somaticPanel() {
    return this.page.locator('#cpSomatic');
  }

  /** The body scan stage inside the somatic panel. */
  get scanStage() {
    return this.page.locator('#scanStage');
  }

  /** The scan's tone-versus-voice switch. */
  get scanMode() {
    return this.page.locator('#scanMode');
  }

  /** The options of that switch, as a set, so a spec can assert how many there are. */
  get scanModeOptions() {
    return this.scanMode.locator('button');
  }

  async closePlayer() {
    await this.page.locator('#cpClose').click();
  }
}

module.exports = { RespiroPage };
