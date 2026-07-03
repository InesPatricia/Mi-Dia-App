---
name: design-check
description: IN-APP ONLY. Use BEFORE and AFTER any visual, layout, CSS, color, theme, or styling change INSIDE the Mi Día PWA file (mi-dia-vNN.html). Enforces the agreed luxury "old rich" Light+Dark design system and the project's mandatory validation chain (div-balance + node --check + screenshot in BOTH themes) so theme/contrast/flower-label regressions never ship. Invoke whenever a request touches the app's CSS, colors, tokens, themes, the hero, the flower nav, cards, fonts, or "make the app look…". For a NEW outward-facing / marketing surface built as its own file (landing page, public/subscription version, App Store / social / promo, onboarding/paywall) use /marketing-design instead — this skill does NOT cover new brand surfaces.
---

# Revamp — Mi Día luxe design check

> **Scope: IN-APP ONLY.** This skill governs changes INSIDE the app file `mi-dia-vNN.html` — it VERIFIES an
> existing, locked design system and gates it (nothing regresses). It does NOT design new pages. If the task
> is a NEW outward-facing / marketing surface built as its own file (landing page, public/subscription
> version, App Store / social / promo, onboarding/paywall), STOP and use **`/marketing-design`** — that skill
> CREATES from the brand DNA; this one CHECKS the app against it.
>
> One-line split: **`/marketing-design` = architect of new brand surfaces · `/design-check` = QA inspector of
> the app.** Shared palette, opposite jobs.

**Read the "⭐ NEXT UP" section of `CLAUDE.md` first** — it holds the full locked decisions + the phased
build plan (v133→v142). Mi Día is ONE self-contained `mi-dia-vNN.html` (HTML+CSS+JS, no build step). Every
change → a **NEW `vNN` file** (never overwrite a version in place). **Respond in Romanian without diacritics.**

## The design system (LOCKED with Ines)

Two REAL themes, switched via an `<html data-theme>` attribute + **`settings.theme`** (`light`|`dark`,
persisted in localStorage **and included in backup export**). Switcher = a discreet **☾/☀ toggle in the
hero** (next to the EN·ES·RO langbar) **+ a toggle in Settings**. **Default theme at first launch = LIGHT**
(returning users keep their saved `settings.theme`).

- **Light-luxe:** bg champagne `#F3ECE0` / pearl `#FBF6EC`; card `#FFFCF7` + ~30% gold hairline;
  brand/action = **WINE `#6E1334`**; text `#3A2438`.
- **Dark-velvet:** bg radial aubergine→night `#3E1326→#250b15`; card velvet `#4A1A30`/`#511D38`; text
  champagne `#EFE2D0` / muted `#C9A99E`; action = **GILT GOLD**.
- **Shared metal:** `--gold-1:#E8D2A0` · `--gold-gilt:#C8A24C` · `--gold-antique:#B8893F` ·
  `--gold-deep:#9A6E2C`; taupe `#C9A99E` / `#A98A7E`.
- **Signature accent = the gilt gold HAIRLINE** gradient `linear-gradient(100deg,#E8D2A0,#C8A24C 45%,#9A6E2C)`
  — divider / card top-edge / rule under the date. Plus: drop-cap on the Spanish phrase, candle-glow behind
  the flower centre, serif numerals for figures.
- **Wordmark:** "Mi" Fraunces serif + **"Día" in a gold script** (Google font **Ephesis**, brand text only).
  Tagline UPPERCASE, letter-spaced.
- **Typography:** **Fraunces** (display/brand) + **Nunito Sans** (body/UI) ONLY. No body-font change.

## Rules (do not violate)

- **Semantic tokens drive theming:** `--bg`, `--surface`, `--surface-2`, `--text`, `--text-soft`, `--line`,
  `--brand`, `--brand-ink`, `--accent`. Light values in `:root`; dark values in an
  `html[data-theme="dark"]` override block. Never hardcode a color that must flip with the theme — route it
  through a token.
- **LOCKED `--rose-1..4` stay untouched; the revamp is ADDITIVE** (new tokens/surfaces, not a recolor of the
  locked rose family).
- **Action color:** dark = gilt gold, light = wine. Gold everywhere else is **metal only** (hairlines, rings,
  petal icons, accents) — never the action color in light mode.
- **Design-system primitives (Faza 3, v157→v167 — USE these, don't invent new variants):**
  - **Action tokens** (defined in `html[data-theme="light"]{}`): `--act` (wine `#6E1334`), `--act-2` (hover /
    gradient top), `--act-deep`, `--act-ink` (champagne text on action), `--act-accent` (magenta). `--brand`
    is remapped to `--act` in light and to gilt in dark — so any `background:var(--brand)` themes correctly.
  - **`.btn--primary`** = the single filled action button (wine gradient light / gilt-filled dark). Give a new
    action button this class + keep its own layout (width/padding); do NOT create a bespoke colored button.
  - **`.card`** = the canonical card (`--surface` + `--line` + `--r-lg` + `--shadow-soft` + `--sp-5`).
  - **Radius scale:** controls `--r-sm` (12) · content cards `--r-md` (16) · panels `--r-lg` (20) · modals/
    sheets `--r-xl` (26). **Spacing:** `--sp-1..6` (4-based). No ad-hoc px radii on new controls/cards.
- **FLOWER LABELS — HARD REQUIREMENT (Ines flagged this explicitly):** keep the app's EXACT label system —
  the `.labels .lbl .l1–.l5` markup, the coordinates (`l1 170/78 · l2 255/142 · l3 222/244 · l4 118/244 ·
  l5 85/142`), the 5 line-icon SVGs, and the 9px UPPERCASE word. **Only re-skin colors** (gold line-icon;
  champagne text on dark / ink on light). **NEVER reposition** — every word must stay INSIDE its petal.
  Confirm on a screenshot in both themes.
- **i18n:** every new user-visible string in all 3 languages (EN/ES/RO); `data-i18n` / `-ph` / `-title` /
  `-aria`. User-typed data is never translated.
- **One change at a time → one new `vNN`.** Targeted edits only; no big-bang rewrite of the ~4300-line file.
- **PWA intact:** keep the inline manifest + the `/sw.js` registration; bump the `CACHE` constant in `sw.js`
  when promoting a build.

## Mandatory verification AFTER any layout/CSS/color change (before claiming done)

1. **Div balance** — opens == closes for `<div>` in the body (use the Python snippet in CLAUDE.md
   "CRITICAL: Validation after EVERY edit").
2. **`node --check`** on each `<script>` block (extract them first; delete temp files after).
3. **Screenshot the changed view in BOTH themes** (light + dark) at 412px and confirm:
   - no label/word spills OUT of any flower petal;
   - hero text stays legible over the bougainvillea photo (the dark veil must be strong enough);
   - text/figure contrast is OK on the velvet surfaces (no muddy gold-on-wine or low-contrast functional
     colors — area/calm/mood tints need legible variants on dark).
   - **Also spot-check a DESKTOP width (e.g. 1280px) for hero / phrase / drop-cap / type changes.** The
     `/theme-qa` grid + Playwright run at MOBILE (412px, Pixel 5) only, so a size-dependent bug can pass there
     and still ship. Real case (v156): the gilt drop-cap "P" clipped only at desktop — `background-clip:text`
     does NOT paint the part of a glyph that exceeds the element's box, and the larger desktop font exposed it;
     a mobile-only check declared it fixed while it was still broken. Fix pattern for a raised/gilt initial:
     give the box headroom with `padding-top` and cancel the shift with an equal negative `margin-top`.
4. **Run it, don't just parse it.** `node --check` catches SYNTAX, not runtime — a locally-scoped `esc()`
   called from a scope without it passed `node --check` but crashed at runtime and stopped slots rendering
   (13 e2e failures). So after the checks, exercise the app: `cd e2e && npx playwright test --grep-invert
   @visual` (or at least the specs your change touches), **per slice, not just at the end**. If the locked
   flower/bottom-bar shots moved, regenerate: `npx playwright test visual.spec.js --update-snapshots`.
5. **Be honest about the limit:** headless Chromium ≠ real Android (blur/backdrop-filter, fonts, native time
   pickers) — say so; the real-device pass stays Ines's step.

## Companion skills + references (use these — don't re-derive)

- **`/theme-qa`** — the Light+Dark QA gate: `e2e/theme-grid.js` shoots EVERY view in BOTH themes into one
  review grid + the legibility checklist + the e2e net. Run it before promoting a theme change (it's the
  automation of step 3, across all 8 views, that would have caught the reactive dark-mode bugs).
  Atomic one-off: `node e2e/shoot.js <file> <out.png> <view> <theme>`.
- **`.claude/skills/theme-qa/color-roles.md`** — the color ROLE map (action=wine/gilt · metal=gold · functional
  =area/mood/calm · surface/text). Recolor by role; never blanket-swap a locked token. Reference it instead
  of re-deciding "should this be wine or rose?".
- **`.claude/skills/theme-qa/module-css.md`** — CSS injected by persist.js (`.pb*`) / cycle.js (`.cy-*`) lives
  OUTSIDE the main `<style>`; theme those too (the persist banner shipped invisible because it was missed).

## Phased plan (reference — full detail in CLAUDE.md "⭐ NEXT UP")

`v133` Faza 0 foundation (Ephesis + gold tokens + semantic tokens + `data-theme` block, **zero visual change**
in light) → `v134` switcher plumbing → `v135` hero & brand → `v136` flower + bottom bar → `v137` cards &
components → `v138–v141` per-view passes (the bulk; dark exposes every hardcoded light color) → `v142` QA
(axe contrast on dark, **regenerate the Playwright visual baselines**, e2e + prod smoke, device pass).

## Mockup reference

The approved direction lives in `private/mockups/mi-dia-luxe-mockup.html` (open in a browser — live theme
switcher) + PNG previews in `private/mockups/luxe-previews/`. Match it; don't re-derive the palette.

## grep helpers

- Theme-sensitive hardcoded colors that should be tokens:
  `grep -nE '#[0-9A-Fa-f]{6}' mi-dia-vNN.html` — anything used as a surface/text background in a component
  rule (not in `:root` / `[data-theme]`) is suspect.
- Confirm the flower coords were NOT moved:
  `grep -nE '\.lbl\.l[1-5]\{' mi-dia-vNN.html` — must still read `170/78`, `255/142`, `222/244`,
  `118/244`, `85/142`.
