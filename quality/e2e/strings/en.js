// User-visible copy the suite asserts on, in the default interface language.
//
// WHAT BELONGS HERE, AND WHY THE FILE IS SO SHORT
//   Only text that is asserted as text, in more than one place. That is a much narrower set than it
//   sounds, and it was measured rather than guessed: a first reading of the suite counted
//   sixty-eight hardcoded literals in the specs and concluded this module was under-used. It is
//   not. Of those sixty-eight:
//
//     - most are locator names, as in getByRole('button', { name: 'Settings' }). A locator is not
//       copy under test, it is how a test finds a control, and it belongs in the page object beside
//       the rest of that control's definition. Moving it here would split one control across two
//       files.
//     - most of the rest are values the test itself types in: "Roundtrip task", "Sync A",
//       "Read Atomic Habits". Those are fixtures. They belong next to the test that types them,
//       where a reader can see what went in and what came back.
//     - a few are numbers the application computes, "25:00" or a streak of "4". Those are results.
//
//   What genuinely remains is app copy asserted as text, and almost all of it is asserted once, in
//   one test. Moving a single-use string into a module buys indirection and no deduplication, so it
//   stays where it is read.
//
//   The rule, then: a string earns a place here when a copy change would otherwise have to be made
//   in more than one file, or when writing it literally in a spec is a problem in itself. The two
//   glyphs below are the second case.
//
// WHY THE GLYPHS ARE ESCAPES
//   The hero theme control renders a moon or a sun, and the test compares against the character
//   itself, because which glyph is showing is exactly what the test is about.
//
//   The commit gate refuses U+2600 as an emoji. It is a ratchet, so the character survived in
//   tests/theme.spec.js for as long as nobody edited those lines, and the phase 6 migration edits
//   them, which turns an inherited character into a new one. Writing the escape keeps the
//   assertion byte-exact while leaving every source file ASCII, which is what the gate exists to
//   protect. The gate is not overridden and nothing is committed with --no-verify.
//
//   Raised rather than decided quietly: if the literal glyph is wanted in the source, that is an
//   amendment to the emoji rule and belongs in a decision rather than in a bypass.
module.exports = {
  // The hero theme toggle text. Its accessible name stays the same in both states; this flips.
  MOON: '\u263E',
  SUN: '\u2600',
};
