# App reference

How the app behaves today, at the level of detail needed to change it: the versioning workflow, the
i18n system, the implemented features, the current add flow, and the decisions that constrain new
work.

For what the app *is*, read the [README](../README.md). For where data lives, read
[`DATA_SCHEMA.md`](DATA_SCHEMA.md). For colour, radius and typography, read
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). For history, read [`history/BUILD-LOG.md`](history/BUILD-LOG.md).

---

## File / versioning workflow (IMPORTANT)

- The app lives in **versioned files: `mi-dia-vNN.html`**. Each change increments `NN`.
- **Which one is latest is not written down here.** Read it from the repo: `index.html` is a copy of
  the promoted build, and `sw.js` carries the matching `CACHE` name. Always start from the latest.
- **Strict rule: every new code file gets a NEW name.** Never overwrite an existing
  version in place — each iteration is a separate rollback point. (One change → one new file.)
- **Working tree keeps ONLY the latest official `mi-dia-vNN.html` + `index.html`** (Ines's call,
  June 2026 — keeps VS Code uncluttered). Older `mi-dia-vNN.html` files are **pruned from the working
  tree but preserved in Git history** — recover any with `git show <commit>:mi-dia-vNN.html`. So Git
  history (not a pile of files in the folder) is the rollback archive. When promoting a new build,
  `git rm` the previous `mi-dia-vNN.html` after the new one is committed.
- The older `index.html` + Python base64-icon-sync workflow is **SUPERSEDED — do not use it.**
- This file is updated in place, not versioned. Only the app is versioned. If a tool ever regenerates
  it under a second name, merge it back and delete the duplicate — two spec files is how they start
  disagreeing.

**Deployment + infra files (do NOT delete as "single-file violations"):**
- The app is deployed on **Cloudflare Pages** (primary), auto-deploying from GitHub `main` on every
  push. Live site: **`mi-dia-app.pages.dev`**. (We moved off Netlify after its free tier hit a
  bandwidth limit; the old `netlify.toml` fallback config was removed 2026-07-29 as unused.)
- **The promoted build is `index.html`** (a copy of the latest `mi-dia-vNN.html`). `index.html` is the
  universal filename every static host serves at `/` automatically — so NO root rewrite is needed on
  any host. (A root rewrite to a named html file fought Cloudflare's automatic clean-URL handling and
  caused a 308 loop / 522 — that is why the promoted file is `index.html` and nothing else.)
- Infra files in `public/` are intentional (NOT part of the single-file app), and must sit at the
  root of the build output directory because that is where Cloudflare reads them:
  - **`_redirects`** — Cloudflare Pages redirects (Netlify syntax): hides old `/mi-dia-*` builds → `/`.
  - **`sw.js`** — the PWA service worker (offline). A service worker MUST be a separate same-origin
    file (browsers block inline/data-URI SW), so this is a deliberate exception to "single file".
    The app HTML itself stays one self-contained file; the manifest is inline (data URI).
  - Bump the `CACHE` constant in `sw.js` on each new build so old caches clear on activate.

**Test harness (dev-only — NOT a single-file violation):**
- **Playwright e2e tests** are a fully self-contained project in **`quality/e2e/`** (`package.json`,
  `playwright.config.js`, `node_modules/`, `tests/`). It lives under `quality/`, with the performance,
  security and eval harnesses, so that one folder answers "how is this verified?" and no test tooling
  competes for attention with the product.
  This is a separate dev-only concern; the "no npm/build tooling/backend" rule applies to the APP, not
  to test tooling. `quality/e2e/node_modules/` and Playwright outputs (`quality/e2e/test-results/`,
  `quality/e2e/playwright-report/`) are gitignored — only `quality/e2e/package.json`, `quality/e2e/playwright.config.js`, and
  `quality/e2e/tests/` are committed. The app stays one self-contained HTML file at root (so Cloudflare Pages
  keeps serving `index.html` + `sw.js` from `/` — the app dir was deliberately NOT moved).
- Config serves the repo **parent dir (`..`)** over http via `http-server` (so root `index.html` + the
  service worker behave like production) and runs in a **mobile Chromium** viewport (Pixel 5) because
  the app is phone-first.
- Run (from `quality/e2e/`): `npm test` · HTML report: `npm run test:report`, merged across shards
  with `npm run test:merge` · record new flows: `npm run codegen`. Watch live: `npm run test:watch`
  (headed) /
  `npm run test:ui`. Shard across CI machines: `--shard=i/n` (see `.github/workflows/e2e.yml`).
- **Evidence:** config sets `screenshot:'on'`, so every run captures a screenshot of each test's final
  state (pass or fail) — browsable in the HTML report at `quality/e2e/playwright-report/index.html` (open via
  `npm run test:report`); raw PNGs land in `quality/e2e/test-results/<test>/test-finished-*.png`. Identical
  frames are content-deduped (e.g. several nav tests end on the Day view → one shared image). Trace +
  video are retained on failure. All of `playwright-report/`, `test-results/` are gitignored.
- Current coverage (**85 tests across 20 specs** — 83 functional + 2 `@visual`): **rituals** (`ritual.spec.js`,
  v155/v156 — the Home section + check/streak, "check marks TODAY not the viewed day", the creation sheet
  suggestion-chip / written + habit-stacking `cue.type`, never-miss-twice, the Progress history block +
  tappable-cell backfill, backup export/import roundtrip incl. `rituals`, RO relabel, **v156: Edit-mode
  two-tap delete + tap-a-card-to-edit-in-place**) + **onboarding**
  (`onboarding.spec.js`, v155 — fresh-launch overlay, Skip marks `settings.onboarded` + doesn't return,
  identity chip writes `settings.identity`, Back nav, the "Create your first ritual" CTA drops into the sheet,
  returning-user boots clean + re-run from Settings) + **smoke** (`smoke.spec.js`) + **navigation** (`navigation.spec.js`)
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
  shards). **Test-independence (anti-bias):** `quality/e2e/SPEC-TEMPLATE.md` drives a 2-isolated-agent flow — an
  *implementer* (app code) and a *tester* (black-box Playwright from the spec only) never see each other's
  code; they meet at the written contract (acceptance criteria + stable selector handles).
- **Post-deploy smoke (prod, v131):** a SEPARATE workflow `.github/workflows/smoke-prod.yml` runs on
  push to `main` (i.e. AFTER a merge). It first waits for Cloudflare to publish the new build
  (`quality/e2e/wait-for-deploy.js` polls the LIVE `/sw.js` until its `CACHE` matches the just-merged
  `sw.js`, 5-min timeout), then runs a 7-test Playwright smoke against the LIVE site
  `https://mi-dia-app.pages.dev` (`quality/e2e/playwright.prod.config.js` → `quality/e2e/tests-prod/smoke-prod.spec.js`:
  home boots on the Day view + brand + no real console errors AND no same-origin 404s; `/sw.js` served
  with a `mi-dia-` cache; the PWA manifest is linked; **all 7 views render** without console errors
  (Day/Journal/Respiro/Calendar/Progress/Projects/Profile); the 5 flower petals present; the Journal
  opens + writing card ready; switching EN→RO relabels the nav (i18n)). It is **informational only**
  (post-merge, never gates a PR), is **separate from `e2e.yml`** (which tests the local build before
  merge) and from the Cloudflare deploy itself, and is **read-only** (never writes user data). Run on
  demand from the Actions tab (`workflow_dispatch`) or locally: `cd quality/e2e && npm run wait:deploy &&
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
  name "Back to home"). `Store` falls back to `localStorage` in a plain browser, so `quality/e2e/tests/helpers.js`
  `seedStorage()` can preset state before load.
- **Honest limit:** headless Chromium ≠ real Android — native time pickers (`<input type=time>`),
  blur/backdrop-filter, fonts and touch gestures stay MANUAL QA (backlog C/F). Playwright covers
  logic/DOM/navigation/persistence/i18n.

> **PWA checklist for each new build:** the app HTML must contain (a) `<link rel="manifest" ...>`
> (inline data URI) and (b) a `<script>` registering `/sw.js`. If a new web-Claude build dropped
> them (it happened on the v49–v55 line), port them on before deploying. v56+ through v89 have them.

---

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
- **Respiro tab (renamed from "Calm" in v101 — petal label + hero title now "Respiro", RO/ES/EN):** 5 guided breathing patterns + 8 body exercises, medical disclaimer. Hosts BOTH calming and energizing content via the Calmează-mă/Trezește-mă toggle (energizer arc v90–v97).
  **Breathwork/education arc (v169→v172):** each exercise card shows a **purpose tag** (Varianta C — Calmare rapida / Echilibru / Inainte de somn / Liniste blanda / etc., colored by family via `PCFAM`), and the player has a **„De ce merita?"** collapsible note (Varianta B — a positive „De ce" + a research line + a short source; honest by restraint, NO overclaiming). The somatic sub-segment is now **„Corp"** (the phrase „nerv vag"/vagus was removed app-wide — polyvagal theory is contested 2025; we describe what you feel, not a „reset"). **Adjustable players** via an optional `tune` field on breath practices: **Respiratie de rezonanta** (`coh`, ex-„coerenta") has Ritm (5/5,5/6 breaths-min) + Durata (5/10/15 min, default 5) selectors (`effectivePattern`/`buildBreathSeg`); **Suspinul** has an Acum/5-min dual mode; **Bâzâit/hooming** was converted from a static somatic card into a **guided breath player** (inhale → hummed exhale). **PMR (Relaxare musculara progresiva)** = a new body technique with the strongest evidence (meta-analysis of 31 RCTs), scan-type (tense→release across 6 muscle groups, reuses `startScan`), leads the Corp section. **Finder „Gaseste-ti ritmul"** = a featured card in the Breathing grid that tests 3 slow paces and saves your `settings.resonancePace`, then preselects it at resonance. Energizing safety gate strengthened (sit, stop if dizzy, pregnancy/condition note).
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
- **Ritualuri — Atomic Habits (v145→v155, `ritual.js`, inlined module):** a "Ritualurile mele" section on
  Home — recurring identity habits with a **streak DERIVED from `log`** (never stored). Each card = line-art
  icon + per-ritual accent + the 2-min version + 7-day dots + a **check** (celebration + chime + "+1 vote:
  <identity>"). A **creation sheet** (bottom-sheet): suggestion chip (2 taps) / written + **habit stacking**
  ("After a ritual") + native time + area. **Never-miss-twice** (warm terracotta state when you missed the
  prior day) + **long-press = the 2-min version**. **Identity** (`settings.identity`, the vote engine) shown
  as a keepsake **card on Home** (tap → edit) with "N votes today". **Seed** 2 gentle defaults on first run.
  **Progress** block: current streak + record + a 28-day mini-calendar whose **cells are tappable to backfill**
  a forgotten day. Checking always marks **TODAY** (not the day-nav's viewed day). Backup includes `rituals`.
  **Manage (v156):** an "Edit" toggle (`.r-editbtn`) turns each card into a **two-tap delete** (`.r-del`,
  terracotta) — works on ANY ritual, default or custom (fixes the "can't delete the seeded ones" frustration
  Ines flagged) — + **tap a card body = edit** (reopens the creation sheet prefilled via `openEdit`, `commit`
  updates in place; id + log + streak preserved). New i18n `rit_edit`/`rit_del_confirm`/`rit_updated` etc.
- **Onboarding ghidat (v150→v155, `onboard.js`, inlined module):** a luxe 6-step carousel for a new user
  (`settings.onboarded`, re-runnable from Settings): welcome + language → "Who do you want to become?"
  (identity) → the day's plan (real input) → **the Flower step = a poem** (RO/ES/EN) under the real line-art
  flower with a candle-glow seed → rituals + "Create your first ritual" (drops into the sheet) → keep it safe.
  Skip + Back; `prefers-reduced-motion` respected.
- **Back navigation (v49):** every secondary view (Jurnal/Calm/Calendar/Progres/Proiecte/Profil) has a
  `← Acasă/Inicio/Home` pill at the top that returns to the Day view.
- **Intenția zilei (v38; popup-only since v68 area):** per-day intention set from the flower centre via a
  free-text popup (no suggestion chips, no header question); RO/ES/EN.
- **Quick-add "bloom" (v38):** the bottom `+` blooms into Notă / Activitate / Stare (route to existing flows).
- **3-language i18n** (EN/ES/RO) across the whole app.
- **PWA (real, v56+ through v89):** installable web app manifest (inline data URI) + a service worker
  (`sw.js`) for offline. Add-to-Home-Screen, standalone display, app icon. JSON export/import
  backup (now includes `intent:` AND `cycle` keys — fixed in v101).
- **Persistence module (v102, inlined — no standalone source file remains):** gentle Home banner that reminds to back up (or to install
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

---

## Style / tone & What NOT to do

- Mediterranean, warm, mobile-first (Chrome on Android), calm — not overwhelming.
- Target user: women wanting structure + reflection + wellness in one place.
- Do NOT: split into multiple files; add build tooling/npm/bundler/backend; rewrite large
  sections when a targeted edit works; leave untranslated strings; skip validation; reuse a
  previous filename.

---

---

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

---

## Architecture direction (since v98)

- **No big-bang rewrite of the ~4300-line file.** Instead, new features are built as **self-contained modules** following a clean 5-layer pattern (DATA / CALC / I18N / VIEW / WIRING), readable top-to-bottom by a new developer, with **pure, unit-testable calc functions** and no hidden dependencies.
- The cycle module exposes a small public API to the host app: `init`, `refresh`, `openSettings`, **`isMenstrualDay(date)`** (sync, used by the calendar grid), and **`onChange(fn)`** (host registers a callback so the month grid re-renders live after a log). It keeps a synchronous `_cfgCache` updated on every `refresh`.
- Reference modules: **`cycle.js`**, **`ritual.js`** (v145+, Ritualuri) and **`onboard.js`**
  (v150+, guided onboarding) — each a clean source file at root mirroring the block INLINED into the app.
  The persistence module (v102) followed the same pattern but its standalone file was dropped; it now
  lives only inlined. `cycle.js` is fully self-contained (portable `window.storage||localStorage`, own i18n/CSS).
  `ritual.js`/`onboard.js` are inlined INSIDE the main IIFE so they reuse host globals (`Store`, `cur`, `t`,
  `esc`, `toast`, `chime`, `makeNativeTime`, `settings`); each injects its own CSS + mounts via anchors +
  one `init()` (Ritual) / `maybeRun()` (Onboard). Cardurile/onboarding folosesc DOAR tokens → temă automată.
- **Incremental migration plan:** apply the same module pattern to the remaining views one slice at a time (Store→Data layer, then per-view render modules, then extract pure calc). No rush; the app keeps working throughout.
- **Validation chain (this environment):** Python div-balance check → `node --check` on each `<script>` block → Playwright/Chromium headless screenshots at 412px. Mermaid data-flow diagrams (`diag-dataflow`, `diag-cycle-mood`) document how one input feeds many screens. **Headless ≠ real Android** — device pass (QA checklist) is still required and remains Ines's step.

---

## Gender-neutrality decision (v106, research-grounded)

- Cycle is **opt-in, not gender-gated.** Rationale: gating would require asking gender at signup (UX best practice: ask only if needed, make optional, inclusive); gender doesn't predict who wants the feature; major platforms (Apple/Samsung Health) ship cycle tracking as an opt-in module. Opt-in default-OFF keeps the app neutral; moving cycle off Home removes the second flower. "Too feminine" is also a visual-design signal (color/typography/florals) — optional future lever: temper rose toward terracotta/olive/gold for broader reach (Ines's call, not done).
