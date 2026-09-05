# Phase 0 baseline

The numbers this arc is measured against, taken before anything in it was built. A cleanup without a
measurement is a matter of taste, and a before-and-after that acquires its "before" afterwards is not
a comparison.

Nothing here is derived on demand, which is why it is a committed report rather than a section of
`docs/QA-STATUS.md`. That file keeps no numbers of its own, on purpose. This one is a snapshot and
cannot be regenerated later, because the thing it describes is about to change.

Measured on commit `a160dc0`, branch `qa/test-architecture`, before the first phase 1 edit.

## How it was measured

    cd quality/e2e
    npx playwright test --project=mobile-chromium
    npx playwright test --project=mobile-chromium --repeat-each=5

One Windows machine, 4 cores, headless. Playwright 1.62.0. Workers left at the local default, which
resolves to 2 here; CI pins 2 per shard and runs 2 shards. Retries are 1 locally and 2 in CI, so a
test that needed one would have been reported as flaky rather than passed.

## Wall clock

| Run | Executions | Result | Time |
|---|---|---|---|
| one full pass | 83 | 83 passed | 503 s, 8.2 min |
| five passes | 415 | 415 passed | 1595 s, 26.5 min |

The same suite in CI finishes in roughly 1 to 3 minutes per shard across 2 shards. The local number
is the one to compare future local runs against; the two are not interchangeable.

## Flake rate

**0 of 415.** No test failed, and no retry was consumed although one was available.

That is a real result, and it is also a small sample. Five repetitions on one machine cannot see a
flake that needs a slower runner, a cold cache, or a different core count. It is a floor, not a
guarantee, and the honest reading is that the suite has no flake this measurement can reach.

## Size

| Area | Files | Lines |
|---|---|---|
| `quality/e2e/tests` | 20 | 1459 |
| `quality/e2e/tests-prod` | 1 | 105 |
| `quality/e2e/tests/helpers.js` | 1 | 136 |

Test counts are not recorded here. `node quality/e2e/count-tests.js` owns that number and reported
this at the time of measurement:

    {"functional":{"tests":83,"files":19},"visual":{"tests":2},"prod":{"tests":7,"files":1},"quarantine":{"tests":2,"files":2}}

## Locator strategies for one action

Five distinct ways to reach the Settings screen:

1. `page.getByRole('button', { name: 'Settings', exact: true })`
2. `page.locator('#profMode').getByRole('button', { name: 'Settings', exact: true })`
3. `page.locator('#profMode').getByRole('button', { name: 'Settings' })`
4. `seg(page, 'Settings')`, a helper local to `quality/e2e/tests/profile.spec.js`
5. `openSettings(page)`, a helper local to `quality/e2e/tests/cycle.spec.js`

## A correction to the plan, from measuring it

The plan said two of those five were latent strict-mode failures. Measured against the running app,
that is not where the problem is. All four Settings locator forms resolve to exactly one element on
the Profile screen.

The ambiguity is on **Profile**, unscoped:

| Screen | `getByRole('button', { name: 'Profile', exact: true })` resolves to |
|---|---|
| Home | 1 element |
| Profile | 2 elements, one inside `#profMode` and one in the bottom navigation |

Clicking it a second time throws `strict mode violation: resolved to 2 elements`. This was triggered
on demand rather than inferred. It does not fail today only because no test presses Profile while
already on Profile.

It matters for phase 6: the Profile page object has to scope its locator, or the refactor introduces
this failure the moment any test navigates from Profile to Profile.

## What this does not measure

- Anything about a real device. Headless Chromium is not a phone.
- Coverage. The suite passing says nothing about what it would catch, which is the question phase 5
  exists to answer with the mutation audit.
- CI timing under load. The shard times quoted above are observations from recent runs, not a
  controlled measurement.
