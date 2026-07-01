---
name: theme-qa
description: Run AFTER any theme/color/CSS change to the Mi Día PWA (mi-dia-vNN.html) and before calling it done — a Light+Dark QA gate that screenshots EVERY view in BOTH themes as one review grid, checks for invisible/low-contrast text, hardcoded light-on-velvet leaks and unthemed module CSS, and runs the e2e safety net. Built after a session where dark-mode legibility bugs (date-band box, invisible titles, persist banner, a runtime `esc` error) shipped reactively because "div-balance + node --check + a couple screenshots" missed them. Invoke whenever a change touches `data-theme`, tokens, colors, surfaces, or "make it look…".
---

# theme-qa — the Light+Dark QA gate for Mi Día

Mi Día ships TWO real themes (Light-luxe champagne+wine+gilt · Dark-velvet aubergine+gilt) via
`<html data-theme>`. Most theme regressions are **legibility** bugs that a single-theme spot-check misses:
text invisible on the hero photo / on velvet, a card left LIGHT on the dark page, a module-injected banner
(persist.js / cycle.js) nobody themed, or a runtime error that `node --check` can't see. This skill is the
gate that catches them. Run it on the current `mi-dia-vNN.html` AFTER the change, before promoting.

**Respond in Romanian without diacritics.** Companion refs in this folder:
[`color-roles.md`](color-roles.md) (which color a thing should be) and [`module-css.md`](module-css.md)
(the CSS that lives outside the main `<style>`).

## 1. The theme grid (see the whole app in both themes at once)

From `e2e/`:

```
node theme-grid.js ../mi-dia-vNN.html      # 16 shots: 8 views × {light,dark} + a review index.html
```

- Writes `e2e/theme-grid-out/*.png` + `theme-grid-out/index.html` (light|dark side-by-side, one row per
  view). Open the index and **look at every cell**. Output is gitignored.
- One view × one theme (quick iteration): `node shoot.js ../mi-dia-vNN.html /tmp/x.png journal dark`
  (views: `day journal respiro calendar progress projects profile settings`; themes `light|dark`).
- These reuse the e2e mobile-chromium viewport (412px / DPR 2). Headless Chromium ≠ real Android — blur,
  fonts, native pickers still need Ines's device pass; say so.

## 2. Review checklist (per view, per theme — the part that actually catches bugs)

- [ ] **No invisible / low-contrast text.** The repeat offenders: title/text over the **hero photo** (dark
      ink on a dark-veiled photo), champagne text on a pale card, and `--ink`-that-flipped-to-champagne
      sitting on a surface that DIDN'T flip. If you have to select text to see it, it fails.
- [ ] **No surface stuck in the wrong theme.** A cream/white card or pill on the velvet page (or a velvet
      one on champagne) = a hardcoded hex that bypasses the token remap. Grep it:
      `grep -nE '#(FFF|fff|FBF|FCF|FDF)[0-9A-Fa-f]{3}' mi-dia-vNN.html` → any used as a component
      background is suspect.
- [ ] **Module-injected CSS themed.** persist.js (`.pb*` banner) and cycle.js (`.cy-tg/.cy-sw/.cy-setup-link`)
      inject CSS OUTSIDE the main `<style>` — easy to forget. See [`module-css.md`](module-css.md).
- [ ] **Right color ROLE.** Actions = WINE `#6E1334` in light / GILT gold in dark. Gold elsewhere = metal
      hairline only. Flower PETALS stay blush (light) / velvet (dark). Functional area/mood/calm colors must
      stay legible on BOTH backgrounds. Full map in [`color-roles.md`](color-roles.md).
- [ ] **Flower labels still INSIDE their petals** (`l1 170/78 · l2 255/142 · l3 222/244 · l4 118/244 ·
      l5 85/142`), and `--rose-1..4` untouched.
- [ ] **The OTHER theme didn't regress.** A light-only fix must not touch dark and vice-versa — every
      override should be `html[data-theme="light"] …` / `html[data-theme="dark"] …`-scoped. Confirm the
      opposite theme's grid column is unchanged from before.

## 3. Runtime + e2e (node --check is NOT enough)

A session shipped `esc is not defined` (a function scoped locally, called from a scope that lacked it) — the
build passed `node --check` (syntax) but crashed at runtime, so **day slots stopped rendering** and 13 e2e
tests failed. Lesson: **always exercise the app, not just parse it.**

- Mandatory chain first (from [`design-check`](../design-check/skill.md)): div-balance + `node --check` on
  each `<script>`.
- Then the e2e safety net (from `e2e/`): `npx playwright test --grep-invert @visual --reporter=line`.
  For a small visual slice, at least run the specs your change could touch (add-flow / slot-interactions /
  the view you edited) — a full run is ~4–7 min.
- If the design-locked flower/bottom-bar changed, the `@visual` baselines WILL change — regenerate, don't
  treat as failure: `npx playwright test visual.spec.js --update-snapshots`.
- **Per-slice, not just at the end:** run the relevant e2e subset as part of EACH visual slice's gate. The
  `esc` bug would have been caught the same slice instead of after five more.

## 4. Sign-off

Only call a theme change done when: grid reviewed in BOTH themes (checklist clean), div-balance +
`node --check` OK, e2e green (or the touched subset), `@visual` regenerated if the locked shots moved, and
you've stated the honest headless≠device limit. Then it's ready to promote (`index.html` + bump `sw.js`
CACHE) — but promoting/deploying stays Ines's call (`/ship`).
