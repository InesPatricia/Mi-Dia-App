// The keyboard route through the four overlays, which nothing in this suite has ever driven.
//
// Every other spec reaches a control by clicking it. That is a pointer, and a pointer can reach a
// control that a keyboard cannot: the axe scan in a11y.spec.js checks that a control has a name and
// a role, never that it can be operated or escaped without a mouse. An overlay a keyboard user
// cannot leave is a trap, and it is invisible to every check this repository has.
//
// THE FOUR OVERLAYS
//   Counted from the build rather than assumed: `role="dialog"` appears exactly four times in the
//   promoted index.html. Two are markup (`#bloomMenu`, `#intentModal`), two are built by script
//   (`#ritSheet`, `#onbOverlay`).
//
// THE FIVE PROPERTIES, AND WHY THEY ARE FOUR TESTS
//   Opening from the keyboard and focus arriving are one test, because a dialog nobody can open
//   from a keyboard makes the rest of the question moot. The other three each get their own, which
//   was a correction: closing and focus-return were one test at first, and that made the bloom
//   menu's failure to take focus swallow the separate question of whether Escape dismisses it at
//   all. One defect was hiding another. Split, every failure names one property.
//
// EXPECT RED HERE, AND DO NOT FIX IT IN THIS FILE
//   The phase this spec belongs to says so in advance: some of these fail on the first run, and the
//   fix is an application change on another branch, with its own diff, next to the defect it closes.
//   Anything failing is recorded in specs/BUGS.md with what was measured. A test annotated as an
//   expected failure still runs, and it turns red the day the application is fixed, which is the
//   signal to remove the annotation.
const { test, expect } = require('../fixtures/app.fixture');
const { ritual } = require('./helpers');

// How far past the end of a dialog to keep pressing Tab.
//
// The count of presses is derived from the dialog, not written down. A fixed ten was the first
// version and it made the ritual sheet green: that sheet has more than ten controls, so ten presses
// never reached its last one and the test proved nothing about what happens there. A number typed
// into a test is a number that stops meaning anything the moment the screen grows.
const TABS_PAST_THE_END = 2;

// What the browser will move focus to with Tab. Disabled controls, tabindex="-1" and anything with
// no box are excluded, which is the same set the browser skips.
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

/**
 * Where focus is, relative to a selector, as a sentence a failure can print.
 *
 * A string rather than a boolean on purpose. "outside (body)" and "outside (button#addFab)" are
 * different defects, and a boolean reports them identically.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
function focusReport(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const active = document.activeElement;
    const name = active ? active.tagName.toLowerCase() + (active.id ? `#${active.id}` : '') : 'null';
    return root && active && root.contains(active) ? `inside (${name})` : `outside (${name})`;
  }, selector);
}

/**
 * How many controls inside the overlay Tab can land on.
 *
 * Derived, so the Tab test presses past the last control of whatever the dialog holds today. The
 * spec asserts this is not zero, because a selector that stopped matching would make the loop
 * below run no iterations and report green without pressing anything.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
function focusableCount(page, selector) {
  return page.evaluate(({ sel, focusable }) => {
    const root = document.querySelector(sel);
    const candidates = root ? Array.from(root.querySelectorAll(focusable)) : [];
    return candidates.filter((el) => !el.hasAttribute('disabled')
      && el.getAttribute('tabindex') !== '-1'
      && el.getClientRects().length > 0).length;
  }, { sel: selector, focusable: FOCUSABLE });
}

// The four dialogs, and which of the three properties each one has TODAY.
//
// The three flags are not a description of what the app should do. They are what was measured on
// the promoted build, one overlay at a time, and they are what the expected-failure annotations
// below read. Flip one to true the day the application is fixed and that test stops being allowed
// to fail: it is the ratchet, and it is what stops a fix from landing without the suite noticing.
//
// Every entry is false-by-defect rather than false-by-default. Nothing here was assumed.
const OVERLAYS = [
  {
    name: 'the quick-add bloom menu',
    overlay: '#bloomMenu',
    seed: {},
    reach: async () => {},
    trigger: (app) => app.quickAdd,
    // openBloom() only toggles two classes. Focus stays on the plus control behind the menu.
    takesFocus: false,
    trapsTab: false,
    returnsFocus: false,
    // and it fails for a DIFFERENT reason from the other two that drop focus: this one never takes
    // focus at all, so it fails at the precondition. Naming BUG-007 here would file one defect
    // under another, which is precisely what an expected failure must not be allowed to do.
    returnsFocusBlockedBy: 'BUG-008: focus never entered the dialog, so it cannot be returned',
  },
  {
    name: 'the daily intention modal',
    overlay: '#intentModal',
    seed: {},
    reach: async () => {},
    trigger: (app) => app.day.intentionButton,
    takesFocus: true,
    trapsTab: false,
    // closeIntent() hides the modal and says nothing about focus, which lands on the body
    returnsFocus: false,
    returnsFocusBlockedBy: 'BUG-007: closing the dialog leaves focus on the document body',
  },
  {
    name: 'the ritual sheet',
    overlay: '#ritSheet',
    seed: { rituals: [ritual({ name: 'Morning walk' })] },
    reach: async () => {},
    trigger: (app) => app.rituals.addButton,
    takesFocus: true,
    trapsTab: false,
    // the only one of the four that does it: closeSheet() restores the _lastFocus it recorded
    returnsFocus: true,
    returnsFocusBlockedBy: null,
  },
  {
    name: 'the onboarding carousel',
    overlay: '#onbOverlay',
    seed: {},
    reach: async (app) => app.openSettings(),
    trigger: (app) => app.onboarding.replay,
    takesFocus: true,
    trapsTab: false,
    // finish() marks the carousel done and closes it, with no focus handling
    returnsFocus: false,
    returnsFocusBlockedBy: 'BUG-007: closing the dialog leaves focus on the document body',
  },
];

/**
 * Open one overlay the way a keyboard user would, and hand back its trigger.
 *
 * `press` focuses the control first, so this is the real activation path: a control that is not
 * reachable as a button, or that listens for a click and not for a key, does not open.
 *
 * @param {import('../fixtures/app.fixture').App} app
 * @param {typeof OVERLAYS[number]} entry
 */
async function openFromKeyboard(app, entry) {
  await app.launch(entry.seed);
  await entry.reach(app);
  const trigger = entry.trigger(app);
  await trigger.press('Enter');
  return trigger;
}

for (const entry of OVERLAYS) {
  test.describe(`keyboard: ${entry.name}`, () => {
    test('opens with Enter on its trigger, and focus moves into it', async ({ app, page }) => {
      // KNOWN FAILURE: the bloom menu opens without moving focus into itself, BUG-008 in specs/BUGS.md
      test.fail(!entry.takesFocus, 'BUG-008: the dialog opens and focus stays behind it');
      await openFromKeyboard(app, entry);

      await expect(page.locator(entry.overlay)).toBeVisible();
      // focus has to arrive, or a screen reader stays on the page behind the dialog
      await expect.poll(() => focusReport(page, entry.overlay)).toMatch(/^inside/);
    });

    test('Tab does not escape to the page behind it', async ({ app, page }) => {
      // KNOWN FAILURE: not one of the four dialogs traps Tab, BUG-006 in specs/BUGS.md
      test.fail(!entry.trapsTab, 'BUG-006: no focus trap, Tab reaches the page behind the dialog');
      await openFromKeyboard(app, entry);
      await expect(page.locator(entry.overlay)).toBeVisible();
      await expect.poll(() => focusReport(page, entry.overlay)).toMatch(/^inside/);

      // press past the last control the dialog holds, which is where a missing trap shows
      const controls = await focusableCount(page, entry.overlay);
      expect(controls, 'the dialog has controls to tab through').toBeGreaterThan(0);

      for (let i = 0; i < controls + TABS_PAST_THE_END; i++) {
        await page.keyboard.press('Tab');
        // focus stays in the dialog on every press, not merely at the end of them
        expect(await focusReport(page, entry.overlay), `after ${i + 1} Tab press(es)`).toMatch(/^inside/);
      }
    });

    test('Escape closes it', async ({ app, page }) => {
      await openFromKeyboard(app, entry);
      await expect(page.locator(entry.overlay)).toBeVisible();

      // pressed from wherever the application left focus, which is what a user actually does. No
      // precondition on focus here on purpose: this test asks only whether the dialog is
      // dismissable, and bundling it with focus would report one defect as two.
      await page.keyboard.press('Escape');
      await expect(page.locator(entry.overlay)).toBeHidden();
    });

    test('focus returns to the trigger when it closes', async ({ app, page }) => {
      // KNOWN FAILURE: three of four dialogs fail this, for two different reasons, BUG-007 and BUG-008 in specs/BUGS.md
      test.fail(!entry.returnsFocus, entry.returnsFocusBlockedBy);
      const trigger = await openFromKeyboard(app, entry);
      await expect(page.locator(entry.overlay)).toBeVisible();
      // focus has to have left the trigger for returning it to mean anything, so this test says so
      // rather than passing for a dialog that never took focus in the first place
      await expect.poll(() => focusReport(page, entry.overlay)).toMatch(/^inside/);

      await page.keyboard.press('Escape');
      await expect(page.locator(entry.overlay)).toBeHidden();

      // the user is put back where they were, rather than at the top of the document
      await expect(trigger).toBeFocused();
    });
  });
}
