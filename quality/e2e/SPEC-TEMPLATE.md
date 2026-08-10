# Feature spec — <NAME>

> The **shared contract** between the implementer and the tester. They work in **separate,
> isolated contexts** (different git worktrees) and meet ONLY here — never in each other's code.
> The tester is **black-box**: it writes Playwright tests from this spec alone, without seeing
> the implementation. This removes author bias (you don't test "to the implementation").

## 1. Goal (plain language)
<one or two sentences: what the user can do after this change>

## 2. Acceptance criteria (behaviour — Given / When / Then)
- [ ] **AC1:** Given <state>, when <action>, then <observable result>.
- [ ] **AC2:** ...
- [ ] **AC3 (edge case):** ...

## 3. Test contract (the stable handles the implementer MUST expose)
The tester relies ONLY on these; the implementer guarantees them. Prefer user-facing.
| Element | Handle the tester will use | Notes |
|---|---|---|
| <e.g. commit button> | `getByRole('button', { name: 'Add activity' })` | i18n aria-label key `aria_addslot` |
| <e.g. area chip> | `getByTestId('composer-area')` | label is dynamic state → test id |
| <e.g. a dialog> | `getByRole('dialog', { name: /.../ })` | `role="dialog"` + aria-label |
| <state to assert> | `body[data-view]`, `.active`, `aria-pressed` | state attrs, not semantic locators |
| i18n keys (EN values) | <key> = "<EN text>" | tests use the EN strings (default lang) |

## 4. Out of scope
<what this change explicitly does NOT touch>

## 5. Seed data (if data-driven)
<localStorage keys to preset via seedStorage(), e.g. `day:<key>` blocks, `journal:<key>` mood>

---

## How we run it (2 isolated agents)
1. You give the feature request. I (orchestrator) fill this spec — especially **§3 the contract**.
2. **Implementer agent** (worktree A): gets §1–§5, writes ONLY app code (a new `mi-dia-vNN.html`),
   must satisfy the contract. Does NOT write tests.
3. **Tester agent** (worktree B): gets §1–§5 ONLY (not A's diff), writes Playwright specs against
   the contract. Black-box.
4. I act as neutral arbiter: promote the build, run the FULL suite + `npm run validate`. Mismatches
   between the two surface as failing tests — which is exactly the signal we want.
