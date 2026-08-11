/**
 * Tests for check-docs.
 *
 * A gate is only a gate if it fails when it should. This repo has already shipped one that ran
 * green forever without checking anything, so every rule here is asserted in both directions:
 * green on a clean fixture, red on a fixture broken in exactly one way.
 *
 * Run:  node --test quality/tools/check-docs.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), 'check-docs.mjs');

// Mirrors the real e2e/count-tests.js, including its --check mode: the README badge must equal the
// functional count exactly. Rule 4 delegates the badge to this, so the stub has to behave like it.
const COUNT_STUB = `// Mirrors the real e2e/count-tests.js, including its --check mode: the README badge must
// equal the functional count exactly. Rule 4 delegates the badge to this, so the stub behaves like it.
const fs = require('node:fs'), path = require('node:path');
const counts = { functional: { tests: 83, files: 19 }, visual: { tests: 2 }, prod: { tests: 7, files: 1 } };
if (process.argv.includes('--check')) {
  const readme = fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8');
  // no regex on purpose: this lives inside a template literal, and one lost backslash turns the
  // pattern into a syntax error that only shows up as "could not run count-tests"
  const marker = 'shields.io/badge/e2e-';
  const at = readme.indexOf(marker);
  if (at === -1) { console.error('count-tests: no e2e test-count badge found in README.md.'); process.exit(1); }
  const claimed = parseInt(readme.slice(at + marker.length), 10);
  if (claimed !== counts.functional.tests) {
    console.error('count-tests: README badge says ' + claimed + ', the runner reports ' + counts.functional.tests + '.');
    process.exit(1);
  }
  console.log('count-tests: README badge matches the suite. OK');
} else {
  console.log(JSON.stringify(counts));
}`;

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
  write(
    'README.md',
    '# App\n\n![Tests](https://img.shields.io/badge/e2e-83%20Playwright%20tests-2EAD33)\n\n' +
      '83 end-to-end tests, plus 7 smoke tests.\n',
  );
  write('CHANGELOG.md', '# Changelog\n\n## v1 — first\n\ne2e 83 green.\n');
  write('docs/DATA_SCHEMA.md', '# Schema\n\nSee [the build log](history/BUILD-LOG.md).\n');
  write('docs/history/BUILD-LOG.md', '# Build log\n\n## Changelog (v23 → v47)\n\nold stuff\n');
  write('docs/history/.headings-baseline.txt', 'Changelog (v23 → v47)\n');
  write('index.html', '<!doctype html>');
  write('quality/e2e/count-tests.js', COUNT_STUB);
  return root;
}

/** Run the checker and return { ok, byRule } where byRule[n] is 'PASS' | 'FAIL' | 'SKIP'. */
function run(root, env = {}) {
  let out;
  // start from a clean slate: a real CI run would otherwise leak its own GITHUB_* into the fixture
  const base = { ...process.env, GITHUB_HEAD_REF: '', GITHUB_REF_NAME: '' };
  try {
    out = execFileSync(process.execPath, [CHECKER, '--root', root, '--json'], {
      encoding: 'utf8',
      env: { ...base, ...env },
    });
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

test('clean fixture: every rule that can pass without git does', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root);
    for (const rule of [1, 2, 3, 4, 5, 7]) {
      const detail = results.find((r) => r.rule === rule)?.detail ?? '';
      assert.equal(byRule[rule], 'PASS', `rule ${rule} should pass — got ${byRule[rule]}\n${detail}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 6 fails loudly when it cannot tell which branch it is on', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root);
    assert.equal(byRule[6], 'FAIL');
    assert.match(results.find((r) => r.rule === 6).detail, /cannot tell which branch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// CI checks a pull request out as a detached HEAD, so `git rev-parse --abbrev-ref HEAD` answers
// "HEAD" and every branch-name rule quietly stops applying. That is how this gate first failed the
// very pull request it was written to allow. These two cases pin the environment down.
test('rule 6 reads the branch from GITHUB_HEAD_REF when the checkout is detached', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root, { GITHUB_HEAD_REF: 'docs/cleanup' });
    assert.equal(byRule[6], 'SKIP', 'a docs/* pull request must be allowed to change the router');
    assert.match(results.find((r) => r.rule === 6).detail, /docs\/cleanup/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// A pull request exists to change main, so the no-fork rule cannot apply to one without blocking
// every legitimate router edit — including the refactor that moved the served files into public/.
// Divergence is a property of long-lived branches, and that is where it is enforced.
test('rule 6 does not block a pull request, whatever the branch is called', () => {
  const root = makeFixture();
  try {
    const { byRule, results } = run(root, { GITHUB_HEAD_REF: 'refactor/public-dir' });
    assert.equal(byRule[6], 'SKIP');
    assert.match(results.find((r) => r.rule === 6).detail, /pull request/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 6 falls back to GITHUB_REF_NAME on a push, and still guards a non-docs branch', () => {
  const root = makeFixture();
  try {
    const { byRule } = run(root, { GITHUB_REF_NAME: 'staging' });
    assert.equal(byRule[6], 'FAIL', 'staging is not exempt from the no-fork rule');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 1 catches a path that does not exist', () => {
  expectRuleFails(1, (root, write) =>
    write('CLAUDE.md', `${CLEAN_ROUTER}\nAlso read [the plan](docs/NOT-THERE.md).\n`),
  );
});

// A clean checkout has no test reports, so naming one is not a dead path. This case exists because
// CI failed on exactly that: the docs mention the Playwright report, which only exists after a run.
test('rule 1 accepts an artifact that only exists after a command runs', () => {
  const root = makeFixture();
  try {
    writeFileSync(
      join(root, 'CLAUDE.md'),
      `${CLEAN_ROUTER}\nThe run writes \`quality/e2e/playwright-report/index.html\`.\n`,
      'utf8',
    );
    assert.equal(run(root).byRule[1], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// A markdown link is resolved literally by GitHub, relative to the file it sits in. Four links in
// the README survived a reorganisation because the checker accepted "the file exists somewhere" —
// and all four were 404s on the rendered page. A mention in prose still gets that leniency; a link
// does not.
test('rule 1 rejects a link to a file that exists, but not where the link points', () => {
  expectRuleFails(1, (root, write) => {
    write('docs/moved.md', '# Moved\n');
    write('CLAUDE.md', `${CLEAN_ROUTER}\nSee [the moved file](moved.md).\n`);
  });
});

test('rule 1 still accepts a prose mention of a file that lives elsewhere', () => {
  const root = makeFixture();
  try {
    writeFileSync(join(root, 'CLAUDE.md'), `${CLEAN_ROUTER}\nThe counter is \`count-tests.js\`.\n`, 'utf8');
    assert.equal(run(root).byRule[1], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Documented commands show the shape of a path rather than one path: /blob/<branch>/README.md is
// how you tell someone to look at their own branch. The checker flagged one of those as dead.
test('rule 1 accepts a placeholder in angle brackets', () => {
  const root = makeFixture();
  try {
    writeFileSync(
      join(root, 'CLAUDE.md'),
      `${CLEAN_ROUTER}\nOpen [the page](https://example.com/blob/<branch>/README.md) and \`docs/<name>.md\`.\n`,
      'utf8',
    );
    assert.equal(run(root).byRule[1], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    write(
      'README.md',
      '# App\n\n![Tests](https://img.shields.io/badge/e2e-83%20Playwright%20tests-2EAD33)\n\n' +
        '99 end-to-end tests, plus 7 smoke tests.\n',
    ),
  );
});

// The badge is owned by count-tests --check, which demands the functional count exactly. Rule 4
// used to accept functional+visual as well, so a badge could pass one checker and fail the other —
// which is how a pull request went red after this rule had gone green. One number, one authority.
test('rule 4 defers the badge to count-tests --check', () => {
  expectRuleFails(4, (root, write) =>
    write(
      'README.md',
      // 85 = 83 functional + 2 visual: a number the runner can produce, but not the badge's number
      '# App\n\n![Tests](https://img.shields.io/badge/e2e-85%20Playwright%20tests-2EAD33)\n\n' +
        '83 end-to-end tests, plus 7 smoke tests.\n',
    ),
  );
});

// This one is written from a real screenshot: the README diagram rendered as
// "docs/DATA_SCHEMA.mdwhat is stored" because GitHub stripped the <br/> and the <i>.
test('rule 7 catches HTML inside a mermaid label', () => {
  expectRuleFails(7, (root, write) =>
    write(
      'CLAUDE.md',
      `${CLEAN_ROUTER}\n\`\`\`mermaid\nflowchart LR\n  A["One<br/><i>two</i>"] --> B["Three"]\n\`\`\`\n`,
    ),
  );
});

test('rule 7 accepts a diagram with plain labels', () => {
  const root = makeFixture();
  try {
    writeFileSync(
      join(root, 'CLAUDE.md'),
      `${CLEAN_ROUTER}\n\`\`\`mermaid\nflowchart LR\n  A["One"] --> B["Two"]\n  B -. verifies .-> A\n\`\`\`\n`,
      'utf8',
    );
    assert.equal(run(root).byRule[7], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 5 catches an archived heading dropped from the build log', () => {
  expectRuleFails(5, (root, write) =>
    write('docs/history/BUILD-LOG.md', '# Build log\n\nsomeone deleted the old entries\n'),
  );
});

// ---------------------------------------------------------------- rule 8
//
// The bug this rule was written for was invisible on the machine that had it: design-check was
// tracked as both SKILL.md and skill.md, pointing at the same blob, while only one file existed on
// disk. core.ignorecase hid it locally and a case-sensitive checkout would have materialised two.
// So the interesting case below is built in the git index directly, not on the filesystem — which
// is also the only way to reproduce it at all on Windows or macOS.

/** Turn a fixture into a git repository, so the half of rule 8 that asks git has something to ask. */
function gitInit(root) {
  const run_ = (...a) => execFileSync('git', a, { cwd: root, stdio: 'ignore' });
  run_('init', '-q');
  run_('config', 'user.email', 'test@example.com');
  run_('config', 'user.name', 'test');
  return run_;
}

test('rule 8 catches a skill entry point named skill.md', () => {
  expectRuleFails(8, (root) => {
    mkdirSync(join(root, '.claude/skills/revamp'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/revamp/skill.md'), '# revamp\n', 'utf8');
  });
});

test('rule 8 catches a skill directory with no entry point at all', () => {
  expectRuleFails(8, (root) => {
    mkdirSync(join(root, '.claude/skills/orphan'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/orphan/notes.md'), '# notes\n', 'utf8');
  });
});

test('rule 8 catches two tracked paths differing only by case', () => {
  const root = makeFixture();
  try {
    const git = gitInit(root);
    mkdirSync(join(root, '.claude/skills/design-check'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/design-check/SKILL.md'), '# design-check\n', 'utf8');
    git('add', '-A');
    // Add the lowercase twin straight into the index. This is exactly what a rename on a
    // case-insensitive filesystem leaves behind, and it never touches the working tree.
    const hash = execFileSync('git', ['hash-object', '-w', join(root, '.claude/skills/design-check/SKILL.md')], {
      cwd: root, encoding: 'utf8',
    }).trim();
    execFileSync(
      'git',
      ['update-index', '--add', '--cacheinfo', `100644,${hash},.claude/skills/design-check/skill.md`],
      { cwd: root, stdio: 'ignore' },
    );

    const { byRule, results } = run(root);
    const detail = results.find((r) => r.rule === 8)?.detail ?? '';
    assert.equal(byRule[8], 'FAIL', `rule 8 should fail — got ${byRule[8]}\n${detail}`);
    assert.match(detail, /differing only by case/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rule 8 passes on a correctly named skill in a clean index', () => {
  const root = makeFixture();
  try {
    gitInit(root)('add', '-A');
    mkdirSync(join(root, '.claude/skills/ship'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/ship/SKILL.md'), '# ship\n', 'utf8');
    execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
    assert.equal(run(root).byRule[8], 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// A link whose spelling differs only by case resolves on Windows and macOS and 404s on GitHub,
// which is case-sensitive. This asserts the failure, not its wording: on a case-sensitive runner
// existsSync already rejects the path and the message is "broken link" instead. Both are red, which
// is the only part that matters.
test('rule 1 catches a link whose case does not match the file on disk', () => {
  expectRuleFails(1, (root) => {
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs/RUNBOOK.md'), '# runbook\n', 'utf8');
    writeFileSync(join(root, 'CLAUDE.md'), `${CLEAN_ROUTER}\nSee [the runbook](docs/runbook.md).\n`, 'utf8');
  });
});
