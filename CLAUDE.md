# Mi Día — Project Context for Claude (canonical filename: CLAUDE.md)

> **Authoritative spec. Read this first, every session, before any work.**
> Last updated: June 2026 · Current latest build: **`mi-dia-v127.html`**

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

## File / versioning workflow (IMPORTANT)

- The app lives in **versioned files: `mi-dia-vNN.html`**. Each change increments `NN`.
- **Current latest = `mi-dia-v127.html`.** Always start from the latest version.
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
- Current coverage (**20 tests**): **smoke** (`smoke.spec.js`) + **navigation** (`navigation.spec.js`)
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
  seeded daily intentions surfacing in "recent intentions").
- The Calendar/Progress suites are **data-driven via `seedStorage`** + the `dayKey()` helper (writes
  `day:<key>` / `journal:<key>` exactly as `keyFor` does). None of these four suites needed app changes.
- The journal + persistence/i18n + slot suites needed NO app changes — pure user-facing locators (mood
  discs use their i18n aria-labels; wheel/pause/slot chips reached structurally within their containers).
- **Open a11y gap (found while testing, NOT yet fixed):** the slot **done tick** (a `<div>`) and the
  **time pill** (a `<span>`) have NO accessible name — a screen-reader user can't tell what they do.
  Instrumenting them like v126 (role="button" + i18n aria-label, set in `blockEl`) would fix the a11y
  AND let `slot-interactions.spec.js` use `getByRole` instead of `.tick`/`.time` structural locators.
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
> (v96), sun cue icon + Calendar emotion dot (v97).** Cycle/Respiro/persistence arc COMPLETE (v98–v110). Add-flow redesign + in-app start-time memento arc COMPLETE (v112–v119). Calendar redesign + Journal redesign arc COMPLETE (v120–v125). Test instrumentation + a11y aria-label fix (v126). Current build **`mi-dia-v126.html`**.
> Remaining: B6 (duration "min" clipping), B8 (long-press on real Android); real-device validation on
> Android Chrome (backlog C — petal hit-test, fixed bottom bar + safe-area, larger hero photo, "N/N done"
> readability, name greeting + recent lists, the Calm toggle + energizer player, **body-scan tone/voice**,
> the permission-pause + wheel flow, Calendar emotion dot); **B6 duration "min" clip (open — needs Ines to pinpoint the screen)**; D13 menstrual cycle
> tracker, D14 public/subscription version.


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

## Backlog (v127 → v128)

- `[x]` **PROMOTE v125:** copy `mi-dia-v125.html` → `index.html` + bump `CACHE` in `sw.js` (done at deploy).
- `[ ]` **Journal — IN PROGRESS** (approved mockup: `mi-dia-jsol2.html`): drop the separate olive ribbon;
  put the olives as a **FRAME** in the writing card (cutouts from the right of OliveDetails, chroma-keyed
  to transparent, small top-right/bottom-right corner accents that FRAME, not crowd); placeholder = the
  original `ph_journal` text; move "+ reflecție ghidată" + Word/PDF export into a subtle row BELOW the
  card. → becomes **v128** (shifted: v126 = a11y/test instrumentation, v127 = composer test instrumentation).
- `[ ]` **Real Android QA on v125–v127:** mood-wash intensity + olive accents on a real screen.

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
