// Decide which build the suite serves.
//
// WHY THIS EXISTS
//   Until now the harness served public/, which is the build that has ALREADY been promoted. A new
//   build was therefore tested only after it had become production: `/ship` copied it over
//   index.html and the suite ran against the result. If the suite went red, the promotion had
//   already happened and the fix was a revert. Recorded as OPEN-001 in specs/BUGS.md.
//
//   With MI_BUILD set to a candidate, the suite serves that candidate instead, assembled exactly
//   the way a promotion would assemble it. A build can then be refused before it is promoted rather
//   than after.
//
//   Default behaviour is unchanged: no MI_BUILD, serve public/.
//
// THE SERVICE WORKER, WHICH IS THE PART THAT COULD HAVE MADE THIS SILENTLY WRONG
//   sw.js names its cache after the promoted version. Serving a candidate beside a sw.js that still
//   names the old one would test a combination that will never exist in production, and a browser
//   holding the old cache could serve the old page while the run reported on the new one. The
//   candidate copy of sw.js therefore gets its CACHE rewritten to the candidate's own version, with
//   the same pattern the release validator uses, so there is one spelling of it rather than two.
//
// FAIL CLOSED
//   A missing file, or a name that is not a build, is refused rather than quietly falling back to
//   public/. A fallback here would produce the worst possible outcome: a green run that tested a
//   different file than the one somebody meant to gate.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

// The same pattern the release validator matches on, deliberately. Two spellings of one rule is how
// a release passes a check the suite would have failed.
const CACHE_PATTERN = /CACHE\s*=\s*["']mi-dia-(v\d+)["']/;
const BUILD_NAME = /^mi-dia-(v\d+)\.html$/;

/**
 * Copy the publishable directory and drop a candidate build into it as index.html.
 *
 * @param {string} publicDir  the directory a promotion would publish
 * @param {string} buildFile  absolute path to the candidate build
 * @param {string} outDir     an existing, empty directory to assemble into
 * @returns {string} the version the candidate declares, for example "v173"
 */
function assembleCandidate(publicDir, buildFile, outDir) {
  const name = path.basename(buildFile);
  const named = BUILD_NAME.exec(name);
  if (!named) {
    throw new Error(`serve-build: ${name} is not a build. Expected mi-dia-vNN.html.`);
  }
  if (!fs.existsSync(buildFile)) {
    throw new Error(`serve-build: ${buildFile} does not exist.`);
  }
  const version = named[1];

  for (const entry of fs.readdirSync(publicDir)) {
    fs.copyFileSync(path.join(publicDir, entry), path.join(outDir, entry));
  }
  fs.copyFileSync(buildFile, path.join(outDir, 'index.html'));

  const swPath = path.join(outDir, 'sw.js');
  const sw = fs.readFileSync(swPath, 'utf8');
  if (!CACHE_PATTERN.test(sw)) {
    throw new Error('serve-build: sw.js has no CACHE name to rewrite, so the candidate cannot be served as it would ship.');
  }
  fs.writeFileSync(swPath, sw.replace(CACHE_PATTERN, `CACHE = "mi-dia-${version}"`), 'utf8');
  return version;
}

/**
 * The directory the web server should serve, and a sentence saying which build that is.
 *
 * The sentence is not decoration. A run that tested the wrong file while reporting green is the
 * failure this whole module exists to prevent, so the config prints what it served.
 *
 * @param {string|undefined} requested  a path from the repository root, usually process.env.MI_BUILD
 */
function resolveServeDir(requested = process.env.MI_BUILD) {
  if (!requested) {
    return { dir: PUBLIC_DIR, label: 'public/ (the promoted build)' };
  }
  const buildFile = path.resolve(ROOT, requested);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-dia-candidate-'));
  const version = assembleCandidate(PUBLIC_DIR, buildFile, outDir);
  return { dir: outDir, label: `${path.basename(buildFile)} (a CANDIDATE, cache name rewritten to mi-dia-${version})` };
}

module.exports = { resolveServeDir, assembleCandidate, PUBLIC_DIR, CACHE_PATTERN, BUILD_NAME };
