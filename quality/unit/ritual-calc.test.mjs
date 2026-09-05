// Unit tests for the calc block of src/modules/ritual.js.
//
// This is the level the end-to-end suite should stop paying for. A streak is arithmetic over a list
// of date strings, and proving one through a browser costs a page load, a seed and a render, which
// is why the end-to-end suite carries a single streak case and this file carries the edges.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCalc } from './load-module.mjs';

// Pinned so the result never depends on which machine ran it: this laptop sits at UTC+2, CI runs at
// UTC. Every function here works in local midnight, so the pin also leaves the arc's open questions
// open rather than half answering them, since UTC has no daylight saving to cross.
process.env.TZ = 'UTC';

const calc = loadCalc('src/modules/ritual.js', 'Ritual');

// January 2026 starts on a Thursday. The weekday of every date used below was read off the runtime,
// not counted by hand.
const jan = (dayOfMonth) => new Date(2026, 0, dayOfMonth);
const daily = (log) => ({ id: 'rit', name: 'Breathe', freq: 'daily', log });
const onDays = (days, log) => ({ id: 'rit', name: 'Breathe', freq: { days }, log });

describe('the timezone this file runs in', () => {
  test('is pinned, so a failure is never about the runner', () => {
    assert.equal(jan(15).getTimezoneOffset(), 0);
  });
});

describe('dkey', () => {
  test('pads a single-digit month and day', () => {
    assert.equal(calc.dkey(jan(5)), '2026-01-05');
  });

  test('keeps a two-digit month and day', () => {
    assert.equal(calc.dkey(new Date(2026, 11, 25)), '2026-12-25');
  });

  test('ignores the time of day, so a key is a day and not an instant', () => {
    assert.equal(calc.dkey(new Date(2026, 0, 5, 23, 59, 59)), '2026-01-05');
  });
});

describe('dueToday', () => {
  test('a missing ritual is never due', () => {
    assert.equal(calc.dueToday(null, jan(15)), false);
  });

  test('a ritual with no frequency is treated as daily', () => {
    assert.equal(calc.dueToday({ log: [] }, jan(15)), true);
  });

  test('daily is due on every day', () => {
    assert.equal(calc.dueToday(daily([]), jan(15)), true);
    assert.equal(calc.dueToday(daily([]), jan(18)), true);
  });

  // The module's own note calls this convention load-bearing for any future day picker, so it is
  // pinned here rather than left to be rediscovered. Jan 4 2026 is a Sunday and Jan 5 a Monday.
  test('a day list counts from Sunday, not from Monday', () => {
    assert.equal(calc.dueToday(onDays([0], []), jan(4)), true);
    assert.equal(calc.dueToday(onDays([0], []), jan(5)), false);
  });

  test('a day list excludes the days it does not name', () => {
    const monWedFri = onDays([1, 3, 5], []);
    assert.equal(calc.dueToday(monWedFri, jan(5)), true);
    assert.equal(calc.dueToday(monWedFri, jan(6)), false);
  });

  // Anything the module does not recognise falls through to due. That is a deliberate branch in the
  // source and it is what stops an unknown frequency from hiding a ritual forever.
  test('an unrecognised frequency falls back to due', () => {
    assert.equal(calc.dueToday({ freq: 'weekly', log: [] }, jan(15)), true);
  });
});

describe('isDone', () => {
  test('is done when the log holds that day', () => {
    assert.equal(calc.isDone(daily(['2026-01-15']), jan(15)), true);
  });

  test('is not done when the log holds a different day', () => {
    assert.equal(calc.isDone(daily(['2026-01-14']), jan(15)), false);
  });

  test('a log that is not an array is not done', () => {
    assert.equal(calc.isDone({ freq: 'daily', log: null }, jan(15)), false);
  });

  // The null case above is not enough on its own: a guard written as a truthiness check would pass
  // it and still be wrong. A hand-edited backup can hold a string here, and indexOf on a string
  // finds the key inside it, which is how a ritual reports itself done off a value that is not a
  // log at all. Found by deleting the array guard on purpose and watching nothing go red.
  test('a log that is a string is not done, even when the string contains the key', () => {
    assert.equal(calc.isDone({ freq: 'daily', log: '2026-01-15' }, jan(15)), false);
  });

  test('a missing ritual is not done', () => {
    assert.equal(calc.isDone(undefined, jan(15)), false);
  });
});

describe('streakOf', () => {
  test('an empty log is a streak of zero', () => {
    assert.equal(calc.streakOf(daily([]), jan(15)), 0);
  });

  test('counts the consecutive days ending on today', () => {
    assert.equal(calc.streakOf(daily(['2026-01-13', '2026-01-14', '2026-01-15']), jan(15)), 3);
  });

  // The product decision behind the arithmetic: a day is not lost until it is over. An unchecked
  // today leaves the run that ended yesterday standing instead of resetting it at midnight.
  test('today is a grace day, so an unchecked today does not break yesterday and before', () => {
    assert.equal(calc.streakOf(daily(['2026-01-12', '2026-01-13', '2026-01-14']), jan(15)), 3);
  });

  test('a missed day ends the count, and earlier days do not carry over it', () => {
    const log = ['2026-01-10', '2026-01-11', '2026-01-13', '2026-01-14', '2026-01-15'];
    assert.equal(calc.streakOf(daily(log), jan(15)), 3);
  });

  // Jan 12, 14 and 16 2026 are Monday, Wednesday and Friday. The Tuesday and Thursday between them
  // were never due, so they are skipped rather than counted as misses.
  test('a day the ritual was not due does not break the run', () => {
    const monWedFri = onDays([1, 3, 5], ['2026-01-12', '2026-01-14', '2026-01-16']);
    assert.equal(calc.streakOf(monWedFri, jan(16)), 3);
  });

  test('a missing log is a streak of zero', () => {
    assert.equal(calc.streakOf({ freq: 'daily' }, jan(15)), 0);
  });
});

describe('missedYesterday', () => {
  test('is false when the previous day was done', () => {
    assert.equal(calc.missedYesterday(daily(['2026-01-14']), jan(15)), false);
  });

  test('is true when the previous day was due and left undone', () => {
    assert.equal(calc.missedYesterday(daily(['2026-01-13']), jan(15)), true);
  });

  // The name says yesterday, the behaviour is the previous DUE day, and the gap between the two is
  // where a ritual gets told it broke a streak it never broke. Asked on Monday Jan 19, a Monday,
  // Wednesday, Friday ritual is judged on the Friday before, not on the Sunday.
  //
  // The first version of this test asked on a Thursday about a Wednesday, one day apart, so both
  // readings gave the same answer and the case could not fail. Found by rewriting the source to
  // read literally yesterday and watching the suite stay green.
  test('for a ritual that is not daily it means the previous due day, not the day before', () => {
    const doneOnTheFriday = onDays([1, 3, 5], ['2026-01-16']);
    assert.equal(calc.missedYesterday(doneOnTheFriday, jan(19)), false);

    const nothingDone = onDays([1, 3, 5], []);
    assert.equal(calc.missedYesterday(nothingDone, jan(19)), true);
  });
});

describe('recordStreak', () => {
  test('an empty log has no record', () => {
    assert.equal(calc.recordStreak(daily([]), jan(15)), 0);
  });

  test('reports the longest run in the whole log, not the current one', () => {
    const log = ['2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-14', '2026-01-15'];
    assert.equal(calc.recordStreak(daily(log), jan(15)), 4);
  });

  test('a run that is still going counts', () => {
    assert.equal(calc.recordStreak(daily(['2026-01-13', '2026-01-14', '2026-01-15']), jan(15)), 3);
  });

  test('days the ritual was not due do not break the record', () => {
    const monWedFri = onDays([1, 3, 5], ['2026-01-12', '2026-01-14', '2026-01-16', '2026-01-19']);
    assert.equal(calc.recordStreak(monWedFri, jan(19)), 4);
  });
});

describe('voteLabel', () => {
  test('returns the identity sentence when the ritual has one', () => {
    assert.equal(calc.voteLabel({ identity: 'a woman who breathes' }), 'a woman who breathes');
  });

  test('returns an empty string when the ritual has none', () => {
    assert.equal(calc.voteLabel({ id: 'rit' }), '');
  });

  test('returns an empty string for a missing ritual', () => {
    assert.equal(calc.voteLabel(null), '');
  });
});
