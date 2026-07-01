# Mi Día — module-injected CSS inventory

The blind spot that cost us reactive fixes: **not all CSS lives in the main `<style>`**. The self-contained
modules `persist.js` and `cycle.js` (the v98+ "clean 5-layer module" pattern) **inject their own `<style>`
at runtime**. A `grep` of the main stylesheet misses them, so they get themed late (the persist banner
shipped as invisible champagne-on-pink until Ines flagged it). Theme these EVERY time you touch a theme.

## Where it is

Both modules are single IIFEs embedded in `mi-dia-vNN.html` that call `injectCSS(...)` with a big template
string. Find them: `grep -nE "cy-tg|cy-sw|cy-setup-link|\.pb\b|pb-act" mi-dia-vNN.html`. The rules sit in the
JS string (later in the file than `</style>`), but they still cascade normally — so a
`html[data-theme="…"] .pb{…}` override placed in the MAIN `<style>` wins by the `[data-theme]` specificity
bump, no `!important` needed (except vs inline styles).

## The themeable classes (theme ALL of these, both light + dark)

### persist.js — the backup/install banner (`.pb…`)
| Class | What | Watch out for |
|---|---|---|
| `.pb` | banner card | uses `--rose-0` bg / `--rose-1` border → a PALE-PINK card. In dark it kept the pink bg while `.pb-tx` (`--ink`) flipped to champagne → **champagne-on-pink = invisible**. Theme the card to `--surface-2` (dark) / `--page-2` (light-luxe). |
| `.pb-tx` | message text | `--ink` (flips with theme) — fine ONCE the card is themed |
| `.pb-ic` | leading icon | `--rose-3` → gilt |
| `.pb-act` | Install button (ACTION) | rose gradient → gilt (dark) / wine (light) |
| `.pb-hint` | "Last backup…" hint | `--rose-4` → gilt (dark) / wine (light) |
| `.pb-x` | dismiss × | `--ink-soft` |

### cycle.js — the opt-in cycle UI (mostly hidden by default; theme anyway)
| Class | What | Watch out for |
|---|---|---|
| `.cy-tg` | "Track your cycle" Settings card | `background:#fff` hardcoded → velvet (dark) / pearl (light) |
| `.cy-tg-l` / `small` | label / hint | `--ink` / `--ink-soft` |
| `.cy-sw` / `.cy-sw.off` | the opt-in switch (ACTION) | ON = `--rose-3` → wine (light) / gilt (dark); OFF track `#D9CEBA` (light tan) → a velvet-neutral in dark |
| `.cy-setup-link` | "Ritmul meu" access pill (Calendar) | `--rose-0/1/4` → wine/gilt |
| moon strip / sheet / history rows | opt-in, `display:none` unless cycle enabled | verify by enabling cycle in Settings + selecting the Rhythm lens; the moon-disc SVG is JS-painted (`moonSVG`) with hardcoded near-white `fill` — theme via CSS on the SVG or a theme-aware `fill` |

> `.cyRhythmBtn` lives in the MAIN `<style>` (not cycle.js) — but it's cycle-adjacent, so theme it with the
> Calendar/cycle pass.

## Checklist when theming

- [ ] Grep injected classes (`cy-*`, `pb-*`) and confirm each surface/text/action is themed for BOTH themes.
- [ ] The persist banner is conditional (shows when no/old backup) — to eyeball it, inject the `.pb` markup
      in a headless page (see the session's preview trick) or clear `lastBackup`.
- [ ] The cycle UI is opt-in/off by default — enable it in Settings to review its dark+light rendering.
- [ ] New modules built on this pattern (per CLAUDE.md's incremental-migration plan) get added to THIS list
      the moment they inject CSS.
