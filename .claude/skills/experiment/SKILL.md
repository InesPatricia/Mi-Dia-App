---
name: experiment
description: Ciclul de viata al unui experiment in laboratorul Mi Día (mi-dia-lab.pages.dev) — deschide experiment-NNN.md cu structura obligatorie (ipoteza, semnale, criterii, moduri de esec), construieste + deployeaza prototipul din private/Prototype/site/, ghideaza sesiunile de observatie umana (participanta zero / femei reale) si INCHIDE experimentul cu interpretare + concluzie scrisa. Foloseste cand Ines spune "deschide un experiment", "Cycle NN", "deployeaza pe lab", "am facut o sesiune / feel-test", "inchide ciclul", sau cand /product-review da APPROVED WITH EXPERIMENT. Impune: fara ipoteza nu se construieste; un ciclu se INCHIDE inainte sa se deschida urmatorul.
---

# /experiment — regula experimentelor, facuta unealta

**Sursele de adevar:** `private/IMPLEMENTATION_PROTOCOL.md` (Rule of Experiments + Human
Observation Before Metrics + regulile de craft) · `private/PRODUCT_REVIEW_PROTOCOL.md` Stage 10 ·
D-41 (cicluri de produs; documentele urmeaza experimentele) · D-42 (scena laboratorului). Acest
skill doar le executa; daca difera, legea castiga. Raspunde in **romana fara diacritice**.

Principiul: **"Every prototype exists to test a hypothesis. Never prototype because something
feels nicer."** Si: nu deschide un ciclu nou daca cel curent nu are Concluzie scrisa.

## Modurile (foloseste-l pe cel cerut de moment)

### A. DESCHIDE un experiment

1. Verifica in `private/Experiments/` ca experimentul anterior e INCHIS (are Concluzie). Daca nu
   e — semnaleaza si opreste-te; disciplina D-41 nu se negociaza.
2. Propunerea a trecut prin `/product-review`? Daca nu, ruleaza-l intai (Stage 10 cere exact asta).
3. Creeaza `private/Experiments/experiment-NNN.md` (numarul urmator) cu structura OBLIGATORIE —
   toate campurile completate inainte de orice cod:

```
# Experiment NNN — <numele ciclului / intrebarii>

## Ipoteza
O singura fraza, falsificabila. (Ex. 001: "Poate un produs digital sa transmita
siguranta inainte sa ceara ceva?")

## Rationale
Ce lege traduce / ce testeaza: principiul din Philosophy/Theory (predictiile P1-P6 unde e cazul)
+ D-NN relevante + OQ-NNN atinse.

## Prototip
Ce se construieste, MINIMAL. Ce NU se construieste (interventie minima).

## Semnale observabile
INTAI umane: expresie, ezitare, limbajul corpului, liniste, confuzie, usurare, prezenta,
cuvintele spontane (verbatim). Abia apoi, optional, proxy-uri blande. NICIODATA durata/retentie
ca semnal principal.

## Criterii de succes
Ce ar confirma ipoteza. Ce ar infirma-o.

## Moduri posibile de esec
Inclusiv esecul tacut: "arata bine dar nu schimba nimic".

## Sesiuni
(se completeaza pe parcurs — vezi modul C)

## Interpretare
(la inchidere)

## Concluzie
(la inchidere)
```

### B. CONSTRUIESTE + DEPLOY

1. Codul traieste in `private/Prototype/site/` (git LOCAL propriu — commit acolo per iteratie;
   NU in repo-ul public). Doar `site/` se publica; notele raman private.
2. **Craft-ul laboratorului** (din protocol + D-40/D-42, obligatoriu): forma poarta viata,
   miscarea doar o sopteste · iesirile mai scurte decat intrarile · linistea e gest de design ·
   reduced-motion = viu prin lumina, nu mort · vocea = martor (recunoaste, nu celebreaza; invita,
   nu prescrie; "doua propozitii nu au voie sa existe in acelasi timp") · paleta = halat de
   laborator (R-06 ramane deschisa — prototipul NU o decide) · zero mecanici din ANTI-GOALS.
3. Deploy: `cd private/Prototype && npx wrangler pages deploy site --project-name=mi-dia-lab --branch=main --commit-dirty=true`
4. Noteaza in fisierul experimentului ce versiune (v1, v2…) e live si ce s-a schimbat fata de
   precedenta — O schimbare semnificativa per iteratie, ca sa stii ce a produs efectul (lectia
   D-40: schimbate simultan, nu mai stii ce lucreaza).

### C. SESIUNE de observatie (participanta zero sau femei reale)

Protocolul de observatie (Human Observation Before Metrics):
- **Inainte de sesiune:** nu-i spune ce "ar trebui" sa simta. Intrebari deschise, niciodata care
  conduc martorul: "cum a fost?" — NU "ti s-a parut sigur?". Consimtamant explicit; fara
  inregistrari fara acord; participantele raman anonime in note (P0, P1, P2…).
- **In sesiune, observa in ordinea asta:** expresia fetei · ezitarea · limbajul corpului ·
  linistea · confuzia · usurarea · prezenta. Cuvintele spontane se noteaza VERBATIM — valoreaza
  mai mult decat orice analytics.
- **Dupa sesiune,** scrie in `## Sesiuni` din fisierul experimentului: data · participanta ·
  varianta vazuta (vN) · semnale observate (fapte, nu interpretari) · cuvinte verbatim · ce
  intrebari a ridicat. Interpretarea se tine SEPARAT de observatie.
- Zero senzori/analytics adaugate in prototip pentru sesiuni ("why should Mi Día know this?").

### D. INCHIDE experimentul

1. Scrie `## Interpretare` — separand explicit: fapte / presupuneri / inferente / speculatii
   (Rule of Honest Disagreement). Include si ce NU stim inca.
2. Scrie `## Concluzie` — a fost confirmata ipoteza? ce am invatat? ce urmeaza?
3. **Documentele urmeaza experimentele (D-41):** daca concluzia confirma/schimba o
   lege-candidat → RIDIC-o lui Ines (nu edita canonul din proprie initiativa) → la confirmarea
   ei, `/decizie` (D-NN) + propagare. Daca a nascut o intrebare fundamentala → propune un
   `Open Questions/OQ-NNN.md` nou.
4. Abia acum se poate deschide ciclul urmator.

## Ce NU face skill-ul

- Nu construieste fara ipoteza scrisa ("If no hypothesis exists, the prototype should not be built.").
- Nu atinge aplicatia-zestre (`mi-dia-vNN.html` etc. — aia e scena inghetata; specul ei e in `docs/`).
- Nu scrie direct in `Knowledge/` — canonul se schimba doar prin Ines + `/decizie`.
- Nu colecteaza date "pentru ca se poate". Absenta datelor e decizie de design.
