// Theme switcher (luxe Light+Dark revamp, v134+). The theme lives in settings.theme,
// drives <html data-theme>, is set from a hero ☾/☀ glyph AND a Settings toggle, persists
// across reloads, and rides along in the backup (which dumps the whole settings key).
// Theme state has no semantic locator -> assert on the html[data-theme] attribute +
// localStorage. Default UI language is EN, so the toggle's accessible name is the EN value.
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

const root = (page) => page.locator('html');
const heroToggle = (page) => page.getByRole('button', { name: 'Toggle dark theme' });

test.describe('theme switcher', () => {
  test('default theme is light on first launch (moon glyph shown)', async ({ page }) => {
    await gotoApp(page);
    await expect(root(page)).toHaveAttribute('data-theme', 'light');
    await expect(heroToggle(page)).toHaveText('☾');
  });

  test('the hero glyph switches to dark, flips the glyph, persists, and survives a reload', async ({ page }) => {
    await gotoApp(page);

    await heroToggle(page).click();

    // <html data-theme> flips and the glyph becomes the sun
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await expect(heroToggle(page)).toHaveText('☀');

    // persisted in settings.theme (the exact object the backup export serialises)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('settings')).theme);
    expect(stored).toBe('dark');

    // survives a full reload (the early <head> script re-applies it before paint)
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-view'));
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await expect(heroToggle(page)).toHaveText('☀');
  });

  test('the Settings "Dark theme" toggle switches the theme both ways', async ({ page }) => {
    await gotoApp(page);

    // "You" tab -> Settings segment
    await page.getByRole('button', { name: 'You', exact: true }).click();
    await page.locator('#profMode').getByRole('button', { name: 'Settings' }).click();

    const setToggle = page.locator('#themeToggleSet');
    await expect(setToggle).toBeVisible();

    // OFF -> dark
    await setToggle.click();
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await expect(setToggle).toHaveClass(/on/);

    // dark -> light again
    await setToggle.click();
    await expect(root(page)).toHaveAttribute('data-theme', 'light');
    await expect(setToggle).not.toHaveClass(/on/);
  });

  test('a returning user with settings.theme=dark boots dark', async ({ page }) => {
    // seed a saved preference before load
    await page.addInitScript(() => {
      localStorage.setItem('settings', JSON.stringify({ theme: 'dark', lang: 'en' }));
    });
    await gotoApp(page);
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await expect(heroToggle(page)).toHaveText('☀');
  });
});
