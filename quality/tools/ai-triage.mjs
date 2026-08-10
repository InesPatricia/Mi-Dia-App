// AI failure-triage agent for the e2e suite.
//
// WHAT IT DOES
//   When the e2e workflow fails on a pull request, this script (run by ai-triage.yml) reads two
//   things — the failing test output and the PR's diff — asks Claude to correlate them, and posts
//   a single comment on the PR with a likely cause, repro steps and the suspect file. A human
//   still decides; the agent just does the tedious read-and-correlate work in seconds.
//
// WHY IT IS "AGENTIC"
//   It PERCEIVES real artifacts (logs, diff), REASONS over them, and ACTS in the world (comments),
//   triggered by an event, with a human in the loop. That is a small but real autonomous agent.
//
// SECURITY MODEL (important)
//   It is launched from `workflow_run`, so it runs the version of this code on the DEFAULT branch,
//   never the PR's version. A hostile PR therefore cannot edit the agent to steal the API key or
//   abuse write permissions. Untrusted input (the PR) is processed by trusted code (from main).
//
// GRACEFUL BY DESIGN
//   No ANTHROPIC_API_KEY secret? It logs that and exits 0 — the agent is a helper, never a gate.
//   Any error is caught and the run still succeeds: a broken helper must not turn a PR red.
//
// Env in: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, ANTHROPIC_API_KEY (optional),
//         ANTHROPIC_MODEL (optional, default claude-sonnet-5). Node 18+ (global fetch).
import fs from 'node:fs';

const GH = 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY; // "owner/name"
const TOKEN = process.env.GITHUB_TOKEN;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// A helper is never allowed to fail the run. Log the reason and leave with success.
function bail(msg) {
  console.log(`ai-triage: ${msg} — skipping (this is a non-blocking helper).`);
  process.exit(0);
}

if (!KEY) bail('no ANTHROPIC_API_KEY secret set');
if (!TOKEN || !REPO || !process.env.GITHUB_EVENT_PATH) bail('missing GitHub context');

// The workflow_run event payload tells us which run failed and on which commit.
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const run = event.workflow_run;
const headSha = run.head_sha;
const runId = run.id;

const ghHeaders = (accept = 'application/vnd.github+json') => ({
  authorization: `Bearer ${TOKEN}`,
  accept,
  'x-github-api-version': '2022-11-28',
});

async function gh(path, accept) {
  const res = await fetch(`${GH}${path}`, { headers: ghHeaders(accept) });
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status}`);
  return accept && accept.includes('diff') ? res.text() : res.json();
}

// Keep the model input bounded: a huge diff or log would waste tokens and blur the signal.
const clip = (s, n) => (s.length > n ? s.slice(0, n) + `\n…[truncated ${s.length - n} chars]` : s);

try {
  // 1) Find the PR this failing run belongs to (workflow_run gives us the head commit).
  const prs = await gh(`/repos/${REPO}/commits/${headSha}/pulls`);
  if (!prs.length) bail('no PR associated with the failing commit');
  const pr = prs[0];

  // 2) The PR diff — "what changed" is half of any triage.
  const diff = clip(await gh(`/repos/${REPO}/pulls/${pr.number}`, 'application/vnd.github.diff'), 12000);

  // 3) The failing output — pull the logs of the failed job(s) and keep the telling lines.
  const { jobs } = await gh(`/repos/${REPO}/actions/runs/${runId}/jobs`);
  const failed = jobs.filter((j) => j.conclusion === 'failure');
  let logs = '';
  for (const j of failed.slice(0, 2)) {
    try {
      const res = await fetch(`${GH}/repos/${REPO}/actions/jobs/${j.id}/logs`, { headers: ghHeaders() });
      const text = await res.text();
      // Keep only lines that carry failure signal, so the model sees errors not noise.
      const signal = text
        .split('\n')
        .filter((l) => /✘|✗|error|expect|fail|timeout|Received|Expected/i.test(l))
        .slice(-80)
        .join('\n');
      logs += `\n### Job: ${j.name}\n${signal}`;
    } catch {
      /* one job's logs failing is not fatal to the triage */
    }
  }
  logs = clip(logs || '(no failure lines extracted)', 8000);

  // 4) Ask Claude to correlate change + failure into an actionable triage.
  const prompt = [
    'You are a senior QA engineer triaging a failed Playwright e2e run on a pull request.',
    'Given the PR diff and the failing test output, respond in GitHub-flavoured Markdown with:',
    '1. **Likely cause** (one or two sentences, concrete).',
    '2. **Most suspect file/change** (name it from the diff).',
    '3. **How to reproduce locally** (exact commands).',
    '4. **Confidence** (low/medium/high) and what would confirm it.',
    'Be specific and brief. If the failure looks flaky/infra rather than the diff, say so.',
    '',
    '## PR diff',
    '```diff',
    diff,
    '```',
    '',
    '## Failing output',
    '```',
    logs,
    '```',
  ].join('\n');

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!aiRes.ok) bail(`Anthropic API -> ${aiRes.status} ${await aiRes.text()}`);
  const triage = (await aiRes.json()).content.map((b) => b.text).join('\n');

  // 5) Post it back on the PR. A marker lets us update-in-place instead of stacking comments.
  const MARK = '<!-- ai-triage -->';
  const body = `${MARK}\n### 🤖 AI triage of the failed e2e run\n\n${triage}\n\n---\n<sub>Automated hypothesis from \`ai-triage.yml\` — a helper, not a verdict. Model: ${MODEL}.</sub>`;

  const comments = await gh(`/repos/${REPO}/issues/${pr.number}/comments`);
  const existing = comments.find((c) => c.body?.includes(MARK));
  const method = existing ? 'PATCH' : 'POST';
  const url = existing
    ? `${GH}/repos/${REPO}/issues/comments/${existing.id}`
    : `${GH}/repos/${REPO}/issues/${pr.number}/comments`;
  const post = await fetch(url, { method, headers: ghHeaders(), body: JSON.stringify({ body }) });
  if (!post.ok) bail(`posting the comment failed -> ${post.status}`);
  console.log(`ai-triage: ${existing ? 'updated' : 'posted'} triage comment on PR #${pr.number}`);
} catch (e) {
  bail(`unexpected error: ${e.message}`);
}
