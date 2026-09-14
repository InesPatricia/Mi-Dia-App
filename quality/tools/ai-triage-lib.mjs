// The decisions inside the triage agent that can be wrong without anything crashing: which provider
// to use, which model, how to read an answer out of two different response shapes, and whether that
// answer is complete. They live here, away from the network and the GitHub API, so a test can reach
// them with no key and no requests. ai-triage.mjs is the only caller.
//
// The split exists for a reason this repository paid for. The agent shipped on 2026-07-28 and did
// nothing at all until 2026-09-14, because it asked for a key the repository did not have. Nobody
// noticed, since every failure path logs and exits 0 on purpose. Logic that is designed to fail
// quietly has to be the logic that is tested.

// OpenRouter retires named free slugs without notice. The eval harness lost two defaults that way,
// one of them overnight between two runs. `openrouter/free` names a router rather than a single
// model, so it outlives any one of them being retired. To see what is alive right now:
//     node quality/evals/run.mjs --list-free
export const DEFAULT_MODEL = {
  anthropic: 'claude-sonnet-5',
  openrouter: 'openrouter/free',
};

// Transient HTTP statuses. A rate limit is not a finding about the failure being triaged, so it is
// worth one more attempt before the agent gives up and says nothing.
export const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

// An explicit choice wins. Otherwise whichever key exists, Anthropic first, so adding an OpenRouter
// key to a repository that already has an Anthropic one changes nothing about how it behaves.
export function pickProvider(env = process.env) {
  if (env.TRIAGE_PROVIDER) return env.TRIAGE_PROVIDER;
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}

export function pickKey(provider, env = process.env) {
  return provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENROUTER_API_KEY;
}

// ANTHROPIC_MODEL is still honoured because it was the documented name before this file existed,
// and a repository that set it should not silently start using something else.
export function pickModel(provider, env = process.env) {
  return env.TRIAGE_MODEL || env.ANTHROPIC_MODEL || DEFAULT_MODEL[provider];
}

// Two providers, two response shapes. The stop reason comes back alongside the text because a
// truncated answer and a finished one are indistinguishable from the text alone.
export function readAnswer(provider, json) {
  if (provider === 'anthropic') {
    return {
      text: (json?.content ?? []).map((b) => b?.text ?? '').join(''),
      stopReason: json?.stop_reason ?? null,
    };
  }
  return {
    text: json?.choices?.[0]?.message?.content ?? '',
    stopReason: json?.choices?.[0]?.finish_reason ?? null,
  };
}

// Anthropic calls it max_tokens, OpenAI-compatible endpoints call it length. Both mean the answer
// stopped in the middle, and the part that is missing is the part with the reproduction steps. A
// triage cut in half reads as a finished opinion, which makes it worse than no comment at all.
export function isTruncated(stopReason) {
  return stopReason === 'max_tokens' || stopReason === 'length';
}

// The standing rule in this repository is no em dashes in anything published, and this text is
// published, as a comment under the maintainer's account. The model writes them regardless of what
// it is asked. A hyphen keeps the sentence readable where deleting the character would not.
//
// Built from code points rather than written out, the way the commit gate builds its own: a file
// that removes a character has no business containing one.
const DASHES = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`, 'g');

export function plainDashes(text) {
  return text.replace(DASHES, '-');
}
