# Mi Día — Project Context for Claude Code

## Language
Always respond in **Romanian**. All code comments can be in English.

---

## What this project is

A Mediterranean-themed daily planner PWA built as a **single self-contained HTML file**.
Personal use for now (localStorage, no backend). Future: public/subscription version.

**Owner:** Ines — QA/AI professional based in Spain.

---

## File structure

```
C:\Users\Ines\Desktop\Mi-Dia-App\
├── mi-dia.html       ← MAIN SOURCE FILE (edit this one)
├── README.md
├── .gitignore
└── CLAUDE.md         ← this file
```

**`mi-dia.html` is the single source of truth.** Everything — HTML, CSS, JS — is in this one file.
There is no build step, no bundler, no npm, no separate CSS/JS files.

---

## CRITICAL: Validation after EVERY edit

Run this after any change, before declaring it done:

```python
import re
html = open("mi-dia.html", encoding="utf-8").read()

scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
for i, s in enumerate(scripts):
    open(f"_tmp_c{i}.js", "w", encoding="utf-8").write(s)
print(f"Script blocks: {len(scripts)}")

body = re.sub(r"<style>.*?</style>", "", html, flags=re.S)
body = re.sub(r"<script>.*?</script>", "", body, flags=re.S)
opens = len(re.findall(r"<div\b", body))
closes = len(re.findall(r"</div>", body))
print(f"DIV balance: {opens} open / {closes} close → {'OK' if opens == closes else 'MISMATCH!'}")
```

Then for each _tmp_c*.js: `node --check _tmp_c0.js` etc. Delete them after.

If any check fails — fix before saving.

---

## Architecture: single HTML file

Everything is in one file. No build tooling. Data in `localStorage` only. No backend.

**Always use targeted edits** (str_replace / small insertions). Never rewrite large sections.

---

## i18n system (3 languages: EN / ES / RO)

- `let lang = 'en'` — current language, persisted in `localStorage` (`settings.lang`)
- `const I18N = { en: {...}, es: {...}, ro: {...} }` — ~170+ keys dictionary
- `function t(k)` — translation lookup
- `function applyI18n()` — updates all `data-i18n` attributes in the DOM
- `function LL(arr)` — returns `arr[lang]` for language-keyed content arrays
- Language-keyed arrays: `BREATH`, `SOMATIC`, `JPROMPTS`, `PHRASES`, `PRESETS`, `CAT_LABELS`
- Static HTML uses `data-i18n="key"`, `data-i18n-ph="key"`, `data-i18n-title="key"`
- Language switcher: discreet RO/ES/EN button bar at the bottom
- **Default language: English**
- **User-typed data is NOT translated** — intentional

When adding new features: write ALL user-visible strings in all 3 languages from the start.
Add keys to `I18N.en`, `I18N.es`, `I18N.ro`. Use `t('key')` in JS, `data-i18n="key"` in HTML.

---

## App features (already implemented)

- **Day tab:** time slots with drag-drop, reschedule (Tomorrow / Weekend / Next Week / custom date), filter bar (by category, tag, hide-completed), slot editor
- **Calendar tab:** Month view (mood-tinted cells + journal emoji), Year "pixels" grid (12×31, mood-colored), legend
- **Progress tab:** mood-productivity correlation panel with plain-language insight (statistical, not AI)
- **Calm tab:** 5 guided breathing patterns (animated circle, phase labels, countdown, chime) + 7 somatic/vagus nerve exercises (step list, countdown, chime), medical disclaimer
- **3-language i18n** (EN/ES/RO) — full app including meditations
- **PWA:** manifest, service worker, installable via Netlify
- **Backup:** export/import as JSON

---

## On the horizon (next to implement)

- **Menstrual cycle tracker** — to be added to the Calendar tab
  - Track cycle start dates
  - Show phases: menstrual, follicular, ovulatory, luteal
  - Phase explanations: hormones, energy, mood correlations
  - **Must be written in all 3 languages from the start**
  - Correlate cycle phase with mood/productivity data already tracked

---

## Data model (localStorage keys)

- `blocks` — slots: `{ id, title, cat, time, dur, tags[], done, date }`
- `cats` — categories/areas (max 8): `{ id, label, color }`
- `tags` — tags: `{ id, label }`
- `journal` — journal entries: `{ date, mood, energy, text, prompt }`
- `projects` — projects list
- `settings` — app settings including `lang`

---

## Style / tone

- Mediterranean aesthetic: warm colors, clean layout
- Mobile-first, works in Chrome on Android
- Calm, not overwhelming
- Target user: women who want structure + reflection + wellness in one place

---

## What NOT to do

- Do not split into multiple files
- Do not add build tooling, npm, or bundlers
- Do not add a backend or API
- Do not rewrite large sections when a targeted edit will do
- Do not leave untranslated strings in any new feature
- Always validate (JS syntax + div balance) before declaring an edit done
- Every new file created must have a unique name (never reuse previous filenames)
