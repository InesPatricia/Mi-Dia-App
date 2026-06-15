# Mi Día v110 — Checklist QA pe Android real

> Ce nu pot testa eu (headless). Bifeaza pe telefon. Daca ceva pica, spune-mi exact ce ecran.
> Inlocuieste checklist-ul v102 (fluxul ciclului s-a schimbat: logare reala, luna, opt-in).

## A. Opt-in (Setari)
- [ ] Setari → comutatorul **"Urmărește-ți ciclul"** apare si se aprinde/stinge.
- [ ] Cu el **stins**: in Calendar NU apare "Ritmul meu" / luna; in Progres NU apare panoul de ciclu.
- [ ] Cu el **aprins**: apar "Ritmul meu" + luna in Calendar si panoul in Progres.

## B. Logare + istoric (Calendar → Ritmul meu)
- [ ] Buton mare **"Menstruația a început azi"** → se adauga in istoric; toast "Salvat ✓".
- [ ] **"altă dată…"** → native date picker → Adaugă o data retroactiva.
- [ ] **Istoric**: fiecare menstruatie + "N zile" (sau "în curs" pentru ultima); × sterge o inregistrare.
- [ ] **"Urmatoarea menstruatie estimata"** se actualizeaza dupa logare.
- [ ] La ≥2 loguri: **"Lungime medie (din ciclurile tale)"** se calculeaza singur; la <2, apare stepper-ul manual.
- [ ] Native date picker se deschide corect; butoanele se ating usor (≥44px).

## C. Luna (indicatorul de faza)
- [ ] In Calendar: luna + "Ziua N · faza · estimat". **Forma lunii** = faza:
  - menstruatie → lună (aproape) nouă;
  - foliculara → crescent crescator (iluminat pe **dreapta**), **nu plin**;
  - ovulatie → lună **plină**;
  - luteala → descrescator (iluminat pe **stanga**).
- [ ] Atingi stripul → overlay **"Luna ta"**: arcul celor 4 faze (luni) + fisa educativa + disclaimer + buton "Ritmul meu".

## C2. Marcaj menstruatie in grila (v110) + "de cand pana cand"
- [ ] Cu ciclul activat, zilele de menstruatie au **numar rose + linie rose dedesubt** (din start + durata sangerarii).
- [ ] Navighezi **Lună/An** la o luna din trecut (ex. februarie anul trecut) → vezi exact zilele marcate ("de la–până la").
- [ ] Marcajul nu se bate cap in cap cu fundalul-stare / bulinele de arii / sloturi pe zilele incarcate.
- [ ] Dupa ce loghezi/editezi din "Ritmul meu", grila se actualizeaza (re-randare live).
- [ ] In **Istoric**: fiecare intrare = **interval + an** (ex. "3–7 feb 2025"); listă fină (un rand per ciclu); tap pe o intrare → editezi sângerarea / o ștergi; golurile mari (>90 zile) NU arata "ciclu" fals.

## D. Persistenta (v102, neschimbata)
- [ ] Cu date si fara backup recent → banner "Fă un backup…" **sub** "Tot ce adaugi se salvează automat…".
- [ ] **Backup acum** → descarca `…backup….json`; bannerul dispare; Setari arata "Ultimul backup: <data>".
- [ ] (iPhone neinstalat) apare indemnul "Adaugă pe ecranul de start"; (Android) butonul "Instalează" daca apare promptul.

## E. Export/Import include ciclul (critic)
- [ ] Export → JSON-ul contine cheia **`cycle`** cu `periods` (lista ta) + `enabled`.
- [ ] Import pe alt telefon / dupa stergere → **ritmul + istoricul revin** (luna/faza reapar).

## F. Regresie pe ecranele existente
- [ ] Petala + titlul ecranului = **"Respiro"** (nu "Calm"); toggle Calmează-mă/Trezește-mă merge.
- [ ] **Home curat**: header fara linia de sub traducere; **o singură floare** (nav); fara floare/ciclu pe Home.
- [ ] Schimbarea limbii **EN/ES/RO** schimba: "Ritmul meu", "Urmărește-ți ciclul", luna/faza, petala Respiro, bannerul.
- [ ] Jurnal (stare, pauza de permisiune, roata emotiilor), Calendar (fundal/buline/emotie/sloturi), Progres (Ore pe arie, Echilibru, Stare↔productivitate), Profil, Proiecte, Plan zilei (timer) — neschimbate.

## G. Specific de dispozitiv (difera de headless)
- [ ] Native date picker, blur la overlay, fonturi, touch targets.
- [ ] Toast-ul (sus) nu acopera nimic.
- [ ] Sheet-uri / strip / panou de ciclu pe ecran ingust (≤360px) — fara taieri/overlap.

---
Daca toate trec → feature-ul ciclu e închis. `CLAUDE.md` e deja adus la zi (v107).
Cicluri: marcaj calendar (V3) + interval-an in istoric = DONE (v110). Open mic ramas: B6 (clip "min" la durata), `--rose:#CB8188` mov legacy (~13×), temperarea temei (decizie de brand).
