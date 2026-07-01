---
name: design-check
description: Use BEFORE and AFTER any visual, layout, CSS, color, theme, or styling change to the Mi Día PWA (mi-dia-vNN.html). Enforces the agreed luxury "old rich" Light+Dark design system and the project's mandatory validation chain (div-balance + node --check + screenshot in BOTH themes) so theme/contrast/flower-label regressions never ship. Invoke whenever a request touches CSS, colors, tokens, themes, the hero, the flower nav, cards, fonts, or "make it look…".
---

# Revamp — Mi Día luxe design check

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
