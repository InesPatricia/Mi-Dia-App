# Design system

The app ships two complete themes and one locked colour family. This file is the binding reference
for any change to colour, radius, typography or layout.

Read it before touching CSS. The short version: **change a token, never a hex; scope a theme, never
a base rule.**

## Themes

`<html data-theme>` is `light` or `dark` and drives everything. It is persisted in `settings.theme`
and applied by an early `<head>` script, before first paint, so there is no flash of the wrong theme.

`toggleTheme()` re-renders the active view, because some tints are computed in JS
(`paleTint`, `applyJWash`, `moonSVG`) and must recompute against the new tokens.

**Light values live in `:root`. Dark values live in an `html[data-theme="dark"] { … }` block that
remaps the same token names.** Because each theme block overrides the other's neutrals, editing
`:root` neutrals is light-only and editing the dark block is dark-only — there is no
cross-contamination. Per-theme tweaks go in scoped rules (`html[data-theme="light"] …`,
`html[data-theme="dark"] …`); never edit a base rule in a way that leaks into the other theme.

| Theme | Ground | Actions | Accents |
|---|---|---|---|
| Light-luxe | champagne | **wine `#6E1334`** | gilt hairlines |
| Dark-velvet | aubergine velvet | **gilt gold** | antique gold |

Both themes cover every view. There are no emoji in the UI — all icons are line-art SVG.

## Tokens

**Semantic (use these):**

```
--bg  --surface  --surface-2  --text  --text-soft  --line  --brand  --brand-ink  --accent
--act (+ the --act* family)        action colour
--gold-1  --gold-gilt  --gold-antique  --gold-deep  --gold-hair
```

**Radius scale** — one tier per role, never an ad-hoc pixel value:

```
--r-sm   controls: inputs, chips
--r-md   content cards
--r-lg   panels
--r-xl   sheets, modals, .hero
```

**Buttons:** `.btn--primary` is the single filled-button class — wine in light, gilt in dark. It
replaced ten-plus bespoke variants; do not add another.

**Cards:** `.card` is canonical. Shadows come from `--shadow-soft`.

### The locked family

```
--rose-1:#F4BFC4   --rose-2:#E58699   --rose-3:#D15E78   --rose-4:#B5495F
```

**These four are LOCKED.** They are the flower petals and a few functional uses. If something
consuming them looks wrong, override the consuming selector's appearance — never redefine the token.

Additive tonal range (v57), which may be extended:

```
--rose-0:#FBE4E5   --rose-5:#8E3349   --rose-dust:#C39199
--gold-1:#E8D2A0   --gold:#B8893F     --gold-deep:#9A6E2C
--sage-1:#E4E8DC   --sage:#9DAD8C     --sage-deep:#6F8268
```

### What each colour is allowed to mean

- **Action / brand** — one colour per theme, via `--act` / `.btn--primary`. Wine in light, gilt in dark.
- **Gold** — decorative only: petal icons, the panel flower glyph, the edit pencil, the italic "Día"
  in the hero, fine hairlines. **Never an action.**
- **Sage / olive** — functional only: the body-and-calm area colour, Calm exercise colours, the
  green done tick. Never a toggle or button state.
- **Area, tag, Calm-exercise and done colours stay non-brand.** They carry meaning, not emphasis.

A known inconsistency, left deliberate and documented: the legacy token `--rose:#CB8188` (mauve) is
still used in about thirteen places and is distinct from the `--rose-1..4` bougainvillea family.

## Typography

- **Fraunces** — serif display, brand and headers.
- **Nunito Sans** — body and labels, loaded with the `opsz` optical-size axis (migrated from Nunito
  in v57).

A drop-cap must use a **solid** colour, not `background-clip: text`. The clipped version cuts the
glyph at the box edge, depends on font and device, and came back repeatedly after being "fixed" —
see the v168 entry in the build log.

## Layout shell

Phone-frame. HERO (bougainvillea terrace photo, brand, daily phrase, date/progress band) → primary
navigation → day panel (`.daypad`) → bottom bar.

The hero is a rounded panel (`.hero`) with a photo and a fade veil, soft enough that the photo
breathes full-width. The brand reads **Mi _Día_** with "Día" in italic gold (`.brand-accent`). A
local warm gradient behind the phrase (`.phrase::before`) guarantees legibility over the photo.

The date band is one line — `‹ Luni 8 iunie ›`, no year — with the done counter on the right and a
fine progress bar beneath. The "return to today" link appears only when the viewed day is not today.

> **Version-sensitive.** The navigation described below is the v172 shape (radial flower nav with
> five petals plus a three-item bottom bar). The `staging` branch replaces it with a bottom tab-bar
> and turns the flower into living decoration. Check the current build before relying on this section.

**Navigation (v172):** one primary navigation, not two. The flower carries five petals at 72°
(Jurnal, Calm, Calendar, Progres, Proiecte), each keeping `data-v` and the `.tab` wiring via
`setView`. Petal shape is a teardrop generated from `petalPath` in a 128×149 viewBox. Each petal's
label sits **inside** the petal contour (`.labels .lbl`, `.l1`–`.l5` at absolute coordinates) and is
**not** counter-rotated inside the rotated petal — that breaks the layout.

The flower centre is an action, not a view: it opens the intention modal (`#intentModal`), a single
free-text field with no suggestion chips. The bottom bar holds three non-overlapping items — home,
`+`, profile — is `position:fixed` with `env(safe-area-inset-bottom)` padding, and `.phone-scroll`
carries 110px of bottom padding so nothing hides behind it. The `+` is not a tab; it toggles the
quick-add menu (`#bloomMenu`).

## Component classes worth knowing

`.add-commit` (full-width commit button) · `.time-preview` (+ `.nx` next-day badge) · `.minilabel`
(field headers) · `.btime` (time line above a slot title) · `.cluster` (side-by-side overlap
columns) · `.chiphint` (gesture hint). Per-slot area tints come from `--cat-pale` / `--cat-pale2`,
computed by `paleTint(color, amount)`.

## Before calling a visual change done

1. **Div balance** and `node --check` on each script block — the validation chain in the root
   `CLAUDE.md`.
2. **`node quality/e2e/theme-grid.js ../mi-dia-vNN.html`** — every view in both themes as one review grid,
   plus the legibility checklist. This is what catches invisible text on velvet.
3. **`cd quality/e2e && npx playwright test --project=mobile-chromium --grep-invert @visual`**.
4. Screenshot the changed view in **both** themes at 412px.

Headless Chromium is not a real Android device. Blur, `backdrop-filter`, native pickers and font
rendering differ, so the device pass stays a manual step.

## Related

- `.claude/skills/theme-qa/color-roles.md` — which colour a given thing should be.
- `.claude/skills/theme-qa/module-css.md` — CSS injected by the inlined modules (`cycle.js` and the
  persistence module), outside the main `<style>`.
- [`history/BUILD-LOG.md`](history/BUILD-LOG.md) — why any of the above is the way it is.
