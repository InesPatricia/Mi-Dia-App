# Changelog

What changed in the app, newest first, grouped by arc rather than by commit.

**Versioning.** The app is one self-contained file. Every change produces a new `mi-dia-vNN.html`, and
a release copies one of those to `index.html`. Version numbers are build numbers, not semver — there
is no public API to break.

**Depth.** This file summarises. The full per-build detail, including everything before v57, lives in
[`docs/history/BUILD-LOG.md`](docs/history/BUILD-LOG.md). Which build is currently promoted is not
written down anywhere: read the `CACHE` name in `sw.js`.

---

## v185 — the flower as a painting *(in progress, not on staging yet)*

The geometric SVG flower is replaced by a **watercolour illustration that opens**, on Home and on the
Garden's small flowers. Seven stages extracted from a bougainvillea bloom series, cross-faded with a
**snap to the nearest clear frame** — blending two frames continuously leaves a ghosted image, so
every resting state shows one sharp frame while the transition between them stays soft.

The blooming mechanics are unchanged: the same recipe from presence, the same progress semantics,
the same reduced-motion behaviour. Only the petals are painted rather than drawn. The flower is also
smaller, with a tighter shadow.

## v173 → v184 — the Living Flower *(on `staging`, not in production)*

Navigation redesigned, and a flower that lives off presence rather than off completion.

- **A bottom tab bar** (Azi · Jurnal · Respiro · Calendar · Tu) replaces the radial flower navigation.
  The flower stops being a menu and becomes decoration that means something.
- **The flower opens from presence**: a check-in plus the rituals actually due that day. Time slots
  add a glow, never a requirement.
- **A rest day with a check-in gives a full flower.** This is the point of the whole arc: resting is a
  complete day, not a gap in a streak.
- **No "0 of N" anywhere.** The flower's states are described in warm counts, and at zero it is a
  dignified bud rather than a failure.
- **Mood, once per day.** Once set, the Journal picker collapses into a summary you can tap to change,
  instead of asking again.
- **The Garden** — one saved flower per day, in a monthly grid of real miniatures, reachable from Home.
- **A monthly reflection** built from real data: presence, votes cast toward the identity, and the
  rest days taken.

Monetisation, the last planned slice of this arc, was deliberately deferred.

## v169 → v172 — Respiro: breathwork grounded in research

An upgrade to the breathing section, built on two verified research passes rather than on what sounds
calming. The honest conclusion shaped the copy: the acute effects of slow breathing are real, but the
"vagus nerve" framing is contested as of 2025, so the app describes **what you feel** instead of
claiming a mechanism.

- **Purpose labels** on every exercise card, and a "why it is worth it" note inside the player —
  positive, sourced, and hidden until you open the exercise rather than shouted on the card.
- **The "Somatic / vagus nerve" segment is now simply "Corp" (Body)**, and the vagus-nerve language is
  gone from the entire app.
- **Adjustable resonance** — pick a pace (5, 5.5 or 6 breaths per minute) and a duration (5, 10 or 15
  minutes), with a minimum useful dose of five minutes.
- **A rhythm finder**: try three paces, keep the one that fits. Saved to `settings.resonancePace`,
  included in backup, and preselected next time.
- **Progressive muscle relaxation** added as a new body technique — the one with the strongest
  evidence behind it (meta-analysis of 31 randomised trials).
- Deliberately **not** added, on safety and evidence grounds: Wim Hof, Buteyko, HRV scoring, Havening.

## v157 → v168 — one visual language

No new features. An end-to-end pass to make the interface speak with one voice, one slice per build,
each validated before the next.

- **One action colour.** About 87 hard-coded wine hexes became five `--act*` tokens. Pixel-identical.
- **One primary button.** `.btn--primary` replaced ten or more bespoke filled buttons — wine in light,
  gilt in dark.
- **One radius scale.** Controls, cards, panels and modals moved onto `--r-sm/md/lg/xl` instead of
  arbitrary pixel values. This exposed `.hero` referencing a token that was never defined.
- **Dark-mode leaks fixed** — the TODAY pill, toggles, the intention modal and several cards were
  still painting cream-on-velvet.
- **The `--brand` trap**: `--brand` still pointed at rose in the light theme, so save buttons and the
  onboarding calls to action were rose while everything else was wine. One rule fixed all of them.
- **The drop cap, properly.** The first letter of the daily phrase had been "fixed" repeatedly and
  kept coming back clipped. The real cause was `background-clip: text`, which does not paint the part
  of a glyph that overflows its box — fragile, and dependent on font and device. Replaced with a solid
  gilt colour and no clipping, so there is no box to clip against.

## v156 — managing rituals, and one design language

- **Rituals can finally be edited and deleted** — including the two seeded by default, which
  previously could not be removed at all. Tap to edit, two-tap to delete, id and history preserved.
- **i18n debt repaid**: an empty Spanish translation no longer leaves a blank line, four stale
  aria-labels fixed, seven orphaned keys removed.
- Hard-coded browns on headings replaced with semantic tokens; the Calendar's date navigation aligned
  with the one on Home.

## v145 → v155 — Rituals, and a guided onboarding

An identity-based habits module, and a first-run experience for it.

- **Rituals on Home**: one card per ritual with a two-minute version, a streak **derived from the log
  rather than stored**, and a week of dots. Checking one is a small celebration, and the toast names
  the identity it just voted for.
- **Never miss twice** — a warm terracotta state after a missed day, not a broken streak.
- **Habit stacking** — a ritual can be cued by another ritual instead of by a time.
- **Identity** — "who do you want to become" becomes a card on Home showing today's votes.
- **Backfill** — a tappable 28-day mini-calendar in Progress, because forgetting to tick is not the
  same as not doing it. Checking always marks *today*; filling in the past is an explicit action.
- **Guided onboarding**: a six-card carousel. The step introducing the flower is a poem, in all three
  languages, rather than an explanation.

## v133 → v144 — the "old rich" revamp: two real themes

- **Light-luxe** (champagne, wine, gilt) and **Dark-velvet** (aubergine, gilt), switchable from the
  hero or from Settings, remembered in `settings.theme` and included in backup. No flash of the wrong
  theme on load.
- Built on **semantic tokens** — a `:root` block for light and a `data-theme="dark"` block that remaps
  the same names, so neither theme can leak into the other. The locked rose family was left untouched.
- All seven views themed, one slice per build.
- **Every pictographic emoji replaced with line-art SVG**, keeping only typographic marks.
- An honest regression: a locally scoped helper broke slot rendering across thirteen tests.
  `node --check` passed it, because the syntax was fine — the end-to-end suite is what caught it.

## v126 → v132 — accessibility, the olive branch, and going public

- Accessibility work on slots: the done tick and the time pill became real keyboard and
  screen-reader controls.
- The olive branch in the Journal arrived, grew, and was **removed again** because the page felt
  crowded. Removing it also dropped the file by about 170 KB.
- **Long entries stopped hiding under the bottom bar** — the page now follows the caret as you write.
- **The repository was made public** as an engineering showcase: security audit, monetisation notes
  and mockups moved out and purged from history, README rewritten for an engineering audience,
  CC BY-NC 4.0 licence, CI workflows hardened.

## v125 — Journal redesign

- Mood became **tonal discs** rather than weather emoji, with the mood word alongside.
- **Mood became light on the page**: choosing one warms or cools the whole card. Clear is golden, rain
  is blue-grey.
- The photo header is now the same `.hero` component used elsewhere, instead of a second one.
- Date navigation unified with Home, which also fixed a clipped arrow on Android.

## v122 → v124 — Calendar as lenses

Three ways to read the same month: **Plan** (progress rings), **Mood** (radial glows), and **Rhythm**
(the cycle ribbon, only when cycle tracking is on).

## v112 → v119 — the add flow

A single composer that expands as you type, the native OS clock, durations on quick chips, and an
in-app reminder before a slot begins.

## v98 → v110 — cycle, Respiro, persistence

- **"My rhythm"** (`cycle.js`) — opt-in, off by default, gender-neutral: moon phase in the calendar,
  real logging with history, and a firm disclaimer that it is an estimate, not medical advice and not
  contraception.
- "Calm" became **"Respiro"**.
- A persistence module: a gentle reminder to back up, and an install prompt.

## v90 → v97 — feeling better

A calm-me / wake-me toggle, energising breathing, a spoken body scan, and a permission pause with an
emotion wheel of 77 terms.

The ethics were decided here and still hold: emotion is only ever captured on low moods, shown
gently, and never turned into a frequency metric.

## v86 → v89 — CSS unification

Two overlapping stylesheet layers merged into one, verified pixel-identical across 27 screens.

## v57 → v68 — the premium revamp

Fraunces and Nunito Sans, labels inside the flower petals, the hero veil with the gilt italic "Día", a
consolidated Progress view, and a Profile that reads as a journey. Actions settled on rose, with olive
removed from anything actionable.

---

Everything before v57 is in [`docs/history/BUILD-LOG.md`](docs/history/BUILD-LOG.md).
