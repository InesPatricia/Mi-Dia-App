// The unit level's loader: runs an application module in a vm sandbox and hands back the pure calc
// surface it declares.
//
// Why a sandbox rather than an import. The files under src/modules are not ES modules and are not
// standalone. Each is an IIFE that the build inlines into the application's own closure, where it
// reads host globals the closure already holds: Store, t, esc, lang, settings, document. A calc
// block is declared pure, and running the whole file in a context that contains none of those is
// what turns that declaration into a fact. If the block ever reaches for one, the load throws here
// instead of quietly resolving against whatever Node happens to have.
//
// Measured, not assumed: both modules load in a context whose global object starts empty, with no
// stubs at all. The plan expected to need some. If a future module does work at definition time
// that a bare context cannot satisfy, the load fails loudly and the fallback is to evaluate its
// calc surface in the page, which is a different approach and has to be written down as one.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repositoryRoot = new URL('../../', import.meta.url);

/**
 * Load one module and return its `_calc` object.
 *
 * @param {string} modulePath  path from the repository root, for example 'src/modules/ritual.js'
 * @param {string} globalName  the const the file declares, for example 'Ritual'
 */
export function loadCalc(modulePath, globalName) {
  const fileUrl = new URL(modulePath, repositoryRoot);
  const source = readFileSync(fileUrl, 'utf8');

  // The file declares `const <globalName> = (function(){...})()` at the top level of a script, so
  // the binding lands in the context's lexical scope rather than on its global object. Appending
  // the name makes it the completion value, which is the only way to reach it from out here.
  //
  // The typeof guard is not decoration. Appending a bare name for a global that is not there throws
  // a ReferenceError from inside the module, pointing at the module's last line, which reads as a
  // defect in the application rather than a wrong argument at the call site. It also made the check
  // below unreachable for that case, which is the more expensive half: a branch that cannot run is
  // a message nobody will ever get.
  const sandbox = vm.createContext(Object.create(null));
  const loaded = vm.runInContext(`${source}\n;typeof ${globalName} === 'undefined' ? undefined : ${globalName};`, sandbox, {
    filename: fileURLToPath(fileUrl),
  });

  if (!loaded || typeof loaded !== 'object' || !loaded._calc) {
    throw new Error(`${modulePath} does not expose ${globalName}._calc`);
  }
  return loaded._calc;
}

/**
 * Copy plain data out of the sandbox and into this realm.
 *
 * A value built inside the sandbox carries the sandbox realm's prototypes, so
 * `assert.deepStrictEqual` refuses it: identical structure, different Object.prototype, and the
 * message reads "same structure but not reference-equal", which is a confusing way to be told about
 * a realm boundary. Copying the data fixes that.
 *
 * It refuses anything that is not plain data on purpose. A calc function that starts returning a
 * Date, a Map or a class instance fails here by name instead of being flattened into a shape the
 * assertion would happily accept. Values like that are asserted field by field at the call site,
 * which is what `nextPeriodStart` does.
 */
export function plainCopy(value) {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean' || kind === 'undefined') {
    return value;
  }
  const tag = Object.prototype.toString.call(value);
  // Array.from, not value.map. `map` builds the result through the source array's own constructor,
  // so on a sandbox array it hands back another sandbox array and the copy never crosses anything.
  // The first draft did that, and the assertion it was written to satisfy still failed.
  if (tag === '[object Array]') return Array.from(value, (item) => plainCopy(item));
  if (tag === '[object Object]') {
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = plainCopy(value[key]);
    return copy;
  }
  throw new TypeError(`plainCopy: ${tag} is not plain data`);
}
