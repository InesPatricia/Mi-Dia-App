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
//   node quality/evals/run.mjs --replay --show # score a recorded run, no key, no network, 1 second
//   node quality/evals/run.mjs --self-test     # check the scorer itself, no key
//   node quality/evals/run.mjs --judge-check   # check the JUDGE, with answers whose verdict is
//                                              # not in doubt; 4 requests
//   node quality/evals/run.mjs                 # ask a live model; needs a key
//   node quality/evals/run.mjs --show          # the same, narrating every case
//   node quality/evals/run.mjs --list-free     # list OpenRouter models that cost nothing today
//
// START WITH --replay --show. It prints, for every case, the sentence, the model's answer, each of
// the six property checks with a tick or the reason it rejected the answer, and the judge's verdict
// in its own words. Watching that once explains the method better than reading this file does.
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
  // Three defaults written into this file have now died. The third was found on 2026-09-15 by
  // running the eval: all ten cases came back 404 with "this model is unavailable for free".
  // `openrouter/free` names a router rather than a single model, so it outlives any one of them
  // being retired, which is the same fix the triage agent took. `--list-free` still asks the API
  // what costs nothing right now, for when you want to name a specific model.
  openrouter: 'openrouter/free',
};

const MODEL = process.env.EVAL_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL[PROVIDER];
// A model grading its own output has a self-preference bias: it inflates the pass rate exactly
// where you need honesty. That used to be the default here, under a comment admitting it was a
// weakness, which is a strange thing to ship deliberately. The judge now defaults to a DIFFERENT
// model, and a run that ends up self-graded anyway says so out loud rather than quietly printing a
// flattering number.
//
// The price of naming a model: named slugs get retired. When this one goes, the judge calls return
// 404, those cases become INFRA and the run reports INCONCLUSIVE. That degrades loudly, which is
// the trade being made on purpose. `--list-free` finds a live replacement.
const DEFAULT_JUDGE = {
  anthropic: 'claude-haiku-4-5-20251001',
  openrouter: 'nvidia/nemotron-3-super-120b-a12b:free',
};

function pickJudge(provider, model, env = process.env) {
  return env.EVAL_JUDGE_MODEL || DEFAULT_JUDGE[provider] || model;
}

const JUDGE_MODEL = pickJudge(PROVIDER, MODEL);
const SELF_GRADED = JUDGE_MODEL === MODEL;
const THRESHOLD = Number(process.env.EVAL_THRESHOLD || 0.8); // pass-rate floor
// Reasoning models spend their thinking on the SAME budget as the answer (see usage.
// completion_tokens_details.reasoning_tokens). A tight cap therefore starves them: they hit the
// limit mid-thought and return empty content, which looks like a model failure but is a harness
// setting. 1200 is generous for a one-line JSON answer and still bounds a runaway.
const MAX_TOKENS = Number(process.env.EVAL_MAX_TOKENS || 1200);
// --show narrates every case instead of printing a dot. --replay scores a recorded run instead of
// calling a model, which is the only way to demonstrate this harness on demand: the free tier is
// unreliable enough that three consecutive attempts on 2026-09-15 all ended INCONCLUSIVE, twice
// before a single case was scored. The scoring is deterministic, so it does not need the network.
const SHOW = process.argv.includes('--show');
const REPLAY = process.argv.includes('--replay');

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

// The six checks as a list rather than a chain of early returns, so that --show can print the whole
// ladder and not only the rung that broke. Seeing five ticks and one cross is what makes the scoring
// legible to someone who has never read this file; a single error string does not teach anything.
// Order is preserved, and `properties` still reports the first failure exactly as it always did.
function checkList(result, expect) {
  const isObject = !!result && typeof result === 'object' && !Array.isArray(result);
  // Invented fields are their own failure mode. A model that helpfully adds "location" or
  // "duration" has stopped answering the question it was asked, and downstream code that trusts
  // the schema will happily carry the extra field around until something breaks far from here.
  const extra = isObject ? Object.keys(result).filter((k) => !SCHEMA_KEYS.includes(k)) : [];
  const hasTime = isObject && result.time != null && result.time !== '';
  return [
    { name: 'answer is a JSON object', ok: isObject, why: 'not valid JSON' },
    { name: 'no invented fields', ok: isObject && extra.length === 0, why: `invented field(s): ${extra.join(', ')}` },
    { name: 'title is present and not blank', ok: isObject && typeof result.title === 'string' && !!result.title.trim(), why: 'empty title' },
    { name: 'category is one of the six allowed', ok: isObject && CATEGORIES.includes(result.category), why: `category not in set: ${isObject ? result.category : ''}` },
    { name: 'category is the expected one', ok: isObject && result.category === expect.category, why: `category ${isObject ? result.category : ''} != ${expect.category}` },
    { name: 'time present exactly when the sentence implies one', ok: isObject && hasTime === expect.hasTime, why: `hasTime ${hasTime} != ${expect.hasTime}` },
  ];
}

function properties(result, expect) {
  const failed = checkList(result, expect).find((c) => !c.ok);
  return failed ? { ok: false, why: failed.why } : { ok: true, why: '' };
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
  // null, not a false verdict. A judge whose answer cannot be read has not said the model is wrong,
  // it has said nothing, and scoring that as a model failure blames the wrong party. This was found
  // on 2026-09-15: the `dentist` case was marked FAIL with "unparseable judge output" while the
  // model's own answer had passed every property check. The run reported 8/10 when it was 9/10.
  return parseJson(verdict);
}

// One case, printed in full. This exists because the run used to show a row of dots and a
// percentage, which tells you the verdict and nothing about how it was reached. Watching one
// sentence go through the prompt, the six checks and the judge is what makes the method explainable
// to someone who has not read the source.
function showCase(c, result, checks, jud, status) {
  const pad = (s) => String(s).padEnd(10);
  console.log(`\n${'-'.repeat(72)}\n${c.id}`);
  console.log(`  ${pad('sentence')} "${c.input}"`);
  console.log(`  ${pad('reference')} ${JSON.stringify(c.reference)}`);
  console.log(`  ${pad('answer')} ${result === null ? '(none)' : JSON.stringify(result)}`);
  console.log('  checks');
  // When there is no object at all, the remaining five checks report on fields that do not exist
  // and print things like "invented field(s): " with nothing after the colon. Five lines of noise
  // around one real failure buries the one line that matters.
  const shown = checks[0].ok ? checks : checks.slice(0, 1);
  for (const k of shown) console.log(`    ${k.ok ? 'ok  ' : 'FAIL'} ${k.name}${k.ok ? '' : `  <- ${k.why}`}`);
  if (shown.length < checks.length) console.log(`    .... the remaining ${checks.length - 1} checks need an object to look at`);
  if (jud === null) console.log(`  ${pad('judge')} answered, but the answer could not be read as a verdict`);
  else if (jud) console.log(`  ${pad('judge')} ${jud.correct ? 'correct' : 'incorrect'}: ${jud.reason}`);
  else console.log(`  ${pad('judge')} not asked (the answer failed a property check first)`);
  console.log(`  ${pad('result')} ${status.toUpperCase()}`);
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
  if (SELF_GRADED) {
    console.log('WARNING: the judge is the same model as the one under test, so this run is self-graded.');
    console.log('         A model marking its own homework is generous with it. Treat the rate as inflated.');
  }

  // EVAL_LIMIT smoke-tests the harness itself on a couple of cases without paying for the whole
  // set — useful on a rate-limited free tier, and it keeps "does the runner work" separate from
  // "how good is the model". A capped run is never a verdict: the floor is only meaningful over
  // the full dataset, so a limited run says so out loud.
  const LIMIT = Number(process.env.EVAL_LIMIT || 0);
  const cases = LIMIT > 0 ? data.cases.slice(0, LIMIT) : data.cases;
  if (LIMIT > 0) console.log(`⚠ EVAL_LIMIT=${LIMIT}: harness smoke run over ${cases.length}/${data.cases.length} cases — NOT a pass-rate verdict.`);

  const rows = [];
  for (const c of cases) {
    let result = null, prop = { ok: false, why: 'extract threw' }, jud = undefined;
    let checks = [];
    let status = 'fail';
    let detail = '';
    try {
      result = await extract(c.input);
      checks = checkList(result, c.expect);
      prop = properties(result, c.expect);
      if (prop.ok) jud = await judge(c.input, result, c.reference); // only judge structurally-valid answers
      if (!prop.ok) {
        status = 'fail';
        detail = prop.why;
      } else if (jud === null) {
        // Unmeasurable for the same reason a rate limit is: no usable verdict came back, so there
        // is nothing to score. It leaves the denominator instead of counting against the model.
        status = 'infra';
        detail = 'the judge answered, but its verdict could not be read';
      } else {
        status = jud.correct ? 'pass' : 'fail';
        detail = jud.correct ? 'ok' : `judge: ${jud.reason}`;
      }
    } catch (e) {
      // The distinction the whole report rests on: did the model answer badly, or did we never
      // get an answer? Only the first is a score.
      status = e.infra ? 'infra' : 'fail';
      prop = { ok: false, why: e.message };
      detail = e.message;
    }
    rows.push({
      id: c.id,
      status,
      got: result,
      // Keep the judge's own words even when it approves. An artifact that only records the
      // verdicts you disagreed with is a very flattering way to audit a judge.
      judge: jud ?? null,
      detail: status === 'pass' ? 'ok' : detail,
    });
    if (SHOW) showCase(c, result, checks, jud, status);
    else process.stdout.write({ pass: '.', fail: 'x', infra: '!' }[status]);
  }
  if (!SHOW) process.stdout.write('\n');

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
  if (infra.length) console.log(`  ${infra.length} case(s) produced no usable result. Not scored, not counted against the model.`);
  for (const r of rows) {
    const mark = { pass: 'PASS ', fail: 'FAIL ', infra: 'INFRA' }[r.status];
    console.log(`  ${mark}  ${r.id.padEnd(14)} ${r.status === 'pass' ? '' : '- ' + r.detail}`);
  }
  md('### 🧪 Agentic eval — activity extraction');
  md('');
  md(inconclusive
    ? `**INCONCLUSIVE** — only ${scored.length}/${cases.length} cases were measurable (coverage floor ${(MIN_COVERAGE * 100).toFixed(0)}%) ⚠️`
    : `**Pass-rate: ${(rate * 100).toFixed(0)}%** (${passed}/${scored.length} scored, floor ${(THRESHOLD * 100).toFixed(0)}%) ${ok ? '✅' : '❌'}`);
  if (infra.length) md(`\n${infra.length} case(s) produced no usable result (rate limit, transport, or an unreadable judge verdict) and are excluded from the rate.`);
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

// Test the judge, by handing it answers whose verdict is not in doubt.
//
// Nothing else in this harness checks the judge. The property checks are covered by --self-test and
// the scoring by --replay, but the second model has always been taken on trust, which is awkward
// for the one component whose whole job is to be trusted. Across both recorded runs the judge was
// asked 18 times and disagreed 0 times, so "it works" rested on never having been contradicted.
//
// Every fixture below is built to pass all six property checks. That is the point: in a real run
// the judge only ever sees answers that already have the right shape, so a fixture the property
// layer would reject is testing the wrong thing. The run asserts that first and says so if a
// fixture is invalid.
//
// The last fixture is a correct answer, and it matters as much as the wrong ones. A judge that
// replies "incorrect" to everything would pass the first three and be entirely useless.
const JUDGE_FIXTURES = [
  {
    id: 'dentist',
    what: 'a plausible time that is simply the wrong one',
    answer: { title: 'Dentist appointment', time: '22:15', category: 'health' },
    shouldBeCorrect: false,
  },
  {
    id: 'coffee-ana',
    what: 'the right shape describing a different activity',
    answer: { title: 'Dentist appointment', time: '15:00', category: 'social' },
    shouldBeCorrect: false,
  },
  {
    id: 'standup',
    what: 'morning read as evening',
    answer: { title: 'Team standup', time: '21:30', category: 'work' },
    shouldBeCorrect: false,
  },
  {
    id: 'coffee-ana',
    what: 'a correct answer, which the judge must NOT reject',
    answer: { title: 'Coffee with Ana', time: '15:00', category: 'social' },
    shouldBeCorrect: true,
  },
];

async function judgeCheck() {
  if (!PROVIDER) {
    console.log('judge-check: no API key set, so the judge cannot be asked anything. Skipping.');
    return finish(0);
  }
  const byId = new Map(data.cases.map((c) => [c.id, c]));
  console.log(`Judge under test: ${JUDGE_MODEL}\n`);

  // The same three-way split the eval itself uses, for the same reason. The first version of this
  // check counted a fixture that never got an answer as a judge failure, which is precisely the
  // mistake the INFRA bucket exists to prevent, committed forty lines away from the code that
  // prevents it. A rate-limited afternoon is not evidence about a judge.
  let wrong = 0, invalid = 0, unmeasurable = 0;
  for (const f of JUDGE_FIXTURES) {
    const c = byId.get(f.id);
    const prop = properties(f.answer, c.expect);
    if (!prop.ok) {
      // A fixture the property layer rejects never reaches the judge in a real run, so it cannot be
      // testing the judge. That is a defect in this file, not in the model.
      console.log(`  INVALID  ${f.what}\n           the property checks reject it first: ${prop.why}`);
      invalid++;
      continue;
    }
    let verdict;
    try {
      verdict = await judge(c.input, f.answer, c.reference);
    } catch (e) {
      console.log(`  INFRA    ${f.what}\n           no answer came back: ${e.message}`);
      unmeasurable++;
      continue;
    }
    if (verdict === null) {
      console.log(`  UNREAD   ${f.what}\n           the judge answered, but its verdict could not be read`);
      unmeasurable++;
      continue;
    }
    const ok = verdict.correct === f.shouldBeCorrect;
    if (!ok) wrong++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}     ${f.what}`);
    console.log(`           expected the judge to say ${f.shouldBeCorrect ? 'correct' : 'incorrect'}, it said ${verdict.correct ? 'correct' : 'incorrect'}`);
    console.log(`           its reason: ${verdict.reason}`);
  }

  const answered = JUDGE_FIXTURES.length - invalid - unmeasurable;
  console.log(`\njudge-check: ${answered - wrong}/${answered} answered fixtures judged correctly` +
    `${unmeasurable ? `, ${unmeasurable} unmeasurable` : ''}${invalid ? `, ${invalid} invalid` : ''}`);

  if (invalid) {
    console.error('A fixture is wrong: the property checks reject it, so the judge would never see it.');
    return finish(1);
  }
  if (wrong) {
    console.error('The judge got a verdict wrong on an answer whose verdict is not in doubt. Any pass rate it produced is worth less than it looks.');
    return finish(1);
  }
  // Two of four is not enough to conclude anything about a judge, in either direction.
  if (answered < 3) {
    console.error(`Only ${answered} of ${JUDGE_FIXTURES.length} fixtures got a verdict. Too few to judge the judge. Exit 2 = inconclusive.`);
    return finish(2);
  }
  return finish(0);
}

// Score a recorded run through the real checks, with no key, no network and no cost.
//
// WHY THIS EXISTS
//   Everything worth understanding in this harness is the scoring, and the scoring is
//   deterministic. The only part that needs the internet is the model call, and that is the part
//   that keeps failing: on 2026-09-15 three consecutive live runs ended INCONCLUSIVE, twice before
//   a single case had been scored, because a free slug had been retired and another was rate
//   limited upstream. A harness that cannot be run on demand cannot be explained to anyone, and an
//   eval nobody can demonstrate is worth very little.
//
//   So this replays the answers captured in sample-run.json through the same property checks and
//   the same report, in about a second. Pair it with --show to watch one sentence go through the
//   whole ladder.
//
// IT IS A REPLAY AND IT SAYS SO
//   The verdicts are the ones the judge gave when the run was captured. Nothing is being judged
//   here and no model is consulted. A recorded verdict presented as a fresh one would be exactly
//   the kind of quiet dishonesty the rest of this file exists to prevent.
//
// IT ALSO GUARDS THE SCORER
//   Each recorded row carries the status it was given at the time. If a change to the checks would
//   score real captured answers differently, the mismatch is printed rather than passing quietly.
function replay() {
  const artifact = new URL('./sample-run.json', import.meta.url);
  if (!fs.existsSync(artifact)) {
    console.error('evals: sample-run.json is missing, so there is nothing to replay.');
    return finish(1);
  }
  const rec = JSON.parse(fs.readFileSync(artifact, 'utf8'));
  const byId = new Map(data.cases.map((c) => [c.id, c]));

  console.log(`REPLAY of the run captured at ${rec.at}. No model was called.`);
  console.log(`Answers from \`${rec.model}\`, verdicts from \`${rec.judge}\`, floor ${(rec.threshold * 100).toFixed(0)}%.\n`);

  const rows = [];
  let drift = 0;
  for (const row of rec.rows) {
    const c = byId.get(row.id);
    if (!c) continue; // a recorded case the dataset no longer has
    const checks = checkList(row.got, c.expect);
    const prop = properties(row.got, c.expect);
    let status, detail;
    if (row.status === 'infra') {
      status = 'infra';
      detail = row.detail; // it never produced an answer; there is nothing to re-score
    } else if (!prop.ok) {
      status = 'fail';
      detail = prop.why;
    } else if (!row.judge) {
      status = 'infra';
      detail = 'the judge answered, but its verdict could not be read';
    } else {
      status = row.judge.correct ? 'pass' : 'fail';
      detail = row.judge.correct ? 'ok' : `judge: ${row.judge.reason}`;
    }
    if (status !== row.status) {
      drift++;
      console.log(`  DRIFT ${row.id}: recorded ${row.status}, scored now ${status}`);
    }
    rows.push({ id: row.id, status, detail });
    if (SHOW) showCase(c, row.got, checks, row.judge ?? undefined, status);
    else process.stdout.write({ pass: '.', fail: 'x', infra: '!' }[status]);
  }
  if (!SHOW) process.stdout.write('\n');

  const scored = rows.filter((r) => r.status !== 'infra');
  const passed = rows.filter((r) => r.status === 'pass').length;
  const rate = scored.length ? passed / scored.length : 0;
  console.log(`\nReplay: ${passed}/${scored.length} scored cases passed, rate ${(rate * 100).toFixed(0)}% (floor ${(rec.threshold * 100).toFixed(0)}%)`);
  for (const r of rows) {
    const mark = { pass: 'PASS ', fail: 'FAIL ', infra: 'INFRA' }[r.status];
    console.log(`  ${mark}  ${r.id.padEnd(14)} ${r.status === 'pass' ? '' : '- ' + r.detail}`);
  }
  console.log(`\nThis is a recording, not a measurement. Run without --replay to ask a live model.`);
  if (drift) {
    console.error(`\n${drift} case(s) score differently now than when they were recorded. Either the checks changed on purpose, or they changed by accident.`);
    return finish(1);
  }
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

  // Who judges the judge is a fair question; who CHOOSES the judge is a cheaper one, and it used to
  // be answered wrongly. The default was the model under test, so a plain run graded its own
  // homework and printed the flattering number without comment.
  const JUDGE_PICK = [
    ['an explicit choice wins', 'openrouter', 'a/model', { EVAL_JUDGE_MODEL: 'b/model' }, 'b/model'],
    ['otherwise the provider default', 'openrouter', 'a/model', {}, DEFAULT_JUDGE.openrouter],
    ['anthropic has its own default', 'anthropic', 'claude-sonnet-5', {}, DEFAULT_JUDGE.anthropic],
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
  for (const [name, provider, model, env, expected] of JUDGE_PICK) {
    const got = pickJudge(provider, model, env);
    const ok = got === expected;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} pickJudge: ${name}${ok ? '' : ` (got ${got})`}`);
  }
  // The property that actually protects the run: a plain invocation must not end up self-graded.
  for (const provider of ['anthropic', 'openrouter']) {
    const ok = pickJudge(provider, DEFAULT_MODEL[provider], {}) !== DEFAULT_MODEL[provider];
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} pickJudge: a default run on ${provider} is not self-graded`);
  }
  const total = CASES.length + PARSE.length + JUDGE_PICK.length + 2;
  console.log(`\nself-test: ${total - failed}/${total} passed`);
  return finish(failed ? 1 : 0);
}

await (process.argv.includes('--self-test')
  ? selfTest()
  : process.argv.includes('--list-free')
    ? listFree()
    : process.argv.includes('--judge-check')
      ? judgeCheck()
      : REPLAY
        ? replay()
        : runEval());
