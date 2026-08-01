# Mi Día 🌿

> A Mediterranean-themed daily planner & reflective-journal PWA — built as a **single self-contained HTML file**, with a full **Playwright e2e suite** and a **CI/CD pipeline** gating every change.

**🔗 Live app:** https://mi-dia-app.pages.dev &nbsp;·&nbsp; **📱 Installable PWA** (works offline)

[![e2e](https://github.com/InesPatricia/Mi-Dia-App/actions/workflows/e2e.yml/badge.svg)](https://github.com/InesPatricia/Mi-Dia-App/actions/workflows/e2e.yml)
![PWA](https://img.shields.io/badge/PWA-installable%20%2B%20offline-5a8a5a)
![Tests](https://img.shields.io/badge/e2e-85%20Playwright%20tests-2EAD33)
![a11y](https://img.shields.io/badge/a11y-axe--core%20audited-blueviolet)
![CI](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF)
![Perf](https://img.shields.io/badge/perf-Lighthouse%20CI%20budgets%20%2B%20k6-F76935)
![Security](https://img.shields.io/badge/security-CSP%20%2B%20headers%20%C2%B7%20ZAP%20baseline-6A1B9A)
![Agentic](https://img.shields.io/badge/agentic%20AI-triage%20agent%20%2B%20Playwright%20agents-8A2BE2)
![Build](https://img.shields.io/badge/build-none%20(zero%20tooling)-lightgrey)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-orange)

---

## Why this repo might interest you

I'm a **QA / AI professional**, and I built this as a real, shipped product to practise engineering and quality end-to-end — not a toy. The interesting part isn't just the app; it's **how it's tested and shipped**:

- ✅ **85 end-to-end tests across 20 specs** (Playwright, mobile-Chromium) covering every view and deep user flows — assertions on both the **DOM and the persisted data model**, not just "does it render".
- ♿ **Accessibility audited** with axe-core on a curated rule set across all 7 views; semantic locators (`getByRole`/`getByLabel`) drive the suite — testing the app the way a screen-reader user experiences it.
- 📸 **Visual-regression tests** (`toHaveScreenshot`) on the design-locked navigation.
- 🚦 **Layered quality gates in CI/CD** (GitHub Actions): a fast build-validation gate → **sharded** parallel test runs → a **pre-merge smoke gate** against the live Cloudflare preview deployment → a **post-deploy smoke** against production. A broken build cannot reach `main`, and `main` is **branch-protected**. The whole pipeline — gates vs. nets — is diagrammed in [`docs/QA-ARCHITECTURE.md`](docs/QA-ARCHITECTURE.md).
- 🧪 **Test-independence by design:** an *implementer* and a *black-box tester* meet only at a written contract (acceptance criteria + stable selector handles) — an anti-bias pattern documented in [`e2e/SPEC-TEMPLATE.md`](e2e/SPEC-TEMPLATE.md).
- 🤖 **AI-assisted engineering:** developed with Claude Code using a spec-driven workflow ([`CLAUDE.md`](CLAUDE.md) is the living spec) — designed, reviewed and verified in tight human-in-the-loop iterations.
- 🚀 **Performance baseline:** **Lighthouse CI** asserts budgets (perf / a11y / best-practices / PWA) against the live URL after every deploy *and* against each PR's preview (shift-left, so a regression shows up before merge) — thresholds set from a *measured* baseline, each with a written rationale in [`lighthouserc.cjs`](lighthouserc.cjs) — plus a polite **k6 smoke** ([`perf/smoke.js`](perf/smoke.js), 5 VUs / 30 s, per-route thresholds) that baselines CDN/edge delivery.
- 🔐 **Security baseline:** a weekly **passive OWASP ZAP** scan of production, with every finding triaged in [`SECURITY-NOTES.md`](SECURITY-NOTES.md) into either a shipped fix — a hardened [`_headers`](_headers) set (CSP allow-list, anti-clickjacking, HSTS, Permissions-Policy, COOP/CORP) validated on a preview deployment before production — or an explicitly accepted risk with its one-line rationale. A re-scan documents the before/after delta, and a [`.zap/rules.tsv`](.zap/rules.tsv) tripwire fails the scan on any *new* finding; nothing is silently ignored.
- 🤖 **Agentic AI in QA:** an **AI failure-triage agent** ([`.github/workflows/ai-triage.yml`](.github/workflows/ai-triage.yml)) that, when e2e fails on a PR, reads the diff and failing logs and comments a likely cause — launched via `workflow_run` so untrusted PR input is handled by trusted code from `main`, and degrading gracefully with no API key — plus the native **Playwright planner / generator / healer** agents. How this repo *uses* AI in QA and how you'd *test* an agentic system (evals, golden dataset, trajectory, guardrails, prompt-injection) is written up in [`docs/AGENTIC-QA.md`](docs/AGENTIC-QA.md).
- 🔗 **Supply-chain & CI hygiene:** third-party Actions pinned to full commit SHAs with **Dependabot** proposing updates through the same gates; concurrency cancels stale runs; the Playwright browser is cached; CI runs on **Node 20** (moved off EOL Node 18 when a dependency bump surfaced it).

> **Honest scope note:** the e2e suite covers logic / DOM / navigation / persistence / i18n / a11y in headless Chromium. Native-Android specifics (OS time pickers, backdrop blur, fonts, touch gestures) are validated by a manual device pass — and that limit is stated, not hidden. Knowing what your automation *doesn't* cover is part of the job. The same honesty applies to the newer layers: the k6 smoke measures **CDN/edge delivery of a static PWA** (this app has no backend — after five files arrive, everything is client-side, which the e2e suite covers), and the ZAP scan is **passive only** (response inspection, no attack payloads) — an intentional match for a zero-backend, local-storage-only app, not a substitute for a pentest of a server application.

---

## The app

Plan your day in time slots, with guided journaling, projects, a calendar, progress
stats, and calming/energizing breathing tools — with a focus on coaching reflection
and energy awareness. Fully **trilingual (EN · ES · RO)**. All data stays **local** in
the browser (localStorage); nothing is sent to any server.

**Highlights:** dual **Light-luxe / Dark-velvet** theme (☾/☀ switcher, champagne + wine + gilt ⟷
aubergine velvet + gilt) · radial "flower" navigation · day planner with overlap-aware time slots ·
identity-based **habit rituals** with streaks + habit-stacking (Atomic Habits) · a **guided
onboarding** carousel · mood + emotion-wheel journaling with a 4F reflection scaffold ·
calendar "lenses" · consolidated progress view · opt-in cycle/rhythm tracking · Word/PDF & JSON backup.

### Screenshots

Two real themes, switchable with a ☾/☀ toggle: **Light-luxe** (champagne + wine + gilt) and
**Dark-velvet** (aubergine + gilt). Same views, both themes:

<table>
  <tr><th width="50%">☀ Light-luxe</th><th width="50%">☾ Dark-velvet</th></tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/day-light.png" alt="Day view (light) — flower navigation, daily phrase, rituals"><br><sub><b>Day</b> — flower navigation, daily phrase & rituals</sub></td>
    <td valign="top"><img src="docs/screenshots/day-dark.png" alt="Day view (dark-velvet)"><br><sub><b>Day</b> — dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/journal-light.png" alt="Journal (light) — mood and reflective writing"><br><sub><b>Journal</b> — mood + reflective writing, autosave</sub></td>
    <td valign="top"><img src="docs/screenshots/journal-dark.png" alt="Journal (dark-velvet)"><br><sub><b>Journal</b> — dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/calendar-light.png" alt="Calendar (light) — Plan and Mood lenses"><br><sub><b>Calendar</b> — Plan / Mood lenses, completion rings</sub></td>
    <td valign="top"><img src="docs/screenshots/calendar-dark.png" alt="Calendar (dark-velvet)"><br><sub><b>Calendar</b> — dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/progress-light.png" alt="Progress (light) — streak, hours by area, mood vs productivity"><br><sub><b>Progress</b> — streak, hours by area, mood ↔ productivity</sub></td>
    <td valign="top"><img src="docs/screenshots/progress-dark.png" alt="Progress (dark-velvet)"><br><sub><b>Progress</b> — dark-velvet</sub></td>
  </tr>
</table>

### Run it locally
It's a single file — just open [`index.html`](index.html) in your browser
(double-click, or drag it into Chrome). No install, no build step.

### Run the tests
```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
npm test            # full suite
npm run report      # concise Markdown summary -> e2e/TEST-REPORT.md
npm run test:report # interactive HTML report
```

---

## Architecture & engineering choices

- **Single self-contained HTML file** (HTML + CSS + JS), **no build, no bundler, no npm,
  no backend.** A deliberate constraint: maximum portability, zero supply-chain surface,
  instant load. The only same-origin companion is `sw.js` (the PWA service worker, which
  browsers require to be a separate file).
- **Deployed on Cloudflare Pages**, auto-deploying from `main` on every push; `index.html`
  is the promoted build. One-click dashboard rollback as a safety net.
- **New features as self-contained modules** (e.g. [`cycle.js`](cycle.js),
  [`ritual.js`](ritual.js), [`onboard.js`](onboard.js)) following a clean 5-layer pattern
  (data / calc / i18n / view / wiring) with pure, testable calc functions — an
  incremental-migration approach over the single file, no big-bang rewrite.

### Data model (short)
- **Area** (`cat`): the life-area of an activity. One per slot. Editable, max 8.
- **Tag** (`tag`): cross-cutting context. Several per slot.
- **Slot / activity** (`block`): `{ id, title, cat, time, dur, tags[], done, date }`

The full design spec, decisions and changelog live in [`CLAUDE.md`](CLAUDE.md).

---

## Languages / Idiomas / Limbi

<details>
<summary><b>Español</b></summary>

Un planificador y diario mediterráneo: planifica tu día en franjas horarias, diario
guiado, proyectos, calendario, estadísticas y herramientas de calma. La app es un único
archivo — abre `index.html` en el navegador. Todos los datos se guardan localmente.
Copia de seguridad: pestaña **Día → Backup** (exporta/importa un `.json`).
</details>

<details>
<summary><b>Română</b></summary>

Un planner și jurnal mediteranean: planificarea zilei pe sloturi orare, **ritualuri** (obiceiuri
cu serie, în stil Atomic Habits) + un **onboarding ghidat**, jurnal ghidat, proiecte, calendar,
statistici și unelte de calm. Aplicația e un singur fișier — deschide
`index.html` în browser. Toate datele se salvează local. Backup: tab-ul **Zi → Backup**
(exportă/importă un `.json`).
</details>

---

## License

© 2026 Ines Patricia. Licensed under
**[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** — you may share and
adapt this work for **non-commercial** purposes with attribution. Commercial use requires
permission. See [`LICENSE`](LICENSE).

---

<sub>Built by Ines — QA / AI professional. Code comments in English; the app UI is trilingual.</sub>
