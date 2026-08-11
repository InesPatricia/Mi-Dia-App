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
let warnings = 0;
const bad = (msg) => { problems++; console.log(`  FAIL  ${msg}`); };
// Something true and worth saying that nobody can fix by changing this repository. It is reported
// and it does not turn the run red, because a check that goes red over something you cannot act on
// teaches you to stop reading it.
const warn = (msg) => { warnings++; console.log(`  warn  ${msg}`); };
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
    // Scope both checks to where the failure actually appears. Looking at the whole page makes any
    // document that *describes* these failures — the runbook does — fail its own check.
    const renderTargets = [...document.querySelectorAll(
      '[data-type="mermaid"], .js-render-target, .render-container',
    )];
    const renderedText = renderTargets.map((c) => c.innerText || '').join(' ');

    return {
      renderError: renderTargets.some((c) => (c.innerText || '').includes('Unable to render rich display')),
      // a label whose spacing was eaten shows up as two words fused across a full stop
      fusedLabel: /\.(md|mjs|js|html)[a-z]{3,}/.test(renderedText),
      // count what should render and what did: a bare count of SVGs cannot tell zero-diagrams
      // from a diagram that failed, and "0 rendered" reads as fine
      diagramBlocks: document.querySelectorAll(
        'pre[lang="mermaid"], .highlight-source-mermaid, [data-lang="mermaid"]',
      ).length,
      diagramsRendered: [...document.querySelectorAll(
        '[data-type="mermaid"], .js-render-target, .render-container',
      )].filter((c) => c.querySelector('svg')).length,
      links: [...new Set(
        [...document.querySelectorAll('article a[href], .markdown-body a[href]')]
          .map((a) => a.href)
          .filter((h) => h && !h.includes('#') && new URL(h).origin === location.origin),
      )],
    };
  });

  // GitHub's mermaid rendering is intermittent: the same page can fail once and render on reload.
  // A check that cries wolf gets ignored, so a render error is confirmed before it is reported.
  if (state.renderError) {
    await tab.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await tab.waitForTimeout(12000);
    const again = await tab.evaluate(() =>
      [...document.querySelectorAll('[data-type="mermaid"], .js-render-target, .render-container')]
        .some((c) => (c.innerText || '').includes('Unable to render rich display')),
    );
    again
      ? bad('the page shows "Unable to render rich display" — twice, so it is real')
      : ok('a render error appeared once and not on reload — GitHub\'s renderer is intermittent');
  } else {
    ok('no render error');
  }

  await browser.close();

  state.fusedLabel
    ? bad('a label looks fused (e.g. "DATA_SCHEMA.mdwhat is stored") — HTML in a mermaid label')
    : ok('no fused labels');

  if (state.diagramBlocks === 0) ok('no diagrams on this page');
  else if (state.diagramsRendered < state.diagramBlocks) {
    bad(`${state.diagramsRendered} of ${state.diagramBlocks} diagram(s) rendered — the rest failed silently`);
  } else ok(`${state.diagramsRendered} of ${state.diagramBlocks} diagram(s) rendered`);

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

/** How much longer a cached copy has to live, from its own headers. Null when it does not say. */
function cacheLifeLeft(res) {
  const cc = res.headers.get('cache-control') ?? '';
  const ttl = Number(/s-maxage=(\d+)/.exec(cc)?.[1] ?? /max-age=(\d+)/.exec(cc)?.[1]);
  const age = Number(res.headers.get('age'));
  if (!Number.isFinite(ttl) || !Number.isFinite(age)) return null;
  return Math.max(0, ttl - age);
}

/**
 * A static host can answer 200 for a path it does not serve, by falling back to the app. Compare
 * bodies: if the response is the app's HTML, the file is not published; if it is the file, it is.
 *
 * Every path is asked twice, because "this file is reachable" has two completely different causes
 * and only one of them is a defect in this repository.
 *
 *   the ORIGIN, asked with a query string the CDN has never seen, so the request cannot be served
 *   from cache. This is the boundary the repo actually controls: what public/ contains and what
 *   wrangler.toml points at. If a file shows up here, a change broke the boundary → FAIL.
 *
 *   the EDGE, asked plainly. A file can still be served from a copy cached before it was withdrawn,
 *   under a TTL that nothing in this repository can shorten. Removing a file from the origin does
 *   not unpublish it. That is real, worth saying, and worth saying with a date attached → warn.
 *
 * The distinction is the one this project applies everywhere else: a gate blocks, a net observes.
 * Failing the run over a remnant that expires on its own would train everyone to ignore the check,
 * and then it would also be ignored on the day the boundary genuinely breaks.
 */
async function checkSite(url, paths) {
  console.log(`\nsite: ${url}\n`);
  const base = url.replace(/\/+$/, '');

  const home = await fetch(base).then((r) => r.text()).catch(() => null);
  if (home === null) return bad(`cannot reach ${base}`);
  const fingerprint = home.slice(0, 200);
  const isFallback = (body) => body.slice(0, 200) === fingerprint;
  ok('the site answers');

  for (const p of paths) {
    const target = `${base}/${p.replace(/^\/+/, '')}`;

    const fresh = await fetch(`${target}?cache-bust=${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .catch(() => null);
    if (!fresh) { bad(`${p}: unreachable`); continue; }
    if (!isFallback(await fresh.text())) {
      bad(`${p} IS published by the origin — ${fresh.status}. The public/ boundary is broken.`);
      continue;
    }

    const cached = await fetch(target).catch(() => null);
    if (!cached) { bad(`${p}: unreachable without the cache-buster`); continue; }
    if (isFallback(await cached.text())) {
      ok(`${p} is not published`);
      continue;
    }

    const left = cacheLifeLeft(cached);
    const when = left === null ? 'unknown remaining lifetime' : `about ${Math.ceil(left / 3600)}h left`;
    warn(
      `${p} still answers from the CDN cache (${cached.headers.get('cf-cache-status') ?? 'cached'}, ` +
        `${when}). The origin is correct; this is a copy taken before the file was withdrawn. ` +
        `Purge it if the domain is one you can purge, or let it expire.`,
    );
  }
}

if (pageUrl) await checkPage(pageUrl);
if (siteUrl) await checkSite(siteUrl, hidden);

const tail = warnings ? ` (${warnings} warning(s), nothing this repository can fix)` : '';
console.log(`\n${problems ? `FAILED — ${problems} problem(s)` : 'OK — verified where it actually runs'}${tail}`);

// Set the code and let node drain, rather than calling process.exit(). Exiting while the browser
// transport and the link probes are still closing aborts libuv mid-teardown, and on Windows that
// surfaced as an assertion failure and exit 127 — a run that had just reported OK looking like a
// failure, intermittently. The exit code is the only thing CI reads, so it has to be the one earned.
process.exitCode = problems ? 1 : 0;
