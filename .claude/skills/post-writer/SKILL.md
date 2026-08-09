---
name: post-writer
description: Write a complete Mi Día social post (hook + body + CTA) from a topic, sized for the target platform and trilingual (Spanish-leading). Reads private/marketing/brand-brief.md for the caregiver voice, wedge, and avatars, opens with an on-brand hook via viral-hooks, and auto-runs post-grader until the post scores 8+ and passes the brand-safety gate. Triggers on "write me a post about X," "draft a [platform] post."
argument-hint: "[topic or idea] [platform]"
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# Post Writer — Mi Día edition

You take an idea and a platform and return a finished Mi Día post: hook, body, CTA — graded and
improved before the user sees it. Mi Día's voice is a **caregiver, never a coach**; a scroll is
stopped with beauty and soul, not rage. The output is trilingual by default, **Spanish leading**.

## When to Activate

- "Write me a [platform] post about [topic]"
- "Draft an Instagram caption / a Pinterest pin for [idea]"
- The user has a topic AND a platform.

If the topic is missing, ask. If the platform is missing, ask. Don't fill in defaults.

## Workflow

### Step 1 — Load context
1. Read `private/marketing/brand-brief.md` (the single source of truth). It already exists,
   pre-filled. If it were ever missing, do NOT interrogate the user — the brand is fully defined;
   note it and proceed from Mi Día context (or offer to run the `brand-brief` skill).
2. Study the **Wedge** (gentle productivity / a rest day blooms), the **4 avatars** (Ana, Lucia,
   Carmen, Sofía), the **stage CTAs**, and the **6-rung marketing order** (feeling before features).
3. Confirm the topic + platform if unclear.

### Step 2 — Get the hook (invoke viral-hooks)
The hook decides everything. **Invoke the `viral-hooks` skill** with the topic + platform; it
returns an on-brand hook filled with real specifics.

On-brand families (what viral-hooks will draw from): Warm Recognition, the Category Reframe (the
wedge, as an invitation to relief), Gentle Curiosity, Transformation/Story, Warm Confession,
Gentle Receipts/build-in-public, Gentle Listicle, Soul Line/tagline.

BANNED (never write these): rage-bait ("tell me I'm wrong"), fake urgency ("stop scrolling"),
shame/fear ("you're failing at x"), aggressive polarity/comment-bait, FOMO, hustle/optimization.

### Step 2.5 — Iterate on the hook
1. Get 3 variations from viral-hooks. Lead the Spanish as a human poem, not a translation.
2. **First-3-words test:** do the first 3 words create warmth, recognition, or a gentle open loop?
3. **Caregiver Test (gate):** would a warm caregiver say this, or a demanding coach? Read it aloud
   next to the 4 avatars — no shame, guilt, or hurry.
4. Pick the strongest, cut filler. Don't touch the body until the hook is genuinely tender AND
   thumb-stopping. A Mi Día scroll-stopper is beauty + soul, not aggression.

### Step 3 — Draft the body (Mi Día voice)
- **Feeling before features** — follow the 6-rung order: hook → feeling → difference → proof it's
  gentle → trust (private, only yours) → reward (the monthly flower). Don't open with modules.
- **Botanical, sensory, "tu."** Bud, petal, flower, respiro, a warm moment. Not bars/percentages/KPIs.
- **One gentle idea.** A real feeling or moment (an avatar's evening, a rest day that blooms).
- **Offer, don't prescribe.** "Be gentle with yourself" is an invitation, never an order.
- **Short sentences**, addressed to her. No filler ("in today's world," "let me tell you").

### Step 4 — Add the CTA (one warm invitation, matched to stage + platform)
ONE CTA per post, from the validation-stage options in the brief:
- **Try the app** (free, no account) — `mi-dia-app.pages.dev`
- **Join the waitlist** (Kit) — the demand test
- **Support Mi Día** (Ko-fi, from 0€) — willingness-to-pay signal

Phrase it as a warm invitation, never bait:
- Good: "Save this for a hard evening." · "Which flower are you today?" · "A warm corner, free and
  yours — try it." · "If this is you, the waitlist is open."
- Never: "Tell me I'm wrong," "Tag someone," "Comment YES," "Like and share!"

| Platform | Warm CTA that fits |
|----------|--------------------|
| Pinterest | "Plan your day, gently — link in the pin." (drives saves + click) |
| Instagram (feed) | "Save this for a hard evening." / "Send this to a tired friend." |
| Instagram (Reel) | On-screen text + "Save for later." |
| TikTok | Soft hook in the first seconds + gentle "there's a calmer way." |
| LinkedIn / X | Build-in-public reflection + "I'm building it in the open — follow along." |
| Substack Notes | A screenshot-able soul line + "It lives on your phone. Only yours." |

### Step 5 — Voice-rules checklist (before grading)
- [ ] Zero forbidden words (streak, KPI, score, 0/5, "don't break the chain," hustle, optimize…)
- [ ] Caregiver, not coach — offers, never scolds
- [ ] Botanical/sensory over KPI/abstract
- [ ] Second person, warm, short sentences
- [ ] Trilingual, Spanish leading and written as a poem (unless one language was requested)
- [ ] No em dashes; numbers as digits
- [ ] Reads unmistakably like Mi Día, not a generic template

### Step 6 — Auto-invoke post-grader
Run the `post-grader` skill. Apply its fixes. Re-grade. **Do not return a post that scores below
8/10 or that fails the brand-safety gate.** Loop on the hook/voice until both clear.

### Step 7 — Return the final post
```
**Platform**: [platform]
**Hook family**: [name]
**Score**: [X/10]   ·   Brand-safety: PASS

---
[Final post — trilingual, Spanish first, then RO, then EN]
---

**Why this works**: [1 line on the brand fit — which avatar feels seen, which rung it hits]
```

Handoff: in a `content-coach` flow → return to the coach. Standalone → offer to save the text to
a paste-file. If the idea is a Reel/TikTok, hand the **script** to the HyperFrames marketing
project (`Desktop/marketing-videos`) or `/product-launch-video` / `/motion-graphics`. There is no
post-scheduler here (optional `postiz` later if the user sets it up).

## Platform Constraints (essentials)

- **Pinterest**: pin title ≤100 chars + a 1-2 line description; the image (flower / quote card)
  does the work; keyword in the title; link to the app or content hub.
- **Instagram**: hook in the first 125 chars; requires media; 3-5 niche hashtags at the end; one CTA.
- **TikTok caption**: under ~150 chars; gentle keyword early; the on-screen text + spoken hook matter more.
- **LinkedIn**: hook in the first 2 lines (~140 chars); 1,200-1,500 chars sweet spot; no external
  links in body; 3-5 hashtags optional. (Build-in-public register.)
- **Twitter/X**: 280 max, sweet spot 60-100; no hashtags; no links in body.
- **Threads / Bluesky**: 500 / 300 max; no hashtags.
- **Facebook**: 40-80 chars optimal; no hashtags; no engagement bait.

Default output is trilingual (Spanish-leading). If the user wants one language or one market, write
that one. For multi-platform, write the longer version, then offer a shortened cut for strict
platforms.

## What NOT to Do

- Don't return a post below 8/10 or one that fails the brand-safety gate. Loop.
- Don't write a banned aggressive hook, even if it "would perform."
- Don't lead with features. Lead with the feeling.
- Don't translate the Spanish literally — write it as a small poem, or reuse a brief tagline.
- Don't pile hashtags where they hurt (Twitter, LinkedIn, Facebook).
- Don't include the hook-family name or grade inside the post copy.
