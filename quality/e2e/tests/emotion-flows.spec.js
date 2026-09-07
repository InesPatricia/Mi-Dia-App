// Deeper journal/respiro flows: the emotion-wheel routing (F3) from a named emotion to
// Calm/Energy, and the Body scan player (scan stage + tone/voice mode).
//
// Migrated to the page object layer. The four raw id lookups the wheel needed are now named steps
// on the Journal page object, and the player's five are on the Respiro one.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('emotion routing + body scan', () => {
  test('naming a low-mood emotion routes to Respiro (F3)', async ({ app }) => {
    await app.launch();
    // open the Journal view
    await app.day.tapPetal('Journal');

    // low mood -> permission pause + emotion wheel
    await app.journal.moodOption('Rainy').click();
    // "Sadness" core routes to energy; pick it + a sub-emotion
    await app.journal.coreEmotion('Sadness').click();
    await app.journal.subEmotion('Lonely').click();

    // the routing suggestion appears; following it opens Respiro
    await expect(app.journal.route).toBeVisible();
    await app.journal.routeFollow.click();
    await expect(app.view).toHaveAttribute('data-view', 'calm');
  });

  test('the Body scan opens its scan stage with a tone/voice toggle', async ({ app }) => {
    await app.launch();
    // open Respiro and the Somatic sub-segment
    await app.day.tapPetal('Respiro');
    await app.respiro.segment('Body').click();

    // open the Body scan exercise
    await app.respiro.card('Body scan').click();

    // the player opens on the somatic + scan stage
    await expect(app.respiro.player).toHaveClass(/show/);
    await expect(app.respiro.somaticPanel).toBeVisible();
    await expect(app.respiro.scanStage).toBeVisible();
    // scan-specific mode switch (tone vs voice) with two options
    await expect(app.respiro.scanMode).toBeVisible();
    await expect(app.respiro.scanModeOptions).toHaveCount(2);
  });
});
