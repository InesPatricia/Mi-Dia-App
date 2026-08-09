# Data schema

Everything the app stores lives in `localStorage` on the device. There is no backend, no account
and no sync, so this file is the complete persistence contract.

Read this before changing anything that saves, loads, migrates or exports data.

## Conventions

- **Keys are flat.** Some are singular collections (`blocks`, `rituals`); some are per-day and carry
  the date in the key itself (`intent:YYYY-MM-DD`).
- **Dates are `YYYY-MM-DD` strings**, local time, never `Date` objects.
- **Derived values are never stored.** A streak, an average cycle length or a bloom level is computed
  from the log it comes from. This is the rule that keeps the app free of desync bugs — see `rituals`.
- **"In backup"** means the key is included in the JSON export/import in Settings. A new key that
  holds user data must be added there, or a restore will silently lose it.
- The **Since** column is the build that introduced the key, so a migration can tell old data from new.

## Keys

| Key | Since | Shape |
|---|---|---|
| `blocks` | v23 | `[{ id, title, cat, time, dur, tags[], done, date }]` |
| `cats` | v23 | `[{ id, label, color }]` |
| `tags` | v23 | `[string]` |
| `journal` | v23 | `{ text, mood, event }` per day |
| `projects` | v23 | `[{ id, name, color, key? }]` |
| `settings` | v23 | see below |
| `intent:YYYY-MM-DD` | v38 | `string` |
| `cycle` | v98 | see below |
| `lastBackup`, `persistDismiss` | v102 | ISO date strings |
| `rituals` | v145 | see below |

### `blocks` — the day's slots

```js
{ id, title, cat, time, dur, tags: [], done, date }
```

- `time` — 24h string `"HH:MM"`, or `""` for an untimed slot.
- `dur` — minutes; `0` means no duration.
- `cat` — id of an entry in `cats`.

### `cats` — areas of life

```js
{ id, label, color }
```

Maximum eight. Shown as "Arie" in the UI. The colour drives the per-slot tint, computed at render
time by `paleTint(color, amount)` — the tint itself is not stored.

### `journal`

```js
{ text, mood, event }
```

The old `comp` / EMCC field was dropped in v52 and is not read back.

### `projects`

```js
{ id, name, color, key? }
```

Empty by default. `key` maps to `PROJ_LABELS` so a seeded project can be displayed in the active
language. Migration flags `mig_proj_v1` and `mig_proj_v2` remove the old empty Inbox/Spain defaults.

### `settings`

| Field | Since | Meaning |
|---|---|---|
| `lang` | v23 | `"en" \| "es" \| "ro"` |
| `theme` | v133 | `"light" \| "dark"` — applied to `<html data-theme>` before first paint |
| `name` | v68 | optional display name, max 24 chars, used in the Profile greeting |
| `identity` | v148 | "who you want to become" — the identity the rituals cast votes for |
| `onboarded` | v150 | has the guided onboarding been seen |
| `resonancePace` | v172 | `"5" \| "5.5" \| "6" \| ""` — the pace chosen in the Respiro "find your rhythm" finder, preselected in Resonance breathing |

All of `settings` is in backup.

### `rituals`

```js
{
  id, name, identity,
  cue: { type: "time" | "after", value },
  twoMin, area, color, icon,
  freq: "daily",
  log: ["YYYY-MM-DD", ...],
  createdAt
}
```

- `cue.type === "after"` is habit stacking; `value` is the anchor ritual's id.
- **The streak is derived from `log`, never stored.** This is deliberate: a stored counter and a log
  can disagree, a derived one cannot.
- Checking a ritual toggles **today's** key in and out of `log` — always today, never the day being
  viewed (v154). Backfilling a past day is an explicit action in the Progress mini-calendar.
- `rit_seeded_v1` is the first-run seed marker and the source of truth for "is this a first run".
  It exists to prevent re-seeding.
- Implemented in `ritual.js`.

### `cycle`

```js
{
  periods: [{ start: "YYYY-MM-DD", bleed: N | null }],
  length,   // manual average, used as fallback
  period,   // default bleed days (5)
  enabled   // opt-in flag
}
```

- `periods` holds real logged menstruations, sorted by start date.
- Cycle length is computed from start-to-start intervals (`avgLength`); bleed duration is averaged
  separately (`avgBleed`), and that average also drives the menstrual-phase threshold.
- Migrations: an old single `start` becomes a one-entry list; the v105–v107 string list becomes
  objects.
- Opt-in. Nothing is shown until `enabled` is set.
- Implemented in `cycle.js`.

## Adding a key

1. Pick a name that says what it holds, not where it is shown.
2. Store only what cannot be computed. If it can be derived from another key at render time, derive it.
3. Add it to the backup export **and** import, in the same change.
4. If old installs need to be brought forward, add a `mig_*` flag rather than rewriting data on every
   load.
5. Add the row to the table above, with the build number in **Since**.

## Related

- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — how stored values become colour and layout.
- [`history/BUILD-LOG.md`](history/BUILD-LOG.md) — the change that introduced any given key.
