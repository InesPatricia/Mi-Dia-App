---
name: revamp
description: Orchestrates any LARGE, multi-part task on the Mi Día PWA (mi-dia-vNN.html) as a team — visual redesigns (e.g. the luxe Light+Dark revamp), big features, cross-cutting refactors, multi-module work. Use when asked to "revamp", "redesign", "overhaul", "build this big feature", "fă un revamp", "reproiectează", "ocupă-te de tot", or any job too big for one pass. The main chat is the Team Leader: it does NOT write code directly; it assembles a shared design DNA every agent works from, delegates work packages to worker agents who PROPOSE code, integrates each proposal into a NEW vNN through a central quality gate, then runs a parallel QA team (functionality, layout, design, fonts, BOTH themes, cohesion, flower-label integrity — phone-first). Ends at a verified vNN on disk + green e2e; it does NOT deploy.
---

# Revamp — team-led delivery of any big task (Mi Día / mi-dia-vNN.html)

You (the main chat) are the **Team Leader**. You do not personally write the code. You decompose the work, delegate it, and act as the **quality gate** every change passes through. Worker agents do the thinking for their slice and **return proposed code**; you integrate it yourself, one slice at a time, each into a **new `mi-dia-vNN.html`**, so the single self-contained file is never corrupted by parallel edits.

This skill handles **any large, multi-part job** — a visual redesign (the luxe Light+Dark theme), a sizeable feature, a cross-cutting refactor. The non-negotiable that makes it work: **every agent carries the same design DNA in its head**, so the output reads as one cohesive product, not a patchwork. A fresh-context **QA team** then validates the whole before anything is called done.

**Respond to Ines in Romanian without diacritics** (terminal can't render `ă î ș ț`). Code/comments stay English.

This skill ends at a verified, QA-passed `mi-dia-vNN.html` on a branch with green e2e — it hands **promote + deploy** back to the user (copy latest `vNN` → `index.html`, bump `sw.js` CACHE, PR → CI → Cloudflare). The deploy stays a separate, deliberate decision.

Read **`CLAUDE.md`** (the authoritative spec — especially "⭐ NEXT UP" for the luxe revamp + the versioning/PWA/deploy rules), the **`design-check` skill** (the binding design system + validation chain), the **`e2e/`** harness notes in CLAUDE.md, and project memory before starting. Every convention there is binding for **every** agent, whatever its slice.

> **`design-check` is the single design + validation authority for this skill.** It owns the locked palette, the token rules, the flower-label hard requirement, the grep helpers, and the mandatory verification chain. `revamp` does not re-derive any of that — it **invokes `design-check` BEFORE and AFTER every visual slice** (that skill's own usage contract) and the QA team judges against it. Where this file and `design-check` ever differ, `design-check` + CLAUDE.md "⭐ NEXT UP" win.

## Phase 0 — Team Leader sets up + assembles the Design DNA (do this yourself)

1. **Pin the goal** in one or two lines and the acceptance bar. Decide the task type: *visual overhaul* (→ run Phase 1, UNLESS a direction is already approved via mockup — the luxe revamp is, so skip), or *feature / refactor* (→ skip Phase 1, go to Phase 2). Mixed jobs run both.
2. **Make it revertible:** create a feature branch (e.g. `feat/revamp-<slug>`) and confirm a clean snapshot (`git status` clean) so nothing here can damage `main`. Note the current latest build (e.g. `mi-dia-v132.html`) — the new slices increment from there.
3. **Baseline:** `cd e2e && npm test` must already be green (record the count: 64 tests / 17 specs) and `npm run validate` (div-balance + `node --check`) must pass on the current build — proof the app is healthy before you touch it.
4. **Assemble the DESIGN DNA pack** — the single shared context block pasted into **every** worker and QA prompt, so all output is unified. Distill it from CLAUDE.md + the `design-check` skill + the tokens in the current `mi-dia-vNN.html`. It contains:
   - **Theme & feel:** Mediterranean "old rich" / quiet luxury; warm, gentle, phone-first; calm not overwhelming (omogenitate, fluență, naturalețe, simplitate, feminitate, blândețe).
   - **Two REAL themes** via `<html data-theme>` + `settings.theme` (`light`|`dark`, persisted + in backup export). Default at first launch = **LIGHT**. Switcher = discreet ☾/☀ in the hero (next to EN·ES·RO) + a Settings toggle.
   - **Semantic tokens (use, NEVER hardcode a theme-flipping color):** `--bg`, `--surface`, `--surface-2`, `--text`, `--text-soft`, `--line`, `--brand`, `--brand-ink`, `--accent`. Light values in `:root`; dark in an `html[data-theme="dark"]` override block.
   - **Palette:** Light-luxe — bg champagne `#F3ECE0`/pearl `#FBF6EC`, card `#FFFCF7` + ~30% gold hairline, action = **WINE `#6E1334`**, text `#3A2438`. Dark-velvet — bg radial aubergine→night `#3E1326→#250b15`, card velvet `#4A1A30`/`#511D38`, text champagne `#EFE2D0`/muted `#C9A99E`, action = **GILT GOLD**. Shared metal: `--gold-1:#E8D2A0`·`--gold-gilt:#C8A24C`·`--gold-antique:#B8893F`·`--gold-deep:#9A6E2C`.
   - **Signature accent** = the gilt gold HAIRLINE `linear-gradient(100deg,#E8D2A0,#C8A24C 45%,#9A6E2C)` (divider / card top-edge / rule under the date), plus drop-cap on the Spanish phrase, candle-glow behind the flower centre, serif numerals for figures. **Action color:** dark = gilt gold, light = wine; gold everywhere else is **metal only**.
   - **Match the approved mockup — do NOT re-derive the palette:** `private/mockups/mi-dia-luxe-mockup.html` (live 3-way theme switcher) + PNG previews in `private/mockups/luxe-previews/`.
   - **Typography:** **Fraunces** (display/brand) + **Nunito Sans** (body/UI) ONLY; wordmark "Mi" Fraunces + "Día" in gold script (Google font **Ephesis**, brand text only). Tagline UPPERCASE, letter-spaced.
   - **Hard rules:** **LOCKED `--rose-1..4` stay untouched — the revamp is ADDITIVE** (new tokens/surfaces, not a recolor). **FLOWER LABELS are sacred** — keep the EXACT `.labels .lbl .l1–.l5` markup + coords (`l1 170/78 · l2 255/142 · l3 222/244 · l4 118/244 · l5 85/142`) + the 5 line-icon SVGs + the 9px UPPERCASE word; **only re-skin colors, NEVER reposition** (every word stays inside its petal). i18n: every new string in EN/ES/RO (`data-i18n`/`-ph`/`-title`/`-aria`); user-typed data never translated. PWA stays intact (inline manifest + `/sw.js` registration). **One self-contained file** — no build step, no npm in the app, no backend.
   - **App shape:** single-file `mi-dia-vNN.html`; views Day (home) · Journal · Respiro · Calendar · Progress · Projects · Profile/Settings; flower nav (5 petals) + fixed bottom bar (Acasă · `+` · Profil); localStorage data model per CLAUDE.md.
   This pack is the thing that keeps a unified whole. It is **mandatory in every agent prompt**, even non-visual ones.

## Phase 1 — Design direction (visual overhauls only) → HUMAN CHECKPOINT

Skip if a direction is already approved via mockup (the luxe revamp is — `private/mockups/mi-dia-luxe-mockup.html`). Otherwise:

1. Spawn **3 `general-purpose` agents in one message**, each proposing a *distinct* direction within the Design DNA. Each returns the concept in 3 lines, the key token/layout changes, a structural mockup, and its risk.
2. Score them (2 judge agents or inline) on fit-to-goal, respect for the DNA/conventions, phone-first robustness in BOTH themes, implementation risk.
3. **Stop and present** the ranked directions with your recommendation. **Do not build until Ines picks one.** Mandatory checkpoint — a redesign is expensive to redo. When subjective, show options / ask briefly rather than guessing (Ines's stated preference).

## Phase 2 — Decompose into work packages (Team Leader)

Break the goal into **independent slices that map to disjoint code concerns**, so proposals don't overlap. For the luxe revamp the slices are already the phased plan in CLAUDE.md "⭐ NEXT UP" (**v133** Faza 0 foundation = Ephesis + gold + semantic tokens + `data-theme` block, zero visual change → **v134** switcher plumbing → **v135** hero & brand → **v136** flower + bottom bar → **v137** cards & components → **v138–v141** per-view passes (the bulk — dark exposes every hardcoded light color) → **v142** QA). For other jobs: feature = data model / render fn / new view / state+persistence / styling; refactor = one module per slice. Write a one-paragraph brief per slice: goal, the exact selectors/functions/ids it owns, what it must NOT touch, acceptance criteria. Define everything up front — workers cannot ask questions mid-run.

## Phase 3 — Workers PROPOSE (parallel, fresh context, all carrying the DNA)

Spawn one `general-purpose` agent per package (3-7; more and slices start overlapping). **Every** worker prompt — visual or not — begins with the full **Design DNA pack** from Phase 0, then:

```
DESIGN DNA (honor all of it, even if your slice is logic/content):
{PASTE THE PHASE 0 DESIGN DNA PACK}

You are a worker on a single self-contained file (mi-dia-vNN.html — HTML+CSS+JS, no build step).
Your slice: {BRIEF}. You own ONLY: {SCOPE}. Do NOT edit the file on disk. Do NOT touch anything outside your scope.
Anything you add — markup, a control, a label, an empty state, copy — MUST match the DNA: theme-flipping colors routed
through semantic tokens (never hardcoded), gold = metal only / action = wine(light) or gilt-gold(dark), the LOCKED
--rose-1..4 untouched, the flower label coords NEVER moved, every new string in EN/ES/RO. For visual slices, MATCH the
approved mockup (private/mockups/mi-dia-luxe-mockup.html + luxe-previews/) — do NOT re-derive the palette. New UI must
look like it always belonged. RETURN: the exact CSS/JS/markup to add or change, each block labelled with its precise insertion point, plus
2 lines on what it changes and any risk. Return code only — the Team Leader integrates it into a new vNN.
```

This is how "all agents have the design in their head": the DNA is pasted into each one, and each is told its output must fit the whole. Workers return proposals; **nothing is written to disk yet.**

## Phase 4 — Team Leader integrates (the quality gate, one new vNN per slice)

Apply proposals **yourself, one at a time** — never let two land blind. Each accepted slice = a **new `mi-dia-vNN.html`** (copy the latest, apply, increment), so every slice is its own rollback point (the project's versioning discipline):

1. **Invoke the `design-check` skill BEFORE applying** a visual slice (its usage contract) to re-pin the locked rules for that view.
2. Copy the current latest build to the next `vNN` and apply ONE slice at its declared insertion point with targeted edits (str_replace / small insertions — never rewrite large sections).
3. **Convention + cohesion check** before accepting, using `design-check`'s grep helpers verbatim:
   - theme-flipping colors that should be tokens: `grep -nE '#[0-9A-Fa-f]{6}' mi-dia-vNN.html` — any color used as a surface/text background in a component rule (not in `:root` / `[data-theme]`) is suspect;
   - flower coords NOT moved: `grep -nE '\.lbl\.l[1-5]\{' mi-dia-vNN.html` — must still read `170/78`, `255/142`, `222/244`, `118/244`, `85/142`;
   - the LOCKED `--rose-1..4` untouched, i18n complete (EN/ES/RO), PWA intact — AND *does it look like one product?* (consistent spacing, radii, type scale, tone). Reject anything that compiles but feels bolted-on.
4. **Mandatory validation AFTER** (the `design-check` chain = CLAUDE.md "CRITICAL: Validation after EVERY edit"): Python **div-balance** (opens==closes) → **`node --check`** on each `<script>` block (or `npm run validate`) → **screenshot the changed view in BOTH themes at 412px** and confirm no label spills out of any petal, hero text stays legible over the bougainvillea photo (dark veil strong enough), and contrast is OK on velvet surfaces (no muddy gold-on-wine; functional area/calm/mood tints need legible dark variants). Be honest: headless Chromium ≠ real Android (blur/backdrop-filter, fonts, native pickers) — the device pass stays Ines's step.
5. Resolve conflicts between slices (overlapping selectors, specificity, the `:root` / `html[data-theme="dark"]` cascade) before the next.

You are the only writer to the file. This keeps the single self-contained build safe and the unity real.

## Phase 5 — QA team (parallel, read-only, fresh context = unbiased)

Spawn the QA team **in one message**, each a fresh `general-purpose` agent that never saw the build reasoning. Give each the Design DNA pack so it judges against the intended whole. Each returns **PASS / FAIL per check with specifics (selector + line + why)**:

- **Functionality QA** — every view (Day, Journal, Respiro, Calendar, Progress, Projects, Profile/Settings) still renders; listeners bind; `Store`/localStorage/backup import-export intact (incl. `settings.theme`); cycle module + persist banner unbroken; no logic that throws.
- **Layout & responsive QA** — phone-first: ~412px AND ≤360px — flower scales, 5 petals don't collide, fixed bottom bar + `env(safe-area-inset-bottom)` correct, day card clears the lowest petal, no horizontal overflow, composer chips on one row.
- **Design / token QA** — no hardcoded theme-flipping colors (semantic tokens used), gold = metal only / action = wine(light)·gilt-gold(dark), the LOCKED `--rose-1..4` untouched, gilt hairline applied as the signature accent.
- **Typography / fonts QA** — Fraunces + Nunito Sans only (+ Ephesis for the wordmark), sizes/clamps/line-height/hierarchy, readability across breakpoints in both themes.
- **Theme QA** — **BOTH Light-luxe AND Dark-velvet:** palettes apply via `data-theme`, switcher persists to `settings.theme`, contrast adequate (the bright bougainvillea hero needs a STRONGER dark veil; functional area/calm/mood colors need legible velvet variants), default-launch = light.
- **Flower-label integrity QA** — the HARD requirement: `.l1–.l5` coords unchanged, words INSIDE petals in both themes, only colors re-skinned. Confirm on a screenshot.
- **Cohesion QA** — does the whole read as ONE unified product? Flag mismatched spacing/radii/type, components that feel from a different design, tone drift in copy (RO/ES/EN). This protects the "tot unitar".
- **Accessibility QA** — axe-core (the v126/v128 a11y work): roles/names/`data-i18n-aria` follow language; focus rings; keyboard nav; contrast on dark.
- **Regression QA** — diff against the Phase 0 baseline: anything that worked or looked right before that's now worse; the Playwright **visual baselines WILL change** for redesigns — flag that they must be regenerated, don't treat the diff as a failure.

**Honest limit on visual QA:** agents read CSS/markup and reason about computed layout — they do **not** see rendered pixels. For checks needing a real render (petal spill, mobile overflow, contrast on velvet), have QA run the `design-check` grep helpers and **flag explicitly what still needs a real viewing**; drive a 412px screenshot in both themes yourself, otherwise surface it for Ines. Never report a visual fix as confirmed without a real render.

## Phase 6 — Adjudicate & loop (Team Leader)

Collect QA verdicts. For each FAIL: send a tight fix brief (with the DNA) back to the owning worker, or fix inline if trivial; integrate via Phase 4's gate **into a new vNN**; **re-run only the failed QA dimension**. Loop until every dimension passes, or hit a sensible cap and report what's still open rather than hiding it.

## Phase 7 — Handoff → promote + deploy (HUMAN CHECKPOINT)

Do **not** deploy from here. When QA is green and `cd e2e && npm test` passes (regenerate the `@visual` baselines first if the look changed — `npm run test:visual`):

1. Summarize: what was built (the vNN range), QA results per dimension, and anything still needing a real-Android visual confirm.
2. Update the spec: **CLAUDE.md** — move the done items out of "⭐ NEXT UP", add a changelog block, bump "Current latest build". Keep it the single living doc.
3. Hand off the **promote + deploy** to Ines (the project's flow, never run from revamp): copy the final `mi-dia-vNN.html` → `index.html`, **bump the `CACHE` constant in `sw.js`**, `git rm` the previous `mi-dia-vNN.html` (history keeps it), commit, open a PR (gh CLI not installed → PR via URL). CI gates it (validate + e2e shards + the preview-smoke check), merge → Cloudflare Pages auto-deploys `mi-dia-app.pages.dev`, post-deploy prod smoke confirms it. Rollback = 1-click Cloudflare / `git revert`. The real-Android device pass remains Ines's step.

## Guardrails
- **One design DNA, in every head.** The Phase 0 pack goes into every worker AND QA prompt — that is what makes a unified whole instead of stitched parts. The Cohesion + Flower-label QA lenses are the backstop.
- **Team Leader never writes blind.** Workers propose; you integrate one slice at a time through the gate, each into a NEW `vNN`. You are the only writer to the file.
- **One change → one new `vNN`.** Never overwrite a version in place; never reuse a filename. Targeted edits only — no big-bang rewrite of the ~4300-line file.
- **The LOCKED rose family + flower coords are sacred.** `--rose-1..4` untouched; `.l1–.l5` never repositioned; the revamp is additive.
- **No nesting:** workers and QA agents cannot spawn their own agents — you are the sole conductor. Define acceptance criteria up front; agents can't ask mid-run.
- **Keep the fleet small:** ≤3 directions, 3-7 workers, ~8 QA agents. More overlap = worse routing, not better work.
- **Validate after every slice:** div-balance + `node --check` + a 412px screenshot in BOTH themes. e2e green before handoff.
- **Cost:** the heavy multi-agent pattern (~15x tokens). Worth it for a genuinely big, splittable job; overkill for a small change — for one view or one tweak, edit inline with the `design-check` skill.
- **Human checkpoints are mandatory** at Phase 1 (if visual & not pre-approved) and Phase 7 (before promote/deploy).
- **Ends before deploy.** Always hand promote+deploy back to Ines; never push to prod from `revamp`.
