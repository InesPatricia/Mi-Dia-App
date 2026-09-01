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
  assert.match(out, /compared against src\/mi-dia-v184\.html/);
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
