// Tests for the loader itself.
//
// Not in the plan for this phase, and here anyway, for the reason the repository already applies to
// everything in quality/tools: a harness that quietly does nothing looks exactly like a harness that
// works. plainCopy is the part that would fail that way. Its first draft copied a sandbox array with
// `map`, which builds the result through the source array's own constructor and therefore never left
// the sandbox realm at all. The tests it existed for caught it; nothing else would have.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCalc, plainCopy } from './load-module.mjs';

describe('loadCalc', () => {
  test('hands back the calc surface each module declares', () => {
    assert.deepEqual(Object.keys(loadCalc('src/modules/ritual.js', 'Ritual')).sort(), [
      'dkey', 'dueToday', 'isDone', 'missedYesterday', 'recordStreak', 'streakOf', 'voteLabel',
    ]);
    assert.ok(typeof loadCalc('src/modules/cycle.js', 'Cycle').phaseForDay === 'function');
  });

  test('names the module and the global it could not find', () => {
    assert.throws(
      () => loadCalc('src/modules/cycle.js', 'Ritual'),
      /src\/modules\/cycle\.js does not expose Ritual\._calc/,
    );
  });

  // The other half of the same check, and the reason it is a check rather than an assumption:
  // ritual.js declares two modules and only one of them is a calc surface.
  test('refuses a module that loads but declares no calc surface', () => {
    assert.throws(
      () => loadCalc('src/modules/ritual.js', 'Onboard'),
      /src\/modules\/ritual\.js does not expose Onboard\._calc/,
    );
  });

  // The sandbox is the whole point: the module runs in a context with nothing in it, so a calc block
  // that reached for document or Store would throw on load rather than resolve against this process.
  //
  // The check has to go through a function body, not through globalThis. The module declares itself
  // with a top-level `const`, which lands in the global LEXICAL scope and never on globalThis, so
  // `globalThis.Ritual === undefined` holds just as well when the module has leaked into this realm
  // as when it has not. The first version of this test asserted exactly that and could not fail.
  // Measured: after `vm.runInThisContext`, globalThis.Ritual is still undefined while
  // `new Function('return typeof Ritual')()` returns "object".
  test('leaves nothing behind in the realm that loaded it', () => {
    loadCalc('src/modules/ritual.js', 'Ritual');
    assert.equal(new Function('return typeof Ritual')(), 'undefined');
    assert.equal(new Function('return typeof Cycle')(), 'undefined');
  });
});

describe('plainCopy', () => {
  const calc = loadCalc('src/modules/cycle.js', 'Cycle');
  const cfg = { periods: [{ start: '2026-01-01', bleed: 5 }, { start: '2026-01-29', bleed: 4 }], length: 28, period: 5 };

  // Both values below are built inside the sandbox. A host array or a host object would pass this
  // test with the loader broken, which is why the fixtures come out of a module rather than a
  // literal written here.
  test('brings a sandbox array across, so a strict comparison accepts it', () => {
    assert.deepEqual(plainCopy(calc.cycleIntervals(cfg)), [28]);
  });

  test('brings a nested sandbox object across', () => {
    assert.deepEqual(plainCopy(calc.addPeriodDate(cfg, '2026-02-26', 6)), {
      length: 28,
      period: 5,
      periods: [
        { start: '2026-01-01', bleed: 5 },
        { start: '2026-01-29', bleed: 4 },
        { start: '2026-02-26', bleed: 6 },
      ],
    });
  });

  test('passes primitives through untouched', () => {
    assert.equal(plainCopy('2026-01-01'), '2026-01-01');
    assert.equal(plainCopy(0), 0);
    assert.equal(plainCopy(false), false);
    assert.equal(plainCopy(null), null);
    assert.equal(plainCopy(undefined), undefined);
  });

  // The refusal is the useful half. A calc function that starts returning a Date must not be
  // flattened into something an assertion would accept without anybody noticing the type changed.
  test('refuses a value that is not plain data, and says what it was', () => {
    assert.throws(() => plainCopy(new Date(2026, 0, 1)), /\[object Date\] is not plain data/);
    assert.throws(() => plainCopy(new Map()), /\[object Map\] is not plain data/);
    assert.throws(() => plainCopy(() => 1), /is not plain data/);
  });
});
