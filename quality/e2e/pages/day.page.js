// The Day screen, which is where the app opens.
//
// What is here is what was measured to be here and nowhere else: the flower, whose petals route to
// the other screens, and the day plan itself. Both disappear when another view is showing.
//
// The theme toggle started in this file, on the assumption that a control in the hero belongs to
// the screen under it. Measured across three views, it is visible on all of them, so it is chrome
// and it moved to AppPage. Worth the two minutes: a page object that claims a control belongs to
// one screen is a claim every later reader inherits.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
const { test } = require('@playwright/test');

class DayPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * The flower, whose petals are how the app routes to its other screens.
   *
   * Scoped, and measured rather than assumed: every petal is a direct child of `div.flower`. It
   * matters because the flower is inside the Day view, so a petal is only reachable from here. A
   * spec on another screen has to return Home first, which is why there is no app-level shortcut
   * that would hide that step.
   */
  get flower() {
    return this.page.locator('.flower');
  }

  /** One petal by its accessible name, in English, the default interface language. */
  petal(name) {
    return this.flower.getByRole('button', { name, exact: true });
  }

  async tapPetal(name) {
    await this.petal(name).click();
  }

  /**
   * The control at the centre of the flower, which opens the intention modal.
   *
   * Inside the flower, so it is Day only. Measured: not visible on Profile.
   */
  get intentionButton() {
    return this.flower.getByRole('button', { name: /intention/i });
  }

  /**
   * The brand heading, a real h1.
   *
   * Measured visible on the Day view and not on Profile, so it lives here rather than on AppPage
   * even though the hero around it carries controls that are chrome.
   */
  get brandHeading() {
    return this.page.getByRole('heading', { name: /Mi D/i });
  }

  /**
   * The field that creates a slot in the day plan.
   *
   * Reached by its placeholder, which is what a user reads. The English copy is the default
   * interface language, so it is the one the suite runs against.
   */
  get titleField() {
    return this.page.getByPlaceholder('What do you want to do today?');
  }

  /** The composer, which carries the class "active" while it is open. */
  get composer() {
    return this.page.locator('#composer');
  }

  /**
   * One duration chip in the composer, by its minutes.
   *
   * Scoped to the composer. The label is a bare number, which is the kind of name that matches
   * something else on a screen that later shows a count.
   */
  durationChip(minutes) {
    return this.composer.getByRole('button', { name: String(minutes), exact: true });
  }

  /** The control that commits the composer. */
  get commit() {
    return this.composer.getByRole('button', { name: 'Add activity', exact: true });
  }

  /**
   * The native time input in the composer.
   *
   * Scoped, because the slot editor reuses the same control elsewhere in the document.
   */
  get timeInput() {
    return this.composer.getByLabel('Time');
  }

  /** The live start-to-end preview the time input feeds. */
  get timePreview() {
    return this.page.locator('#timePreview');
  }

  /**
   * The area chip in the composer.
   *
   * By test id, and this is the one place in the suite that uses one. The chip's visible label is
   * the current selection, so it has no stable accessible name to target.
   */
  get areaChip() {
    return this.page.getByTestId('composer-area');
  }

  /** One area in the picker that chip opens. */
  areaOption(name) {
    return this.page.getByRole('button', { name, exact: true });
  }

  /**
   * The composer's Duration label, which is only on screen once the composer has expanded.
   *
   * Scoped, because Respiro's resonance tuning carries a label with the same word.
   */
  get durationLabel() {
    return this.composer.getByText('Duration', { exact: true });
  }

  /** A group header in the day list, for example "Timed" or "Anytime today". */
  groupHeader(name) {
    return this.page.getByText(name, { exact: true });
  }

  /** The control that moves the Day view back one day. */
  get previousDay() {
    return this.page.locator('#prev');
  }

  /** The list of slots in the day plan. */
  get list() {
    return this.page.locator('#list');
  }

  /** One slot, anchored by the title the user typed. */
  block(title) {
    return this.page.locator('.block', { hasText: title });
  }

  /**
   * The delete control on one slot.
   *
   * A deliberate two-tap confirm, so a test that means to delete presses it twice. That is left to
   * the spec rather than wrapped in a `deleteBlock` action: the two taps are the behaviour, and
   * hiding them in a helper would hide the one thing that makes this control different.
   */
  blockDelete(title) {
    return this.block(title).locator('.del');
  }

  /**
   * Add a slot through the composer.
   *
   * Two methods rather than one with options, and neither of them branches.
   *
   * The composer has two commit paths that are not interchangeable: a bare title commits on Enter,
   * and anything carrying a time or a duration has to go through the add control. The first version
   * of this was a single addSlot with `if (time || dur)` inside, moved out of the specs so that no
   * test body carried the branch.
   *
   * Wrapping it in test.step made eslint-plugin-playwright see the branch and refuse it, and the
   * rule was right: a step that reports "add the slot X" whichever path ran hides the one thing the
   * reader would want to know. Every call site passes either nothing or both fields, so the branch
   * was never carrying its weight. Two named methods say at the call site which composer path is
   * being exercised.
   *
   * @param {string} title
   */
  async addSlot(title) {
    await test.step(`add the untimed slot "${title}"`, async () => {
      await this.titleField.fill(title);
      await this.titleField.press('Enter');
    });
  }

  /**
   * Add a slot with a time and a duration, committed through the add control.
   *
   * @param {string} title
   * @param {{time: string, dur: number}} when
   */
  async addTimedSlot(title, { time, dur }) {
    await test.step(`add the slot "${title}" at ${time} for ${dur} minutes`, async () => {
      await this.titleField.fill(title);
      await this.durationChip(dur).click();
      await this.timeInput.fill(time);
      await this.commit.click();
    });
  }

  /**
   * The done tick on one slot.
   *
   * Since v128 it is a real role=button with an i18n aria-label and aria-pressed, which is why it
   * is reached by role here while the time pill below still is not.
   */
  tick(title) {
    return this.block(title).getByRole('button', { name: 'Mark as done' });
  }

  /**
   * The time pill on one slot, which opens the inline editor.
   *
   * No accessible name, so it is reached structurally inside the anchored slot. That is a gap in
   * the application rather than in the test, and it is written down as one in the spec that uses it.
   */
  timePill(title) {
    return this.block(title).locator('.time');
  }

  /** A move control inside a slot's inline editor, for example "Tomorrow". */
  moveButton(title, name) {
    return this.block(title).getByRole('button', { name, exact: true });
  }

  /** The control that opens the list filters. */
  get filters() {
    return this.page.getByRole('button', { name: 'Filters', exact: true });
  }

  /** The hide-completed checkbox, reached by its label. */
  get hideCompleted() {
    return this.page.getByLabel('hide completed');
  }

  /** Overlap clusters, as a set, so a spec can assert how many formed. */
  get clusters() {
    return this.page.locator('.cluster');
  }
}

module.exports = { DayPage };
