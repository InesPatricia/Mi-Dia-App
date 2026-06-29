# Mi Día — Changelog (sumar pe arcuri)

> Detaliul fin per-versiune (v108–v124) e in `CLAUDE.md`-ul canonic de pe masina ta /
> Claude Code. Aici e sumarul pe arcuri + ultimele versiuni.

## v126–v132 — teste/a11y, arcul olive in Jurnal, fix scriere + repo public (curent)
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
