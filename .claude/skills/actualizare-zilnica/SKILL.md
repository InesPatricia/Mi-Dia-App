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
- **Versionare:** iteram in fisiere `mi-dia-vNN.html` (cel mai mare `NN` = ultima versiune); `mi-dia.html` e **oglinda** versiunii curente. Toate sunt urmarite in git. Fara build, fara backend, editari tintite.
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

### 2. Promoveaza automat ultima versiune vNN -> mi-dia.html
Fluxul proiectului: iteram in `mi-dia-vNN.html`; `mi-dia.html` e oglinda celei mai noi versiuni.
1. Gaseste ultima versiune (cel mai mare `NN`):
   ```
   node -e "const fs=require('fs');const f=fs.readdirSync('.').filter(x=>/^mi-dia-v\d+\.html$/.test(x));const l=f.map(x=>({x,n:+x.match(/v(\d+)/)[1]})).sort((a,b)=>b.n-a.n)[0];console.log(l?l.x:'NONE');"
   ```
2. Daca rezultatul e `NONE` (nu exista versiuni), sari peste promovare si lucreaza direct cu `mi-dia.html`.
3. Altfel, **copiaza** ultima versiune peste `mi-dia.html` (idempotent — daca e deja la zi, git nu va vedea nicio schimbare):
   - bash: `cp <ultima-vNN> mi-dia.html`  ·  PowerShell: `Copy-Item <ultima-vNN> mi-dia.html -Force`
4. Daca `git status --short mi-dia.html` arata o schimbare, actualizeaza in `CLAUDE.md` linia `Current latest build: ...` cu numele ultimei versiuni.
5. **Asigura-te ca noul fisier `mi-dia-vNN.html` e adaugat in git** (sunt fisiere urmarite, nu ignorate) — il stageezi la pasul de commit.

### 3. Valideaza sursa (OBLIGATORIU inainte de orice commit)
Valideaza `mi-dia.html` (= ultima versiune dupa promovare). Python lipseste pe masina asta — foloseste Node:
```
node -e "const fs=require('fs');const html=fs.readFileSync('mi-dia.html','utf8');const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);s.forEach((x,i)=>fs.writeFileSync('_tmp_eod'+i+'.js',x));let b=html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');const o=(b.match(/<div\b/g)||[]).length,c=(b.match(/<\/div>/g)||[]).length;console.log('Script blocks:',s.length,'| DIV:',o,'/',c,o===c?'OK':'MISMATCH');"
node --check _tmp_eod0.js && echo "JS OK"
```
Sterge fisierele `_tmp_eod*.js` dupa. **Daca DIV != balansat sau JS pica → opreste-te, raporteaza, NU commita.**

### 4. Sincronizeaza documentatia (doar fapte confirmate)
- **CLAUDE.md** — actualizeaza `Current latest build` daca s-a promovat o versiune noua (pasul 2). Daca o functie a fost FINALIZATA si verificata azi, mut-o din backlog in "App features". Daca s-a schimbat modelul de date sau arhitectura, actualizeaza sectiunea respectiva.
- **README.md** — actualizeaza doar daca s-a schimbat comportament vizibil pentru utilizator (cum rulezi, backup, model de date). Pastreaza cele 3 limbi (EN/ES/RO) sincronizate.
- Nu adauga in docs functii neterminate ca si cum ar fi gata.

### 5. Actualizeaza memoria (fapte de proiect confirmate)
Scrie in `C:\Users\Ines\.claude\projects\C--Users-Ines-Desktop-Mi-Dia-App\memory\`:
- Doar `type: project` pentru lucru in curs / decizii confirmate care NU se deduc din cod sau istoricul git.
- Converteste datele relative in absolute ("azi", "saptamana viitoare" → data exacta).
- Verifica intai daca exista deja un fisier pe acel subiect — actualizeaza-l, nu duplica.
- Adauga un rand in `MEMORY.md` pentru fiecare memorie noua.

### 6. Commit + push
- Stageaza explicit: noul `mi-dia-vNN.html` promovat, `mi-dia.html`, plus `CLAUDE.md`/`README.md` daca s-au schimbat.
- Grupeaza schimbarile logic (un commit pentru cod, altul pentru docs daca e cazul).
- Mesaje clare, descriptive. Termina fiecare mesaj cu:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Esti pe `main` (proiect personal) — commit direct si `git push origin main`.
- NU adauga `.claude/` skill/scripturi nu se modifica aici; logurile si setarile raman ignorate.

### 7. Raport final
Da un rezumat scurt in romana (fara diacritice): ce s-a confirmat si urcat azi, ce a ramas in lucru pentru maine, si confirma ca `git status` e curat si branch-ul e sincronizat.

## Daca ceva nu e clar
Daca nu poti stabili daca o schimbare e "confirmata si corecta", intreab-o pe Ines inainte sa o incluzi. Mai bine lasi pe dinafara decat sa scrii ceva gresit.
