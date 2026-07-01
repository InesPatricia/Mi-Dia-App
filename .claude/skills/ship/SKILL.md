---
name: ship
description: Ritualul complet de release pentru Mi Día — promoveaza cel mai nou mi-dia-vNN.html in index.html, bumpeaza CACHE in sw.js, ruleaza validari deterministe (validate.mjs: sync versiune + node --check + echilibru div) + suita e2e, actualizeaza CHANGELOG + CLAUDE.md, apoi commit + tag vNN + push DIRECT pe main cu confirmare (push = auto-deploy Cloudflare). Foloseste cand Ines spune "livreaza", "ship", "da drumul la vNN", "promoveaza", "push", "deploy".
---

# /ship — release ritual Mi Día

Automatizeaza lantul de livrare din `CLAUDE.md` (sectiunea "File / versioning workflow"
+ "Deployment"). Ruleaza din radacina repo (`Mi-Dia-App/`). **Nu pushezi NICIODATA
fara confirmarea explicita a lui Ines** — push pe `main` declanseaza auto-deploy pe
Cloudflare Pages.

Unde traieste versiunea in acest proiect (descoperit, NU e un `var VERSION`):
- **`mi-dia-vNN.html`** — build-ul propriu-zis (construit in timpul dezvoltarii, inainte de /ship).
- **`index.html`** — copie byte-identica a celui mai nou `mi-dia-vNN.html` (build-ul PROMOVAT).
- **`sw.js`** — `const CACHE = "mi-dia-vNN"` (forteaza stergerea cache-ului PWA vechi la deploy).
- **`CLAUDE.md`** (linia "Current latest build") + **`CHANGELOG.md`** — documentatia.

## Pas 0 — Pre-flight (read-only, nu modifici nimic)
1. `git status --short` — arata ce e necomis si pe ce branch esti (`git branch --show-current`).
2. Ruleaza validatorul determinist pe starea CURENTA:
   `node .claude/skills/ship/validate.mjs`
   - **FAIL > 0 → OPRESTE-TE** si raporteaza-i exact ce a picat. NU livra peste cod stricat.
   - WARN nu blocheaza (le vei rezolva la Pas 4 — docs desincronizate, build-uri vechi in tree).
   - Retine `mi-dia-vNN` detectat din output ca `vOLD`.
3. Ruleaza suita e2e completa (gate-ul real): `cd e2e && npm test`
   - Daca pica vreun test → raporteaza exact ce si OPRESTE-TE. (Daca Ines tocmai a rulat-o
     verde in aceeasi sesiune, poti sari peste — spune clar ca ai sarit si de ce.)

## Pas 1 — Stabileste versiunea de livrat
- In mod normal exista deja un `mi-dia-v(N+1).html` construit (cel mai nou fisier din tree).
  Confirma cu Ines ca ACELA e build-ul de livrat. Retine numarul ca `vNEW`.
- Daca `index.html` e deja byte-identic cu `mi-dia-vNEW.html` SI `sw.js` e deja pe `vNEW`
  (validate.mjs a zis "version sync OK" la Pas 0 si `vOLD == vNEW`), promovarea e gata —
  sari peste Pas 2 si spune asta.

## Pas 2 — Promoveaza + bumpeaza versiunea (in toate locurile)
Cu confirmarea lui Ines pe `vNEW`:
1. **Promoveaza:** copiaza `mi-dia-vNEW.html` peste `index.html` (byte-identic).
   PowerShell: `Copy-Item mi-dia-vNEW.html index.html -Force`
2. **sw.js:** `const CACHE = "mi-dia-vOLD";` → `"mi-dia-vNEW";` (edit targetat, o singura linie).
3. Tag-ul git il pui la Pas 5 (`git tag vNEW`), NU acum.

## Pas 3 — Re-valideaza (acum TREBUIE sa fie verde)
`node .claude/skills/ship/validate.mjs`
- Trebuie: `[1]` version sync OK (`index.html == mi-dia-vNEW.html == CACHE mi-dia-vNEW`),
  `[2]` 0 erori de sintaxa, `[3]` div echilibrat, **FAIL: 0**.
- WARN-urile `[5]` (docs) le rezolvi la Pas 4; WARN `[6]` (build-uri vechi) la Pas 5 (`git rm`).
- Daca a aparut vreun FAIL, repara inainte sa continui.

## Pas 4 — Actualizeaza documentatia INAINTE de commit (regula permanenta a lui Ines)
Din diff-ul REAL (`git diff`, nu din memorie):
1. **`CHANGELOG.md`** — adauga intrarea `vNEW` (ce s-a facut, pe scurt, in stilul de acolo,
   RO fara diacritice).
2. **`CLAUDE.md`** — actualizeaza linia "Current latest build: **`mi-dia-vNEW.html`**" +
   blocul de status/changelog daca s-a schimbat ceva durabil.
3. **Memoria** (`~/.claude/.../memory/`) — daca s-a schimbat ceva durabil (roadmap, status),
   actualizeaza fisierul relevant + `MEMORY.md`.
Ruleaza din nou `node .claude/skills/ship/validate.mjs` — WARN-urile `[5]` trebuie sa dispara.
Daca livrarea e doar promovarea unei versiuni deja documentate, sari peste ce e la zi si spune asta.

## Pas 5 — Commit + tag + push (CERE CONFIRMARE INAINTE DE PUSH)
Livrarea e **direct pe main** (ca ultimele commit-uri ale lui Ines). Arata-i comenzile EXACTE
si ASTEAPTA "da" inainte sa rulezi push-ul (push = actiune externa → auto-deploy Cloudflare):
```
git rm mi-dia-vX.html mi-dia-vY.html ...   # doar build-urile vNN superseded (pastreaza mi-dia-vNEW.html + index.html)
git add -A
git commit -m "feat: mi-dia-vNEW — <rezumat scurt>"
git tag -l vNEW            # verifica INTAI daca tag-ul exista deja
git tag vNEW              # DOAR daca linia de sus n-a intors nimic (tag-ul nu exista)
git push origin main && git push --tags
```
- **git rm:** sterge din tree DOAR fisierele `mi-dia-vNN.html` mai vechi decat `vNEW`
  (lista din WARN `[6]` de la validate.mjs) — regula "tree tine doar ultimul vNN + index.html".
  Fisierele vechi raman in istoricul Git (`git show <commit>:mi-dia-vNN.html`).
- **tag:** ruleaza `git tag -l vNEW` INTAI. Daca tag-ul exista deja, NU-l recrea —
  sari peste `git tag vNEW` si fa doar `git push --tags`.
- **mesajul de commit:** o linie clara in stilul istoricului (vezi `git log --oneline`),
  RO fara diacritice, terminata cu linia de co-autor ceruta de harness.
- **NU** `--no-verify`, **NU** `--force`.

## Pas 6 — Confirma deploy-ul
Dupa push, spune-i lui Ines:
- Cloudflare Pages e git-connected → **auto-deploy in ~1-2 min** pe https://mi-dia-app.pages.dev/.
- CI ruleaza `smoke-prod.yml` post-merge (asteapta noul `CACHE` in `/sw.js` live, apoi smoke pe cele 7 view-uri).
- Optional smoke rapid local: `cd e2e && npm run wait:deploy && npm run smoke:prod`.
- **Pasul manual al lui Ines ramane:** validarea pe Android real (native pickers, blur, fonturi,
  contrast axe pe velvet) — headless ≠ device.

---
### Note
- **Validatorul** (`validate.mjs`) e fara dependente (ESM, doar `node`). Prinde automat:
  versiune desincronizata (`sw.js` CACHE ↔ `index.html` ↔ `mi-dia-vNN.html`), `SyntaxError` in
  orice bloc `<script>`, dezechilibru `<div>`, ghilimele curbate in atribute HTML (WARN),
  docs desincronizate (WARN), build-uri vechi ramase in tree (WARN).
- **FAIL blocheaza** ship-ul; **WARN doar semnaleaza.** Ruleaza-l la Pas 0, Pas 3 si Pas 4.
- **Ce ramane pe seama ta / device (validate.mjs NU acopera):** contrast axe pe velvet, native
  pickers, blur/backdrop, fonturi (Ephesis + `background-clip:text`), UX pe Android real.
