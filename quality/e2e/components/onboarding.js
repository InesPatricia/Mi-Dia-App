// The guided onboarding carousel (v150+), which runs for a user who has never been through it.
//
// A component: it is an overlay raised over whatever view is showing, and it is built lazily, so
// for a returning user the element does not exist at all rather than existing hidden. That is the
// difference between asserting toHaveCount(0) and asserting it is not visible, and it is why the
// overlay is exposed as a plain locator rather than behind an is-open action.
//
// Every control here is reached by id. None of them carries an accessible name, which is worth
// saying out loud rather than working around quietly: it is a gap in the application, and the
// keyboard and focus work in phase 7 is where it gets looked at.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class Onboarding {
  constructor(page) {
    this.page = page;
  }

  get overlay() {
    return this.page.locator('#onbOverlay');
  }

  /** The brand mark on the first step. */
  get brand() {
    return this.page.locator('.onb-brand');
  }

  get skip() {
    return this.page.locator('#onbSkip');
  }

  get next() {
    return this.page.locator('#onbNext');
  }

  get back() {
    return this.page.locator('#onbBack');
  }

  /** The identity chips on the identity step. */
  get identityChips() {
    return this.page.locator('#onbIdChips');
  }

  get identityOptions() {
    return this.identityChips.locator('button');
  }

  /** The field on the plan step. */
  get planInput() {
    return this.page.locator('#onbPlanInput');
  }

  /** The call to action on the ritual step, which closes onboarding and opens the ritual sheet. */
  get ritualCta() {
    return this.page.locator('#onbRitualCta');
  }

  /** The control in Settings that runs the carousel again. */
  get replay() {
    return this.page.locator('#onbReplayBtn');
  }
}

module.exports = { Onboarding };
