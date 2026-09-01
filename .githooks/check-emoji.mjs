// Refuses emoji at the git boundary, for every commit, whoever makes it.
//
//   --message <file>   the commit message: no emoji, no em dash
//   --staged           lines being ADDED by this commit: no emoji, no em dash (a ratchet)
//
// A newly added build, mi-dia-vNN.html, is measured against the build it succeeds rather than
// against nothing, because the versioning law writes every change as a new file and a new file
// has no line that is not an added line. Without that baseline the ratchet reads inherited debt
// as fresh debt and refuses the build outright. See buildLineage() below.
//
// A ratchet rather than a sweep. This repository already carries emoji in the app builds, in the
// build log and in the tooling that prints them to a terminal. Blocking those outright would stop
// the next build from being committed at all, so the check only refuses NEW ones and leaves the
// existing ones for a decision of their own.
//
// EM DASHES: the standing rule is zero, everywhere that gets published, and that includes product
// copy shown to a user. An earlier version of this file checked them in the commit message only,
// on the reasoning that "source is not prose written by hand". That reasoning is wrong for this
// repository: its source carries documentation, agent skills and the app's own interface copy in
// three languages, all of which are prose. The ratchet now covers added lines too.
//
// KNOWN DEBT, and the plan for it. The existing em dashes were counted on 2026-08-20:
//
//     public/index.html   300   of which 178 sit in the i18n tables, roughly 59 distinct strings
//                               written three times over for ro / es / en, and 72 in comments
//     docs/*.md           511
//     CHANGELOG.md         29
//     CLAUDE.md             7
//     README.md             0
//
// The 59 interface strings are the only ones a user ever sees, and they are NOT a mechanical
// find-and-replace, because two different jobs share the character. Most are punctuation in the
// middle of a sentence, where a comma replaces it and nobody notices. Some are a decorative marker
// opening a short label, where deleting it leaves a stray leading space and a worse-looking result,
// so each of those needs a decision rather than a substitution. To see both shapes, search
// public/index.html for U+2014 inside the `ro:` / `es:` / `en:` entries.
//
// (This file quotes neither shape on purpose. It carried no literal U+2014 before this change and
// still carries none: a file that refuses a character has no business containing it, and the
// constant below is built from its code point for exactly that reason.)
//
// That pass is deliberately not folded into this change. It is an editorial job on product copy in
// three languages, it belongs in its own reviewable diff, and doing it under the pressure of a
// blocked commit is how a design detail gets lost. Until it happens, expect this hook to refuse an
// edit to any OLD line that still contains one. That is not a bug in the hook. It is the debt
// asking to be paid, and the failure message says so.
//
// It is a guard, not a prison: `git commit --no-verify` bypasses it, deliberately, for the same
// reason the privacy check in pre-commit says so.

import { readFileSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';

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

function gitOut(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 });
}

// Scan a diff for added lines carrying a mark, and file them under the path they belong to.
//
// `fixedPath` names the file when the diff has no usable header, which is the case for the
// blob-to-blob diff the build pass uses: its header carries object ids, not paths.
// `skip` names paths this pass must leave alone, because another pass is measuring them better.
function collect(diffText, offenders, fixedPath, skip) {
  let path = fixedPath || '(unknown)';

  for (const line of diffText.split('\n')) {
    if (!fixedPath && line.startsWith('+++ b/')) {
      path = line.slice(6);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (skip && skip.has(path)) continue;

    const body = line.slice(1);
    const emoji = emojiIn(body);
    const dash = body.includes(EM_DASH);
    if (!emoji.length && !dash) continue;

    if (!offenders.has(path)) {
      offenders.set(path, { marks: new Set(), sample: body.trim().slice(0, 70), count: 0 });
    }
    const entry = offenders.get(path);
    emoji.forEach((e) => entry.marks.add(e));
    if (dash) entry.marks.add(EM_DASH);
    entry.count += 1;
  }
}

// THE BUILD LINEAGE, and why it has to exist.
//
// A build is never edited in place. The versioning law says every change writes a NEW file,
// mi-dia-vNN.html, so the previous one survives as a rollback point. That law and a per-line ratchet
// contradict each other: in a brand new file every line is an added line, so every mark the build
// merely inherited reads as one the commit is introducing. v185 was refused over thirty emoji, all
// thirty of which were already sitting in the committed v184, unchanged. The header of this file
// says the check exists so that it would not "stop the next build from being committed at all", and
// that is precisely what it did.
//
// The fault is in the baseline, not in the rule. A diff line is only a measure of novelty when the
// file has a history to be new against. So a newly added build is measured against the build it
// succeeds. What it introduces is still refused. What it carries forward is not.
//
// Same class as the merge carve-out above: the line is new HERE, and the content is not new to the
// repository.
const BUILD_PREFIX = 'mi-dia-v';
const BUILD_SUFFIX = '.html';

function buildVersion(path) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (!name.startsWith(BUILD_PREFIX) || !name.endsWith(BUILD_SUFFIX)) return null;
  const digits = name.slice(BUILD_PREFIX.length, name.length - BUILD_SUFFIX.length);
  if (!digits.length) return null;
  for (const ch of digits) if (ch < '0' || ch > '9') return null;
  return Number(digits);
}

// The highest-numbered build already committed that sits below this one. Compared as numbers, not
// as text: sorted as text, v99 lands above v100 and the baseline would walk backwards.
function previousBuild(path, version) {
  const cut = path.lastIndexOf('/');
  const dir = cut === -1 ? '.' : path.slice(0, cut);
  let listing;
  try {
    listing = gitOut(['ls-tree', '-r', '--name-only', 'HEAD', '--', dir]);
  } catch {
    return null;
  }
  let best = null;
  for (const raw of listing.split('\n')) {
    const candidate = raw.trim();
    if (!candidate) continue;
    const other = buildVersion(candidate);
    if (other === null || other >= version) continue;
    if (!best || other > best.version) best = { path: candidate, version: other };
  }
  return best;
}

// Only files this commit ADDS are eligible. A build edited in place is a violation of the
// versioning law and not this check's business, and its ordinary diff is already the right one.
function buildLineage() {
  const lineage = new Map();
  let added;
  try {
    added = gitOut(['diff', '--cached', '--name-only', '--diff-filter=A', '-z']);
  } catch {
    return lineage;
  }

  for (const path of added.split('\0')) {
    if (!path) continue;
    const version = buildVersion(path);
    if (version === null) continue;

    const previous = previousBuild(path, version);
    // The first build in the repository has nothing to be measured against, so it stays fully
    // gated. A baseline that could not be established is not a reason to wave the file through.
    if (!previous) continue;

    try {
      const before = gitOut(['rev-parse', `HEAD:${previous.path}`]).trim();
      const after = gitOut(['rev-parse', `:${path}`]).trim();
      lineage.set(path, {
        previous: previous.path,
        diff: gitOut(['diff', '-U0', before, after]),
      });
    } catch {
      // One of the two blobs would not read. Leave the file to the ordinary pass rather than
      // letting it through: a baseline we failed to build is not a baseline.
    }
  }
  return lineage;
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

  const lineage = buildLineage();

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

  // The ordinary pass, over everything the lineage pass is not taking.
  collect(diff, offenders, null, new Set(lineage.keys()));

  // The build pass. Each of these is diffed against the build it succeeds rather than against
  // nothing, so only what the new build introduces is counted.
  for (const [path, entry] of lineage) collect(entry.diff, offenders, path, null);

  if (offenders.size) {
    const report = [...offenders].map(([name, e]) => {
      const against = lineage.has(name) ? `, compared against ${lineage.get(name).previous}` : '';
      return `  ${name}\n      ${[...e.marks].join(' ')}   in ${e.count} added line(s)${against}\n      first: ${e.sample}`;
    });

    // A ratchet only stops the bleeding, so the message has to explain why an untouched old line can
    // still block an edit. Someone rewording a sentence that has carried an em dash since 2025 needs
    // to know the answer is to remove it, not to reach for --no-verify.
    fail([
      'pre-commit: this commit adds emoji or em dashes to tracked files.',
      '',
      ...report,
      '',
      'Lines already committed are left alone; this only stops new ones. Editing an old',
      'line counts as adding it, so a line that already carried one has to lose it now.',
      '',
      'Replace an emoji with a word. Replace an em dash with a comma, a semicolon, or a',
      'rewrite. See the header of this file for the known debt and why it is not swept.',
    ]);
  }
  process.exit(0);
}

process.exit(0);
