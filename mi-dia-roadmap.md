# Mi Día — Roadmap go-live & monetizare (iunie 2026)

> Cadru onest: $1M e un obiectiv pe 2–4 ani, de tip power-law (≈94% dintre dezvoltatori fac
> sub $1k/luna). Venitul depinde de **activare + retentie + conversie**, nu de estetica.
> Claude NU introduce niciodata credentiale/plati pentru tine — construieste fluxul, tu testezi
> cu conturile tale.

## Faza 0 — Igienizare (acum)
- QA real pe Android (`qa-checklist-v110.md`).
- Sincronizare spec + memorie cu build-ul curent (v125).
- Backlog de coerenta UX (titluri duplicate, emoji empty-state, linia de traducere in foto, metrici
  duplicate Progres/Profil, date-nav — DONE v125, token mauve `--rose:#CB8188`).

## Faza 1 — Pre-public
- Onboarding (primul „aha" rapid: o intentie + o intrare de jurnal).
- GDPR / legal EU (politica de confidentialitate, termeni, consimtamant).
- Landing page + analytics care respecta confidentialitatea (Plausible/Umami).
- Lighthouse (performanta/PWA) + accesibilitate (a11y).

## Faza 2 — Backend (auth + cloud sync)
- Rezolva evictia localStorage pe iOS Safari (~7 zile) + pregateste platile.
- Optiuni: **Supabase** / **Firebase** / **Cloudflare (D1 + Workers)** — D1+Workers ramane pe stack-ul tau.
- Sync per-cont, conflict last-write-wins la inceput.

## Faza 3 — Distributie in store
- **TWA / wrapper** pentru Google Play (PWA ramane sursa unica).
- Icon-uri, screenshots, descriere trilingva.

## Faza 4 — Monetizare / retentie
- **Freemium + paywall dupa momentul de valoare** (nu din prima).
- Nudge anual; preturi de referinta: Fabulous (~$8–15/luna), Finch.
- Plati web: **Stripe** sau **Paddle** (Paddle = merchant-of-record in EU, se ocupa de TVA).

## Faza 5 — Iteratie pe date
- Masoara activare / retentie D1-D7-D30 / conversie; itereaza pe ce misca acele cifre.

## Candidati backend (de cantarit)
- Supabase (Postgres + auth, generos free), Firebase (rapid, Google), Cloudflare D1+Workers (pe stack).
- Plati: Stripe (flexibil) vs Paddle (MoR, TVA EU automat).
