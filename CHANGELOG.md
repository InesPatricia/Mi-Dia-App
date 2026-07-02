# Mi Día — Changelog (sumar pe arcuri)

> Detaliul fin per-versiune (v108–v124) e in `CLAUDE.md`-ul canonic de pe masina ta /
> Claude Code. Aici e sumarul pe arcuri + ultimele versiuni.

## v156 — coerență cap-coadă: gestionare ritualuri + unificare design + fix drop-cap (curent)
- **Gestionare ritualuri (rezolvă frustrarea semnalată de Ines — nu se putea șterge NICIUN ritual, nici
  cele default):** buton „Editează" lângă titlul secțiunii → mod editare în care fiecare card arată un **✕
  cu two-tap delete** (terracotta cald, consecvent cu Scurtături) + **tap pe card = editare** (redeschide
  sheet-ul precompletat, salvează în place — id + serie + log păstrate). Merge pe orice ritual, default sau
  creat. Chei i18n noi (`rit_edit`/`rit_edit_done`/`rit_del_confirm`/`rit_deleted`/`rit_edit_title`/
  `rit_save_edit`/`rit_updated`/`aria_rit_edit`/`aria_rit_del`/`rit_edit_hint`) în RO/ES/EN.
- **i18n (datoria reală era în codul vechi, nu la Ritualuri):** `onb_es_tr` gol nu mai lasă rând mort pe ES
  (se ascunde pe spaniolă); 4 aria-label vechi reparate (`Añadir`/`rápido` + diacritice RO); 7 chei orfane
  `onb_pet_*`/`onb_flower_*` (resturi din pasul „Floarea" vechi) șterse.
- **Faza 1 — un singur limbaj vizual:** toate maro-urile hardcodate pe titluri (`#5B3A28`/`#7A4A33`/`#9A6A4A`/
  `#6E4631`/`#5a3f2c`) → tokeni semantice (`--text`/`--text-soft`, 0 rămase); `.panel h2` → Fraunces (titluri
  de secțiune serif); `.calnav` (Calendar) aliniat la `.datebar` (Home) — același „TODAY" wine + săgeți.
- **Faza 2 + 2b — o singură sursă de adevăr (tokeni):** legacy (`--ink`/`--cream`/`--ink-soft`/`--sand`/
  `--page`/`--surface-2`) devin **alias-uri** către semantic; canonicalizat pe valorile luxe (majoritatea le
  folosea deja). Zero schimbare vizuală în light (alias-uri către valori identice), dark neatins.
- **Faza 3 (start) — scară de design:** tokeni `--r-sm/md/lg/xl` + `--sp-1..6`; cardurile de conținut
  încadrate pe o **ierarhie curată** (conținut 16 / panou 20 / modal 26), nu valori aleatorii.
- **Fix drop-cap „P" tăiat (raportat de Ines, vizibil la desktop):** `background-clip:text` nu pictează
  porțiunea de literă care iese peste cutia elementului → vârful capitalei italice mari rămânea nepictat.
  Fix robust: `padding-top` dă cutiei spațiu de pictură deasupra literei, `margin-top` negativ egal anulează
  deplasarea (litera rămâne pe loc). Verificat la desktop ȘI mobil. Aplicat și la `.onb-dc` (poemul onboarding).
- **Testare:** suită e2e **85** (83 funcțional + 2 `@visual`; 2 teste noi în `ritual.spec.js` pentru
  delete/edit). div 218/218, `node --check` 3/3, `/theme-qa` ambele teme. Surse `ritual.js`/`onboard.js`
  sincronizate cu blocul inlinat.
- **Onest:** headless Chromium ≠ Android real — device-pass-ul rămâne al lui Ines. Rămâne din plan: Faza 3
  profund (inputs/butoane pe scară + `.card`/`.btn` unic) + navigația tip iOS (mockup în `private/mockups/`).

## v145–v155 — modul „Ritualuri" (Atomic Habits) + Onboarding ghidat
- **Modul Ritualuri (`ritual.js`, inlinat, tokens-only → temă automată):** secțiune „Ritualurile mele" pe
  Home cu card per ritual (icon line-art + accent per ritual, versiunea de 2 min, **serie derivată din log**
  — nu stocată — + 7 puncte-săptămână, bifă), rezumat „N/M azi". Bifă = mică sărbătoare (umplere + halo gilt
  + chime) + toast „+1 vot: <identitate>". **Never-miss-twice** (stare caldă terracotta când ai ratat ziua
  anterioară) + **long-press pe bifă = versiunea de 2 min** (tot bifă validă pt serie).
- **Sheet de creare** (bottom-sheet peste Home estompat): drumul A (chip-uri sugestii, 2 taps) / drumul B
  (scris) + **habit stacking** („După un ritual"), oră nativă vizibilă (desktop+mobil), arie funcțională.
- **Identitate** (motorul voturilor): câmp `settings.identity` în Setări + **card pe Home** (design
  card-bijuterie cu muchie gilt + sigiliu + „N voturi azi", tapabil → editare).
- **Seed 2 ritualuri default** la prima rulare (blânde, cu habit stacking). **Backup:** `rituals` în export +
  `Ritual.refresh()` la import. **Progres:** bloc „Ritualurile mele" cu serie curentă + record + mini-calendar
  28 zile — **celule tapabile pt backfill** (completezi o zi uitată).
- **Bifare pe AZI (v154):** ritualurile se bifează mereu pe azi (nu pe ziua vizualizată din day-nav) — zero
  bifare silențioasă a zilei greșite; backfill-ul e explicit în mini-calendarul din Progres.
- **Onboarding ghidat (`onboard.js`, modul separat):** carusel luxe de 6 carduri (bun venit + limbă →
  „Cine vrei să devii?" identitate → planul zilei cu input real → **Floarea = o poezie** cu sămânță-glow →
  ritualurile + „Creează primul ritual" → ține-le în siguranță). Rulează la prima deschidere
  (`settings.onboarded`), re-rulabil din Setări; „Sari peste" + „Înapoi".
- **Polish (feedback Ines):** crenguța de măslin scoasă de pe Home; bife **quiet-luxury** (hairline fină +
  umplere șoptită + bifă gilt, nu bloc strident); scrollbar luxe gilt; **fix drop-cap „P" tăiat** (v155:
  `background-clip:text` + `line-height:.8` tăia vârful literei → `line-height:1` + inline-block).
- **Ton poetic:** pasul „Floarea" din onboarding = o poezie (RO/ES/EN, rimă „-ine": mă ține → mă susține →
  spre mine) sub floarea reală line-art cu sămânța aurie în centru.
- **Testare:** suită e2e **81 teste** (66 + `ritual.spec.js` 9 + `onboarding.spec.js` 6; `seedStorage`
  idempotent, helperi `readRituals`/`readSettings`/`ritual()`). div 218/218, `node --check` 3/3, `/theme-qa`
  curat. Mult asistat de agenți (identitate/seed în Faza 3; Progres/audit i18n/review adversarial/a11y în
  Faza 4). Surse curate `ritual.js` + `onboard.js` la root (ca `cycle.js`).
- **Onest:** headless Chromium ≠ Android real — pickere native, long-press touch, blur velvet, Ephesis gilt,
  chime rămân device-pass-ul lui Ines.

## v133–v144 — revamp „old rich" Light + Dark (temă dublă) + emoji → line-art
- **Temă dublă reală, comutabilă:** un switcher ☾/☀ în hero (lângă bara de limbi) + un toggle în Setări,
  persistat în `settings.theme` și inclus în backup, condus de `<html data-theme>`. Default la prima
  deschidere = **Light**.
- **Fundație pe tokeni semantici (v133–v134):** Ephesis (font brand) + tokeni auriu/gilt + tokeni semantici
  (`--bg/--surface/--text/--line/--brand/--accent`) în `:root` + un bloc `html[data-theme="dark"]` care îi
  rescrie; plumbing-ul switcher-ului (fără flash la boot). `--rose-1..4` rămân LOCKED, totul aditiv.
- **Dark-velvet (v135–v142):** hero cu „Día" în script auriu Ephesis + văl velvet per-temă + ramă hairline
  gilt; floarea re-skinuită velvet + stroke gilt (geometria + coordonatele l1–l5 NEATINSE, cuvintele rămân
  în petale); FAB gilt; toate cardurile/componentele + toate cele 7 view-uri tematizate dark (remap de tokeni
  + `paleTint`/`applyJWash` theme-aware). Construit incremental, o felie per `vNN`, mult asistat de agenți.
- **Polish + emoji (v140–v142):** casetă date-band Home făcută invizibilă pe dark, titluri secundare
  champagne-gold, banner-ul de instalare (persist.js) tematizat; **toate emoji-urile pictografice înlocuite cu
  SVG line-art** (inclusiv reflecția 4F, iconițele de arii, empty states, export, streak, scan, mutare,
  shuffle) — păstrate doar marcajele tipografice ✓ ✕ ✎ ☾ ☀. Regresie prinsă + reparată onest: un `esc` cu
  scope local a rupt randarea sloturilor (13 teste e2e) — fix cu un `esc` global; `node --check` trece
  sintaxa, dar e2e a prins runtime-ul.
- **Light-luxe (v143):** tema light repictată să corespundă mockup-ului — fundal champagne, hairline-uri
  gold, ink luxe, iar acțiunile rose → **wine `#6E1334`** (centrul florii, butoane, toggles, TODAY, bare de
  progres, Export/Import etc.); petalele rămân blush, culorile funcționale + delete-ul mauve păstrate.
  Ambele teme sunt acum luxe complete.
- **Testare:** suită e2e **68 teste** (adăugat `theme.spec.js` — switcher: default light, toggle hero+persist,
  toggle Setări two-way, user revenit pe dark). Baseline-urile `@visual` regenerate. Skill-uri noi:
  `/theme-qa` (grid dark×light pe toate view-urile + checklist lizibilitate + poartă e2e), `color-roles.md`
  (harta rolurilor de culoare), `module-css.md` (inventar CSS injectat de module) + utilitarele
  `e2e/shoot.js` / `e2e/theme-grid.js`.
- **Ultimele accente (v144):** drop-cap gilt pe fraza spaniolă (prima literă reală într-un span, „«" rămâne
  plat), candle-glow în spatele centrului florii pe light, și discul-lună al ciclului făcut theme-aware în JS
  (`moonSVG` → velvet pe dark, oriunde apare) — închide toate accentele-semnătură din plan.

## v126–v132 — teste/a11y, arcul olive in Jurnal, fix scriere + repo public
- **Teste & CI/CD:** instrumentare pentru Playwright + fix a11y (aria-label care urmareste limba) (v126),
  handle-uri de test pe composer (v127), a11y pe slot — tick „done" + pastila de ora ca butoane cu
  tastatura/SR (v128).
- **Arcul olive in Jurnal:** accent olive in coltul cardului (v129) → ramura inalta care drapeaza tot
  cardul (v130) → ramura la ~65% + textarea care creste singur, fara scrollbar peste ramura (v131) →
  **ramura SCOASA complet (v132)** fiindca pagina parea prea aglomerata (var base64 nefolosit eliminat,
  fisier ~640KB→~468KB).
- **Fix scriere lunga (v132):** la intrari lungi, randul scris dispărea sub bara fixa de jos; acum pagina
  scroll-eaza dupa cursor (masurare cu div-oglinda + scroll „instant" pe scroller-ul real) → vezi mereu ce scrii.
- **Repo făcut PUBLIC** (showcase CV, iun. 2026): audit de securitate (fără secrete în cod sau istoric),
  strategia de monetizare + mockup-urile mutate în `private/` (gitignored) + curățate din istoric,
  README rescris ca vitrină de inginerie/QA + screenshot-uri, licență **CC BY-NC 4.0**, workflow-uri CI
  hardenuite, branch-uri vechi șterse.

## v125 — Journal redesign + date-nav unificat
- Jurnal: stare ca **discuri tonale** (nu emoji-vreme) + cuvantul starii (`#moodWord`).
- Jurnal: stare ca **discuri tonale** (nu emoji-vreme) + cuvantul starii (`#moodWord`).
- Stare = **lumina pe pagina**: `applyJWash()` incalzeste/raceste pagina + cardul de scris
  (`--jwash`/`--jwash2`, tranzitie .45s). Senin → auriu, Ploaie → albastru-gri.
- **Card de scris cu chenar fin de aur**.
- Antet foto **refolosit din `.hero`** global (jpeg mutat in `--hero-bg`) — fara dublura de antet.
- **Date-nav unificat** cu Home (compact): repara sageata `›` taiata pe Android; unifica Jurnal+Calendar.
- Tot cablajul pastrat: jMood, permPause (roata emotiilor), autosave, 4F, export, i18n.
- PENDING (mockup aprobat `mi-dia-jsol2.html`): olive ca **rama** in cardul de scris + placeholder
  original + „+ reflecție ghidată" / export subtil jos.

## v122–v124 — Calendar redesign (lentile)
- Model „lentile": **Plan** (inele de progres) / **Stare-„Lumína"** (glow-uri radiale de stare, lumina
  Sorolla) / **Ritm** (panglica de ciclu, doar cand ciclul e activat).
- Popup azahar la detaliul zilei; cycle Option A; bugfix la navigarea spre Jurnal.

## v112–v119 — Add-flow + memento
- Composer unificat (se extinde la scriere), ceas nativ OS, durata pe quick-chips.
- Memento in-app pe foreground inainte de inceputul slotului; compactarea composer-ului.

## v98–v110 — Cycle / Respiro / persistence
- „Ritmul meu" (`cycle.js`, opt-in, default OFF, gender-neutral): faza lunii in Calendar, logare reala a
  menstruatiei + istoric, „Luna ta" + disclaimer ferm (estimativ, nu medical, nu contraceptiv).
- „Calm" → **„Respiro"** (v101). Modul de persistenta `persist.js` (backup-reminder / install banner).

## v90–v97 — Energizer / feel-better
- Toggle Calmează-mă / Trezește-mă, respiratie energizanta, body scan (TTS), permission pause + roata
  emotiilor (Lieberman 2007; 77 termeni curati), rutare F3, „Emoții recente", sun cue + dot pe Calendar.
- Etica: emotia se capteaza doar pe stari joase; se arata bland, niciodata ca metrica de frecventa.

## v86–v89 — Unificare CSS
- Cele doua straturi CSS unificate, pixel-verificat identic pe 27 de ecrane. Open: `--rose:#CB8188` (~13×).

## v57–v68 — REVAMP premium
- Fraunces + Nunito Sans; flower-nav cu etichete in petale; header (veil, „Día" auriu italic); Progres
  consolidat; Profil „Călătoria ta" + nume. v67: actiuni = rose (olive scos din actiuni).
