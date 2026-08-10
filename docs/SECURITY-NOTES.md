# Security notes — OWASP ZAP baseline triage

**App profile:** a static, single-file PWA served by Cloudflare Pages. No backend, no API,
no cookies, no authentication, no third-party scripts; all user data lives in the browser
(`localStorage`) and never leaves the device. The only external dependency is Google Fonts.

**Scan setup:** [`zap-baseline.yml`](../.github/workflows/zap-baseline.yml) runs a **passive**
OWASP ZAP baseline scan (response inspection only, no attack payloads) against production,
weekly + on demand. Passive-only is an intentional match for a zero-backend static site —
there is no server-side logic to actively probe. This is not, and does not claim to be,
a penetration test.

**Triage rule:** every finding becomes either a **fix** (shipped via the Cloudflare Pages
[`_headers`](../public/_headers) file) or an **accepted risk** recorded here with its justification.
Nothing is silently ignored.

---

## Round 1 — 2026-07-27 (first baseline, before `_headers`)

12 alerts: 4 Medium, 4 Low, 4 Informational.

### Fixed (via `_headers`)

| Finding (risk) | Fix | Note |
|---|---|---|
| CSP Header Not Set (Medium) | `Content-Security-Policy` added | Sources allow-listed to `'self'` + Google Fonts only; see accepted risk #1 for `'unsafe-inline'` |
| Missing Anti-clickjacking Header (Medium) | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` | Nothing legitimate embeds this app in a frame |
| Cross-Domain Misconfiguration (Medium) | `Access-Control-Allow-Origin: *` (a Cloudflare Pages default) **removed** via the `!` detach syntax | No cross-origin consumer of these files exists |
| Strict-Transport-Security Not Set (Low) | `max-age=31536000; includeSubDomains` | Defense-in-depth: the `.dev` TLD is HSTS-preloaded in browsers already, so this mostly satisfies non-preload clients and scanners |
| Permissions Policy Not Set (Low) | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | The app uses none of these; deny them outright |
| COOP Missing (Low) | `Cross-Origin-Opener-Policy: same-origin` | No cross-window interaction needed |

**Implementation gotcha worth knowing:** the service worker ([`sw.js`](../public/sw.js)) re-issues
*every* GET through `fetch()` inside the worker, and worker fetches are governed by the
`connect-src` of the CSP delivered **on the `sw.js` response**. `connect-src` therefore
explicitly allows the two Google Fonts hosts — with a plain `connect-src 'self'`, fonts
would silently break. Caught on the branch preview before production.

### Accepted risks

1. **CSP `'unsafe-inline'` for `script-src`/`style-src`** — architectural: a zero-build,
   single-file app has inline scripts, inline styles and ~100 inline event handlers, and no
   build step in which to compute per-response nonces or hashes. Compensating controls: no
   external script origin is allowed at all, `object-src 'none'`, `base-uri 'self'`, and
   there is no backend/session to exfiltrate — all data is local to the device. Revisit if
   the app ever gains a build step.
2. **Sub Resource Integrity missing (Medium)** — applies to the Google Fonts stylesheet.
   Google serves UA-dependent CSS by design, so an SRI hash would break font loading.
   Mitigated by the CSP source allow-list. Long-term option: self-host the fonts.
3. **COEP missing (Low)** — `Cross-Origin-Embedder-Policy` is only required for
   cross-origin-isolated features (e.g. `SharedArrayBuffer`), which this app does not use.
4. **Informational: Re-examine Cache-control / Storable but Non-Cacheable** —
   `max-age=0, must-revalidate` is the *deliberate* update strategy of a single-file PWA
   (network-first SW; a new deploy must be picked up on next load, offline falls back to cache).
5. **Informational: Suspicious Comments / Modern Web Application** — words like "TODO" in
   shipped JS; the repository is public, the source is the artifact. No information leak.

---

## Round 2 — 2026-07-27 (re-scan after `_headers` shipped)

**Delta vs round 1 — resolved (6):** CSP Header Not Set, Missing Anti-clickjacking Header,
Cross-Domain Misconfiguration, Strict-Transport-Security Not Set, Permissions Policy Not Set,
COOP Missing. All four original Medium alerts about missing defenses are gone.

**Now that a CSP exists, ZAP inspects its *content*** and raises two new Medium alerts —
`CSP: script-src unsafe-inline` and `CSP: style-src unsafe-inline`. These are not new
weaknesses: they are accepted risk **#1** above, now visible under its precise name. Expected
and kept.

**New Low:** `Cross-Origin-Resource-Policy Header Missing` → **fixed** in this round
(`Cross-Origin-Resource-Policy: same-origin` — no other origin legitimately embeds this
app's files). Illustrates a normal property of iterative scanning: hardening one layer
makes the scanner look at the next one.

**Steady state going forward:** remaining alerts = accepted risks #1–#5 only.

## Tripwire — 2026-07-28

The accepted risks are now encoded in [`quality/security/rules.tsv`](../quality/security/rules.tsv) as `IGNORE`, and the
workflow runs with `fail_action: true`. Effect: the known-and-accepted findings stay silent,
but **any new alert turns the scheduled scan red** — the scan is now a guard, not just a
logbook. A fresh scan (2026-07-28) confirmed the steady-state ignore-list is exactly:
`10055` (CSP unsafe-inline), `90003` (SRI), `90004` (COEP), `10027`, `10015`, `10049`, `10109`.

**Process rule:** to accept a *new* risk, add its plugin id to `quality/security/rules.tsv` **and** a note
here. Never silence an alert in the rules file without a matching justification in this file.
