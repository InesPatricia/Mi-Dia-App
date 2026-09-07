// The Calendar screen: the Month and Year panels, month navigation, the day grid, and the lens
// selector that decides what each cell overlays.
//
// The two segmented controls are scoped to their own containers, measured rather than assumed:
// "Month" and "Year" sit in #calMode, the lenses in #calLensWrap. Both exist in the document while
// another view is showing, hidden, so the unscoped lookups the specs used resolved to one element
// and worked. Scoping keeps that true when a second screen grows a control called "Month".
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class CalendarPage {
  constructor(page) {
    this.page = page;
  }

  /** The Month and Year segmented control. */
  get scopes() {
    return this.page.locator('#calMode');
  }

  /** One scope by its label: "Month" or "Year". */
  scope(name) {
    return this.scopes.getByRole('button', { name, exact: true });
  }

  get monthPanel() {
    return this.page.locator('#cal-month');
  }

  get yearPanel() {
    return this.page.locator('#cal-year');
  }

  /** The month title, which the prev and next controls move. */
  get title() {
    return this.page.locator('#calTitle');
  }

  get previousMonth() {
    return this.page.locator('#calPrev');
  }

  get today() {
    return this.page.locator('#calToday');
  }

  /** The day grid. */
  get grid() {
    return this.page.locator('#calGrid');
  }

  /**
   * The cells that stand for a real day.
   *
   * The grid pads the weeks it starts and ends with, and those pads carry `empty`. A spec counting
   * the days of the month means this set.
   */
  get dayCells() {
    return this.grid.locator('.cell.lens:not(.empty)');
  }

  /** Today's cell. */
  get todayCell() {
    return this.grid.locator('.cell.today');
  }

  /** The lens selector. Scoped, because the lens names are ordinary words. */
  get lenses() {
    return this.page.locator('#calLensWrap');
  }

  /**
   * One lens by its label.
   *
   * Returned as a locator rather than clicked, because the cycle specs assert on whether a lens
   * exists at all, which is the opt-in working. An action would have to be preceded by a check that
   * the thing is there, and that check belongs to the spec.
   *
   * @param {string} name  "Plan", "Mood" or "Rhythm"
   */
  lens(name) {
    return this.lenses.getByRole('button', { name, exact: true });
  }

  /** The access into the cycle setup, revealed by the Rhythm lens. */
  get cycleSetup() {
    return this.page.locator('#cycleSetupBtn');
  }
}

module.exports = { CalendarPage };
