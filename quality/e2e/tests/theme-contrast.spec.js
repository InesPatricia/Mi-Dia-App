// Is the text readable, in both themes.
//
// WHY THIS AND NOT A SCREENSHOT
//   Phase 7 retires the pixel baselines, and after that nothing automated looks at how the app
//   renders. The baselines were retired for a good reason: they were generated on one developer's
//   machine, excluded from CI, and went about thirty builds silently invalidated by a routine
//   Playwright bump. A check nobody runs is not a check.
//
//   The defect class that actually shipped here is narrower than "it looks different", and it is
//   recorded in the /theme-qa skill that exists because of it: dark-mode legibility. Invisible
//   titles, a date band whose text matched its own box, light-on-velvet colours leaking into a dark
//   surface. Those are not "changed", they are "cannot be read", and unlike a screenshot they are a
//   computable property that does not depend on the operating system, the font stack or the GPU.
//
//   So this asserts contrast rather than pixels. It runs anywhere, it needs no baseline to
//   regenerate, and an intentional redesign does not turn it red unless the redesign made something
//   unreadable.
//
// THE THRESHOLD, AND WHY IT IS NOT 4.5
//   WCAG AA asks 4.5:1 for body text. This starts at 3:1, which is the level that separates "hard
//   to read" from "effectively invisible", and it is deliberately a floor rather than a target.
//   Raising it to 4.5 is a ratchet to run once the current build is measured against it, in its own
//   change, with the failures it produces looked at one by one. Setting it high today and muting
//   the noise tomorrow is how a gate stops gating.
//
// WHAT IT CANNOT SEE
//   An effective background is computed by walking ancestors until an opaque background-color. Text
//   over an image, over a gradient, or over a backdrop-filter has no single background colour, so
//   those elements are skipped rather than guessed at. A guess would produce failures nobody trusts.
const { test, expect } = require('../fixtures/app.fixture');

const MIN_RATIO = 3;

/**
 * Collect every visible run of text with a computable contrast ratio against its own background.
 *
 * Runs in the page, because computed styles only exist there.
 */
async function readContrast(page) {
  return page.evaluate(() => {
    const parse = (value) => {
      const found = value.match(/rgba?\(([^)]+)\)/);
      if (!found) return null;
      const parts = found[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { red: parts[0], green: parts[1], blue: parts[2], alpha: parts.length > 3 ? parts[3] : 1 };
    };
    const luminance = ({ red, green, blue }) => {
      const channel = (value) => {
        const scaled = value / 255;
        return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    };
    const ratio = (one, two) => {
      const [light, dark] = [luminance(one), luminance(two)].sort((first, second) => second - first);
      return (light + 0.05) / (dark + 0.05);
    };

    // Walk up for the first opaque background. Stop and report nothing if an image, a gradient or a
    // backdrop filter is in the way: those have no single colour to compare against.
    const backgroundOf = (element) => {
      for (let node = element; node && node !== document.documentElement.parentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== 'none' || style.backdropFilter !== 'none') return null;
        const colour = parse(style.backgroundColor);
        if (colour && colour.alpha === 1) return colour;
      }
      return null;
    };

    const out = [];
    for (const element of document.querySelectorAll('body *')) {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.trim())
        .join(' ')
        .trim();
      if (!text) continue;
      const box = /** @type {HTMLElement} */ (element);
      if (!box.offsetParent && getComputedStyle(element).position !== 'fixed') continue;

      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.opacity === '0') continue;
      const foreground = parse(style.color);
      if (!foreground || foreground.alpha < 1) continue;
      const background = backgroundOf(element);
      if (!background) continue;

      out.push({
        text: text.slice(0, 40),
        tag: element.tagName.toLowerCase(),
        cls: String(element.className).trim().split(/\s+/)[0] || '',
        ratio: Number(ratio(foreground, background).toFixed(2)),
      });
    }
    return out;
  });
}

// KNOWN DEBT, AND WHY THIS IS A RATCHET RATHER THAN A SWEEP
//   The first run of this check found four elements below the floor, all in the light theme. They
//   are real and they are recorded in specs/BUGS.md as BUG-005. They are not fixed here: this is
//   the QA branch, the fix is a new build on staging, and a check cannot be introduced red.
//
//   So the shape is the one the commit gate already uses for emoji. What is here today is accepted,
//   at the ratio it was measured at. Anything NEW below the floor fails, and so does any of these
//   four getting WORSE. An element that improves is allowed to, which means this list can go stale
//   in the safe direction only.
//
//   Keyed by class rather than by text on purpose: two of the four are the rotating daily phrase and
//   its drop cap, whose text changes every day. Keying on what they say would make this fail on a
//   Tuesday.
//
//   Adding a line here is a deliberate, reviewable act, and it should come with an entry in BUGS.md.
//   Quietly appending to it is how a gate stops gating.
const ACCEPTED = {
  light: {
    'phrase-dc': 2.19,   // the drop cap of the daily phrase, a gilt decorative initial
    ro: 2.44,            // the rotating daily phrase itself, which is body text a user reads
    'sc-edit-btn': 2.67, // the shortcuts edit toggle, icon only
    durlbl: 2.68,        // the composer's "Duration" label
  },
  dark: {},
};

const describe = (rows) =>
  rows.map((row) => `  ${row.ratio}:1  <${row.tag}${row.cls ? '.' + row.cls : ''}>  "${row.text}"`).join('\n');

for (const theme of ['light', 'dark']) {
  test(`no text falls below ${MIN_RATIO}:1 on the Day view in the ${theme} theme`, async ({ app, page }) => {
    await app.launch({ settings: { theme, lang: 'en' } });
    await expect(app.root).toHaveAttribute('data-theme', theme);

    const accepted = ACCEPTED[theme];
    const rows = await readContrast(page);
    // The measurement has to find something, or a green result would only mean the walk broke.
    expect(rows.length, 'no text with a computable background was found at all').toBeGreaterThan(10);

    const low = rows.filter((row) => row.ratio < MIN_RATIO);
    const fresh = low.filter((row) => !(row.cls in accepted));
    const worse = low.filter((row) => row.cls in accepted && row.ratio < accepted[row.cls]);

    expect(fresh, `text below ${MIN_RATIO}:1 that is not accepted debt, in the ${theme} theme:\n${describe(fresh)}`).toEqual([]);
    expect(worse, `accepted debt that got worse, in the ${theme} theme:\n${describe(worse)}`).toEqual([]);
  });
}
