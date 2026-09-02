// The UI copy the generated ritual tests assert on, in one place.
//
// WHY THIS FILE EXISTS
//   The seed spec sets `settings.lang = 'ro'`, so every user-visible string the app renders comes
//   from its i18n table in Romanian. A test that hard-codes those strings is fine until the copy
//   changes, at which point the failure is spread across every spec that quoted it and the diff
//   that caused it is invisible. One module means one reviewable line changes instead of twenty.
//
//   It is hand-authored rather than generated because `generator_write_test` writes a file per
//   scenario, so anything shared has to exist before the generator runs.
//
// WHAT BELONGS HERE
//   Only copy that a test genuinely asserts on, i.e. where the text IS the thing under test.
//   Locators do not belong here: those are role-based and live in the specs. See the locator and
//   assertion policy in specs/ritual.plan.md.
//
// KEEPING IT HONEST
//   Every value below was read off the running app in a Romanian session, not transcribed from the
//   i18n source. If one drifts, the test that uses it fails loudly, which is the intended behaviour.
module.exports = {
  // .r-tick, role=button. Identical on every card, which is why a card must be anchored first.
  tickLabel: 'Bifează ritualul',

  // .r-vote, rendered only when the ritual is done AND its identity is non-empty.
  vote: (who) => `+1 vot: ${who}`,

  // .r-sum in the section header: "<done> / <due> azi".
  summary: (done, due) => `${done} / ${due} azi`,

  // .r-badge on a ritual created today that has never been checked.
  badgeNew: 'NOU',

  // .r-start, the placeholder that replaces the streak on a fresh ritual.
  startToday: 'azi începe',

  // .r-fl, the streak unit. Singular at 1, plural from 2 upward.
  unitDay: 'zi',
  unitDays: 'zile',

  // .rst-lbl inside a .rst-nb, in the Progress view's per-ritual stats card.
  currentLabel: 'serie curentă',
  recordLabel: 'record',
};
