// /ship — deterministic pre-flight validator for Mi Día (no dependencies, ESM).
//
// Covers the release traps that a machine can catch with certainty, so Pas 0
// (current state) and Pas 3 (after promote/bump) never ship broken/desynced code:
//   [1] Version SYNC   — sw.js CACHE ↔ index.html ↔ the mi-dia-vNN.html it was promoted from
//   [2] Syntax         — node --check on every <script> block in index.html
//   [3] DIV balance    — <div> opens == </div> closes (single-file app integrity)
//   [4] Smart quotes   — curly “ ” ‘ ’ inside HTML tags (break attributes) — WARN
//   [5] Docs drift      — CLAUDE.md "Current latest build" + CHANGELOG mention vNN — WARN
//   [6] Stale builds    — superseded mi-dia-v*.html still lying in the tree — WARN
//
// FAIL (exit 1) = never ship. WARN (exit 0) = tell Ines, don't block.
// Usage:  node .claude/skills/ship/validate.mjs   [repoRoot]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(here, '..', '..', '..'));

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ── [1] Version sync: sw.js CACHE → mi-dia-vNN.html → byte-identical index.html ──
let vNN = null; // e.g. "v141"
try {
  const sw = read('sw.js');
  const m = sw.match(/CACHE\s*=\s*["']mi-dia-(v\d+)["']/);
  if (!m) {
    fail('[1] sw.js: could not find `const CACHE = "mi-dia-vNN"`.');
  } else {
    vNN = m[1];
    const buildFile = `mi-dia-${vNN}.html`;
    console.log(`Detected version: mi-dia-${vNN}  (from sw.js CACHE)`);
    if (!exists('index.html')) {
      fail('[1] index.html is missing (the promoted build).');
    } else if (!exists(buildFile)) {
      fail(`[1] sw.js CACHE points to ${buildFile}, but that file does not exist in the tree.`);
    } else {
      const a = fs.readFileSync(path.join(ROOT, 'index.html'));
      const b = fs.readFileSync(path.join(ROOT, buildFile));
      if (!a.equals(b)) {
        fail(`[1] index.html is NOT byte-identical to ${buildFile} — promote is out of sync with sw.js CACHE.`);
      } else {
        console.log(`  [1] version sync OK: index.html == ${buildFile} == CACHE mi-dia-${vNN}`);
      }
    }
  }
} catch (e) {
  fail(`[1] version-sync check errored: ${e.message}`);
}

// Load index.html once for the structural checks.
let html = '';
try {
  html = read('index.html');
} catch {
  fail('[2/3] cannot read index.html for syntax/div checks.');
}

if (html) {
  // ── [2] node --check every <script> block ──
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  console.log(`  [2] script blocks: ${scripts.length}`);
  scripts.forEach((src, i) => {
    const tmp = path.join(os.tmpdir(), `midia_ship_${process.pid}_${i}.js`);
    fs.writeFileSync(tmp, src);
    try {
      execFileSync('node', ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      fail(`[2] script block ${i}: SYNTAX ERROR\n${(e.stdout || '') + (e.stderr || '')}`);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  // ── [3] DIV balance (ignore markup inside <style>/<script>) ──
  const body = html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '');
  const opens = (body.match(/<div\b/g) || []).length;
  const closes = (body.match(/<\/div>/g) || []).length;
  console.log(`  [3] DIV balance: ${opens}/${closes}`);
  if (opens !== closes) fail(`[3] DIV imbalance: ${opens} <div> vs ${closes} </div>.`);

  // ── [4] Smart/curly quotes inside HTML tags (attribute breakers) — WARN ──
  // Only inspect tag interiors, not visible text (curly quotes in copy are fine).
  const tagText = body.replace(/<style[\s\S]*?<\/style>/g, '');
  let curly = 0;
  for (const tag of tagText.match(/<[^>]+>/g) || []) {
    if (/[“”‘’]/.test(tag)) curly++;
  }
  if (curly) warn(`[4] ${curly} HTML tag(s) contain smart/curly quotes (“ ” ‘ ’) — may break attributes.`);
}

// ── [5] Docs drift — WARN (docs shouldn't hard-block a ship) ──
if (vNN) {
  try {
    const claude = read('CLAUDE.md');
    const cm = claude.match(/Current latest build:\s*\*\*`mi-dia-(v\d+)\.html`\*\*/);
    if (!cm) warn('[5] CLAUDE.md: "Current latest build" line not found — update it before commit.');
    else if (cm[1] !== vNN) warn(`[5] CLAUDE.md says latest build is ${cm[1]}, but you are shipping ${vNN}.`);
  } catch { warn('[5] CLAUDE.md not readable.'); }

  try {
    const changelog = read('CHANGELOG.md');
    if (!new RegExp(`\\b${vNN}\\b`).test(changelog)) {
      warn(`[5] CHANGELOG.md has no mention of ${vNN} — add its entry before commit.`);
    }
  } catch { warn('[5] CHANGELOG.md not readable.'); }
}

// ── [6] Stale superseded builds still in the tree — WARN (working-tree rule) ──
if (vNN) {
  const cur = parseInt(vNN.slice(1), 10);
  const stale = fs.readdirSync(ROOT)
    .filter((f) => /^mi-dia-v\d+\.html$/.test(f))
    .filter((f) => parseInt(f.match(/v(\d+)/)[1], 10) < cur);
  if (stale.length) {
    warn(`[6] Superseded build(s) still present (git rm at commit, keep only mi-dia-${vNN}.html + index.html):\n      ${stale.join(', ')}`);
  }
}

// ── Report ──
console.log('');
for (const w of warns) console.log(`WARN  ${w}`);
for (const f of fails) console.log(`FAIL  ${f}`);
console.log(`\n${fails.length ? '✗' : '✓'}  FAIL: ${fails.length}   WARN: ${warns.length}`);
process.exit(fails.length ? 1 : 0);
