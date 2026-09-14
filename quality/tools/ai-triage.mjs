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
//   No model key at all? It logs that and exits 0. The agent is a helper, never a gate.
//   Any error is caught and the run still succeeds: a broken helper must not turn a PR red.
//
// PROVIDERS
//   Anthropic directly, or any OpenAI-compatible endpoint through OpenRouter, behind one seam.
//   quality/evals/run.mjs already resolves providers this way, so the same vocabulary is used here
//   and the two files read alike. Whichever key is present wins, Anthropic first when both are.
//
// Env in: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, and one of ANTHROPIC_API_KEY or
//         OPENROUTER_API_KEY. Optional: TRIAGE_PROVIDER, TRIAGE_MODEL, TRIAGE_MAX_TOKENS.
//         Node 18+ (global fetch).
//
// --dry-run prints the comment it would post and writes nothing to the pull request. Without it,
// the only way to see this agent's output is to let it comment on a public repository, which makes
// "does it work" a question you can only ask in public.
import fs from 'node:fs';
import {
  RETRYABLE, pickProvider, pickKey, pickModel, readAnswer, isTruncated, plainDashes,
} from './ai-triage-lib.mjs';

const GH = 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY; // "owner/name"
const TOKEN = process.env.GITHUB_TOKEN;

// Every choice below is made in ai-triage-lib.mjs, where it can be tested without a key.
const PROVIDER = pickProvider();
const KEY = pickKey(PROVIDER);
const MODEL = pickModel(PROVIDER);

// 1024 was enough on Anthropic. Reasoning models bill their thinking to the same allowance as the
// answer, so a tight cap starves them and they hand back empty or truncated content, which looks
// like a broken model when it is really a budget. The eval harness paid for that lesson once, and
// this file paid for it again: the first real run on OpenRouter stopped mid-sentence at 2000, four
// words into the third of four requested sections.
const MAX_TOKENS = Number(process.env.TRIAGE_MAX_TOKENS || 8000);

const DRY_RUN = process.argv.includes('--dry-run');

// A helper is never allowed to fail the run. Log the reason and leave with success.
function bail(msg) {
  console.log(`ai-triage: ${msg} — skipping (this is a non-blocking helper).`);
  // Exiting 0 on every failure is what keeps a broken helper from turning a pull request red. It is
  // also how this agent did nothing for six weeks without anyone noticing, so the reason is written
  // into the job summary, where a person looking at the run can see it without opening the log.
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### AI triage did not run\n\n${msg}\n`);
    } catch {
      /* a helper cannot fail because it could not write a note about failing */
    }
  }
  process.exit(0);
}

if (!KEY) bail('no ANTHROPIC_API_KEY or OPENROUTER_API_KEY secret set');
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

  // One seam, two transports. Header VALUES are latin-1 only: a single em dash in one of them makes
  // fetch throw before the request ever leaves the machine, and every case fails identically. That
  // is how the eval harness once reported a perfect score of zero.
  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });
  const callModel = () => PROVIDER === 'anthropic'
    ? fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: payload,
      })
    : fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${KEY}`,
          'content-type': 'application/json',
          // Attribution headers OpenRouter uses for its model rankings. Optional, honest, ASCII.
          'HTTP-Referer': 'https://github.com/InesPatricia/mi-dia-app',
          'X-Title': 'Mi Dia CI triage agent',
        },
        body: payload,
      });

  // Free pools rate-limit hard, and the eval harness draws on the same daily allowance: one full
  // eval spends 20 of roughly 50 requests. Without this, a single 429 on a busy day makes the
  // triage vanish without a word, which is the failure mode this agent already had once.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let aiRes = await callModel();
  for (let attempt = 0; !aiRes.ok && RETRYABLE.has(aiRes.status) && attempt < 2; attempt++) {
    await sleep(2000 * 2 ** attempt); // 2s, then 4s
    aiRes = await callModel();
  }
  if (!aiRes.ok) bail(`${PROVIDER} API -> ${aiRes.status} ${await aiRes.text()}`);

  const { text, stopReason } = readAnswer(PROVIDER, await aiRes.json());
  // A 200 carrying nothing is not a triage. Free pools return one now and then, and posting an
  // empty comment is worse than staying quiet.
  if (!text.trim()) bail('the model returned an empty completion');
  if (isTruncated(stopReason)) {
    bail(`the model ran out of budget at ${MAX_TOKENS} tokens and the triage was cut off. ` +
      'Raise TRIAGE_MAX_TOKENS or pick a model that does not spend the allowance on reasoning.');
  }
  const triage = plainDashes(text);

  // 5) Post it back on the PR. A marker lets us update-in-place instead of stacking comments.
  const MARK = '<!-- ai-triage -->';
  const body = `${MARK}\n### AI triage of the failed e2e run\n\n${triage}\n\n---\n<sub>Automated hypothesis from \`ai-triage.yml\`. A human still decides. Provider: ${PROVIDER}, model: ${MODEL}.</sub>`;

  if (DRY_RUN) {
    console.log(`\nai-triage: dry run. Nothing was posted. PR #${pr.number} would receive:\n`);
    console.log(body);
  } else {
    const comments = await gh(`/repos/${REPO}/issues/${pr.number}/comments`);
    const existing = comments.find((c) => c.body?.includes(MARK));
    const method = existing ? 'PATCH' : 'POST';
    const url = existing
      ? `${GH}/repos/${REPO}/issues/comments/${existing.id}`
      : `${GH}/repos/${REPO}/issues/${pr.number}/comments`;
    const post = await fetch(url, { method, headers: ghHeaders(), body: JSON.stringify({ body }) });
    if (!post.ok) bail(`posting the comment failed -> ${post.status}`);
    console.log(`ai-triage: ${existing ? 'updated' : 'posted'} triage comment on PR #${pr.number}`);
  }
} catch (e) {
  bail(`unexpected error: ${e.message}`);
}
