// Respiro tests: the Calm me / Wake me direction toggle, the Breathing/Somatic sub-segment, and
// opening + closing an exercise player.
//
// Migrated to the page object layer. The local openRespiro helper asserted, so that assertion now
// sits in the spec. Both segmented controls are scoped to their own container in the page object,
// which the specs did not do.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('respiro', () => {
  test('the Calm/Wake direction toggle swaps the content', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Respiro');
    await expect(app.view).toHaveAttribute('data-view', 'calm');

    // default = Calm me -> the Breathing/Somatic sub-segment is shown
    await expect(app.respiro.segments).toBeVisible();

    // switching to "Wake me up" hides the sub-segment and shows the energy cards
    await app.respiro.direction('Wake me up').click();
    await expect(app.respiro.segments).toBeHidden(); // energy mode hides the sub-segment
    await expect(app.respiro.cards).not.toHaveCount(0);

    // switching back to "Calm me" restores the Breathing/Somatic sub-segment
    await app.respiro.direction('Calm me').click();
    await expect(app.respiro.segments).toBeVisible();
  });

  test('the Breathing/Somatic sub-segment switches the list', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Respiro');

    // capture the current first card title, then switch to the Somatic sub-segment
    const firstTitle = await app.respiro.cardTitles.first().textContent();
    await app.respiro.segment('Body').click();
    // the Somatic segment is now active
    await expect(app.respiro.segment('Body')).toHaveClass(/sel/);
    // the list content changed
    await expect(app.respiro.cardTitles.first()).not.toHaveText(firstTitle);
  });

  test('opening an exercise shows the player, and it can be closed', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Respiro');

    // opening the first exercise shows the player overlay with the breathing stage
    // (the featured "Find your rhythm" finder card leads the Breathing grid since v172 and is
    // excluded by the page object, so "first" means the first real exercise)
    await app.respiro.exerciseCards.first().click();
    await expect(app.respiro.player).toHaveClass(/show/);
    await expect(app.respiro.breathStage).toBeVisible(); // first breathing exercise

    // closing the player hides the overlay again
    await app.respiro.closePlayer();
    await expect(app.respiro.player).not.toHaveClass(/show/);
  });
});
