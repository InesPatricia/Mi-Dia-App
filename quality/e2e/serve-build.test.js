/**
 * Tests for serve-build.
 *
 * The thing this module must never do is fall back quietly. A green run against the wrong file is
 * worse than a red one, so every refusal is asserted, not just the happy path.
 *
 * Run:  node --test serve-build.test.js    (from quality/e2e)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { resolveServeDir, assembleCandidate, PUBLIC_DIR } = require('./serve-build');

/** A stand-in for public/, with the two files that matter and one that only has to be carried. */
function makePublic() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-build-public-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html>promoted');
  fs.writeFileSync(path.join(dir, 'sw.js'), 'const CACHE = "mi-dia-v172";\n');
  fs.writeFileSync(path.join(dir, '_headers'), '/*\n  X-Frame-Options: DENY\n');
  return dir;
}

function makeBuild(name, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-build-src-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return file;
}

const emptyDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'serve-build-out-'));

test('the candidate becomes index.html', () => {
  const publicDir = makePublic();
  const build = makeBuild('mi-dia-v173.html', '<!doctype html>candidate');
  const out = emptyDir();

  assembleCandidate(publicDir, build, out);

  assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), '<!doctype html>candidate');
});

test('the service worker cache name is rewritten to the candidate version', () => {
  // The half that could have made a green run meaningless: a candidate served beside a cache name
  // that still points at the build it replaces is a combination production will never have.
  const publicDir = makePublic();
  const build = makeBuild('mi-dia-v173.html', 'candidate');
  const out = emptyDir();

  const version = assembleCandidate(publicDir, build, out);

  assert.equal(version, 'v173');
  assert.match(fs.readFileSync(path.join(out, 'sw.js'), 'utf8'), /CACHE = "mi-dia-v173"/);
});

test('everything else the publish carries is copied through', () => {
  const publicDir = makePublic();
  const build = makeBuild('mi-dia-v173.html', 'candidate');
  const out = emptyDir();

  assembleCandidate(publicDir, build, out);

  assert.match(fs.readFileSync(path.join(out, '_headers'), 'utf8'), /X-Frame-Options/);
});

test('a file that is not a build is refused', () => {
  const publicDir = makePublic();
  const build = makeBuild('notes.html', 'not a build');
  const out = emptyDir();

  assert.throws(() => assembleCandidate(publicDir, build, out), /is not a build/);
});

test('a build that does not exist is refused', () => {
  const publicDir = makePublic();
  const out = emptyDir();

  assert.throws(
    () => assembleCandidate(publicDir, path.join(out, 'mi-dia-v999.html'), out),
    /does not exist/,
  );
});

test('a service worker with no cache name to rewrite is refused', () => {
  // Rather than serving the candidate beside a worker that names nothing, which would pass and
  // would be testing something the release process cannot produce.
  const publicDir = makePublic();
  fs.writeFileSync(path.join(publicDir, 'sw.js'), 'self.addEventListener("fetch", () => {});\n');
  const build = makeBuild('mi-dia-v173.html', 'candidate');
  const out = emptyDir();

  assert.throws(() => assembleCandidate(publicDir, build, out), /no CACHE name/);
});

test('with nothing requested, the promoted build is served and the label says so', () => {
  const resolved = resolveServeDir(undefined);

  assert.equal(resolved.dir, PUBLIC_DIR);
  assert.match(resolved.label, /promoted/);
});

test('with a candidate requested, the label says CANDIDATE and names the version', () => {
  // The label is what a person reads in the run output. A run that tested the wrong file while
  // reporting green is the failure this module exists to prevent, so the label is asserted too.
  const resolved = resolveServeDir('src/mi-dia-v172.html');

  assert.notEqual(resolved.dir, PUBLIC_DIR);
  assert.match(resolved.label, /CANDIDATE/);
  assert.match(resolved.label, /mi-dia-v172/);
});
