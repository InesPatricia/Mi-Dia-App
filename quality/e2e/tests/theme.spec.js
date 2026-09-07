// Theme switcher (luxe Light+Dark revamp, v134+). The theme lives in settings.theme, drives
// <html data-theme>, is set from a hero moon and sun glyph AND a Settings toggle, persists across
// reloads, and rides along in the backup (which dumps the whole settings key).
// Theme state has no semantic locator -> assert on the html[data-theme] attribute + localStorage.
// Default UI language is EN, so the toggle's accessible name is the EN value.
const { test, expect } = require('../fixtures/app.fixture');
const { readSettings } = require('./helpers');
const { MOON, SUN } = require('../strings/en');

test.describe('theme switcher', () => {
  test('default theme is light on first launch (moon glyph shown)', async ({ app }) => {
    await app.launch();
    await expect(app.root).toHaveAttribute('data-theme', 'light');
    await expect(app.themeToggle).toHaveText(MOON);
  });

  test('the hero glyph switches to dark, flips the glyph, persists, and survives a reload', async ({ app, page }) => {
    await app.launch();

    await app.themeToggle.click();

    // <html data-theme> flips and the glyph becomes the sun
    await expect(app.root).toHaveAttribute('data-theme', 'dark');
    await expect(app.themeToggle).toHaveText(SUN);

    // persisted in settings.theme (the exact object the backup export serialises)
    expect((await readSettings(page)).theme).toBe('dark');

    // survives a full reload (the early <head> script re-applies it before paint)
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await expect(app.root).toHaveAttribute('data-theme', 'dark');
    await expect(app.themeToggle).toHaveText(SUN);
  });

  test('the Settings "Dark theme" toggle switches the theme both ways', async ({ app }) => {
    await app.launch();
    await app.openSettings();

    const toggle = app.profile.darkThemeToggle;
    await expect(toggle).toBeVisible();

    // OFF -> dark
    await toggle.click();
    await expect(app.root).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveClass(/on/);

    // dark -> light again
    await toggle.click();
    await expect(app.root).toHaveAttribute('data-theme', 'light');
    await expect(toggle).not.toHaveClass(/on/);
  });

  test('a returning user with settings.theme=dark boots dark', async ({ app }) => {
    // seed a saved preference before load
    await app.launch({ settings: { theme: 'dark', lang: 'en' } });
    await expect(app.root).toHaveAttribute('data-theme', 'dark');
    await expect(app.themeToggle).toHaveText(SUN);
  });
});
