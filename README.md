# Mi Día

A Mediterranean daily planner and reflective journal, built as a single self-contained HTML file
and shipped as an installable PWA. It works offline, stores everything in the browser, and sends
nothing to a server.

**Live:** https://mi-dia-app.pages.dev

[![e2e](https://github.com/InesPatricia/Mi-Dia-App/actions/workflows/e2e.yml/badge.svg)](https://github.com/InesPatricia/Mi-Dia-App/actions/workflows/e2e.yml)
![Tests](https://img.shields.io/badge/e2e-113%20Playwright%20tests-2EAD33)
![Stack](https://img.shields.io/badge/Playwright%201.63-Node%2020-blue)
![Build](https://img.shields.io/badge/build-none%20(zero%20tooling)-lightgrey)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-orange)

---

## What this repository actually is

A real product, and a laboratory. I use it to try a quality practice at a scale where I own every
part of it, before I would propose that practice to a team that has to live with my mistakes.

The app is the subject. The interesting part is the system around it: what gates a change, what
just watches it, what happens when something breaks, and how long it takes me to find out.

I am a QA and AI engineer, so most of what follows is about how this thing is tested and shipped.
The parts worth your time are the ones where it went wrong. A gate that ran green for weeks without
ever firing. A checker that refused correct code. An agent whose workflow reported success for six
weeks while it produced nothing at all. Each is written up below with how it was found. If you came
for the app, it is at the bottom, and it is quite pretty.

---

## The constraint that shaped everything

The whole application is **one HTML file**: markup, styles and JavaScript in a single document. No
build step, no bundler, no npm at runtime, no backend. The only companion is `sw.js`, because
browsers insist a service worker be its own file and browsers do not negotiate.

That buys real things. The file opens by double-clicking it. There is no dependency tree to
compromise. The first paint costs one request. It also costs real things, and I would rather list
them than pretend they are not there:

- **No build step means no CSP nonces.** Per-response nonces need a build, so the
  Content-Security-Policy allows `unsafe-inline`. An accepted risk with compensating controls
  written down. Not an oversight, just a bill.
- **No modules means no cherry-picking a feature.** The served artifact is one whole file, so
  shipping feature A while holding feature B is not a `git cherry-pick`. Work is ordered instead so
  optional features land last, and a release targets whichever `mi-dia-vNN.html` is the clean cut.
- **One file grows.** New features are written as separate modules on a five-layer pattern (data,
  calc, i18n, view, wiring) with pure calc functions, then inlined. An incremental migration, not a
  rewrite, because rewrites are how projects die.

Deployment is Cloudflare Pages from `main`, with one-click rollback. The output directory is
declared in `wrangler.toml` rather than in the dashboard, because nobody can review a checkbox they
cannot see. A permanent `staging` branch gets its own preview on a separate subdomain, with its own
cache, service worker and storage.

---

## How it is tested

**113 end-to-end tests across 25 specs**, Playwright on mobile Chromium, because the app is
phone-first. A desktop viewport tests a layout nobody uses. Plus 7 smoke tests against the live
site.

I do not type that number. `quality/e2e/count-tests.js` asks the runner and CI fails if the badge
disagrees, because published numbers go stale and this one cannot. Asking the runner also beats
counting `test(` in the source, which goes wrong in both directions at once: it misses tests
generated at runtime, and it counts things that were never tests (`/favicon/i.test(path)` is a regex
call having a bad day).

### Four levels, and why the number above is only one of them

That count is the end-to-end level. There are four. Building them was mostly a matter of noticing
that questions were being asked at the wrong height, and moving them down.

| Level | What it holds still | Run it |
|---|---|---|
| Unit | no browser, no storage, one pure function and its arithmetic | `cd quality/unit && node --test` |
| Integration | a browser, but nothing above the storage boundary | `npx playwright test --project=integration` |
| End to end | the whole app, driven the way a person drives it | `npx playwright test --project=mobile-chromium` |
| Delivery | whether the artifact that got published is the one that was tested | `npx playwright test --config=playwright.prod.config.js` |

Every new case goes to the lowest level that can hold it. That is what stops the end-to-end suite
absorbing everything, and it is why the streak arithmetic once asserted through a browser now runs
against a pure function, with the whole unit level finishing in about a second. That level loads
those functions in a sandbox whose global object starts empty, which turns "this block is pure" from
a comment into a fact.

Delivery is separate on purpose, because folding it into end to end is the most common way the two
get confused. End to end asks whether the code is right. Delivery asks whether what reached
production is what was checked, and that fails for its own reasons: a promotion that copied the
wrong file, a service worker naming a cache that no longer matches, a CDN still serving something
that was withdrawn.

Tests check the DOM **and** the data the app persisted to localStorage, because a slot can look
perfect on screen and still have been saved with the wrong duration. `getByRole` and `getByLabel`
drive most of the suite, which puts the tests on the same path a screen reader takes; structural
selectors appear only where a control has no stable accessible name, with a comment wherever that
happens. axe-core runs across all views on a curated rule set covering names, roles, labels and
valid ARIA. Colour contrast sits outside it on purpose, because a rule that fires on every brand
colour trains you to ignore it, and then you ignore the one that mattered.

For larger features, the person writing the code and the person writing the tests work from the
same spec and never read each other's work
([template](quality/e2e/SPEC-TEMPLATE.md)). It removes author bias, so the tests describe the agreed
behaviour instead of the shipped implementation.

What the suite cannot reach gets its own list: [`docs/DEVICE-PASS.md`](docs/DEVICE-PASS.md),
organised by the reason each check exists rather than by screen.

---

## Do the tests actually catch anything?

A test count is a claim about effort. It says nothing about whether a defect would be noticed, and
the two come apart more often than is comfortable.

**Every check here was accepted the same way.** Break the thing it watches, on purpose, watch the
check go red, and only then keep it. Every tool written for this repository was found to have a
defect that way, including the one that generates the status document. A check that has never failed
is not yet a check, it is an intention.

The most recent example is the plainest. The checker that refuses a silently disabled test had been
relied on for five phases and had no tests of its own, so I wrote them. They found that it refused
`{ skip: false }`, which is code it exists to allow: a whitespace quantifier could backtrack to zero
width, leaving the guard standing in front of the space where it passed for free. A merge-blocking
check that refuses correct code is the same class of defect as one that allows wrong code, and
nothing would have found it except pointing the check at a case it was supposed to be fine with.

**And the suite gets the same treatment, automatically.** `quality/tools/mutate.mjs` introduces a
real defect into the application, one at a time, runs every level, and records which ones go red. A
level that stays green under a mutant that reached it is not doing its job, whatever its test count
says.

That audit found two blind spots no amount of reading the suite would have shown, because both
looked thoroughly covered:

- The write that gives a new user their two starting rituals could be **deleted entirely** and the
  whole functional suite still passed. Every ritual spec seeded its own data, so the application's
  own first-run path was never taken by anything.
- A cycle phase boundary could move by a day and only the unit level noticed, although the phase is
  on screen in front of the user.

Both are closed now, at the height a user would meet them, and both closures were proved by
re-applying the mutant and watching the new test fail.

**The most recent specs found three real defects on their first run.** A keyboard spec drives the
four dialogs the way somebody without a mouse does, and none of them traps Tab, three drop focus
when they close, and one never takes focus at all. I did not fix them in that change. It was the QA
branch, the fix is application code, and a repair folded into the diff that found it is a repair
nobody can review against the defect it closes. They are written up with their evidence in
[`quality/e2e/specs/BUGS.md`](quality/e2e/specs/BUGS.md), and the failing cases run as declared
expected failures. They still execute, they fail for the reason written beside them, and the day
someone fixes the app they go red for passing, which is the signal to delete the annotation.

That last decision needed a gate widened in the same change that first used the exemption, because
an expected failure is one word away from a silently skipped test and the checker only refused the
second one.

---

## Gates and nets

The distinction I care most about: **a gate blocks, a net observes.** Gates run before merge with
zero tolerance. Nets run after and are tuned with headroom, because a check that cries wolf gets
ignored, and an ignored check also costs you the illusion of safety. Full picture, diagram included,
in [`docs/QA-ARCHITECTURE.md`](docs/QA-ARCHITECTURE.md).

**Gates.** A fast build-validation job (div balance, every inline script parses, no browser,
seconds), then the suite across two shards with two workers each, merging into one report, and in
parallel a smoke suite against the Cloudflare preview the pull request actually built.

"Blocks the merge" is a claim about configuration, so here is the configuration. The required checks
on `main` are exactly `validate build`, `test (shard 1/2)`, `test (shard 2/2)` and `preview smoke`.
Anything else runs, reports, and stops precisely nothing, however gate-shaped it looks in a diagram.
The preview smoke spent weeks on the wrong side of that line, which is the first incident below.
Repairing a check and arming it are two separate acts, and I now know that in my bones.

**Nets.** After deploy, a smoke suite re-checks production once a poller confirms the new build is
genuinely live, by watching the service worker for the expected cache name. A passive security scan
runs weekly. And `verify-live` opens the published README in a real browser and asks the live site
which paths it actually serves, because both failure modes it looks for are invisible locally:
GitHub renders markdown client-side, and a static host answers 200 for paths it does not publish. It
found something on its first run, which is in the runbook.

The rule underneath all of it: **measure first, then set the threshold below the measurement.**

---

## Performance and security

Lighthouse CI asserts budgets on every pull request preview and after every deploy, so a regression
shows up before merge rather than as a bug report. Each threshold in
[`quality/perf/lighthouserc.cjs`](quality/perf/lighthouserc.cjs) carries the measured baseline it
came from, in a comment beside it. A k6 smoke baselines CDN delivery with one budget overall and one
per route, because a single slow file hides inside an aggregate when four fast ones average it away.
It asserts p(95), since the mean hides the tail and the tail is the part users feel.

A passive OWASP ZAP scan runs weekly against production, which is the honest match for a static site
with no backend to probe. Every finding becomes either a shipped fix or a written accepted risk, and
the accepted ones are encoded so the scan works as a tripwire: known findings stay quiet, any **new**
one turns it red. The triage with before-and-after deltas is in
[`docs/SECURITY-NOTES.md`](docs/SECURITY-NOTES.md), and the fixes ship through a hardened
[`public/_headers`](public/_headers).

That tripwire spent seven weeks disconnected, and the fifth incident below is what it took to
notice.

---

## AI in the quality loop

Two different things, kept apart because interviews and blog posts love to blur them. Full write-up
in [`docs/AGENTIC-QA.md`](docs/AGENTIC-QA.md).

**AI as a tool here.** When the suite fails on a pull request, a triage agent correlates the diff
with the failing logs and posts one comment: likely cause, most suspect file, repro steps. It
updates that comment on re-runs, because nobody has ever been helped by a robot repeating itself.
Two decisions in it matter more than the feature. It is triggered by `workflow_run` and not
`pull_request`, so **untrusted input is handled by trusted code from `main`** and a hostile PR
cannot edit the agent into handing over the API key. And it fails safe: no key, log and exit zero. A
broken helper must never turn a pull request red. Only real gates get to do that.

That fail-safe is also how the agent hid for six weeks. It shipped asking for `ANTHROPIC_API_KEY`,
and this repository has only ever had `OPENROUTER_API_KEY`, so every run took the missing-key path,
logged, and exited zero. The workflow stayed green and the agent produced nothing at all. I found it
by reading a run log, not because anything was watching. Provider resolution now accepts either key,
and the decisions that used to live inside the network call moved into a library with 24 fixtures
that need no key and no requests, wired into the build-validation job. The first fixture is named
after the incident and goes red when the bug is put back.

**Testing a system that is itself agentic** is a different problem, and it lives in
[`quality/evals/`](quality/evals/). A golden dataset is scored twice: first by deterministic property
assertions that check the schema and catch invented fields, then by a second model reading the
answer against the reference. That judge runs on a different model from the one under test, since a
model grading its own homework tends to be generous. The suite passes on an aggregate pass-rate
floor, because in a probabilistic system one unlucky case is weather and a falling rate is climate.

A real verdict from
[`quality/evals/sample-run.json`](quality/evals/sample-run.json), an actual captured run:

```json
{ "id": "read-evening", "status": "fail",
  "got": { "title": "Read my book", "time": null, "category": "learning" },
  "detail": "category learning != rest" }
```

That sentence was "Read my book for an hour tonight". The properties are all fine, the model just
files reading under learning while the reference calls it rest. Honestly, both of us have a point.
The case stays in the set, because a golden dataset where every answer is obvious is flattering
itself.

Writing the harness taught me less than running it did. The first real run found three defects and
all three were mine. An em dash in an HTTP header made `fetch` throw before a single request left
the laptop, so all ten cases failed in exactly the same way. The token budget sat at 400, which
quietly starves reasoning models, since their thinking is billed to the same allowance as their
answer. And the process exited through a path that trips an assertion on Windows, so it reported a
crash instead of its own result. When an entire suite fails identically, the instrument is broken
and the subject is innocent.

So the runner now sorts failures into two piles. A wrong answer counts against the model. A rate
limit or a dead socket counts against nobody, drops out of the denominator, and comes back as
`INCONCLUSIVE` with its own exit code, so a red build means one thing at a time. That distinction
earned its keep the same afternoon, when the free-tier quota ran out mid-run and the report said so
in plain language.

Three gaps stay open, and the directory README says them out loud. The judge has never been
calibrated against human verdicts, a single run is not a baseline, and the guardrail,
prompt-injection and cost cases exist as a plan rather than as code.

---

## Internal tooling

Small scripts I wrote because I got tired of doing something by hand. This is the part of quality
work that never shows up in a test count and saves the most time.

| Tool | What it removes |
|---|---|
| `quality/e2e/validate-build.js` | Checks div balance and parses every inline script. The single-file format has no compiler, so this is the compiler. |
| `quality/e2e/count-tests.js` | Makes the published test count a verified fact, not a memory. |
| `quality/e2e/wait-for-deploy.js` | Polls until the CDN has actually published, so post-deploy smoke stops racing the deployment and losing. |
| `quality/e2e/theme-grid.js` | Screenshots every view in both themes as one review grid, which is how theme bugs get caught before they ship. |
| `quality/tools/check-docs.mjs` | Gates the documentation: dead links, stale test counts, build numbers written into a file that lives on three branches. |
| `quality/tools/verify-live.mjs` | Checks a page where it is actually served, because local rendering lies and a 200 proves nothing. |

Repeatable procedures live as executable checklists in `.claude/skills/`, including the two habits
that cost me most to learn: verify a claim where it runs, and keep two branches from drifting apart.
They exist so the reasoning survives me forgetting it, which it reliably does.

---

## Repository layout

Each folder answers exactly one question. If you cannot say which question a file answers, it does
not have a home yet.

| Folder | The question it answers |
|---|---|
| `public/` | **What ships?** The promoted build, the service worker, and the two files Cloudflare reads. This is the build output directory, so nothing else reaches the CDN. |
| `src/` | **What do I edit?** The versioned builds, and the module sources inlined into them. |
| `quality/` | **How is it verified?** End-to-end tests, performance budgets, the security scan config, the agentic-AI evals, and the tooling behind them. |
| `docs/` | **What does it mean?** Data schema, design system, current behaviour, security notes, runbook, and the full build archive. |
| `private/`, `scratch/` | Working notes and work in flight. Gitignored, never published. |

One consequence worth naming, because it looks like an inconsistency: `src/modules/*.js` are **not
loaded by the app**. They are readable sources inlined into the single-file build. They used to sit
in the root, where they looked exactly like application code and were served to every visitor.

---

## Documentation architecture

The project's context file had grown to 1,852 lines, and an agent read all of it before every
session. That was the visible problem. The real one was that the file had become an interface: five
other files read its internal structure, and nothing checked that what they read still existed.

Three defects were sitting in the repository at the same time, and nothing caught any of them.
Three skills routed work to a section heading that had been deleted. Two files stated different test
counts without either being wrong. And `Mi-Dia-App` and `Mi-Dia-QA` are worktrees of this repository
at different branches, so the same filename described two different states of the app: the QA
worktree was instructing agents to build a feature that had shipped fourteen commits earlier.

The fix was to split the file by audience, then treat the result the way the app is treated. As
something a machine checks. People forget; scripts do not.

**Nothing that varies by branch is written down.** The current build, the test count and the current
arc are commands to run, not sentences to read, because a file shared by three branches cannot state
a build number without being wrong on two of them.

**Mandatory per-session context went from 170,934 bytes to 6,184**, a 96% reduction, with no history
lost. The archive is complete and a rule proves it.

`quality/tools/check-docs.mjs` runs on every pull request and goes red on eleven things, among them
a dead path, a test count that disagrees with the runner, a router that has forked between
branches, and a stack badge left behind by a dependency bump.

Two of those exist because the checker was blind to them for weeks. Links were compared with a
filesystem that folds case, so a link 404ing on GitHub passed here on every run; and a file tracked
twice under two spellings looked like one file on this laptop and like two on a Linux runner. Both
now have tests that fail without the fix.

It has **its own tests, including negative cases**, 43 of them, because a checker nobody checks is
the first incident below wearing a different filename. It is not on the required-checks list yet,
which by this repository's own standard makes it a reporter rather than a gate. That is a settings
change, and it is on the list.

---

## When it breaks

The incidents below are things I broke once. [`docs/RUNBOOK.md`](docs/RUNBOOK.md) is what to do when
something is wrong now: which build is genuinely live, how to roll back, what each red check means,
and the traps that make a good deploy look broken. A service worker serving you yesterday's app, for
instance, or a Cloudflare 200 that is really a fallback page wearing a convincing hat.

---

## Five things I got wrong

I keep an incident list because I forget things, and because the failures taught me more than the
features did. Three of the five are the same shape, and it took me until the fifth to see it.

**1. A gate that never ran.** I set up the pre-merge preview smoke, saw it go green, and moved on.
It was not firing. For weeks I had a check that looked like coverage and provided none. That is
worse than an empty slot in the pipeline. An empty slot at least makes you nervous. Now I audit the
pipeline itself on a schedule and confirm each check runs what I think it runs. I have found this
same failure twice since, which tells you how easy it is to miss.

**2. A dependency bump that exposed a dead runtime.** Dependabot proposed a routine Playwright
upgrade and it failed. I had left CI on Node 18, which had gone end of life without my noticing. The
bump was the messenger. CI moved to Node 20 that afternoon. This is most of the argument for keeping
routine updates switched on: they drag stale truths into the open on someone else's schedule.

**3. A CSP that would have broken fonts in production.** The service worker re-issues every GET
through `fetch()` inside the worker, and worker fetches are governed by the `connect-src` of the
policy delivered **on the `sw.js` response**, not on the page. My first draft used a plain
`connect-src 'self'`, which would have silently killed font loading for everyone. The branch preview
caught it before production did. That is the entire case for isolated previews, in one sentence.

**4. Screenshot baselines I let turn into fossils.** The two visual-regression tests were excluded
from CI because their baselines are OS-specific, so they only ever ran on my laptop. I last
regenerated them at build v143. The current build is v172: thirty versions and a full design-token
refactor later, with nothing checking them in between, until a Playwright upgrade invalidated the
lot without a single signal firing. A test that runs on one machine is a hobby with good intentions.

They are gone now, and what replaced them is not another screenshot. The two design-locked
components are pinned as a tree of roles and accessible names instead, which does not depend on the
operating system or the font stack and therefore runs in CI on every pull request. It catches the
defect class this app has actually shipped twice, a control losing its accessible name.

Writing it turned up a limit worth recording. The tree assertion is a containment match, so a
control that disappears fails it while a control that is **added** does not. I found that by adding
one and watching the check stay green, which is the same move that found everything else on this
page. Each tree now carries a count of the controls its component exposes, and the added button
turns it red. The reassuring part of the old story stands: after thirty builds the pixel drift was a
single pixel. The test was worth having. It just was not guarded by anything, and a check nothing
runs is not a check.

**5. A security tripwire that had been disconnected for seven weeks.** The weekly ZAP scan is
supposed to stay quiet on accepted risks and go red on anything new. It went red on 3 August and on
every Monday after that, and I did not look, because a scheduled job that nobody watches is a job
nobody watches. When I finally read the log, none of the seven failures was a security finding:

```
Failed to load config file /zap/wrk/quality/security/rules.tsv
Unexpected number of tokens on line - there should be at least 3, tab separated: 10055  IGNORE
```

The scan had not found nothing. **It had never started.** ZAP's loader wants three tab-separated
columns per rule and the file had two, so it raised before the first request went out. The file was
byte-identical to the version that passed on 28 July. Nobody edited it. The workflow pulls
`zaproxy:stable`, an unpinned tag, and a release moved under it.

The trap inside the fix is worth the sentence it costs. An empty third column looks like the
obvious answer and is wrong: the loader counts tabs on the raw line, then `rstrip`s it before
unpacking, so a trailing tab passes the check and crashes one line later. The third column has to
carry something, and for an `IGNORE` it is a note rather than a URL regex, so the per-rule notes
moved out of the header comment and onto the rules they describe.

**That is the third time an upstream moved under a check here**, after the Playwright bump that
invalidated the pixel baselines and the Playwright bump that exposed a dead Node runtime. I had
written those up as separate stories. They are one story, and the detail that stings is that I had
already tried to defend against it. The ZAP action is pinned to a full commit SHA. The Docker image
that action pulls, which is the part that does the work, is `zaproxy:stable`. I pinned the wrapper
and left the engine floating, which bought me a version number in the diff and no protection at all.

---

## What this does not cover

Knowing the limits of your own coverage is part of the job. The e2e suite covers logic, DOM,
navigation, persistence, i18n and accessibility in headless Chromium, on one mobile project. There
is no WebKit and no real device, so the Android pass stays manual. The k6 layer measures CDN
delivery of a static PWA, since there is no backend to load. The ZAP scan is passive and is not a
penetration test. Nothing looks at pixels any more: the accessibility contract that replaced the
screenshots catches a control that loses its name, and says nothing about whether the app is
beautiful.

---

## Running it

The app is one file. Open [`public/index.html`](public/index.html) in a browser. Nothing to install
and nothing to build, which is either refreshing or unsettling depending on your decade.

```bash
cd quality/e2e
npm ci
npx playwright install --with-deps chromium
npm test              # everything the merge gate runs: functional + integration
npm run test:unit     # the unit level (no browser, from ../unit)
npm run count         # what the runner says the counts are
npm run validate      # structural check of the single-file build
npm run test:report   # open the interactive HTML report
```

---

## The app itself

Plan a day in time slots, with guided journaling, projects, a calendar, progress statistics,
identity-based rituals with streaks, and breathing tools. Trilingual in English, Spanish and
Romanian. Two complete themes on a moon and sun toggle: Light-luxe in champagne, wine and gilt, and
Dark-velvet in aubergine and gilt. All data stays in the browser.

<table>
  <tr><th width="50%">Light-luxe</th><th width="50%">Dark-velvet</th></tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/day-light.png" alt="Day view in the light theme, showing the flower navigation, daily phrase and rituals"><br><sub><b>Day</b>: flower navigation, daily phrase and rituals</sub></td>
    <td valign="top"><img src="docs/screenshots/day-dark.png" alt="Day view in the dark-velvet theme"><br><sub><b>Day</b> in dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/journal-light.png" alt="Journal in the light theme, showing mood selection and reflective writing"><br><sub><b>Journal</b>: mood and reflective writing, autosaved</sub></td>
    <td valign="top"><img src="docs/screenshots/journal-dark.png" alt="Journal in the dark-velvet theme"><br><sub><b>Journal</b> in dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/calendar-light.png" alt="Calendar in the light theme, showing the plan and mood lenses"><br><sub><b>Calendar</b>: plan and mood lenses, completion rings</sub></td>
    <td valign="top"><img src="docs/screenshots/calendar-dark.png" alt="Calendar in the dark-velvet theme"><br><sub><b>Calendar</b> in dark-velvet</sub></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/progress-light.png" alt="Progress in the light theme, showing streak, hours by area and mood against productivity"><br><sub><b>Progress</b>: streak, hours by area, mood against productivity</sub></td>
    <td valign="top"><img src="docs/screenshots/progress-dark.png" alt="Progress in the dark-velvet theme"><br><sub><b>Progress</b> in dark-velvet</sub></td>
  </tr>
</table>

Storage contract in [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md), design system in
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md), current behaviour in
[`docs/APP-REFERENCE.md`](docs/APP-REFERENCE.md).

---

## Otros idiomas

<details>
<summary><b>Español</b></summary>

Un planificador y diario mediterráneo: franjas horarias, diario guiado, proyectos, calendario,
estadísticas y herramientas de calma. Un único archivo, así que basta con abrir `index.html` en el
navegador, y todos los datos se guardan en el dispositivo. Copia de seguridad desde la pestaña Día.
</details>

<details>
<summary><b>Română</b></summary>

Un planner și jurnal mediteranean: sloturi orare, ritualuri cu serie, onboarding ghidat, jurnal
ghidat, proiecte, calendar, statistici și unelte de calm. Un singur fișier, deci e destul să
deschizi `index.html` în browser, și toate datele rămân pe dispozitiv. Backup din tab-ul Zi.
</details>

---

## License

Copyright 2026 Ines Patricia. Licensed under
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): share and adapt for non-commercial
purposes with attribution, commercial use by permission. See [`LICENSE`](LICENSE).

Code and comments are in English. The application interface is trilingual.
