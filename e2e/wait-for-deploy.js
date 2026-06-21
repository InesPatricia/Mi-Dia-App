// Wait until the LIVE site serves the build we just merged, then let the smoke suite run.
//
// Cloudflare Pages deploys asynchronously and separately from GitHub Actions, so right after a
// push to main the live URL can still serve the previous build for a short while. This poller
// reads the expected CACHE constant from the repo's sw.js (the just-merged value) and polls the
// live /sw.js until it matches — or fails after a timeout, so a stuck/failed deploy is loud.
//
// Node 18+ (global fetch). Run from e2e/ (so ../sw.js resolves to the repo-root service worker).
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROD_URL || 'https://mi-dia-app.pages.dev';
const TIMEOUT_MS = Number(process.env.DEPLOY_WAIT_MS || 300000); // 5 min
const INTERVAL_MS = Number(process.env.DEPLOY_POLL_MS || 10000); // 10 s

function expectedCache() {
  const sw = fs.readFileSync(path.resolve(__dirname, '..', 'sw.js'), 'utf8');
  const m = sw.match(/CACHE\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('Could not find a CACHE constant in ../sw.js');
  return m[1];
}

async function liveCache() {
  const res = await fetch(`${BASE}/sw.js?cb=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const m = (await res.text()).match(/CACHE\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

(async () => {
  const want = expectedCache();
  const deadline = Date.now() + TIMEOUT_MS;
  console.log(`Waiting for ${BASE} to serve CACHE="${want}" (timeout ${Math.round(TIMEOUT_MS / 1000)}s)...`);
  for (;;) {
    let got = null;
    try { got = await liveCache(); } catch (e) { /* transient network blip — keep polling */ }
    if (got === want) { console.log(`Live build is "${got}" — proceeding to smoke.`); return; }
    if (Date.now() > deadline) {
      console.error(`Timed out waiting for the deploy. Live CACHE="${got}", expected "${want}".`);
      process.exit(1);
    }
    console.log(`  live is "${got}" — retrying in ${Math.round(INTERVAL_MS / 1000)}s`);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
})();
