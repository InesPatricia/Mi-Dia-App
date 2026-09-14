// The triage agent's decisions, tested without a key and without a request.
//
// The first test in this file is the incident. The agent shipped asking for ANTHROPIC_API_KEY, the
// repository only ever had OPENROUTER_API_KEY, and because every failure path logs and exits 0 the
// workflow stayed green for six weeks while the agent did nothing at all. A green run is not
// evidence that an agent ran. These assertions are what makes it evidence.
//
// No literal emoji or em dash appears in this file. The commit gate refuses both, and a test for
// code that removes a character has no business containing one, so they are built from code points.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL, RETRYABLE, pickProvider, pickKey, pickModel, readAnswer, isTruncated, plainDashes,
} from './ai-triage-lib.mjs';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

test('an OpenRouter key alone selects a provider (the six-week silence)', () => {
  assert.equal(pickProvider({ OPENROUTER_API_KEY: 'sk-or-test' }), 'openrouter');
});

test('provider resolution', async (t) => {
  await t.test('no key at all means no provider, and the agent skips', () => {
    assert.equal(pickProvider({}), null);
  });

  await t.test('an Anthropic key alone selects anthropic', () => {
    assert.equal(pickProvider({ ANTHROPIC_API_KEY: 'sk-ant-test' }), 'anthropic');
  });

  await t.test('Anthropic wins when both keys exist, so nothing changes for a repo that had one', () => {
    assert.equal(pickProvider({ ANTHROPIC_API_KEY: 'a', OPENROUTER_API_KEY: 'b' }), 'anthropic');
  });

  await t.test('an explicit choice overrides the keys present', () => {
    const env = { TRIAGE_PROVIDER: 'openrouter', ANTHROPIC_API_KEY: 'a', OPENROUTER_API_KEY: 'b' };
    assert.equal(pickProvider(env), 'openrouter');
  });

  await t.test('the key returned belongs to the provider chosen', () => {
    const env = { ANTHROPIC_API_KEY: 'a', OPENROUTER_API_KEY: 'b' };
    assert.equal(pickKey('anthropic', env), 'a');
    assert.equal(pickKey('openrouter', env), 'b');
  });
});

test('model selection', async (t) => {
  await t.test('each provider has a default', () => {
    assert.equal(pickModel('anthropic', {}), DEFAULT_MODEL.anthropic);
    assert.equal(pickModel('openrouter', {}), DEFAULT_MODEL.openrouter);
  });

  await t.test('the OpenRouter default names a router, not a model that can be retired', () => {
    // Two named free slugs died under the eval harness, one of them overnight. A default that names
    // a single model is a dead gate with a delay fuse: the agent goes quiet and nothing turns red.
    assert.equal(DEFAULT_MODEL.openrouter, 'openrouter/free');
  });

  await t.test('TRIAGE_MODEL overrides the default', () => {
    assert.equal(pickModel('openrouter', { TRIAGE_MODEL: 'some/model:free' }), 'some/model:free');
  });

  await t.test('ANTHROPIC_MODEL is still honoured, since it was the documented name first', () => {
    assert.equal(pickModel('anthropic', { ANTHROPIC_MODEL: 'claude-old' }), 'claude-old');
  });
});

test('reading an answer out of two different response shapes', async (t) => {
  await t.test('anthropic: text blocks are joined and the stop reason comes with them', () => {
    const json = { content: [{ text: 'part one ' }, { text: 'part two' }], stop_reason: 'end_turn' };
    assert.deepEqual(readAnswer('anthropic', json), { text: 'part one part two', stopReason: 'end_turn' });
  });

  await t.test('openrouter: the first choice carries the message and the finish reason', () => {
    const json = { choices: [{ message: { content: 'the triage' }, finish_reason: 'stop' }] };
    assert.deepEqual(readAnswer('openrouter', json), { text: 'the triage', stopReason: 'stop' });
  });

  await t.test('a response with no choices reads as empty rather than throwing', () => {
    // A helper that throws here turns into a stack trace in a log nobody opens. Empty is a state
    // the caller already knows how to refuse.
    assert.deepEqual(readAnswer('openrouter', {}), { text: '', stopReason: null });
    assert.deepEqual(readAnswer('anthropic', {}), { text: '', stopReason: null });
  });
});

test('truncation', async (t) => {
  await t.test('both providers report being cut off, in their own words', () => {
    assert.equal(isTruncated('max_tokens'), true, 'anthropic');
    assert.equal(isTruncated('length'), true, 'openai-compatible');
  });

  await t.test('a finished answer is not truncated', () => {
    assert.equal(isTruncated('end_turn'), false);
    assert.equal(isTruncated('stop'), false);
    assert.equal(isTruncated(null), false);
  });
});

test('dashes the model writes anyway', async (t) => {
  await t.test('em and en dashes become hyphens, because the comment is published', () => {
    assert.equal(plainDashes(`a ${EM_DASH} b`), 'a - b');
    assert.equal(plainDashes(`a ${EN_DASH} b`), 'a - b');
  });

  await t.test('text with nothing to fix is returned unchanged', () => {
    assert.equal(plainDashes('a - b, already plain'), 'a - b, already plain');
    assert.equal(plainDashes('non-blocking helper'), 'non-blocking helper');
  });

  await t.test('every occurrence is replaced, not only the first', () => {
    assert.equal(plainDashes(`one ${EM_DASH} two ${EM_DASH} three`), 'one - two - three');
  });
});

test('a rate limit is retryable and a bad request is not', () => {
  assert.equal(RETRYABLE.has(429), true);
  assert.equal(RETRYABLE.has(503), true);
  // 400 is a retired model slug or a malformed body. Retrying it wastes the allowance that the
  // next real failure will need.
  assert.equal(RETRYABLE.has(400), false);
  assert.equal(RETRYABLE.has(401), false);
});
