// Unit tests for the calc block of src/modules/cycle.js.
//
// The module's own header calls this layer pure and testable. It has never been tested. Everything
// the interface shows about a cycle, the phase, the day number, the moon, the estimate for the next
// period, is computed here from a list of dates, and the end-to-end suite can only see the sentence
// that comes out at the end.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCalc, plainCopy } from './load-module.mjs';

// Same reason as the ritual file: the runner's zone must not be part of the result.
process.env.TZ = 'UTC';

const calc = loadCalc('src/modules/cycle.js', 'Cycle');

// The shape the module persists. `length` and `period` are the manual fallbacks used until enough
// real cycles are logged to average.
const config = (overrides = {}) => ({ periods: [], length: 28, period: 5, ...overrides });
const on = (start, bleed) => ({ start, bleed });

// A returned Date is built inside the sandbox, so it cannot be compared against a Date built out
// here. Its getters work across the boundary, which is what this reads.
const ymdOf = (date) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

const closeTo = (actual, expected) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
};

describe('the timezone this file runs in', () => {
  test('is pinned, so a failure is never about the runner', () => {
    assert.equal(new Date(2026, 0, 15).getTimezoneOffset(), 0);
  });
});

describe('cycleIntervals', () => {
  test('a single period has no interval to measure', () => {
    assert.deepEqual(plainCopy(calc.cycleIntervals(config({ periods: [on('2026-01-01', 5)] }))), []);
  });

  test('measures the days between consecutive starts', () => {
    const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 5), on('2026-02-26', 5)] });
    assert.deepEqual(plainCopy(calc.cycleIntervals(cfg)), [28, 28]);
  });

  // The list is sorted before anything is measured, so a period logged out of order does not
  // produce a negative interval that then poisons the average.
  test('sorts the list before measuring, so the order it was logged in does not matter', () => {
    const cfg = config({ periods: [on('2026-02-26', 5), on('2026-01-01', 5), on('2026-01-29', 5)] });
    assert.deepEqual(plainCopy(calc.cycleIntervals(cfg)), [28, 28]);
  });
});

describe('avgLength', () => {
  test('falls back to the configured length while nothing is logged', () => {
    assert.equal(calc.avgLength(config({ length: 30 })), 30);
  });

  test('falls back to twenty-eight when there is no configured length either', () => {
    assert.equal(calc.avgLength({ periods: [] }), 28);
  });

  test('averages the real intervals and rounds', () => {
    // 28 days, then 29.
    const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 5), on('2026-02-27', 5)] });
    assert.equal(calc.avgLength(cfg), 29);
  });

  // Implausible gaps are dropped rather than averaged in: a fourteen day interval is a double log,
  // a seventy-three day one is a period nobody wrote down. Either would drag the estimate somewhere
  // the interface would then present as her rhythm.
  test('ignores an interval below fifteen days', () => {
    const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-15', 5), on('2026-02-12', 5)] });
    assert.equal(calc.avgLength(cfg), 28);
  });

  test('ignores an interval above sixty days, and falls back when nothing plausible is left', () => {
    const cfg = config({ length: 30, periods: [on('2026-01-01', 5), on('2026-03-15', 5)] });
    assert.equal(calc.avgLength(cfg), 30);
  });
});

describe('avgBleed', () => {
  test('falls back to the configured period while nothing is logged', () => {
    assert.equal(calc.avgBleed(config({ period: 6 })), 6);
  });

  test('averages the logged bleed lengths and rounds', () => {
    assert.equal(calc.avgBleed(config({ periods: [on('2026-01-01', 3), on('2026-01-29', 5)] })), 4);
  });

  test('ignores a period whose bleed was never recorded', () => {
    const cfg = config({ periods: [on('2026-01-01', undefined), on('2026-01-29', 6)] });
    assert.equal(calc.avgBleed(cfg), 6);
  });
});

describe('lastPeriodOnOrBefore', () => {
  const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 5)] });

  test('is null while nothing has been logged', () => {
    assert.equal(calc.lastPeriodOnOrBefore(config(), new Date(2026, 0, 15)), null);
  });

  test('is null when every logged period is later than the date', () => {
    assert.equal(calc.lastPeriodOnOrBefore(cfg, new Date(2025, 11, 31)), null);
  });

  test('the start day itself counts as on or before', () => {
    assert.equal(calc.lastPeriodOnOrBefore(cfg, new Date(2026, 0, 29)), '2026-01-29');
  });

  test('picks the most recent one before the date', () => {
    assert.equal(calc.lastPeriodOnOrBefore(cfg, new Date(2026, 0, 28)), '2026-01-01');
  });
});

describe('dayOfCycle', () => {
  const cfg = config({ periods: [on('2026-01-01', 5)] });

  test('is null when no logged period precedes the date', () => {
    assert.equal(calc.dayOfCycle(cfg, new Date(2025, 11, 31)), null);
  });

  test('the start date is day one, not day zero', () => {
    assert.equal(calc.dayOfCycle(cfg, new Date(2026, 0, 1)), 1);
  });

  test('counts forward from the start', () => {
    assert.equal(calc.dayOfCycle(cfg, new Date(2026, 0, 14)), 14);
  });
});

describe('ovulationDay', () => {
  test('is a fixed luteal phase back from the end of an average cycle', () => {
    assert.equal(calc.ovulationDay(config()), 14);
  });

  // The estimate must never land inside the bleed, which is what the lower bound is for. A short
  // configured cycle would otherwise put ovulation on day four of a six day period.
  test('never lands inside the bleed: a short cycle pushes it to the day after', () => {
    assert.equal(calc.ovulationDay(config({ length: 18, period: 6 })), 7);
  });
});

describe('phaseForDay', () => {
  const cfg = config();

  test('a day with no cycle has no phase', () => {
    assert.equal(calc.phaseForDay(cfg, null), null);
  });

  test('the last bleed day is still the menstrual phase', () => {
    assert.equal(calc.phaseForDay(cfg, 5), 'menstruala');
  });

  test('the day after the bleed is follicular', () => {
    assert.equal(calc.phaseForDay(cfg, 6), 'foliculara');
  });

  test('the estimated ovulation day is a phase of its own', () => {
    assert.equal(calc.phaseForDay(cfg, 14), 'ovulatie');
  });

  test('everything after ovulation is luteal', () => {
    assert.equal(calc.phaseForDay(cfg, 15), 'luteala');
  });
});

describe('phaseForDate', () => {
  const cfg = config({ periods: [on('2026-01-01', 5)] });

  test('reads the phase for a calendar date through the day of cycle', () => {
    assert.equal(calc.phaseForDate(cfg, new Date(2026, 0, 3)), 'menstruala');
    assert.equal(calc.phaseForDate(cfg, new Date(2026, 0, 14)), 'ovulatie');
  });

  test('is null when there is no logged period to count from', () => {
    assert.equal(calc.phaseForDate(config(), new Date(2026, 0, 14)), null);
  });
});

describe('flowerOpen', () => {
  const cfg = config();

  test('a day with no cycle sits half open rather than closed', () => {
    assert.equal(calc.flowerOpen(cfg, null), 0.5);
  });

  test('is full only on the estimated ovulation day', () => {
    assert.equal(calc.flowerOpen(cfg, 14), 1);
    assert.ok(calc.flowerOpen(cfg, 13) < 1);
    assert.ok(calc.flowerOpen(cfg, 15) < 1);
  });

  test('opens a little further on each bleed day', () => {
    closeTo(calc.flowerOpen(cfg, 1), 0.092);
    closeTo(calc.flowerOpen(cfg, 5), 0.14);
  });

  // The late luteal days are the ones a naive formula sends negative, which would render as a
  // flower that is not there. The floor is what stops that.
  test('never falls below the floor, even past the end of the estimated cycle', () => {
    closeTo(calc.flowerOpen(cfg, 28), 0.16);
    closeTo(calc.flowerOpen(cfg, 40), 0.16);
  });

  test('stays inside zero and one across a whole cycle, and peaks exactly once', () => {
    let peaks = 0;
    for (let index = 1; index <= 28; index++) {
      const open = calc.flowerOpen(cfg, index);
      assert.ok(open > 0 && open <= 1, `day ${index} produced ${open}`);
      if (open === 1) peaks++;
    }
    assert.equal(peaks, 1);
  });
});

describe('history', () => {
  test('the newest cycle is still open, so it has no length yet', () => {
    const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 4)] });
    assert.deepEqual(plainCopy(calc.history(cfg)), [
      { start: '2026-01-01', bleed: 5, len: 28 },
      { start: '2026-01-29', bleed: 4, len: null },
    ]);
  });

  test('comes back in date order whatever order it was logged in', () => {
    const cfg = config({ periods: [on('2026-01-29', 4), on('2026-01-01', 5)] });
    assert.deepEqual(plainCopy(calc.history(cfg)).map((entry) => entry.start), ['2026-01-01', '2026-01-29']);
  });
});

describe('addPeriodDate', () => {
  const cfg = config({ periods: [on('2026-01-01', 5), on('2026-02-26', 4)] });

  test('adds the date and keeps the list sorted', () => {
    assert.deepEqual(plainCopy(calc.addPeriodDate(cfg, '2026-01-29', 6)).periods, [
      { start: '2026-01-01', bleed: 5 },
      { start: '2026-01-29', bleed: 6 },
      { start: '2026-02-26', bleed: 4 },
    ]);
  });

  test('a date already logged is not added a second time', () => {
    assert.deepEqual(plainCopy(calc.addPeriodDate(cfg, '2026-01-01', 9)).periods, [
      { start: '2026-01-01', bleed: 5 },
      { start: '2026-02-26', bleed: 4 },
    ]);
  });

  test('takes the configured period length when no bleed is given', () => {
    const added = plainCopy(calc.addPeriodDate(config({ period: 7 }), '2026-03-01')).periods;
    assert.deepEqual(added, [{ start: '2026-03-01', bleed: 7 }]);
  });

  // The module calls these mutations pure. That is the claim being checked, and it is the one that
  // matters: the caller holds the old config and writes the returned one.
  test('does not modify the config it was given', () => {
    const before = plainCopy(cfg);
    calc.addPeriodDate(cfg, '2026-01-29', 6);
    assert.deepEqual(cfg, before);
  });
});

describe('removePeriodDate', () => {
  const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 4)] });

  test('removes the matching start and leaves the rest', () => {
    assert.deepEqual(plainCopy(calc.removePeriodDate(cfg, '2026-01-01')).periods, [
      { start: '2026-01-29', bleed: 4 },
    ]);
  });

  test('a date that was never logged changes nothing', () => {
    assert.deepEqual(plainCopy(calc.removePeriodDate(cfg, '2026-05-05')).periods, plainCopy(cfg.periods));
  });

  test('does not modify the config it was given', () => {
    const before = plainCopy(cfg);
    calc.removePeriodDate(cfg, '2026-01-01');
    assert.deepEqual(cfg, before);
  });
});

describe('setBleed', () => {
  const cfg = config({ periods: [on('2026-01-01', 5), on('2026-01-29', 4)] });

  test('sets the bleed on the matching period only', () => {
    assert.deepEqual(plainCopy(calc.setBleed(cfg, '2026-01-29', 8)).periods, [
      { start: '2026-01-01', bleed: 5 },
      { start: '2026-01-29', bleed: 8 },
    ]);
  });

  test('clamps below one and above ten', () => {
    assert.equal(plainCopy(calc.setBleed(cfg, '2026-01-01', 0)).periods[0].bleed, 1);
    assert.equal(plainCopy(calc.setBleed(cfg, '2026-01-01', 99)).periods[0].bleed, 10);
  });

  test('does not modify the config it was given', () => {
    const before = plainCopy(cfg);
    calc.setBleed(cfg, '2026-01-01', 9);
    assert.deepEqual(cfg, before);
  });
});

describe('nextPeriodStart', () => {
  test('is null while nothing has been logged', () => {
    assert.equal(calc.nextPeriodStart(config(), new Date(2026, 0, 15)), null);
  });

  test('is one average cycle after the last logged start', () => {
    const cfg = config({ periods: [on('2026-01-01', 5)] });
    assert.equal(ymdOf(calc.nextPeriodStart(cfg, new Date(2026, 0, 15))), '2026-01-29');
  });

  // Somebody who stops logging for two months should still be shown a date ahead of her, not one in
  // February. The estimate is projected forward a cycle at a time until it stops being in the past.
  test('projects forward until the estimate is no longer behind the date asked for', () => {
    const cfg = config({ periods: [on('2026-01-01', 5)] });
    assert.equal(ymdOf(calc.nextPeriodStart(cfg, new Date(2026, 2, 15))), '2026-03-26');
  });
});
