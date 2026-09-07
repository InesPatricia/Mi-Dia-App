// Add-flow tests: the day-tab composer (v112+). Captures the documented behaviour: it grows on
// TYPING (not focus), commits via the add control or Enter, supports time/duration/area, and the
// new slot renders in the right group.
//
// Locator strategy (Playwright best practices): user-facing locators first. The placeholder for the
// title, getByRole by name for the numeric duration chips and the commit control, getByLabel('Time')
// for the native time input (it carries an aria-label), getByText for the user-typed slot title and
// the group headers. A test id is used ONLY for the area chip, whose visible label is dynamic state
// (the current selection), so there is no stable accessible name to target. Expansion is a CSS
// state with no semantic handle, so it is asserted via the "active" class.
//
// Migrated to the page object layer. The composer's controls were reached unscoped here; the page
// object scopes them to the composer, which is what the two comments in the original file were
// asking for in prose.
const { test, expect } = require('../fixtures/app.fixture');
const { readBlocks } = require('./helpers');

test.describe('add flow (composer)', () => {
  test('composer expands on typing, not on focus', async ({ app }) => {
    await app.launch();

    await app.day.titleField.click(); // focus only, must NOT expand
    await expect(app.day.composer).not.toHaveClass(/active/);

    await app.day.titleField.fill('Yoga'); // typing fires the input handler -> expands
    await expect(app.day.composer).toHaveClass(/active/);
    // reveal content (Duration label) is now on screen
    await expect(app.day.durationLabel).toBeVisible();
  });

  test('fast path: title + Enter creates an untimed slot', async ({ app, page }) => {
    await app.launch();

    await app.day.titleField.fill('Call mom');
    await app.day.titleField.press('Enter');

    // slot appears, under the "Anytime today" group (no time set)
    await expect(app.day.list.getByText('Call mom')).toBeVisible();
    await expect(app.day.groupHeader('Anytime today')).toBeVisible();

    // composer resets + collapses after commit
    await expect(app.day.titleField).toHaveValue('');
    await expect(app.day.composer).not.toHaveClass(/active/);

    // persisted as an untimed block
    const blocks = await readBlocks(page);
    expect(blocks.map((entry) => entry.title)).toContain('Call mom');
    expect(blocks.find((entry) => entry.title === 'Call mom').time).toBe('');
  });

  test('duration chip is captured and commit via the add button works', async ({ app, page }) => {
    await app.launch();
    await app.day.titleField.fill('Workout');

    // selecting the 45-min duration chip marks it selected
    await app.day.durationChip(45).click();
    await expect(app.day.durationChip(45)).toHaveClass(/sel/);

    // commit via the add button
    await app.day.commit.click();

    // the slot is listed and the chosen duration persisted
    await expect(app.day.list.getByText('Workout')).toBeVisible();
    const block = (await readBlocks(page)).find((entry) => entry.title === 'Workout');
    expect(block.dur).toBe(45);
  });

  test('setting a native time puts the slot in the Timed group with a range preview', async ({ app, page }) => {
    await app.launch();
    await app.day.titleField.fill('Meeting');

    // native time input, exposed by its aria-label and scoped to the composer
    await app.day.timeInput.fill('14:30');

    // live start-to-end preview pill becomes a real time range
    await expect(app.day.timePreview).toHaveText(/\d{1,2}:\d{2}/);

    await app.day.commit.click();

    // the timed slot lands in the "Timed" group with the chosen time persisted
    await expect(app.day.groupHeader('Timed')).toBeVisible();
    await expect(app.day.list.getByText('Meeting')).toBeVisible();
    const block = (await readBlocks(page)).find((entry) => entry.title === 'Meeting');
    expect(block.time).toBe('14:30');
  });

  test('selecting an area updates the chip and is stored on the slot', async ({ app, page }) => {
    await app.launch();
    await app.day.titleField.fill('Coaching call');

    // open the area picker (chip label is dynamic state -> reached by test id)
    await app.day.areaChip.click();
    await app.day.areaOption('Relationships').click();

    // chip now reflects the chosen area
    await expect(app.day.areaChip).toContainText('Relationships');

    await app.day.commit.click();

    // the slot is listed and the chosen area is persisted on it
    await expect(app.day.list.getByText('Coaching call')).toBeVisible();
    const block = (await readBlocks(page)).find((entry) => entry.title === 'Coaching call');
    expect(block.cat).toBe('relatii');
  });
});
