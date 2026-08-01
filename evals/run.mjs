// Eval harness — a RUNNABLE demonstration of how you test a non-deterministic LLM task.
//
// SUBJECT UNDER TEST: a small "extractor" that turns a natural-language planning sentence
// ("Coffee with Ana at 3pm") into structured JSON ({title, time, category}) — the kind of task
// a day-planner agent would do. The app itself ships no LLM; this exists to demonstrate the
// METHOD the QA role needs, against a subject from the app's own domain.
//
// WHY THIS SHAPE (each idea maps to a line below):
//   * Non-determinism -> we never assert exact string equality. We assert PROPERTIES (valid JSON,
//     category in the allowed set, a time present when one is implied).
//   * Pass-rate, not a binary -> we score the whole golden dataset and require >= a threshold,
//     the way k6 uses p(95) instead of the mean. One unlucky case doesn't fail the suite; a real
//     regression drops the rate below the floor.
//   * LLM-as-judge -> a second model call grades semantic correctness against the reference, for
//     what property checks can't see. Caveat, stated: the judge must itself be trusted — keep its
//     rubric tight and spot-check its verdicts against the references here.
//
// GRACEFUL: no ANTHROPIC_API_KEY -> print how to enable and exit 0 (like the triage agent, a
// missing key is never a red build). Node 18+ (global fetch).
//
// RUN: node evals/run.mjs   (needs ANTHROPIC_API_KEY in the environment)
import fs from 'node:fs';

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const THRESHOLD = Number(process.env.EVAL_THRESHOLD || 0.8); // pass-rate floor
const OUT = process.env.GITHUB_STEP_SUMMARY;
const md = (s = '') => (OUT ? fs.appendFileSync(OUT, s + '\n') : null);

if (!KEY) {
  console.log('evals: no ANTHROPIC_API_KEY set — skipping.');
  console.log('       Add the secret (Settings > Secrets > Actions) or export it locally to run.');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'));
const CATEGORIES = data.categories;

async function claude(prompt, maxTokens = 400) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return (await res.json()).content.map((b) => b.text).join('');
}

// The system under test: extract structured JSON. temperature is left at default — we WANT some
// non-determinism so the eval reflects real behaviour, not a frozen best case.
async function extract(input) {
  const out = await claude(
    `Extract a day-planner activity from this sentence as strict JSON with keys ` +
      `"title" (string), "time" ("HH:MM" 24h or null if none), "category" (one of ${JSON.stringify(CATEGORIES)}).\n` +
      `Return ONLY the JSON, no prose.\nSentence: "${input}"`
  );
  const match = out.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// Deterministic property checks — what we can verify without a model.
function properties(result, expect) {
  if (!result || typeof result !== 'object') return { ok: false, why: 'not valid JSON' };
  if (typeof result.title !== 'string' || !result.title.trim()) return { ok: false, why: 'empty title' };
  if (!CATEGORIES.includes(result.category)) return { ok: false, why: `category not in set: ${result.category}` };
  if (result.category !== expect.category) return { ok: false, why: `category ${result.category} != ${expect.category}` };
  const hasTime = result.time != null && result.time !== '';
  if (hasTime !== expect.hasTime) return { ok: false, why: `hasTime ${hasTime} != ${expect.hasTime}` };
  return { ok: true, why: '' };
}

// LLM-as-judge — semantic correctness vs the reference, for what properties can't see.
async function judge(input, result, reference) {
  const verdict = await claude(
    `You are grading an extraction task. Reply with strict JSON {"correct": true|false, "reason": "..."} only.\n` +
      `Input sentence: "${input}"\nReference answer: ${JSON.stringify(reference)}\n` +
      `Model answer: ${JSON.stringify(result)}\n` +
      `Correct = the title captures the activity and the time/category match the intent (minor title wording is fine).`,
    200
  );
  const m = verdict.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { correct: false, reason: 'unparseable judge output' };
}

const rows = [];
let passed = 0;
for (const c of data.cases) {
  let result = null, prop = { ok: false, why: 'extract threw' }, jud = { correct: false, reason: '' };
  try {
    result = await extract(c.input);
    prop = properties(result, c.expect);
    if (prop.ok) jud = await judge(c.input, result, c.reference); // only judge structurally-valid answers
  } catch (e) {
    prop = { ok: false, why: e.message };
  }
  const pass = prop.ok && jud.correct;
  if (pass) passed++;
  rows.push({ id: c.id, pass, detail: prop.ok ? (jud.correct ? 'ok' : `judge: ${jud.reason}`) : prop.why });
}

const rate = passed / data.cases.length;
const ok = rate >= THRESHOLD;

// Console + step-summary report.
console.log(`\nEval: ${passed}/${data.cases.length} passed — rate ${(rate * 100).toFixed(0)}% (floor ${(THRESHOLD * 100).toFixed(0)}%)`);
for (const r of rows) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(14)} ${r.pass ? '' : '- ' + r.detail}`);
md('### 🧪 Agentic eval — activity extraction');
md('');
md(`**Pass-rate: ${(rate * 100).toFixed(0)}%** (${passed}/${data.cases.length}, floor ${(THRESHOLD * 100).toFixed(0)}%) ${ok ? '✅' : '❌'}`);
md('');
md('| Case | Result | Detail |');
md('| --- | --- | --- |');
for (const r of rows) md(`| ${r.id} | ${r.pass ? '✅' : '❌'} | ${r.pass ? '' : r.detail} |`);

if (!ok) { console.error(`\nBelow the ${(THRESHOLD * 100).toFixed(0)}% floor — failing.`); process.exit(1); }
console.log('\nAt or above the floor.');
