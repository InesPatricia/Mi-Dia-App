// Single source of truth for "how many tests does this repo have?".
//
// WHY THIS EXISTS
//   The README used to state the count by hand. A hand-written number in documentation is a
//   claim nobody re-checks, so it drifts, and a stale number is worse than no number: it tells a
//   reader the author trusts their own docs without verifying them. Same failure mode as a CI
//   gate that never runs.
//
// WHY IT ASKS PLAYWRIGHT INSTEAD OF COUNTING TEXT
//   Counting `test(` with grep is wrong twice over. It MISSES tests generated at runtime
//   (a11y.spec.js declares one test inside a loop over 6 views, so 1 line becomes 6 tests) and it
//   ADDS false positives (`/favicon/i.test(path)` is a regex method call, not a test). The only
//   authority on what will run is the runner: `playwright test --list`.
//
// WHY THREE NUMBERS, NOT ONE
//   They are three different suites and none of them ever run together:
//     functional - the deterministic suite, what runs on a dev machine and in CI.
//     visual     - screenshot regression, gated behind PW_VISUAL because pixel baselines are only
//                  meaningful in a pinned environment (see the note in playwright.config.js).
//     prod       - the post-deploy smoke, which runs against a live URL under a different config.
//
// USAGE
//   node count-tests.js            print the counts (human + JSON)
//   node count-tests.js --check    verify the README badge matches; exit 1 on drift (used in CI)
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');

// Ask the runner, then read the count off its "Total: N tests in M files" summary line.
function count(args, env = {}) {
  const out = cp.execSync(`npx playwright test --list ${args}`, {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  const m = out.match(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+files?/);
  if (!m) throw new Error(`could not parse a total from --list ${args}`);
  return { tests: Number(m[1]), files: Number(m[2]) };
}

const functional = count('');
const withVisual = count('', { PW_VISUAL: '1' });

const counts = {
  functional,
  visual: { tests: withVisual.tests - functional.tests },
  prod: count('--config=playwright.prod.config.js'),
};

// The badge is the only place the number is published, so it is the only place that can drift.
const BADGE = /!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/e2e-(\d+)%20/;

if (process.argv.includes('--check')) {
  const readme = fs.readFileSync(README, 'utf8');
  const m = readme.match(BADGE);
  if (!m) {
    console.error('count-tests: no e2e test-count badge found in README.md.');
    console.error('Either restore the badge or drop this check — a check for something that no');
    console.error('longer exists is exactly the dead-gate problem it was written to prevent.');
    process.exit(1);
  }
  const claimed = Number(m[1]);
  if (claimed !== counts.functional.tests) {
    console.error(`count-tests: README badge says ${claimed}, the runner reports ${counts.functional.tests}.`);
    console.error(`Fix the badge in README.md, then re-run: node e2e/count-tests.js --check`);
    process.exit(1);
  }
  console.log(`count-tests: README badge (${claimed}) matches the suite. OK`);
  process.exit(0);
}

console.log(`functional (dev + CI)   ${counts.functional.tests} tests in ${counts.functional.files} files`);
console.log(`visual     (PW_VISUAL)  ${counts.visual.tests} tests`);
console.log(`prod       (smoke)      ${counts.prod.tests} tests in ${counts.prod.files} files`);
console.log(JSON.stringify(counts));
