/* ============================================================================
 *  Mi Día · MODULUL CICLU  (cycle)
 *  ---------------------------------------------------------------------------
 *  Feature: ritmul menstrual ca floare care respira (Home) + lentila de
 *  reflectie (Progres) + configurare (Calendar). Calendarul-grila NU e atins.
 *
 *  ARHITECTURA (acelasi tipar recomandat pentru tot fisierul):
 *    1. DATA   — modelul si persistenta (un singur loc care atinge storage)
 *    2. CALC   — functii PURE (input -> output, fara efecte secundare, testabile)
 *    3. I18N   — textele modulului (ro/es/en), izolate de logica
 *    4. VIEW   — randare (primeste date, scrie DOM; nu calculeaza reguli)
 *    5. WIRING — init + evenimente (singurul loc cu "stare vie" si DOM real)
 *
 *  Un dezvoltator nou citeste de sus in jos: intelege intai CE date exista,
 *  apoi CUM se calculeaza fazele, apoi CE scrie pe ecran, apoi CUM se leaga.
 *
 *  Dependinte: niciuna. Foloseste window.storage (Claude.ai) sau localStorage,
 *  exact ca restul aplicatiei. Cand e injectat in IIFE-ul principal poate
 *  reutiliza Store/lang/t — vezi nota din WIRING.
 *
 *  Onestitate (cerinta de produs): fazele sunt ESTIMATE; limbaj non-prescriptiv
 *  ("multe femei... / tu ai notat..."); fara sfat medical / contraceptie.
 *  Corelatiile din Progres folosesc starea-vreme (mood 1..5), coloana de analiza
 *  a aplicatiei — NU numara emotia (care e captata doar pe zile joase).
 * ========================================================================== */
const Cycle = (function () {
  'use strict';

  /* ─── 1. DATA ──────────────────────────────────────────────────────────── */
  const KEY = 'cycle';                         // storage key
  // Model: o LISTA de menstruatii reale logate (periods) + fallback length manual.
  const DEFAULTS = { periods: [], length: 28, period: 5 }; // periods = ["YYYY-MM-DD", ...]
  const LUTEAL_FIXED = 14;                      // faza luteala e ~14 zile (mai stabila)
  const MIN_DAYS_FOR_INSIGHT = 12;             // nu aratam tipare pe prea putine date

  // strat de persistenta portabil (acelasi comportament ca Store din app)
  const hasWS = (typeof window !== 'undefined' && window.storage);
  async function dbGet(key) {
    if (hasWS) { try { const r = await window.storage.get(key, false); return r ? r.value : null; } catch (e) { return null; } }
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  async function dbSet(key, val) {
    if (hasWS) { try { await window.storage.set(key, val, false); } catch (e) {} return; }
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  async function dbList(prefix) {
    if (hasWS) { try { const r = await window.storage.list(prefix, false); return (r && r.keys) || []; } catch (e) { return []; } }
    const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) out.push(k); } } catch (e) {} return out;
  }

  async function loadConfig() {
    const raw = await dbGet(KEY);
    let cfg;
    if (!raw) cfg = { ...DEFAULTS };
    else { try { cfg = { ...DEFAULTS, ...JSON.parse(raw) }; } catch (e) { cfg = { ...DEFAULTS }; } }
    // migrare din modelul vechi (o singura data `start`)
    if ((!cfg.periods || !cfg.periods.length) && cfg.start) cfg.periods = [cfg.start];
    if (!Array.isArray(cfg.periods)) cfg.periods = [];
    cfg.periods = cfg.periods.filter(Boolean).slice().sort();
    delete cfg.start;
    return cfg;
  }
  async function saveConfig(cfg) { await dbSet(KEY, JSON.stringify(cfg)); }

  /* ─── 2. CALC ──────────────────────────────────────────────────────────── */
  /* Toate sunt PURE: aceleasi intrari -> aceleasi iesiri. Usor de testat. */

  const PHASES = ['menstruala', 'foliculara', 'ovulatie', 'luteala'];

  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function addDays(date, n) { const x = new Date(date); x.setDate(x.getDate() + n); return x; }

  function sortedPeriods(cfg) { return (cfg.periods || []).slice().sort(); }
  /** Intervalele (in zile) intre menstruatii consecutive — lungimile reale ale ciclurilor. */
  function cycleIntervals(cfg) {
    const p = sortedPeriods(cfg), out = [];
    for (let i = 1; i < p.length; i++) out.push(daysBetween(parseYMD(p[i - 1]), parseYMD(p[i])));
    return out;
  }
  /** Lungimea medie: din ciclurile tale reale daca exista, altfel fallback manual. */
  function avgLength(cfg) {
    const iv = cycleIntervals(cfg).filter(x => x >= 15 && x <= 60);
    if (iv.length) return Math.round(iv.reduce((a, b) => a + b, 0) / iv.length);
    return cfg.length || 28;
  }
  /** Cea mai recenta menstruatie logata la sau inainte de `date`. */
  function lastPeriodOnOrBefore(cfg, date) {
    const p = sortedPeriods(cfg); let last = null;
    for (const d of p) { if (daysBetween(parseYMD(d), date) >= 0) last = d; else break; }
    return last;
  }

  /** Ziua din ciclu (1..n) pentru o data, din ultima menstruatie logata, sau null. */
  function dayOfCycle(cfg, date) {
    const lp = lastPeriodOnOrBefore(cfg, date);
    if (!lp) return null;
    return daysBetween(parseYMD(lp), date) + 1;
  }

  /** Ziua estimata de ovulatie (faza luteala fixa ~14 zile inainte de final). */
  function ovulationDay(cfg) { return Math.max((cfg.period || 5) + 1, avgLength(cfg) - LUTEAL_FIXED); }

  /** Faza pentru o zi-din-ciclu. */
  function phaseForDay(cfg, d) {
    if (d == null) return null;
    const ov = ovulationDay(cfg);
    if (d <= (cfg.period || 5)) return 'menstruala';
    if (d < ov) return 'foliculara';
    if (d === ov) return 'ovulatie';
    return 'luteala';
  }

  /** Gradul de deschidere a florii 0..1 (inchisa la menstruatie, plina la ovulatie). */
  function flowerOpen(cfg, d) {
    if (d == null) return 0.5;
    const ov = ovulationDay(cfg), L = Math.max(avgLength(cfg), ov + 1), per = cfg.period || 5;
    if (d <= per) return 0.10 + 0.06 * (d / per);
    if (d < ov) return 0.30 + 0.65 * ((d - per) / (ov - per));
    if (d === ov) return 1.0;
    return Math.max(0.18, 0.85 - 0.45 * ((d - ov) / (L - ov)));
  }

  /** Istoric: fiecare menstruatie + lungimea ciclului pana la urmatoarea ("len": null = in curs). */
  function history(cfg) {
    const p = sortedPeriods(cfg);
    return p.map((d, i) => ({ date: d, len: i < p.length - 1 ? daysBetween(parseYMD(d), parseYMD(p[i + 1])) : null }));
  }

  /* mutatii (pure: returneaza cfg modificat) */
  function addPeriodDate(cfg, ymdStr) { const c = { ...cfg, periods: (cfg.periods || []).slice() }; if (c.periods.indexOf(ymdStr) < 0) c.periods.push(ymdStr); c.periods.sort(); return c; }
  function removePeriodDate(cfg, ymdStr) { return { ...cfg, periods: (cfg.periods || []).filter(x => x !== ymdStr) }; }

  /** Estimeaza faza pentru o data calendaristica oarecare (pentru Progres). */
  function phaseForDate(cfg, date) { return phaseForDay(cfg, dayOfCycle(cfg, date)); }

  /** Data estimata a urmatoarei menstruatii: ultima logata + lungimea medie, proiectata in viitor. */
  function nextPeriodStart(cfg, from) {
    const p = sortedPeriods(cfg);
    if (!p.length) return null;
    const L = avgLength(cfg);
    let nd = addDays(parseYMD(p[p.length - 1]), L); // pleaca de la ULTIMA menstruatie logata
    while (daysBetween(nd, from) > 0) nd = addDays(nd, L); // proiecteaza pana >= azi
    return nd;
  }

  /* ─── 3. I18N ──────────────────────────────────────────────────────────── */
  /* Modulul isi tine propriile texte (izolate). Foloseste limba curenta a app. */
  const STR = {
    rhythm_tag:   { ro: 'Ritmul tau', es: 'Tu ritmo', en: 'Your rhythm' },
    estimat:      { ro: 'estimat', es: 'estimado', en: 'estimated' },
    day_n:        { ro: 'Ziua', es: 'Día', en: 'Day' },
    ph_menstruala:{ ro: 'faza menstruala', es: 'fase menstrual', en: 'menstrual phase' },
    ph_foliculara:{ ro: 'faza foliculara', es: 'fase folicular', en: 'follicular phase' },
    ph_ovulatie:  { ro: 'ovulatie', es: 'ovulación', en: 'ovulation' },
    ph_luteala:   { ro: 'faza luteala', es: 'fase lútea', en: 'luteal phase' },
    setup_cta:    { ro: 'Configureaza-ti ciclul', es: 'Configura tu ciclo', en: 'Set up your cycle' },
    setup_title:  { ro: 'Ritmul meu', es: 'Mi ritmo', en: 'My rhythm' },
    setup_start:  { ro: 'Prima zi a ultimei menstruatii', es: 'Primer día de tu última regla', en: 'First day of your last period' },
    setup_length: { ro: 'Lungimea medie a ciclului', es: 'Duración media del ciclo', en: 'Average cycle length' },
    setup_days:   { ro: 'zile', es: 'días', en: 'days' },
    save:         { ro: 'Salveaza', es: 'Guardar', en: 'Save' },
    done:         { ro: 'Gata', es: 'Listo', en: 'Done' },
    saved_ok:     { ro: 'Salvat', es: 'Guardado', en: 'Saved' },
    next_period:  { ro: 'Urmatoarea menstruatie estimata', es: 'Próxima regla estimada', en: 'Next period (est.)' },
    log_today:    { ro: 'Menstruația a început azi', es: 'Mi regla empezó hoy', en: 'My period started today' },
    log_other:    { ro: 'altă dată…', es: 'otra fecha…', en: 'another date…' },
    add_btn:      { ro: 'Adaugă', es: 'Añadir', en: 'Add' },
    history_h:    { ro: 'Istoric', es: 'Historial', en: 'History' },
    in_progress:  { ro: 'în curs', es: 'en curso', en: 'ongoing' },
    avg_real:     { ro: 'Lungime medie (din ciclurile tale)', es: 'Duración media (de tus ciclos)', en: 'Average length (from your cycles)' },
    no_logs:      { ro: 'Încă nimic înregistrat. Apasă mai sus când începe.', es: 'Aún nada registrado. Pulsa arriba cuando empiece.', en: 'Nothing logged yet. Tap above when it starts.' },
    detail_title: { ro: 'Floarea ta', es: 'Tu flor', en: 'Your flower' },
    breath_intro: { ro: 'Cum respira luna', es: 'Cómo respira el mes', en: 'How the month breathes' },
    progres_title:{ ro: 'Cum te influenteaza ciclul', es: 'Cómo te influye el ciclo', en: 'How your cycle affects you' },
    progres_sub:  { ro: 'Starea, productivitatea si jurnalul, pe cele 4 faze.', es: 'Ánimo, productividad y diario, por las 4 fases.', en: 'Mood, productivity and journal, across the 4 phases.' },
    productivity: { ro: 'productivitate', es: 'productividad', en: 'productivity' },
    journal_days: { ro: 'zile cu jurnal', es: 'días con diario', en: 'days journaled' },
    need_data:    { ro: 'Se completeaza pe masura ce notezi cateva cicluri.', es: 'Se completa a medida que registras algunos ciclos.', en: 'Fills in as you log a few cycles.' },
    disclaimer:   { ro: 'Faze estimate din ciclurile tale, pot varia de la o luna la alta. Conteaza ce notezi tu, nu o regula generala. Nu e sfat medical si nu poate fi folosit ca metoda de contraceptie.',
                    es: 'Fases estimadas a partir de tus ciclos; pueden variar de un mes a otro. Cuenta lo que registras tú, no una regla general. No es consejo médico ni método anticonceptivo.',
                    en: 'Phases estimated from your cycles; they can vary month to month. What you log matters, not a general rule. Not medical advice and not a contraception method.' },
    edu_horm:     { ro: 'Hormonal', es: 'Hormonal', en: 'Hormonal' },
    edu_feel:     { ro: 'Multe simt', es: 'Muchas sienten', en: 'Many feel' },
    edu_app:      { ro: 'In aplicatie', es: 'En la app', en: 'In the app' }
  };
  // continut educativ per faza (3 randuri), tot pe limbi
  const EDU = {
    menstruala: {
      horm: { ro: 'Estrogenul si progesteronul sunt la cel mai jos nivel.', es: 'Estrógeno y progesterona en su punto más bajo.', en: 'Estrogen and progesterone at their lowest.' },
      feel: { ro: 'Energie mai scazuta si nevoie de odihna; unele, o usurare.', es: 'Menos energía y necesidad de descanso; algunas, alivio.', en: 'Lower energy and a need for rest; some, relief.' },
      app:  { ro: 'Planuri usoare, odihna fara vinovatie, „Calmeaza-ma".', es: 'Planes ligeros, descanso sin culpa, “Calmarme”.', en: 'Lighter plans, rest without guilt, “Calm me”.' } },
    foliculara: {
      horm: { ro: 'Estrogenul incepe sa creasca treptat.', es: 'El estrógeno empieza a subir.', en: 'Estrogen begins to rise.' },
      feel: { ro: 'Mai multa energie si deschidere, chef de inceputuri.', es: 'Más energía y apertura, ganas de empezar.', en: 'More energy and openness, drive to begin.' },
      app:  { ro: 'Daca se potriveste cu ce notezi tu: un moment bun de inceputuri.', es: 'Si encaja con lo que registras: buen momento para empezar.', en: 'If it matches what you log: a good time to start things.' } },
    ovulatie: {
      horm: { ro: 'Estrogenul atinge varful; are loc ovulatia.', es: 'El estrógeno llega a su pico; ocurre la ovulación.', en: 'Estrogen peaks; ovulation occurs.' },
      feel: { ro: 'Multe se simt mai sociabile, verbale, increzatoare.', es: 'Muchas se sienten más sociables y seguras.', en: 'Many feel more social, verbal, confident.' },
      app:  { ro: 'Vezi in „Stare ↔ productivitate" daca e si cazul tau.', es: 'Mira en “Ánimo ↔ productividad” si es tu caso.', en: 'Check “Mood ↔ productivity” if it’s true for you.' } },
    luteala: {
      horm: { ro: 'Progesteronul creste, apoi amandoi hormonii scad premenstrual.', es: 'La progesterona sube, luego ambos bajan antes de la regla.', en: 'Progesterone rises, then both drop premenstrually.' },
      feel: { ro: 'Mai multa nevoie de liniste; unele, oboseala in ultimele zile.', es: 'Más necesidad de calma; algunas, cansancio al final.', en: 'More need for quiet; some, tiredness near the end.' },
      app:  { ro: '„Calmeaza-ma", sloturi mai usoare. Vezi tiparul tau in Progres.', es: '“Calmarme”, bloques más ligeros. Mira tu patrón en Progreso.', en: '“Calm me”, lighter slots. See your pattern in Progress.' } }
  };

  function langNow() {
    // foloseste limba app daca e injectat (variabila `lang` din IIFE); altfel din settings
    try { if (typeof lang === 'string') return lang; } catch (e) {}
    try { const s = JSON.parse(localStorage.getItem('settings') || '{}'); return s.lang || 'en'; } catch (e) { return 'en'; }
  }
  function ct(key) { const e = STR[key]; return e ? (e[langNow()] || e.en) : key; }
  function phaseLabel(p) { return ct('ph_' + p); }

  /** Formateaza o data ca "18 iunie" in limba curenta. */
  function formatDate(date) {
    const loc = ({ ro: 'ro-RO', es: 'es-ES', en: 'en-US' })[langNow()] || 'en-US';
    try { return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(date); }
    catch (e) { return ymd(date); }
  }

  /* ─── 4. VIEW ──────────────────────────────────────────────────────────── */
  /* Randare pura de prezentare: primeste date, returneaza/scrie markup. */

  const PHASE_COLOR = { menstruala: 'var(--rose-3)', foliculara: 'var(--rose-3)', ovulatie: 'var(--rose-2)', luteala: 'var(--rose-3)' };

  /** Floarea care respira, ca SVG, la o deschidere data. */
  function flowerSVG(open, size) {
    const cx = size / 2, cy = size / 2, petals = 8;
    const len = 0.42 + 0.58 * open, baseR = size * 0.07;
    const fill = open > 0.66 ? 'var(--rose-2)' : (open > 0.3 ? 'var(--rose-1)' : '#F7D2D6');
    const op = (0.78 + 0.12 * open).toFixed(2);
    const pl = size * 0.40 * len, pw = size * 0.12 * (0.7 + 0.3 * open);
    let s = '';
    for (let i = 0; i < petals; i++) {
      const a = (360 / petals) * i;
      const d = `M0,0 C ${pw},${-pl * 0.32} ${pw},${-pl * 0.72} 0,${-pl} C ${-pw},${-pl * 0.72} ${-pw},${-pl * 0.32} 0,0 Z`;
      s += `<g transform="translate(${cx},${cy}) rotate(${a}) translate(0,${-baseR})"><path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="var(--rose-3)" stroke-width="0.8" stroke-opacity="0.5"/></g>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${size * 0.075}" fill="var(--gold)"/><circle cx="${cx}" cy="${cy}" r="${size * 0.034}" fill="#fff" fill-opacity="0.35"/>`;
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${s}</svg>`;
  }

  /** Mica icoana de vreme pentru starea medie pe faza (1..5 -> nor..soare). */
  function weatherSVG(mood) {
    const sun = `<circle cx="15" cy="14" r="6.5" fill="#F4D27A" stroke="var(--sun,#E8A23D)" stroke-width="1.3"/><g stroke="var(--sun,#E8A23D)" stroke-width="1.3" stroke-linecap="round"><path d="M15 3v3M15 25v2M3 14h3M25 14h2M6 6l2 2M22 6l-2 2"/></g>`;
    const cloud = `<path d="M9 19a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1 3.5 3.5 0 0 1-.5 7H9z" fill="#E7ECF0" stroke="#BFC9D1" stroke-width="1.4"/>`;
    const part = `<circle cx="11" cy="11" r="5" fill="#F4D27A" stroke="var(--sun,#E8A23D)" stroke-width="1.2"/>` + `<path d="M11 21a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1 3.5 3.5 0 0 1-.5 7H11z" fill="#E7ECF0" stroke="#BFC9D1" stroke-width="1.4"/>`;
    const body = mood >= 4 ? sun : (mood >= 2.6 ? part : cloud);
    return `<svg viewBox="0 0 30 30" width="28" height="28" aria-hidden="true">${body}</svg>`;
  }

  /** HOME: cardul „Ritmul tau" (floare mica + faza + linie). */
  function renderHome(cfg) {
    const el = document.getElementById('cycleHome');
    if (!el) return;
    if (!cfg.periods || !cfg.periods.length) {     // neconfigurat: invitatie blanda
      el.innerHTML = `<button class="cy-setup-link" id="cySetupHome">${flowerSVG(0.5, 40)}<span>${ct('setup_cta')}</span></button>`;
      const b = document.getElementById('cySetupHome'); if (b) b.onclick = openSettings;
      return;
    }
    const d = dayOfCycle(cfg, new Date());
    const ph = phaseForDay(cfg, d);
    el.innerHTML =
      `<button class="cy-home" id="cyHomeBtn" aria-label="${ct('detail_title')}">
         <span class="cy-fl">${flowerSVG(flowerOpen(cfg, d), 64)}</span>
         <span class="cy-info">
           <span class="cy-tag">${ct('rhythm_tag')} · ${ct('estimat')}</span>
           <span class="cy-t">${ct('day_n')} ${d} · <b>${phaseLabel(ph)}</b></span>
         </span>
       </button>`;
    const b = document.getElementById('cyHomeBtn'); if (b) b.onclick = () => openDetail(cfg);
  }

  /** PROGRES: comparatia pe faze (citeste din storage; onest cu putine date). */
  async function renderProgres(cfg) {
    const el = document.getElementById('cycleProgres');
    if (!el) return;
    if (!cfg.periods || !cfg.periods.length) { el.innerHTML = ''; return; } // neconfigurat
    const agg = await aggregateByPhase(cfg);       // {phase:{prodPct,moodAvg,journalDays,n}}
    const rows = PHASES.map(p => {
      const a = agg[p];
      const has = a && a.n > 0;
      const wx = has ? weatherSVG(a.moodAvg) : weatherSVG(3);
      const pct = has ? Math.round(a.prodPct) : 0;
      const bar = has ? `<div class="cy-bar"><i style="width:${pct}%"></i></div>` : `<div class="cy-bar cy-empty"></div>`;
      const right = has ? `${pct}%` : '—';
      const jr = has ? `${a.journalDays} ${ct('journal_days')}` : ct('need_data');
      return `<div class="cy-prow"><div class="cy-ph"><div class="nm">${phaseLabel(p).replace('faza ', '')}</div></div>
                <span class="cy-wx">${wx}</span>
                <div class="cy-bw"><div class="cy-lbl"><span>${ct('productivity')}</span><span>${right}</span></div>${bar}<div class="cy-jr">${jr}</div></div></div>`;
    }).join('');
    el.innerHTML =
      `<div class="cy-panel">
         <div class="cy-panel-h">${ct('progres_title')}</div>
         <div class="cy-panel-s">${ct('progres_sub')}</div>
         ${rows}
         <div class="cy-disc">${ct('disclaimer')}</div>
       </div>`;
  }

  /** DETAIL (la atingerea florii): arcul lunii + fisa educativa + buton setare. */
  function openDetail(cfg) {
    const d = dayOfCycle(cfg, new Date());
    const cur = phaseForDay(cfg, d);
    const arc = PHASES.map(p => {
      const openByPhase = { menstruala: 0.12, foliculara: 0.55, ovulatie: 1.0, luteala: 0.45 };
      const on = p === cur ? ' on' : '';
      return `<div class="cy-st"><span>${flowerSVG(openByPhase[p], 58)}</span><span class="cy-lb${on}">${phaseLabel(p).replace('faza ', '')}</span></div>`;
    }).join('');
    const e = EDU[cur];
    const edu = `<div class="cy-edu"><div class="cy-eh">${phaseLabel(cur)}</div>
        <div class="cy-row"><span class="k">${ct('edu_horm')}</span><span>${e.horm[langNow()] || e.horm.en}</span></div>
        <div class="cy-row"><span class="k">${ct('edu_feel')}</span><span>${e.feel[langNow()] || e.feel.en}</span></div>
        <div class="cy-row"><span class="k">${ct('edu_app')}</span><span>${e.app[langNow()] || e.app.en}</span></div>
        <div class="cy-disc">${ct('disclaimer')}</div></div>`;
    openOverlay(
      `<div class="cy-detail-h">${ct('detail_title')}</div>
       <div class="cy-breath">${arc}</div>${edu}
       <button class="cy-cmbtn" id="cyToSetup">${ct('setup_title')}</button>`,
      () => { const b = document.getElementById('cyToSetup'); if (b) b.onclick = openSettings; }
    );
  }

  /** CONFIGURARE: data + lungime. */
  async function openSettings() { await renderSettings(); }

  function settingsHTML(cfg) {
    const today = ymd(new Date());
    const hist = history(cfg).slice().reverse();   // cele mai recente sus
    const L = avgLength(cfg);
    const iv = cycleIntervals(cfg).filter(x => x >= 15 && x <= 60);
    const histRows = hist.length ? hist.map(h =>
      `<div class="cy-hrow"><span class="cy-hd">${formatDate(parseYMD(h.date))}</span>
         <span class="cy-hl">${h.len != null ? (h.len + ' ' + ct('setup_days')) : ct('in_progress')}</span>
         <button class="cy-del" data-d="${h.date}" aria-label="×">×</button></div>`).join('')
      : `<div class="cy-empty-hist">${ct('no_logs')}</div>`;
    const avgBlock = iv.length
      ? `<div class="cy-avg">${ct('avg_real')}: <b>${L} ${ct('setup_days')}</b></div>`
      : `<label class="cy-set-row"><span>${ct('setup_length')}</span>
           <span class="cy-step"><button type="button" id="cyLenMinus">−</button><b id="cyLenVal">${cfg.length}</b> ${ct('setup_days')}<button type="button" id="cyLenPlus">+</button></span></label>`;
    const np = (cfg.periods && cfg.periods.length) ? nextPeriodStart(cfg, new Date()) : null;
    return `<div class="cy-detail-h">${ct('setup_title')}</div>
      <button class="cy-save" id="cyLogToday">${ct('log_today')}</button>
      <details class="cy-other"><summary>${ct('log_other')}</summary>
        <div class="cy-other-row"><input type="date" id="cyOtherDate" max="${today}">
          <button class="cy-add" id="cyAddDate">${ct('add_btn')}</button></div></details>
      ${np ? `<div class="cy-next">${ct('next_period')}: <b>${formatDate(np)}</b></div>` : ''}
      <div class="cy-hist-h">${ct('history_h')}</div>
      <div class="cy-hist">${histRows}</div>
      ${avgBlock}`;
  }

  async function renderSettings() {
    const cfg = await loadConfig();
    openOverlay(settingsHTML(cfg), () => bindSettings(cfg));
  }

  function bindSettings(cfg) {
    const save = async (newCfg) => { await saveConfig(newCfg); await refresh(); toast(ct('saved_ok') + ' ✓'); await renderSettings(); };
    const logT = document.getElementById('cyLogToday');
    if (logT) logT.onclick = () => save(addPeriodDate(cfg, ymd(new Date())));
    const add = document.getElementById('cyAddDate');
    if (add) add.onclick = () => { const v = document.getElementById('cyOtherDate').value; if (v) save(addPeriodDate(cfg, v)); };
    document.querySelectorAll('.cy-del').forEach(b => b.onclick = () => save(removePeriodDate(cfg, b.getAttribute('data-d'))));
    // stepper de fallback (doar cand nu avem inca destule cicluri reale)
    const minus = document.getElementById('cyLenMinus'), plus = document.getElementById('cyLenPlus'), val = document.getElementById('cyLenVal');
    if (minus && plus && val) {
      let len = cfg.length;
      const persist = () => saveConfig({ ...cfg, length: len }).then(refresh);
      minus.onclick = () => { len = Math.max(21, len - 1); val.textContent = len; persist(); };
      plus.onclick = () => { len = Math.min(40, len + 1); val.textContent = len; persist(); };
    }
  }

  /* mic overlay reutilizabil (self-contained, fara dependinte) */
  function openOverlay(html, afterMount) {
    closeOverlay();
    const ov = document.createElement('div');
    ov.className = 'cy-ov'; ov.id = 'cyOverlay';
    ov.innerHTML = `<div class="cy-sheet"><button class="cy-x" id="cyClose" aria-label="×">×</button>${html}</div>`;
    document.body.appendChild(ov);
    document.getElementById('cyClose').onclick = closeOverlay;
    ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); });
    if (afterMount) afterMount();
  }
  function closeOverlay() { const o = document.getElementById('cyOverlay'); if (o) o.remove(); }

  /** Mic toast de confirmare (self-contained). */
  function toast(msg) {
    let t = document.getElementById('cyToast');
    if (!t) { t = document.createElement('div'); t.id = 'cyToast'; t.className = 'cy-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ─── agregare pe faze (citeste day:/journal: ca restul aplicatiei) ─────── */
  async function aggregateByPhase(cfg) {
    const out = {}; PHASES.forEach(p => out[p] = { done: 0, total: 0, moodSum: 0, moodN: 0, journalDays: 0, n: 0 });
    const dayKeys = await dbList('day:');
    for (const k of dayKeys) {
      const date = parseYMD(k.slice(4));
      const ph = phaseForDate(cfg, date); if (!ph) continue;
      let blocks = []; try { blocks = JSON.parse(await dbGet(k)) || []; } catch (e) {}
      if (!blocks.length) continue;
      out[ph].total += blocks.length;
      out[ph].done += blocks.filter(b => b.done).length;
      out[ph].n += 1;
    }
    const jKeys = await dbList('journal:');
    for (const k of jKeys) {
      const date = parseYMD(k.slice(8));
      const ph = phaseForDate(cfg, date); if (!ph) continue;
      let j = null; try { j = JSON.parse(await dbGet(k)); } catch (e) {}
      if (!j) continue;
      if (j.mood) { out[ph].moodSum += j.mood; out[ph].moodN += 1; }
      if (j.text && j.text.trim()) out[ph].journalDays += 1;
    }
    const res = {};
    PHASES.forEach(p => {
      const a = out[p];
      res[p] = {
        prodPct: a.total ? (a.done / a.total) * 100 : 0,
        moodAvg: a.moodN ? a.moodSum / a.moodN : 3,
        journalDays: a.journalDays,
        n: a.n
      };
    });
    return res;
  }

  /* ─── 5. WIRING ────────────────────────────────────────────────────────── */
  let _booted = false;

  function injectCSS() {
    if (document.getElementById('cy-css')) return;
    const css = `
      #cycleHome{margin:0 0 4px;}
      .cy-home{display:flex;align-items:center;gap:14px;width:100%;background:transparent;border:none;padding:6px 2px 14px;border-bottom:1px solid var(--line,#EFE6D4);cursor:pointer;text-align:left;}
      .cy-home .cy-fl{flex:none;line-height:0;}
      .cy-tag{display:block;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--rose-dust,#C39199);font-weight:800;}
      .cy-t{display:block;font-family:'Fraunces',serif;font-weight:500;font-size:1.06rem;color:var(--ink,#3A2D21);margin-top:2px;}
      .cy-t b{color:var(--rose-3,#D15E78);font-weight:600;}
      .cy-setup-link{display:flex;align-items:center;gap:10px;width:100%;background:var(--rose-0,#FBE4E5);border:1px solid var(--rose-1,#F4BFC4);border-radius:14px;padding:10px 12px;color:var(--rose-4,#B5495F);font-weight:800;font-size:.86rem;cursor:pointer;margin-bottom:10px;}
      .cy-panel{background:linear-gradient(180deg,#FFFBF4,#FCF5E9);border:1px solid rgba(184,137,63,.18);border-radius:var(--radius,20px);box-shadow:var(--shadow-soft,0 6px 20px -10px rgba(150,90,90,.2));padding:16px;margin-top:14px;}
      .cy-panel-h{font-family:'Fraunces',serif;font-weight:600;font-size:1.06rem;color:var(--ink,#3A2D21);}
      .cy-panel-s{font-size:.8rem;color:var(--ink-soft,#897662);margin:2px 0 10px;}
      .cy-prow{display:flex;align-items:center;gap:11px;padding:11px 2px;border-bottom:1px solid var(--line,#EFE6D4);}
      .cy-prow:last-of-type{border-bottom:none;}
      .cy-ph{width:84px;flex:none;} .cy-ph .nm{font-weight:800;font-size:.86rem;color:var(--ink,#3A2D21);text-transform:capitalize;}
      .cy-wx{flex:none;line-height:0;}
      .cy-bw{flex:1;min-width:0;}
      .cy-lbl{display:flex;justify-content:space-between;font-size:.69rem;color:var(--ink-soft,#897662);font-weight:700;margin-bottom:4px;}
      .cy-bar{height:8px;border-radius:6px;background:#EFE6D2;overflow:hidden;}
      .cy-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--rose-2,#E58699),var(--rose-3,#D15E78));}
      .cy-bar.cy-empty{background:#EFE6D2;}
      .cy-jr{font-size:.66rem;color:var(--ink-soft,#897662);font-weight:700;margin-top:4px;}
      .cy-disc{font-size:.7rem;color:var(--rose-dust,#C39199);font-style:italic;line-height:1.5;margin-top:11px;}
      /* overlay */
      .cy-ov{position:fixed;inset:0;background:rgba(58,45,33,.34);display:flex;align-items:flex-end;justify-content:center;z-index:9999;padding:0;}
      .cy-sheet{background:var(--cream,#FFFCF7);width:100%;max-width:460px;border-radius:22px 22px 0 0;padding:22px 18px calc(22px + env(safe-area-inset-bottom));position:relative;max-height:90vh;overflow:auto;box-shadow:0 -10px 40px -10px rgba(120,90,60,.3);}
      .cy-x{position:absolute;top:12px;right:14px;border:none;background:transparent;font-size:1.4rem;color:var(--ink-soft,#897662);cursor:pointer;line-height:1;}
      .cy-detail-h{font-family:'Fraunces',serif;font-weight:500;font-size:1.2rem;text-align:center;margin:2px 0 14px;color:var(--ink,#3A2D21);}
      .cy-breath{display:flex;justify-content:space-between;gap:6px;margin-bottom:6px;}
      .cy-st{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;}
      .cy-st .cy-lb{font-size:.64rem;font-weight:800;color:var(--ink-soft,#897662);text-transform:capitalize;}
      .cy-st .cy-lb.on{color:var(--rose-3,#D15E78);}
      .cy-edu{margin-top:14px;border-top:1px solid var(--line,#EFE6D4);padding-top:14px;}
      .cy-eh{font-family:'Fraunces',serif;font-weight:600;font-size:1.04rem;margin-bottom:8px;color:var(--ink,#3A2D21);text-transform:capitalize;}
      .cy-row{display:flex;gap:10px;margin:9px 0;font-size:.84rem;line-height:1.5;color:var(--ink-soft,#897662);}
      .cy-row .k{font-weight:800;color:var(--ink,#3A2D21);min-width:84px;flex:none;}
      .cy-cmbtn,.cy-save{display:block;width:100%;margin-top:14px;border:none;border-radius:30px;padding:12px;font-family:inherit;font-weight:800;font-size:.92rem;cursor:pointer;}
      .cy-cmbtn{background:var(--rose-0,#FBE4E5);color:var(--rose-4,#B5495F);}
      .cy-save{background:linear-gradient(180deg,var(--rose-2,#E58699),var(--rose-4,#B5495F));color:#fff;}
      .cy-set-row{display:flex;justify-content:space-between;align-items:center;margin:14px 0;font-size:.88rem;color:var(--ink,#3A2D21);font-weight:600;gap:12px;}
      .cy-set-row input[type=date]{border:1.5px solid var(--line,#EFE6D4);border-radius:12px;padding:8px 12px;font-family:inherit;font-size:.9rem;color:var(--ink,#3A2D21);background:var(--cream,#FFFCF7);}
      .cy-step{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line,#EFE6D4);border-radius:12px;padding:6px 10px;font-weight:800;}
      .cy-step button{border:none;background:var(--rose-0,#FBE4E5);color:var(--rose-4,#B5495F);width:24px;height:24px;border-radius:8px;font-weight:800;cursor:pointer;}
      .cy-other{margin:10px 0 4px;}
      .cy-other summary{font-size:.82rem;font-weight:800;color:var(--rose-4,#B5495F);cursor:pointer;list-style:none;}
      .cy-other summary::-webkit-details-marker{display:none;}
      .cy-other-row{display:flex;gap:8px;margin-top:9px;}
      .cy-other-row input[type=date]{flex:1;border:1.5px solid var(--line,#EFE6D4);border-radius:12px;padding:8px 12px;font-family:inherit;font-size:.9rem;color:var(--ink,#3A2D21);background:var(--cream,#FFFCF7);}
      .cy-add{border:none;border-radius:12px;padding:8px 16px;font-family:inherit;font-weight:800;font-size:.84rem;background:var(--rose-0,#FBE4E5);color:var(--rose-4,#B5495F);cursor:pointer;}
      .cy-next{font-size:.84rem;color:var(--ink-soft,#897662);margin:12px 0 2px;}
      .cy-next b{color:var(--rose-4,#B5495F);}
      .cy-hist-h{font-family:'Fraunces',serif;font-weight:600;font-size:1rem;margin:16px 0 6px;color:var(--ink,#3A2D21);}
      .cy-hist{border-top:1px solid var(--line,#EFE6D4);}
      .cy-hrow{display:flex;align-items:center;gap:10px;padding:10px 2px;border-bottom:1px solid var(--line,#EFE6D4);}
      .cy-hd{flex:1;font-weight:700;font-size:.88rem;color:var(--ink,#3A2D21);}
      .cy-hl{font-size:.78rem;color:var(--ink-soft,#897662);font-weight:700;}
      .cy-del{border:none;background:transparent;color:var(--rose-dust,#C39199);font-size:1.05rem;line-height:1;cursor:pointer;padding:2px 4px;}
      .cy-empty-hist{font-size:.82rem;color:var(--ink-soft,#897662);font-style:italic;padding:10px 2px;}
      .cy-avg{font-size:.84rem;color:var(--ink-soft,#897662);margin-top:14px;}
      .cy-avg b{color:var(--rose-4,#B5495F);}
      .cy-saved{display:flex;flex-direction:column;gap:3px;background:#EAF0E2;border-radius:13px;padding:11px 14px;margin-top:14px;}
      .cy-saved .ok{font-weight:800;color:#4E7E3A;font-size:.9rem;}
      .cy-saved .np{font-size:.84rem;color:var(--ink,#3A2D21);}
      .cy-saved .np b{color:var(--rose-4,#B5495F);}
      .cy-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%) translateY(-10px);z-index:10000;
        background:var(--ink,#3A2D21);color:#fff;font-weight:700;font-size:.86rem;padding:10px 18px;border-radius:30px;
        box-shadow:0 8px 26px -10px rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;}
      .cy-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
    `;
    const st = document.createElement('style'); st.id = 'cy-css'; st.textContent = css; document.head.appendChild(st);
  }

  /** Re-randeaza suprafetele modulului (apelat la init, la schimbarea limbii, la salvare). */
  async function refresh() {
    const cfg = await loadConfig();
    renderHome(cfg);
    await renderProgres(cfg);
    // butonul "Ritmul meu" din Calendar isi ia textul din i18n (se traduce la schimbarea limbii)
    const calBtn = document.getElementById('cycleSetupBtn');
    if (calBtn) calBtn.textContent = ct('setup_title');
  }

  /** Punct unic de pornire. Apeleaza-l din init()-ul aplicatiei, dupa settings. */
  async function init() {
    if (_booted) return; _booted = true;
    injectCSS();
    // re-randeaza cand userul schimba limba (butoanele [data-l] din hero)
    document.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => setTimeout(refresh, 0)));
    await refresh();
  }

  /* API public minim, clar: ce poate apela restul aplicatiei. */
  return {
    init, refresh, openSettings,
    // expuse pentru testare (functii pure):
    _calc: { dayOfCycle, phaseForDay, ovulationDay, flowerOpen, phaseForDate, nextPeriodStart, avgLength, cycleIntervals, history, addPeriodDate, removePeriodDate, lastPeriodOnOrBefore }
  };
})();

/* ── INTEGRARE (3 ancore in HTML + 1 apel) ──────────────────────────────────
 *  1. Home   : <div id="cycleHome"></div>     intre floarea-nav si planul zilei
 *  2. Progres: <div id="cycleProgres"></div>  in #view-stats, dupa panourile existente
 *  3. Calendar (optional): un buton care apeleaza Cycle.openSettings()
 *  4. In init(): dupa loadSettings()  ->  Cycle.init();
 *  Modulul isi injecteaza singur CSS-ul si overlay-ul; nu atinge calendarul-grila.
 * ────────────────────────────────────────────────────────────────────────── */
