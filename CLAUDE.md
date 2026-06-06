# Mi Día — Project Context for Claude (CLAUDE_v2.md)

> **Authoritative spec. Read this first, every session, before any work.**
> Last updated: June 2026 · Current latest build: **`mi-dia-v48.html`**

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
- **Current latest = `mi-dia-v48.html`.** Always start from the latest version.
- **Strict rule: every new code file gets a NEW name.** Never overwrite an existing
  version in place — each iteration is a separate rollback point. (One change → one new file.)
- The older `index.html` + Python base64-icon-sync workflow is **SUPERSEDED — do not use it.**
- This spec file is `CLAUDE_v2.md` (the living doc, updated in place — not versioned).

**Deployment + infra files (do NOT delete as "single-file violations"):**
- The app is deployed on **Netlify**, auto-deploying from GitHub `main` on every push.
  Live site: **`mi-diaa.netlify.app`** (serves the promoted `mi-dia.html` at root).
- Two infra files live in the repo root and are intentional (NOT part of the single-file app):
  - **`netlify.toml`** — no build step; serves `mi-dia.html` at `/` (200 rewrite); redirects old
    `/mi-dia-vNN.html` → `/` (301) so only the latest is publicly reachable.
  - **`sw.js`** — the PWA service worker (offline). A service worker MUST be a separate same-origin
    file (browsers block inline/data-URI SW), so this is a deliberate exception to "single file".
    The app HTML itself stays one self-contained file; the manifest is inline (data URI).
  - Bump the `CACHE` constant in `sw.js` on each new build so old caches clear on activate.

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
--rose-1:#F4BFC4   --rose-2:#E58699   --rose-3:#D15E78   --rose-4:#B5495F
```

- Rose is the **single action/brand color** across all tabs: AZI/TODAY button, `+ Adaugă`
  commit button, progress bars, JURNAL flower center, Calm accents, time-range preview pill.
- Terracotta/gold are **removed from action buttons** (gold survives only as a soft decorative
  accent, e.g. petal icons, the panel flower glyph, the ✎ edit button).
- **Category ("Arie"), tag, Calm-exercise colors, and green=done stay non-rose (functional).**
- Typography: **Fraunces** (serif display, brand/headers) + **Nunito** (sans, body/labels).
- Aesthetic goals: homogeneity, flow, naturalness, simplicity, femininity, gentleness
  (omogenitate, fluență, naturalețe, simplitate, feminitate, blândețe). Calm, not overwhelming.

**Layout shell:** phone-frame; HERO (bougainvillea header photo, brand, daily phrase ES+local,
date/progress band) → radial **flower navigation** → day panel (`.daypad`). Bottom bar present.
The HERO is a rounded panel (`.hero`) with the photo + a fade veil. The date/progress sit inside a
**discreet card** (`.hero-day-card`, softened in v47): **no border**, light translucent fill
(`rgba(255,251,243,.42)`), very soft shadow, blur — kept deliberately subtle so it blends into the
header instead of looking like a panel "stuck on top". Do not re-add a hard border / heavy shadow.

**Navigation architecture (redesigned in v38 — resolves the old dual-nav root cause):**
The flower and the bottom bar used to overlap (Jurnal + Calm appeared in both; the centre FAB
duplicated Acasă). Now there is ONE primary navigation:
- **Flower = the single primary navigation**, with **5 petals at 72°**: Jurnal (top), Calm,
  Calendar, Progres, Proiecte. Petals keep `data-v` and the `.tab` wiring (`setView`).
- **Flower CENTRE = "Intenția zilei"** (an ACTION, not a view): `#intentionBtn` opens a modal
  (`#intentModal`) with a text input + per-language suggestion chips + Salvează/Anulează. The
  intention is stored per day and shown in the centre as italic Fraunces (`#intentionWord`).
- **Bottom bar = 3 non-overlapping items**: Acasă (`data-v="day"`) · **`+` (`#addFab`)** · Profil.
  The `+` is NOT a nav tab — it toggles a **"bloom" quick-add menu** (`#bloomMenu`) whose three
  petal-buds route to existing flows: **Notă** → Jurnal (focus `#jText`), **Activitate** → Day
  add form (focus `#inTitle`), **Stare** → Jurnal mood picker (`#mood`, gentle pulse). `+` rotates
  to `×` while open. Echoes the flower motif (something "blooms" both top and bottom).

> NOTE: there are two CSS layers in the file — a legacy block and a `REDESIGN OVERRIDE`
> (≈ line 670+) that wins via `!important`. Some duplicate/conflicting rules remain
> (e.g. `.datebar`, `.bar>i`). A future cleanup to a single source of truth is desirable,
> done carefully with screenshots.

**Key component classes (day panel):** `.add-commit` (full-width commit button),
`.time-preview` (+`.nx` next-day badge), `.minilabel` (ORĂ/ARIE/ETICHETE field headers),
`.btime` (time line above a slot title), `.cluster` (side-by-side overlap columns),
`.chiphint` (gesture hint under shortcuts). Per-block area-tint vars: `--cat-pale`,
`--cat-pale2` (via `paleTint(color, amount)` — mixes the area color with cream).

---

## Day tab — add flow & slot rendering (current, v23–v47)

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
- **Progress tab:** mood-productivity correlation, plain-language insight (statistical, not AI).
- **Calm tab:** 5 guided breathing patterns + 7 somatic/vagus exercises, medical disclaimer.
- **Journal, Projects.**
- **Intenția zilei (v38):** per-day intention set from the flower centre; suggestion chips; RO/ES/EN.
- **Quick-add "bloom" (v38):** the bottom `+` blooms into Notă / Activitate / Stare (route to existing flows).
- **3-language i18n** (EN/ES/RO) across the whole app.
- **PWA (real, v48):** installable web app manifest (inline data URI) + a service worker
  (`sw.js`) for offline. Add-to-Home-Screen, standalone display, app icon. JSON export/import
  backup (now includes `intent:` keys).

---

## To do / Backlog (planned in chat, June 2026)

Status legend: `[ ]` open · `[?]` your decision / depends on phone testing · `[~]` not yet audited by Claude.

**A. Design unity & cleanup (from the opening audit)**
- `[ ]` A1. Merge the two CSS layers into one source of truth — remove duplicate/conflicting
  rules (the two `:root` blocks, `.datebar`, `.bar>i`). Highest value for maintainability;
  do carefully, screenshot after each cut. *(Most aligned with the "unified design" goal.)*
- `[?]` A2. Gold/terracotta accents (active petal = terracotta, petal icons, ✎ button, `h2`
  flower glyph): intentional secondary accent or drift? Possibly unify active state to rose.
- `[ ]` A3. Consolidate spacing/shadow/radius tokens (`--radius`/`-lg`, `--shadow`/`-sm`/`-soft`).
- `[~]` A4. Consistency audit of the other tabs (Proiecte, Calm, Progres, Jurnal) — same panel
  style, headers, rose accents. Not yet inspected; may already be fine.
- `[~]` A5. Microcopy tone check across RO/ES/EN (warmth preserved, not just literal translation).

**B. Add-flow follow-ups (from this session's work)**
- `[ ]` B6. Fix the duration field clipping its placeholder ("mi" instead of "min") — too narrow.
- `[x]` B7. Default time: **KEPT** — 7:00 AM stays the real default (confirmed by Ines, through v47).
- `[?]` B8. Long-press discoverability: after phone testing, decide whether long-press stays or
  we add a more visible affordance (e.g. a small "+" on the shortcut card).
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

**D. Roadmap (larger, deferred)**
- `[ ]` D13. **Menstrual cycle tracker** (Calendar tab): cycle start dates; phases (menstrual,
  follicular, ovulatory, luteal) with explanations (hormones, energy, mood); correlate with the
  tracked mood/productivity data. **Write in all 3 languages from the start.** *(Major next feature.)*
- `[ ]` D14. Long-term: public/subscription version.

---

## Data model (localStorage)

- `blocks` (per day): `{ id, title, cat, time, dur, tags[], done, date }`
  - `time` = 24h string `"HH:MM"` or `""` (untimed); `dur` = minutes (0 = none).
- `cats` — categories/areas (≤8): `{ id, label, color }` (label = "Arie" in UI).
- `intent:YYYY-MM-DD` — the daily intention string (v38; `""` = none). Included in backup export.
- `tags`, `journal` `{date,mood,energy,text,prompt}`, `projects`, `settings` (incl. `lang`).

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
- **v48** — **Real PWA + first deploy.** Added a web app **manifest** (inline data URI: name,
  short_name, `start_url:"/"`, `scope:"/"`, `display:standalone`, theme/background colors, icons —
  reuses the existing 192px PNG + a new scalable rose-flower SVG, incl. a maskable variant) and a
  **service worker** (`sw.js`, network-first + cache fallback) registered via a small `<script>` at
  EOF. The app is now installable (Add-to-Home-Screen, standalone) and works offline. Deployed on
  **Netlify** (`mi-diaa.netlify.app`), auto-deploy from GitHub `main`; `netlify.toml` serves
  `mi-dia.html` at root and hides old `vNN` files. The app HTML stays single-file; `sw.js` +
  `netlify.toml` are deliberate infra files (see the Deployment note near the top).
