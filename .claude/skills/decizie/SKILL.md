---
name: decizie
description: Capteaza o DECIZIE de design/viziune pe care Ines o confirma in timpul unei sesiuni si o propaga IMEDIAT in toata documentatia (jurnalul canonic de decizii + CLAUDE.md + memorie + planul + skill-urile afectate), ca sa se construiasca viziunea decizie-cu-decizie, cu o singura sursa de adevar. Foloseste cand Ines confirma o alegere ("imi place", "asa ramane", "confirmat", "mergem cu asta", "da, varianta X", "decizie:") SAU cand cere explicit sa "notezi/salvezi decizia". NU e /ship (livrare) — asta e captarea unei decizii intre livrari.
---

# /decizie — captureaza + propaga o decizie confirmata

Ines construieste designul + viziunea Mi Día **decizie cu decizie**. Cand confirma o alegere, decizia
trebuie sa devina INSTANT parte din sursa unica de adevar — nu sa se piarda in chat sau sa ramana doar in
codul unui `vNN`. Acest skill face captarea + propagarea, complementar cu `/ship` (care sincronizeaza tot la
livrare). Raspunde in **romana fara diacritice**.

## Cand se declanseaza
- Ines confirma explicit o directie/alegere: „imi place", „asa ramane", „confirmat", „mergem cu asta",
  „da, varianta B", „pastram X", „decizie: …".
- Ines cere „noteaza decizia asta" / „salveaza ce am hotarat".
- La finalul unei felii pe care o confirma ok (vezi memoria `docs-sync-after-confirmed-iteration`).

Daca ceva e inca in discutie / neconfirmat, NU inregistra — intreaba scurt sau asteapta confirmarea.

## Pasii

**1. Formuleaza decizia precis (o singura decizie per intrare).** Scrie, in cuvintele lui Ines cat se poate:
- **CE** s-a decis (afirmativ, concret, testabil).
- **DE CE** (rationamentul / ce problema rezolva / ce valoare de brand serveste).
- **ALTERNATIVE respinse** (ce NU alegem si de ce — ca sa nu se re-litigheze).
- **DOMENIU** (nav / floare / copy-voce / culoare / layout / monetizare / date …).
- **STARE** (directie aprobata · implementat in `vNN` · livrat) + data ABSOLUTA.

**2. Adauga in jurnalul canonic `private/Decision Log/design-decisions.md`** (creeaza-l daca lipseste — vezi structura mai
jos). O intrare noua, NUMEROTATA (D-NN), cea mai recenta sus sub un antet scurt. NU duplica: daca o decizie
o inlocuieste pe alta, marcheaza vechea „(inlocuita de D-NN)" si scrie noua.

**2b. Verifica conformitatea cu FUNDATIA** — Constitutia (`private/Constitution.md`,
versiunea curenta in header) + **Theory of Change** (`private/Knowledge/00 Philosophy/Theory of Change.md` — modelul
cauzal; o decizie de produs care contrazice cele 7 legi sau lantul Siguranta→…→Libertate se
semnaleaza) + **BOS Vol. I** (`private/marketing/mi-dia-bos-vol1.md` — legea
experientei, incl. §22 „what should never exist" + Golden Question §33). Ierarhia (clauza de primat,
D-14): Constitutie → Research OS + BOS → bible/brief → acest jurnal → restul, INCLUSIV app-ul deja
construit. O decizie care contrazice un non-negotiable NU se inregistreaza ca precedent — semnaleaza
conflictul lui Ines: fie decizia se reformuleaza, fie legea se amendeaza explicit, in scris (niciodata
tacit). Daca decizia priveste o abatere marcata in `private/reconciliation-register.md` (R-NN),
actualizeaza si statusul intrarii — in AMBELE oglinzi (md + html raman 100% mapate).

**3. Propaga in sursa de adevar** — actualizeaza DOAR ce e atins de decizie (nu tot, de fiecare data):
- **Satelitii din `docs/`** (spec-ul tehnic al zestrei) si/sau **`private/LAB.md`** (faza / ritualul
  de start / structura corpusului) — care din ele e atins. In `docs/`: exact un fisier per tip de
  schimbare — `DESIGN_SYSTEM.md` (regula de design sau token), `DATA_SCHEMA.md` (cheie de
  localStorage), `APP-REFERENCE.md` (comportament), `docs/history/BUILD-LOG.md` (detaliu per-versiune).
  Daca decizia schimba o regula LOCKED de design, actualizeaza regula, nu adauga langa ea.
  **`CLAUDE.md` nu se atinge** — e routerul, neutru pe branch, pazit de `node scripts/check-docs.mjs`.
- **Memorie** (`~/.claude/projects/.../memory/`) — fisierul relevant (`living-flower-*`, `luxe-revamp-plan`,
  `coherence-arc-v156`, etc.) + un rand in indexul MEMORY.md daca e o memorie noua. Vezi regulile de memorie.
- **Planul** `private/Archive/historical/living-flower-build-plan.md` — daca decizia schimba o felie / mecanica / reteta.
- **Skill-urile afectate** — daca decizia schimba o regula de design pe care o impune un skill:
  `design-check` (sistem de design), `.claude/skills/theme-qa/color-roles.md` (rol de culoare), `marketing-design`
  (DNA de brand pt suprafete noi). Actualizeaza regula in skill ca sa ramana gardian corect.

**4. Verifica consecventa.** Aceeasi decizie sa nu se contrazica intre fisiere. Versiune + numar teste
corecte peste tot (daca s-a atins). Fara drift.

**5. Confirma-i lui Ines, scurt:** ce ai inregistrat (D-NN) + exact ce fisiere ai atins. Fara promovare/commit
(aia e `/ship`).

## Structura `private/Decision Log/design-decisions.md`

```
# Mi Día — Jurnal de decizii de design & viziune
> Sursa canonica a alegerilor confirmate de Ines, decizie cu decizie. Cea mai recenta sus.
> Intretinut prin skill-ul /decizie. NU e changelog de cod (ala e CHANGELOG.md) — aici sunt DECIZIILE + DE CE.

## D-NN · <titlu scurt> — <stare> (<data absoluta>)
- **Decizie:** …
- **De ce:** …
- **In loc de:** … (alternative respinse)
- **Domeniu:** … · **Aparuta in:** vNN / mockup / discutie
- **Propagat in:** CLAUDE.md §…, memoria …, planul §…, skill …
```

## Note
- `private/` e gitignored (vezi memoria `public-release-tidy`) — jurnalul de decizii sta acolo, nu in repo public.
- O intrare = o decizie atomica. Daca Ines confirma mai multe deodata, scrie-le separat (D-NN, D-NN+1…).
- Legatura cu `/ship`: la livrare, `/ship` sincronizeaza tot; `/decizie` tine sursa la zi INTRE livrari, ca
  planul + CLAUDE.md sa reflecte mereu ultima directie confirmata.
