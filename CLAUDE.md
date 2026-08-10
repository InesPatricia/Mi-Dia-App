# Mi Día — agent runtime

This file routes a session. It holds only what is true on every branch; anything that changes per
build is derived by running a command, never written down here. Depth lives in `docs/`, read on
demand. Enforced by `node scripts/check-docs.mjs`.

<orientation>
Do this before anything else. Two directories on this machine are worktrees of the same repository,
checked out at different branches, so the same filename can describe different states of the app.

    git branch --show-current
    git worktree list

| Branch    | What it is                     | What you are expected to do there              |
|-----------|--------------------------------|------------------------------------------------|
| `main`    | shipped production             | releases and hotfixes                          |
| `staging` | the product arc in progress    | build features, one slice per build            |
| `qa/*`    | QA and CI infrastructure       | tests, gates, tooling — **not** app features    |
| `docs/*`  | documentation                  | the files described below                      |

Never assume the state of another worktree. If a task refers to work you cannot see, check whether
it already exists on another branch (`git log --oneline main..staging`) before building it.
</orientation>

<critical_directives>
Each rule names the command that enforces it. If a rule has no command, it is a preference, not a
rule, and belongs in `docs/APP-REFERENCE.md`.

**Language.** Reply in Romanian **without diacritics** — write `a i s t`, not `ă î ș ț`. The terminal
renders them as garbage, which makes replies unreadable. Applies to every chat response, every
session. Files and code comments may use whatever they already use; anything visible in git is
English.

**Versioning: never edit a build in place.** The app is one self-contained file, `mi-dia-vNN.html`.
Every change creates a new file with the next `NN`. The previous build is a rollback point, so
overwriting one destroys it. A release copies the chosen build to `index.html` and updates the
`CACHE` name in `sw.js` to match.
→ `node .claude/skills/ship/validate.mjs`

**Validation after every edit, before saying it is done.** Div balance must be equal, and every
`<script>` block must parse. Then run the suite.
→ `node e2e/validate-build.js`
→ `cd e2e && npx playwright test --grep-invert @visual`

**Visual changes get a second gate.** Any change to colour, theme, tokens or layout is reviewed in
both themes as one grid, because dark-mode legibility bugs do not show up in a single screenshot.
→ `node e2e/theme-grid.js ../mi-dia-vNN.html`
→ rules: `docs/DESIGN_SYSTEM.md`

**No unrequested refactoring.** Prefer targeted edits over rewriting a section. The `--rose-1..4`
colour family is locked: change what consumes it, never the tokens themselves.

**Documentation is gated like code.** Adding a doc, moving a section or changing a test count runs
through the same checker as everything else, including its own tests.
→ `node scripts/check-docs.mjs`
→ `node --test scripts/check-docs.test.mjs`
</critical_directives>

<architecture>
One self-contained HTML file: markup, styles and JavaScript in a single document. No build step, no
bundler, no npm at runtime, no backend, no framework. The UI is built with plain DOM calls.

`sw.js` is a deliberate exception — browsers require a service worker to be its own file.

All state is in `localStorage`; nothing is sent anywhere and there are no accounts. New features are
written as self-contained modules on a five-layer pattern (data, calc, i18n, view, wiring) with pure
calc functions, kept as readable source files outside `public/` and inlined into the build.

Deployed on Cloudflare Pages, publishing `index.html` from `main` on every push. The `staging` branch
gets its own preview deployment on a separate subdomain, so its cache, service worker and
localStorage stay isolated from production.
</architecture>

<derived_state>
None of this is written down, because a file that lives on several branches cannot state which build
is current without being wrong on at least one of them. Run the command instead.

| Question                        | How to answer it                                          |
|---------------------------------|-----------------------------------------------------------|
| Which build is promoted?        | the `CACHE` name in `sw.js`; `index.html` is its copy      |
| How many tests are there?       | `node e2e/count-tests.js`                                  |
| What has changed recently?      | `git log --oneline -10` and `CHANGELOG.md`                 |
| Is this feature already built?  | `git log --oneline main..staging`                          |
</derived_state>

<routing_triggers>
Read the file before writing code. These are not background reading — they are the answer to the
task, and skipping them is how the same decision gets made twice, differently.

| If the task touches | Read |
|---|---|
| saving, loading, migrating or exporting data | `docs/DATA_SCHEMA.md` |
| colour, theme, radius, buttons, cards, typography | `docs/DESIGN_SYSTEM.md` |
| how a feature currently behaves, i18n, the add flow, the release workflow | `docs/APP-REFERENCE.md` |
| what changed recently and why | `CHANGELOG.md` |
| what a specific historical build did | `docs/history/BUILD-LOG.md` |
| what is gated versus merely observed | `docs/QA-ARCHITECTURE.md` |
| the AI parts of the quality loop | `docs/AGENTIC-QA.md` |
| headers, CSP, the accepted risks | `SECURITY-NOTES.md` |

Do not guess history. If a decision looks arbitrary, it is usually in the build log with a reason.
</routing_triggers>

<working_method>
One change at a time, verified, then the next. Show a screenshot for anything visual. When a choice
is subjective or would change the app's character, present the options instead of picking silently.

Be honest about what was not checked. Headless Chromium is not a real Android device: native
pickers, `backdrop-filter`, and font rendering all differ, so the device pass stays a manual step.
Say so rather than implying full coverage.
</working_method>
