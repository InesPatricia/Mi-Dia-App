---
name: staging
description: Duce munca in curs (WIP) din working tree pe branch-ul permanent `staging` si o publica pe un preview Cloudflare izolat (staging.mi-dia-app.pages.dev), FARA sa atinga productia (`main`). Foloseste cand Ines spune "du pe staging", "vreau sa vad pe staging", "preview", "staging environment", "arata-mi live inainte de ship". NU e /ship (aia promoveaza in prod pe main) — staging e vitrina de test dinaintea livrarii.
---

# /staging — preview izolat inainte de livrare

Mi Día se deployeaza pe **Cloudflare Pages din GitHub**: `main` -> productie
(`mi-dia-app.pages.dev`); orice **branch non-productie** -> preview propriu la
`<branch>.mi-dia-app.pages.dev`. Acest skill foloseste un branch **permanent `staging`**
ca sa ai mereu aceeasi vitrina (URL fix, bookmarkabil) pentru munca in curs, complet
izolata de prod. Raspunde in **romana fara diacritice**. Ruleaza din radacina repo
(`Mi-Dia-App/`).

**Relatia cu celelalte skill-uri:**
- `/staging` = publica WIP-ul pe preview (test, non-prod). NU atinge `main`.
- `/ship` = promoveaza in PRODUCTIE (index.html + CACHE + docs + push pe `main`).
- Fluxul normal: construiesti felii -> **`/staging`** (vezi live, feedback pe device) ->
  cand e ok -> **`/ship`** (prod).

## Regulile de aur (siguranta prod)

1. **Niciodata push pe `main` cand vrei DOAR staging.** Prod se deployeaza exclusiv din `main`.
   Staging traieste pe branch-ul `staging`.
2. **Staging e pe alt subdomeniu** (`staging.mi-dia-app.pages.dev`) -> cache, service worker
   si localStorage sunt COMPLET izolate de prod. Fara coliziuni, fara sa strici datele nimanui.
3. **URL-ul de preview e public** (dar nedescoperibil). Repo-ul e oricum public + `private/` e
   gitignored, deci nu se expune nimic sensibil in plus — dar nu pune date reale in ce se serveste.
4. **Fiecare push pe `staging` reimprospateaza ACELASI URL.** Ai mereu ultima versiune acolo.
5. **Commit-uri per-felie, nu un monolit** — asa poti promova selectiv o singura felie in prod cu
   `git cherry-pick <commit>` pe `main` (via /ship / PR). Un commit urias nu se poate desparti.

## Pasii

### 0. Verifica de unde pornesti
- `git rev-parse --abbrev-ref HEAD` (pe ce branch esti) + `git status -sb`.
- Munca de dus pe staging = ce e necomis in working tree SAU deja pe un branch de lucru.
- Confirma cu Ines CE anume duce (de obicei: tot ce e necomis = arcul curent).

### 1. Adu munca pe branch-ul `staging`
- **Daca `staging` nu exista inca:** din branch-ul cu munca (ex. `main` cu working tree murdar):
  `git checkout -b staging` — modificarile necomise MERG cu tine (nu erau in `main`), deci `main`
  ramane curat.
- **Daca `staging` exista deja** si vrei sa-l aduci la nivelul muncii curente:
  `git checkout staging` apoi commit-uiesti WIP-ul; SAU, daca `staging` a divergit si vrei sa-l
  resincronizezi de la zero cu munca curenta, poti reseta cu confirmarea lui Ines
  (`git checkout staging && git reset --hard <ref-cu-munca>`) — reset-ul e distructiv, cere confirmare.

### 2. Commit per-felie
- Grupeaza pe felii logice (S1, S2, ...), nu un commit urias. Fisierele `mi-dia-vNN.html` sunt deja
  snapshot-uri curate per felie -> un commit per felie/versiune.
- Testele e2e + tooling care evolueaza cross-cutting merg in commit-uri proprii clar etichetate
  (`test: ...`, `chore: ...`).
- Foloseste `git add <fisiere explicite>` — niciodata `git add -A` orb (ignora artefactele: `private/`,
  `sandbox/`, rapoartele Playwright sunt deja gitignored, dar fii explicit).
- Mesaje in romana fara diacritice; termina fiecare commit cu linia `Co-Authored-By` a proiectului.

### 3. (optional) Coerenta build-ului pentru preview
- `index.html` = copia celui mai nou `mi-dia-vNN.html` (ce vrei sa vezi pe staging). Verifica cu
  `wc -c index.html mi-dia-vNN.html` (dimensiuni egale) sau diff.
- `sw.js` e **network-first** (fetch fresh online), deci preview-ul arata build-ul nou chiar daca
  `CACHE` inca zice o versiune veche — **nu bumpa `CACHE` pentru staging** (bump-ul e treaba /ship,
  ca sa nu creezi diff inutil fata de prod). Pe subdomeniu proaspat nu exista cache vechi oricum.

### 4. Push -> declanseaza preview-ul
- `git push -u origin staging` (prima data) sau `git push origin staging` (ulterior).
- **NU** pushezi pe `main`. Cere confirmarea lui Ines inainte de push (push = actiune spre exterior).
- In ~1-2 min: **`https://staging.mi-dia-app.pages.dev`**. (Numele branch-ului devine subdomeniul,
  scurtat la 28 caractere; `staging` -> `staging.…`.)

### 5. CI care se declanseaza (asteptat, informativ)
- Push-ul pe `staging` declanseaza build-ul de preview Cloudflare + workflow-ul `smoke-preview.yml`
  (7 teste smoke pe preview, informativ) si eventual `e2e.yml` pe branch. Niciunul nu blocheaza nimic
  in prod. Daca smoke pica, e semnal util inainte de /ship.

### 6. Raporteaza
- Da-i lui Ines URL-ul + ce felii sunt acolo + reminderul de device-pass (headless != Android real).

## Setare Cloudflare de verificat (o singura data, daca preview-ul nu apare)
Cloudflare -> Workers & Pages -> **mi-dia-app** -> Settings -> Builds & deployments ->
**Preview deployments -> "All non-production branches"**. (Nu pot verifica setarea din CLI/MCP fara
autentificare — e un pas manual al lui Ines daca subdomeniul nu se genereaza.)

## Promovare din staging in prod
- **Tot arcul:** cand e gata, `/ship` (promoveaza `index.html`, bumpeaza `CACHE`, sync docs, push `main`).
- **Doar o felie:** `git cherry-pick <commit-ul feliei>` pe `main` (via PR, `main` e branch-protected)
  — de-asta commit-urile per-felie conteaza.
