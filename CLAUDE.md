# Mi Día — CLAUDE.md (slim)

> Restructurat 7 iulie 2026 (D-44). Acest fisier e deliberat SCURT — proiectul ruleaza pe doua
> scene; citeste doar ce atinge sarcina ta. Spec-ul tehnic complet al aplicatiei vechi =
> **`APP-HERITAGE.md`** (fostul CLAUDE.md, neredus).

## Limba (obligatoriu, fiecare sesiune)

Raspunde mereu in **romana FARA diacritice** (scrie `a i s t` in loc de `ă î ș ț`) — terminalul
Inesei nu le randeaza. Fisierele pot contine diacritice; chat-ul nu. Comentariile de cod pot fi
in engleza.

## Faza curenta (iulie 2026)

**Creare companie + laborator MVP.** Fundatia conceptuala e TERMINATA si INGHETATA; se lucreaza
in **cicluri de produs** intr-un laborator live (D-41: rezultat per ciclu = HTML + animatii +
texte + test + feedback + concluzii; documentele se actualizeaza DOAR daca un experiment schimba
o lege). **Zero cod pe aplicatia-zestre in aceasta faza.**

## Ritualul de start (lucrul in laborator — default-ul)

1. Citeste `private/IMPLEMENTATION_PROTOCOL.md` — CUM construim (traducere, nu inventie; fara
   ipoteza nu se construieste).
2. Citeste `private/mi-dia-status.md` (starea proiectului) + `private/Experiments/` cel mai
   recent `experiment-NNN.md` (starea ciclului curent).
3. Sprintul zilei il da Ines. Construieste. Orice decizie confirmata → `/decizie`.
4. Orice decizie de PRODUS trece prin **`/product-review`** (executa
   `private/PRODUCT_REVIEW_PROTOCOL.md`, D-47) — cele 11 etape, fara sarituri; exact un
   rezultat: APPROVED / APPROVED WITH EXPERIMENT / NEEDS REVISION / BLOCKED.
5. Orice build de laborator traieste intr-un experiment → **`/experiment`** (deschide/
   construieste+deploy/sesiuni de observatie/inchide `Experiments/experiment-NNN.md`; fara
   ipoteza nu se construieste; un ciclu se inchide inainte sa se deschida urmatorul).

## Cele doua scene (D-42)

1. **Laboratorul MVP** (AICI se lucreaza): `mi-dia-lab.pages.dev` ← sursa
   `private/Prototype/site/` (git LOCAL propriu — NU repo-ul public). Deploy direct:
   `cd private/Prototype && npx wrangler pages deploy site --project-name=mi-dia-lab --branch=main --commit-dirty=true`
   Doar `site/` se publica; notele raman private. Cycle 01 (Arrival) live la v4.
2. **Aplicatia-zestre** (INGHETATA): prod `mi-dia-app.pages.dev` (= v172, branch `main`) ·
   staging `staging.mi-dia-app.pages.dev` (= v184; **v185 acuarela = WIP local necommis** in
   working tree, parcat). **Inainte de ORICE atingere a `mi-dia-vNN.html` / `index.html` /
   `sw.js` / `e2e/` sau a skill-urilor `/ship` `/staging` `/design-check` `/theme-qa` `/revamp`:
   CITESTE `APP-HERITAGE.md`** — regulile de versionare (fisier nou per schimbare), lantul de
   validare (div-balance + `node --check` + screenshot ambele teme), sistemul de design LOCKED,
   modelul de date, i18n, changelog-urile. Abaterile zestrei fata de fundatie sunt MARCATE in
   `private/reconciliation-register.md` (R-01…R-15) si nu se "repara" fara decizia Inesei.

## Corpusul de documente (`private/`, gitignored — structura D-44)

- **Transversale la radacina:** `Constitution.md` (META-documentul, v1.8 — guverneaza tot) ·
  `IMPLEMENTATION_PROTOCOL.md` (v1.1 — cum construim) · `PRODUCT_REVIEW_PROTOCOL.md` (v1.5
  Canonical, D-47 — cum judecam ce am construit) · `ANTI-GOALS.md` (ce refuzam sa devenim) ·
  `reconciliation-register.md` · `research-os.md` (draft) · `mi-dia-status.md` (harta vie).
- **`Knowledge/`** (ce stim — cascada): `00 Philosophy/` (Philosophy.md ~80% + Human Change
  Theory.md v2.0 + Theory of Change.md) · `02 Grammar/` (README + `Sources/mvp-experience.md` —
  Grammar NU e inca formalizata) · `03 Product/Product Blueprint.md` (schelet, se umple din
  cicluri).
- **`Decision Log/design-decisions.md`** (ce am decis): D-01…D-47, append-only — "git history al
  gandirii". Orice decizie noua trece prin `/decizie`.
- **`Experiments/`** (cum am aflat): `experiment-NNN.md` — ipoteza · semnale · sesiuni ·
  concluzii.
- **`Open Questions/`** (D-45): OQ-001…OQ-006 — intrebari fundamentale PASTRATE deschise (nu
  TODO-uri); se inchid doar prin decizie explicita.
- **`Archive/`** (`absorbed/` · `superseded/` · `historical/`): istorie, nu gunoi — fiecare
  fisier cu stampila.
- **`Prototype/`** — laboratorul (git propriu). **`marketing/`** — legea de brand + sursele
  skill-urilor de continut (BOS v1.5, bible, brief, manifesto).

## Non-negociabile (orice agent, orice sarcina)

- **Constitutia e suprema**; nucleul relational INGHETAT (D-25): "ce relatie intareste?", nu "ce
  comportament schimba?".
- **Regula traducerii (D-26):** un nivel inferior NU introduce idei fundamentale noi.
- **Flag, don't silently fix:** inconsistentele se RIDICA (legea existenta se pastreaza, se cere
  amendament explicit) — Ines cere contrazicerea la nevoie.
- **BOS §22:** fara rusine/graba/streaks/badges/comparatie/urgenta. Floarea nu e niciodata scor.
  Zi de odihna = floare plina. Fara "0/N". NICIODATA push "we miss you".
- **Privacy = preconditie.** Fara abonament, niciodata. Dependenta = esec de produs.
- **Documentele urmeaza experimentele (D-41).** Vocea = martor, nu coach.
- Lista completa: `private/ANTI-GOALS.md`.
