---
name: security-triage
description: Run and triage an OWASP ZAP passive security scan of Mi Día production, then close the loop. Takes a fresh scan, diffs it against the accepted risks in SECURITY-NOTES.md + quality/security/rules.tsv, sorts every NEW finding into a fix (shipped via the _headers file) or a documented accepted risk, and re-scans to prove the before/after delta. Use when Ines says "run a security scan", "ruleaza ZAP / scan de securitate", "triage the findings", "check the headers", "did the tripwire go red", or when the weekly zap-baseline workflow fails. NOT for performance (use /perf-check) and NOT a penetration test (the scan is passive only).
---

# /security-triage — ZAP passive-scan triage loop

Encapsulates the security-baseline discipline built for the frozen heritage app: **every
finding becomes a fix or a written accepted risk — nothing is ignored silently.** The app is a
zero-backend static PWA, so the scan is passive (response inspection, no attack payloads).

Read `SECURITY-NOTES.md` and `quality/security/rules.tsv` first — they are the source of truth for what is
already accepted.

## Steps

**Reply in Romanian without diacritics.** Everything written into the repository — findings, notes,
commits — stays in English.

1. **Trigger a fresh scan.** Dispatch the `zap-baseline` workflow (Actions tab → Run workflow, or
   `POST .../actions/workflows/zap-baseline.yml/dispatches` with the stored git credential). Wait
   for it to complete; download the `zap-baseline-report` artifact (`report_json.json`).

2. **Before reading any alert, check that the scan ran at all.** A red `zap-baseline` is not
   evidence of a finding. It is equally the shape of a broken tool, and the two are indistinguishable
   in the Actions list. Open the log and look for the summary line:

   ```
   FAIL-NEW: n   WARN-NEW: n   IGNORE: n   PASS: n
   ```

   If it is absent, the scan did not start and there is nothing to triage. Read the error instead.
   The one that has already happened is a config parse:
   `Failed to load config file ... there should be at least 3, tab separated`, which means a rule
   line in `quality/security/rules.tsv` lost its third column. That outage lasted seven weeks and is
   written up in `docs/SECURITY-NOTES.md`. A scan reporting `PASS: 60` has done work; a scan
   reporting nothing has not.

3. **List the alerts by plugin id.** Parse `report_json.json` → for each alert print
   `pluginid | riskdesc | name`. This is the authoritative current state of production, not an
   old report.

4. **Diff against accepted risks.** Compare the plugin ids against the IGNORE list in
   `quality/security/rules.tsv` (each id is cross-referenced to a numbered accepted risk in
   `SECURITY-NOTES.md`). Split findings into:
   - **known-accepted** (id already IGNORE) → no action;
   - **NEW** (id not on the list) → triage in step 5.

5. **Triage each NEW finding, one verdict and no third option:**
   - **Fix** → almost always a response header. Add it to `_headers`, validate on a branch
     **preview** first (Cloudflare applies `_headers` to previews), run the 7-test smoke against
     the preview URL, then ship via PR. Watch for the service-worker CSP gotcha: `sw.js` re-fetches
     everything, so `connect-src` must allow any external host the app talks to (Google Fonts).
   - **Accept** → add its plugin id to `quality/security/rules.tsv` as IGNORE **and** a matching numbered
     justification in `SECURITY-NOTES.md`. Never silence in the rules file without a note.

6. **Re-scan for the delta.** Dispatch ZAP again; confirm the fixed ids are gone and only the
   accepted ids remain. Record the before/after delta as a new dated section in `SECURITY-NOTES.md`.

## Guardrails

- Passive only. Do not enable active/attack scanning against production.
- The scan is a **tripwire**: `fail_action: true` means any id NOT in `quality/security/rules.tsv` turns the
  run red. Keep the rules file and `SECURITY-NOTES.md` in lockstep — an id in one must have an
  entry in the other.
- **Three tab-separated columns per rule line, and the third cannot be empty.** ZAP counts tabs on
  the raw line and then strips the line before unpacking it, so a trailing tab passes the count and
  fails the unpack. For an IGNORE that third column is a note, not a URL regex. Getting this wrong
  does not produce a bad scan, it produces no scan.
- Header changes touch production delivery: ship through the normal PR + gates, validate on a
  preview, and rely on smoke-prod for the post-deploy net.
- This is git-visible: write findings and notes in English.
