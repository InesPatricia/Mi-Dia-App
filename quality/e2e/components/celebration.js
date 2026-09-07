// The day-finished celebration overlay.
//
// A component: it is raised over the Day view and `data-view` does not change while it is up.
//
// It matters beyond the feature it decorates. BUG-001 is a class-name collision on the name this
// overlay owns, and the fix scopes that rule to this one element. Modelling the overlay here is
// what lets the spec assert both halves of it, that it stays hidden while the day is unfinished and
// that it appears and clears when the day is finished.
//
// By id, because a full-screen overlay with no content of its own has nothing a user would call it.
//
// No assertions, by the rule in ../pages/app.page.js and by the lint that enforces it.
class Celebration {
  constructor(page) {
    this.page = page;
  }

  get overlay() {
    return this.page.locator('#celebrate');
  }
}

module.exports = { Celebration };
