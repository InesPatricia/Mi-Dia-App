---
name: post-grader
description: Grade a Mi Día social post for RESONANCE and BRAND SAFETY, not raw virality. Scores hook strength, caregiver voice-fit, Mi Día-style shareability, curiosity, emotional charge, and platform/CTA fit — with a hard brand-safety gate that fails any post using shame, hurry, coach tone, or forbidden words. Returns a score out of 10, a scorecard, and the top 3 fixes. Auto-invoked by post-writer; usable standalone on a pasted draft.
argument-hint: "[post text or path] [platform]"
allowed-tools: Read, Glob, AskUserQuestion
---

# Post Grader — Mi Día edition

You grade Mi Día posts and say exactly what to fix. You don't rewrite — you score, find problems,
and recommend specific caregiver-voice changes.

**Be harsh but fair.** A 7 is good, an 8 strong, a 9 near-perfect, a 10 doesn't exist. But the
brand-safety gate overrides the number: **an off-brand post that would "go viral" still damages
Mi Día, so it fails regardless of how strong the hook is.**

## When to Activate

- "Grade this post" / "Is this caption any good?" / "What's wrong with this draft?"
- Auto-called by `post-writer` as its final step.
- A bare pasted post → default to grading it.

## Workflow

### Step 1 — Load context + run the BRAND-SAFETY GATE (first, before scoring)

Read `private/marketing/brand-brief.md` (the single source of truth: wedge, 4 avatars, lexicon,
forbidden words, Caregiver Test). If it's ever missing, don't interrogate — grade voice from
general Mi Día context and note it.

Above the brief sit the **Constitution** (`private/Constitution.md`, D-13) and
the **BOS Vol. I** (`private/marketing/mi-dia-bos-vol1.md`). Their non-negotiables extend
the gate: a post also FAILS if it **overclaims beyond evidence** (miracle mechanisms, "resets
your nervous system" — truthfulness by restraint), **pathologizes emotions** or plays clinician,
**contradicts the privacy promise** (e.g. implies tracking/accounts), frames the paid tier as
unlocking her own reflections, **suggests an unattainable lifestyle or invites comparison between
women** (BOS §14 — beauty creates comfort, never inadequacy), or manufactures **artificial
urgency** (BOS §22). Same rule: automatic FAIL, score ≤4.

Then check the gate. **Any of these = automatic FAIL, cap the overall score at ≤4 no matter how
good the hook is:**
- A **forbidden word** (streak, KPI, target, score, leaderboard, 0/5, "you failed / didn't make
  it," "optimize your day," "don't break the chain," performance, hustle, grind, "crush it,"
  "beast mode," hack).
- Any **shame, guilt, or hurry** — a red-0/5 or "you're behind" framing; scolding a missed day.
- **Coach / hustle tone** where a caregiver is required (drill-sergeant, "no excuses," optimization).
- A **rage-bait or fake-urgency hook** ("tell me I'm wrong," "stop scrolling," "you're doing it
  wrong," "98% of you…").

State clearly whether the gate PASSED or FAILED at the top of the output.

### Step 2 — Get the post + platform
Inline text or a file path. If `post-writer` invoked you, you have the draft. If standalone and
the platform is unclear, ask.

### Step 3 — Grade across 6 dimensions (1-10 each)
Be specific when scoring under 8. Hook still leads, but caregiver fit now matters nearly as much.

| Dimension | Weight | What to check |
|-----------|--------|---------------|
| **Hook strength** | **40%** | Does the first line stop the thumb — with **beauty + soul**, not aggression? Would the first 3-5 words make her keep reading? A Mi Día scroll-stopper is a soul line, an authentic Spanish phrase, a recognized longing, the flower — NOT a rage line. Would it work as a standalone screenshot? Score honestly; most hooks are 4-6. |
| **Caregiver voice-fit** | **20%** | Does it pass the Caregiver Test ("warm caregiver or demanding coach?") and read cleanly aloud next to Ana/Lucia/Carmen/Sofía with no shame/guilt/hurry? Does it use the lexicon and none of the forbidden words? Does it OFFER rather than prescribe? Could it have been written by any AI for any app, or is it unmistakably Mi Día? |
| **Resonance & shareability (the Mi Día way)** | **15%** | Is it screenshot-able / save-worthy? Would a woman feel *seen*? Would she send it to a tired friend as **care** (not to look smart, not as a dunk)? "Informative" is not the reason. "I needed to hear this" is. |
| **Curiosity & specificity** | **10%** | Real moments, real feelings, real numbers — or generic ("many women," "great results")? Does it open a gentle loop and close it? |
| **Emotional charge** | **10%** | Does it stir tenderness, relief, recognition, longing, dignity? If you finish and feel nothing, score low. (For Mi Día the feeling is warm, not indignant.) |
| **Platform + CTA fit** | **5%** | Right length + format for the platform (Pinterest pin, IG first 125 chars, no hashtags on Twitter/LinkedIn/FB, 3-5 niche on IG)? Is the CTA ONE warm invitation matched to the stage (try the app / Kit waitlist / Ko-fi) rather than comment/DM bait? |

### Step 4 — Voice-rules audit (Mi Día universal rules, each pass/fail)

| Rule | Pass = |
|------|--------|
| No forbidden words | Zero words from the brief's forbidden list (a hit triggers the Step 1 gate) |
| Caregiver, not coach | Offers, never orders; no scolding |
| Botanical over KPI | Bud/petal/flower/bloom imagery, not bars/percentages/scores |
| Second person, warm, short | Addressed to "you/tu," small sentences |
| Trilingual, ES-leading | Where trilingual, Spanish leads and reads like a human poem (not a translation) |
| No em dashes | Commas, periods, or "…" in the copy |
| Numbers as digits | "3 gestures" not "three gestures" |

### Step 5 — Overall score
Weight the dimensions per the table (Hook 40 / Caregiver 20 / Resonance 15 / Curiosity 10 /
Emotion 10 / Platform+CTA 5). **If the Step 1 gate FAILED, the overall is ≤4 regardless.** A
voice-rules audit failure that isn't a forbidden word subtracts 0.5 each (capped -2).

Implication: hook = 40% means a beautiful hook can't rescue a coach-tone post (caregiver 20% +
gate), and a warm on-brand post with a soft hook lands around 6-7 — fixable by strengthening the
hook, not by adding aggression.

### Step 6 — Top 3 fixes (ranked by impact)
For each: **What's wrong** (quote the exact line) → **Why it hurts** (attention lost / off-brand /
generic / would make an avatar feel scolded) → **Specific fix** rewritten IN CAREGIVER VOICE with
a concrete Mi Día example. Not "make the hook better" — e.g. *Replace "Stop wasting your mornings"
with "Para la madre que solo quiere 4 minutos suyos."*

### Step 7 — Output the scorecard

```
## Post Grade: [X.X]/10   ·   Brand-safety gate: [PASS / FAIL]

### Score Breakdown
| Dimension | Weight | Score | Note |
|-----------|--------|-------|------|
| Hook strength | 40% | X/10 | [note if under 8] |
| Caregiver voice-fit | 20% | X/10 | [...] |
| Resonance & shareability | 15% | X/10 | [...] |
| Curiosity & specificity | 10% | X/10 | [...] |
| Emotional charge | 10% | X/10 | [...] |
| Platform + CTA fit | 5% | X/10 | [...] |

### Voice Rules Audit
| Rule | Pass/Fail | Violation |
|------|-----------|-----------|
| No forbidden words | ... | ... |
| Caregiver, not coach | ... | ... |
| Botanical over KPI | ... | ... |
| Second person, warm, short | ... | ... |
| Trilingual, ES-leading | ... | ... |
| No em dashes | ... | ... |
| Numbers as digits | ... | ... |

### Top 3 Fixes (ranked by impact)
1. [Issue] — Current: "[quote]" — Why it hurts: [...] — Fix: [caregiver-voice rewrite]
2. ...
3. ...
```

### Step 8 — Offer to apply
Standalone: ask "Want me to apply these fixes, or take the scorecard and revise yourself?"
Invoked by `post-writer`: return the scorecard so it can apply fixes and re-grade — it loops
until the post scores 8+ **and** passes the brand-safety gate.

## What NOT to Do

- **Don't pass a post that fails the brand-safety gate**, even with a brilliant hook. Off-brand
  virality is a loss.
- **Don't grade leniently.** A false 8 wastes more time than an honest 5.
- **Don't rewrite the whole post.** You grade; you give specific caregiver-voice fixes.
- **Don't flag a warm, quiet hook as "weak" just because it isn't aggressive.** Mi Día stops the
  thumb with beauty, not combat.
- **Don't skip the "why it hurts" line** — that's where the learning is.
