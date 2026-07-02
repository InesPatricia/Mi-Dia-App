# Mi Día — Project Context for Claude (canonical filename: CLAUDE.md)

> **Authoritative spec. Read this first, every session, before any work.**
> Last updated: July 2026 · Current latest build: **`mi-dia-v155.html`** (promoted to `index.html`, sw CACHE `mi-dia-v155`, live on Cloudflare)
> Latest arc: **Ritualuri (Atomic Habits) + Onboarding ghidat (v145→v155)** — modul `ritual.js` (secțiune Home + serie + sheet creare + never-miss-twice + identitate + seed + Progres cu backfill; bifare pe AZI) + `onboard.js` (carusel 6 pași, pasul „Floarea" = o poezie cu sămânță-glow). e2e 81/81. Rămâne: device-pass Android (Ines).

## Language
Always respond in **Romanian, but WITHOUT diacritics** (write `a i s t` instead of
`ă î ș ț`). Ines's terminal does not render Romanian diacritics — they show up blank/garbled,
making replies unreadable. This applies to ALL chat responses, every session, no exceptions.
Code comments can be in English.

---

## What this project is

A Mediterranean-themed daily planner PWA built as a **single self-contained HTML file**
(HTML + CSS + JS in one file, no build step, no bundler, no npm, no backend).
Personal use for now (localStorage only). Future: public/subscription version.

**Owner:** Ines — QA/AI professional based in Spain. Comfortable with Node + GitHub.

---

## ⭐ Luxury "old rich" Light + Dark revamp — ✅ DONE + SHIPPED (v133→v144, live)

> **New here? Read this box, then "How the theme system works" below — the rest of this section is build
> history.** The revamp is COMPLETE and LIVE on Cloudflare. The app has **two real luxe themes** you switch
> with a ☾/☀ toggle in the hero (next to EN·ES·RO) + a toggle in Settings:
> **Light-luxe** (champagne bg + **WINE `#6E1334`** actions + gilt hairlines) and **Dark-velvet** (aubergine
> velvet + **GILT GOLD** actions). Both themes cover all 7 views. All emoji are **line-art SVG** (no emoji in
> the UI). Current build **`mi-dia-v144.html`** = `index.html`, `sw.js` CACHE `mi-dia-v144`. e2e **68/68**.
>
> **What's still open (for the next agent):**
> - **Ines's real-Android device pass** — the ONLY thing headless can't cover: native pickers, blur/
>   backdrop-filter, fonts (Ephesis + `background-clip:text`), axe contrast on velvet. (Verified working live:
>   add-activity + all views render both themes.)
> - **Next planned feature:** "Ritualuri" (Atomic Habits — recurring identity habits + Home streak). Design
>   done, not built; mockups in `private/mockups/`, next step = a `ritual.js` module plan.
> - **Pre-existing backlog** (unrelated to the revamp): UX-coherence E1–E7, B6 duration "min" clip, D14 public
>   version — see the backlog sections lower in this file.

### How the theme system works (for making ANY theme/color change)

- **`<html data-theme>`** (`light`|`dark`) drives everything; persisted in **`settings.theme`** (in backup);
  an early `<head>` script applies it before paint (no FOUC). `toggleTheme()` re-renders the active view so
  theme-aware inline tints (`paleTint`, `applyJWash`, `moonSVG`) recompute.
- **Light values live in `:root`; dark values in an `html[data-theme="dark"]{…}` block** that remaps the same
  tokens. Because each theme block overrides the other's neutrals, **changing `:root` neutrals is light-only**
  and the dark block is dark-only — zero cross-contamination. Add per-theme tweaks as
  `html[data-theme="light"] …` / `html[data-theme="dark"] …` scoped rules; never edit a base rule in a way
  that leaks into the other theme.
- **Semantic tokens:** `--bg --surface --surface-2 --text --text-soft --line --brand --brand-ink --accent`;
  metals `--gold-1 --gold-gilt --gold-antique --gold-deep` + `--gold-hair`. **`--rose-1..4` are LOCKED** (the
  flower petals + a few functional uses) — override a consuming selector's appearance, never the token.
- **Before calling a theme change done:** run **`/theme-qa`** (`node e2e/theme-grid.js ../mi-dia-vNN.html` →
  all 8 views × both themes as one review grid + a legibility checklist) + `/design-check`'s validation chain
  (div-balance + `node --check`) + **e2e** (`cd e2e && npx playwright test --grep-invert @visual`). Which
  color a thing should be: **`.claude/skills/theme-qa/color-roles.md`**. CSS injected by persist.js/cycle.js
  (outside the main `<style>`): **`.claude/skills/theme-qa/module-css.md`**.

---

### Build history (how the revamp was made — reference)

> Origin + locked decisions + the phased plan that produced v133→v144. Kept for context; the per-version
> detail is in the Changelogs (v133 → v144) further down. Mockup: `private/mockups/mi-dia-luxe-mockup.html`
> (live 3-way switcher) + PNG previews in `private/mockups/luxe-previews/`.

**Origin.** Ines supplied a luxury-travel mood board (*BonVoyage Christine*): bordo/aubergine + magenta +
taupe + cream + antique/polished gold; Butler serif + signature script + Open Sans; "old rich / quiet
luxury". Goal: make Mi Día feel modern, premium, *wow* — **more shades of one color family + surprising
gold accents** — without losing its gentleness.

**Decisions LOCKED with Ines (this session):**
- Ship **BOTH** as real themes, not either/or: **Light-luxe** (cream + wine + gilt) + **Dark-velvet · gold**
  (aubergine/velvet + gold-leaf), with a **switcher**.
- **Switcher** = a discreet **☾/☀ toggle in the hero** (next to the EN·ES·RO langbar) **AND** a toggle in
  **Settings**. Persist in **`settings.theme`** (`light`|`dark`), **include in backup export**. An
  `<html data-theme>` attribute drives the palette.
- **Dark primary action = gilt GOLD** — chosen by Ines over a wine+gold-ring alternative (both were mocked;
  she picked **dark · gold**). **Light primary action = WINE** `#6E1334`.
- **Wordmark** = "Mi" Fraunces serif + **"Día" in a gold signature SCRIPT** → add ONE Google font
  **Ephesis** (brand text only). Tagline UPPERCASE, letter-spaced.
- **Typography stays Fraunces + Nunito Sans** (Fraunces = the free Butler-equivalent, already loaded). No
  body-font change. Push Fraunces larger/tighter on headers.
- **Signature accent = the gilt gold HAIRLINE** (gradient `linear-gradient(100deg,#E8D2A0,#C8A24C 45%,#9A6E2C)`)
  used as divider / card top-edge / rule under the date — direct echo of the mood board's gold bar. Plus:
  drop-cap on the Spanish phrase, candle-glow behind the flower centre, serif numerals for figures.
- **Flower labels — HARD REQUIREMENT (Ines flagged this explicitly):** KEEP the app's EXACT label system —
  the `.labels .lbl .l1–.l5` markup, the calibrated coordinates (`l1 170/78, l2 255/142, l3 222/244,
  l4 118/244, l5 85/142`), the 5 line-icon SVGs, and the 9px UPPERCASE word. **Only re-skin the colors**
  (gold line-icon; champagne text on dark / ink on light). **Do NOT reposition** — words must stay INSIDE
  the petals. (My first mockup used custom positions that spilled out; reverted to the app's coords. The
  mockup's flower now mirrors app geometry: 340 box, 128×149 petals, l1–l5 labels.)

**Target palette tokens:**
- Shared metal: `--gold-1:#E8D2A0` · `--gold-gilt:#C8A24C` · `--gold-antique:#B8893F` · `--gold-deep:#9A6E2C`;
  taupe `#C9A99E` / `#A98A7E`.
- **Light-luxe:** bg champagne `#F3ECE0` / pearl `#FBF6EC`; card `#FFFCF7` + ~30% gold hairline; brand/action
  **wine `#6E1334`**; text `#3A2438`.
- **Dark-velvet:** bg radial aubergine→night `#3E1326→#250b15`; card velvet `#4A1A30`/`#511D38`; text
  champagne `#EFE2D0` / muted `#C9A99E`; action **gilt gold**.
- **LOCKED `--rose-1..4` stay untouched; the revamp is ADDITIVE.**

**Build plan — themeable refactor + per-view passes. One `vNN` per slice; after EACH: div-balance +
`node --check`, then screenshot in BOTH themes:**
- **v133 · Faza 0 — Foundation. ✅ DONE.** Added Ephesis (loaded, brand-only, not yet used) + metal tokens
  (`--gold-1/--gold-gilt/--gold-antique`, taupe, `--gold-hair` gilt-hairline gradient). Introduced the
  **semantic tokens** (`--bg / --surface / --surface-2 / --text / --text-soft / --line / --brand /
  --brand-ink / --accent`) in `:root` mapped to TODAY's light values + an `html[data-theme="dark"]` override
  block with the dark-velvet values. `--rose-1..4` LOCKED, purely additive; nothing consumes the semantic
  tokens yet → **zero visual change** (verified: v133 light == v132 light pixel-identical; v133 with
  `data-theme="dark"` also identical, proving the dark block is inert until v134 wires it). Validated:
  div 210/210, `node --check` OK on both scripts.
- **v134 · Faza 1 — Switcher plumbing. ✅ DONE.** `settings.theme` (`light`|`dark`, default light) drives
  `<html data-theme>`; an early `<head>` inline script applies the saved theme before paint (no FOUC, via
  localStorage on PWA; sandbox falls back to light). Switcher in TWO places: a discreet **☾/☀ glyph in the
  hero langbar** (after EN·ES·RO, with a gilt divider — `#themeToggle`) + a **"Aspect / Appearance" panel
  toggle in Settings** (`#themeToggleSet`); both call `toggleTheme()`. `theme` lives in the `settings`
  object → already in backup export/import (import re-applies via `loadSettings`→`applyTheme`). i18n keys
  `appearance/dark_theme/theme_help/theme_toggle` (EN/ES/RO). **Dark = rough:** the `.phone` surface (+ body
  gutter) flip to the velvet `--bg` radial when dark is active; cards keep their light surfaces so text stays
  readable until per-component velvet theming lands v135+. **Bug caught & fixed in-slice:** the hero langbar
  wiring bound the lang handler to ALL `#langBar button`s (overwriting the toggle's `onclick`) → scoped it to
  `button[data-l]`. Verified: hero toggle → `data-theme=dark` + persists across reload + glyph ☀; Settings
  toggle two-way; light stays pixel-identical to v133 except the new glyph. Validated: div 213/213,
  `node --check` OK on all 3 scripts.
- **v135 · Faza 2 — Hero & brand. ✅ DONE.** "Día" wordmark now renders in the **Ephesis gold signature
  script** (gilt-gradient clipped via `background-clip:text`; "Mi" stays Fraunces) — applied in BOTH themes.
  A **delicate gilt hairline frame** (`rgba(200,162,76,.42)`) sits inside the hero photo (day view).
  **Per-theme velvet veil:** a `html[data-theme="dark"]` hero block gives a stronger velvet veil + velvet
  photo-bottom fade so the bright bougainvillea stays legible, with champagne brand/phrase/date ink, gilt
  langbar/seed/nav accents, and a gilt date track. The **"gilt rule under the date"** = the day progress
  track recolored to a faint gilt hairline (rose fill stays the action color). **Drop-cap DEFERRED:** the
  Spanish phrase is wrapped in `«…»` in JS, so `::first-letter` would hit the guillemet — skipped to avoid an
  ugly drop-cap on `«` (revisit by wrapping the first real letter in a span). Validated: div 213/213,
  `node --check` OK on all 3 scripts; screenshots both themes (light = Ephesis brand + gold frame + gilt rule,
  no flower/card regression; dark = legible velvet hero). Flower below still light (rough → v136/v137).
- **v136 · Faza 3 — Flower + bottom bar. ✅ DONE** (agent-assisted: 2 worker agents proposed the flower CSS
  and the bottom-bar/FAB CSS in parallel; Team Leader verified anchors + specificity, integrated, gated).
  **Flower:** the petal fill/stroke/icon/word all flow through `.flower`-scoped CSS vars (`--petal-edge/-mid/
  -cream/-active/-line`, `--pgold`, `--ptext`) read live by the inline SVG gradient — so a
  `html[data-theme="dark"] .flower` override re-skins to **velvet wine petals + gilt stroke + gold icons +
  champagne words**, with NO JS and an instant runtime flip. Center disc → velvet/wine radial + gilt ring +
  candle-glow halo. Light petals unchanged (blush rose = the mockup's light variant). **Geometry + label
  coords (l1 170/78 … l5 85/142) + petalPath/petalFill markup + icons UNTOUCHED — words stay inside petals,
  confirmed on screenshots both themes.** **Bottom bar + FAB:** FAB action recolored rose→**WINE `#6E1334`**
  in light (gilt ring), **GILT GOLD** in dark (dark "+" `#3A1020`); dark bar → velvet translucent; nav-active
  → gold (`--gold-gilt`). No calm-mode conflict (v54 removed those overrides). Validated: div 213/213,
  `node --check` OK on all 3 scripts. (Cards/slots below still light — v137.)
- **v137 · Faza 4 — Cards & components. ✅ DONE** (agent-assisted: 5 worker agents themed 5 disjoint
  component families in parallel; Team Leader added a foundation token-remap, integrated all 5, reconciled
  overlaps + filled 2 gaps, gated). **Foundation:** the dark block now REMAPS the legacy neutral tokens
  (`--cream→--surface`, `--sand→--surface-2`, `--sand-deep→#3c1528`, `--ink→--text`, `--ink-soft→--text-soft`,
  `--page/-2→velvet`) — so every shared component that consumes them themes automatically in dark (borders
  already flip via `--line`). **The gap the remap can't reach = HARDCODED light hexes** (`#fff`,
  `#FFFBF4,#FCF5E9` card gradients, rose-token states that go invisible on velvet); the 5 agents found + fixed
  those per family: (1) panels/cards/date-band cards/section headers/segmented → velvet + gilt hairline;
  (2) composer (`#composer` shell, title, area/tag chips, duration chips, time-preview, area picker, `#addBtn`
  → gilt gold commit); (3) day-plan slots + inline editor + empty state; (4) shortcuts (`.scpill` white→velvet,
  `.scp-plus`/`.scp-x`/`.addnew`/`.sc-edit-btn`/`.sc-form` → gilt/accent) + the `.chip-add` "Add a shortcut"
  card; (5) shared controls (`.testbtn`, `.toggle` ON-ring lifted to gilt + champagne knob, `.filtertoggle`,
  generic `.chip:not(.scpill)`, `.focus-btn`, journal `.exp-btn`). All `html[data-theme="dark"]`-scoped,
  consolidated last in `<style>` for source-order precedence. **Result: the entire Day view themes dark**
  (cards velvet, gilt hairlines, champagne text, gilt-gold actions). Light pixel-identical (verified).
  Validated: div 213/213, `node --check` OK on all 3 scripts; screenshots both themes (Home + expanded
  composer + area picker).
  **Deferred to v138+ (Faza 5, honestly flagged by the agents):** `paleTint` (JS) mixes area colors with
  CREAM, so the slot **time pill** + the **selected area pill** still get cream-based tints in dark — needs a
  theme-aware `paleTint` (mix toward velvet). Native `<select>`/`<input type=date/time>` OPEN popups are
  OS-themed (device pass). Per-view functional colors (mood discs, calm, calendar cells, progress bars) =
  per-view passes.
- **v138–v141 · Faza 5 — Per-view passes (the bulk).** **v138 DONE** (5 views: Journal mood discs + writing
  card; Respiro calm-mode wash + exercise cards; Calendar lens/cells/nav; Progress stat tiles/bars; Projects
  idea chips — all velvet+gilt, agent-assisted) + the theme-aware `paleTint`/`applyJWash` JS fixes. **Remaining
  → v139: Profile + Settings** (Profile's `.scard` stat tiles are scoped to `#view-stats` so Profile's tiles +
  the "De când ești aici"/recent-intentions/recent-emotions cards still need theming; Settings mostly themes
  via shared `.panel`/toggles from v137 — verify + fill gaps). Dark mode exposes EVERY hardcoded light color —
  give functional colors (area/calm/mood) legible variants on velvet. **v139 DONE — Profile + Settings:**
  `.pf-journey` journey card white→velvet, dim-gold headings (`.pf-hello`/`.pf-recent-h`) → champagne, stat
  figures → accent; `.nameinput`/`.lead-chip`/Export-Import(inline rose, `!important`) → velvet+gilt; the cycle
  opt-in card `.cy-tg` + off-switch (cycle.js) → velvet. **ALL 7 views now theme dark — Faza 5 COMPLETE.**
- **v142 · Faza 6 — QA.** axe contrast on dark, **regenerate Playwright visual baselines** (they WILL change),
  run e2e + prod smoke, then the real-Android device pass (Ines's step).

**Risks to manage:** dark mode is a huge surface (every hardcoded color checked on velvet — Faza 5 ≈ 60% of
effort); the bright bougainvillea hero photo needs a STRONGER dark veil for legibility; visual-regression
baselines + prod-smoke expectations change; keep the app functional after every slice (no big-bang rewrite,
per the incremental architecture rule).

**Decided since:** **Default theme at first launch = LIGHT** (safe, matches today). New users only; a
returning user keeps their saved `settings.theme`. (No open decisions remain before v133.)

---

## File / versioning workflow (IMPORTANT)

- The app lives in **versioned files: `mi-dia-vNN.html`**. Each change increments `NN`.
- **Current latest = `mi-dia-v132.html`.** Always start from the latest version.
- **Strict rule: every new code file gets a NEW name.** Never overwrite an existing
  version in place — each iteration is a separate rollback point. (One change → one new file.)
- **Working tree keeps ONLY the latest official `mi-dia-vNN.html` + `index.html`** (Ines's call,
  June 2026 — keeps VS Code uncluttered). Older `mi-dia-vNN.html` files are **pruned from the working
  tree but preserved in Git history** — recover any with `git show <commit>:mi-dia-vNN.html`. So Git
  history (not a pile of files in the folder) is the rollback archive. When promoting a new build,
  `git rm` the previous `mi-dia-vNN.html` after the new one is committed.
- The older `index.html` + Python base64-icon-sync workflow is **SUPERSEDED — do not use it.**
- This spec is the **living doc** (updated in place — not versioned). It is loaded by the harness
  as **`CLAUDE.md`** (the canonical filename). Web-Claude tends to regenerate it as `CLAUDE_v2.md`
  WITHOUT the deploy/PWA/diacritics notes below — when that happens, merge it back into `CLAUDE.md`
  and delete the duplicate. Do not keep two spec files.

**Deployment + infra files (do NOT delete as "single-file violations"):**
- The app is deployed on **Cloudflare Pages** (primary), auto-deploying from GitHub `main` on every
  push. Live site: **`mi-dia-app.pages.dev`**. (Netlify config is kept as a fallback host — its free
  tier hit a bandwidth limit, which is why we moved to Cloudflare Pages.)
- **The promoted build is `index.html`** (a copy of the latest `mi-dia-vNN.html`). `index.html` is the
  universal filename every static host serves at `/` automatically — so NO root rewrite is needed on
  any host. (A root rewrite to `mi-dia.html` fought Cloudflare's automatic `.html` clean-URL handling
  and caused a 308 loop / 522 — that is why the promoted file is `index.html`, not `mi-dia.html`.)
- Infra files in the repo root are intentional (NOT part of the single-file app):
  - **`_redirects`** — Cloudflare Pages redirects (Netlify syntax): hides old `/mi-dia-*` builds → `/`.
  - **`netlify.toml`** — fallback Netlify config; no build step; hides old `/mi-dia-*` builds → `/`
    (301). No root rewrite (index.html is auto-served).
  - **`sw.js`** — the PWA service worker (offline). A service worker MUST be a separate same-origin
    file (browsers block inline/data-URI SW), so this is a deliberate exception to "single file".
    The app HTML itself stays one self-contained file; the manifest is inline (data URI).
  - Bump the `CACHE` constant in `sw.js` on each new build so old caches clear on activate.

**Test harness (dev-only — NOT a single-file violation):**
- **Playwright e2e tests** are a fully self-contained project in **`e2e/`** (`package.json`,
  `playwright.config.js`, `node_modules/`, `tests/`). Kept OUT of the repo root on purpose so app
  code vs test code is visually obvious: anything under `e2e/` = test, everything at root = app/docs.
  This is a separate dev-only concern; the "no npm/build tooling/backend" rule applies to the APP, not
  to test tooling. `e2e/node_modules/` and Playwright outputs (`e2e/test-results/`,
  `e2e/playwright-report/`) are gitignored — only `e2e/package.json`, `e2e/playwright.config.js`, and
  `e2e/tests/` are committed. The app stays one self-contained HTML file at root (so Cloudflare Pages
  keeps serving `index.html` + `sw.js` from `/` — the app dir was deliberately NOT moved).
- Config serves the repo **parent dir (`..`)** over http via `http-server` (so root `index.html` + the
  service worker behave like production) and runs in a **mobile Chromium** viewport (Pixel 5) because
  the app is phone-first.
- Run (from `e2e/`): `cd e2e && npm test` · HTML report: `npm run test:report` · **concise Markdown
  summary: `npm run report`** (runs the suite, writes `e2e/TEST-REPORT.md` — per-suite + per-test
  pass/fail, totals, duration; via `make-report.js`, JSON-reporter-to-file so server logs can't corrupt
  it) · record new flows: `cd e2e && npm run codegen`. Watch live: `npm run test:watch` (headed) /
  `npm run test:ui`. Shard across CI machines: `--shard=i/n` (see `.github/workflows/e2e.yml`).
- **Evidence:** config sets `screenshot:'on'`, so every run captures a screenshot of each test's final
  state (pass or fail) — browsable in the HTML report at `e2e/playwright-report/index.html` (open via
  `npm run test:report`); raw PNGs land in `e2e/test-results/<test>/test-finished-*.png`. Identical
  frames are content-deduped (e.g. several nav tests end on the Day view → one shared image). Trace +
  video are retained on failure. All of `playwright-report/`, `test-results/` are gitignored.
- Current coverage (**68 tests across 18 specs**): **smoke** (`smoke.spec.js`) + **navigation** (`navigation.spec.js`)
  + **theme switcher** (`theme.spec.js` — v139/QA: default light, hero ☾/☀ toggle → `<html data-theme>` +
  persist across reload, Settings "Dark theme" toggle two-way, a returning user with `settings.theme=dark`
  boots dark; theme state asserted on the `html[data-theme]` attribute + `localStorage.settings`)
  + **add-flow / composer** (`add-flow.spec.js` — expand-on-typing, fast Enter, duration, native time,
  area selection; asserts the DOM AND the stored block model via `readBlocks()`)
  + **journal + mood** (`journal.spec.js` — mood disc selection + word, low-mood permission pause +
  emotion-wheel drilldown, text/mood autosave surviving a reload, export buttons)
  + **persistence + i18n** (`persistence-i18n.spec.js` — a created slot survives reload, backup export
  fires a JSON download, switching to RO re-labels visible text AND the i18n aria-labels)
  + **slot interactions** (`slot-interactions.spec.js` — done toggle (+persist), two-tap delete,
  reschedule to Tomorrow, hide-done filter, overlap clustering). Slots are anchored by their user-typed
  title (`getByText`/`hasText`); named controls use `getByRole` (move buttons, the "hide completed"
  filter via its label), unlabelled ones are reached structurally within the block.
  + **shortcuts** (`shortcuts.spec.js` — 3 curated defaults shown, tap pill pre-fills the composer
  (no commit), per-pill "+" adds an untimed slot instantly, add a new shortcut via the form, edit-mode
  two-tap delete). Pills anchored by their visible label; the per-pill "+" by its i18n aria-label; the
  ✎ edit toggle by its stable id `#scEditBtn`.
  + **calendar** (`calendar.spec.js` — Month/Year toggle, prev/next/Today nav, one cell per day, and
  seeded blocks/mood driving the Plan ring (`.lring`) + Mood glow (`.glow`) lenses)
  + **progress** (`progress.spec.js` — range switch, seeded DONE blocks driving the stat tiles
  (`slots done`/`active days`) + streak + area bars, and the mood↔productivity insight with 3+ journal days)
  + **respiro** (`respiro.spec.js` — Calm/Wake direction toggle, Breathing/Somatic sub-segment, open +
  close an exercise player)
  + **cycle (opt-in)** (`cycle.spec.js` — OFF by default (no Rhythm lens / access), enabling the Settings
  `role="switch"` surfaces the Rhythm lens + "Ritmul meu" access in the Calendar)
  + **profile** (`profile.spec.js` — Profile/Settings segment swap, the name field feeding the greeting,
  seeded daily intentions surfacing in "recent intentions")
  + **projects** (`projects.spec.js` — empty-state idea chips, creating a project (idea chip + custom form),
  add item + complete it (`.itick`), search finds an item, Lists/Search/Completed segment, two-tap delete)
  + **emotion routing + body scan** (`emotion-flows.spec.js` — naming a low-mood emotion (Sadness→Lonely)
  surfaces the F3 routing chip → opens Respiro; the Body scan player shows its scan stage + tone/voice toggle)
  + **focus timer + backup roundtrip** (`timer-backup.spec.js` — the Day-header Focus overlay (preset sets
  the time, close), and a full **export → delete → import** roundtrip that restores the slot from the
  downloaded backup file via `#importFile.setInputFiles`)
  + **accessibility** (`a11y.spec.js` — axe-core scan of all 6 views on a CURATED rule set: accessible
  names/roles/labels/valid-ARIA; guards the v126/v128 work. Color-contrast etc. intentionally out of scope)
  + **visual regression** (`visual.spec.js`, tagged `@visual` — `toHaveScreenshot()` of the design-locked
  flower nav + bottom bar; NOT full screens, to dodge the daily date/phrase. Baselines are OS-specific
  (`*-win32.png`, dev machine) so CI skips `@visual` via `--grep-invert`; run locally with `npm run test:visual`).
- **Automation / quality gates:** `npm run validate` (= `validate-build.js`: div-balance + `node --check`
  on the build — the CLAUDE.md manual rule, now scriptable + a fast CI `validate` job that gates the test
  shards). **Test-independence (anti-bias):** `e2e/SPEC-TEMPLATE.md` drives a 2-isolated-agent flow — an
  *implementer* (app code) and a *tester* (black-box Playwright from the spec only) never see each other's
  code; they meet at the written contract (acceptance criteria + stable selector handles).
- **Post-deploy smoke (prod, v131):** a SEPARATE workflow `.github/workflows/smoke-prod.yml` runs on
  push to `main` (i.e. AFTER a merge). It first waits for Cloudflare to publish the new build
  (`e2e/wait-for-deploy.js` polls the LIVE `/sw.js` until its `CACHE` matches the just-merged
  `sw.js`, 5-min timeout), then runs a 7-test Playwright smoke against the LIVE site
  `https://mi-dia-app.pages.dev` (`e2e/playwright.prod.config.js` → `e2e/tests-prod/smoke-prod.spec.js`:
  home boots on the Day view + brand + no real console errors AND no same-origin 404s; `/sw.js` served
  with a `mi-dia-` cache; the PWA manifest is linked; **all 7 views render** without console errors
  (Day/Journal/Respiro/Calendar/Progress/Projects/Profile); the 5 flower petals present; the Journal
  opens + writing card ready; switching EN→RO relabels the nav (i18n)). It is **informational only**
  (post-merge, never gates a PR), is **separate from `e2e.yml`** (which tests the local build before
  merge) and from the Cloudflare deploy itself, and is **read-only** (never writes user data). Run on
  demand from the Actions tab (`workflow_dispatch`) or locally: `cd e2e && npm run wait:deploy &&
  npm run smoke:prod` (override the target with `PROD_URL=…`). The real-Android device pass remains
  Ines's manual step — this smoke only proves prod is up and the new build is healthy, not native UX.
- **Pre-merge preview smoke (the GATE):** `.github/workflows/smoke-preview.yml` runs the SAME 7-test
  smoke against the Cloudflare Pages **PREVIEW** deployment of a PR, BEFORE merge — so a broken build
  can never reach prod (the "test before promoting" gate; smoke-prod.yml is the post-deploy net). It
  triggers on the `deployment_status` event Cloudflare fires when a preview finishes, reads
  `environment_url` and runs the smoke against it (no poller needed — success means it's already live).
  It reuses `playwright.prod.config.js` + the spec verbatim by setting `PROD_URL` to the preview URL
  (zero spec/config changes). The job filters to SUCCESSFUL, non-production deployments (it excludes the
  live `mi-dia-app.pages.dev` URL — robust to Cloudflare's env naming) and checks out
  `deployment.sha` so the spec matches the built app. **To actually block merges:** after it has run
  once, add the check **`smoke-preview / preview smoke`** to `main`'s branch-protection required checks
  (GitHub only offers a check as "required" once it has been seen). Requires Cloudflare **preview
  deployments enabled for all branches** (the project default). Caveat: `deployment_status`-triggered
  checks can occasionally be finicky to enforce as a hard gate; if so, keep it as a strong pre-merge
  signal + the smoke-prod.yml net + the 1-command Cloudflare dashboard rollback.
- The Calendar/Progress suites are **data-driven via `seedStorage`** + the `dayKey()` helper (writes
  `day:<key>` / `journal:<key>` exactly as `keyFor` does). None of these four suites needed app changes.
- The journal + persistence/i18n + slot suites needed NO app changes — pure user-facing locators (mood
  discs use their i18n aria-labels; wheel/pause/slot chips reached structurally within their containers).
- **A11y gap (found while testing) — FIXED in v128:** the slot **done tick** and **time pill** now have
  `role="button"` + i18n `aria-label` (+ `aria-pressed` on the tick) + Enter/Space keyboard activation,
  set in `blockEl`. The done test uses `getByRole('button', {name:'Mark as done'})`; the time pill keeps a
  `.time` structural locator (its accessible name includes the dynamic time).
- **Locator strategy (v126+):** lead with user-facing locators — `getByRole`/`getByText`/`getByLabel`.
  Nav controls carry **i18n `aria-label`s** (default UI language = EN, so accessible names are the EN
  i18n values: petals = Journal/Respiro/Calendar/Progress/Projects; bottom bar = Home/Profile;
  `#addFab` = "Quick add"; `#heroSecBack` = "Back to home"; flower centre = "What's your intention?").
  Modals expose `role="dialog"` → `getByRole('dialog', {name})`. **State** (active view, menu open) has
  no semantic locator, so it is asserted on attributes: `body[data-view]`, `aria-expanded`, and the
  composer's `.active` expand class. The bloom scrim is a structural overlay with no accessible name →
  reached by id `#bloomScrim`. **`data-testid`** is used ONLY for the composer **area/tag chips**
  (`composer-area` / `composer-tags`), whose visible label is dynamic state (current selection) so there
  is no stable accessible name — the canonical Playwright case for `getByTestId`. It is NOT sprinkled
  elsewhere (nav/modals use roles; the title uses its placeholder; duration chips use their numeric text;
  the native time input uses its `aria-label="Time"`, scoped to `#composer` since the slot editor reuses
  the same control).
- Selector gotchas: the **flower nav lives inside `#view-day`** (only clickable on the Day view — return
  Home between petals); the legacy `.viewback` pill is hidden by CSS off Day (use the hero back, accessible
  name "Back to home"). `Store` falls back to `localStorage` in a plain browser, so `e2e/tests/helpers.js`
  `seedStorage()` can preset state before load.
- **Honest limit:** headless Chromium ≠ real Android — native time pickers (`<input type=time>`),
  blur/backdrop-filter, fonts and touch gestures stay MANUAL QA (backlog C/F). Playwright covers
  logic/DOM/navigation/persistence/i18n.

> **PWA checklist for each new build:** the app HTML must contain (a) `<link rel="manifest" ...>`
> (inline data URI) and (b) a `<script>` registering `/sw.js`. If a new web-Claude build dropped
> them (it happened on the v49–v55 line), port them on before deploying. v56+ through v89 have them.

---

## CRITICAL: Validation after EVERY edit

Run on the current `mi-dia-vNN.html`, before declaring an edit done:

```python
import re
html = open("mi-dia-vNN.html", encoding="utf-8").read()
scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
for i, s in enumerate(scripts):
    open(f"_tmp_c{i}.js", "w", encoding="utf-8").write(s)
print(f"Script blocks: {len(scripts)}")
body = re.sub(r"<style>.*?</style>", "", html, flags=re.S)
body = re.sub(r"<script>.*?</script>", "", body, flags=re.S)
opens = len(re.findall(r"<div\b", body)); closes = len(re.findall(r"</div>", body))
print(f"DIV balance: {opens}/{closes} -> {'OK' if opens==closes else 'MISMATCH!'}")
```

Then `node --check _tmp_c0.js` for each script block. Delete temp files after.
If any check fails — fix before saving. Then render a screenshot to verify visually.

---

## Working method (Ines prefers)

- **Iterate ONE change at a time**, render a screenshot to verify, save as a new `vNN`.
- **Be honest about limitations** — headless screenshots ≠ real Android Chrome
  (native time pickers, blur, fonts differ). Always say so.
- When a choice is **subjective or changes the app's character, show options / ask briefly**
  rather than guessing.
- Always use **targeted edits** (str_replace / small insertions). Never rewrite large sections.

---

## Visual design system (LOCKED — do not deviate)

**Rose family (single action/brand color), NOT mauve/magenta:**

```
--rose-1:#F4BFC4   --rose-2:#E58699   --rose-3:#D15E78   --rose-4:#B5495F   (LOCKED, untouched)
```

**Extended tonal range (added v57, ADDITIVE — the four locked tokens above are never changed):**

```
--rose-0:#FBE4E5 (whisper)   --rose-5:#8E3349 (deep)   --rose-dust:#C39199 (muted text)
--gold-1:#E8D2A0   --gold:#B8893F   --gold-deep:#9A6E2C    (discreet metallic gold accent)
--sage-1:#E4E8DC   --sage:#9DAD8C   --sage-deep:#6F8268    (cool sage — Calm screen only)
```

- Rose is the **single action/brand color** across all tabs: AZI/TODAY button, `+ Adaugă`
  commit button, progress bars, JURNAL flower center, time-range preview pill, Settings
  toggle-ON + Add/Export buttons (greened-out olive removed from actions in v67).
- Gold survives only as a **discreet decorative accent** (petal icons, panel flower glyph,
  ✎ edit button, hero "Día" italic, fine hairlines). Never an action color.
- Sage/olive is **functional only**: the "corp & calm" area color, Calm-exercise colors,
  green=done tick. Never used as an action (toggle/button) state.
- **Category ("Arie"), tag, Calm-exercise colors, and green=done stay non-rose (functional).**
- Typography: **Fraunces** (serif display, brand/headers) + **Nunito Sans** (sans, body/labels —
  migrated from Nunito in v57, loaded with the `opsz` optical-size axis).
- Aesthetic goals: homogeneity, flow, naturalness, simplicity, femininity, gentleness
  (omogenitate, fluență, naturalețe, simplitate, feminitate, blândețe). Calm, not overwhelming.
  Mediterranean "old rich" / quiet luxury.

**Layout shell:** phone-frame; HERO (bougainvillea terrace header photo, brand, daily phrase ES+local,
date/progress band) → radial **flower navigation** → day panel (`.daypad`). Bottom bar present.
The HERO is a rounded panel (`.hero`) with the photo + a fade veil. Revamp (v60/v61): the veil is
softer so the Mediterranean terrace+bougainvillea photo breathes full-width; brand reads **Mi _Día_**
with "Día" in italic gold (`.brand-accent`); sub-title is UPPERCASE letter-spaced
("YOUR MEDITERRANEAN PLANNER"); a local warm gradient behind the phrase (`.phrase::before`)
guarantees legibility over the photo.

**Home screen final layout (v68 area, variant A2 + date band D3):** brand "Mi Día" → **Spanish phrase**
(the catch, on the photo, no box) → **translation** below it in the app language (RO/EN; hidden on ES so
it isn't duplicated) → **date band D3**. The "your mediterranean planner" sub-title is hidden on Home
(only visible on stale old builds). The **D3 date band** is one simple elegant line `‹ Luni 8 iunie ›`
(no year) + the "N/N done" counter on the right + a fine progress bar under it; the **"↩ azi"** link
appears only when you are NOT on the current day. The hero photo was shortened (~158px) so the date band
lands on the cream (legible). The daily phrase stays dynamic via i18n (not pinned to one value).

**Navigation architecture (redesigned in v38 — resolves the old dual-nav root cause):**
The flower and the bottom bar used to overlap (Jurnal + Calm appeared in both; the centre FAB
duplicated Acasă). Now there is ONE primary navigation:
- **Flower = the single primary navigation**, with **5 petals at 72°**: Jurnal (top), Calm,
  Calendar, Progres, Proiecte. Petals keep `data-v` and the `.tab` wiring (`setView`).
  **Petal shape (final, L1·V3·C1, set in v58):** a teardrop/lacrimă — narrow base at centre,
  wide middle, **sharp tip** outward; blush-rose fill (`#FFFEFB→#FDF2EF→#F7E2E0`) with a fine
  rose edge (`#E6AEB6`); generated from `petalPath` in viewBox 128×149 (base at `50% 100%`).
  Each petal's **label (icon + word) sits INSIDE the petal contour** (`.labels .lbl`,
  `.l1`–`.l5` positioned by absolute coords; NOT counter-rotated inside the rotated petal —
  that breaks layout). `:active` gives a subtle press-scale for mobile feedback.
- **Flower CENTRE = "Intenția zilei"** (an ACTION, not a view): the centre reads "INTENȚIE" and opens a
  **popup** (`#intentModal`) with **only a free-text field** (title = the question "Care e intenția ta?" +
  description + Anulează/Salvează). **No hardcoded answers/suggestion chips anywhere** — the chips were
  removed (v68 area); the question no longer lives in the header. The intention is stored per day and the
  centre shows "intenție" + the value when set (italic Fraunces, `#intentionWord`).
- **Bottom bar = 3 non-overlapping items**: Acasă (`data-v="day"`) · **`+` (`#addFab`)** · Profil.
  Since v66 the bar is **`position:fixed`** (native sticky tab bar — always visible, no scrolling
  to reach it), centred at `--maxw`, with `env(safe-area-inset-bottom)` padding; `.phone-scroll`
  carries 110px bottom padding so content is never hidden behind it.
  The `+` is NOT a nav tab — it toggles a **"bloom" quick-add menu** (`#bloomMenu`) whose three
  petal-buds route to existing flows: **Notă** → Jurnal (focus `#jText`), **Activitate** → Day
  add form (focus `#inTitle`), **Stare** → Jurnal mood picker (`#mood`, gentle pulse). `+` rotates
  to `×` while open. Echoes the flower motif (something "blooms" both top and bottom).

> NOTE: the file has a single `<style>` with two logical layers — a legacy block and a
> `REDESIGN OVERRIDE` that wins via `!important`. Backlog A1 (merge to one source of truth) was
> **done in verified slices v86–v89** (pixel-diff identical on 27 screens before/after each slice):
> only pairs with an *identical* selector were merged (keeping each rule's unique props); residual
> "overlaps" (`.panel`, `.datebar .day .d1`, `.panel h2`, `.progress-top b`) are legitimate
> multi-selector utility groupings, intentionally left. Scoped higher-specificity rules untouched.
> (Open note: legacy token `--rose:#CB8188` (mauve) is still used ~13× — distinct from the
> bougainvillea `--rose-1..4` family; a possible accent inconsistency, to evaluate separately.)

**Key component classes (day panel):** `.add-commit` (full-width commit button),
`.time-preview` (+`.nx` next-day badge), `.minilabel` (ORĂ/ARIE/ETICHETE field headers),
`.btime` (time line above a slot title), `.cluster` (side-by-side overlap columns),
`.chiphint` (gesture hint under shortcuts). Per-block area-tint vars: `--cat-pale`,
`--cat-pale2` (via `paleTint(color, amount)` — mixes the area color with cream).

---

## Day tab — add flow & slot rendering (HISTORICAL v23–v47 — SUPERSEDED by the v112+ composer; see "Add flow — CURRENT (v112+)" below)

**Add flow reads top-to-bottom (configure → commit):**
1. **Scurtături** (section label, v43) → quick presets (3-col grid) + a `+ Adaugă o scurtătură`
   card (v42; opens the shortcut editor — NOT an activity add).
   - Hint line below: *"apasă: pre-completează · ține apăsat: adaugă direct"* (i18n).
2. **Activitate nouă** (section label, v44) → **activity text field + duration (min)** — title-first
   (v44). The title is the only required field.
3. **ORĂ** (micro-label) → time picker. Hour/min selects + AM/PM toggle + manual entry +
   a `— fără oră` option. **Default 7:00 AM is real** (registered on build via `fireInit`).
4. **Live time-range preview** pill ("start – end", e.g. `7:00 – 7:30 AM`) — language-neutral,
   updates on time/duration change, handles noon and midnight (`+1` next-day badge).
5. **ARIE** (micro-label) → category picker.
6. **ETICHETE** (micro-label) → tag chips + new-tag form.
7. **`+ Adaugă`** — full-width rose commit button (the final step). On success: short toast +
   pulse/scroll to the new slot (v41); no auto-refocus of the title.

**Shortcut/preset gestures:**
- **Tap = PRE-FILL the form** (title + area + duration); user reviews time, then presses Adaugă.
  (NOT instant-add — that was the old confusing behavior.)
- **Long-press = instant add WITHOUT time** (quick capture), with a brief confirmation toast.

**Slot (block) rendering:**
- Slots with a time show the **full range `start – end`** (computed from `time + dur`), not just
  the start. Updates live on time/duration edit. Midnight wrap shows `+1`.
- For timed slots, the **time sits on its own line above the title** (`.btime`), so long ranges
  never crowd the title. Untimed slots keep a compact inline `＋ oră`.
- The **time pill background is tinted with the slot's Arie (category) color** (soft pastel via
  `paleTint`, area-colored border, dark readable text) — ties slot to its area.
- Groups: **"Cu oră"** (timed, sorted by start) and **"Oricând azi"** (untimed, drag-reorderable).
- Drag-reorder works on the untimed group only; disabled while filters are active.

**Overlapping slots (Outlook-style, v33):**
- Timed slots whose **intervals intersect OR share a start time** are grouped into a **cluster**
  (connected components) and shown **side-by-side in columns**, splitting the width evenly for
  **any count** (2, 3, 4+). Columns narrow as more overlap; the time wraps instead of clipping.
- **Adjacent/touching** slots (e.g. 9:00–9:30 and 9:30–10:00) are NOT considered overlapping.
- This replaced an earlier "se suprapune" awareness badge (removed).
- Helpers: `blockInterval(b)`, `overlapClusters(list)`.

**Inline slot editor (tap a slot's time/tag dot to expand `.beditor`):**
- Rows (`.bedit-row`): **Oră** (hour/min/AM-PM dropdowns only — the manual free-text time input
  was REMOVED here in v46 because native selects can't shrink enough to keep it inline on a narrow
  card; the manual input lives only in the add form), **Durată**, **Etichetă**, **Mută în**.
- **Mută în** = four consistent pill buttons: Mâine / Weekend / Săpt. viit. / **📅 Altă zi** (v46).
  "Altă zi" is a `.movedate-btn` that opens a visually-hidden native `<input type=date>` via
  `showPicker()` (click/focus fallback) — replaced the old bare date input that rendered blank on
  Android. Edge case: editing an odd-minute slot (e.g. 7:10) snaps the minute dropdown to the
  nearest value (00/15/30/45).

---

## i18n system (3 languages: EN / ES / RO)

- `let lang` (persisted in `settings.lang`); `const I18N = { en, es, ro }` (~180 keys).
- **Default language is English** (`let lang="en"`, v50); a returning user keeps their saved
  `settings.lang`. Header switcher order: **EN · ES · RO**, kept in the header (visible on open).
- `t(k)` translation lookup; `applyI18n()` updates all `data-i18n` nodes;
  `LL(arr)` returns `arr[lang]` for language-keyed arrays
  (`BREATH`, `SOMATIC`, `JPROMPTS`, `PHRASES`, `PRESETS`, `CAT_LABELS`).
- Static HTML uses `data-i18n`, `data-i18n-ph`, `data-i18n-title`.
- **Write ALL new user-visible strings in all 3 languages from the start.**
- User-typed data is NOT translated (intentional).

---

## App features (implemented)

- **Day tab:** add flow + slots as documented above (reschedule Tomorrow/Weekend/Next Week/custom,
  filter by category/tag/hide-done, slot editor, per-slot timer, overlap columns).
- **Calendar tab:** Month view (mood-tinted cells + journal emoji), Year "pixels" grid (12×31).
- **Progress tab (consolidated, v68 area):** one unified screen (the two overlapping systems were
  removed). Interval switch (This week / This month / All); a single streak chip ("🔥 N days with a plan
  in a row"); 3 tiles with rose figures (time invested, active days, slots done); "Hours per area"
  (horizontal bars in the areas' functional colors); "Balance" (single proportion bar + "Most time in
  <area> (X%)"); "Mood ↔ productivity" correlation panel (journal mood ↔ slots done). Removed: the goals
  panel, the 4 old cards, the 28-day chart, the category/tag switch.
- **Respiro tab (renamed from "Calm" in v101 — petal label + hero title now "Respiro", RO/ES/EN):** 5 guided breathing patterns + 7 somatic/vagus exercises, medical disclaimer. Hosts BOTH calming and energizing content via the Calmează-mă/Trezește-mă toggle (energizer arc v90–v97).
  **Redesigned (v54, direction B):** warm LIGHT treatment (the old full dark-green `calm-mode` override
  was dropped) — soft sage/dusk wash + a gentle "spațiu de respiro" cue — and the card **emojis are now
  home-style line-icons** tinted in each exercise's functional color.
- **Profil + Setări (v55; Profil redesigned "Călătoria ta" in v68 area):** Profil = warm overview —
  greeting "Bună, <nume>" (name in rose italic; "Spațiul tău" if name empty), a "De când ești aici" card
  (N days · N intentions · N slots fulfilled), 3 stat tiles with rose figures (days-with-a-plan · calm
  moments · reflections), and a **"Intenții recente"** list (recent daily intentions with relative dates:
  today / yesterday / "6 Iun"). Setări = sound/reminders, tags, areas, backup + a **"Numele tău"** field
  (optional, max 24 chars, saved in `settings.name`, feeds the Profil greeting). The **Focus timer** lives
  on the Day-plan header (opens in an overlay), not in settings. Language switcher stays in the header.
- **Journal, Projects.** Journal: per-day mood + free text + 4F reflection scaffold + Word/PDF export.
  **The EMCC competencies box under 4F was removed (v52)** — 4F and the export stay. Projects: **no
  default seed (v53)** — a warm empty-state offers idea chips (Cărți & lecturi / Grijă de sine / Idei &
  insights) that create a project on tap.
- **Back navigation (v49):** every secondary view (Jurnal/Calm/Calendar/Progres/Proiecte/Profil) has a
  `← Acasă/Inicio/Home` pill at the top that returns to the Day view.
- **Intenția zilei (v38; popup-only since v68 area):** per-day intention set from the flower centre via a
  free-text popup (no suggestion chips, no header question); RO/ES/EN.
- **Quick-add "bloom" (v38):** the bottom `+` blooms into Notă / Activitate / Stare (route to existing flows).
- **3-language i18n** (EN/ES/RO) across the whole app.
- **PWA (real, v56+ through v89):** installable web app manifest (inline data URI) + a service worker
  (`sw.js`) for offline. Add-to-Home-Screen, standalone display, app icon. JSON export/import
  backup (now includes `intent:` AND `cycle` keys — fixed in v101).
- **Persistence module (v102, `persist.js`):** gentle Home banner that reminds to back up (or to install
  as PWA — iOS "Add to Home Screen" hint / Android install prompt) when there is no/old (>14d) backup;
  "Last backup: <date>" in Settings; export auto-marks the backup date. Dismissable (~7 days). Addresses
  the iOS Safari ~7-day localStorage eviction risk for the future public version.
- **Cycle — "Ritmul meu" (v98→v107, `cycle.js`, OPT-IN):** self-contained module. **Opt-in toggle**
  "Urmărește-ți ciclul" in Settings (**OFF by default** for everyone, v109 → app is gender-neutral by default; user turns it on). When on, it lives in **Calendar** (a discreet **moon strip** whose
  shape shows the estimated phase — new moon at menstruation, waxing to FULL at ovulation, waning in
  luteal; full moon reserved for ovulation) + a **"Ritmul meu" sheet** to LOG real periods ("Menstruația a
  început azi" / another date) with **history** (each period + cycle length, "în curs" for the latest) and
  delete; **average length is computed from the user's real cycles** (manual stepper fallback when <2
  logs). Reflection panel **"Cum te influenteaza ciclul"** stays in **Progres** (mood avg + productivity +
  journal days per phase). Detail overlay **"Luna ta"** = 4-phase moon arc + educational sheet + firm
  disclaimer (estimated, not medical, not contraception). Save confirmation = toast + next estimated
  period. NOT on Home (moved off in v106 to keep Home to a single signature flower).

---

## To do / Backlog (planned in chat, June 2026)

Status legend: `[ ]` open · `[?]` your decision / depends on phone testing · `[~]` not yet audited by Claude.

**P1 — done (testing-feedback design work, after the P0 batch v48–v53):**
- `[x]` Calm tab redesign — **direction B** done in **v54**: warm LIGHT theme (dark-green `calm-mode`
  override dropped), soft sage/dusk wash + "spațiu de respiro" cue, card emojis → home-style line-icons.
- `[x]` Profil → split into **Profil + Setări** (segmented) in **v55**; the **Focus timer moved out of
  settings** to a Day-plan launcher + overlay. Language switcher kept in the header.

**A. Design unity & cleanup (from the opening audit)**
- `[x]` A1. Merge the two CSS layers into one source of truth — **DONE in verified slices v86–v89**
  (pixel-diff identical on 27 screens before/after each slice). Only identical-selector pairs were
  merged, preserving each rule's unique props; residual multi-selector utility groupings left on purpose.
  (Open follow-up, separate: the legacy `--rose:#CB8188` mauve token, still used ~13×.)
- `[x]` A2. Gold/terracotta accents — RESOLVED through the revamp: active petal/labels now use
  **rose** (`--rose-4`); gold kept only as a discreet decorative accent (petal icons, panel glyph,
  hero "Día", hairlines); olive green removed from Settings actions (v67). Sage reserved for Calm.
- `[ ]` A3. Consolidate spacing/shadow/radius tokens (`--radius`/`-lg`, `--shadow`/`-sm`/`-soft`).
- `[~]` A4. Consistency audit of the other tabs (Proiecte, Calm, Progres, Jurnal) — same panel
  style, headers, rose accents. Not yet inspected; may already be fine.
- `[~]` A5. Microcopy tone check across RO/ES/EN (warmth preserved, not just literal translation).

**B. Add-flow follow-ups (from this session's work)**
- `[ ]` B6. Duration field clips its placeholder ("mi" vs "min") on a narrow screen — investigated (v97) without a clear repro; **still OPEN, needs Ines to point to the exact screen.** (Note: the composer duration is now quick-chips, so this likely refers to the slot-editor / shortcut-form `min` field.)
- `[x]` B7. Default time: **KEPT** — 7:00 AM stays the real default (confirmed by Ines, through v47).
- `[x]` B8. Long-press discoverability — **DONE (v112/v113):** long-press replaced by a visible **"+"** on each shortcut pill (tap=prefill, "+"=instant add). Confirmed unreliable/undiscoverable on Ines's Android.
- `[ ]` B9. Optional: gentle progressive disclosure of tags/duration (the "hybrid" idea) if the
  panel still feels dense in real use.

**C. Verify on real Android Chrome (validation, not building)**
- `[?]` C10. Native time pickers, blur, fonts.
- `[?]` C11. Overlap columns: readability of the wrapped time + tap targets (checkbox/play) in
  narrow 3–4 clusters; feel of the touch/scroll.
- `[?]` C12. Flower spacing on ≤360px screens (5 petals now; the flower scales down).
- `[?]` C12b. v38 nav: tap targets of the 5 petals (denser); the centre "Intenția zilei" feeling
  tappable (not just decorative); bloom-bud positions/labels above the bar; `backdrop-filter: blur`
  support for the bloom + intention scrims.
- `[?]` C12c. Decide if the `+` should stay rose in **calm-mode** (currently the calm dark override
  tints the FAB green) — one-line change if you want rose everywhere.

**E. UX coherence pass (from the v89/v97 audit — still open after the add-flow arc, priority order)**
- `[ ]` E1. **Duplicate title on secondary screens** — the screen name shows in the hero photo AND again as a heading below (Proiecte / Progres / Calendar / Respiro). Highest visibility.
- `[ ]` E2. **Emoji placeholder in the Proiecte empty-state** → swap for a line icon (rest of the app uses line icons). Cheapest consistency win.
- `[ ]` E3. **Header translation line clips into the hero photo** on Home at some widths.
- `[ ]` E4. **Progres "Ore pe arie" vs "Echilibru"** visualize the same data twice → keep one.
- `[ ]` E5. **Profil ↔ Progres overlapping metrics** (days-with-plan, slots, reflections) → split, one per screen.
- `[ ]` E6. **"AZI" / date-nav styled inconsistently** across screens → unify into one style.
- `[ ]` E7. **Legacy `--rose:#CB8188` mauve token (~13×)** → align to the `--rose-1..4` family or keep intentionally (decide).
- Recommended attack order: **E1 → E2 → E3**, then E4–E5, then E6–E7.

**F. Android QA checklist (Ines's device pass — headless ≠ real device)**
- `[?]` Native OS clock opens at "oră" in the composer AND in the slot editor.
- `[?]` Memento: set a slot 1–2 min out, app open → toast + chime + rose pulse at the time.
- `[?]` Shortcuts: 3 shown; "Add a shortcut" works and the new one appears; ✎ deletes.
- `[?]` Composer: chips on one row; expands on typing; "+" and Enter both commit.
- `[?]` Body scan TTS actually speaks (langVoice fallback).
- `[?]` B6 "min" clip on a narrow screen (pinpoint the screen).
- `[?]` Overlap columns readable on narrow screens; tap targets comfortable.
- `[?]` Trilingual switch (RO/ES/EN) updates every label, including the area chip.
- `[?]` localStorage persistence after close/reopen.

**D. Roadmap (larger, deferred)**
- `[x]` D13. **Menstrual cycle tracker — DONE (v98→v107).** Opt-in, in Calendar + Progres (not Home).
  Real period logging + history, average from real cycles, moon-phase indicator (full = ovulation),
  4-phase educational arc, mood/productivity correlation, firm disclaimer, trilingual. Framed as a
  PERSONAL pattern surfacing, non-prescriptive (cycle-phase→work-type prescriptions are NOT well
  supported by research — 2025 PLOS One meta-analysis). Remaining: real-Android validation of the new
  logging/moon/toggle flow.
- `[ ]` D14. Long-term: public/subscription version.

---

## Data model (localStorage)

- `blocks` (per day): `{ id, title, cat, time, dur, tags[], done, date }`
  - `time` = 24h string `"HH:MM"` or `""` (untimed); `dur` = minutes (0 = none).
- `cats` — categories/areas (≤8): `{ id, label, color }` (label = "Arie" in UI).
- `intent:YYYY-MM-DD` — the daily intention string (v38; `""` = none). Included in backup export.
- `tags`, `journal` `{text,mood,event}` (the old `comp`/EMCC field was dropped in v52), `projects`
  (start empty by default; each `{id,name,color,key?}` where `key` maps to `PROJ_LABELS` for i18n
  display), `settings` (incl. `lang` and `name` — optional user name, max 24 chars, v68 area, feeds the
  Profil greeting). Migration flags: `mig_proj_v1`, `mig_proj_v2` (removes the old empty Inbox/Spain
  defaults).
- `cycle` (v98→v108): `{ periods:[{start:"YYYY-MM-DD", bleed:N|null}], length, period, enabled }`. `periods` =
  real logged menstruations (sorted by start), each with optional **bleed duration** (days of bleeding);
  `length` = manual cycle-length avg fallback; `period` = default bleed days (5); `enabled` = opt-in flag.
  Migrates old single `start` → list, and old string-list (`v105–v107`) → objects. Cycle length is computed
  from start-to-start intervals (`avgLength`); bleed duration averaged separately (`avgBleed`, also drives the
  menstrual-phase threshold). Included in backup.
- `lastBackup` (ISO date) + `persistDismiss` (ISO date) — used by the Persistence module (v102).

---

## Style / tone & What NOT to do

- Mediterranean, warm, mobile-first (Chrome on Android), calm — not overwhelming.
- Target user: women wanting structure + reflection + wellness in one place.
- Do NOT: split into multiple files; add build tooling/npm/bundler/backend; rewrite large
  sections when a targeted edit works; leave untranslated strings; skip validation; reuse a
  previous filename.

---

## Changelog (v23 → v47)

- **v23** — Reordered add form: configure → commit; `+ Adaugă` became a full-width standalone button.
- **v24** — Live "start – end" time-range preview (language-neutral; noon/midnight handled).
- **v25** — Micro-labels ORĂ / ARIE / ETICHETE above each field group (i18n; unified old "Etichete:").
- **v26** — Slots display the full time range (start–end), not just start; live update on edit; `+1` wrap.
- **v27** — Time moved to its own line above the title in timed slots; untimed stay compact inline.
- **v28** — Reduced time↔title gap; time pill background tinted with the Arie color (+ border).
- **v29** — Raised the flower navigation closer to the header (less empty space).
- **v30** — Preset TAP pre-fills the form; LONG-PRESS = instant add no-time; real default time (7:00).
- **v31** — Visible gesture hint under shortcuts (i18n).
- **v32** — (superseded) gentle overlap "se suprapune" badge.
- **v33** — Overlapping slots shown side-by-side in columns (Outlook-style), even split for any
  count; adjacent slots excluded; overlap badge removed.
- **v34–v37** — CSS cleanup pass: single `:root`, removed dead variables + orphaned rules from
  replaced features.
- **v38** — **Navigation redesign** (resolves the old dual-nav overlap). Flower → single primary
  navigation with **5 petals at 72°** (Jurnal, Calm, Calendar, Progres, Proiecte); its **centre
  became the new "Intenția zilei" feature** (per-day intention, modal editor + suggestion chips,
  RO/ES/EN, included in backup). Bottom bar reduced to **Acasă · `+` · Profil**; the `+` is no
  longer a nav tab — it opens a **"bloom" quick-add** menu (Notă → Jurnal, Activitate → Day add,
  Stare → Jurnal mood) and rotates to `×` while open.
- **v39** — Bloom positioning fix (found on real Android): the quick-add buds floated too high,
  detached from the `+`, on short webviews (caused by per-bud fixed `bottom` offsets that
  double-counted `env(safe-area-inset-bottom)`). Rebuilt as a single flex `.bloom-cluster` anchored
  just above the bottom bar (one safe-area-aware anchor), so the buds always hug the `+`.
- **v40** — Flower↔Day-plan overlap fix (found on real Android): `.daypad` had `margin-top:-64px`,
  a hack tuned for the OLD 4-petal flower's empty bottom; the new 5-petal flower's lower petals
  (Progres, Calendar) extend into that zone, so the card overlapped them. Changed to
  `margin-top:8px` (≈22px clear gap below the lowest petal, verified at 412px width / scale 1.2).
- **v41** — Add-confirmation feedback. Adding an activity succeeded silently (form cleared, no cue,
  new slot often below the fold) → read as "not working". Now `addFromForm` shows a short toast
  ("Activitate adăugată 🌸", RO/ES/EN, ~2.2s), pulse-highlights the new slot (`.justadded`), and
  scrolls it into view. Removed the success-path auto-refocus of `#inTitle` (it fought the
  scroll-to-new-slot + keyboard on mobile); `addBlock` now returns the new id.
- **v42** — Label fix: the chip under the shortcuts read "Adaugă o activitate" / "Add an activity",
  but it actually opens the **add-shortcut** form (`openScForm`). Corrected `sc_add_long` to
  "Adaugă o scurtătură" / "Añade un atajo" / "Add a shortcut" (the real activity-add is the form below).
- **v43** — Added a "Scurtături" / "Atajos" / "Shortcuts" section label (`.minilabel`, i18n `sc_section`)
  above the shortcut chips, so the shortcuts row is visually distinct from the add-activity form below.
- **v44** — Add-form reordered to **title-first** (UX research + chosen variant A). The required field
  (title) now leads; time is secondary. New order: Scurtături → **Activitate nouă** (new `new_activity`
  label) → **Titlu** → Oră → Arie → Etichete → +Adaugă (was time-first: Oră → Titlu). Rationale:
  task/calendar tools (Google Calendar, etc.) lead with the "what"; conversational order = ask what
  before when; title is the only required field so it should come first.
- **v45** — Slot-editor time-row overflow fix (found on real Android): in the inline slot editor the
  manual time input ("sau 7:10 PM") spilled off the right edge of the card on narrow screens, because
  the responsive time-picker rules were scoped only to `#inTimeWrap` (the add form). Added equivalent
  constraints scoped to `.bedit-row` (row `flex-wrap`, `.tpick` wraps, `.tman` is `flex:1 1 90px;
  min-width:0`), so the picker stays inside the card (fits one line at ~412px, wraps the manual input
  at ~360px). The add-form picker is unchanged.
- **v46** — Slot-editor polish (real Android). (1) The manual free-text time input ("sau 7:10 PM")
  overflowed / wrapped awkwardly in the narrow editor card (native selects can't shrink enough to keep
  it inline) → **removed it from the slot editor** (kept in the add form); the editor time row
  (hour/min/AM-PM dropdowns) now fits cleanly on one line. Edge case: editing an odd-minute slot
  (e.g. 7:10) shows the minute snapped to the nearest dropdown value. (2) The custom-date field
  rendered as a blank box on Android → replaced with a clear **"📅 Altă zi"** pill button (matching
  Mâine/Weekend/Săpt. viit.) that opens the native date picker via `showPicker()`.
- **v47** — Home header polish. The days card (`.hero-day-card`) read as a panel "stuck on top of"
  the header: its border + drop shadow sat just inside the hero panel's own bottom edge, creating a
  tight double-line / banded seam. Softened to a **discreet card (chosen option B)**: removed the
  border, lightened the fill (`rgba(255,251,243,.42)`), softened the shadow
  (`0 3px 12px -9px`), and added bottom padding in `.hero-body` (22px→30px) so the card isn't crammed
  against the header edge. (Option A — dissolving the card entirely so date/progress sit directly on
  the hero — was also mocked up but not chosen.)

## Changelog (v48 → v53) — testing-feedback batch (P0)

- **v48** — **Bug fix: the "Finalizate" (Completed) tab was empty.** Root cause (reproduced in headless
  Chromium, not guessed): inside `relTime()` a local `const t=new Date()` **shadowed the global
  translation function `t()`**; the first completed entry dated "today" hit `t("rel_today")`, which
  threw `t is not a function`, aborting `renderCompleted` before any row rendered. Fix: renamed the
  local Date var to `now`. Both completed day-activities and project items now show. (Note: other
  `const t=` locals exist but don't call the translate fn after, so they're harmless.)
- **v49** — **Back button on every secondary view.** Added a discreet rose pill `← Acasă/Inicio/Home`
  (`.viewback`, i18n key `back_home`) as the first child of `#view-journal/proj/cal/stats/calm/profil`,
  wired to `setView("day")`. The shared hero stays on top; the back chip sits just below it. (`#view-day`
  has none — it's home.)
- **v50** — **Default language is now ENGLISH** (`let lang="en"`; returning users keep their saved
  `settings.lang`). Header switcher reordered to **EN · ES · RO**. The switcher lives in the header and
  is visible on open (language-agnostic codes), so a non-English speaker can switch without entering
  Settings.
- **v51** — **Header phrase no longer duplicated in Spanish.** `renderHeader` now leaves the translation
  row (`#phraseRo`) empty when `lang==="es"` (the Spanish phrase already shows in `#phraseEs`).
- **v52** — **Removed the EMCC competencies box under 4F** (the "Competențe EMCC acoperite" chips).
  Removed: the HTML box, `.emcc-box`/`.emcc-label` CSS, the `EMCC_COMP` array, `jComp`, `renderComp()`,
  the `comp` field in journal load/save, the EMCC section of the Word/PDF export, and the orphaned i18n
  keys (`emcc_h`, `emcc_full_label`). **The 4F reflection button and the Word/PDF export stay fully
  functional** (export now omits competencies).
- **v53** — **Projects: zero default seed + warm empty-state.** No projects are seeded on a fresh
  install. When `projects.length===0`, the Projects list shows a warm empty-state (`.proj-empty`):
  title `proj_empty_title` ("Niciun proiect încă"), subtitle `proj_empty_sub`, and three tappable idea
  chips — **Cărți & lecturi · Grijă de sine · Idei & insights** (keys `proj_books`, `proj_selfcare`,
  `proj_ideas`) — that create an i18n-aware project on tap (`addProjByKey`, sets `key`). A one-time
  migration (`mig_proj_v2`) removes the old default **Inbox** and **Proprietăți Spania** projects *only
  if empty* (no data loss). `deleteActiveProject` now allows deleting the last project (→ empty-state).
  `addItem` guards against no active project. The `+ project` chip still creates a custom one.

## Changelog (v54 → v55) — design batch (P1)

- **v54** — **Calm tab redesign, direction B (chosen by Ines).** Dropped the full **dark-green
  `calm-mode` override**; calm-mode is now a **warm LIGHT theme** — keeps the cream/rose surfaces and
  dark ink, only adds a soft sage/dusk **background wash** as a gentle "you've entered a calm space"
  cue, plus a `← Acasă` cue line "un mic spațiu de respiro" (`calm_cue`, leaf line-icon). The bottom bar
  and FAB now stay **rose** in calm-mode (removed the dark nav/bottombar/FAB overrides; the flower isn't
  shown on the Calm view anyway). **Card emojis replaced with home-style line-icons** (`CALM_ICONS` map
  + `calmIcon(id,color)`) tinted in each exercise's functional color (chip bg via `color-mix`); the
  summary pills and the player title use the same icons. (Minor remaining: a `🌱` still sits in the
  empty-summary text string.) Exercise `emoji:` fields remain in the data but are unused.
- **v55** — **Profil split into "Profil" + "Setări" + Focus timer relocated.** The Profil view now has a
  segmented control (Profile · Settings, `#profMode`). **Profil (overview):** warm greeting
  (`pf_hello`), today's intention card (reads `intent:`), and 3 stat tiles with home-style line-icons —
  days-with-a-plan streak, calm (7 days), reflections (computed from `getAllDays`/`calmlog:`/journal).
  **Setări:** reminders & sound, tags, areas, backup (unchanged, just grouped). The **Focus timer moved
  OUT of settings** to a launcher in the Day-plan header (`#focusBtn`, clock line-icon) that opens it in
  an overlay (`#focusOverlay`, reuses the `.calm-player` scrim; timer markup + IDs `#ringProg/#tTime/
  #tPresets/#tGo/#tReset` preserved so the timer JS is unchanged). Rationale (UX): a tool belongs where
  the work happens (the Day view), not buried in passive Settings; keeps nav flat (no 6th petal / 4th
  bar item). Per-slot ▶ timers are untouched. The **language switcher stays in the header** (visible on
  open), deliberately NOT moved into Profil.

---

## Changelog (v56 → v67) — premium "mockup1" REVAMP

Reference mockups (built & approved in chat, in outputs): `mi-dia-mockup1-complet.html`
(3 screens), `mi-dia-flower-final-mockup1.html` (the chosen flower), `mi-dia-settings-redesign-mockup.html`,
`mi-dia-plan-revamp-mockup1.md` (written plan). Direction confirmed by Ines: one rose family in
many shades, two discreet surprise accents (thin gold + cool sage on Calm), Fraunces + Nunito Sans,
flower-nav L1·V3·C1, labels inside petals, Mediterranean "old rich".

- **v56** — minor addition over v55 (+12 lines).
- **v57 — Faza A (foundation).** Body font Nunito → **Nunito Sans** (`opsz` axis; Google Fonts link +
  all 23 CSS refs). ADDITIVE color tokens (LOCKED `--rose-1..4` untouched): `--rose-0`, `--rose-5`,
  `--rose-dust`, `--gold-1/--gold-deep`, `--sage-1/--sage/--sage-deep`. Progress-bar gradient enriched
  (rose-0→rose-5 crescendo); flower-centre given inner bottom-shadow depth.
- **v58 — Faza B (flower-nav).** Replaced `petalPath` with the final **L1·V3·C1 teardrop** (sharp tip);
  enriched `petalFill` (added 52% mid stop); removed legacy `scaleX(.82)`. Petal palette → blush rose
  (`--petal-cream/-mid/-edge/-active/-line`); active icon/label → `--rose-4`. Labels re-centred INSIDE
  each petal (`.l1`–`.l5` repositioned, smaller). Navigation verified intact (petal click → setView).
- **v59 — Faza C (refinement).** Panel-flower glyph `%23E2922E` (strident orange) → `%23B8893F`
  (discreet gold), 2 occurrences. `CHIP_TINTS.sc_journal` warmed from grey to rose. Header/day-card/
  shortcuts/slots already existed well from v38, so Faza C was targeted refinement only.
- **v60 / v61 — Header to match mockup.** Softer `hero-veil` (terrace+bougainvillea photo breathes
  full-width); brand "Día" italic gold (`.brand-accent`); sub-title UPPERCASE letter-spaced (leading
  dot removed from `brand_tag` in all 3 langs); seed icon top-left (`.hero-mark`); swapped the hero
  photo to the better mockup image (terrace + bougainvillea cascade). v61 = clean rollback point after
  these header edits (versioning discipline). NOTE: the hero photo is a large base64 (~64KB) → file
  grew to ~335KB; acceptable for one image but keep an eye on total size.
- **v62 — Faza D (Calendar / Calm).** Calm was already complete from v54 (warm light theme, line-icons,
  7-day summary) — untouched. Calendar good; refined the **mood legend** to show colored square +
  emoji + WORD (new i18n keys `mood_n1..5`: Ploaie/Înnorat/Variabil/Frumos/Senin + ES/EN).
- **v63 — Faza E (finishes).** Most finishes already existed (blur bottom bar, rose FAB gradient,
  micro-animations). Added petal `:active` press feedback for mobile touch; added a local warm gradient
  behind the hero phrase (`.phrase::before`) for contrast over the photo.
- **v64 — Spacing.** Lifted the Day-plan card up (flower `margin-bottom` 34px → −18px) to remove the
  empty gap under the flower (the petals don't reach the box edge; scale(1.2) exaggerated it).
- **v65 — FIX: Progres "Mood balance" percentages.** Bar was a single full-width colour with no %,
  so 3 sunny days *looked* like "half the month". Added **% per mood** in the legend
  (`counts[m]/total`); bar `flex` already proportional. Clarified it's % of **logged days**, not of
  the whole month (e.g. 3 sunny + 1 cloudy → ☀️75% / 🌥️25%).
- **v66 — Bottom bar native.** `.bottombar` `position:absolute` → **`position:fixed`** (centred at
  `--maxw`, safe-area padding). It no longer scrolls with content — always visible like a native tab
  bar. `.phone-scroll` keeps 110px bottom padding so nothing is hidden.
- **v67 — Settings redesign (variant C).** Olive **green removed from ACTION elements** (it was
  breaking the theme): `.toggle.on` → rose + thin gold ring; `.leadadd button` (+focus) and the Export
  button → rose (`--rose-1`, matching Import). Olive/sage kept ONLY where functional (category dots,
  Calm exercises, done-tick). Chosen from a 3-option mockup (A gradient / B minimal / **C rose+gold**).

---

## Changelog (v68 → v89) — home/intention/progress/profile + CSS unification

- **Home screen (variant A2 + date band D3).** Layout: brand "Mi Día" → Spanish phrase (catch, on the
  photo, no box) → translation below in the app language (RO/EN; hidden on ES to avoid duplication) →
  **D3 date band**. The "your mediterranean planner" sub-title is hidden on Home. The D3 band is one
  simple elegant line `‹ Luni 8 iunie ›` (no year) + "N/N done" on the right + a fine progress bar under
  it; the "↩ azi" link shows only when NOT on the current day. Hero photo shortened (~158px) so the band
  lands on the cream (legible).
- **Intenția zilei → moved to a popup.** The "Care e intenția ta?" question is **no longer in the
  header**. It lives in a popup opened from the flower centre "INTENȚIE", with **only a free-text field**
  (title = question + description + Anulează/Salvează). **No hardcoded answers/chips** anywhere. The
  centre shows "intenție" + the value when set.
- **Progres (P0-4) — consolidated into a single screen.** Removed the two overlapping systems. Now:
  interval switch (This week / This month / All); one streak chip ("🔥 N days with a plan in a row");
  3 tiles with rose figures (time invested, active days, slots done); "Hours per area" (horizontal bars
  in the areas' functional colors); "Balance" (single proportion bar + "Most time in <area> (X%)");
  "Mood ↔ productivity" correlation (renamed from "Mood balance" to not clash with "Balance"). Removed:
  the goals panel (daily/weekly goal), the 4 old cards, the 28-day chart, the category/tag switch.
- **Profil — redesign ("Călătoria ta").** Greeting "Bună, <nume>" (name in rose italic; "Spațiul tău" if
  empty) + warm line; "De când ești aici" card (N days · N intentions · N slots fulfilled); 3 stat tiles
  with rose figures (days with a plan · calm moments · reflections); "Intenții recente" list (recent daily
  intentions, relative dates today/yesterday/"6 Iun").
- **Setări — name field (new).** "Numele tău" (optional, max 24 chars), saved in `settings.name`, feeds
  the Profil greeting.
- **Backlog A1 — CSS unification: DONE (v86–v89).** The single `<style>`'s two logical layers
  (base + REDESIGN OVERRIDE) were consolidated in **verified slices** (pixel-diff identical across 27
  screens = 3 langs × 9 states, at each slice):
  - **v86** — removed dead tokens (`--gold-1`, `--sage-1`, `--sage`, `--sage-deep`) + 2 dead rules
    (`.panel h2`, `.panel{margin-bottom}`) + a consecutive `.progress-top b` duplicate.
  - **v87** — merged identical-selector pairs `.datebar`, `.panel`, `.panel h2` → one rule each.
  - **v88** — merged `.chip`, `.chip:hover`, `.nav button`, `.nav .today`.
  - **v89** — merged `.addrow .add` (+`:hover`), `.progress-top b`, `.datebar .day .d1/.d2`, `.bar`.
  - **Principle:** only identical-selector pairs (same specificity) were merged, keeping each rule's
    unique props (`cursor`, `font-size`, `font-weight:800`, `border:none`, `line-height`). Scoped
    higher-specificity rules (`.hero-day …`, `body[data-view="day"] …`, `.d3bar`) were untouched — which
    is why nothing changed visually. Residual "overlaps" (`.panel`, `.datebar .day .d1`, `.panel h2`,
    `.progress-top b`) are legitimate multi-selector utility groupings, left on purpose.
  - **Open follow-up (separate, not touched — would be a design change):** legacy token
    `--rose:#CB8188` (mauve) is still used ~13×, distinct from the bougainvillea `--rose-1..4` family;
    possible accent inconsistency, to evaluate on its own.

## Changelog (v90) — energizer arc, F1

Reference mockups (built & approved in chat, in outputs): `mi-dia-mockup-feelbetter.html`,
`mi-dia-mockup-feelbetter-v2.html`, `mi-dia-mockup-energizer-abc.html`,
`mi-dia-mockup-energizer-interactive.html`, `mi-dia-mockup-name-structure.html`. Direction confirmed
by Ines: screen name stays **"Calm"**, structure **①** (keep sub-segments), placement **B** (a
direction toggle). Background: the "feel-better" arc came from a YouTube neuroscience video; of its 5
habits, extended-exhale already existed (`ext`), so it was not duplicated.

- **v90 — Calm: direction toggle Calmează-mă ⟷ Trezește-mă (F1).** The Calm view gets a full-width
  toggle (`#calmDir`, state `calmDir` = `calm`|`energy`) above the existing sub-segments. The **title
  stays "Calm"** (the flower petal is locked to "Calm" — the flower is not touched) and **structure ①**
  keeps `Respiratie · Corp & calm` (`#calmMode`) intact under "Calmează-mă". Under **"Trezește-mă"**:
  `#calmMode` is hidden, the cue swaps to `energy_cue` and the disclaimer to `energy_disclaimer`, and
  the list = **ENERGY**.
  - **ENERGY** (new; somatic format = `steps` + `dur`, so it reuses the somatic player UNCHANGED via
    `openCalm`): `move` (Mișcare 2 minute, `--terra`, 120s), `light` (Ieși la lumină, `--sun`, 120s),
    `shake` (Scuturare + postură, `--olive`, 60s). All RO/ES/EN.
  - **New i18n:** `dir_calm`, `dir_energy`, `energy_cue`, `energy_disclaimer` (RO/ES/EN).
  - **New tokens (ADDITIVE — the locked `--rose-1..4` are untouched):** `--sun:#E0A23C`
    `--sun-l:#F7E6C4` `--terra:#D2723E` `--terra-l:#F2D8C4` (warm "energy" family; FUNCTIONAL only,
    never an action color — consistent with Calm-exercise colors staying non-rose).
  - **`CALM_ICONS`** + 3 entries (`move`, `light`, `shake`); **`calmById`** now searches
    `BREATH.concat(SOMATIC, ENERGY)`.
  - **Scoped CSS:** `#calmDir{display:flex;width:100%}` (own full-width row) + `#calmDir button{flex:1}`
    + a warm selected state for `[data-d="energy"]`.
  - **Validation:** div balance 177/177, `node --check` OK on both script blocks, rendered in both
    states + the energizer player verified (headless Chromium — re-confirm on real Android).

## Changelog (v91 → v93) — energizer F2, body scan, permission pause

- **v91 — energizing breath (F2).** Added an inhale-dominant breath to the **ENERGY** list as its first
  card: `ebreath` (Respirație energizantă, inhale 4 / hold 1 / exhale 2, `--sun`, 8 cycles). It has a
  `pattern`, so `openCalm` renders it in the existing breath player UNCHANGED. `energy_disclaimer`
  broadened to cover breathing/lightheadedness (RO/ES/EN). New `CALM_ICONS.ebreath`. "Trezește-mă" now
  has 4 cards (1 breath + 3 movement). Pattern ratio chosen by Ines (gentle: 4/1/2).
- **v92 — body scan with audio (Calm / Corp & calm).** New SOMATIC card `bodyscan` (`scan:true`, `dur:60`,
  6 `regions` each with a `w` word + `c` cue, RO/ES/EN). The eyes-closed problem is solved by a
  region runner (`startScan`): auto-advances ~10s per region, plays `chime("reminder")` on each
  transition (Web Audio — no asset, offline), big current-region word (`#scanNow`, Fraunces) + cue,
  static step list hidden while running. A player mode toggle `#scanMode` (state `scanMode`) =
  **🔔 Doar ton / 🗣️ Voce**; voice uses `speechSynthesis` ONLY if a matching-language voice exists
  (`langVoice()`), else toasts `scan_novoice` and stays on tone (honest fallback). `stopCalm` now also
  `cancelSpeak()`. New i18n `scan_eyes/scan_tone/scan_voice/scan_novoice`, icon `CALM_ICONS.bodyscan`.
  **TTS quality/availability + iOS gesture behavior must be tested on real Android — verified only as
  logic in headless.**
- **v93 — permission pause + emotion wheel (Jurnal / Stare).** When a LOW weather-mood (1 Ploaie or
  2 Înnorat) is selected, a gentle card appears under the mood picker (`#permPause`): "E ok că simt
  asta acum" + micro line + a **↻ O respirație** button that opens the calming extended-exhale
  (`openCalm(calmById("ext"))` — a calm-side link, NOT the deferred F3 routing). Below it, **"Pune-i un
  nume"** = the **emotion wheel** as a 2-tap drill-down: `EMOWHEEL` (7 cores → ~6 sub-emotions each, the
  secondary ring subset, RO/ES/EN, colors matched to the uploaded Roata-emotiilor) → `#ppCores` →
  `#ppSubs` → chosen chip with clear. **The named emotion is stored as text** in the journal object
  (new field `emotion:{core,sub}`); **`mood` (1..5) is untouched**, so Calendar tinting + Progres
  correlation keep working — the wheel is an additive labeling layer, not a replacement. `renderPermPause`
  hooks the mood click + `loadJournal`/`saveJournal`. New i18n `pp_ok/pp_micro/pp_breath/pp_name/
  pp_optional/pp_more/pp_clear`. Affect labeling is real but **modest** (Lieberman et al., *Psychological
  Science*, 2007).

## Changelog (v94 → v96) — emotion routing, wheel expansion, surfacing

- **v94 — F3 routing (wheel → Calm/Energie).** Each `EMOWHEEL` core got a `route` field
  ("calm" | "energy" | none). After a sub-emotion is chosen in the permission pause, a subtle chip
  (`#ppRoute`) appears: "<core> is a high-arousal state — a moment of calm?" (→ Calm) or
  "<core> is a low-energy state — a little lift?" (→ Energie). The button sets `calmDir` then
  `setView("calm")` (which calls `renderCalm`). Routes: Tristețe/Rău → energy; Frică/Furie/Dezgust/
  Surpriză → calm; Fericire → none. Never auto-switches. New i18n `pp_route_calm/pp_route_energy/
  pp_go_calm/pp_go_energy`; CSS `.pp-route`.
- **v95 — emotion wheel expanded.** `EMOWHEEL` grown from ~6 to ~8-12 sub-emotions per core (77 total,
  RO/ES/EN), pulling the secondary+tertiary rings. Same 2-tap drill-down UI (no structural change).
  Honesty note: curated/normalized, not a 1:1 transcription of the uploaded wheel image.
- **v96 — "Emoții recente" in Profil.** New section under "Intenții recente" in the Profil overview
  (`#pfEmo`): reads `journal.emotion` across days, sorts desc, shows the last 5 as core-colored dot +
  `<b>core</b> · sub` + relative date (reusing `relDay`). Warm framing line `pf_emo_sub` ("…în cuvintele
  tale"), gentle empty state `pf_emo_empty`. **`mood` (1..5) stays the analytics backbone** — this is a
  read-only, on-demand, retrospective surface, deliberately NOT a Progres metric (the emotion is only
  captured on low-mood days, so aggregating it would read as a "scoreboard of suffering"). New i18n
  `pf_emo_h/pf_emo_sub/pf_emo_empty`; CSS `.pf-emo*`. Mockup approved first (`mi-dia-mockup-emotii-recente.html`).

## Changelog (v97) — small finishes

- **v97 — sun cue icon + Calendar emotion dot.**
  - **Sun on "Trezește-mă":** the Calm cue icon (`#calmCueIcon`) swaps leaf → sun and tints `--sun` when
    `calmDir==="energy"`, reverts to the olive leaf on "Calmează-mă" (handled in `renderCalm`).
  - **Calendar emotion dot:** days whose journal has a named `emotion` show a small core-colored dot
    (`.cell .emo-dot`, bottom-right, white ring) next to the existing mood tint + emoji. Legend
    `cal_help_month` updated in RO/ES/EN ("corner dot = named emotion").
  - **B6 (duration "min" clip): investigated, NOT changed** — no clear clipping found in the add form,
    inline slot editor, or reminder chips; left open pending Ines pointing to the exact screen (avoid
    "fixing" something that isn't broken).

## Backlog — energizer / feel-better arc

- `[x]` **F1 — Calm direction toggle** (v90).
- `[x]` **F2 — energizing breath** (v91).
- `[x]` **Body scan with eyes-closed audio guidance** (v92) — re-confirm TTS on real Android.
- `[x]` **Permission pause + emotion wheel** (v93).
- `[x]` **F3 — routing wheel → Calm/Energie** (v94) — subtle suggestion chip after naming the emotion;
  per-core `route` ("calm" for high-arousal Frică/Furie/Dezgust/Surpriză, "energy" for low-energy
  Tristețe/Rău, none for Fericire). Opens Calm and sets `calmDir`. Never auto-switches.
- `[x]` **Extend the emotion wheel** (v95) — `EMOWHEEL` expanded to ~8-12 sub-emotions per core (77 total,
  secondary+tertiary, curated & trilingual). NOTE: curated/normalized, not a pixel-perfect transcription
  of the uploaded Roata-emotiilor (some image labels illegible/near-duplicate) — Ines can correct terms.
- `[x]` **Surface the named emotion** (v96) — "Emoții recente" in Profil (mirrors "Intenții recente"):
  last 5 named emotions, core-colored dot + label · sub + relative date, warm framing ("în cuvintele tale"),
  gentle empty state. Deliberately NOT a Progres metric (avoid a "scoreboard of suffering" / rumination,
  since emotions are only captured on low-mood days). Optional Calendar dot considered, not built.
- `[x]` **Sun cue icon on "Trezește-mă"** (v97).
- `[x]` **Calendar emotion dot** (v97) — subtle per-day core-colored dot + legend note.

> **Status:** premium revamp Fazele A–E (v57–v64) + fixes (v65–v67); home A2/D3, intention popup, Progres
> consolidation, Profil "Călătoria ta" + name field (v68 area); **Backlog A1 (CSS unification) DONE
> (v86–v89).** Energizer/feel-better arc COMPLETE: **F1 (v90), F2 (v91), body scan (v92), permission
> pause + emotion wheel (v93), F3 routing (v94), wheel expanded to 77 (v95), "Emoții recente" in Profil
> (v96), sun cue icon + Calendar emotion dot (v97).** Cycle/Respiro/persistence arc COMPLETE (v98–v110). Add-flow redesign + in-app start-time memento arc COMPLETE (v112–v119). Calendar redesign + Journal redesign arc COMPLETE (v120–v125). Test instrumentation + a11y aria-label fix (v126), composer test handles (v127), slot a11y (v128), Journal olive corner accent (v129), Journal tall olive vine draping the writing card (v130), Journal olive branch at ~65% + auto-grow textarea / scrollbar-over-vine fix (v131), Journal olive branch REMOVED + caret-follow scroll while typing (v132). **Luxe Light+Dark revamp SHIPPED (v133→v144, live on Cloudflare):** two real themes (Light-luxe champagne+wine+gilt · Dark-velvet aubergine+gilt) with a ☾/☀ switcher, across all 7 views; foundation semantic tokens + Ephesis "Día" gold script; dark-velvet (v135–v142) + light-luxe (v143) built incrementally, agent-assisted; **all emoji → line-art SVG** (v142); final accents drop-cap + candle-glow + theme-aware cycle-moon (v144). e2e 68/68. New project skills: `/theme-qa` (+ `e2e/theme-grid.js`/`shoot.js`), `color-roles.md`, `module-css.md`. Remaining: Ines's real-Android device pass. Current build **`mi-dia-v144.html`**. **Playwright e2e harness + CI/CD arc COMPLETE: 68 tests across 18 specs (all 7 views + deep flows + a11y/axe + visual), CI sharding workflow, build-validation gate, main branch-protected (PR → CI → merge → Cloudflare deploy).** **Repo is PUBLIC (CV/portfolio showcase, June 2026): security-audited (no secrets in tree or history), monetization roadmap + design mockups moved to a gitignored `private/` and purged from git history, README rewritten as an engineering/QA showcase + screenshots, CC BY-NC 4.0 license.**
> Remaining: B6 (duration "min" clipping), B8 (long-press on real Android); real-device validation on
> Android Chrome (backlog C — petal hit-test, fixed bottom bar + safe-area, larger hero photo, "N/N done"
> readability, name greeting + recent lists, the Calm toggle + energizer player, **body-scan tone/voice**,
> the permission-pause + wheel flow, Calendar emotion dot); **B6 duration "min" clip (open — needs Ines to pinpoint the screen)**; D13 menstrual cycle
> tracker, D14 public/subscription version.
>
> **NEXT MAJOR WORK → the Luxury "old rich" Light+Dark revamp** — design approved via mockup (June 2026),
> app NOT yet touched. Full decisions + phased build plan (v133→v142) are in the **"⭐ NEXT UP"** section
> near the top of this file. Mockup: `private/mockups/mi-dia-luxe-mockup.html`. Default theme = **Light**
> (decided); no open decisions remain before v133.


---

## Changelog (v98 → v107) — cycle feature, Respiro, persistence, opt-in, moon

- **v98** — Cycle feature integrated (initially: flower on Home + reflection in Progres + "Ciclul meu" setup in Calendar). Calendar grid untouched.
- **v99** — Save confirmation: toast "Salvat ✓" + in-sheet "next period estimated" line.
- **v100** — Cycle setup button renamed to **"Ritmul meu / My rhythm / Mi ritmo"** (i18n-aware).
- **v101** — **"Calm" → "Respiro"** (petal + hero title, RO/ES/EN). Fixed backup bug: added `cycle` to export keys; import now refreshes the cycle UI.
- **v102** — **Persistence module** (`persist.js`): backup-reminder / PWA-install banner + "Last backup" in Settings + export marks backup date.
- **v103** — Banner moved below the autosave hint (off the top of Home); cycle button restyled to a quiet outline pill (`cyRhythmBtn`).
- **v104** — Removed the gold divider line under the hero quote translation (`border-top` on `body[data-view="day"] .hero-day-card`). Real-Android screenshot confirmed the app renders well on device.
- **v105** — **Real period logging + history.** Model changed from single `start` → **`periods` list** (migrates old `start`). Average length computed from real cycle intervals (manual fallback <2 logs). "Ritmul meu" sheet: "Menstruația a început azi" / another date + history (length per cycle, "în curs") + delete.
- **v106** — **Opt-in + moon + moved off Home.** Added `enabled` flag + Settings toggle "Urmărește-ți ciclul" (default OFF for new users, ON if data exists). Cycle moved off Home → **Calendar** (moon strip) + Progres reflection; Home back to a single signature flower. Indicator changed from a botanical **flower → moon phase** (illumination = phase; waxing on the right = follicular→ovulation, waning on the left = luteal). Detail title "Floarea ta" → **"Luna ta"**.
- **v107** — Moon illumination corrected: **full moon reserved for ovulation**; follicular grows only to ~half/three-quarters (was ~88% near-full, which looked full at small size and contradicted the legend).
- **v108** — **Bleed-duration logging + clearer history labels.** History was ambiguous ("ongoing" / "N days" read as bleeding length, but meant cycle length). Now each logged period also stores a **bleed duration** (editable stepper, default 5); history shows "cycle N days" / "current cycle" + "bleeding: N days"; Settings shows "Average bleeding". Model `periods` changed from string-list to `{start,bleed}` objects (auto-migrated). `avgBleed` drives the menstrual-phase threshold.
- **v110** — **Menstruation marked in the Calendar grid (V3: rose number + underline)** computed from start + bleed duration, gated on `cycle.enabled` — navigate Lună/An to any past month to see "from–to" at a glance. **History rows now show the bleeding interval + year** (`formatRange`, e.g. "3–7 feb 2025"); implausible logging gaps (>90d) no longer display a fake cycle length. New module API: `isMenstrualDay` + `onChange` (live grid re-render).
- **v109** — **Cycle OFF by default** (was: on if data existed) → neutral for all new users; turn on via Settings. **History redesigned to a fine one-row-per-cycle list** (date + cycle length / "current cycle"), with a summary line on top (avg cycle · avg bleeding · next) and **edit-on-tap** (bleeding stepper + delete expand only for the tapped row) — replaces the cluttered two-row-with-steppers layout. Bleeding edits update live without re-rendering the sheet.

## Changelog (v111 → v119) — bug fixes + add-flow redesign + start-time memento

- **v111** — Two pencil bugs: moved the "edit shortcuts" ✎ into its own header row above the shortcuts (was misplaced in the panel head); removed a meaningless decorative ✎ from the quick-add row.
- **v112** — **Unified composer (direction C+A).** Replaced the collapsible "＋ câmpuri complete" with a composer that expands on typing and reveals inline **Oră · Arie · Etichetă** + start–end preview. **Native OS time picker** (`<input type=time>` overlay) in composer AND slot editor; duration quick-chips (default 30). Shortcuts get a visible **"+"** (tap=prefill, +=instant add) replacing long-press. New i18n: `ora_chip`, `lbl_dur`, `sc_add_direct`. Removed `data-i18n` from the area/tag chip labels so language-switch no longer clobbers the selected area name (`refreshAreaChip`/`refreshTagChip` run on `applyI18n`).
- **v113** — Shortcuts rendered as compact pills; **default shortcuts reduced 7→3** (Coaching · 4F reflection · Movement). Removed dead code: `quickAdd`, `toggleAddForm`, legacy `makeTimePicker`.
- **v114** — Tried a wrap-flow shortcut layout (rejected on device — ragged/uneven).
- **v115** — Shortcuts = **neat 2-column grid**, bounded to ~2 rows; equal-width cells, labels clamp to 2 lines (no truncation).
- **v116** — Fixed **add-shortcut on device**: removed the hard 3-item display cap (newly added shortcuts were hidden beyond it, so "Add" looked broken). Fixed **overlap**: moved the add-form below the hint and removed the legacy `-11px` negative margin on `.chiphint`.
- **v117** — **One-time migration** (`sc_default3_v117` flag in Store): resets a device's persisted shortcut list to the 3 curated defaults once, then never again — fixes installs whose saved 7-item list overrode the v113 default change.
- **v118** — **In-app start-time memento.** While the app is OPEN, when a timed slot's **start time arrives** → toast ("⏰ E ora pentru: …") + gentle 2-note chime (respects the sound setting) + a rose pulse on the slot (`.memento-flash`). Fires once per slot/day (`mementoFired` keyed by date); **past slots are suppressed on load** (no retroactive alerts). New Settings toggle **"Memento la ora slotului"** (`#mementoToggle`, default ON, persisted as `settings.memento`). i18n RO/ES/EN. **Foreground-only by design** — closed/background notification would need a backend + push (out of scope). This is separate from the existing end-of-slot reminder system (`reminderLeads`, tied to the manual Focus timer), which is untouched.
- **v119** — **Composer compaction.** `#inTimeWrap` was stretching full-width and pushing Arie/Etichetă to a second row (wasted space); pinned to content width so Oră·Arie·Etichetă fit one row. Tighter chip paddings + section margins. Composer height ~196px → ~160px.

## Changelog (v120 → v125) — Calendar redesign + Journal redesign

- **v120–v121** — groundwork for the Calendar redesign. (Granular per-version notes were on Claude Code
  on Ines's machine; the web-Claude session that produced this batch did not have them.)
- **v122–v124** — **Calendar redesign: "lentile" model** Plan / Stare-Lumína / Ritm; azahar popup at the
  day detail; mood "glow" radials in Sorolla light; cycle Option A; bugfix navigating to Jurnal.
- **v125** — **JOURNAL REDESIGN** (see the architecture note below) + **date-nav unified** with Home.

### Journal redesign (v125) — photo-led + airy, the app's real identity

Direction: photo-led + airy, on the REAL identity (wine-rose #9E2B4E + gold #C19A46 + olive + soft cream
cards) + the OliveDetails.png ornament + HeaderImage.png.

- **Header:** there is NO separate journal header anymore. It reuses the global `.hero` (the embedded jpeg
  moved into the `:root` var `--hero-bg`; `.hero-photo` uses the var). On sub-screens `.hero` collapses to
  photo + "← Journal" + langbar — so the journal has ONE header (a redundant `jhero` that caused a double
  header was removed).
- **Stare = tonal DISCS** (not weather-emoji). `renderMood()` builds discs (JDOT) + a wine ring on the
  selected one + `#moodWord = t("mood_n"+jMood)`. All wiring preserved: jMood toggle, permPause (emotion
  wheel on low moods 1–2), autosave, 4F, export, i18n.
- **Stare = LIGHT on the page:** `applyJWash()` sets `--jwash`/`--jwash2` on `#view-journal` from `JWASH`
  per mood (page + the writing card warm/cool, .45s transition). Senin → gold, Ploaie → blue-grey.
- **Writing card** `.jwrite-card` with a fine gold frame (`.jwrite-frame`).

### Date-nav unified (v125) — UX-coherence (6) RESOLVED

Base `.datebar`/`.nav` aligned to Home's compact sizes: day 1.4rem, 38px buttons, smaller TODAY pill;
`.datebar .day{flex:1;min-width:0}` + `.datebar .nav{flex:none}`. Fixes the clipped `›` arrow on Android
and unifies the date card across Jurnal + Calendar.

## Changelog (v126) — test instrumentation + a11y aria-label fix

- **v126 — `data-i18n-aria` + role on modals (enables semantic Playwright locators; fixes an a11y
  bug).** Context: the Playwright e2e suite was using CSS/`data-v`/ID selectors because the nav
  controls' `aria-label`s were **hardcoded Romanian and never tracked the UI language** —
  `applyI18n()` only handled `data-i18n`/`-ph`/`-title`. That is a real accessibility defect (an EN
  screen-reader user heard "Jurnal" on a button labelled "Journal"). Fix:
  - **`applyI18n()` extended** with one additive line: any `[data-i18n-aria]` element gets its
    `aria-label` set from `t(key)`, so the accessible name now follows EN/ES/RO.
  - **`data-i18n-aria` applied** to the 5 petals (`tab_journal|tab_calm|tab_cal|tab_stats|tab_proj`),
    the bottom bar (`tab_home`, `tab_profil`), `#addFab`, `#intentionBtn` (`intent_q`), `#heroSecBack`.
  - **Two new i18n keys** to keep accessible names UNIQUE (else `getByRole({name})` hits strict-mode
    collisions): `aria_back` ("Back to home") on `#heroSecBack` (distinct from the bottom-bar "Home")
    and `aria_quickadd` ("Quick add") on `#addFab`.
  - **`role="dialog"` + `data-i18n-aria`** added to `#intentModal` (`intent_q`) and `#bloomMenu`
    (`bloom_ask`) so `getByRole('dialog')` works. Purely additive — NO focus-trap/`aria-modal` added,
    so popup UX is unchanged; the `aria-hidden` open/close toggle is untouched.
  - **Zero visual change** (attribute-only edits; div-balance 211/211, `node --check` OK, screenshot
    identical to v125). The e2e suite was refactored to lead with `getByRole`/`getByText` accordingly.

## Changelog (v127) — composer test instrumentation

- **v127 — composer locators for the add-flow e2e suite (+ commit-button a11y).** Three small,
  attribute-only edits so the day-tab composer can be driven by first-class Playwright locators:
  - **`#addBtn` (commit "+")**: added `data-i18n-aria="aria_addslot"` + new key `aria_addslot`
    ("Add activity") — its accessible name now tracks language (was static RO "Adaugă"), consistent
    with the v126 a11y fix. `getByRole('button', {name:'Add activity'})`.
  - **`#areaChip` / `#tagChip`**: added `data-testid="composer-area"` / `"composer-tags"`. These chips'
    visible label is **dynamic state** (the current area / tag count), so there is no stable accessible
    name to target — `getByTestId` is the right tool (and we deliberately DON'T override their
    meaningful dynamic label with a static aria-label). The title (placeholder), duration chips (numeric
    text), and native time input (existing `aria-label`) already had good user-facing handles — left as-is.
  - **Zero visual change** (attribute-only; div-balance 211/211, `node --check` OK). New suite:
    `e2e/tests/add-flow.spec.js` (expand-on-typing-not-focus, fast Enter → untimed slot, duration capture,
    native time → Timed group, area selection), asserting both the DOM and the persisted block model
    (`readBlocks()` helper).

## Changelog (v128) — slot a11y (done tick + time pill)

- **v128 — keyboard + screen-reader access for the slot tick & time pill.** Both were operable only by
  mouse/touch and had NO accessible name. In `blockEl`:
  - **Done tick** (`.tick`, a `<div>`) → `role="button"` + `tabindex=0` + `aria-label` (new key
    `aria_done` = "Mark as done") + **`aria-pressed`** reflecting `b.done` + an Enter/Space `keydown`
    handler. Now a proper toggle button for SR/keyboard.
  - **Time pill** (`.time`, a `<span>` that opens the inline editor) → `role="button"` + `tabindex=0` +
    `aria-label` = "`<time>`, Tap to edit the time" (keeps the time AND states the action) + Enter/Space.
  - Attribute/behaviour-only (div-balance 211/211, `node --check` OK). `slot-interactions.spec.js`'s
    done test upgraded to `getByRole('button', {name:'Mark as done'})` + asserts `aria-pressed`.
  - **Resolves the "Open a11y gap" backlog item** raised during testing.

## Changelog (v129) — Journal olive corner accent

- **v129 — small watercolor olive sprig in the writing-card top-right corner.** After an extensive
  design exploration (several source assets tried + a long chroma-key/composite iteration that DIDN'T
  reach the bar — documented honestly), Ines sourced a watercolor olive sprig (`olive2.jpeg`, white/
  checkerboard bg). It was **chroma-keyed cream/checkerboard→transparent in a browser canvas** and
  embedded as a `:root` CSS var `--olive-corner` (the old `--olive-frame` jpeg var was removed).
  - `.jwrite-card`: `overflow:hidden` + a `::after` painting `--olive-corner` `right top/contain` in the
    **top-right corner**, `opacity:.72`, delicate. `.jtext` gets `padding-right:92px` so text/placeholder
    **never overlap** the sprig (the hard requirement Ines repeated).
  - Prompt restyled: `.jprompt.jolive` dropped its olive-image background → a subtle dashed cream box;
    "+ reflecție ghidată" + shuffle + Word/PDF export stay below the card.
  - Behaviour & IDs preserved (autosave, mood/permPause, `#jPrompt`/`#jShuffle`, `#j4f`, export, i18n).
    Validated (div 211/211, `node --check` OK); journal + a11y + visual specs green.
  - **Lesson (for future asset work):** fabricating/compositing botanical art by hand or chroma-keying
    low-contrast assets (e.g. `olive4` — pale leaves blended with the checkerboard) is unreliable; a
    clean, high-contrast transparent source + CSS placement is the dependable path.

## Changelog (v131) — Journal olive branch at ~65% + auto-grow textarea (scrollbar bug fix)

- **v131 — fixes the original scrollbar-over-the-vine bug + Ines's chosen branch framing.**
  - **Bug (reported with a photo):** when a journal entry grew past the writing card's fixed height, the
    textarea showed an internal **scrollbar** on the right edge that painted **over** the olive branch
    (the branch `::after` is `z-index:1`, the textarea `z-index:2`, so the native scrollbar drew on top).
  - **Fix = auto-grow.** New `growJ()` sets `#jText` height to its `scrollHeight` so the textarea has NO
    internal scroll — the card grows with the text, the page scrolls instead. `.jtext` →
    `resize:none;overflow:hidden`. Hooked in `loadJournal` (after value set), the `input` listener, and the
    `#jPrompt` / `#j4f` auto-insert handlers (CSS `min-height:178px` keeps the empty-state size).
  - **Branch framing (Ines's call, after a 4-variant mockup `mi-dia-jurnal-ramura-robust-mockup.html`):**
    the branch is pushed ~half off the right edge — `::after{transform:translateX(35%)}` (~65% visible,
    **whole leaf, no crop**), still `height:100%` full-height drape. `.jtext` gutter `padding-right`
    62px → 46px. **Explicitly accepted trade-off:** at very long entries the branch widens and the text
    reads softly *over* the leaves (a background effect) — Ines prefers this to cutting the leaf, so it is
    NOT treated as a bug and there is NO dynamic clearance/crop. (Rejected alternatives in the same mockup:
    constant fixed-width band via `cover`, and top-only fixed-size branch.)
  - Validated (div 210/210, `node --check` OK on both scripts) + rendered the Journal view empty
    (placeholder clears the leaves) and at ~100 words (branch full-height, text softly behind the leaves,
    no scrollbar). Headless Chromium — olive tone + finesse still need a real-Android pass.

## Changelog (v130) — Journal olive sprig swapped for the tall draping branch

- **v130 — tall olive vine draping the full right edge of the writing card** (replaces the small v129
  corner sprig). Ines supplied `TheOliveTall.png` (a long hanging watercolor olive branch, already on a
  transparent bg, 1024×1536). Process: the real branch content was a narrow centered column
  (bbox X 368..608, Y 0..1432, lots of transparent padding), so it was **cropped to its bounding box +
  downscaled to 150×794** (base64 ~168KB — essentially the same weight as the old corner sprig's ~182KB,
  so the file did NOT grow: 633KB → 622KB) and embedded as the new `:root` var **`--olive-tall`** (the
  old `--olive-corner` var + sprig were removed).
  - `.jwrite-card::after`: `top:0; right:2px; height:100%; aspect-ratio:150/794;
    background:var(--olive-tall) top right/contain no-repeat; opacity:.82` — the branch **drapes the full
    card height** from the top-right corner and **scales with the card** as it grows with text. **Variant A**
    of a 4-option mockup (`mi-dia-jurnal-olive-tall-mockups.html`: A drape / B side gutter / C short top /
    D faint watermark); Ines chose **A at 100% height, gutter 62px, no dedicated right band**.
  - `.jtext` gutter `padding-right` 92px → **62px** so text/placeholder never touch the leaves.
  - `.jfoot` got **`z-index:2`** (above the branch `z-index:1`) so the word-count + "Saved ✓" stay legible
    where the branch tip reaches the bottom (matters in ES "Guardado ✓", which is longer).
  - **Bug caught during integration (documented honestly):** the first PowerShell splice of the new base64
    var dropped the trailing `;`, so the var value swallowed the next declaration and made the `background`
    shorthand invalid → `background-image:none` (branch invisible in-app though it rendered in the static
    mockup). Re-spliced with the `;`; computed `::after` background then resolved to the data URI.
  - Validated (div 211/211, `node --check` OK on both script blocks) + rendered the real Journal view
    (empty placeholder + a 37-word typed state) — branch full-height, no text/footer overlap. Headless
    Chromium — re-confirm the olive tone + finesse on real Android.
  - **Follow-ups in the same v130 session (Ines feedback):**
    1. The stem poked above the gold frame's top line → looked like a cross. First aligned the vine to the
       frame (top:9px / height:calc(100% − 18px)); then Ines asked to **remove the gold frame entirely**
       (`.jwrite-frame` div + CSS) because the journal page felt **too segmented**. Vine restored to full
       card height (top:0 / height:100%). Div balance 211 → **210** (one less div).
    2. **Journal de-segmentation — "one sheet" (mockup A of 3: A one-sheet / B continuous column / C
       writing-first; mockups in `mi-dia-jurnal-fluid-mockups.html`).** Root cause: the journal was a big
       `.panel` box wrapping FOUR more bordered boxes (event input, writing card, dashed prompt, dashed 4F
       button) + export buttons = box-in-box clutter. Fix = a CSS block **scoped to `#view-journal`** (so
       shared `.panel`/`.jevent`/`.exp-*`/`.j4f-btn` are untouched in other views) that dissolves the inner
       chrome: outer `.panel` → transparent (no border/shadow/bg, `padding:4px 0 10px` — the `#view-journal`
       `.view` already gives 18px side padding, so content aligns with the date bar); `.jevent` → a quiet
       bottom-hairline underline; `.jprompt.jolive` → a plain centered italic line (dashed box gone), shuffle
       a borderless ghost; `.j4f-btn` → a centered underlined text-link (dashed lavender box gone); `.exp-btn`
       → underlined text links. **Only the writing card stays an elevated surface.** Behaviour/IDs unchanged
       (autosave, mood/permPause, 4F, export, i18n). Validated (div 210/210, `node --check` OK); rendered the
       full Journal view (empty + typed) — one fluid warm page.

## Changelog (v142) — Luxe revamp Faza 6: QA green + promote (revamp COMPLETE)

- **v142 — QA gate for the whole Light+Dark revamp; everything works.** No app-code change beyond the build
  already at v139; this slice is verification + promote:
  - **Promoted** `mi-dia-v139.html` → `index.html`; bumped `sw.js` `CACHE` `mi-dia-v132`→`mi-dia-v139` (so old
    PWA caches clear on activate). `npm run validate` (div-balance + `node --check`) → **OK on index.html**.
  - **New `e2e/tests/theme.spec.js`** (4 tests) locks the new switcher: default light + moon glyph; hero glyph
    → `data-theme="dark"` + glyph flips + `settings.theme` persisted + survives reload; the Settings "Dark
    theme" toggle flips both ways; a returning user seeded with `settings.theme=dark` boots dark. Theme state
    asserted on `html[data-theme]` + `localStorage` (no semantic locator for theme).
  - **`@visual` baselines regenerated** (`playwright test visual.spec.js --update-snapshots`): the design-locked
    flower-nav + bottom-bar snapshots changed in LIGHT too (wine FAB + Ephesis "Día"), so the win32 baselines
    were rewritten — expected, not a failure.
  - **Full suite: 68/68 pass** (62 functional across all views — no regression from the dark theming/JS fixes;
    4 theme; 2 visual). The 62 functional tests run in the default LIGHT theme and confirm add-flow, journal,
    persistence, i18n, nav, projects, respiro, progress, profile, shortcuts, slots, timer, backup all still work.
- **Not done (Ines's call):** the real-Android device pass (native pickers, blur/backdrop on velvet, axe
  contrast on device, the fonts incl. Ephesis + `background-clip:text` gilt), and **git commit + push** (which
  auto-deploys to Cloudflare) — the working tree is staged (index.html + sw.js + v133–v139 + CLAUDE.md +
  skills) but NOT committed/pushed, awaiting go-ahead. At commit time: `git rm` the superseded
  `mi-dia-v133..v138.html` (keep v139 + index.html), per the working-tree rule.

## Changelog (v144) — close the 3 deferred luxe accents (drop-cap · candle-glow light · cycle moon dark)

- **v144 — the last polish, closing every item deferred during the revamp.** Verified with the new `/theme-qa`
  grid (dogfooded — all 8 views × both themes) + e2e 68/68 + `@visual` regenerated. Three changes:
  1. **Gilt drop-cap on the Spanish phrase** (was deferred in v135 because the phrase is wrapped `«…»` in JS,
     so `::first-letter` hit the guillemet). `renderHeader` now builds `#phraseEs` via innerHTML wrapping the
     first REAL letter in `<span class="phrase-dc">` (esc'd — the global `esc` from v142); CSS `.phrase-dc` =
     a raised gilt-gradient initial (`background-clip:text`), inline (no float, so it never spills on the small
     2-line home phrase). Gilt in BOTH themes.
  2. **Candle-glow behind the flower centre in LIGHT** — dark already had the gilt halo; added a soft
     `0 0 22px 4px rgba(200,162,76,.26)` glow to `html[data-theme="light"] .flower-center`.
  3. **Cycle moon-disc theme-aware (dark)** — the v138 CSS override was mis-scoped (`#view-cal .cy-moon` — but
     the "Luna ta" sheet/detail mounts on `body`, not in `#view-cal`) AND incomplete (the 4-phase arc has no
     `.cy-moon` class). Fixed at the source: **`moonSVG` now reads `data-theme`** and paints the disc velvet
     `#3c1528` + gilt stroke on dark (near-white `#F0E2E3` on light); the lit phase stays `--rose-2`
     (functional). Themes every moon instance, any container. Removed the dead CSS override. Verified: with a
     period logged, the dark moon disc renders `#3c1528` (velvet).
- **Nothing else remains from the revamp plan** — every listed signature accent (gilt hairline, Ephesis "Día",
  serif figures, drop-cap, candle-glow) is now in. Remaining is only Ines's device pass.

## Changelog (v143) — LIGHT-LUXE pass: light theme now matches the mockup (champagne + wine + gilt)

- **v143 — the LIGHT theme is repainted into "Light-luxe"** (Ines: light hadn't really changed — most of the
  revamp was the new dark theme + additive dark-only overrides, so light stayed close to the old cream/rose).
  Now light matches the mockup's light variant. Agent-assisted (7 parallel agents by area) + Team-Leader
  foundation/integration. All green: **68/68 e2e** (66 functional + 2 visual — the flower-nav `@visual`
  baseline regenerated since the light flower CENTRE is now wine), div 213/213, `node --check` OK.
  - **Foundation (`:root`, light-only — dark overrides all these so it's untouched):** `--sand`/`--sand-deep`
    → champagne `#F3ECE0`/`#E7DCC4`; `--ink` → `#3A2438`, `--ink-soft` → `#8C6E72`; `--line` → **gold
    hairline** `rgba(184,137,63,.30)`; `--page`/`--page-2` → champagne; body bg → champagne gradient. This
    instantly gives champagne surfaces + gold hairlines + luxe ink across all of light.
  - **Rose ACTIONS → WINE** (`html[data-theme="light"]`-scoped overrides, so DARK + base untouched;
    `--rose-1..4` LOCKED, appearance-only): flower **centre** → wine radial (petals stay blush); composer
    commit/chips-selected/time-preview; shortcut "+"; Focus; `.add-commit`/`.testbtn`/Export-Import(!important
    for inline rose)/lead+tag+area add buttons; `.toggle.on` → wine + gilt ring; TODAY pills
    (`.nav .today`/`.calTodayBtn`/hero); progress-bar fills → wine gradient; `.segmented .sel` → wine text;
    Journal mood-ring + 4F link; Respiro Start + accent figures; Calendar lens-sel/today-cell/plan-ring-arc/
    "Ritmul meu"; Progress stat figures (→ accent `#A8255B`)/streak/range-switch; Projects idea-chips/active/
    focus rings; Profile journey card/greeting/figures; persist banner; cycle ON switch.
  - **KEPT (not recolored):** the flower PETALS blush rose; functional area/mood/calm/cycle colors; the green
    done-tick; the legacy mauve `--rose` on DELETE/danger affordances (kept distinct from the wine primary
    action, on purpose); nav-active stays gilt (`--gold-deep`, avoids over-saturating next to the wine FAB).
- **Both themes are now full luxe:** Light-luxe (champagne + wine + gilt) ⟷ Dark-velvet (aubergine + gilt),
  switchable via the hero ☾/☀ + Settings toggle. **The revamp's original "two REAL themes" vision is met.**
- **Honest limit:** headless Chromium — device pass (contrast of wine on champagne, gilt hairlines) stays
  Ines's step. Not committed/deployed (awaiting go-ahead).

## Changelog (v140 → v142) — dark-mode polish (Ines review) + full emoji → line-art sweep

Live-review fixes on the luxe dark theme + a project-wide emoji→line-art conversion. All validated
(div 213/213, `node --check` OK on all 3 scripts) and the **full e2e suite is green: 68/68** (66 functional +
2 visual). Promoted to `index.html`, sw CACHE → `mi-dia-v142`.

- **v140 — hero dark fixes.** (1) The Home **date-band card** (`.hero-day-card`) read as a hard velvet box
  with a gilt border on dark; softened to a whisper, then (v142) made **fully transparent** (`background/
  border/box-shadow:none !important`) so it doesn't read as a box at all — the date sits on the hero like in
  light. (2) The **secondary-view hero title** (`.hsec-title` "Journal"/"Progress"/…) was dark ink →
  invisible on the dark hero photo; → champagne-gold `--gold-1` + a soft text-shadow.
- **v141 — Persistence banner (persist.js).** The install/backup banner `.pb` kept its pale-pink card while
  `.pb-tx` (`--ink`) flipped to champagne → champagne-on-pink = invisible. Dark override: card → velvet
  `--surface-2` + gilt hairline, text champagne, icon gilt (Install button stays rose = action).
- **v142 — EVERY pictographic emoji replaced with line-art SVG** (Ines: "no emoji, use line-art, incl. the 4F
  reflection"). Agent-proposed, Team-Leader-integrated (~40 edits):
  - **New assets:** a `CAT_ICONS` map + `catIcon(id,color)` helper (built-in area icons: target/palette/
    heart/books/herb), `MOOD_ICONS`+`moodIcon` (weather line-glyphs), `TRASH_ICON`, and inline SVGs for 4F
    (sprout), Word/PDF (docs), scan tone/voice (bell/speech), calm/energy routing (leaf/sun), empty-day/
    filter (sunrise/magnifier), streak (flame), move-day (calendar), projDel (trash), shuffle (refresh),
    item-link (chain). Icon-sizing CSS added (SVGs carry no width/height).
  - **Persistent buttons** restructured to `svg + span[data-i18n]` (so `applyI18n`'s `textContent` can't wipe
    the icon) — the pattern already used by `#focusBtn`. Emoji stripped from those i18n strings.
  - **Category glyphs:** `catIcon` used where the node takes innerHTML (Settings areas, Progress "Hours per
    area" bars); dropped from `<option>`s and `textContent` string sites (options can't hold SVG). **The
    `emoji:` data-model field is KEPT** (backward-compat / backup) but no longer displayed — no migration.
  - **Toast/label emoji stripped** from ~18 i18n strings (all ro/es/en). The 4F **export document** body
    (Word/PDF) also cleaned (🌱/✍️ removed).
  - **Kept (typographic, not emoji):** `✓` tick, `✕` close/delete, `✎` edit, `☾`/`☀` theme toggle. Unused
    `emoji:` fields on Respiro exercises (cards render `CALM_ICONS` line-icons) left as harmless dead data.
  - **Regression caught + fixed (honest):** the first v142 e2e run had **13 failures** — day slots stopped
    rendering (`ReferenceError: esc is not defined` in `blockEl`). Root cause: `esc()` is defined *locally*
    in only 3 render fns, and the icon swaps added `esc()` calls in `blockEl`/`renderStats`/`renderProjects`
    which had no local `esc`. Fix: a single **global `esc` helper** (the local ones shadow it harmlessly).
    Re-run → 66/66 green. (node --check passes syntax but not runtime scope — the e2e caught it.)
- **Not done (Ines's step):** real-Android device pass + git commit/push (deploy). Working tree staged
  (index.html, sw.js, CLAUDE.md, v133–v142, theme.spec.js, skills) — not committed.

## Changelog (v139) — Luxe revamp Faza 5 (part 2): Profile + Settings dark (revamp functionally complete)

- **v139 — Profile + Settings themed dark; the luxe Light+Dark revamp is now functionally complete in both
  themes across all 7 views.** Small CSS-only slice (div 213/213, `node --check` OK on all 3 scripts;
  dark screenshots of both Profile + Settings segments + the earlier light spot-check). Most of Settings
  already themed via the shared `.panel`/toggles from v137; the residual hardcoded LIGHT surfaces fixed:
  - **Profile:** `.pf-journey` "De când ești aici" card (`#FBE9EC,#FFF7F3` white-pink → velvet + gilt
    hairline); the dim dark-brown serif headings `.pf-hello` ("Your space") + `.pf-recent-h` (Recent
    intentions/emotions) `#5a3f2c`/`#5B3A28` → champagne `--gold-1`; recent-intention text `#6E4631` →
    champagne; stat figures `.pf-stat .pf-n` rose-4 → `--accent` (matches Progress). (The `.pf-stat` tiles
    themselves already velvet via `--cream` remap.)
  - **Settings:** the name input `.nameinput` (`#FFFCF7` → velvet, gilt focus); the reminder lead chips
    `.lead-chip` (citrus-light → velvet); the **Export/Import** backup buttons carry an INLINE `--rose-1` bg,
    so overridden with `!important` → velvet + gilt.
  - **Cycle opt-in (cycle.js injected CSS):** the "Track your cycle" card `.cy-tg` (`#fff` → velvet), its
    label/hint → champagne/taupe, the OFF switch track (`#D9CEBA` → velvet `#5a3247`), and the Calendar
    `.cy-setup-link` access pill (rose-0/1 → gilt wash).
- **Remaining (all): v142 QA only** — axe contrast on velvet, regenerate the `@visual` Playwright baselines
  (design-locked flower + bottom bar changed), run e2e + prod smoke, Ines's real-Android pass; then promote
  (`index.html` + bump `sw.js` CACHE). Tiny cosmetic leftovers acceptable for now: the small rose "+"/"Add"
  action pills (`.leadadd button`, tag/area `+`) stay rose on velvet (readable accents). `--rose-1..4` LOCKED;
  flower coords untouched throughout.

## Changelog (v138) — Luxe revamp Faza 5 (part 1): the 5 secondary views themed dark (5 agents + JS)

- **v138 — Journal, Respiro, Calendar, Progress, Projects all theme in dark.** Third agent-assisted slice:
  the Team Leader generated a dark screenshot of each view, ran 5 worker agents in parallel (one per view,
  each SEEING its screenshot + grepping the CSS), then integrated all 5 proposals + 2 cross-cutting JS fixes +
  filled gaps. Validated: div 213/213, `node --check` OK on all 3 scripts; dark screenshots of all 5 views +
  a light spot-check (no regression).
  - **Cross-cutting JS (theme-aware):** (a) `paleTint(hex,amount)` now mixes the area color toward **velvet
    `#3c1528` in dark** (was always cream) with a touch more saturation — so the slot **time pills** + any
    area-tinted element read on velvet; (b) `applyJWash()` uses a much lower alpha in dark (mood "light" cue
    becomes a faint glow, not a wash-out); (c) `toggleTheme()` now **re-renders the active view** so those
    inline tints recompute live on toggle.
  - **Journal:** writing card `.jwrite-card` cream→velvet + gilt hairline; champagne placeholders; event
    underline gilt; prompt/4F link/permission-pause card/emotion-wheel sub-chips/routing chip → velvet/accent.
  - **Respiro:** the load-bearing fix = the `body.calm-mode` LIGHT wash (`!important`) is overridden to velvet
    in dark (`html[data-theme="dark"] body.calm-mode{…!important}`); cue line, the "Wake me up" energy pill,
    the player overlay + breath label + scan word → velvet/champagne; exercise cards keep their functional
    left-border accents.
  - **Calendar:** lens toggle `.callens` cream→velvet, selected tab accent; the month-nav `‹ ›` chips
    (`.calnav button:not(.calTodayBtn)`) cream→velvet+gilt (Team-Leader gap-fill — agent missed them); plan-ring
    track → gilt; `.cell.full` mint→velvet; day-popup mood label → champagne; cycle moon disc + ribbon (opt-in,
    hidden by default — CSS attempt, verify when cycle enabled).
  - **Progress:** the 3 stat tiles `.scard` cream→velvet+gilt hairline, figures → `--accent` (rose that reads
    on velvet); streak chip + balance-bar track → velvet/gilt.
  - **Projects:** empty-state idea chips `.pe-chip` pale-rose→velvet+gilt (out-specifies the `calm-mode`
    override); item tick/focus surfaces/link input → velvet.
  - **Shared gap-fill:** the hero back button `.hsec-back` (white circle on every secondary view) → velvet+gilt.
- **Still deferred:** Profile/Settings (v139 — Profile's `.scard` tiles are `#view-stats`-scoped so still light;
  the journey/recent cards need theming). The cycle moon-disc dark CSS selector is best-effort (opt-in feature);
  native `<select>`/date/time OPEN popups are OS-themed (device pass). `--rose-1..4` LOCKED; flower coords
  untouched. Headless Chromium — device pass (axe contrast on velvet) stays Ines's step.

## Changelog (v137) — Luxe revamp Faza 4: cards & components dark theming (token remap + 5 agents)

- **v137 — the entire shared cards & components layer themes in dark.** Second agent-assisted slice, larger:
  the Team Leader laid a foundation, ran 5 worker agents on 5 DISJOINT component families in parallel, then
  integrated/reconciled/gated. Pure CSS (div 213/213, `node --check` OK on all 3 scripts; screenshots both
  themes — Home full + expanded composer + area picker).
  - **Foundation (token remap):** the `html[data-theme="dark"]` block now remaps the legacy neutral tokens to
    velvet/champagne — `--cream:var(--surface)`, `--sand:var(--surface-2)`, `--sand-deep:#3c1528`,
    `--ink:var(--text)`, `--ink-soft:var(--text-soft)`, `--page/-2`→velvet. Any component that already
    consumes those tokens themes for free; borders flip via `--line` (gilt). Light is unaffected (no remap in
    `:root`). This is the "components on the semantic tokens" core, done in ~6 lines.
  - **The gap = hardcoded light hexes** the remap can't touch (white pills, `#FFFBF4,#FCF5E9` card gradients,
    `--rose-0/1/4/5` states that vanish on velvet). 5 agents found + proposed fixes per family; integrated as
    one consolidated dark block placed last in `<style>` (source-order precedence):
    1. **Cards/panels:** `.panel`/`.progress-card`/`.datebar`/`.hero-day-card` → velvet + gilt hairline + champagne
       headings; `.segmented` selected pill gilded (was velvet-on-velvet invisible); date-band nav chips velvet.
    2. **Composer (`#composer`):** velvet shell + gilt active border; title/placeholder champagne; area/tag
       chips + duration chips + time-preview pill → velvet/gilt; the inline AREA PICKER options → velvet with
       champagne text (the colored area dot stays); `#addBtn` commit → GILT GOLD with `#3A1020` glyph.
    3. **Slots + inline editor + empty state:** `.block`/`.block.done` cream gradients → velvet; tick/time/dur/
       play, the editor selects/move-pills → velvet fields + gilt hairlines. (Empty state was just text, not a
       card — themes via remap.)
    4. **Shortcuts:** `.scpill` white→velvet, gilt icons; `.scp-plus`/`.scp-x`/`.addnew`/`.chip-add`/
       `.sc-edit-btn`/`.sc-form` → gilt/accent.
    5. **Shared controls:** `#fff` focus-flash inputs → velvet; `.testbtn`, `.toggle` (ON gold-ring lifted to
       gilt, OFF track + champagne knob), `.filtertoggle.active`, generic `.chip:not(.scpill)`, `.focus-btn`,
       journal `.exp-btn` → gilt.
  - **Team-Leader reconciliation:** disjoint selector families (no `!important` battles); verified anchors +
    specificity (e.g. the transparent hero d3bar is protected from the `.datebar` card rule by the higher-
    specificity day-view rule); filled 2 gaps the agents flagged as out-of-their-scope (`.chip-add` card, the
    `.catpick .cp`/`.cp.sel` area-picker surface — forced the selected pill to a gilt wash, ignoring the
    cream `--ac-pale` inline var, via 2-ID specificity).
- **Honestly deferred to Faza 5 (v138+):** `paleTint` (JS) mixes area colors with CREAM → the slot time pill
  + selected area pill still show cream tints on velvet (readable but loud); fix = a theme-aware `paleTint`
  (mix toward velvet) in the per-view pass. Native select/date/time OPEN popups are OS-themed (device pass).
  Mood discs / calm / calendar cells / progress bars = per-view functional-color passes.
- **Honest limit:** headless Chromium — backdrop blur + the gilt actions + native pickers need Ines's device
  pass. `--rose-1..4` LOCKED; flower coords untouched.

## Changelog (v136) — Luxe revamp Faza 3: flower nav + bottom bar/FAB (velvet/gilt, agent-assisted)

- **v136 — the flower navigation + bottom bar/FAB re-skinned for both themes.** First **agent-assisted**
  slice: the Team Leader (main chat) ran TWO worker agents in parallel — one proposed the flower CSS, one the
  bottom-bar/FAB CSS — then verified the anchors + a specificity concern, integrated both, and ran the gate.
  Pure CSS (div 213/213, `node --check` OK on all 3 scripts; screenshots both themes, flower labels confirmed
  inside their petals).
  - **Flower (key finding):** petal fill/stroke/icon/word all route through **`.flower`-scoped CSS vars**
    (`--petal-cream/-mid/-edge/-active/-line`, `--pgold`, `--ptext` at ~line 985) that the inline SVG
    `<linearGradient>` stops + stroke read live — so a `html[data-theme="dark"] .flower {…}` override re-skins
    the petals to **velvet wine + gilt stroke + gold line-icons + champagne 9px words** with **NO JS and an
    instant runtime flip** (the mockup's JS shim isn't needed because the real app already uses `var()` in the
    gradient). The dark override MUST be `.flower`-scoped (a `:root` override is shadowed). Center disc →
    velvet/wine radial + gilt ring + candle-glow halo (box-shadow, no new div). Active states given
    champagne/gilt variants (the old `--rose-4` active is muddy on velvet). **Light flower unchanged** (blush
    rose = the mockup's light variant). **Geometry, label coords (l1 170/78 … l5 85/142), petalPath/petalFill
    markup, and the 5 icons are UNTOUCHED — only colors re-skinned. Words verified inside petals in both themes.**
  - **Bottom bar + FAB:** the FAB action recolored rose → **WINE `#6E1334`** in light (gilt ring, the locked
    light-action color) and **GILT GOLD** in dark (with a dark `#3A1020` "+" for contrast); the dark bar →
    velvet translucent (`rgba(58,20,38,.85)→#34101e`, blur); dark nav idle/hover → champagne/taupe via the
    semantic tokens, **nav-active → gold** (`--gold-gilt`). No `calm-mode` conflict (v54 already removed those
    bar/FAB overrides). Light bar otherwise unchanged.
- **Honest limit:** headless Chromium — the velvet-on-photo blur + the gilt FAB on a real device stay Ines's
  pass. `--rose-1..4` LOCKED. (The day cards/slots/composer below are still light — v137 themes them.)

## Changelog (v135) — Luxe revamp Faza 2: hero & brand (Ephesis "Día" + per-theme velvet)

- **v135 — the hero & brand luxe pass, the first proper per-view dark treatment.** Pure CSS (no markup/JS
  change; div 213/213, `node --check` OK on all 3 scripts; screenshots both themes at 412px). Changes:
  1. **"Día" → Ephesis gold signature script.** `.hero .brand h1 .brand-accent` re-styled from italic Fraunces
     to `font-family:'Ephesis'` at `1.3em`, painted with the gilt gradient `linear-gradient(100deg,#E8D2A0,
     #C8A24C 45%,#9A6E2C)` via `background-clip:text` (`-webkit-text-fill-color:transparent`). "Mi" stays
     Fraunces. Ephesis was loaded (unused) in v133 — now it earns its place. Applies in BOTH themes.
  2. **Gilt hairline frame** inside the hero photo (day view): `body[data-view="day"] .hero::after{inset:8px;
     border:1px solid rgba(200,162,76,.42);border-radius:20px;pointer-events:none}` — the mood-board's gold bar.
  3. **Gilt rule under the date band:** the day progress-bar TRACK recolored from a rose tint to a faint gilt
     `rgba(200,162,76,.24)` (the rose FILL stays — rose remains the action/progress color; gilt is metal only).
  4. **Per-theme dark hero** (`html[data-theme="dark"]` block): a STRONGER velvet veil (`--hero-veil`-style
     double gradient to `#2c0d1c`) + velvet photo-bottom fade so the bright bougainvillea photo doesn't wash
     out champagne text; brand `#F1E5D4`, phrase `#F4E7D6` + ro `#C9A99E` (with dark text-shadows), date
     champagne, prev/next velvet chips with gilt borders, count/`↩azi`/seed/langbar/theme-glyph in gilt, date
     track gilt. The bright photo legibility risk flagged in the plan is handled by the stronger veil.
- **Drop-cap DEFERRED (honest):** `renderHeader` builds the phrase as `"«"+p.es+"»"`, so `::first-letter`
  would style the `«` guillemet, not the first letter. Skipped rather than ship an ugly drop-cap; revisit by
  wrapping the first real letter in a span (small JS change) in a later polish.
- **Rough state:** the flower nav + day cards below the hero are still LIGHT on the velvet page (v136 re-skins
  the petals KEEPING geometry/label coords; v137 does cards). **Honest limit:** headless Chromium — the
  `background-clip:text` Ephesis gilt + backdrop-filter on velvet need the real-Android pass. Flower label
  coords untouched; `--rose-1..4` LOCKED.

## Changelog (v134) — Luxe revamp Faza 1: theme switcher plumbing (dark works rough)

- **v134 — Light/Dark switcher wired end-to-end.** Builds on the v133 token foundation. Validated
  (div 213/213, `node --check` OK on all 3 script blocks; screenshots both themes at 412px + an interactive
  toggle/persistence test). Changes:
  1. **`settings.theme`** (`"light"`|`"dark"`, default light) — added to the `settings` object (`loadSettings`
     reads it, `saveSettings` writes it). Because backup export already dumps the whole `settings` key, the
     theme rides along in backups for free; import re-applies it (`loadSettings`→`applyTheme`).
  2. **`<html data-theme>`** drives the palette. `applyTheme()` sets the attribute + the hero glyph (☾/☀) +
     the Settings toggle state; `toggleTheme()` flips, applies, saves. An **early inline `<head>` script**
     reads `localStorage.settings.theme` and sets `data-theme` BEFORE first paint (no flash on PWA; wrapped in
     try/catch so the Claude.ai sandbox just falls back to light).
  3. **Two switchers:** a discreet **☾/☀ glyph in the hero langbar** (`#themeToggle`, a compact gold glyph
     after RO with a thin gilt divider) + a **Settings "Aspect/Appearance" panel** with a "Dark theme" toggle
     (`#themeToggleSet`). New i18n `appearance/dark_theme/theme_help/theme_toggle` (EN/ES/RO).
  4. **Rough dark baseline:** `html[data-theme="dark"] .phone` (and `body`) get the velvet `--bg` radial, so
     flipping the toggle visibly turns the page aubergine→night. Cards/hero/petals keep their LIGHT surfaces
     for now (readable) — full per-component velvet theming is v135+. Honest "rough", per the phase plan.
- **Bug found & fixed in-slice:** the langbar wiring did `#langBar.querySelectorAll("button").forEach(...)`,
  binding the language handler to EVERY button — including the new theme toggle — overwriting its `onclick`
  (so the hero toggle silently did nothing). Scoped it to `button[data-l]`. (The Settings toggle was never
  affected.) Caught by an interactive Playwright check, not by eyeballing.
- **Honest limit:** headless Chromium only — the early-paint theme apply on a real PWA install, plus
  blur/backdrop on the velvet, need the device pass. `--rose-1..4` LOCKED; flower coords untouched.

## Changelog (v133) — Luxe revamp Faza 0: theme foundation (zero visual change)

- **v133 — foundation tokens for the Light+Dark luxe revamp (first slice).** Purely additive scaffold; the
  app still renders exactly as v132 in light. Three edits, validated (div 210/210, `node --check` OK on both
  script blocks; screenshots in BOTH themes at 412px):
  1. **Ephesis loaded** — added `&family=Ephesis` to the Google Fonts `<link>`. The font is fetched but NOT
     yet referenced by any rule, so nothing changes; it's reserved for the "Día" gold script wordmark (v135).
     Fraunces/Nunito Sans untouched (no `ital` axis added yet — that's v135 too).
  2. **Metal accent tokens** added to `:root`: `--gold-1:#E8D2A0` (champagne), `--gold-gilt:#C8A24C`,
     `--gold-antique:#B8893F`, `--taupe-1:#C9A99E`, `--taupe-2:#A98A7E`, and `--gold-hair` (the signature
     gilt-hairline gradient `linear-gradient(100deg,#E8D2A0,#C8A24C 45%,#9A6E2C)`). `--gold-deep:#9A6E2C`
     already existed. `--rose-1..4` LOCKED, untouched.
  3. **Semantic theme tokens** introduced: `--bg / --surface / --surface-2 / --text / --text-soft / --line /
     --brand / --brand-ink / --accent`. **Light values in `:root` mapped to TODAY's values** (`--surface`=
     cream `#FFFCF7`, `--text`=ink `#3A2D21`, `--brand`/`--accent`=rose-4 `#B5495F`, `--line` kept at today's
     `#E6DBC4`, etc.) + an **`html[data-theme="dark"]` override block** with the dark-velvet values (`--bg`
     night `#250b15`, `--surface` velvet `#4A1A30`, `--text` champagne `#EFE2D0`, `--brand` gilt gold, …).
- **Why zero visual change:** no component rule consumes the semantic tokens yet (they're consumed from v135),
  and the dark block only activates when `data-theme="dark"` is set on `<html>` (v134 plumbing). Verified:
  v133 light is **pixel-identical** to v132 light, AND v133 forced to `data-theme="dark"` renders identically
  too — proving the dark override is defined-but-inert. The flower labels all stay inside their petals.
- **Honest limit:** headless Chromium only. The real Ephesis render + the dark theme proper land in v134/v135;
  device QA stays Ines's step. **Default theme decision = LIGHT** (first launch; returning users keep
  `settings.theme`) — the last open revamp decision, now closed.

## Changelog (v132) — Journal: olive branch removed + caret-follow scroll (public-release polish)

- **v132 — Journal de-clutter (Ines's call) + a real typing-visibility fix.** Two changes, validated
  (div 210/210, `node --check` OK on both script blocks):
  1. **Olive branch removed.** Ines found the journal page **too cluttered**, so the v130/v131 draping
     olive branch was dropped: removed the `#view-journal .jwrite-card::after` rule and the now-unused
     `:root` var **`--olive-tall`** (a ~168KB base64 PNG) → the file dropped **~640KB → ~468KB** (~26%
     smaller). `.jtext` gutter restored from `padding:6px 46px 6px 8px` to symmetric `6px 8px` (text uses
     the full width). The writing card is now a clean cream surface.
  2. **Caret-follow scroll while typing (bug fix).** The textarea auto-grows with NO internal scrollbar
     (v131 `growJ`), so when an entry grew past the viewport the line being written slid **behind the
     fixed bottom bar** — you couldn't see what you were typing (reproduced in Playwright: caret line
     bottom 737px vs bar top 656px). Fix: new `jCaretTop()` (hidden mirror div that matches the
     textarea's wrapping → caret Y) + `keepJCaretVisible()` (scrolls so the caret line stays a full line
     above the bottom bar), wired into the `#jText` input + `#jPrompt`/`#j4f` insert handlers (NOT on
     load). Two subtleties found via the repro test: (a) `scrollBy({behavior:"auto"})` defers to CSS
     `scroll-behavior:smooth` and lagged behind fast typing → use **`"instant"`**; (b) `.phone-scroll`
     is **not always the scroller** (in some layouts the window scrolls) → new `jScrollParent()` walks up
     to the element that actually scrolls (scrollHeight>clientHeight), falling back to the window. Verified
     green: caret line now lands at 620px, comfortably above the 656px bar; last typed word + footer visible.
- **Repo made PUBLIC + polished** (separate from the app change, same session): security-audited (no
  secrets in tree or history), monetization roadmap + design mockups moved to a gitignored `private/`
  and purged from git history, README rewritten as an engineering/QA showcase + screenshots, CC BY-NC 4.0
  LICENSE added, CI workflows hardened (`permissions: contents: read`), 12 stale remote branches deleted.
- Headless Chromium only — re-confirm the caret-follow scroll on real Android (native keyboard + the
  fixed bottom bar) in the device QA pass.

## Backlog (v129 → v130)

- `[x]` **PROMOTE v125:** copy `mi-dia-v125.html` → `index.html` + bump `CACHE` in `sw.js` (done at deploy).
- `[x]` **Journal olive accent — DONE (v129):** small olive sprig in the writing-card top-right corner,
  chroma-keyed transparent, no text overlap; prompt restyled subtle.
- `[ ]` **Real Android QA on v125–v129:** mood-wash intensity + the olive corner on a real screen.

## Add flow — CURRENT (v112+ unified composer, supersedes the v23–v47 title-first flow)

The day-tab add area was rebuilt in **v112** and refined through **v119**. It now has two stacked blocks: a **Shortcuts** block, then a **Composer**.

**Composer (one capture field that grows):**
- Resting state = a single line: a title input ("What do you want to do today?") + a rose **"+"** commit button.
- It **expands when you START TYPING** (not on focus — Ines's call). The reveal shows, on **one row**, three chips: **Oră · Arie · Etichetă**, plus a live **start–end preview** pill, then a **Durată** quick-chip row.
- **Commit:** the "+" button OR **Enter**. Fast path = type a title + Enter with nothing else = an untimed slot (preserves quick capture). After commit the composer resets and collapses.
- **Oră = native OS clock.** The "oră" chip is a styled `<label>` with a transparent `<input type="time">` overlaid on top (`.oraField`/`.oraInput`, opacity:0, inset:0). This opens the real Android/iOS time wheel reliably — `showPicker()` was unreliable on Ines's device. The 24h value maps straight to `addTime`. The **same `makeNativeTime()` helper is reused in the slot editor** (replaced the old custom `makeTimePicker`, now removed).
- **Arie chip** toggles the existing `#catpick` inline; selecting an area updates the chip label+dot (`refreshAreaChip`). **Etichetă chip** toggles `#inTagChips` inline; the chip shows a count (`refreshTagChip`). Both reuse the pre-existing `selCat` / `selTags` state and `addFromForm`.
- **Durată = quick-chips** 15/30/45/60/90 (`buildDurRow`/`setDurSel` → hidden `#inDur`), default **30**.
- Compaction (v119): `#inTimeWrap` was stretching full-width and pushing area/tag to a 2nd row; pinned to content width so all three chips share one row. Composer height ~196px → ~160px.

**Shortcuts block (above the composer):**
- A **neat 2-column grid** of compact pills (v115). Each pill = **tap body** (pre-fills the composer: title + area + duration, then focuses the title) **+ a visible "+"** (instant add, untimed — replaced the old, undiscoverable long-press).
- **✎** (top-right of the block) toggles edit mode → each pill shows **✕** (two-tap delete). "**+ Adaugă o scurtătură**" opens an inline editor (name + area + min).
- **3 curated defaults** (Coaching · 4F reflection · Movement). A one-time migration (`sc_default3_v117`) resets any device's persisted shortcut list to these 3 once, so older installs that had the legacy 7 collapse to 3.
- Hint line under the grid: "tap: pre-fill · '+': add instantly".

**Slot rendering** unchanged in spirit: a timed slot shows its full **start–end range** on its own line above the title, tinted with the Arie color; overlapping intervals still cluster into side-by-side columns (see v33 note).

**Dead code removed (v113):** `quickAdd`, `toggleAddForm`, and the legacy `makeTimePicker` — all unused after the composer landed.

## Architecture direction (since v98)

- **No big-bang rewrite of the ~4300-line file.** Instead, new features are built as **self-contained modules** following a clean 5-layer pattern (DATA / CALC / I18N / VIEW / WIRING), readable top-to-bottom by a new developer, with **pure, unit-testable calc functions** and no hidden dependencies.
- The cycle module exposes a small public API to the host app: `init`, `refresh`, `openSettings`, **`isMenstrualDay(date)`** (sync, used by the calendar grid), and **`onChange(fn)`** (host registers a callback so the month grid re-renders live after a log). It keeps a synchronous `_cfgCache` updated on every `refresh`.
- Reference modules: **`cycle.js`** and **`persist.js`** (each a single IIFE, portable `window.storage || localStorage`, own i18n, injects own CSS, mounts via a few clearly-marked anchors + one `init()` call).
- **Incremental migration plan:** apply the same module pattern to the remaining views one slice at a time (Store→Data layer, then per-view render modules, then extract pure calc). No rush; the app keeps working throughout.
- **Validation chain (this environment):** Python div-balance check → `node --check` on each `<script>` block → Playwright/Chromium headless screenshots at 412px. Mermaid data-flow diagrams (`diag-dataflow`, `diag-cycle-mood`) document how one input feeds many screens. **Headless ≠ real Android** — device pass (QA checklist) is still required and remains Ines's step.

## Gender-neutrality decision (v106, research-grounded)

- Cycle is **opt-in, not gender-gated.** Rationale: gating would require asking gender at signup (UX best practice: ask only if needed, make optional, inclusive); gender doesn't predict who wants the feature; major platforms (Apple/Samsung Health) ship cycle tracking as an opt-in module. Opt-in default-OFF keeps the app neutral; moving cycle off Home removes the second flower. "Too feminine" is also a visual-design signal (color/typography/florals) — optional future lever: temper rose toward terracotta/olive/gold for broader reach (Ines's call, not done).
