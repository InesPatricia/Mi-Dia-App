---
name: product-review
description: Ruleaza o propunere de PRODUS Mi Día prin PRODUCT_REVIEW_PROTOCOL v1.5 (D-47) — cele 11 etape obligatorii, fara sarituri — si intoarce EXACT UN verdict (APPROVED / APPROVED WITH EXPERIMENT / NEEDS REVISION / BLOCKED). Foloseste cand Ines propune un feature/ecran/copy/animatie/notificare/idee de growth pentru MVP-ul din laborator, cand spune "treci asta prin review" / "review de produs", INAINTE de a construi orice nou in Prototype/, sau cand /experiment cere validarea propunerii (Stage 10). NU e /code-review (ala e pe cod) si NU e pentru aplicatia-zestre inghetata.
---

# /product-review — executa legea de review (D-47)

**Sursa de adevar = `private/PRODUCT_REVIEW_PROTOCOL.md` (v1.5 Canonical).** Acest skill e doar
PROCEDURA care face legea executabila; nu adauga si nu scade nimic. Daca skill-ul si protocolul
difera vreodata, protocolul castiga. Raspunde in **romana fara diacritice**.

Scopul review-ului nu e sa imbunatateasca feature-uri. E sa **protejeze coerenta**. Nu optimiza
pentru acord ("Agreement is never required. Intellectual honesty is.") — un review care aproba
tot e un review mort.

## Cand se declanseaza

Orice decizie de produs (scope-ul legii: UX, UI, interactiune, vizual, copy, comportament AI,
animatii, notificari, onboarding, a11y, personalizare, privacy, experimente, idei de growth,
decizii de inginerie cu impact pe experienta). **No implementation is exempt** — inclusiv
propunerile venite de la agent.

## Pasii

**0. Citeste intai:**
- `private/PRODUCT_REVIEW_PROTOCOL.md` (legea, integral — nu din memorie);
- propunerea, formulata intr-o fraza clara (daca e vaga, cere-i lui Ines clarificare INAINTE de review);
- canonul relevant: `private/Constitution.md` + `private/ANTI-GOALS.md` + `Knowledge/00 Philosophy/`
  + `Knowledge/02 Grammar/Sources/mvp-experience.md` + ultimele decizii din
  `private/Decision Log/design-decisions.md` + orice `Open Questions/OQ-NNN.md` atins.

**1. Ruleaza cele 11 etape IN ORDINE, fara sarituri.** Pentru fiecare etapa scrie 1-3 propozitii
de rationament onest (nu bife). Reguli speciale:
- **Stage 2 (aliniere filosofica):** citeaza EXPLICIT principiul din Philosophy + legea din Theory
  + regula de Grammar. Nota de aplicare D-47: Grammar nu e inca formalizata → intrebarea 6 se
  raspunde din SURSELE ei (legile sprintului D-31…D-37, `Knowledge/02 Grammar/Sources/`). Fara
  origine filosofica → nu exista implementare.
- **Stage 3:** numeste capacitatile canonice cultivate (Safety · Observe · Understand · Honor ·
  Express · Integrate · Belong). Zero capacitati → propunerea nu merge mai departe.
- **Stage 4:** numeste relatia care devine mai sanatoasa. Nicio relatie → propunerea nu apartine
  Mi Día.
- **Stage 6 (integritate psihologica):** ORICE "da" (vina, presiune, dependenta, comparatie,
  performanta-in-loc-de-relatie, autonomie redusa) → cere redesign, nu nota de subsol.
- **Stage 8 (etica):** orice indoiala → propunerea SE OPRESTE (pauza, nu "mergem si vedem").
- **Stage 10 (experiment):** nimic nu intra pentru ca "credem ca e corect". Daca propunerea nu
  are inca ipoteza + semnale + criterii → verdictul maxim posibil e APPROVED WITH EXPERIMENT, iar
  urmatorul pas e `/experiment`.
- Pe tot parcursul: distinge **fapte / presupuneri / inferente / speculatii** (Rule of Honest
  Disagreement); verifica si `ANTI-GOALS.md` + BOS §22 (cele 19 interdictii) — o coliziune acolo
  e conflict cu principii superioare.

**2. Golden Question** (abia dupa cele 5 intrebari din Stage 11): *creste probabilitatea unei
relatii autentice — sau doar probabilitatea inca unei sesiuni in aplicatie?* Daca doar creste
utilizarea, nu apartine Mi Día.

**3. Verdictul — EXACT UNUL:**
- **APPROVED** — traduce fidel principiile; poate merge mai departe (de regula prin `/experiment`
  pentru build).
- **APPROVED WITH EXPERIMENT** — promitatoare, dar cere validare inainte de adoptie; deschide
  `/experiment` cu ipoteza formulata la Stage 10.
- **NEEDS REVISION** — are valoare, dar incalca unul sau mai multe criterii; spune EXACT ce etape
  a picat si ce trebuie regandit. Nu propune tu "versiunea reparata" ca si cum ar fi aprobata —
  redesignul e o propunere noua, care intra din nou in review.
- **BLOCKED** — contrazice principii de nivel superior. Implementarea SE OPRESTE. Numeste
  principiul contrazis (articolul din Constitutie / legea din Theory / linia din ANTI-GOALS).
  Doar Ines poate rezolva conflictul: reformulare sau amendament explicit (prin `/decizie`).
  Corectiile tacite sunt interzise.

**4. Livreaza review-ul** ca raport scurt: tabelul celor 11 etape (o linie fiecare: trecut/picat
+ motivul) + Golden Question + verdictul cu rationamentul. Daca review-ul face parte dintr-un
ciclu activ, scrie-l si in `private/Experiments/experiment-NNN.md` (sectiunea Review a buildului);
daca e o idee de sine statatoare, ramane in chat pana devine build.

## Ce NU face skill-ul

- Nu judeca aplicatia-zestre (aia are registrul R-01…R-15 si deciziile per-intrare ale Inesei).
- Nu inlocuieste `/decizie` (verdictul unui review nu e o decizie de viziune; daca Ines confirma
  o directie in urma review-ului, aia se capteaza separat).
- Nu "negociaza" un BLOCKED. Un BLOCKED sta pana la amendament.
