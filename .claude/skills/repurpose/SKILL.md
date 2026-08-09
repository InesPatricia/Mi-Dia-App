---
name: repurpose
description: Turn one long-form Mi Día input (a blog/pillar article, the landing copy, the brand bible, a Respiro research note, a build log) into a batch of platform-native posts across Mi Día's real channels — 3 Pinterest pins, 2 Instagram captions, 2 short-form video scripts (to HyperFrames), 2 build-in-public posts, 1 newsletter/SEO angle. Opens every output with an on-brand caregiver hook and grades each before returning. Triggers on "repurpose this," "turn this into posts," "break this into content."
argument-hint: "[paste long-form content] [optional: channels to prioritize]"
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# Repurpose — Mi Día edition

You take one long piece and turn it into a batch of platform-native posts, each written for its
platform (not copy-pasted). The mix maps to Mi Día's **actual organic channels** (from the
strategy, in leverage order: trilingual SEO #1, Pinterest #2, product-led share-card #3,
build-in-public #4). Voice is a **caregiver, never a coach**; content is trilingual, Spanish-leading.

## When to Activate

- "Repurpose this [article / landing copy / brand bible / research note / build log]"
- "Turn this into a week of posts" / "Break this into content"
- The user pastes a long block and asks for posts.

If the input is short (a single idea under a paragraph), this is the wrong skill — hand off to
`post-writer` instead.

## Workflow

### Step 1 — Load context
Read `private/marketing/brand-brief.md` — use the **voice, avatars, wedge, taglines, CTAs, and
6-rung order** to shape every output. If it's missing, don't block; mention once that it sharpens
the voice, then continue. Confirm the source type (article, landing, bible, research note, build
log) — transcripts/logs carry filler; plan to cut it.

### Step 2 — Extract the core themes
Pull out: the **1 central thesis**; **3-7 supporting points**, each strong enough to stand alone;
**every concrete asset** — real numbers, moments, feelings, the wedge, an avatar's situation.
List the themes back in 2-3 lines before writing so the user can redirect. Keep it short — don't
make her approve an outline.

### Step 3 — The output mix (Mi Día channels)
Produce (state it; if the source is thin, make fewer strong pieces rather than padding):

- **3 Pinterest pins** — each = pin title (≤100 chars) + a 1-2 line description + the visual idea
  (a flower card, a Spanish soul-line quote card). Pinterest is the #2 engine and this exact niche.
- **2 Instagram captions** — 1 feed, 1 Reel (the Reel notes the on-screen text). The flower +
  quote cards are the fuel.
- **2 short-form video scripts** (Reel / TikTok) — `HOOK` / `BODY` (with [on-screen text] +
  [visual] cues) / `CTA`, under ~45s spoken. Note: hand these to the **HyperFrames marketing
  project** (`Desktop/marketing-videos`) or `/product-launch-video` / `/motion-graphics` to render.
- **2 build-in-public posts** (LinkedIn or X) — the solo QA/AI + gentle-productivity story. A
  slightly more direct register is fine here, still never shaming.
- **1 newsletter / SEO angle** — a Kit newsletter snippet or a pillar-article angle (trilingual
  SEO is the #1 engine; feed it).

Reuse a strong theme across formats only when the angle changes. Don't publish the same post twice
in different fonts.

### Step 4 — Open every output with an on-brand hook
Invoke the `viral-hooks` skill for the top of every pin, caption, script, and post. Pass the theme
+ platform. It returns a caregiver-safe hook filled with real specifics. **Never** a generic AI
intro and **never** a banned aggressive hook (rage-bait, "stop scrolling," shame, FOMO). Vary the
hook families across the batch so a feed doesn't read formulaic.

### Step 5 — Write each output to its platform (Mi Día voice)
Apply the brief's universal voice rules to all of them: short "tu" sentences, botanical over KPI,
zero forbidden words, trilingual with Spanish leading (a human poem, not a translation), feeling
before features (the 6-rung order), offer-don't-prescribe, digits, no em dashes. CTAs are ONE warm
invitation from the stage set (try the app / Kit waitlist / Ko-fi), matched to platform.

### Step 6 — Grade and improve
Run `post-grader` on each output. Apply fixes. Return nothing below 8/10 or anything that fails the
brand-safety gate — loop on the hook/voice until it clears.

### Step 7 — Return the batch (grouped by channel)
```
## Pinterest (3 pins)
### Pin 1 — [theme] — [hook family] — [score]/10
Title: ... / Description: ... / Visual: ...
...
## Instagram (2)
### Caption 1 (feed) — [theme] — [hook family] — [score]/10
[full caption]
...
## Short-form video (2 → HyperFrames)
### Script 1 — [theme] — [hook family]
HOOK: [spoken] / [on-screen text]
BODY: ...
CTA: ...
## Build-in-public (2)
### Post 1 (LinkedIn) — [theme] — [hook family] — [score]/10
[full post]
## Newsletter / SEO (1)
### [angle] — [theme]
[snippet or pillar angle]
```

After the batch: offer to save it to a paste-file; note the video scripts go to the HyperFrames
marketing project; mention optional `postiz` for scheduling later. New brand SURFACES (a landing,
a paywall) → `/marketing-design`.

## What NOT to Do

- Don't copy the same text across platforms — each gets a native rewrite.
- Don't pad. If the source is thin, produce fewer strong pieces and say so.
- Don't open any output with a generic AI intro or a banned aggressive hook — everything comes
  from viral-hooks.
- Don't return a post below 8/10 or one that fails the brand-safety gate.
- Don't make the user approve a long outline — a 2-3 line theme summary is enough.
- Don't leave transcript/log filler ("um," "so basically") in the output.
- Don't translate the Spanish literally — write it as a small poem, or reuse a brief tagline.
