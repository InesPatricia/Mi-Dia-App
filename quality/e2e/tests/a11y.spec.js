// Automated accessibility scan (axe-core). Scoped to a CURATED set of structural rules we actively
// maintain: accessible names, roles, labels, valid ARIA. This guards exactly the kind of defect
// fixed in v126/v128 (controls without a name/role). Broader rules like color-contrast are
// intentionally out of scope here (a separate visual/design review).
//
// Migrated to the page object layer. The per-view open functions were five copies of a navigation
// this suite now has one spelling of, and one of them reached Profile through an unscoped lookup
// that resolves to two elements once Profile is showing.
const { test, expect } = require('../fixtures/app.fixture');
const AxeBuilder = require('@axe-core/playwright').default;

const RULES = [
  'button-name', 'link-name', 'image-alt', 'label', 'input-button-name',
  'aria-allowed-attr', 'aria-required-attr', 'aria-roles',
  'aria-valid-attr', 'aria-valid-attr-value', 'aria-command-name', 'aria-toggle-field-name',
  'html-has-lang', 'document-title', 'duplicate-id-aria',
];

const scan = (page) => new AxeBuilder({ page }).withRules(RULES).analyze();
const fmt = (violations) => violations.map((one) => `${one.id} (${one.nodes.length}): ${one.help}`).join('\n');

// views reachable from the flower / bottom bar
const VIEWS = [
  { name: 'Day', open: async () => {} },
  { name: 'Journal', open: async (app) => app.day.tapPetal('Journal') },
  { name: 'Calendar', open: async (app) => app.day.tapPetal('Calendar') },
  { name: 'Progress', open: async (app) => app.day.tapPetal('Progress') },
  { name: 'Respiro', open: async (app) => app.day.tapPetal('Respiro') },
  { name: 'Profile', open: async (app) => app.openProfile() },
];

test.describe('accessibility (axe, curated rules)', () => {
  for (const view of VIEWS) {
    test(`${view.name} view has no name/role/label violations`, async ({ app, page }) => {
      await app.launch();
      // navigate to the view under test
      await view.open(app);
      // run axe with the curated rule set
      const { violations } = await scan(page);
      // the view must report zero name/role/label violations
      expect(violations, fmt(violations)).toEqual([]);
    });
  }
});
