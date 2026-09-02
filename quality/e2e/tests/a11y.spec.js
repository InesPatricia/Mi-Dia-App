// Automated accessibility scan (axe-core). Scoped to a CURATED set of structural rules
// we actively maintain — accessible names, roles, labels, valid ARIA. This guards exactly
// the kind of defect fixed in v126/v128 (controls without a name/role). Broader rules like
// color-contrast are intentionally out of scope here (a separate visual/design review).
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { gotoApp } = require('./helpers');

const RULES = [
  'button-name', 'link-name', 'image-alt', 'label', 'input-button-name',
  'aria-allowed-attr', 'aria-required-attr', 'aria-roles',
  'aria-valid-attr', 'aria-valid-attr-value', 'aria-command-name', 'aria-toggle-field-name',
  'html-has-lang', 'document-title', 'duplicate-id-aria',
];

const scan = (page) => new AxeBuilder({ page }).withRules(RULES).analyze();
const fmt = (vs) => vs.map((violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`).join('\n');

// views reachable from the flower / bottom bar
const VIEWS = [
  { name: 'Day', open: async () => {} },
  { name: 'Journal', open: async (page) => page.getByRole('button', { name: 'Journal', exact: true }).click() },
  { name: 'Calendar', open: async (page) => page.getByRole('button', { name: 'Calendar', exact: true }).click() },
  { name: 'Progress', open: async (page) => page.getByRole('button', { name: 'Progress', exact: true }).click() },
  { name: 'Respiro', open: async (page) => page.getByRole('button', { name: 'Respiro', exact: true }).click() },
  { name: 'Profile', open: async (page) => page.getByRole('button', { name: 'Profile', exact: true }).click() },
];

test.describe('accessibility (axe, curated rules)', () => {
  for (const view of VIEWS) {
    test(`${view.name} view has no name/role/label violations`, async ({ page }) => {
      await gotoApp(page);
      // navigate to the view under test
      await view.open(page);
      // run axe with the curated rule set
      const { violations } = await scan(page);
      // the view must report zero name/role/label violations
      expect(violations, fmt(violations)).toEqual([]);
    });
  }
});
