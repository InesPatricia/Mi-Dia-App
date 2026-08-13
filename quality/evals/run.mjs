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
//   * Provider-agnostic -> the harness is a method, not a vendor. Anthropic and any
//     OpenAI-compatible endpoint (OpenRouter) sit behind one `chat()` seam, so the same dataset
//     and the same scoring can be pointed at a different model to compare them.
//
// GRACEFUL: no API key at all -> print how to enable and exit 0 (like the triage agent, a
// missing key is never a red build). Node 18+ (global fetch).
//
// RUN:
//   node quality/evals/run.mjs                 # needs ANTHROPIC_API_KEY or OPENROUTER_API_KEY
//   node quality/evals/run.mjs --list-free     # list OpenRouter models that cost nothing today
//
// ENV:
//   ANTHROPIC_API_KEY / OPENROUTER_API_KEY   whichever is set picks the provider
//   EVAL_PROVIDER=anthropic|openrouter        force one when both keys exist
//   EVAL_MODEL                                model under test (provider-specific id)
//   EVAL_JUDGE_MODEL                          judge model; defaults to EVAL_MODEL
//   EVAL_THRESHOLD                            pass-rate floor, 0..1 (default 0.8)
import fs from 'node:fs';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// Provider resolution: an explicit EVAL_PROVIDER wins, otherwise whichever key exists. Anthropic
// keeps priority when both are set, so nothing about the original CI path changes silently.
const PROVIDER =
  process.env.EVAL_PROVIDER || (ANTHROPIC_KEY ? 'anthropic' : OPENROUTER_KEY ? 'openrouter' : null);

const DEFAULT_MODEL = {
  anthropic: 'claude-sonnet-5',
  // OpenRouter's free tier renames and retires slugs constantly. Two defaults written into this
  // file have already died, one of them overnight between two runs, so `--list-free` asks the API
  // which models cost nothing right now. Same rule as everywhere else in this repo, derive the
  // answer instead of writing it down.
  openrouter: 'openai/gpt-oss-20b:free',
};

const MODEL = process.env.EVAL_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL[PROVIDER];
// The judge SHOULD ideally be a different model from the one under test: a model grading its own
// output has a self-preference bias, which inflates the pass-rate exactly where you need honesty.
// Same-model judging is allowed (it is the default) but it is a stated weakness, not a feature.
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || MODEL;
const THRESHOLD = Number(process.env.EVAL_THRESHOLD || 0.8); // pass-rate floor
// Reasoning models spend their thinking on the SAME budget as the answer (see usage.
// completion_tokens_details.reasoning_tokens). A tight cap therefore starves them: they hit the
// limit mid-thought and return empty content, which looks like a model failure but is a harness
// setting. 1200 is generous for a one-line JSON answer and still bounds a runaway.
const MAX_TOKENS = Number(process.env.EVAL_MAX_TOKENS || 1200);
const OUT = process.env.GITHUB_STEP_SUMMARY;
const md = (s = '') => (OUT ? fs.appendFileSync(OUT, s + '\n') : null);

// Exit through process.exitCode and a natural end of the event loop, never process.exit(): on
// Windows, exiting while an HTTP socket is still open trips a libuv assertion, which would replace
// the real exit code with a crash — a test harness that lies about its own result is worse than no
// harness. `connection: close` keeps sockets from outliving the run in the first place.
const finish = (code) => { process.exitCode = code; };

// --- provider drivers -------------------------------------------------------------------------
// One `chat()` seam, two transports. Everything below this line is provider-unaware.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const callAnthropic = (prompt, maxTokens, model) =>
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      connection: 'close',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });

const callOpenRouter = (prompt, maxTokens, model) =>
  fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENROUTER_KEY}`,
      'content-type': 'application/json',
      connection: 'close',
      // Attribution headers OpenRouter uses for its model rankings. Optional and honest.
      // ASCII only: header values are ByteString (latin-1), so a stray em dash here makes fetch
      // throw before a single request leaves the machine — which failed all 10 cases identically.
      'HTTP-Referer': 'https://github.com/InesPatricia/mi-dia-app',
      'X-Title': 'Mi Dia agentic eval harness',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });

// Free-tier endpoints rate-limit aggressively and occasionally 5xx. A transient 429 is not a
// finding about the model's quality, so retrying it is not cheating — it separates infrastructure
// noise from the signal we are actually measuring. A persistent failure still surfaces as an error.
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

// A failure that never produced an answer is not a wrong answer. Anything thrown at the transport
// layer — an exhausted 429, a 5xx, a bad key, a request that never left the machine — is tagged
// INFRA, taken out of the pass-rate's denominator, and reported separately. Scoring it as a failed
// case is how a rate-limited afternoon gets mistaken for a model regression, and it is exactly how
// this harness once reported "0/10" when the real defect was an em dash in a header.
class InfraError extends Error {
  constructor(message) {
    super(message);
    this.infra = true;
  }
}

async function chat(prompt, maxTokens = MAX_TOKENS, model = MODEL) {
  let lastErr = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = PROVIDER === 'anthropic'
        ? await callAnthropic(prompt, maxTokens, model)
        : await callOpenRouter(prompt, maxTokens, model);
    } catch (e) {
      // The request never left the machine (DNS, TLS, a malformed header). Not retried: these are
      // permanent far more often than transient, and retrying a construction bug wastes 14s a case.
      throw new InfraError(`transport: ${e.message}`);
    }

    if (res.ok) {
      const json = await res.json();
      const text = PROVIDER === 'anthropic'
        ? json.content.map((b) => b.text).join('')
        : (json.choices?.[0]?.message?.content ?? '');
      if (text && text.trim()) return text;
      // A 200 with nothing in it. Free pools do this intermittently, and the identical request
      // usually succeeds seconds later. An empty response holds no answer, so it cannot be a wrong
      // answer, which is what makes retrying it fair: retrying a missing answer is legitimate,
      // retrying a wrong one would be gaming the result. If it never fills in, the case is
      // reported as unmeasurable rather than blamed on the model.
      lastErr = 'empty completion';
      await sleep(2000 * 2 ** attempt);
      continue;
    }

    lastErr = `${res.status}: ${(await res.text()).slice(0, 200).replace(/\s+/g, ' ')}`;
    if (!RETRYABLE.has(res.status)) break;
    await sleep(2000 * 2 ** attempt); // 2s, 4s, 8s
  }
  // Every HTTP-level failure lands here: an exhausted 429, a 5xx, a 401 from a bad key, a 400 for
  // a retired model slug. None of them is the model answering badly, so none of them is scored.
  throw new InfraError(`${PROVIDER} ${lastErr}`);
}

// Models wrap JSON in prose or in a ```json fence however firmly you ask them not to. Pull the
// fenced block first, then fall back to the outermost braces.
function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).match(/\{[\s\S]*\}/);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate[0]);
  } catch {
    return null;
  }
}

// --- the eval ---------------------------------------------------------------------------------

const data = JSON.parse(fs.readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'));
const CATEGORIES = data.categories;

// The system under test: extract structured JSON. temperature is left at default — we WANT some
// non-determinism so the eval reflects real behaviour, not a frozen best case.
async function extract(input) {
  const out = await chat(
    `Extract a day-planner activity from this sentence as strict JSON with keys ` +
      `"title" (string), "time" ("HH:MM" 24h or null if none), "category" (one of ${JSON.stringify(CATEGORIES)}).\n` +
      `Return ONLY the JSON, no prose.\nSentence: "${input}"`
  );
  return parseJson(out);
}

// Deterministic property checks, everything we can verify without asking a model.
const SCHEMA_KEYS = ['title', 'time', 'category'];

function properties(result, expect) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return { ok: false, why: 'not valid JSON' };
  // Invented fields are their own failure mode. A model that helpfully adds "location" or
  // "duration" has stopped answering the question it was asked, and downstream code that trusts
  // the schema will happily carry the extra field around until something breaks far from here.
  const extra = Object.keys(result).filter((k) => !SCHEMA_KEYS.includes(k));
  if (extra.length) return { ok: false, why: `invented field(s): ${extra.join(', ')}` };
  if (typeof result.title !== 'string' || !result.title.trim()) return { ok: false, why: 'empty title' };
  if (!CATEGORIES.includes(result.category)) return { ok: false, why: `category not in set: ${result.category}` };
  if (result.category !== expect.category) return { ok: false, why: `category ${result.category} != ${expect.category}` };
  const hasTime = result.time != null && result.time !== '';
  if (hasTime !== expect.hasTime) return { ok: false, why: `hasTime ${hasTime} != ${expect.hasTime}` };
  return { ok: true, why: '' };
}

// LLM-as-judge — semantic correctness vs the reference, for what properties can't see.
async function judge(input, result, reference) {
  const verdict = await chat(
    `You are grading an extraction task. Reply with strict JSON {"correct": true|false, "reason": "..."} only.\n` +
      `Input sentence: "${input}"\nReference answer: ${JSON.stringify(reference)}\n` +
      `Model answer: ${JSON.stringify(result)}\n` +
      `Correct = the title captures the activity and the time/category match the intent (minor title wording is fine).`,
    MAX_TOKENS,
    JUDGE_MODEL
  );
  return parseJson(verdict) ?? { correct: false, reason: 'unparseable judge output' };
}

async function runEval() {
  if (!PROVIDER) {
    console.log('evals: no ANTHROPIC_API_KEY or OPENROUTER_API_KEY set — skipping.');
    console.log('       Add the secret (Settings > Secrets > Actions) or export it locally to run.');
    return finish(0);
  }
  const key = PROVIDER === 'anthropic' ? ANTHROPIC_KEY : OPENROUTER_KEY;
  if (!key) {
    console.log(`evals: EVAL_PROVIDER=${PROVIDER} but its API key is not set — skipping.`);
    return finish(0);
  }

  console.log(`Provider: ${PROVIDER} | model: ${MODEL} | judge: ${JUDGE_MODEL} | floor: ${(THRESHOLD * 100).toFixed(0)}%`);

  // EVAL_LIMIT smoke-tests the harness itself on a couple of cases without paying for the whole
  // set — useful on a rate-limited free tier, and it keeps "does the runner work" separate from
  // "how good is the model". A capped run is never a verdict: the floor is only meaningful over
  // the full dataset, so a limited run says so out loud.
  const LIMIT = Number(process.env.EVAL_LIMIT || 0);
  const cases = LIMIT > 0 ? data.cases.slice(0, LIMIT) : data.cases;
  if (LIMIT > 0) console.log(`⚠ EVAL_LIMIT=${LIMIT}: harness smoke run over ${cases.length}/${data.cases.length} cases — NOT a pass-rate verdict.`);

  const rows = [];
  for (const c of cases) {
    let result = null, prop = { ok: false, why: 'extract threw' }, jud = { correct: false, reason: '' };
    let status = 'fail';
    try {
      result = await extract(c.input);
      prop = properties(result, c.expect);
      if (prop.ok) jud = await judge(c.input, result, c.reference); // only judge structurally-valid answers
      status = prop.ok && jud.correct ? 'pass' : 'fail';
    } catch (e) {
      // The distinction the whole report rests on: did the model answer badly, or did we never
      // get an answer? Only the first is a score.
      status = e.infra ? 'infra' : 'fail';
      prop = { ok: false, why: e.message };
    }
    rows.push({
      id: c.id,
      status,
      got: result,
      // Keep the judge's own words even when it approves. An artifact that only records the
      // verdicts you disagreed with is a very flattering way to audit a judge.
      judge: prop.ok ? { correct: jud.correct, reason: jud.reason } : null,
      detail: status === 'pass' ? 'ok' : prop.ok ? `judge: ${jud.reason}` : prop.why,
    });
    process.stdout.write({ pass: '.', fail: 'x', infra: '!' }[status]);
  }
  process.stdout.write('\n');

  // Scored = cases that actually produced an answer. Inconclusive ones leave the denominator
  // rather than counting against the model.
  const scored = rows.filter((r) => r.status !== 'infra');
  const infra = rows.filter((r) => r.status === 'infra');
  const passed = rows.filter((r) => r.status === 'pass').length;
  const coverage = scored.length / cases.length;
  const rate = scored.length ? passed / scored.length : 0;

  // Too little of the set was measurable to call it either way. A green run over two surviving
  // cases would be a lie, and a red one would blame the model for someone else's rate limit — so
  // the run reports INCONCLUSIVE and exits 2, distinct from both a pass (0) and a real drop (1).
  const MIN_COVERAGE = Number(process.env.EVAL_MIN_COVERAGE || 0.8);
  const inconclusive = coverage < MIN_COVERAGE;
  const ok = !inconclusive && rate >= THRESHOLD;

  // Console + step-summary report.
  const headline = inconclusive
    ? `INCONCLUSIVE — only ${scored.length}/${cases.length} cases were measurable (need ${(MIN_COVERAGE * 100).toFixed(0)}%)`
    : `Eval: ${passed}/${scored.length} scored cases passed — rate ${(rate * 100).toFixed(0)}% (floor ${(THRESHOLD * 100).toFixed(0)}%)`;
  console.log(`\n${headline}`);
  if (infra.length) console.log(`  ${infra.length} case(s) never got an answer — not scored, not counted against the model.`);
  for (const r of rows) {
    const mark = { pass: 'PASS ', fail: 'FAIL ', infra: 'INFRA' }[r.status];
    console.log(`  ${mark}  ${r.id.padEnd(14)} ${r.status === 'pass' ? '' : '- ' + r.detail}`);
  }
  md('### 🧪 Agentic eval — activity extraction');
  md('');
  md(inconclusive
    ? `**INCONCLUSIVE** — only ${scored.length}/${cases.length} cases were measurable (coverage floor ${(MIN_COVERAGE * 100).toFixed(0)}%) ⚠️`
    : `**Pass-rate: ${(rate * 100).toFixed(0)}%** (${passed}/${scored.length} scored, floor ${(THRESHOLD * 100).toFixed(0)}%) ${ok ? '✅' : '❌'}`);
  if (infra.length) md(`\n${infra.length} case(s) never got an answer (rate limit / transport) and are excluded from the rate.`);
  md('');
  md(`Provider \`${PROVIDER}\` · model \`${MODEL}\` · judge \`${JUDGE_MODEL}\``);
  md('');
  md('| Case | Result | Detail |');
  md('| --- | --- | --- |');
  for (const r of rows) md(`| ${r.id} | ${{ pass: '✅', fail: '❌', infra: '⚠️ infra' }[r.status]} | ${r.status === 'pass' ? '' : r.detail} |`);

  // Dump every case's actual output next to its verdict. Without this the judge is unauditable:
  // it says "correct" and you have nothing to contradict it with, which quietly makes a second
  // model the source of truth. The README asks for its verdicts to be spot-checked — this is what
  // makes that possible. Gitignored: it is a run artifact, and it changes on every run by design.
  const artifact = new URL('./last-run.json', import.meta.url);
  fs.writeFileSync(artifact, JSON.stringify({ at: new Date().toISOString(), provider: PROVIDER, model: MODEL, judge: JUDGE_MODEL, threshold: THRESHOLD, coverage, rate, inconclusive, rows }, null, 2));
  console.log(`\nPer-case outputs written to quality/evals/last-run.json (audit the judge there).`);

  if (inconclusive) {
    console.error(`\nNot enough of the set was measurable to judge the model. Exit 2 = inconclusive, not a regression.`);
    return finish(2);
  }
  if (!ok) {
    console.error(`\nBelow the ${(THRESHOLD * 100).toFixed(0)}% floor — failing.`);
    return finish(1);
  }
  console.log('At or above the floor.');
  return finish(0);
}

// Which OpenRouter models are free TODAY. Hardcoding a slug in a doc is the same drift surface as
// hardcoding a test count: ask the source instead of writing the answer down.
async function listFree() {
  const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { connection: 'close' } });
  if (!res.ok) { console.error(`OpenRouter /models -> ${res.status}`); return finish(1); }
  const { data: models } = await res.json();
  const free = models
    .filter((m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  console.log(`OpenRouter models with zero prompt+completion price: ${free.length}\n`);
  for (const m of free) console.log(`  ${m.id.padEnd(52)} ctx ${m.context_length}`);
  return finish(0);
}

// The measuring instrument gets its own calibration. These fixtures exercise the deterministic
// half of the harness with no model and no key, so they cost nothing and can run on every pull
// request, which the eval itself cannot. If the scorer is wrong, every pass-rate it ever produced
// was fiction.
function selfTest() {
  const CASES = [
    ['clean answer', { title: 'Coffee with Ana', time: '15:00', category: 'social' }, { hasTime: true, category: 'social' }, true],
    ['invented field', { title: 'Coffee', time: '15:00', category: 'social', location: 'Bar Nou' }, { hasTime: true, category: 'social' }, false],
    ['category outside the set', { title: 'Coffee', time: '15:00', category: 'coffee' }, { hasTime: true, category: 'social' }, false],
    ['hallucinated time', { title: 'Buy groceries', time: '17:00', category: 'errands' }, { hasTime: false, category: 'errands' }, false],
    ['missing time that was implied', { title: 'Coffee', time: null, category: 'social' }, { hasTime: true, category: 'social' }, false],
    ['empty title', { title: '   ', time: null, category: 'rest' }, { hasTime: false, category: 'rest' }, false],
    ['not an object', 'sorry, I cannot do that', { hasTime: false, category: 'rest' }, false],
    ['null', null, { hasTime: false, category: 'rest' }, false],
  ];
  const PARSE = [
    ['bare json', '{"a":1}', { a: 1 }],
    ['fenced json', '```json\n{"a":1}\n```', { a: 1 }],
    ['json wrapped in prose', 'Sure! Here you go:\n{"a":1}\nHope that helps.', { a: 1 }],
    ['no json at all', 'I am afraid I cannot answer that.', null],
    ['malformed json', '{"a": }', null],
  ];

  let failed = 0;
  for (const [name, result, expect, shouldPass] of CASES) {
    const got = properties(result, expect).ok;
    const ok = got === shouldPass;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} properties: ${name}`);
  }
  for (const [name, input, expected] of PARSE) {
    const got = JSON.stringify(parseJson(input));
    const ok = got === JSON.stringify(expected);
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} parseJson: ${name}${ok ? '' : ` (got ${got})`}`);
  }
  console.log(`\nself-test: ${CASES.length + PARSE.length - failed}/${CASES.length + PARSE.length} passed`);
  return finish(failed ? 1 : 0);
}

await (process.argv.includes('--self-test')
  ? selfTest()
  : process.argv.includes('--list-free')
    ? listFree()
    : runEval());
