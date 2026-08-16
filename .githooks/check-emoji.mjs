// Refuses emoji at the git boundary, for every commit, whoever makes it.
//
//   --message <file>   the commit message: no emoji, no em dash
//   --staged           lines being ADDED by this commit: no emoji (a ratchet, existing lines stay)
//
// A ratchet rather than a sweep. This repository already carries emoji in the app builds, in the
// build log and in the tooling that prints them to a terminal. Blocking those outright would stop
// the next build from being committed at all, so the check only refuses NEW ones and leaves the
// existing ones for a decision of their own.
//
// Em dashes are checked in the message only, never in source. A commit message is prose written by
// hand; source is not.
//
// It is a guard, not a prison: `git commit --no-verify` bypasses it, deliberately, for the same
// reason the privacy check in pre-commit says so.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EM_DASH = String.fromCharCode(0x2014);
const LEGACY_SYMBOLS = /[©®™]/gu;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const EMOJI_MARKS = /[\u{FE0F}\u{20E3}]/u;

const isEmoji = (ch) => PICTOGRAPHIC.test(ch) || EMOJI_MARKS.test(ch);

function emojiIn(text) {
  const stripped = text.replace(LEGACY_SYMBOLS, '');
  return [...new Set([...stripped].filter(isEmoji))];
}

function inProgress(ref) {
  try {
    execSync(`git rev-parse -q --verify ${ref}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function fail(lines) {
  process.stderr.write(`\n${lines.join('\n')}\n\n`);
  process.stderr.write('If this is genuinely wrong, `git commit --no-verify` skips the check.\n\n');
  process.exit(1);
}

const mode = process.argv[2];

if (mode === '--message') {
  const path = process.argv[3];
  if (!path) process.exit(0);

  // Strip the comment block git appends; it is not part of the message.
  const message = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');

  const found = [];
  const emoji = emojiIn(message);
  if (emoji.length) found.push(`emoji: ${emoji.join(' ')}`);
  if (message.includes(EM_DASH)) found.push('em dash (U+2014)');

  if (found.length) {
    fail([
      `commit-msg: this message carries ${found.join(' and ')}.`,
      '',
      'Everything that lands in git is written without emoji or em dashes.',
      'Rewrite the message and commit again.',
    ]);
  }
  process.exit(0);
}

if (mode === '--staged') {
  // A merge, a cherry-pick and a revert all carry lines authored somewhere else, on a branch where
  // this same check already ran. Every added line of the incoming side reads as new here, so
  // gating them would refuse work nobody is writing at this commit. Reconciling main into staging
  // hit exactly that: the eval tooling prints emoji to a terminal, and the merge that brought it
  // across was refused.
  if (inProgress('MERGE_HEAD') || inProgress('CHERRY_PICK_HEAD') || inProgress('REVERT_HEAD')) {
    process.exit(0);
  }

  let diff;
  try {
    diff = execSync('git diff --cached -U0 --diff-filter=ACMR', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 256,
    });
  } catch {
    process.exit(0); // No index, or git said no. Never block on our own failure.
  }

  const offenders = new Map();
  let file = '(unknown)';

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;

    const emoji = emojiIn(line.slice(1));
    if (!emoji.length) continue;

    if (!offenders.has(file)) {
      offenders.set(file, { emoji: new Set(), sample: line.slice(1).trim().slice(0, 70), count: 0 });
    }
    const entry = offenders.get(file);
    emoji.forEach((e) => entry.emoji.add(e));
    entry.count += 1;
  }

  if (offenders.size) {
    const report = [...offenders].map(
      ([name, e]) =>
        `  ${name}\n      ${[...e.emoji].join(' ')}   in ${e.count} added line(s)\n      first: ${e.sample}`,
    );

    fail([
      'pre-commit: this commit adds emoji to tracked files.',
      '',
      ...report,
      '',
      'Lines already committed are left alone; this only stops new ones.',
      'Replace them with a word.',
    ]);
  }
  process.exit(0);
}

process.exit(0);
