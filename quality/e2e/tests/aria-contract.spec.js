// The accessibility contract for the two design-locked components, which replaces the pixel
// baselines phase 7 retires.
//
// WHAT WAS RETIRED AND WHY
//   tests/visual.spec.js snapshotted two PNGs: the radial flower navigation and the bottom bar.
//   Pixel baselines are a function of the operating system, the browser build and the font stack,
//   so the ones this repository had were generated on a Windows laptop and then excluded from CI
//   because they could not pass anywhere else. They went about thirty builds unchecked and were
//   silently invalidated by a routine Playwright bump. Nothing noticed, because nothing ran them.
//   A test that only runs on one machine is not a gate.
//
//   An accessibility snapshot is a tree of roles and accessible names. It does not depend on fonts
//   or on how anything is painted, so unlike a screenshot it runs in CI on Linux and means the same
//   thing there as here. That is the whole reason for the swap.
//
// WHAT IT ACTUALLY DEFENDS
//   Not appearance. The defect class it catches is the one this repository has shipped twice: a
//   control losing its accessible name or its role, which is what v126 and v128 fixed. A petal that
//   becomes a div, a tab whose aria-label is dropped in a refactor, a button that turns into an
//   image with no name. All of those leave the screenshot identical and the tree different.
//
// WHY THE TREES ARE WRITTEN IN THIS FILE RATHER THAN IN A SNAPSHOT DIRECTORY
//   Because the last set of baselines rotted in a directory nobody opened. Written here, a change
//   to the contract is a change to this file and shows up in the diff of the test that asserts it,
//   next to the reason it is being changed. There is no `--update-snapshots` step that can quietly
//   accept a regression.
//
// THE TWO SCREENS THIS DOES NOT COVER, AND WHY
//   The hero is excluded on purpose: its tree carries the rotating daily phrase and today's date,
//   so it differs between two runs on the same machine an hour apart. A contract that changes by
//   itself is a contract nobody keeps. The other views are not covered either, because this file
//   replaces the screenshot spec rather than growing past it.
//
// THIS IS A CONTAINMENT MATCH, SO IT IS PAIRED WITH A COUNT
//   toMatchAriaSnapshot checks that the expected tree is present in the actual one. A control that
//   disappears fails it; a control that is ADDED does not. Measured rather than read: a bare button
//   was inserted into the bottom bar and the contract stayed green, which is recorded as TD-006 in
//   specs/BUGS.md.
//
//   Left there, the word "contract" would have been a promise the check does not keep, so each tree
//   is followed by an assertion on how many controls the component exposes. The tree says the right
//   things are present and named; the count says nothing else appeared beside them. Neither half is
//   sufficient alone, and the pair was verified in both directions before it was kept.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('aria contract', () => {
  test('the flower navigation exposes five petals and the intention control', async ({ app, page }) => {
    await app.launch();

    // Every petal is a button with a name, and the centre is a button rather than a decorated div.
    // The bare img and text nodes are the label rendered beside each petal; they are part of the
    // tree as it stands, so they are written down rather than filtered out of it.
    await expect(page.locator('.flower')).toMatchAriaSnapshot(`
      - button "Journal":
        - img
      - button "Respiro":
        - img
      - button "Calendar":
        - img
      - button "Progress":
        - img
      - button "Projects":
        - img
      - img
      - text: Journal
      - img
      - text: Respiro
      - img
      - text: Calendar
      - img
      - text: Progress
      - img
      - text: Projects
      - button "What's your intention?"
    `);

    // the other half of the contract: five petals and the centre, and nothing else
    await expect(page.locator('.flower').getByRole('button')).toHaveCount(6);
  });

  test('the bottom bar exposes its three controls with distinct names', async ({ app, page }) => {
    await app.launch();

    // Home and Profile are the two views; Quick add raises the bloom menu. The names are what a
    // screen reader announces and what every page object in this suite locates by, so a change
    // here breaks the suite and a user's navigation at the same time.
    await expect(page.locator('.bottombar')).toMatchAriaSnapshot(`
      - button "Home":
        - img
        - text: Home
      - button "Quick add":
        - img
        - text: Add
      - button "Profile":
        - img
        - text: Profile
    `);

    // Home, Quick add, Profile, and nothing that quietly joined them
    await expect(page.locator('.bottombar').getByRole('button')).toHaveCount(3);
  });
});
