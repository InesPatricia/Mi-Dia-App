---
name: marketing-design
description: NEW BRAND SURFACES ONLY. Guidance for distinctive, on-brand visual design when CREATING a new outward-facing Mi Día surface as its own file — a marketing/landing page, the future public/subscription version, an App Store / social / promo layout, an onboarding or paywall screen, or any "make a page/site/hero for Mi Día". Grounds the work in Mi Día's locked brand DNA (Mediterranean quiet-luxury, wine + gilt + champagne, Fraunces + Ephesis + Nunito Sans), its persona, and its voice, so nothing reads as a templated default. NOT for editing the app itself — for any change inside mi-dia-vNN.html (theme/CSS/flower/hero/cards/fonts) use /design-check + /theme-qa instead.
license: Complete terms in LICENSE.txt
---

# Marketing Design — Mi Día

**Respond in Romanian without diacritics** (a i s t, not ă î ș ț). Skill body is English; so is any code comment.

Approach this as the design lead for **Mi Día** — a Mediterranean "old rich" / quiet-luxury daily planner for
reflection + structure + wellness. This is NOT a blank brief: Mi Día already has a locked identity (below).
Your job on any new surface — a **landing page, the public/subscription version, an App Store page, a social
tile, an onboarding/paywall, a promo still** — is to extend that identity into a distinctive, intentional
design, never a templated default, and never a re-derivation of the palette from scratch. The brand is the
brief. Take one real aesthetic risk you can justify *within* the brand, not against it.

> **Scope: NEW BRAND SURFACES ONLY.** This skill CREATES new outward-facing / marketing files from the brand
> DNA. If the task is a change INSIDE the app (`mi-dia-vNN.html` — its theme/CSS/flower/hero/cards/fonts),
> STOP and use **`/design-check`** + **`/theme-qa`** — those VERIFY the app against the locked system and run
> the mandatory validation chain (div-balance + node --check + screenshots). Do not edit `mi-dia-vNN.html`
> from here.
>
> One-line split: **`/marketing-design` = architect of new brand surfaces · `/design-check` = QA inspector of
> the app.** Shared palette, opposite jobs. Rule of thumb: are you creating a file that ISN'T `mi-dia-vNN.html`
> and that a prospective user (not an existing one) would see? → this skill. Otherwise → `/design-check`.

## Ground it in Mi Día's world

Distinctive choices come from the subject's own materials — build with these, not with stock wellness clichés:

- **The Mediterranean terrace at golden hour** — the bougainvillea cascade, warm stone, champagne light. The
  hero photo (`HeaderImage`) is the emotional anchor; the whole palette is drawn from it.
- **The daily Spanish phrase** — the "catch". A short line of Spanish on the photo, no box, with a quiet
  translation beneath. This is Mi Día's signature copy device; a marketing hero should lead with a *real*
  one, not a generic tagline. (Drop-cap gilt initial is on-brand.)
- **The single flower** — the radial 5-petal nav bloom (Journal · Respiro · Calendar · Progress · Projects),
  centre = "the day's intention". One flower, one signature. Don't multiply it.
- **Reflection + gentleness** — mood discs, the 4F journal, breathing/somatic Respiro, the emotion wheel. The
  product's job is calm structure, not productivity pressure. The design must feel *unhurried*.
- **Origin mood board:** *BonVoyage Christine* — luxury travel: bordo/aubergine, magenta, taupe, cream,
  antique/polished gold. "Old rich, quiet luxury." Keep echoing it.

State the surface's single job before designing (e.g. "convince a reflective woman to install a calm planner
she'll actually keep open"), and name the audience — you already know her (below).

## Persona (design for her, specifically)

A woman who wants **structure + reflection + wellness in one calm place** — not another aggressive habit app.
Mediterranean/Spanish warmth resonates; she values *femininity, gentleness, quiet luxury* over gamified
streak-shaming. She reads EN / ES / RO. She's on a phone (Android Chrome first). She's put off by cold SaaS
dashboards, loud gradients, and hustle-culture copy. She'll pay for something that feels *personal and
premium*, like a well-made paper journal — that's the public/subscription bet.

Aesthetic north star (locked): **omogenitate, fluenta, naturalete, simplitate, feminitate, blandete** — calm,
not overwhelming.

## Brand DNA token system (LOCKED — extend, do not re-invent)

**Palette.** Two real themes; a marketing surface usually leads with **Light-luxe** but a dark-velvet variant
is fair game for premium/night moments.

- Light-luxe: bg champagne `#F3ECE0` / pearl `#FBF6EC`; card `#FFFCF7`; **action = WINE `#6E1334`**; text
  `#3A2438`, soft `#8C6E72`.
- Dark-velvet: bg radial aubergine→night `#3E1326 → #250b15`; card velvet `#4A1A30`/`#511D38`; text champagne
  `#EFE2D0` / muted `#C9A99E`; **action = GILT GOLD**.
- Metals (shared, **metal only — never the action color in light**): `--gold-1 #E8D2A0` · `--gold-gilt #C8A24C`
  · `--gold-antique #B8893F` · `--gold-deep #9A6E2C`; taupe `#C9A99E` / `#A98A7E`.
- **Rose family is LOCKED** in-app (`#F4BFC4 #E58699 #D15E78 #B5495F`) — the flower petals. In marketing it's a
  supporting blush, never the primary action (wine is).

**Signature accent = the gilt gold HAIRLINE** — gradient `linear-gradient(100deg,#E8D2A0,#C8A24C 45%,#9A6E2C)`.
Use it as a divider / card top-edge / rule under a date, exactly as the mood board's gold bar. This one detail
says "Mi Día" more than anything else — spend your restraint budget keeping it precise.

**Typography (only these three — pairing is part of the identity):**
- **Fraunces** — serif display / headlines / brand. Push it large + tight for heroes.
- **Ephesis** — a gold signature SCRIPT, **brand text ONLY** (the "Día" wordmark, an occasional flourish).
  Never body, never UI.
- **Nunito Sans** — body / UI / captions / data (`opsz` axis).
- **Wordmark:** "Mi" in Fraunces + **"Día" in Ephesis painted with the gilt gradient** (`background-clip:text`).
  Tagline UPPERCASE, letter-spaced. Don't invent a new logotype.

## Voice & copy (design material, trilingual)

Words help her navigate; they are not decoration. Match the calm, warm register — no hustle, no shouting.

- **The Spanish-phrase hero** is the copy signature: a short evocative ES line + a quiet local-language
  translation beneath (hide the translation when the page language IS Spanish, per the app). Write a *real*
  one for the surface, not "Plan your day, beautifully."
- Warm, plain, active voice; sentence case; tone matched to gentleness. "Empieza tu día" over "Get started."
- **All user-visible strings in EN / ES / RO** from the start (the app is trilingual; a marketing page that
  drops a language breaks the promise). User-typed data is never translated.
- Empty/error/waitlist states = direction + warmth, never mood-poetry or apology.
- Name features by what she recognizes: "your day's intention", "a moment to breathe", not "block model" /
  "somatic exercise engine".

## Design principles

- **The hero is a thesis.** Open with the most characteristic thing in Mi Día's world — the terrace photo with
  a living Spanish phrase and the gilt-scripted "Día", or the single flower blooming, or a real day taking
  shape. A big number + label + gradient accent is the template answer; only use it if it's genuinely best
  (it usually isn't for this brand).
- **Type carries the personality.** Fraunces large + tight, Ephesis as a rare gold flourish, Nunito Sans quiet
  underneath. Make the type treatment memorable, not a neutral delivery vehicle.
- **Structure encodes truth, not decoration.** Numbered 01/02/03 markers only if the content is a real
  sequence (e.g. plan → reflect → breathe as an actual daily loop). The flower's five petals ARE a real set —
  a legitimate structural device; a fake "3 easy steps" is not.
- **Motion, deliberately.** A page-load bloom of the flower, a soft golden-hour parallax on the terrace, a
  hairline drawing itself under the date. One orchestrated moment beats scattered effects — and scattered
  effects read as AI-generated. Respect `prefers-reduced-motion`.
- **Match complexity to the vision.** Mi Día is minimal-luxury, so precision in spacing/type/hairlines matters
  more than density. Elegance = executing the quiet vision perfectly, not adding.

## Process: brainstorm → plan → critique → build → critique again

Do most of this in your thinking; show the user options only when confident they'll delight.

1. **Plan (compact token system for THIS surface):**
   - *Color* — 4–6 named hex, drawn from the DNA above (don't re-derive; choose the theme + which metals).
   - *Type* — the three faces in their roles + an intentional scale/weights.
   - *Layout* — one-sentence concept + an ASCII wireframe. Phone-first (Android Chrome), then up.
   - *Signature* — the ONE thing this surface is remembered by (the living Spanish phrase, the blooming
     flower, the gilt hairline drawing in). Pick one, keep the rest quiet.
2. **Critique the plan before building.** Mi Día's own look — cream bg + high-contrast serif + a warm accent —
   sits dangerously close to **AI-default look #1** (cream `#F4F1EA` + serif + terracotta). Prove yours is a
   *choice*, not the default: the action is **WINE `#6E1334`** (not terracotta), the accent is a **gilt
   hairline** (not a flat swatch), the display pairs with an **Ephesis gold script**, the hero is a **real
   bougainvillea terrace + a living Spanish phrase**, and a **dark-velvet** counterpart exists. If any part of
   your plan would look identical for a generic wellness app, revise it and say what you changed and why.
3. **Build** to the revised plan exactly; derive every color/type decision from the tokens.
4. **Critique again** as you build — screenshot if you can (a picture is worth 1000 tokens). Chanel rule:
   remove one accessory before you ship.

**CSS caution:** watch selector specificity — type-based (`.section`) vs element/utility (`.cta`) rules cancel
each other, especially section paddings/margins. Keep one source of truth per spacing decision.

## Restraint & self-critique

- **Spend boldness in one place.** Let the signature (Spanish phrase / flower bloom / gilt hairline) be the
  one memorable thing; keep everything else disciplined. Cut decoration that doesn't serve the brief.
- **Quality floor, silently:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
  respected, real contrast (wine on champagne, champagne on velvet — check it).
- Not taking a risk is itself a risk. A perfectly safe champagne-serif page is the default; the gilt script,
  the living phrase, the velvet night variant are where you earn the "distinctive".

## The three AI defaults to avoid

Where the brief leaves an axis free, don't spend it on: (1) cream `#F4F1EA` + high-contrast serif + terracotta
accent — **the closest trap for us**; differentiate hard (wine action + gilt hairline + Ephesis + real photo);
(2) near-black bg + one acid-green/vermilion accent — off-brand, don't; (3) broadsheet hairline-rule newspaper
columns — off-brand unless a specific editorial moment calls for it. Mi Día's own words always win over these.

## References (use these — don't re-derive)

- **`CLAUDE.md`** — the "⭐ Luxury old-rich Light+Dark revamp" section + the "Visual design system (LOCKED)"
  section: full palette, type, flower, hero, and the origin mood board.
- **`private/mockups/mi-dia-luxe-mockup.html`** — the approved luxe direction (live theme switcher) +
  `private/mockups/luxe-previews/` PNGs. Match it.
- **`.claude/skills/theme-qa/color-roles.md`** — the color ROLE map (action=wine/gilt · metal=gold ·
  functional=area/mood/calm · surface/text). Recolor by role.
- **Marketing videos** (separate project `Desktop/marketing-videos`, HyperFrames HTML→MP4) — if the surface is
  a promo still/video, reuse its brand assets/fonts; see its `BUILD-NOTES.md`. Keep video motion calm (no
  continuous motion), matching the app's gentleness.
- **Live app** for tone: `mi-dia-app.pages.dev`.

## What NOT to do

- Don't re-derive the palette or invent a new logotype — extend the locked DNA.
- Don't use loud gradients, hustle-culture copy, gamified streak-shaming, or cold SaaS-dashboard chrome.
- Don't drop a language (EN/ES/RO), don't leave the Spanish-phrase device on the table for a generic tagline.
- Don't reach for a body/display face outside Fraunces + Ephesis + Nunito Sans.
- Don't let gold become the action color in light (it's metal); wine is the light action, gilt is the dark one.
- Don't touch `mi-dia-vNN.html` here — this skill produces its own outward-facing file(s).
