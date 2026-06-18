// Add-flow tests: the day-tab composer (v112+). Captures the documented behaviour —
// grows on TYPING (not focus), commits via "+" or Enter, supports time/duration/area,
// and the new slot renders in the right group.
//
// Locator strategy (Playwright best practices): user-facing locators first —
//   getByPlaceholder (title), getByRole by name for the numeric duration chips and the
//   commit button, getByLabel('Time') for the native time input (it carries aria-label),
//   getByText for the user-typed slot title and the group headers.
// data-testid is used ONLY for the area/tag chips, whose visible label is dynamic state
// (the current selection), so there is no stable accessible name to target.
// Expansion is a CSS state with no semantic handle, so it is asserted via the .active class.
const { test, expect } = require('@playwright/test');
const { gotoApp, readBlocks } = require('./helpers');

// EN i18n strings (default UI language).
const PH_TITLE = 'What do you want to do today?';
const COMMIT = 'Add activity';

test.describe('add flow (composer)', () => {
  test('composer expands on typing, not on focus', async ({ page }) => {
    await gotoApp(page);
    const title = page.getByPlaceholder(PH_TITLE);
    const composer = page.locator('#composer');

    await title.click(); // focus only — must NOT expand
    await expect(composer).not.toHaveClass(/active/);

    await title.fill('Yoga'); // typing fires the input handler -> expands
    await expect(composer).toHaveClass(/active/);
    // reveal content (Duration label) is now on screen
    await expect(page.getByText('Duration', { exact: true })).toBeVisible();
  });

  test('fast path: title + Enter creates an untimed slot', async ({ page }) => {
    await gotoApp(page);
    const title = page.getByPlaceholder(PH_TITLE);

    await title.fill('Call mom');
    await title.press('Enter');

    // slot appears, under the "Anytime today" group (no time set)
    await expect(page.locator('#list').getByText('Call mom')).toBeVisible();
    await expect(page.getByText('Anytime today', { exact: true })).toBeVisible();

    // composer resets + collapses after commit
    await expect(title).toHaveValue('');
    await expect(page.locator('#composer')).not.toHaveClass(/active/);

    const blocks = await readBlocks(page);
    expect(blocks.map((b) => b.title)).toContain('Call mom');
    expect(blocks.find((b) => b.title === 'Call mom').time).toBe('');
  });

  test('duration chip is captured and commit via the "+" button works', async ({ page }) => {
    await gotoApp(page);
    await page.getByPlaceholder(PH_TITLE).fill('Workout');

    const dur45 = page.getByRole('button', { name: '45', exact: true });
    await dur45.click();
    await expect(dur45).toHaveClass(/sel/);

    await page.getByRole('button', { name: COMMIT, exact: true }).click();

    await expect(page.locator('#list').getByText('Workout')).toBeVisible();
    const block = (await readBlocks(page)).find((b) => b.title === 'Workout');
    expect(block.dur).toBe(45);
  });

  test('setting a native time puts the slot in the Timed group with a range preview', async ({ page }) => {
    await gotoApp(page);
    await page.getByPlaceholder(PH_TITLE).fill('Meeting');

    // native <input type="time"> exposed by its aria-label, scoped to the composer
    // (the slot editor reuses the same makeNativeTime control elsewhere in the DOM).
    await page.locator('#composer').getByLabel('Time').fill('14:30');

    // live start–end preview pill becomes a real time range
    await expect(page.locator('#timePreview')).toHaveText(/\d{1,2}:\d{2}/);

    await page.getByRole('button', { name: COMMIT, exact: true }).click();

    await expect(page.getByText('Timed', { exact: true })).toBeVisible();
    await expect(page.locator('#list').getByText('Meeting')).toBeVisible();
    const block = (await readBlocks(page)).find((b) => b.title === 'Meeting');
    expect(block.time).toBe('14:30');
  });

  test('selecting an area updates the chip and is stored on the slot', async ({ page }) => {
    await gotoApp(page);
    await page.getByPlaceholder(PH_TITLE).fill('Coaching call');

    // open the area picker (chip label is dynamic state -> reached by test id)
    await page.getByTestId('composer-area').click();
    await page.getByRole('button', { name: 'Relationships', exact: true }).click();

    // chip now reflects the chosen area
    await expect(page.getByTestId('composer-area')).toContainText('Relationships');

    await page.getByRole('button', { name: COMMIT, exact: true }).click();

    await expect(page.locator('#list').getByText('Coaching call')).toBeVisible();
    const block = (await readBlocks(page)).find((b) => b.title === 'Coaching call');
    expect(block.cat).toBe('relatii');
  });
});
