/**
 * Tests for check-docs.
 *
 * A gate is only a gate if it fails when it should. This repo has already shipped one that ran
 * green forever without checking anything, so every rule here is asserted in both directions:
 * green on a clean fixture, red on a fixture broken in exactly one way.
 *
 * Run:  node --test scripts/check-docs.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), 'check-docs.mjs');

const COUNT_STUB = `console.log(JSON.stringify({
  functional: { tests: 83, files: 19 },
  visual: { tests: 2 },
  prod: { tests: 7, files: 1 }
}));`;

const CLEAN_ROUTER = `# Router

Read [the schema](docs/DATA_SCHEMA.md) before touching storage.
Builds are named \`mi-dia-vNN.html\`; which one is current is derived from \`index.html\`.
`;

/** A fixture that every rule should pass on, except rule 6 (no git checkout). */
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'check-docs-'));
  const write = (rel, body) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  };

  write('CLAUDE.md', CLEAN_ROUTER);
  write('README.md', '# App\n\n83 end-to-end tests, plus 7 smoke tests.\n');
  write('CHANGELOG.md', '# Changelog\n\n## v1 — first\n\ne2e 83 green.\n');
  write('docs/DATA_SCHEMA.md', '# Schema\n\nSee [the build log](history/BUILD-LOG.md).\n');
  write('docs/history/BUILD-LOG.md', '# Build log\n\n## Changelog (v23 → v47)\n\nold stuff\n');
  write('docs/history/.headings-baseline.txt', 'Changelog (v23 → v47)\n');
  write('index.html', '<!doctype html>');
  write('e2e/count-tests.js', COUNT_STUB);
  return root;
}

/** Run the checker and return { ok, byRule } where byRule[n] is 'PASS' | 'FAIL' | 'SKIP'. */
function run(root) {
  let out;
  try {
    out = execFileSync(process.execPath, [CHECKER, '--root', root, '--json'], { encoding: 'utf8' });
  } catch (err) {
    out = err.stdout; // non-zero exit is the normal failing path
  }
  const parsed = JSON.parse(out);
  const byRule = {};
  for (const r of parsed.results) byRule[r.rule] = r.status;
  return { ok: parsed.ok, byRule, results: parsed.results };
}

/** Assert that breaking the fixture in one way turns exactly `rule` red. */
function expectRuleFails(rule, mutate) {
  const root = makeFixture();
  try {
    mutate(root, (rel, body) => writeFileSync(join(root, rel), body, 'utf8'));
    const { ok, byRule, results } = run(root);
    const detail = results.find((r) => r.rule === rule)?.detail ?? '';
    assert.equal(byRule[rule], 'FAIL', `rule ${rule} should fail — got ${byRule[rule]}\n${detail}`);
    assert.equal(ok, false, 'overall result should be a failure');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('clean fixture: rules 1-5 pass', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root);
    for (const rule of [1, 2, 3, 4, 5]) {
      const detail = results.find((r) => r.rule === rule)?.detail ?? '';
      assert.equal(byRule[rule], 'PASS', `rule ${rule} should pass — got ${byRule[rule]}\n${detail}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 6 fails loudly outside a git checkout rather than passing quietly', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root);
    assert.equal(byRule[6], 'FAIL');
    assert.match(results.find((r) => r.rule === 6).detail, /not a git checkout/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 1 catches a path that does not exist', () => {
  expectRuleFails(1, (root, write) =>
    write('CLAUDE.md', `${CLEAN_ROUTER}\nAlso read [the plan](docs/NOT-THERE.md).\n`),
  );
});

test('rule 1 accepts a bare filename that exists somewhere in the repo', () => {
  const root = makeFixture();
  try {
    writeFileSync(join(root, 'CLAUDE.md'), `${CLEAN_ROUTER}\nThe counter is \`count-tests.js\`.\n`, 'utf8');
    assert.equal(run(root).byRule[1], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 2 catches a hard-coded build number in the router', () => {
  expectRuleFails(2, (root, write) =>
    write('CLAUDE.md', `${CLEAN_ROUTER}\nCurrent latest build: mi-dia-v172.html\n`),
  );
});

test('rule 2 catches a reference to private/', () => {
  expectRuleFails(2, (root, write) =>
    write('CLAUDE.md', `${CLEAN_ROUTER}\nRead \`private/living-flower-build-plan.md\` first.\n`),
  );
});

test('rule 3 catches a router that grew past the limit', () => {
  expectRuleFails(3, (root, write) =>
    write('CLAUDE.md', `${CLEAN_ROUTER}\n${'filler line\n'.repeat(200)}`),
  );
});

test('rule 4 catches a test count the runner cannot produce', () => {
  expectRuleFails(4, (root, write) =>
    write('README.md', '# App\n\n99 end-to-end tests, plus 7 smoke tests.\n'),
  );
});

test('rule 5 catches an archived heading dropped from the build log', () => {
  expectRuleFails(5, (root, write) =>
    write('docs/history/BUILD-LOG.md', '# Build log\n\nsomeone deleted the old entries\n'),
  );
});
