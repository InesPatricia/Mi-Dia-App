---
name: brand-brief
description: Read or update Mi Día's brand brief (private/marketing/brand-brief.md) — the single source of truth every content skill reads for voice, avatars, wedge, CTA, and channels. The brief already exists, distilled from the brand bible + strategy; this skill maintains it. Triggers on "update my brand brief," "we changed the voice/audience," "add this to the story vault," or when another skill needs context and the file is missing.
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# Brand Brief — Mi Día edition

You maintain `private/marketing/brand-brief.md` — the **single source of truth** every content
skill (`content-coach`, `post-writer`, `post-grader`, `repurpose`, `viral-hooks`) reads first.
It's already written, rich, and distilled from the brand bible (`private/marketing/
mi-dia-brand-voce.html`) + the strategy (`private/marketing/mi-dia-strategie.html`). Your job is
to **read it and update it in place** — not to interrogate Ines about a brand she has fully defined.

**Order of authority (D-13, 2026-07-06):** the **Constitution**
(`private/Constitution.md`) wins over everything → then the bible → then this
brief — reconcile downward. Never update the brief in a way that contradicts a constitutional
non-negotiable (privacy as precondition, zero shame/guilt/hurry, truthfulness by restraint,
no subscription / no paywalled reflections, the 12-question decision filter). The public
**manifesto** (`private/marketing/mi-dia-manifesto.md`, trilingual ES-lead) is the Constitution's
external one-pager — approved copy, reuse its lines.

The file lives under `private/` (gitignored — the repo is a public CV showcase), so it can safely
hold strategy detail.

## When to Activate

- Ines wants to UPDATE the brief: a new surface (the premium / lifetime launch), a new audience, a
  voice nuance, a new story for the Story Vault, a strategy shift.
- Another skill needs context and the file is missing / was reset (rare — use the cold-start fallback).
- Ines asks to refresh an outdated section.

## Workflow

### Step 1 — Read the brief
Read `private/marketing/brand-brief.md`. Since it exists and is rich, the DEFAULT path is
**UPDATE**, not create. Ask what changed (which section). Don't re-ask everything.

### Step 2 — Update the relevant section in place
Edit only the section that changed with the Edit tool; keep the rest intact. Preserve the file's
existing structure:

- **Business** (+ category discipline: never "habit tracker / productivity app")
- **Stage** (validation → monetization)
- **Customer** — the 4 avatars (Ana, Lucia, Carmen, Sofía) + the niche
- **Primary CTA** (by stage: try the app / Kit waitlist / Ko-fi)
- **Strong Opinion / Wedge** (gentle productivity; a rest day blooms)
- **Story Vault** (raw material — add to it over time)
- **Voice** — Caregiver archetype + 6 voice principles + lexicon + forbidden words + the Caregiver
  Test + universal voice rules
- **Taglines** (ES lead · RO · EN — reuse verbatim)
- **Marketing order** (the 6 rungs)
- **Channels** (trilingual SEO, Pinterest, product-led share-card, build-in-public)
- **Monetization** (free forever + lifetime pay-what-fair)
- **Production wiring** (HyperFrames video, /marketing-design surfaces, /decizie)

Keep the tone caregiver, never coach. Never introduce a forbidden word (streak, KPI, score, 0/5,
hustle, "don't break the chain," optimize, performance…).

### Step 3 — Keep the sources in sync
If a **voice or strategy** change is made here, note that it should also land in the bible /
strategy HTML docs, and log the decision via the **`/decizie`** skill so the single source of
truth stays coherent across the project.

### Step 4 — Confirm
Show Ines the changed section. Ask: "This is what I updated. Anything to fix or add?"

## Cold-start fallback (only if the file is missing / reset)

Don't interrogate Ines about a business she's already defined. Instead **reconstruct** the brief
from the three source docs — `private/Constitution.md` (the supreme law: ethics,
non-negotiables, privacy, monetization ethics), `private/marketing/mi-dia-brand-voce.html` (voice
bible: essence, promise, positioning, 4 avatars, archetype, 6 voice principles, lexicon, taglines,
marketing order) and `private/marketing/mi-dia-strategie.html` (channels, monetization, stage). Write it to
`private/marketing/brand-brief.md` in the rich structure above. Only ask Ines for genuinely new or
changed facts the docs don't cover.

## Why this file matters

Every content skill reads it first. Without it they produce **off-brand** content — rage-bait
hooks, streak language, coach tone — the exact opposite of Mi Día. With it, every post sounds like
Mi Día: warm, Mediterranean, unhurried, a gentle recognition of who she's becoming.

## What NOT to Do

- Don't run a cold 6-question interrogation — the brand is already defined; read and update instead.
- Don't shrink the brief to a generic template — preserve its rich Mi Día structure.
- Don't write the voice section in marketing-speak; use Mi Día's actual words (the lexicon).
- Don't add a forbidden word or a coach-tone line anywhere in the brief.
- Don't move the file out of `private/` — it stays gitignored.
