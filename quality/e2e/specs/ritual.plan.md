# Ritual Check-in Flow Test Plan

## Application Overview

Scope: the ritual check-in flow on Home for a RETURNING, already-onboarded user (`settings.onboarded=true`, seeded by `gotoApp`/the seed spec). This plan does NOT cover onboarding, and only lightly references ritual creation/edit/i18n/backup where they already exist, to keep the coverage matrix complete.

Starting-state note (important, verified live): `#ritualMount` renders nothing when localStorage `rituals` is empty (`public/index.html`: `if(!list.length){ mount.innerHTML = ''; return; }`). Every scenario below must seed `rituals` before the app loads.

**Seed through the existing helpers. Do not hand-roll the fixture.** `tests/helpers.js` already exports `ritual(over, logDays)` and `dayKey(offset)`, and `seedStorage` writes via `addInitScript` so the state is in place before the first paint. A generated test that rebuilds a ritual literal, or recomputes a `YYYY-MM-DD` key by hand, forks the data model into a second place and drifts from the suite the moment either side changes. The four-state fixture used for the live exploration below is exactly this:

```js
const { test, expect } = require('@playwright/test');
const { gotoApp, seedStorage, readRituals, ritual, dayKey } = require('../tests/helpers');

const fixture = () => [
  ritual({ id: 'r_fresh',  name: 'Fresh start',    createdAt: dayKey(0), log: [] }),
  ritual({ id: 'r_streak', name: 'Morning breath', identity: 'a calm person' }, 3),
  ritual({ id: 'r_done',   name: 'Water',          identity: 'someone who hydrates',
           log: [dayKey(0), dayKey(-1)] }),
  ritual({ id: 'r_miss',   name: 'Reading',        log: [dayKey(-2)] }),
];

await seedStorage(page, { settings: { lang: 'ro', onboarded: true }, rituals: fixture() });
await gotoApp(page);
```

Two things the generator must respect here. `ritual(over, logDays)` builds a log of `logDays` consecutive days ending **yesterday**, so `r_streak` needs no explicit `log`; pass an explicit one only when the shape is irregular (`r_done` includes today, `r_miss` skips yesterday). And `seedStorage` writes only when the key is absent, so a reload inside a test preserves what the app persisted rather than clobbering it - which is what makes the persistence assertions meaningful.

**The UI under this seed is Romanian.** The seed spec sets `settings.lang = 'ro'`, so every user-visible string the app renders comes from `t()` in Romanian, diacritics included. An earlier draft of this plan quoted the English strings; that was wrong, and the session's own snapshot (`.playwright-mcp/page-2026-08-19T21-04-38-853Z.yml`) contradicts it. The strings this plan asserts on are:

| Element | Rendered text under `lang: 'ro'` |
|---|---|
| `.r-sum` | `2 / 4 azi` (`rit_summary` = `"{n} / {m} azi"`) |
| `.r-vote` | `+1 vot: a calm person` (`rit_vote` = `"+1 vot: {x}"`) |
| `.r-badge` | `NOU` |
| `.r-start` | `azi începe` |
| `.r-fl` | `zile` (`zi` when the streak is 1) |
| `.r-tick` aria-label | `Bifează ritualul` |

## Locator and assertion policy

Binding on every generated test. Verified against the live DOM this session, not assumed. Where this
plan departs from Playwright's published best practice, the departure is named and the reason given,
because an unexplained deviation is indistinguishable from an accident.

**1. Prefer role and accessible name.** The tick is a real ARIA widget. Probed live:

```
role="button"   aria-label="Bifează ritualul"   aria-pressed="false"
```

So inside a card it is `getByRole('button', { name: S.tickLabel })`, never `.r-tick`. Its state is a
first-class assertion, `toHaveAttribute('aria-pressed', 'true')`, and never a check for a `done`
class. A CSS class is an implementation detail; `aria-pressed` is the contract with the user.

**2. Anchor the card by the name the user typed.** This one IS a departure. The card is a plain
`div` with no role and no accessible name, so there is nothing to select it by except its class and
its text:

```js
const card = (page, name) => page.locator('#ritualMount .r-card').filter({ hasText: name });
```

`.filter({ hasText })` rather than the `locator(selector, { hasText })` shorthand, because it chains
and reads left to right. This is the only structural selector the policy permits, and it is
permitted because no alternative exists today.

> **Product follow-up, not a test workaround.** If the tick's `aria-label` included the ritual name,
> `Bifează ritualul Water`, then `getByRole('button', { name: /Water/ })` would identify a card's
> tick uniquely and this exception would disappear. That is a genuine accessibility improvement
> first: today a screen-reader user hears four identical buttons. Raise it, do not silently work
> around it forever.

**3. No literal UI copy inside a test body.** Every asserted string is imported from the shared
module, which already exists and is hand-authored:

```js
const S = require('./strings');
// ... await expect(tick).toHaveAccessibleName(S.tickLabel);
// ... await expect(sum).toHaveText(S.summary(2, 4));
```

`tests-generated/strings.js` holds `tickLabel`, `vote(who)`, `summary(done, due)`, `badgeNew`,
`startToday`, `unitDay`, `unitDays`, `currentLabel` and `recordLabel`. Do not redeclare any of them
inside a spec. One place changes when the copy changes, and the change is a single reviewable diff
instead of the same literal scattered across twenty-six files. On promotion into `tests/` the module
moves to `tests/strings.js` alongside `helpers.js`.

## File policy

`generator_write_test` writes **one test per file**, named after the scenario. That is the contract
in the agent definition, and this plan follows it rather than fighting it, because it happens to be
the right shape for this workflow: promotion is a per-file move, a mutation run targets one file, and
the quarantine count then means something real.

So each scenario below becomes its own file under `tests-generated/`, with an fs-friendly name taken
from the scenario title, for example:

```
tests-generated/second-tap-un-checks-a-done-ritual.spec.js
tests-generated/summary-counter-live-updates-on-check.spec.js
```

Each file carries a two-line provenance header, so a reader six months from now can find both the
intent and the evidence:

```js
// spec: specs/ritual.plan.md 1.2
// seed: tests-generated/seed.spec.js
```

The `describe` block matches the top-level section title from this plan, the test title matches the
scenario title, and the `kills:` line from the mutation register is added by the human who promotes
the file, not by the generator, because only the human has watched it go red.

**4. Web-first assertions only.** `expect(locator).toHaveText(...)`, `toBeVisible()`,
`toHaveAttribute(...)`, `toHaveCount(0)`. These retry until the timeout, which is what makes them
safe against the app's async `save()` and re-`render()`. Never
`expect(await locator.isVisible()).toBe(true)`, and never read `.textContent()` into a manual
comparison; both sample once and reintroduce the race the assertion exists to remove.

**5. Absence is asserted, not inferred.** `await expect(card.locator('.r-vote')).toHaveCount(0)`.
Not a `waitForTimeout` followed by a look, and not `not.toBeVisible()` on a locator that resolves to
nothing when a count assertion says exactly what is meant.

**6. No time-based or network-based waiting.** No `waitForTimeout`, no `networkidle`. The one place a
real wait is unavoidable is the 500 ms long-press in 4.4, and there it is the behaviour under test
rather than a workaround, so it is expressed as a pointer sequence and not as a sleep before an
assertion.

**7. Translated text is asserted only where the text is the thing under test.** `.r-sum` in 2.2 and
2.3, `.r-vote` in section 3, the Progress labels in 8.2. Everywhere else, locate structurally within
an anchored card and assert on state.

Live verification performed this session (chromium, project "generated"): seeding these four rituals and reloading rendered exactly the expected states - "Fresh start" with the `NOU` badge, streak "0" and the `azi începe` label; "Morning breath" with streak "3", no vote line (not done); "Water" already done today (`aria-pressed=true`) showing the identity vote line `+1 vot: someone who hydrates`; "Reading" in the miss state with the warm `.r-miss-line` and a `.r-mini2` chip reading `↻ versiunea de 2 min`. The header summary read `1 / 4 azi`. Clicking the tick on "Morning breath" was also verified live: the card flipped to done, streak became "4", the identity vote line appeared (`+1 vot: a calm person`), and the summary live-updated to `2 / 4 azi` - all without a reload. A second click (to verify un-checking) timed out interactively in this session and was NOT re-verified live; the un-check/toggle mechanics below rely on the documented code behavior (`toggleCheck` removes today's key on a second tap, `public/index.html` line 6879) rather than a second live observation, and are flagged as such.

Selectors used throughout (all under `#ritualMount`): `.r-card[data-id]` (classes `done`/`miss`/`fresh`/`editing`), `.r-tick` (role=button, `aria-pressed`; locate it under a card anchored by name, not by its label), `.r-n` (streak number), `.r-fl` (day/days unit), `.r-dots i.on` (7-day dots, rendered only when the card is neither `done`, `fresh` nor `miss`), `.r-badge` (`NOU`), `.r-start` (`azi începe`), `.r-vote` (identity line, only when done AND identity non-empty), `.r-miss-line` + `.r-mini2[data-two]` (miss state only), `.r-two`/`.r-tag2` (2-min line, plus the `· <after> <anchor>` fragment), `.r-sum` (`N / M azi` summary), `.r-editbtn`, `.r-del[data-del]`, `.r-add`.

## Coverage matrix (scenario -> status)

| # | Scenario | Status | Reference |
|---|---|---|---|
| 1 | Home renders seeded rituals with name + streak | COVERED | existing test 1 |
| 2 | Tap check -> done, streak +1, persists across reload | COVERED | existing test 2 |
| 3 | Check always marks TODAY regardless of viewed day (v154) | COVERED | existing test 3 |
| 4 | Create via suggestion chip (2 taps) | COVERED | existing test 4 |
| 5 | Create written + "after" cue (habit stacking) | COVERED | existing test 5 |
| 6 | Never-miss-twice: missed prior day shows the 2-min chip (visibility only) | COVERED | existing test 6 |
| 7 | Progress history block + calendar-cell backfill | COVERED | existing test 7 |
| 8 | Backup export includes rituals, import restores them | COVERED | existing test 8 |
| 9 | i18n relabels the section header | COVERED | existing test 9 |
| 10 | Edit mode: two-tap delete | COVERED | existing test 10 |
| 11 | Edit mode: tap card opens sheet prefilled, saves in place | COVERED | existing test 11 |
| 12 | Second tap UN-checks a done ritual (toggle off): class, aria-pressed, streak, log key all revert | GAP | new |
| 13 | Checking a same-day fresh ritual DROPS the fresh state: `NOU` badge and `azi începe` both disappear, replaced by streak 1 | GAP | new |
| 14 | Rapid double-activation on the tick does not double-log (`_busy` guard) | GAP | new |
| 15 | Header `.r-sum` counter live-updates on check (verified: 1/4 -> 2/4) | GAP (partially verified live) | new |
| 16 | Header `.r-sum` counter live-updates on un-check | GAP | new |
| 17 | `.r-dots` (7-day dot row) hides once done, reappears once un-checked | GAP | new |
| 18 | Four independent rituals keep distinct, non-cross-contaminated streak/log state | GAP (verified live for the seed shape) | new |
| 19 | Identity vote line `.r-vote` appears only once done AND identity non-empty (verified live: appeared on check) | GAP (partially verified live) | new |
| 20 | Identity vote line absent for a done ritual with empty identity | GAP | new |
| 21 | Identity vote line disappears again on un-check | GAP | new |
| 22 | Tapping the `.r-mini2` 2-min chip on a missed ritual marks today via the gentler path and clears the miss state | GAP | new |
| 23 | The 2-min check is a no-op once today is already logged (module note M5) | BLOCKED on #24 - no chip on a done card, `twoMinCheck` not exposed | new |
| 24 | Long-press (500 ms) on `.r-tick` triggers `twoMinCheck` | GAP - documented from code only, not interactively exercised | new (flagged, see note) |
| 25 | The "· after &lt;anchor&gt;" fragment renders on `.r-tag2` when the anchor ritual still exists | GAP | new |
| 26 | The "· after ..." fragment is omitted gracefully when the anchor was deleted (module note M3) | GAP | new |
| 27 | Enter key on a focused `.r-tick` checks the ritual | GAP | new |
| 28 | Space key on a focused, done `.r-tick` un-checks it | GAP | new |
| 29 | Mixed check/uncheck state across multiple rituals persists correctly across reload | GAP | new |
| 30 | `normLog` cleans the log IN MEMORY on load (streak reflects it) and writes through only on the first user action (module note M2) | GAP - investigative | new |
| 31 | `recordStreak`'s longest-historical-run value: confirm whether it is rendered anywhere in the UI | GAP - investigative | new |
| 32 | Checking one ritual leaves its three siblings' cards and stored logs untouched | GAP (verified live for this exact click) | new |
| 33 | The unit is singular at a streak of 1 and plural from 2 upward | GAP | new |
| 34 | A run crossing a month boundary counts as consecutive | GAP - needs a frozen clock | new |
| 35 | A run crossing a year boundary counts as consecutive | GAP - needs a frozen clock | new |
| 36 | A check just before midnight belongs to the day that is ending, and survives the rollover | GAP - needs a frozen clock | new |
| 37 | A ~400-day log renders, and the dot row stays at seven | GAP | new |

## Mutation register

A scenario earns promotion by going **red** against a deliberate defect, not by going green against
the app as it is. Every new scenario therefore names the defect it must catch, before the test is
written. This is stage 3 of the promotion gate, moved forward into the plan so that it constrains
what gets written rather than only judging it afterwards.

Two things fall out of writing this table, and both are the point. A scenario whose mutation cannot
be named is a scenario that asserts nothing worth having, and it should be deleted here rather than
discovered later. And two scenarios that share a mutation are testing the same thing twice, which is
a signal to merge them.

| # | Scenario | Break this in `public/index.html`, the test must go red |
|---|---|---|
| 12 | second tap un-checks | delete the `else r.log.splice(i,1)` branch in `toggleCheck` |
| 13 | fresh becomes done | drop `!done` from the `fresh` condition in `cardHTML` |
| 14 | no double-log | delete the `if(_busy.has(id)) return` guard |
| 15 | summary increments | hard-code `doneN` in the `.r-sum` render |
| 16 | summary decrements | same mutation as 15, exercised on the un-check path |
| 17 | dots hide when done | change `(done?'':weekDots(r,today))` to always render the dots |
| 18 | four rituals stay distinct | make `streakOf` read `_cache[0]` instead of its argument |
| 19 | vote line appears | change `done && voteLabel(r)` to `done` |
| 20 | no vote line, empty identity | make `voteLabel` return a placeholder instead of `''` |
| 21 | vote line disappears | same mutation as 19, exercised on the un-check path |
| 22 | 2-min chip marks today | remove `r.log.push(k)` from `twoMinCheck` |
| 23 | 2-min is a no-op when done | remove the `if(r.log.indexOf(k) < 0)` guard in `twoMinCheck` |
| 24 | long-press takes the 2-min path | make the 500 ms timer call `toggleCheck` instead |
| 25 | after-cue fragment renders | drop the `after` concatenation in `cardHTML` |
| 26 | orphan anchor degrades gracefully | make `anchorName` return the raw id when nothing matches |
| 27 | Enter activates the tick | remove `e.key==='Enter'` from the keydown handler |
| 28 | Space activates the tick | remove `e.key===' '` from the keydown handler |
| 29 | mixed states survive reload | make `save()` a no-op |
| 30 | normLog cleans the log | remove the `padStart` from `normLog` |
| 31 | record is rendered | render `streak` twice in `ritStatCard` instead of `record` |
| 32 | siblings are untouched | make `toggleCheck` mutate `_cache[0]` instead of the found ritual |
| 33 | singular / plural unit | make `streak===1 ? t('rit_day') : t('rit_days')` always use the plural |
| 34 | run crosses a month | replace the date walk in `streakOf` with day-of-month arithmetic |
| 35 | run crosses a year | same mutation as 34, plus any date-key string comparison |
| 36 | midnight rollover | cache `todayD()` outside the function so it is computed once per load |
| 37 | long log renders | make `weekDots` iterate the log instead of the fixed seven-day window |

Note that 15 and 16 share a mutation, as do 19 and 21. That is deliberate: the mutation is the same
defect but the two scenarios drive it from opposite directions, and a counter that increments
correctly while failing to decrement is a real bug shape. Keep both, and say why in the review rather
than letting a future reader assume it was an oversight.

Record the result next to each promoted test, so the claim is evidence rather than assertion:

```js
// spec: specs/ritual.plan.md 1.2
// kills: deleting the else-branch in toggleCheck  (verified 2026-08-20)
```

Note on #24: per the wiring code, a `pointerdown` on `.r-tick` starts a 500 ms timer (`startLP`) that fires `twoMinCheck(id)` instead of the regular `toggleCheck` if held past the threshold. Per this session's instructions, this was described from the code rather than hunted with a synthetic pointer sequence (long-press timers are unreliable to synthesize headlessly). A future pass should use a real Playwright `pointer down -> wait 550ms -> pointer up` sequence rather than `.click()`.

## Test Scenarios

### 1. Check / Un-check Toggle

**Seed:** `tests-generated/seed.spec.js`

#### 1.1. Checking a ritual marks it done and bumps the streak (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'tapping the check marks the ritual done, bumps the streak, and persists' in tests/ritual.spec.js. No new automation needed.
    - expect: Existing suite asserts done class, aria-pressed=true, streak increment, log persistence, and survival across reload.

#### 1.2. Second tap on a done ritual un-checks it (toggle off)

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed one ritual with log = [dayKey(-1), dayKey(-2)] (2-day streak, not done today). Navigate to Home.
    - expect: Card shows streak '2', is NOT in the done state, .r-tick has aria-pressed='false'
  2. Click .r-tick once
    - expect: Card gains class 'done', .r-tick aria-pressed='true', streak number becomes '3', localStorage rituals[0].log now contains dayKey(0)
  3. Click .r-tick a second time on the same ritual
    - expect: Card no longer has class 'done', .r-tick aria-pressed reverts to 'false', streak number reverts to '2', localStorage rituals[0].log no longer contains dayKey(0) (toggleCheck removed the key)
  4. Reload the page
    - expect: The un-checked state persists after reload: card is not done, streak reads '2'

#### 1.3. Checking a same-day fresh ritual leaves the fresh/NEW state

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual with createdAt = today and an empty log (e.g. r_fresh from the standard seed). Navigate to Home.
    - expect: Card has class 'fresh', shows the badge (.r-badge) reading 'NOU', streak area shows '0' with the .r-start label reading 'azi începe', .r-tick aria-pressed='false'
  2. Click .r-tick on the fresh ritual
    - expect: Card class changes from 'fresh' to 'done'; the .r-badge and .r-start placeholder both DISAPPEAR (both are rendered under the `fresh` branch, and `fresh` is `!done && streak===0 && ...`), replaced by streak '1' with .r-fl reading 'zi' (singular at 1, not 'zile'), .r-tick aria-pressed='true'
  3. Read rituals from localStorage
    - expect: The ritual's log now contains dayKey(0)

#### 1.4. The check always marks TODAY, even while viewing another day (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'the check always marks TODAY, even while viewing another day (v154)' in tests/ritual.spec.js. No new automation needed.
    - expect: Existing test navigates #prev then checks, and asserts the log only contains dayKey(0), never the viewed day.

#### 1.5. Rapid double-activation on the tick does not double-log

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed one not-done ritual with a 2-day streak. Navigate to Home.
    - expect: Card shows streak '2', not done
  2. Dispatch TWO click events on the same .r-tick synchronously, inside one page.evaluate, so both run in the same task: `el.click(); el.click();`
    - expect: Exactly one dayKey(0) entry exists in the ritual's log afterward (no duplicate), and the streak reads '3', not higher - confirming M4's `_busy` guard swallows the second activation rather than double-toggling

**Do NOT use `Promise.all` of two Playwright `.click()` calls here.** An earlier draft of this plan offered that as an equivalent option. It is not. `toggleCheck` releases the guard in a `finally` **after** `await save()`, so the window in which `_busy` holds the id is real but short, and two Playwright clicks are two separate CDP round-trips with no ordering guarantee against it. The second click can land after the release and *un-check* the ritual, making the test fail intermittently on correct code. The synchronous double-dispatch is deterministic: the second `toggleCheck` runs to its `if(_busy.has(id)) return` before the first one reaches its first `await`.

### 2. Streak, Dots and Summary Recomputation

**Seed:** `tests-generated/seed.spec.js`

#### 2.1. Seeded rituals render Home with names + streak (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'seeded rituals render the Home section with names + streak' in tests/ritual.spec.js. No new automation needed.
    - expect: Existing test asserts card visibility, .r-n text, and .r-sum visibility.

#### 2.2. Checking a ritual live-updates the header summary counter

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed the standard 4-ritual mixed fixture (1 already done today, 3 not done). Navigate to Home.
    - expect: .r-sum reads '1 / 4 azi'
  2. Click .r-tick on an undone ritual, e.g. 'Morning breath'
    - expect: .r-sum updates to '2 / 4 azi' immediately, with no reload required (verified live in this session with this exact fixture)

#### 2.3. Un-checking a ritual decrements the header summary counter

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. From the '2 / 4 azi' state above (one ritual just checked), click the same .r-tick again to un-check it
    - expect: .r-sum decreases back to '1 / 4 azi'

#### 2.4. The 7-day dot row hides once a ritual is done and reappears on un-check

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed one not-done ritual with some history (e.g. log = [dayKey(-1), dayKey(-2), dayKey(-3)]). Navigate to Home.
    - expect: .r-dots is visible on the card, with some 'on' dots reflecting recent history
  2. Click .r-tick to check it
    - expect: .r-dots is no longer rendered/visible once the card is in the 'done' state
  3. Click .r-tick again to un-check it
    - expect: .r-dots reappears

#### 2.5. Four independent rituals keep distinct streak/log state

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed the standard 4-ritual mixed fixture (fresh=0 with the `NOU` badge, streak=3 not done, done=2 with vote line, miss=chip). Navigate to Home.
    - expect: Fresh start shows '0' + `azi începe` + the `NOU` badge; Morning breath shows '3' / `zile`, not done, no vote line; Water shows '2' / `zile`, done, aria-pressed=true, vote line visible; Reading shows .r-miss-line + .r-mini2, not done - matches this session's live snapshot exactly
  2. Read rituals from localStorage
    - expect: Log arrays match the seeded values exactly for all four entries, with no cross-contamination

### 3. Identity Vote Line

**Seed:** `tests-generated/seed.spec.js`

#### 3.1. A done ritual with a non-empty identity shows the vote line

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a not-done ritual with identity 'a calm person' and log ending yesterday (e.g. r_streak from the standard fixture). Navigate to Home.
    - expect: .r-vote is NOT present while the ritual is not done
  2. Click .r-tick to check it
    - expect: .r-vote becomes visible with text containing '+1 vot: a calm person' once the card is done (verified live in this session, and confirmed against `rit_vote` = "+1 vot: {x}")

#### 3.2. A done ritual with an empty identity shows no vote line

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual with identity: '' (e.g. r_fresh or r_miss from the standard fixture). Click its .r-tick to check it.
    - expect: Card is in the 'done' state but .r-vote is absent/not rendered, since r.identity is empty

#### 3.3. Un-checking removes the vote line again

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual already done today with a non-empty identity (e.g. 'Water' from the standard fixture, already done with identity 'someone who hydrates'). Navigate to Home and confirm .r-vote is visible.
    - expect: .r-vote visible, text contains 'someone who hydrates'
  2. Click .r-tick to un-check it
    - expect: .r-vote disappears once the card leaves the done state

### 4. Never-miss-twice and the 2-minute Path

**Seed:** `tests-generated/seed.spec.js`

#### 4.1. A missed prior day surfaces the warm 2-min chip (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'never-miss-twice: a missed prior day surfaces the warm 2-min chip' in tests/ritual.spec.js. No new automation needed for visibility.
    - expect: Existing test asserts the 'miss' class and .r-mini2 visibility for a ritual done 2 days ago and not since.

#### 4.2. Tapping the 2-min chip marks today via the gentler path

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual with log = [dayKey(-2)] (matches r_miss / 'Reading' in the standard fixture: missed yesterday). Navigate to Home.
    - expect: Card has class 'miss'; .r-miss-line and .r-mini2[data-two] are visible (verified live in this session: the miss line and a '2-min version' chip rendered exactly this way)
  2. Click .r-mini2 (the 2-min chip)
    - expect: localStorage rituals[...].log now contains dayKey(0); the card leaves the 'miss' state; if a toast/confirmation element has a stable selector, assert its text is the gentler 2-min copy, otherwise assert on the log + class change only

#### 4.3. The 2-min check is a no-op once today is already logged

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
**BLOCKED - do not generate this test yet. It depends on 4.4.**

An earlier draft proposed two ways in, and neither exists:

- *"click .r-mini2 if still rendered while done"* - it is not. `cardHTML` renders `.r-miss-line` + `.r-mini2` only on the `miss` branch of an if/else-if/else, and a done card takes the first branch (`done && voteLabel(r)`) or the last. There is no chip on a done card.
- *"call the app's exposed handler via page.evaluate"* - it is unreachable. The module does export an
  internal surface, `return { init, render, refresh, onChange, openCreate, renderRitualStats,
  todayVotes, _calc: {...}, _get }`, but `twoMinCheck` is not on it. And the binding itself is out of
  reach anyway: the whole script block is wrapped in one IIFE (`(function(){` at line 2557, `})()` at
  line 7752), so `const Ritual` never becomes a global. Probed live, `typeof window.Ritual` is
  `undefined` and a bare `Ritual` in `page.evaluate` throws `ReferenceError`.

So the only route to `twoMinCheck` on a done ritual is the long-press, which is scenario 4.4, itself not yet automated. Write 4.4 first with a real pointer sequence; this scenario then becomes a two-line extension of it.

**Steps (once 4.4 exists):**
  1. Seed a ritual already done today (log includes dayKey(0)). Navigate to Home.
    - expect: Card is in the done state, .r-mini2 is absent
  2. Long-press .r-tick using the same pointer sequence 4.4 establishes
    - expect: The log is unchanged - still exactly one dayKey(0) entry, no duplicate - and no toast appears, confirming M5's guard (`if(r.log.indexOf(k) < 0)` wraps the whole write-and-notify block, so a no-op is silent)

#### 4.4. Long-press (500ms) on the tick triggers the 2-min check path

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. DOCUMENTED FROM CODE, NOT YET AUTOMATED: per the wiring (startLP on pointerdown of .r-tick, 500ms timer), a sustained press below the release threshold should call twoMinCheck(id) instead of toggleCheck. A future test should use Playwright's pointer API directly: page.mouse/locator dispatchEvent('pointerdown') -> wait ~550ms -> dispatchEvent('pointerup'), then assert the log gained today's key via the gentler path (not the regular toggle).
    - expect: Flagged as a gap requiring a dedicated pointer-timing test in a future pass; not hunted with .click()-based synthetic events in this session since long-press timers do not reliably fire from a single synthetic click

### 5. Habit-stacking Cue Display

**Seed:** `tests-generated/seed.spec.js`

#### 5.1. Create written + 'after a ritual' stores a habit-stacking cue (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'create written + "after a ritual" stores a habit-stacking cue' in tests/ritual.spec.js. No new automation needed for the cue's data shape.
    - expect: Existing test asserts cue.type === 'after' and cue.value === the anchor id after creation.

#### 5.2. The after-cue fragment renders on the card when the anchor exists

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed two rituals: an anchor (id 'r_anchor', name 'Anchor') and a dependent ritual with cue = { type: 'after', value: 'r_anchor' }. Navigate to Home.
    - expect: The dependent ritual's 2-min line (.r-two / .r-tag2) reads '... · after Anchor', containing the anchor's name

#### 5.3. An orphaned after-cue anchor omits the fragment gracefully

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a single ritual whose cue = { type: 'after', value: 'r_ghost' }, where no ritual with id 'r_ghost' exists. Navigate to Home.
    - expect: The 2-min line renders without any '· after ...' fragment and without any broken/undefined text, per module note M3

### 6. Keyboard Activation

**Seed:** `tests-generated/seed.spec.js`

#### 6.1. Enter key on a focused tick checks the ritual

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed one not-done ritual. Navigate to Home. Focus .r-tick (e.g. page.locator('.r-card', {hasText: name}).locator('.r-tick').focus())
    - expect: .r-tick is the focused element, aria-pressed='false'
  2. Press 'Enter'
    - expect: Card transitions to 'done', aria-pressed='true', streak increments, same effect as a pointer click

#### 6.2. Space key on a focused, done tick un-checks it

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Continuing from the same ritual now done with .r-tick still focused, press 'Space'
    - expect: Card reverts to not-done, aria-pressed='false', streak decrements back down, log no longer contains dayKey(0)

### 7. Multi-ritual Independence and Persistence

**Seed:** `tests-generated/seed.spec.js`

#### 7.1. Checking one ritual does not affect sibling rituals

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed the standard 4-ritual mixed fixture. Navigate to Home. Click .r-tick on 'Morning breath' only.
    - expect: Only Morning breath's card becomes 'done' with its streak/log updated; Fresh start, Water, and Reading cards and their localStorage log entries remain exactly as originally seeded (verified live for this exact click in this session)

#### 7.2. Mixed check/uncheck states across multiple rituals persist correctly across reload

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. From the standard 4-ritual fixture, check 'Fresh start' and un-check 'Water' (two independent toggles on two different cards)
    - expect: Fresh start is now done (streak 1); Water is no longer done (streak reverted to reflect only dayKey(-1) remaining)
  2. Reload the page
    - expect: After reload: Fresh start remains done (streak 1), Water remains not-done, Morning breath and Reading remain exactly as originally seeded - i.e. all four independent states round-trip through localStorage correctly, extending the existing single-ritual reload test to multiple simultaneous rituals

#### 7.3. Backup export/import round-trip preserves rituals (reference)

**File:** `tests/ritual.spec.js`

**Steps:**
  1. Already covered by 'backup export includes rituals and import restores them' in tests/ritual.spec.js. No new automation needed.
    - expect: Existing test exports, wipes localStorage rituals, imports, and asserts the ritual is restored by name.

### 8. Data Robustness

**Seed:** `tests-generated/seed.spec.js`

#### 8.1. normLog cleans up malformed log entries on load

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual directly in localStorage with a log containing an unpadded date (e.g. dayKey(-1) rewritten without zero-padding), a duplicate of a valid recent date, and an unparsable string (e.g. 'not-a-date'). Navigate to Home.
    - expect: The app does not crash and the card renders; the STREAK reflects the cleaned log, i.e. the unpadded date counts as its padded equivalent, the duplicate counts once, and 'not-a-date' is ignored
  2. Read rituals back out of localStorage WITHOUT interacting with the card first
    - expect: The stored log is still the raw, malformed one. **This is correct behaviour, not a bug.** `loadCache` runs `_cache.forEach(r => r.log = normLog(r.log))` and then returns; it never calls `save()`. Every `save()` in the module sits behind a user action (toggle, 2-min, create, edit, delete, backfill), so normalisation is in-memory until the first write.
  3. Click .r-tick to check the ritual, then read rituals from localStorage again
    - expect: NOW the stored log is normalized (zero-padded, de-duplicated, unparsable entries dropped) per module note M2, because `toggleCheck` called `save()` on the already-cleaned `_cache`

**Correction: an earlier draft of this scenario asserted the normalized log was readable from localStorage straight after load.** That expectation is false and the test would have gone red against correct code - the worst kind of failure, because the obvious "fix" is to make the app persist on boot, adding a write to every cold start to satisfy a test that was wrong. The behaviour under test is the streak calculation (step 1) and the write-through (step 3), not the load.

#### 8.2. recordStreak's longest-run value: confirm whether it is surfaced in the UI

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
**RESOLVED. This is no longer investigative.** An earlier draft asked the generator to go and find
out whether the record value is rendered anywhere. That is a research task, not a specification, and
handing it to the generator would have produced either a guess or an empty test. It was settled by
running it, and the answer is yes: `ritStatCard` renders the record beside the current streak in the
Progress view, in a `.rst-card` with two `.rst-nb` blocks.

Probed live with exactly the fixture below, in Romanian:

```
HOME   { streak: "2", unit: "zile" }
STATS  { name: "Beta", nums: [ { n: "2", label: "serie curentă" },
                               { n: "5", label: "record" } ] }
```

**Steps:**
  1. Seed one ritual with a broken-then-resumed log, so the record and the current streak are different numbers and neither can be mistaken for the other: five consecutive days ending ten days ago, a gap, then two days ending yesterday.
    - expect: On Home, the card's streak reads '2' with the unit 'zile'
  2. Open Progress via the `.petal[data-v="stats"]` control and wait for the first `.rst-card`
    - expect: The card for that ritual shows two numbers. The one labelled `serie curentă` reads '2', the one labelled `record` reads '5'
  3. Assert the two blocks by their label rather than by their position
    - expect: Reading them positionally would pass even if the two numbers were swapped, which is exactly the mutation this scenario has to catch (see the register, #31). Locate each `.rst-nb` by the label it contains, then assert its `.rst-n`

### 9. Streak arithmetic at the boundaries

**Seed:** `tests-generated/seed.spec.js`

The streak calculation is the only real logic in this module, and every scenario above exercises it
incidentally while testing something else. These scenarios test it directly, by seeding a log and
asserting the number the app renders from it.

**Why this is driven through the DOM and not as unit tests.** The module deliberately exports its
pure functions, `_calc: { dkey, dueToday, isDone, streakOf, missedYesterday, recordStreak,
voteLabel }`, which looks like an invitation to call them from `page.evaluate` and test the
arithmetic without a browser round trip. It is not reachable. The entire script block is wrapped in
one IIFE, so `const Ritual` never reaches the global scope. Probed live: `typeof window.Ritual` is
`undefined`, and a bare `Ritual` inside `page.evaluate` throws `ReferenceError: Ritual is not
defined`. Do not propose a test seam to get at it. Playwright's own guidance is to test user-visible
behaviour, and the rendered streak IS the user-visible consequence of the arithmetic, so going
through the DOM is the correct altitude rather than a compromise. This paragraph exists so nobody
rediscovers `_calc` in six months and re-opens a settled question.

#### 9.1. Singular and plural unit at the 1-to-2 boundary

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed one ritual whose log is exactly `[dayKey(0)]`, so today is done and the streak is 1
    - expect: `.r-n` reads '1' and `.r-fl` reads the SINGULAR unit, `zi`, from `t('rit_day')`
  2. Seed a second ritual whose log is `[dayKey(0), dayKey(-1)]`
    - expect: `.r-n` reads '2' and `.r-fl` reads the plural, `zile`, from `t('rit_days')`
  3. kills: change `streak===1 ? t('rit_day') : t('rit_days')` to always use the plural

#### 9.2. A run that crosses a month boundary counts as consecutive

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Freeze the clock with `page.clock.install({ time: ... })` at the 3rd of a month, and pin the timezone with `test.use({ timezoneId: 'Europe/Bucharest' })`. Seed a log of five consecutive days running back across the 1st into the previous month.
    - expect: `.r-n` reads '5'. The date keys change month mid-run, and the calculation must not treat that as a gap
  2. kills: replace the date walk in `streakOf` with day-of-month arithmetic

#### 9.3. A run that crosses a year boundary counts as consecutive

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Same technique, clock frozen at 2 January, log running back across 31 December
    - expect: `.r-n` reads the full run length, unbroken across the year change
  2. kills: the same mutation as 9.2, and any string comparison of date keys that assumes a stable prefix

#### 9.4. The day boundary itself: a check made just before midnight belongs to that day

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. `page.clock.install()` at 23:58 local, seed one not-done ritual, and check it
    - expect: The log gains the key for the day that is ending, not the one about to start
  2. `page.clock.fastForward('5:00')` to move past midnight, then reload
    - expect: The card is no longer done, the streak now counts the previous day, and the 7-day dot row has shifted by one. Nothing was lost and nothing was double-counted
  3. kills: any caching of `todayD()` outside the function

**Why this scenario exists at all.** `todayD()` reads the machine's local clock at call time, so
without a frozen clock a suite run starting at 23:59:59 can seed one day and assert another. That is
a real flake source that neither `--repeat-each` nor isolation catches, because it depends on when
you run rather than on how. `page.clock` and `timezoneId` are both available in the installed
Playwright, 1.62.0, checked in `node_modules/playwright-core/types/types.d.ts` rather than recalled.

#### 9.5. A long log renders without breaking the layout

**File:** one file per scenario under `tests-generated/`, named from the scenario (see the file policy)

**Steps:**
  1. Seed a ritual with roughly 400 consecutive days ending today
    - expect: `.r-n` reads the full number, the card still renders, and the 7-day dot row still shows exactly seven dots rather than growing with the log
  2. kills: making `weekDots` iterate the log instead of the fixed seven-day window
