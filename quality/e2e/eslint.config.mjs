// Lint for the end-to-end suite.
//
// Every rule here encodes an invariant this repository already learned the hard way, so the list is
// short on purpose: a config that flags style produces noise, and noise is how a gate gets muted.
// Rule names are taken from eslint-plugin-playwright's own rule table at install time, not written
// from memory, because several were renamed across major versions and a misspelt name is silently
// ignored. A config that enforces nothing looks exactly like a config that passes.
import playwright from 'eslint-plugin-playwright';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['node_modules/**', 'playwright-report/**', 'test-results/**', 'blob-report/**', 'all-blob-reports/**']),
  {
    // Every directory that holds tests, including the ones that gate nothing. A rule that stops at
    // the reviewed suite would have let the integration level land unlinted, which is how a folder
    // acquires its own habits and then argues it always had them.
    files: ['tests/**/*.js', 'tests-prod/**/*.js', 'tests-generated/**/*.js', 'tests-integration/**/*.js'],
    plugins: { playwright },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      // Node for the spec files themselves, browser for the bodies of page.evaluate(), which are
      // serialised and run in the page. Both are needed or no-undef reports half the file.
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // A fixed wait is a guess about a machine: too short on a loaded runner, wasted everywhere
      // else. Phase 1 removed the last two.
      'playwright/no-wait-for-timeout': 'error',
      // A test that takes two paths tells you nothing about which one ran. The Garden spec branched
      // on what it saw and changed meaning once a month, reporting the same green throughout.
      'playwright/no-conditional-in-test': 'error',
      // A test that asserts nothing passes for free.
      'playwright/expect-expect': 'error',
      // A forced click bypasses the actionability checks, which is how a control covered by an
      // overlay keeps passing while a real finger cannot reach it.
      'playwright/no-force-option': 'error',
      // A pause left behind hangs CI until it times out.
      'playwright/no-page-pause': 'error',
      // Waiting for the network to go quiet is not a readiness signal, and the API says so. The one
      // legitimate use in this suite is an assertion about the request log rather than the
      // interface, and it carries an inline exemption naming that reason.
      'playwright/no-networkidle': 'error',
      // The rule that should have caught the rename this config was written to enable. Two of the
      // fifty-four renames changed a declaration and missed a use, and the suite caught both while
      // the lint said nothing, because a style rule cannot see an identifier that does not exist.
      'no-undef': 'error',
      // Single letters are free to write and expensive to read. The loop index is the one name a
      // reader never has to look up.
      'id-length': ['error', { min: 2, exceptions: ['i'] }],
    },
  },
]);
