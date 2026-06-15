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
    if ((!cfg.periods || !cfg.periods.length) && cfg.start) cfg.periods = [cfg.start];
    if (!Array.isArray(cfg.periods)) cfg.periods = [];
    // normalizeaza la obiecte {start, bleed}; migreaza vechiul format (lista de string-uri)
    cfg.periods = cfg.periods
      .map(x => typeof x === 'string' ? { start: x, bleed: null } : { start: x && x.start, bleed: (x && typeof x.bleed === 'number') ? x.bleed : null })
      .filter(x => x.start)
      .sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    delete cfg.start;
    // opt-in: OPRIT implicit (neutru). Userul il porneste din Setari.
    if (typeof cfg.enabled !== 'boolean') cfg.enabled = false;
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

  function sortedPeriods(cfg) { return (cfg.periods || []).slice().sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0); }
  function startList(cfg) { return sortedPeriods(cfg).map(p => p.start); }
  /** Intervalele (in zile) intre menstruatii consecutive — lungimile reale ale ciclurilor. */
  function cycleIntervals(cfg) {
    const p = startList(cfg), out = [];
    for (let i = 1; i < p.length; i++) out.push(daysBetween(parseYMD(p[i - 1]), parseYMD(p[i])));
    return out;
  }
  /** Lungimea medie a CICLULUI: din ciclurile tale reale daca exista, altfel fallback manual. */
  function avgLength(cfg) {
    const iv = cycleIntervals(cfg).filter(x => x >= 15 && x <= 60);
    if (iv.length) return Math.round(iv.reduce((a, b) => a + b, 0) / iv.length);
    return cfg.length || 28;
  }
  /** Durata medie a SANGERARII: din duratele logate daca exista, altfel default. */
  function avgBleed(cfg) {
    const bl = sortedPeriods(cfg).map(p => p.bleed).filter(b => typeof b === 'number' && b > 0);
    if (bl.length) return Math.round(bl.reduce((a, b) => a + b, 0) / bl.length);
    return cfg.period || 5;
  }
  /** Cea mai recenta menstruatie logata la sau inainte de `date` (returneaza data de start). */
  function lastPeriodOnOrBefore(cfg, date) {
    const p = startList(cfg); let last = null;
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
  function ovulationDay(cfg) { return Math.max(avgBleed(cfg) + 1, avgLength(cfg) - LUTEAL_FIXED); }

  /** Faza pentru o zi-din-ciclu (faza menstruala = primele ~avgBleed zile). */
  function phaseForDay(cfg, d) {
    if (d == null) return null;
    const ov = ovulationDay(cfg);
    if (d <= avgBleed(cfg)) return 'menstruala';
    if (d < ov) return 'foliculara';
    if (d === ov) return 'ovulatie';
    return 'luteala';
  }

  /** Gradul de iluminare a lunii 0..1. Luna PLINA e rezervata ovulatiei;
   *  foliculara creste doar pana la ~jumatate-trei sferturi, luteala descreste. */
  function flowerOpen(cfg, d) {
    if (d == null) return 0.5;
    const ov = ovulationDay(cfg), L = Math.max(avgLength(cfg), ov + 1), per = avgBleed(cfg);
    if (d <= per) return 0.08 + 0.06 * (d / per);                  // lună nouă (menstruatie)
    if (d < ov) return 0.22 + 0.48 * ((d - per) / (ov - per));     // creste -> ~0.65 inainte de ovulatie
    if (d === ov) return 1.0;                                      // plină (ovulatie)
    return Math.max(0.16, 0.70 - 0.54 * ((d - ov) / (L - ov)));    // descreste (luteala)
  }

  /** Istoric: fiecare menstruatie + lungimea ciclului pana la urmatoarea + durata sangerarii.
   *  "len": null = ciclul curent (inca neinchis). */
  function history(cfg) {
    const p = sortedPeriods(cfg);
    return p.map((o, i) => ({ start: o.start, bleed: o.bleed, len: i < p.length - 1 ? daysBetween(parseYMD(o.start), parseYMD(p[i + 1].start)) : null }));
  }

  /* mutatii (pure: returneaza cfg modificat) */
  function addPeriodDate(cfg, ymdStr, bleed) {
    const c = { ...cfg, periods: (cfg.periods || []).slice() };
    if (!c.periods.some(p => p.start === ymdStr)) c.periods.push({ start: ymdStr, bleed: (typeof bleed === 'number' ? bleed : (cfg.period || 5)) });
    c.periods.sort((a, b) => a.start < b.start ? -1 : 1);
    return c;
  }
  function removePeriodDate(cfg, ymdStr) { return { ...cfg, periods: (cfg.periods || []).filter(p => p.start !== ymdStr) }; }
  function setBleed(cfg, ymdStr, bleed) { return { ...cfg, periods: (cfg.periods || []).map(p => p.start === ymdStr ? { ...p, bleed: Math.max(1, Math.min(10, bleed)) } : p) }; }

  /** Estimeaza faza pentru o data calendaristica oarecare (pentru Progres). */
  function phaseForDate(cfg, date) { return phaseForDay(cfg, dayOfCycle(cfg, date)); }

  /** Data estimata a urmatoarei menstruatii: ultima logata + lungimea medie, proiectata in viitor. */
  function nextPeriodStart(cfg, from) {
    const p = startList(cfg);
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
    cycle_word:   { ro: 'ciclu', es: 'ciclo', en: 'cycle' },
    current_cycle:{ ro: 'ciclul curent', es: 'ciclo actual', en: 'current cycle' },
    bleed_word:   { ro: 'sângerare', es: 'sangrado', en: 'bleeding' },
    avg_bleed:    { ro: 'Sângerare medie', es: 'Sangrado medio', en: 'Average bleeding' },
    next_short:   { ro: 'următoarea', es: 'próxima', en: 'next' },
    delete_word:  { ro: 'șterge', es: 'borrar', en: 'delete' },
    avg_real:     { ro: 'Lungime medie (din ciclurile tale)', es: 'Duración media (de tus ciclos)', en: 'Average length (from your cycles)' },
    no_logs:      { ro: 'Încă nimic înregistrat. Apasă mai sus când începe.', es: 'Aún nada registrado. Pulsa arriba cuando empiece.', en: 'Nothing logged yet. Tap above when it starts.' },
    track_cycle:  { ro: 'Urmărește-ți ciclul', es: 'Sigue tu ciclo', en: 'Track your cycle' },
    track_hint:   { ro: 'opțional · luna arată faza estimată', es: 'opcional · la luna muestra la fase', en: 'optional · the moon shows the phase' },
    detail_title: { ro: 'Luna ta', es: 'Tu luna', en: 'Your moon' },
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
  /** Intervalul sangerarii + anul: "3–7 feb 2025" (sau "30 ian – 3 feb 2025" peste luni). */
  function formatRange(startStr, bleed) {
    const loc = ({ ro: 'ro-RO', es: 'es-ES', en: 'en-US' })[langNow()] || 'en-US';
    const s = parseYMD(startStr), e = addDays(s, Math.max(1, bleed || 1) - 1);
    try {
      const dM = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
      const mS = new Intl.DateTimeFormat(loc, { month: 'short' });
      if (daysBetween(s, e) === 0)
        return s.getDate() + ' ' + mS.format(s).replace('.', '') + ' ' + s.getFullYear();
      if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
        return s.getDate() + '–' + e.getDate() + ' ' + mS.format(s).replace('.', '') + ' ' + s.getFullYear();
      return dM.format(s).replace('.', '') + ' – ' + dM.format(e).replace('.', '') + ' ' + e.getFullYear();
    } catch (x) { return startStr; }
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

  /** Faza lunii ca SVG: iluminarea exprima faza ciclului; partea luminata pe
   *  dreapta cand creste (foliculara→ovulatie), pe stanga cand descreste (luteala). */
  function moonSVG(frac, waxing, size) {
    const r = size * 0.42, cx = size / 2, cy = size / 2;
    const disc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F0E2E3" stroke="#DFC9CB" stroke-width="0.9"/>`;
    let lit = '';
    if (frac <= 0.03) { lit = ''; }
    else if (frac >= 0.97) { lit = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--rose-2,#E58699)"/>`; }
    else {
      const rx = r * Math.cos(Math.PI * frac);
      const outerSweep = waxing ? 1 : 0;
      const innerSweep = waxing ? (rx > 0 ? 0 : 1) : (rx > 0 ? 1 : 0);
      lit = `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${Math.abs(rx).toFixed(2)} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z" fill="var(--rose-2,#E58699)"/>`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${disc}${lit}</svg>`;
  }
  /** (frac, waxing) pentru o zi din ciclu — creste pana la ovulatie, apoi descreste. */
  function moonParams(cfg, d) { return { frac: flowerOpen(cfg, d), waxing: d == null ? true : d <= ovulationDay(cfg) }; }
  function weatherSVG(mood) {
    const sun = `<circle cx="15" cy="14" r="6.5" fill="#F4D27A" stroke="var(--sun,#E8A23D)" stroke-width="1.3"/><g stroke="var(--sun,#E8A23D)" stroke-width="1.3" stroke-linecap="round"><path d="M15 3v3M15 25v2M3 14h3M25 14h2M6 6l2 2M22 6l-2 2"/></g>`;
    const cloud = `<path d="M9 19a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1 3.5 3.5 0 0 1-.5 7H9z" fill="#E7ECF0" stroke="#BFC9D1" stroke-width="1.4"/>`;
    const part = `<circle cx="11" cy="11" r="5" fill="#F4D27A" stroke="var(--sun,#E8A23D)" stroke-width="1.2"/>` + `<path d="M11 21a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1 3.5 3.5 0 0 1-.5 7H11z" fill="#E7ECF0" stroke="#BFC9D1" stroke-width="1.4"/>`;
    const body = mood >= 4 ? sun : (mood >= 2.6 ? part : cloud);
    return `<svg viewBox="0 0 30 30" width="28" height="28" aria-hidden="true">${body}</svg>`;
  }

  /** HOME: ciclul nu mai sta pe Home (mutat in Calendar). Doar golim. */
  function renderHome() {
    const el = document.getElementById('cycleHome');
    if (el) el.innerHTML = '';
  }

  /** CALENDAR: strip discret cu luna (faza) + ziua, langa „Ritmul meu". */
  function renderCalendar(cfg) {
    const el = document.getElementById('cycleCal');
    if (!el) return;
    if (!cfg.enabled || !cfg.periods || !cfg.periods.length) { el.innerHTML = ''; return; }
    const d = dayOfCycle(cfg, new Date());
    const ph = phaseForDay(cfg, d);
    const mp = moonParams(cfg, d);
    el.innerHTML =
      `<button class="cy-strip" id="cyStripBtn" aria-label="${ct('detail_title')}">
         <span class="cy-moon">${moonSVG(mp.frac, mp.waxing, 30)}</span>
         <span class="cy-strip-t">${ct('day_n')} ${d} · <b>${phaseLabel(ph)}</b> · ${ct('estimat')}</span>
       </button>`;
    const b = document.getElementById('cyStripBtn'); if (b) b.onclick = () => openDetail(cfg);
  }

  /** SETARI: comutatorul opt-in „Urmărește-ți ciclul". */
  function renderToggle(cfg) {
    const el = document.getElementById('cycleToggle');
    if (!el) return;
    el.innerHTML =
      `<div class="cy-tg"><div class="cy-tg-l">${ct('track_cycle')}<small>${ct('track_hint')}</small></div>
         <button class="cy-sw ${cfg.enabled ? '' : 'off'}" id="cyToggleSw" role="switch" aria-checked="${cfg.enabled}"></button></div>`;
    const sw = document.getElementById('cyToggleSw');
    if (sw) sw.onclick = async () => { const c = await loadConfig(); c.enabled = !c.enabled; await saveConfig(c); await refresh(); };
  }

  /** PROGRES: comparatia pe faze (citeste din storage; onest cu putine date). */
  async function renderProgres(cfg) {
    const el = document.getElementById('cycleProgres');
    if (!el) return;
    if (!cfg.enabled || !cfg.periods || !cfg.periods.length) { el.innerHTML = ''; return; }
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
      const moonByPhase = { menstruala: [0.08, true], foliculara: [0.55, true], ovulatie: [1.0, true], luteala: [0.5, false] };
      const on = p === cur ? ' on' : '';
      const m = moonByPhase[p];
      return `<div class="cy-st"><span>${moonSVG(m[0], m[1], 54)}</span><span class="cy-lb${on}">${phaseLabel(p).replace('faza ', '')}</span></div>`;
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
    const hasData = cfg.periods && cfg.periods.length;
    const np = hasData ? nextPeriodStart(cfg, new Date()) : null;
    // rezumat (medii) — inlocuieste cifrele repetate de pe fiecare rand
    const sum = [];
    if (hasData) {
      sum.push(`${ct('cycle_word')} <b>~${L} ${ct('setup_days')}</b>`);
      sum.push(`${ct('bleed_word')} <b>~${avgBleed(cfg)} ${ct('setup_days')}</b>`);
      if (np) sum.push(`${ct('next_short')} <b>${formatDate(np)}</b>`);
    }
    const summary = sum.length ? `<div class="cy-sum">${sum.join(' · ')}</div>` : '';
    // listă fină: un rand per ciclu; editarea (sângerare / șterge) apare la tap
    const rows = hist.length ? hist.map(h => {
      const cyc = h.len == null ? ct('current_cycle') : (h.len <= 90 ? (ct('cycle_word') + ' ' + h.len + ' ' + ct('setup_days')) : '');
      const bl = (typeof h.bleed === 'number' ? h.bleed : (cfg.period || 5));
      return `<div class="cy-hitem">
          <button type="button" class="cy-hrow" data-row="${h.start}">
            <span class="cy-hd">${formatRange(h.start, bl)}</span>
            <span class="cy-hl${h.len == null ? ' cur' : ''}">${cyc}</span></button>
          <div class="cy-hedit" id="cyEdit-${h.start}" hidden>
            <span class="cy-bl-lab">${ct('bleed_word')}</span>
            <span class="cy-bstep"><button type="button" class="cy-bm" data-b="${h.start}">−</button><b>${bl}</b><button type="button" class="cy-bp" data-b="${h.start}">+</button></span> ${ct('setup_days')}
            <button type="button" class="cy-del" data-d="${h.start}">${ct('delete_word')}</button>
          </div></div>`;
    }).join('') : `<div class="cy-empty-hist">${ct('no_logs')}</div>`;
    // cand nu avem inca destule cicluri reale, oferim stepper-ul manual de lungime
    const lenFallback = (!iv.length && hasData) ? `<label class="cy-set-row"><span>${ct('setup_length')}</span>
        <span class="cy-step"><button type="button" id="cyLenMinus">−</button><b id="cyLenVal">${cfg.length}</b> ${ct('setup_days')}<button type="button" id="cyLenPlus">+</button></span></label>` : '';
    return `<div class="cy-detail-h">${ct('setup_title')}</div>
      <button class="cy-save" id="cyLogToday">${ct('log_today')}</button>
      <details class="cy-other"><summary>${ct('log_other')}</summary>
        <div class="cy-other-row"><input type="date" id="cyOtherDate" max="${today}">
          <button class="cy-add" id="cyAddDate">${ct('add_btn')}</button></div></details>
      <div class="cy-hist-h">${ct('history_h')}</div>
      ${summary}
      <div class="cy-hist">${rows}</div>
      ${lenFallback}`;
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
    // tap pe un rand -> deschide/inchide panoul de editare (doar unul deschis)
    document.querySelectorAll('.cy-hrow').forEach(r => r.onclick = () => {
      const panel = document.getElementById('cyEdit-' + r.getAttribute('data-row'));
      const open = panel && !panel.hidden;
      document.querySelectorAll('.cy-hedit').forEach(p => p.hidden = true);
      if (panel) panel.hidden = open;
    });
    // sângerare +/- : actualizare live, fara a inchide panoul / re-randa tot
    const bleedStep = async (btn, dir) => {
      const s = btn.getAttribute('data-b');
      const bEl = btn.parentNode.querySelector('b');
      let v = (parseInt(bEl.textContent, 10) || (cfg.period || 5)) + dir;
      v = Math.max(1, Math.min(10, v)); bEl.textContent = v;
      const c = await loadConfig(); await saveConfig(setBleed(c, s, v)); await refresh();
    };
    document.querySelectorAll('.cy-bm').forEach(b => b.onclick = () => bleedStep(b, -1));
    document.querySelectorAll('.cy-bp').forEach(b => b.onclick = () => bleedStep(b, +1));
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
  let _cfgCache = null;          // ultimul cfg incarcat (pentru interogari sincrone, ex. grila de calendar)
  let _onChange = null;          // callback optional: aplicatia il seteaza ca sa re-randeze calendarul

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
      .cy-sum{font-size:.8rem;color:var(--ink-soft,#897662);margin:2px 0 6px;line-height:1.55;}
      .cy-sum b{color:var(--rose-4,#B5495F);}
      .cy-hist{border-top:1px solid var(--line,#EFE6D4);}
      .cy-hitem{border-bottom:1px solid var(--line,#EFE6D4);}
      .cy-hrow{display:flex;align-items:center;justify-content:space-between;width:100%;background:transparent;border:none;cursor:pointer;padding:13px 2px;text-align:left;font-family:inherit;}
      .cy-hd{font-weight:700;font-size:.92rem;color:var(--ink,#3A2D21);}
      .cy-hl{font-size:.8rem;color:var(--ink-soft,#897662);font-weight:700;}
      .cy-hl.cur{color:var(--rose-4,#B5495F);}
      .cy-hedit{display:flex;align-items:center;gap:9px;background:#FCF3F0;border-radius:13px;padding:10px 12px;margin:0 0 11px;font-size:.8rem;color:var(--ink-soft,#897662);font-weight:700;}
      .cy-hedit[hidden]{display:none;}
      .cy-bstep{display:inline-flex;align-items:center;gap:8px;}
      .cy-bstep b{min-width:14px;text-align:center;color:var(--ink,#3A2D21);}
      .cy-bm,.cy-bp{border:none;background:var(--rose-0,#FBE4E5);color:var(--rose-4,#B5495F);width:22px;height:22px;border-radius:7px;font-weight:800;cursor:pointer;line-height:1;}
      .cy-hedit .cy-del{margin-left:auto;border:none;background:transparent;color:var(--rose-dust,#C39199);font-weight:700;font-size:.78rem;cursor:pointer;}
      .cy-empty-hist{font-size:.82rem;color:var(--ink-soft,#897662);font-style:italic;padding:12px 2px;}
      #cycleHome:empty,#cycleCal:empty,#cycleProgres:empty,#cycleToggle:empty{display:none;}
      .cy-strip{display:inline-flex;align-items:center;gap:9px;background:transparent;border:none;cursor:pointer;padding:8px 2px 0;text-align:left;}
      .cy-strip .cy-moon{flex:none;line-height:0;}
      .cy-strip-t{font-family:'Fraunces',serif;font-size:.96rem;color:var(--ink,#3A2D21);}
      .cy-strip-t b{color:var(--rose-3,#D15E78);font-weight:600;}
      .cy-tg{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid var(--line,#EFE6D4);border-radius:14px;padding:11px 13px;}
      .cy-tg-l{font-size:.9rem;font-weight:700;color:var(--ink,#3A2D21);}
      .cy-tg-l small{display:block;color:var(--ink-soft,#897662);font-weight:600;font-size:.7rem;margin-top:2px;}
      .cy-sw{flex:none;width:42px;height:24px;border-radius:20px;border:none;background:var(--rose-3,#D15E78);position:relative;cursor:pointer;transition:background .16s;}
      .cy-sw::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;right:3px;transition:.16s;}
      .cy-sw.off{background:#D9CEBA;}
      .cy-sw.off::after{left:3px;right:auto;}
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
    _cfgCache = cfg;               // tine config sincron pentru isMenstrualDay (grila de calendar)
    renderHome();                  // ciclul nu mai e pe Home
    renderCalendar(cfg);           // strip cu luna in Calendar
    await renderProgres(cfg);      // panou (doar daca enabled)
    renderToggle(cfg);             // comutator opt-in in Setari
    // butonul "Ritmul meu" din Calendar: vizibil doar daca ciclul e activat
    const calBtn = document.getElementById('cycleSetupBtn');
    if (calBtn) { calBtn.style.display = cfg.enabled ? '' : 'none'; calBtn.textContent = ct('setup_title'); }
    if (typeof _onChange === 'function') { try { _onChange(); } catch (e) { } } // re-randeaza grila lunii
  }

  /** SINCRON: data e zi de menstruatie? (in [start, start+bleed-1] pt vreun period logat). */
  function isMenstrualDay(date) {
    const cfg = _cfgCache;
    if (!cfg || !cfg.enabled || !cfg.periods || !cfg.periods.length) return false;
    for (const p of cfg.periods) {
      const s = parseYMD(p.start);
      const len = (typeof p.bleed === 'number' && p.bleed > 0) ? p.bleed : (cfg.period || 5);
      const diff = daysBetween(s, date);
      if (diff >= 0 && diff < len) return true;
    }
    return false;
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
    init, refresh, openSettings, isMenstrualDay,
    onChange(fn) { _onChange = fn; },
    // expuse pentru testare (functii pure):
    _calc: { dayOfCycle, phaseForDay, ovulationDay, flowerOpen, phaseForDate, nextPeriodStart, avgLength, avgBleed, cycleIntervals, history, addPeriodDate, removePeriodDate, setBleed, lastPeriodOnOrBefore }
  };
})();

/* ── INTEGRARE (3 ancore in HTML + 1 apel) ──────────────────────────────────
 *  1. Home   : <div id="cycleHome"></div>     intre floarea-nav si planul zilei
 *  2. Progres: <div id="cycleProgres"></div>  in #view-stats, dupa panourile existente
 *  3. Calendar (optional): un buton care apeleaza Cycle.openSettings()
 *  4. In init(): dupa loadSettings()  ->  Cycle.init();
 *  Modulul isi injecteaza singur CSS-ul si overlay-ul; nu atinge calendarul-grila.
 * ────────────────────────────────────────────────────────────────────────── */
