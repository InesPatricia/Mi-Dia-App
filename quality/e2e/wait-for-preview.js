// Wait until the Cloudflare Pages PREVIEW deployment for this PR's head commit is
// published, then let the smoke suite run against the branch-alias preview URL.
//
// Why this exists: this workflow originally listened for the GitHub `deployment_status`
// event, but the Cloudflare Pages integration stopped creating GitHub deployments — it
// now reports a check run named "Cloudflare Pages" instead, so the old trigger silently
// never fired (discovered by auditing the Actions history: zero runs ever). We now ask
// the GitHub API when that check run completes for HEAD_SHA, fail loudly if the deploy
// itself failed, and finally confirm the preview URL responds. Read-only GITHUB_TOKEN.
//
// Env: GITHUB_REPOSITORY, HEAD_SHA, GITHUB_TOKEN, PREVIEW_URL. Node 18+ (global fetch).
const REPO = process.env.GITHUB_REPOSITORY;
const SHA = process.env.HEAD_SHA;
const TOKEN = process.env.GITHUB_TOKEN;
const PREVIEW = process.env.PREVIEW_URL;
const TIMEOUT_MS = Number(process.env.PREVIEW_WAIT_MS || 420000); // 7 min: CF builds this site in ~1-2
const INTERVAL_MS = Number(process.env.PREVIEW_POLL_MS || 10000); // 10 s

if (!REPO || !SHA || !TOKEN || !PREVIEW) {
  console.error('Missing env: need GITHUB_REPOSITORY, HEAD_SHA, GITHUB_TOKEN, PREVIEW_URL.');
  process.exit(1);
}

async function pagesCheckRun() {
  const url = `https://api.github.com/repos/${REPO}/commits/${SHA}/check-runs?check_name=${encodeURIComponent('Cloudflare Pages')}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  return ((await res.json()).check_runs || [])[0] || null;
}

(async () => {
  const deadline = Date.now() + TIMEOUT_MS;
  console.log(`Waiting for the "Cloudflare Pages" check on ${SHA.slice(0, 7)} (timeout ${Math.round(TIMEOUT_MS / 1000)}s)...`);
  for (;;) {
    let run = null;
    try { run = await pagesCheckRun(); } catch (e) { /* transient network blip — keep polling */ }
    if (run && run.status === 'completed') {
      if (run.conclusion !== 'success') {
        console.error(`Cloudflare Pages deploy concluded "${run.conclusion}" — nothing to smoke.`);
        process.exit(1);
      }
      console.log('Cloudflare Pages deploy succeeded.');
      break;
    }
    if (Date.now() > deadline) {
      console.error(`Timed out: check run is ${run ? run.status : 'not created yet'}.`);
      process.exit(1);
    }
    console.log(`  check is ${run ? run.status : 'not created yet'} — retrying in ${Math.round(INTERVAL_MS / 1000)}s`);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  // Deploy done — confirm the branch-alias URL actually answers before handing off to
  // Playwright (the alias flip after a deploy is near-instant, but be loud, not flaky).
  for (;;) {
    try {
      const res = await fetch(`${PREVIEW}/?cb=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) { console.log(`Preview answers at ${PREVIEW} — proceeding to smoke.`); return; }
    } catch (e) { /* keep polling */ }
    if (Date.now() > deadline) {
      console.error(`Deploy succeeded but ${PREVIEW} did not answer in time.`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
})();
