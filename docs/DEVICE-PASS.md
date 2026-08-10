# Device pass

The one manual step, and the only one this project has never found a way to automate.

Eighty-five end-to-end tests run on headless Chromium at a phone viewport. They are not a phone.
This list is deliberately **not** a feature checklist — the suite already covers behaviour and stored
state. It covers only what a headless browser cannot tell you, which is why every item names the
thing that differs rather than the screen.

Run it on a real Android device, in Chrome, before promoting an arc. No version number in the
filename: it is meant to be edited in place as the app changes, so it cannot rot into an artefact of
some build nobody runs any more.

---

## 1. Native controls

Headless renders its own widgets. The phone renders the operating system's.

- [ ] The **time picker** opens the native Android wheel, not a text field, and a chosen time lands
      in the slot correctly.
- [ ] The **date picker** (cycle logging, "another date…") opens natively and accepts a past date.
- [ ] Every tap target is comfortable one-handed — nothing under roughly 44 px, nothing that needs a
      second attempt.

## 2. Effects that headless approximates or skips

- [ ] **`backdrop-filter` blur** behind sheets and modals actually blurs. On some devices it degrades
      to a flat panel — decide whether that still reads as intended.
- [ ] The **candle glow** behind the flower centre is a glow, not a grey disc.
- [ ] Scrolling is smooth with the fixed bottom bar present; nothing hides behind it at the end of a
      long journal entry.

## 3. Fonts, which are the most device-dependent thing here

- [ ] **Ephesis** loads for the wordmark. If it falls back, "Día" reads wrong immediately.
- [ ] The **drop cap** on the daily phrase is whole — not clipped at the top or right. This one has
      a history: it was "fixed" repeatedly through padding tricks before the real cause turned out to
      be `background-clip: text` not painting a glyph past its box. It is a solid colour now, but the
      phone is where a font change would show first.
- [ ] Romanian and Spanish diacritics render in every heading, including the serif display face.

## 4. Touch, which has no headless equivalent

- [ ] **Long-press** on a ritual check gives the two-minute version.
- [ ] **Two-tap delete** works and cannot be triggered by one accidental tap.
- [ ] Nothing important sits where a thumb rests while scrolling.

## 5. Both themes, on a real screen

- [ ] Switch light ⇄ dark and walk every view. Look for text that disappears into its surface —
      cream on velvet is the failure this project has shipped before.
- [ ] Check outdoors or at full brightness if you can: contrast that passes on a monitor can vanish
      in daylight.

## 6. Sound

- [ ] The **chime** on completing a ritual plays, and is not startling at a normal volume.
- [ ] It respects the phone being on silent.

## 7. The PWA, which only exists on a device

- [ ] **Add to Home Screen** installs, and the icon and name are right.
- [ ] Opened from the icon, it runs standalone — no browser chrome.
- [ ] **Turn off the network and reopen it.** The app loads and your data is there.
- [ ] After a release, the update actually arrives: reopen twice and confirm the new build, rather
      than yesterday's cached one. If it does not, the service worker cache name was not bumped —
      see the [runbook](RUNBOOK.md).

---

## Reporting

If something fails, the useful report is **which screen, what you did, what happened** — a screenshot
beats a description. "The picker looks wrong on Journal" is actionable; "it feels off" is not.

Anything found here that a test could have caught should become a test. Anything that genuinely
cannot be automated stays on this list, and that is not a failure — it is the honest boundary of the
suite, and the README says so out loud.
