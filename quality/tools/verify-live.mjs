#!/usr/bin/env node
/**
 * verify-live — check a claim against the place it is actually served.
 *
 * Written after a day in which the same mistake was made four times: something looked correct
 * locally, and was wrong where it runs.
 *
 *   a mermaid diagram rendered on mermaid 10 and 11, and GitHub stripped the HTML in its labels,
 *   fusing the words — the diagram still drew, so nothing looked broken
 *
 *   four README links pointed at files that existed in the repository, and 404'd as links, because
 *   GitHub resolves a link literally, relative to the file it sits in
 *
 *   every path on a Cloudflare Pages site answered 200, including ones that are not published,
 *   because unknown paths fall back to the app — the status code proved nothing
 *
 * The common cause is checking the wrong thing: local rendering instead of the real renderer, a
 * status code instead of a body. This script checks the right one.
 *
 *   node quality/tools/verify-live.mjs --page <url>
 *       Loads the page in a real browser. Reports render errors, counts rendered diagrams, and
 *       probes every relative link on it.
 *
 *   node quality/tools/verify-live.mjs --site <url> --hidden <path,path,...>
 *       Confirms each path is NOT published, by comparing bodies rather than status codes.
 *
 * Exit: 0 everything checks out · 1 anything did not.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
let chromium;
try {
  // playwright lives with the test harness, one directory over
  const req = createRequire(join(HERE, '..', 'e2e', 'package.json'));
  ({ chromium } = req('playwright'));
} catch {
  console.error('verify-live: playwright not found. Run `npm ci` in quality/e2e first.');
  process.exit(2);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

const pageUrl = flag('--page');
const siteUrl = flag('--site');
const hidden = (flag('--hidden') || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!pageUrl && !siteUrl) {
  console.error('usage: verify-live.mjs --page <url> | --site <url> --hidden <path,path>');
  process.exit(2);
}

let problems = 0;
const bad = (msg) => { problems++; console.log(`  FAIL  ${msg}`); };
const ok = (msg) => console.log(`  ok    ${msg}`);

// ---------------------------------------------------------------- a rendered page

/**
 * GitHub renders markdown — and mermaid — client side, so the only faithful check is a browser.
 * Local mermaid does not reproduce it: it accepts HTML in labels that GitHub silently strips.
 */
async function checkPage(url) {
  console.log(`\npage: ${url}\n`);
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

  try {
    await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch (err) {
    await browser.close();
    // "could not reach it" and "it is broken" are different answers, and only one is about the page
    return bad(`could not load the page: ${String(err.message).split('\n')[0]}`);
  }
  await tab.waitForTimeout(10000); // client-side rendering, including diagrams

  const state = await tab.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      renderError: text.includes('Unable to render rich display'),
      // a label whose spacing was eaten shows up as two words fused across a full stop
      fusedLabel: /\.(md|mjs|js|html)[a-z]{3,}/.test(text),
      diagrams: document.querySelectorAll('svg[aria-roledescription]').length,
      links: [...new Set(
        [...document.querySelectorAll('article a[href], .markdown-body a[href]')]
          .map((a) => a.href)
          .filter((h) => h && !h.includes('#') && new URL(h).origin === location.origin),
      )],
    };
  });

  await browser.close();

  state.renderError
    ? bad('the page shows "Unable to render rich display"')
    : ok('no render error');

  state.fusedLabel
    ? bad('a label looks fused (e.g. "DATA_SCHEMA.mdwhat is stored") — HTML in a mermaid label')
    : ok('no fused labels');

  ok(`${state.diagrams} diagram(s) rendered`);

  let dead = 0;
  for (const href of state.links) {
    const res = await fetch(href, { method: 'HEAD' }).catch(() => null);
    if (!res || res.status !== 200) {
      dead++;
      bad(`link ${res ? res.status : 'unreachable'}: ${href}`);
    }
  }
  if (!dead) ok(`${state.links.length} link(s), all resolve`);
  else problems += 0; // already counted per link
}

// ---------------------------------------------------------------- a served site

/**
 * A static host can answer 200 for a path it does not serve, by falling back to the app. Compare
 * bodies: if the response is the app's HTML, the file is not published; if it is the file, it is.
 */
async function checkSite(url, paths) {
  console.log(`\nsite: ${url}\n`);
  const base = url.replace(/\/+$/, '');

  const home = await fetch(base).then((r) => r.text()).catch(() => null);
  if (home === null) return bad(`cannot reach ${base}`);
  const fingerprint = home.slice(0, 200);
  ok('the site answers');

  for (const p of paths) {
    const target = `${base}/${p.replace(/^\/+/, '')}`;
    const res = await fetch(target).catch(() => null);
    if (!res) { bad(`${p}: unreachable`); continue; }
    const body = await res.text();
    // served as the app's fallback → not published, which is what we want
    body.slice(0, 200) === fingerprint
      ? ok(`${p} is not published (falls back to the app)`)
      : bad(`${p} IS published — ${res.status}, ${body.length} bytes of something else`);
  }
}

if (pageUrl) await checkPage(pageUrl);
if (siteUrl) await checkSite(siteUrl, hidden);

console.log(`\n${problems ? `FAILED — ${problems} problem(s)` : 'OK — verified where it actually runs'}`);
process.exit(problems ? 1 : 0);
