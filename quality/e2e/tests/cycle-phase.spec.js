// The cycle phase as a user reads it, on the day the boundary decides.
//
// TD-005 in specs/BUGS.md, found by the phase 5 mutation audit. `phaseForDay` opens with
// `if (d <= avgBleed(cfg))`. Change that to `<` and the last bleeding day reports as follicular
// instead of menstrual: the unit level goes red on one test, and the integration level and the
// whole functional suite stay green. The phase is on screen, in the Calendar strip, and no test
// that drives a browser ever looked at it.
//
// WHY IT IS NOT FOLDED INTO cycle.spec.js
//   That spec covers the opt-in and stops there, which was a defensible place to stop: the feature
//   is off by default and the switch is the risky part. It never logs a period, so no day in it has
//   a phase at all. Putting the arithmetic there would mean seeding a period in a file whose whole
//   subject is the feature being off.
//
// THE SEED IS CHOSEN SO THE BOUNDARY IS THE ANSWER
//   A period that started four days ago makes today day five of the cycle, and a bleed of five days
//   makes five the last menstrual day. So today lands exactly ON the comparison. A seed one day
//   either side would still be green under the mutant, which is the difference between a test that
//   covers the line and a test that covers the decision.
//
// WHY THE CLOCK IS PINNED, WHICH IS A DEPARTURE
//   "Clock control for streak arithmetic" is in the arc's "Left out on purpose" list, so reaching
//   for a clock here needs a reason rather than a habit. The reason is that without it these tests
//   are a function of what time of day they run: the application computes the day of the cycle with
//   `Math.round((now - startOfDay) / 86400000)`, and `now` carries the hour, so the number it shows
//   rounds UP from midday onwards. Written in the morning, these tests passed. Run again at 12:20
//   the same day, both failed by exactly one day.
//
//   That is BUG-010, and it is the application's, not this spec's. Pinning the hour is what lets
//   these two tests ask about the phase boundary rather than about the wall clock. The defect
//   itself gets its own test below rather than a comment, so it cannot be forgotten.
//
//   The departure is narrow on purpose: the DATE is still today's, so nothing here freezes the
//   calendar or stops the seeds being relative. Only the hour is held still.
const { test, expect } = require('../fixtures/app.fixture');
const { dayKey } = require('./helpers');

// Four days ago, so today is day 5 of the cycle: `daysBetween(start, today) + 1`.
const PERIOD_STARTED = dayKey(-4);
const BLEED_DAYS = 5;

const CYCLE_SEED = {
  cycle: {
    enabled: true,
    periods: [{ start: PERIOD_STARTED, bleed: BLEED_DAYS }],
    length: 28,
    period: BLEED_DAYS,
  },
};

/**
 * Today, at a given hour, in local time.
 *
 * A Date rather than a string, because a bare "YYYY-MM-DD" is parsed as UTC and would shift the
 * pinned hour by the offset of whatever machine is running.
 *
 * @param {number} hour
 */
function todayAt(hour) {
  const when = new Date();
  when.setHours(hour, 0, 0, 0);
  return when;
}

test.describe('cycle phase on screen', () => {
  test('the last bleeding day reads as the menstrual phase, not the follicular one', async ({ app, page }) => {
    await page.clock.setFixedTime(todayAt(9));
    await app.launch(CYCLE_SEED);
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // day five of five: the boundary itself, which is the day the comparison decides
    await expect(app.calendar.cycleStrip).toContainText(`Day ${BLEED_DAYS}`);
    await expect(app.calendar.cycleStrip).toContainText('menstrual phase');
  });

  test('the day after the bleed reads as the follicular phase', async ({ app, page }) => {
    await page.clock.setFixedTime(todayAt(9));
    await app.launch({
      cycle: { ...CYCLE_SEED.cycle, periods: [{ start: dayKey(-5), bleed: BLEED_DAYS }] },
    });
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // the other side of the same boundary, so the pair pins where it sits rather than that it exists
    await expect(app.calendar.cycleStrip).toContainText(`Day ${BLEED_DAYS + 1}`);
    await expect(app.calendar.cycleStrip).toContainText('follicular phase');
  });

  // KNOWN FAILURE: the day of the cycle advances at midday rather than at midnight, BUG-010 in specs/BUGS.md
  test.fail('the day of the cycle does not depend on the time of day', async ({ app, page }) => {
    await page.clock.setFixedTime(todayAt(15));
    await app.launch(CYCLE_SEED);
    await app.day.tapPetal('Calendar');
    await expect(app.view).toHaveAttribute('data-view', 'cal');

    // The same seed that reads as day five at 09:00. A day number that changes because the
    // afternoon arrived is a defect a user meets every single day, in the middle of the day.
    await expect(app.calendar.cycleStrip).toContainText(`Day ${BLEED_DAYS}`);
  });
});
