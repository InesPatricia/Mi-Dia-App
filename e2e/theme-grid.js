#!/usr/bin/env node
/*
 * theme-grid.js — the Theme-QA GRID for Mi Día (retro item 1).
 * Screenshots EVERY view in BOTH themes, so a human/agent can eyeball the whole app
 * light+dark in one place BEFORE claiming a theme change is done. Catches the class of
 * bugs we shipped reactively (invisible text on velvet, hardcoded light cards, module CSS).
 *
 * Usage:
 *   node theme-grid.js [htmlFile] [outDir]
 *     htmlFile : mi-dia-vNN.html to shoot (default: ../index.html)
 *     outDir   : where to write PNGs + index.html (default: ./theme-grid-out)
 *
 * Output: <outDir>/<view>-<theme>.png for all views × {light,dark}, plus an index.html
 * that lays them out as a light|dark side-by-side grid for fast review.
 */
const fs = require('fs');
const path = require('path');
const { shoot } = require('./shoot');

const VIEWS = ['day', 'journal', 'respiro', 'calendar', 'progress', 'projects', 'profile', 'settings'];
const THEMES = ['light', 'dark'];

(async () => {
  const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const outDir = path.resolve(process.argv[3] || path.join(__dirname, 'theme-grid-out'));
  fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(file)) { console.error('no such file: ' + file); process.exit(1); }

  console.log('theme-grid: ' + path.basename(file) + ' -> ' + outDir);
  for (const view of VIEWS) {
    for (const theme of THEMES) {
      const out = path.join(outDir, view + '-' + theme + '.png');
      await shoot({ file, out, view, theme });
      console.log('  ' + view + ' / ' + theme);
    }
  }

  // review page: one row per view, light | dark
  const rows = VIEWS.map((v) =>
    `<tr><th>${v}</th>` +
    THEMES.map((t) => `<td><div class=lbl>${t}</div><img src="${v}-${t}.png"></td>`).join('') +
    `</tr>`).join('\n');
  const html = `<!doctype html><meta charset=utf-8><title>Mi Día — theme-QA grid</title>
<style>body{font-family:system-ui;background:#222;color:#eee;margin:16px}
table{border-collapse:collapse}th{writing-mode:vertical-lr;padding:0 8px;color:#c8a24c}
td{padding:6px;vertical-align:top}img{width:300px;display:block;border:1px solid #444;border-radius:8px}
.lbl{font-size:12px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:.1em}
caption{font-size:20px;margin-bottom:12px;color:#e8d2a0}</style>
<table><caption>Theme-QA grid · ${path.basename(file)} · review EVERY view in BOTH themes</caption>
${rows}</table>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('\ngrid ready: ' + path.join(outDir, 'index.html'));
  console.log('REVIEW CHECKLIST (per view, per theme):');
  console.log('  [ ] no text invisible / low-contrast (esp. text on the hero PHOTO + on velvet)');
  console.log('  [ ] no card/pill still LIGHT on the dark page (or dark on light) — hardcoded hex leak');
  console.log('  [ ] module-injected CSS themed (persist.js banner .pb*, cycle.js .cy-tg/.cy-sw/.cy-setup-link)');
  console.log('  [ ] actions use the right role color (light=WINE, dark=GILT); functional colors legible on both bg');
  console.log('  [ ] flower labels still INSIDE their petals; petals blush (light) / velvet (dark)');
})();
