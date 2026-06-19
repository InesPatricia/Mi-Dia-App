// Automates the "CRITICAL: validation after every edit" rule from CLAUDE.md:
//   1) the single-file app's <div> tags balance, and
//   2) every <script> block parses (node --check).
// Runs against ../index.html by default (the promoted build); pass a path to check another.
// Exits non-zero on failure so CI can gate on it.   Usage: node validate-build.js [file]
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const html = fs.readFileSync(target, 'utf8');
let ok = true;

// 1) DIV balance (ignore markup inside <style>/<script>)
const body = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
const opens = (body.match(/<div\b/g) || []).length;
const closes = (body.match(/<\/div>/g) || []).length;
console.log(`DIV balance: ${opens}/${closes} -> ${opens === closes ? 'OK' : 'MISMATCH'}`);
if (opens !== closes) ok = false;

// 2) node --check each <script> block
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
console.log(`Script blocks: ${scripts.length}`);
scripts.forEach((src, i) => {
  const tmp = path.join(os.tmpdir(), `midia_check_${process.pid}_${i}.js`);
  fs.writeFileSync(tmp, src);
  try {
    cp.execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
    console.log(`  script ${i}: OK`);
  } catch (e) {
    ok = false;
    console.log(`  script ${i}: SYNTAX ERROR\n${e.stdout || ''}${e.stderr || ''}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

console.log(ok ? `\n✓ ${path.basename(target)} valid` : `\n✗ ${path.basename(target)} INVALID`);
process.exit(ok ? 0 : 1);
