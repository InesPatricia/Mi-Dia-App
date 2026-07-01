# Mi Día — color role map

The single source of truth for **which color a thing is allowed to be**, so it isn't re-derived every
session (and so parallel agents don't drift). Every color in the app belongs to exactly one ROLE. When you
recolor for a theme, you recolor **by role**, never blanket-swap a token.

## The four roles

| Role | Light-luxe | Dark-velvet | Rule |
|---|---|---|---|
| **ACTION / brand** (buttons, commit `+`, FAB, toggles-ON, TODAY pills, progress-bar fill, selected chips, active states, flower CENTRE) | **WINE `#6E1334`** (grad partner `#8C1E40`; ink on wine `#FBEFD9`); secondary accent `#A8255B` | **GILT GOLD** (`--gold-gilt #C8A24C`; ink on gold `--brand-ink #3A1020`) | The ONE brand/action color per theme. In light it is WINE, not rose. |
| **METAL / accent** (hairlines, dividers, card top-edge, rings, petal-icon strokes, the "Día" script, serif numerals) | gold hairline `rgba(184,137,63,.30)` · `--gold`/`--gold-deep` | gilt hairline `rgba(200,162,76,.34)` · `--gold-gilt/-1` | Gold is **metal only** — NEVER the action color in light (light action = wine). |
| **FUNCTIONAL** (area/category colors, mood discs+glow, calm/respiro exercise colors, cycle/menstruation, the GREEN done-tick) | keep the hue; ensure legible on champagne | keep the hue; give a legible-on-velvet variant | Data/semantic meaning — do NOT recolor to wine/gilt. Only fix contrast. |
| **SURFACE / TEXT** (page bg, cards, inputs, ink) | champagne bg `#F3ECE0` · pearl card `#FFFCF7` · ink `#3A2438` · soft `#8C6E72` | velvet bg radial → `#250b15` · card `#4A1A30` · champagne ink `#EFE2D0` · muted `#C9A99E` | Driven by tokens; theme flips them via the remap. |

## LOCKED / DO-NOT-TOUCH

- **`--rose-1..4`** (`#F4BFC4 #E58699 #D15E78 #B5495F`) — the bougainvillea family. Used by the **flower
  PETALS** (blush in light, velvet-tinted in dark) and historically by actions. **Never redefine the
  tokens.** To move an ACTION off rose, override the *consuming selector's appearance* (scoped to the
  theme), not the token.
- **Flower geometry + label coords** `l1 170/78 · l2 255/142 · l3 222/244 · l4 118/244 · l5 85/142` — only
  re-skin colors, never reposition; words stay inside petals.
- **DELETE / danger affordances** (the legacy mauve `--rose:#CB8188` on `.del`/`.tdel`/`.chip-x` hover,
  `.projdel`, `.idel`) — kept **distinct** from the wine primary action on purpose (a "delete" must not read
  like a "confirm"). Do NOT unify these to wine.
- **nav-active** stays **gilt** (`--gold-deep`) even in light — a wine active-nav next to the wine FAB
  over-saturates the bar.

## How to recolor for a theme (the pattern that worked)

1. **Foundation:** flip the neutral SURFACE/TEXT/line tokens in the theme block (`:root` for light,
   `html[data-theme="dark"]` for dark). One remap themes most cards/inputs/text for free. Because each
   theme block overrides the other's neutrals, changing `:root` neutrals is **light-only** and the dark
   block is **dark-only** — zero cross-contamination.
2. **Actions:** the remaining rose ACTION elements → wine (light) / gilt (dark) via
   `html[data-theme="<t>"] <selector>{…}` **scoped** overrides (never the base rule — that would leak into
   the other theme). Use literal `#6E1334`/`#A8255B` in light, `--gold-gilt` in dark (the `--brand` token
   still maps to rose in light `:root`, so referencing it wouldn't recolor anything).
3. **Functional:** leave the hue; only add a legible-on-the-bg variant if contrast fails.
4. **Petals + locked items:** untouched.

## Quick "what should this be?" decisions

- A button / toggle / TODAY pill / progress fill / selected chip → **ACTION** (wine light / gilt dark).
- A thin line, ring, divider, icon stroke, the "Día" script → **METAL** (gold/gilt).
- An area dot, mood disc, calm-exercise accent, cycle mark, the done ✓ → **FUNCTIONAL** (keep hue).
- A card / input / page / body text → **SURFACE/TEXT** (token-driven).
- A flower petal → blush (light) / velvet (dark), never wine. The flower **centre** → wine (light) / velvet
  radial (dark) — it's an action.
- A delete/×/danger control → the mauve danger cue, distinct from wine.
