// The commit gate, tested by breaking it.
//
// A gate that has never failed is not a gate, and a defect in THIS one is a defect in every commit
// that passed since it landed. So every case below is built as a real repository with real history:
// the checker reads the index and HEAD through git, and two of its defects only appear on state that
// came out of git rather than state a test wrote by hand.
//
// No literal emoji or em dash appears in this file. It is committed to a repository whose own rule
// refuses both, and a test for a check has no business tripping it. They are built from code points,
// the way the checker builds its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECKER = path.join(ROOT, '.githooks', 'check-emoji.mjs');

const EM_DASH = String.fromCharCode(0x2014);
const SEEDLING = String.fromCodePoint(0x1f331);
const BUTTERFLY = String.fromCodePoint(0x1f98b);

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'emoji-gate-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'gate@test.local');
  git('config', 'user.name', 'gate test');
  git('config', 'commit.gpgsign', 'false');
  // The real repository points core.hooksPath at .githooks, and that setting can reach a temporary
  // repository through the global config. These fixtures build state; they are not the thing under
  // test, and they must not be refused by the very check they exist to exercise.
  git('config', 'core.hooksPath', path.join(dir, '.no-hooks'));
  return { dir, git };
}

function write(dir, rel, text) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function check(dir) {
  const result = spawnSync(process.execPath, [CHECKER, '--staged'], { cwd: dir, encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout || ''}${result.stderr || ''}` };
}

// A build the way this repository writes one: interface copy that already carries the debt.
const v184 = [
  '<!doctype html>',
  `<button id="today">${SEEDLING} azi</button>`,
  `<p>respira incet${EM_DASH}apoi expira</p>`,
  '<p>plain line</p>',
].join('\n');

function seedWithBuild({ dir, git }, name = 'src/mi-dia-v184.html', body = v184) {
  write(dir, name, body);
  git('add', name);
  git('commit', '-q', '-m', 'seed a committed build');
}

test('a new build carrying only what the previous one already had is accepted', () => {
  const r = repo();
  seedWithBuild(r);

  // The versioning law: a change writes a NEW file. Every line of it reads as added.
  write(r.dir, 'src/mi-dia-v185.html', `${v184}\n<p>a new and blameless line</p>`);
  r.git('add', 'src/mi-dia-v185.html');

  const { status, out } = check(r.dir);
  assert.equal(status, 0, `expected the build to pass, got:\n${out}`);
});

test('a new build that introduces an emoji of its own is still refused', () => {
  const r = repo();
  seedWithBuild(r);

  write(r.dir, 'src/mi-dia-v185.html', `${v184}\n<p>${BUTTERFLY} gradina</p>`);
  r.git('add', 'src/mi-dia-v185.html');

  const { status, out } = check(r.dir);
  assert.equal(status, 1, 'a genuinely new emoji must not ride in behind the baseline');
  assert.match(out, /mi-dia-v185\.html/);
});

test('the refusal names the build the baseline came from', () => {
  const r = repo();
  seedWithBuild(r);

  write(r.dir, 'src/mi-dia-v185.html', `${v184}\n<p>${BUTTERFLY} gradina</p>`);
  r.git('add', 'src/mi-dia-v185.html');

  // A reader who sees a refusal and cannot tell which comparison produced it reaches for
  // --no-verify. Kept apart from the refusal above, so that rewording the report cannot fail
  // the test whose name promises a new emoji is stopped.
  assert.match(check(r.dir).out, /compared against src\/mi-dia-v184\.html/);
});

test('a new build that introduces an em dash of its own is still refused', () => {
  const r = repo();
  const clean = ['<!doctype html>', '<p>no debt here</p>'].join('\n');
  seedWithBuild(r, 'src/mi-dia-v184.html', clean);

  write(r.dir, 'src/mi-dia-v185.html', `${clean}\n<p>o pauza${EM_DASH}si inca una</p>`);
  r.git('add', 'src/mi-dia-v185.html');

  assert.equal(check(r.dir).status, 1);
});

test('the first build in the repository has no baseline, so it stays fully gated', () => {
  const r = repo();
  write(r.dir, 'README.md', 'nothing to do with builds');
  r.git('add', 'README.md');
  r.git('commit', '-q', '-m', 'a history that carries no build');

  write(r.dir, 'src/mi-dia-v001.html', v184);
  r.git('add', 'src/mi-dia-v001.html');

  const { status } = check(r.dir);
  assert.equal(status, 1, 'a baseline that cannot be established is not a reason to wave a file through');
});

test('the baseline is picked as a number, not as text', () => {
  const r = repo();
  // Sorted as text, v9 and v99 both sit ABOVE v100, so a lexical comparison finds no predecessor
  // at all and gates the whole file. The successor here is identical to v99 and must be accepted.
  const nine = ['<!doctype html>', `<p>${SEEDLING}</p>`].join('\n');
  const ninetyNine = `${nine}\n<p>${BUTTERFLY}</p>`;
  seedWithBuild(r, 'src/mi-dia-v9.html', nine);
  seedWithBuild(r, 'src/mi-dia-v99.html', ninetyNine);

  write(r.dir, 'src/mi-dia-v100.html', ninetyNine);
  r.git('add', 'src/mi-dia-v100.html');

  const { status, out } = check(r.dir);
  assert.equal(status, 0, `v99 is the predecessor of v100, not v9:\n${out}`);
});

test('an ordinary file still cannot add an emoji', () => {
  const r = repo();
  seedWithBuild(r);

  write(r.dir, 'docs/note.md', `a note with ${BUTTERFLY} in it`);
  r.git('add', 'docs/note.md');

  const { status, out } = check(r.dir);
  assert.equal(status, 1);
  assert.match(out, /docs\/note\.md/);
  assert.doesNotMatch(out, /compared against/, 'only a build gets a baseline');
});

test('a build edited in place is measured the ordinary way', () => {
  const r = repo();
  const clean = ['<!doctype html>', '<p>no debt here</p>'].join('\n');
  seedWithBuild(r, 'src/mi-dia-v184.html', clean);

  // Against the versioning law, but the check must not become the hole that lets it through.
  write(r.dir, 'src/mi-dia-v184.html', `${clean}\n<p>${BUTTERFLY}</p>`);
  r.git('add', 'src/mi-dia-v184.html');

  assert.equal(check(r.dir).status, 1);
});

test('a merge still carries work authored elsewhere through untouched', () => {
  const r = repo();
  seedWithBuild(r);
  fs.writeFileSync(path.join(r.dir, '.git', 'MERGE_HEAD'), r.git('rev-parse', 'HEAD'));

  write(r.dir, 'docs/note.md', `a note with ${BUTTERFLY} in it`);
  r.git('add', 'docs/note.md');

  assert.equal(check(r.dir).status, 0);
});

// ---------------------------------------------------------------------------------------------
// Directions the baseline could fail open, probed one at a time. The claim in the pull request was
// once "fails closed in every direction I could find", written after four cases. These are the
// four that were missing, turned into tests so the claim is a list rather than a feeling.

test('a version written with leading zeros finds no predecessor, so it stays gated', () => {
  const r = repo();
  const clean = ['<!doctype html>', '<p>no debt</p>'].join('\n');
  seedWithBuild(r, 'src/mi-dia-v12.html', clean);

  // v0012 parses to 12, which is not strictly below 12, so v12 is refused as a baseline and the
  // whole file is measured. Closed, not open: a name this repository does not use must not become
  // a way to inherit a baseline it did not earn.
  write(r.dir, 'src/mi-dia-v0012.html', `${clean}\n<p>${BUTTERFLY}</p>`);
  r.git('add', 'src/mi-dia-v0012.html');

  assert.equal(check(r.dir).status, 1);
});

test('two builds staged in one commit are each measured against the last committed one', () => {
  const r = repo();
  const clean = ['<!doctype html>', '<p>no debt</p>'].join('\n');
  seedWithBuild(r, 'src/mi-dia-v184.html', clean);

  // v185 is not in HEAD, so it cannot serve as v186's baseline. Both fall back to v184, which is
  // the conservative answer: a mark introduced by v185 cannot launder itself through v186.
  write(r.dir, 'src/mi-dia-v185.html', `${clean}\n<p>${BUTTERFLY}</p>`);
  write(r.dir, 'src/mi-dia-v186.html', `${clean}\n<p>${BUTTERFLY}</p>`);
  r.git('add', 'src/mi-dia-v185.html', 'src/mi-dia-v186.html');

  const { status, out } = check(r.dir);
  assert.equal(status, 1);
  assert.match(out, /mi-dia-v185\.html/);
  assert.match(out, /mi-dia-v186\.html/);
});

test('a build that moves to another directory finds no predecessor, so it stays gated', () => {
  const r = repo();
  const clean = ['<!doctype html>', '<p>no debt</p>'].join('\n');
  seedWithBuild(r, 'src/mi-dia-v184.html', `${clean}\n<p>${SEEDLING}</p>`);

  // The lookup is scoped to the folder the build lands in. Moving builds to another directory
  // therefore costs one fully gated commit. That is a known limitation, recorded here rather than
  // left for somebody to discover at the moment it blocks them.
  write(r.dir, 'public/mi-dia-v185.html', `${clean}\n<p>${SEEDLING}</p>`);
  r.git('add', 'public/mi-dia-v185.html');

  assert.equal(check(r.dir).status, 1, 'no baseline in the new folder means no baseline at all');
});

// ---------------------------------------------------------------------------------------------
// The gate, not the checker. Everything above runs the checker directly. The thing that actually
// stands between a mark and the repository is a shell script that runs two other checks first and
// then hands over to node, and none of its wiring is exercised by calling the checker by hand.

function installRealHooks(dir) {
  const hooks = path.join(dir, '.githooks');
  fs.mkdirSync(hooks, { recursive: true });
  for (const name of ['pre-commit', 'check-emoji.mjs']) {
    const to = path.join(hooks, name);
    fs.copyFileSync(path.join(ROOT, '.githooks', name), to);
    fs.chmodSync(to, 0o755);
  }
  execFileSync('git', ['config', 'core.hooksPath', hooks], { cwd: dir, encoding: 'utf8' });
}

test('through the real hook, a build that only inherits is committed', () => {
  const r = repo();
  seedWithBuild(r);
  installRealHooks(r.dir);

  write(r.dir, 'src/mi-dia-v185.html', `${v184}\n<p>a blameless line</p>`);
  r.git('add', 'src/mi-dia-v185.html');
  r.git('commit', '-q', '-m', 'build: v185');

  assert.match(r.git('log', '--oneline', '-1'), /build: v185/);
});

test('through the real hook, a build that adds a mark leaves HEAD where it was', () => {
  const r = repo();
  seedWithBuild(r);
  installRealHooks(r.dir);
  const before = r.git('rev-parse', 'HEAD').trim();

  write(r.dir, 'src/mi-dia-v185.html', `${v184}\n<p>${BUTTERFLY} gradina</p>`);
  r.git('add', 'src/mi-dia-v185.html');

  const attempt = spawnSync('git', ['commit', '-m', 'build: v185'], { cwd: r.dir, encoding: 'utf8' });
  assert.notEqual(attempt.status, 0, 'the hook has to stop the commit, not just print');
  assert.equal(r.git('rev-parse', 'HEAD').trim(), before, 'HEAD must not move');
});
