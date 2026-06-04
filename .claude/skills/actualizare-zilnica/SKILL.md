---
name: actualizare-zilnica
description: End-of-day wrap-up for the Mi Día project. Reviews the day's work, validates the single HTML source, syncs docs/memory with ONLY confirmed and verified facts, then commits and pushes. Use when the user wants to "close the day", "update the project at end of day", or asks for a daily project update / wrap-up.
---

# Actualizare zilnica — Mi Día

Ruleaza la finalul zilei. Scopul: aduce proiectul "la zi" cu **doar informatii confirmate si corecte** — nimic presupus, nimic neverificat.

## Reguli de aur (nu le incalca)

- **Confirmat = verificat.** Inregistreaza/commite doar ce a trecut validarea SAU ce a fost confirmat explicit de Ines in conversatie. Daca un lucru e in lucru, incert sau experimental, NU il commita si NU il scrie in docs/memorie.
- **Nu inventa.** Daca nu stii sigur, intreaba sau lasa pe dinafara.
- **Raspunde in romana FARA diacritice** in chat. In aplicatie (i18n) textele raman cu diacritice corecte.
- **Un singur fisier sursa:** `mi-dia.html`. Fara build, fara fisiere noi de cod. Editari tintite, nu rescrieri mari.
- Daca nu exista nicio schimbare confirmata azi, spune asta clar si NU face commit gol.

## Pasi

### 1. Vezi ce s-a intamplat azi
```
git status
git log --since="06:00" --oneline
git diff            # modificari nestageuite
git diff --staged   # modificari stageuite
```
Identifica ce s-a schimbat real fata de inceputul zilei.

### 2. Valideaza sursa (OBLIGATORIU inainte de orice commit)
Ruleaza din radacina proiectului (Python lipseste pe masina asta — foloseste Node):
```
node -e "const fs=require('fs');const html=fs.readFileSync('mi-dia.html','utf8');const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);s.forEach((x,i)=>fs.writeFileSync('_tmp_eod'+i+'.js',x));let b=html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');const o=(b.match(/<div\b/g)||[]).length,c=(b.match(/<\/div>/g)||[]).length;console.log('Script blocks:',s.length,'| DIV:',o,'/',c,o===c?'OK':'MISMATCH');"
node --check _tmp_eod0.js && echo "JS OK"
```
Sterge fisierele `_tmp_eod*.js` dupa. **Daca DIV != balansat sau JS pica → opreste-te, raporteaza, NU commita.**

### 3. Sincronizeaza documentatia (doar fapte confirmate)
- **CLAUDE.md** — daca o functie a fost FINALIZATA si verificata azi, mut-o din "On the horizon" in "App features". Daca s-a schimbat modelul de date sau arhitectura, actualizeaza sectiunea respectiva.
- **README.md** — actualizeaza doar daca s-a schimbat comportament vizibil pentru utilizator (cum rulezi, backup, model de date). Pastreaza cele 3 limbi (EN/ES/RO) sincronizate.
- Nu adauga in docs functii neterminate ca si cum ar fi gata.

### 4. Actualizeaza memoria (fapte de proiect confirmate)
Scrie in `C:\Users\Ines\.claude\projects\C--Users-Ines-Desktop-Mi-Dia-App\memory\`:
- Doar `type: project` pentru lucru in curs / decizii confirmate care NU se deduc din cod sau istoricul git.
- Converteste datele relative in absolute ("azi", "saptamana viitoare" → data exacta).
- Verifica intai daca exista deja un fisier pe acel subiect — actualizeaza-l, nu duplica.
- Adauga un rand in `MEMORY.md` pentru fiecare memorie noua.

### 5. Commit + push
- Grupeaza schimbarile logic (un commit pentru cod, altul pentru docs daca e cazul).
- Mesaje clare, descriptive. Termina fiecare mesaj cu:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Esti pe `main` (proiect personal) — commit direct si `git push origin main`.
- NU adauga `.claude/` (e in .gitignore). Stageaza explicit fisierele relevante.

### 6. Raport final
Da un rezumat scurt in romana (fara diacritice): ce s-a confirmat si urcat azi, ce a ramas in lucru pentru maine, si confirma ca `git status` e curat si branch-ul e sincronizat.

## Daca ceva nu e clar
Daca nu poti stabili daca o schimbare e "confirmata si corecta", intreab-o pe Ines inainte sa o incluzi. Mai bine lasi pe dinafara decat sa scrii ceva gresit.
