# Mi Día — Project Context for Claude Code

> **Authoritative spec. Read this first, every session, before any work.**
> Last updated: June 2026 · Current latest build: **`mi-dia-v33.html`**

## Language
Always respond in **Romanian**. Code comments can be in English.
- **Chat replies: no diacritics** (plain ASCII — e.g. "romana", "zilei").
- **App/UI strings (i18n): keep proper Romanian diacritics.**

---

## What this project is

A Mediterranean-themed daily planner PWA built as a **single self-contained HTML file**
(HTML + CSS + JS in one file, no build step, no bundler, no npm, no backend).
Personal use for now (localStorage only). Future: public/subscription version.

**Owner:** Ines — QA/AI professional based in Spain. Comfortable with Node + GitHub.

---

## File / versioning workflow (IMPORTANT)

- The app lives in **versioned files: `mi-dia-vNN.html`**. Each change increments `NN`.
- **Current latest = `mi-dia-v33.html`.** Always start from the latest version.
- **Strict rule: every new code file gets a NEW name.** Never overwrite an existing
  version in place — each iteration is a separate rollback point. (One change → one new file.)
- **Git:** the versioned files `mi-dia-vNN.html` are **committed to git** as rollback history
  (no longer git-ignored). `mi-dia.html` is kept as the **deployable mirror of the latest
  version** — what README / PWA / Netlify and the daily-update task reference. When promoting a
  new version, copy the latest `vNN` into `mi-dia.html`, validate, then commit both.
- This spec file is `CLAUDE.md` (the living doc, updated in place — not versioned).

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

> NOTE: Python is **not installed** on this machine — run the same checks in Node
> (extract `<script>` blocks to temp `.js` → `node --check`; count `<div>`/`</div>`).

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
date/progress band) → radial **flower navigation** (4 petals: Calendar, Proiecte, Progres, Calm
+ centre circle = Jurnal) → day panel (`.daypad`). Persistent bottom bar also present.

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

## Day tab — add flow & slot rendering (current, v23–v33)

**Add flow reads top-to-bottom (configure → commit):**
1. **Shortcuts** (quick presets, 3-col grid) + a `+ Adaugă o activitate` card (opens shortcut editor).
   - Hint line below: *"apasă: pre-completează · ține apăsat: adaugă direct"* (i18n).
2. **ORĂ** (micro-label) → time picker. Hour/min selects + AM/PM toggle + manual entry +
   a `— fără oră` option. **Default 7:00 AM is real** (registered on build via `fireInit`).
3. Activity text field + duration (min).
4. **Live time-range preview** pill ("start – end", e.g. `7:00 – 7:30 AM`) — language-neutral,
   updates on time/duration change, handles noon and midnight (`+1` next-day badge).
5. **ARIE** (micro-label) → category picker.
6. **ETICHETE** (micro-label) → tag chips + new-tag form.
7. **`+ Adaugă`** — full-width rose commit button (the final step).

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
- **3-language i18n** (EN/ES/RO) across the whole app.
- **PWA** + JSON export/import backup.

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
- `[?]` B7. Default time decision: keep 7:00 AM as the real default, or change it?
  (This is the behavior change made in v30 — your call.)
- `[?]` B8. Long-press discoverability: after phone testing, decide whether long-press stays or
  we add a more visible affordance (e.g. a small "+" on the shortcut card).
- `[ ]` B9. Optional: gentle progressive disclosure of tags/duration (the "hybrid" idea) if the
  panel still feels dense in real use.

**C. Verify on real Android Chrome (validation, not building)**
- `[?]` C10. Native time pickers, blur, fonts.
- `[?]` C11. Overlap columns: readability of the wrapped time + tap targets (checkbox/play) in
  narrow 3–4 clusters; feel of the touch/scroll.
- `[?]` C12. Flower spacing on ≤360px screens (it scales to 1.0).

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
- `tags`, `journal` `{date,mood,energy,text,prompt}`, `projects`, `settings` (incl. `lang`).

---

## Style / tone & What NOT to do

- Mediterranean, warm, mobile-first (Chrome on Android), calm — not overwhelming.
- Target user: women wanting structure + reflection + wellness in one place.
- Do NOT: split into multiple files; add build tooling/npm/bundler/backend; rewrite large
  sections when a targeted edit works; leave untranslated strings; skip validation; reuse a
  previous filename.

---

## Changelog (v23 → v33) — this redesign of the day add-flow

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
