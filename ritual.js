/* =====================================================================
   MODUL RITUALURI (Atomic Habits) — sursa curata, oglinda a blocului
   inlinat in mi-dia-vNN.html (ca cycle.js / persist.js).

   IMPORTANT: acest modul e INLINAT in IIFE-ul principal al app-ului,
   deci foloseste host-globals deja in scope (NU e standalone-runnable):
     Store, cur, keyFor, t()/applyI18n, esc(), toast(), chime(),
     makeNativeTime(), cats/AREA_LABELS, lang, settings.
   Straturi: DATA / CALC (pur) / VIEW / WIRING. Seria se DERIVA din log.
   Cardurile + sheet-ul folosesc DOAR tokens/CSS vars -> tema flip automat.
   ===================================================================== */
const Ritual = (function () {
  'use strict';

  /* ─── 1. DATA ──────────────────────────────────────────────────────── */
  const KEY = 'rituals';
  let _cache = [];          // sincron; reincarcat de loadCache()/refresh()
  const _cbs = [];          // onChange listeners
  const _busy = new Set();  // M4: guard anti-dublu-fire per ritual (dublu-tap rapid)
  let _editMode = false, _armDel = null;   // Faza 0 v156: edit-mode (sterge/gestioneaza ritualuri)

  const ICONS = {
    breath:  '<path d="M4 12c4-6 12-6 16 0M8 12c2-3 6-3 8 0"/>',
    move:    '<path d="M6 20l4-9 3 3 5-8"/><circle cx="18" cy="6" r="1.4"/>',
    journal: '<path d="M5 5a2 2 0 0 1 2-2h11v16H7a2 2 0 0 0-2 2V5z"/><path d="M9 7h6M9 11h6"/>',
    read:    '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z"/>',
    water:   '<path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/>',
    thanks:  '<path d="M12 4l2 5 5 .4-4 3.3 1.3 5-4.3-2.8L7.7 20 9 15 5 11.7l5-.4z"/>',
    music:   '<path d="M9 18V5l10-2v13M9 13l10-2"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    leaf:    '<path d="M5 19c0-9 7-14 14-14 0 9-5 14-14 14z"/>'
  };
  const FLAME  = '<svg viewBox="0 0 24 24"><path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.5-4 .2 1.3 1 2 2 2 0-2.4-.5-5 1.5-7z"/></svg>';
  const CHECK  = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
  const PLUS   = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  function iconSvg(id){ return '<svg viewBox="0 0 24 24">'+(ICONS[id]||ICONS.leaf)+'</svg>'; }
  const CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const STACK = '<svg viewBox="0 0 24 24"><path d="M9 12a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3M6 9l-2 2 2 2M18 9l2 2-2 2"/></svg>';

  // sugestii pt sheet-ul de creare (drumul A). name/two/identity vin din i18n (rit_sug_/rit_two_/rit_id_).
  const SUGGEST = [
    { key:'breath',  icon:'breath',  color:'--sea'      },
    { key:'move',    icon:'move',    color:'--terra'    },
    { key:'journal', icon:'journal', color:'--lavender' },
    { key:'read',    icon:'read',    color:'--olive'    },
    { key:'water',   icon:'water',   color:'--sea'      },
    { key:'thanks',  icon:'thanks',  color:'--citrus'   }
  ];

  /* ─── 2. CALC (pur — NU ating DOM, testabile) ──────────────────────── */
  function dkey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  // M1: v1 e mereu 'daily'. Pt viitorul {days:[...]}, conventia e getDay(): 0=Duminica..6=Sambata
  // (NU 1=Luni). Un UI viitor de selectie zile TREBUIE sa scrie days in aceasta conventie.
  function dueToday(r, date){
    if(!r) return false;
    const f = r.freq;
    if(!f || f === 'daily') return true;
    if(f && Array.isArray(f.days)) return f.days.indexOf(date.getDay()) >= 0;  // 0=Dum..6=Sam
    return true;
  }
  function isDone(r, date){ return !!r && Array.isArray(r.log) && r.log.indexOf(dkey(date)) >= 0; }
  function prevDueDate(r, date){
    const d = new Date(date); d.setHours(0,0,0,0);
    for(let i=0;i<400;i++){ d.setDate(d.getDate()-1); if(dueToday(r,d)) return d; }
    return null;
  }
  function streakOf(r, today){
    if(!r || !Array.isArray(r.log) || !r.log.length) return 0;
    const set = new Set(r.log);
    let d = new Date(today); d.setHours(0,0,0,0);
    if(dueToday(r,d) && !set.has(dkey(d))) d.setDate(d.getDate()-1);
    let n = 0, guard = 0;
    while(guard++ < 4000){
      if(dueToday(r,d)){ if(set.has(dkey(d))) n++; else break; }
      d.setDate(d.getDate()-1);
    }
    return n;
  }
  function missedYesterday(r, date){
    const p = prevDueDate(r, date);
    return !!p && !isDone(r, p);
  }
  // record istoric: cel mai lung run de zile "due" consecutive bifate din tot log.
  // pentru daily = cel mai lung run de zile calendaristice consecutive in log. pur (nu atinge DOM).
  function recordStreak(r, today){
    if(!r || !Array.isArray(r.log) || !r.log.length) return 0;
    const set = new Set(r.log);
    const keys = r.log.slice().sort();
    const start = new Date(keys[0] + 'T00:00:00');
    const end = new Date(today); end.setHours(0,0,0,0);
    let best = 0, run = 0, guard = 0;
    const d = new Date(start);
    while(d <= end && guard++ < 20000){
      if(dueToday(r, d)){
        if(set.has(dkey(d))){ run++; if(run > best) best = run; }
        else run = 0;
      }
      d.setDate(d.getDate() + 1);
    }
    return best;
  }
  function voteLabel(r){ return (r && r.identity) ? r.identity : ''; }

  /* ─── 3. I/O (Store host, async) ───────────────────────────────────── */
  // M2: normalizeaza log-ul (zero-pad + dedup + arunca intrarile ne-parsabile).
  // scrierile noastre sunt mereu corecte (via dkey); asta apara la backup-uri editate manual.
  function normLog(log){
    if(!Array.isArray(log)) return [];
    const out = [];
    for(const e of log){
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(''+e);
      if(!m) continue;
      const k = m[1]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[3]).padStart(2,'0');
      if(out.indexOf(k) < 0) out.push(k);
    }
    return out;
  }
  async function loadCache(){
    let arr = [];
    try{ const raw = await Store.get(KEY); if(raw) arr = JSON.parse(raw); }catch(e){ arr = []; }
    _cache = Array.isArray(arr) ? arr : [];
    _cache.forEach(r=>{ if(r) r.log = normLog(r.log); });
    return _cache;
  }
  async function save(){ try{ await Store.set(KEY, JSON.stringify(_cache)); }catch(e){} }
  function emit(){ _cbs.forEach(fn=>{ try{ fn(); }catch(e){} }); }

  /* ─── 4. VIEW ──────────────────────────────────────────────────────── */
  // v154: ritualurile opereaza MEREU pe AZI real (nu pe ziua vizualizata din day-nav).
  // Bifezi azi; backfill-ul pt zile trecute se face explicit in mini-calendarul din Progres.
  function todayD(){ const d=new Date(); d.setHours(0,0,0,0); return d; }

  function weekDots(r, today){
    let html = '<div class="r-dots">';
    const d = new Date(today); d.setHours(0,0,0,0); d.setDate(d.getDate()-6);
    for(let i=0;i<7;i++){ html += '<i class="'+(isDone(r,d)?'on':'')+'"></i>'; d.setDate(d.getDate()+1); }
    return html + '</div>';
  }
  function anchorName(id){ const a=_cache.find(x=>x.id===id); return a? a.name : ''; }

  function cardHTML(r, today){
    const done   = isDone(r, today);
    const streak = streakOf(r, today);
    const fresh  = !done && streak === 0 && r.createdAt === dkey(today);
    const miss   = !done && !fresh && missedYesterday(r, today);
    const cls = 'r-card' + (done?' done':'') + (miss?' miss':'') + (fresh?' fresh':'');
    const ac  = 'style="--ac:var('+ escA(r.color||'--olive') +')"';

    let body = '<div class="r-name">'+esc(r.name||'')+ (fresh?'<span class="r-badge">'+esc(t('rit_badge_new'))+'</span>':'') +'</div>';
    if(done && voteLabel(r)){
      body += '<div class="r-vote">'+CHECK+esc(t('rit_vote').replace('{x}', voteLabel(r)))+'</div>';
    } else if(miss){
      body += '<div class="r-miss-line">'+esc(t('rit_miss'))+'</div>'+
              '<button class="r-mini2" type="button" data-two="'+escA(r.id)+'">'+esc(t('rit_2min_do'))+'</button>';
    } else {
      // M3: daca ancora (habit stacking) a fost stearsa/nu exista, omite fragmentul "dupa" (nu afisa "dupa" gol)
      const anc = (r.cue && r.cue.type==='after') ? anchorName(r.cue.value) : '';
      const after = anc ? ' · <span class="r-tag2">'+esc(t('rit_after'))+'</span> '+esc(anc) : '';
      body += '<div class="r-two"><span class="r-tag2">'+esc(t('rit_two_prefix'))+'</span> '+esc(r.twoMin||'')+after+'</div>';
    }

    let streakBlock = '';
    if(!miss){
      if(fresh){
        streakBlock = '<div class="r-streak"><span class="r-n">0</span><span class="r-start">'+esc(t('rit_start_today'))+'</span></div>';
      } else {
        const unit = streak===1 ? t('rit_day') : t('rit_days');
        streakBlock = '<div class="r-streak"><span class="r-n">'+streak+'</span>'+
                      '<span class="r-fl">'+FLAME+esc(unit)+'</span>'+
                      (done?'':weekDots(r, today))+'</div>';
      }
    }

    const rightCtl = _editMode
      ? '<button class="r-del'+(_armDel===r.id?' arm':'')+'" type="button" data-del="'+escA(r.id)+'" aria-label="'+escA(t('aria_rit_del'))+'">'+(_armDel===r.id?esc(t('rit_del_confirm')):'✕')+'</button>'
      : '<div class="r-tick" role="button" tabindex="0" aria-pressed="'+(done?'true':'false')+'" aria-label="'+escA(t('aria_rit_check'))+'">'+CHECK+'</div>';
    return '<div class="'+cls+(_editMode?' editing':'')+'" '+ac+' data-id="'+escA(r.id)+'">'+
             '<div class="r-ic">'+iconSvg(r.icon)+'</div>'+
             '<div class="r-body">'+body+'</div>'+
             (_editMode?'':streakBlock)+
             rightCtl+
           '</div>';
  }

  function render(){
    const mount = document.getElementById('ritualMount');
    if(!mount) return;
    const list = _cache;
    if(!list.length){ mount.innerHTML = ''; return; }   // Faza 0: nimic vizibil

    const today = todayD();
    const dueN  = list.filter(r=>dueToday(r,today)).length;
    const doneN = list.filter(r=>dueToday(r,today) && isDone(r,today)).length;

    let html = '<div class="r-rule"></div>';
    html += '<div class="r-sec"><span class="r-t">'+esc(t('rit_section'))+'</span>'+
            '<span class="r-secr">'+
              (_editMode?'':'<span class="r-sum">'+FLAME+' '+esc(t('rit_summary').replace('{n}',doneN).replace('{m}',dueN))+'</span>')+
              '<button class="r-editbtn'+(_editMode?' on':'')+'" type="button" aria-label="'+escA(t('aria_rit_edit'))+'">'+esc(_editMode?t('rit_edit_done'):t('rit_edit'))+'</button>'+
            '</span></div>';
    list.forEach(r=>{ html += cardHTML(r, today); });
    if(!_editMode) html += '<button class="r-add" type="button" aria-label="'+esc(t('aria_rit_add'))+'">'+PLUS+esc(t('rit_add'))+'</button>';
    html += '<div class="r-hint">'+esc(_editMode?t('rit_edit_hint'):t('rit_hint'))+'</div>';

    mount.innerHTML = html;
    wire(mount);
  }

  /* ─── 5. WIRING ────────────────────────────────────────────────────── */
  function wire(mount){
    mount.querySelectorAll('.r-tick').forEach(el=>{
      const card = el.closest('.r-card'); if(!card) return;
      const id = card.getAttribute('data-id');
      // long-press pe bifa = versiunea de 2 min (tot bifa valida pt serie; nu rupem lantul in zilele grele)
      let lpTimer=null, lpFired=false;
      const startLP = ()=>{ lpFired=false; lpTimer=setTimeout(()=>{ lpFired=true; twoMinCheck(id); }, 500); };
      const cancelLP = ()=>{ if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; } };
      el.addEventListener('pointerdown', startLP);
      el.addEventListener('pointerup', cancelLP);
      el.addEventListener('pointerleave', cancelLP);
      el.addEventListener('pointercancel', cancelLP);
      el.onclick = ()=>{ if(lpFired){ lpFired=false; return; } toggleCheck(id); };
      el.onkeydown = (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleCheck(id); } };
    });
    // chip "↻ versiunea de 2 min" din starea miss = marcheaza versiunea de 2 min
    mount.querySelectorAll('.r-mini2[data-two]').forEach(el=>{
      el.onclick = ()=> twoMinCheck(el.getAttribute('data-two'));
    });
    const add = mount.querySelector('.r-add');
    if(add) add.onclick = ()=> openCreate();
    // Faza 0 v156: edit-mode toggle + two-tap delete (consecvent cu Scurtaturi)
    const eb = mount.querySelector('.r-editbtn');
    if(eb) eb.onclick = ()=>{ _editMode = !_editMode; _armDel = null; render(); };
    mount.querySelectorAll('.r-del[data-del]').forEach(el=>{
      el.onclick = ()=>{ const id = el.getAttribute('data-del');
        if(_armDel===id){ deleteRitual(id); } else { _armDel = id; render(); } };
    });
    // in edit-mode, tap pe corpul cardului = editare (✕ ramane stergere)
    if(_editMode){
      mount.querySelectorAll('.r-card').forEach(cardEl=>{
        const id = cardEl.getAttribute('data-id');
        cardEl.addEventListener('click', (e)=>{ if(e.target.closest('.r-del')) return; openEdit(id); });
      });
    }
  }

  // sterge un ritual (default sau custom). Ancora orfana (habit stacking) e deja tratata in cardHTML (M3).
  async function deleteRitual(id){
    _cache = _cache.filter(r=>r.id!==id);
    _armDel = null;
    if(!_cache.length) _editMode = false;
    await save();
    render();
    try{ toast(t('rit_deleted')); }catch(e){}
    emit();
  }

  async function toggleCheck(id){
    if(_busy.has(id)) return; _busy.add(id);   // M4: evita dublu-fire pe acelasi ritual
    try{
      const r = _cache.find(x=>x.id===id); if(!r) return;
      if(!Array.isArray(r.log)) r.log = [];
      const k = dkey(todayD());
      const i = r.log.indexOf(k);
      const nowDone = i < 0;
      if(nowDone) r.log.push(k); else r.log.splice(i,1);
      await save();
      render();
      if(nowDone){
        celebrate(id);
        try{ chime('reminder'); }catch(e){}
        const vl = voteLabel(r);
        try{ toast(vl ? t('rit_vote').replace('{x}', vl) : t('rit_vote_neutral')); }catch(e){}
      }
      emit();
    } finally { _busy.delete(id); }
  }

  // versiunea de 2 min (long-press pe bifa / chip din starea miss): marcheaza ziua ca facuta,
  // dar cu un mesaj bland — pe zilele grele, 2 min tot conteaza pt serie.
  async function twoMinCheck(id){
    if(_busy.has(id)) return; _busy.add(id);   // M4: evita dublu-fire (long-press + click)
    try{
      const r = _cache.find(x=>x.id===id); if(!r) return;
      if(!Array.isArray(r.log)) r.log = [];
      const k = dkey(todayD());
      // M5: doar cand chiar marchez (long-press pe o zi deja bifata = no-op, fara toast confuz)
      if(r.log.indexOf(k) < 0){
        r.log.push(k);
        await save();
        render();
        celebrate(id);
        try{ chime('reminder'); }catch(e){}
        try{ toast(t('rit_2min_toast')); }catch(e){}
        emit();
      }
    } finally { _busy.delete(id); }
  }

  function celebrate(id){
    try{
      const el = document.querySelector('#ritualMount .r-card[data-id="'+cssEsc(id)+'"] .r-tick');
      if(el){ el.classList.remove('celebrate'); void el.offsetWidth; el.classList.add('celebrate'); }
    }catch(e){}
  }
  function cssEsc(s){ return (''+s).replace(/["\\]/g,'\\$&'); }
  // esc pt CONTEXT DE ATRIBUT: escapeaza si ghilimelele " (esc global nu o face) — hardening C1.
  function escA(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ─── SHEET DE CREARE (Faza 2 / v147) ──────────────────────────────── */
  // stare selectie (drumul A chip / drumul B scris)
  let _sel = { key:null, icon:'leaf', color:'--olive', identity:'', two:'' };
  let _editId = null;   // v156: id ritual in curs de editare (null = creare)
  let _cueType = 'time', _cueTime = '07:00', _cueAfter = '';
  let _lastFocus = null;   // controlul care a deschis sheet-ul (focus-return la inchidere)

  function buildSheet(){
    if(document.getElementById('ritSheet')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ritSheet'; wrap.className = 'rs-wrap'; wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML =
      '<div class="rs-scrim" id="rsScrim"></div>'+
      '<div class="rs-sheet" role="dialog" aria-modal="true" aria-label="'+esc(t('rit_new_title'))+'">'+
        '<div class="rs-grip"></div>'+
        '<div class="rs-head"><h2>'+esc(t('rit_new_title'))+'</h2>'+
          '<button class="rs-x" id="rsX" type="button" aria-label="'+esc(t('aria_rit_close'))+'">✕</button></div>'+
        '<div class="rs-body">'+
          '<div class="rs-q"><span class="rs-num">1</span> '+esc(t('rit_q_what'))+'</div>'+
          '<input class="rs-field" id="rsName" type="text" autocomplete="off" placeholder="'+esc(t('rit_what_ph'))+'">'+
          '<div class="rs-chips" id="rsChips"></div>'+
          '<div class="rs-sub" id="rsSub">'+esc(t('rit_what_sub'))+'</div>'+
          '<div class="rs-rule"></div>'+
          '<div class="rs-q"><span class="rs-num">2</span> '+esc(t('rit_q_when'))+' <span class="rs-qsub">'+esc(t('rit_q_when_sub'))+'</span></div>'+
          '<div class="rs-seg" id="rsSeg">'+
            '<button type="button" data-cue="time" class="on" aria-pressed="true">'+CLOCK+'<span>'+esc(t('rit_cue_time'))+'</span></button>'+
            '<button type="button" data-cue="after" aria-pressed="false">'+STACK+'<span>'+esc(t('rit_cue_after'))+'</span></button>'+
          '</div>'+
          '<div class="rs-detail" id="rsDetTime"><span>'+esc(t('rit_cue_time_val'))+'</span><input type="time" id="rsTime" class="rs-time" value="07:00" aria-label="'+escA(t('rit_cue_time_val'))+'"></div>'+
          '<div class="rs-detail" id="rsDetAfter" style="display:none"><span>'+esc(t('rit_cue_after_val'))+'</span><select id="rsAfter" class="rs-select"></select></div>'+
          '<div class="rs-q"><span class="rs-num">3</span> '+esc(t('rit_q_two'))+'</div>'+
          '<input class="rs-field" id="rsTwo" type="text" autocomplete="off">'+
          '<div class="rs-hint2">'+esc(t('rit_2min_hint'))+'</div>'+
          '<button class="rs-more" id="rsMore" type="button">'+PLUS+'<span>'+esc(t('rit_more'))+'</span> <b class="rs-freq">('+esc(t('rit_freq_daily'))+')</b></button>'+
          '<div class="rs-morep" id="rsMorePanel" style="display:none"><select id="rsArea" class="rs-select rs-areasel"></select></div>'+
        '</div>'+
        '<div class="rs-foot">'+
          '<button class="rs-save" id="rsSave" type="button">'+PLUS+'<span>'+esc(t('rit_save'))+'</span></button>'+
          '<div class="rs-vote" id="rsVote"></div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(wrap);

    wrap.querySelector('#rsScrim').onclick = closeSheet;
    wrap.querySelector('#rsX').onclick = closeSheet;
    wrap.querySelector('#rsSave').onclick = commit;
    // Escape inchide sheet-ul (accesibilitate: dialog dismissable din tastatura)
    wrap.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ e.preventDefault(); closeSheet(); } });
    // cue segment
    wrap.querySelectorAll('#rsSeg button').forEach(b=>{
      b.onclick = ()=>{ setCue(b.getAttribute('data-cue')); };
    });
    // name typing -> hide suggestions (drumul B)
    const nm = wrap.querySelector('#rsName');
    nm.addEventListener('input', ()=>{ _sel.key=null; onNameTyped(); });
    // more panel toggle
    wrap.querySelector('#rsMore').onclick = ()=>{
      const p = wrap.querySelector('#rsMorePanel');
      p.style.display = (p.style.display==='none') ? 'block' : 'none';
    };
    wrap.querySelector('#rsAfter').onchange = (e)=>{ _cueAfter = e.target.value; };
    { const rt=wrap.querySelector('#rsTime'); if(rt) rt.onchange = (e)=>{ _cueTime = e.target.value || '07:00'; }; }
  }

  function renderSugChips(){
    const c = document.getElementById('rsChips'); if(!c) return;
    c.innerHTML = SUGGEST.map(s=>{
      const on = (_sel.key===s.key) ? ' sel' : '';
      return '<button type="button" class="rs-chip'+on+'" aria-pressed="'+(_sel.key===s.key?'true':'false')+'" data-key="'+s.key+'" style="--ac:var('+s.color+')">'+
             iconSvg(s.icon)+esc(t('rit_sug_'+s.key))+'</button>';
    }).join('');
    c.querySelectorAll('.rs-chip').forEach(b=>{ b.onclick = ()=> selectSug(b.getAttribute('data-key')); });
  }

  function selectSug(key){
    const s = SUGGEST.find(x=>x.key===key); if(!s) return;
    _sel = { key, icon:s.icon, color:s.color, identity:t('rit_id_'+key), two:t('rit_two_'+key) };
    const nm = document.getElementById('rsName'); if(nm) nm.value = '';       // drumul A: field ramane gol (chip = numele)
    const tw = document.getElementById('rsTwo');  if(tw) tw.value = _sel.two;
    document.getElementById('rsChips').style.display = '';
    document.getElementById('rsSub').textContent = t('rit_what_sub');
    renderSugChips(); updateVote();
  }

  function onNameTyped(){
    const nm = document.getElementById('rsName');
    const typed = nm && nm.value.trim().length>0;
    // M6: cand userul scrie nume propriu (drumul B), reseteaza selectia de chip la neutru
    // ca sa nu lipim icon/identity de la un chip abandonat pe un ritual custom.
    if(!_editId && typed && _sel.key===null && (_sel.identity || _sel.icon!=='leaf')){ _sel = { key:null, icon:'leaf', color:'--olive', identity:'', two:'' }; }
    document.getElementById('rsChips').style.display = typed ? 'none' : '';
    document.getElementById('rsSub').textContent = typed ? t('rit_what_sub_written') : t('rit_what_sub');
    if(typed){ renderSugChips(); }   // clears the .sel highlight
    updateVote();
  }

  function setCue(type){
    // habit stacking are nevoie de o ancora existenta
    if(type==='after' && !_cache.length){ type='time'; }
    _cueType = type;
    document.querySelectorAll('#rsSeg button').forEach(b=>{ const sel = b.getAttribute('data-cue')===type; b.classList.toggle('on', sel); b.setAttribute('aria-pressed', sel?'true':'false'); });
    document.getElementById('rsDetTime').style.display  = (type==='time')  ? '' : 'none';
    document.getElementById('rsDetAfter').style.display = (type==='after') ? 'flex' : 'none';
  }

  function effectiveName(){
    const nm = document.getElementById('rsName');
    const typed = nm ? nm.value.trim() : '';
    if(typed) return typed;
    if(_sel.key) return t('rit_sug_'+_sel.key);
    return '';
  }

  function updateVote(){
    const v = document.getElementById('rsVote'); if(!v) return;
    const id = _sel.identity || userIdentity || '';
    v.innerHTML = CHECK + esc(id ? t('rit_vote_foot').replace('{x}', id) : t('rit_vote_foot_neutral'));
  }

  // v156: comuta sheet-ul intre "creare" si "editare" (titlu + eticheta buton salvare)
  function setSheetMode(editing){
    const h = document.querySelector('#ritSheet .rs-head h2'); if(h) h.textContent = t(editing?'rit_edit_title':'rit_new_title');
    const sv = document.querySelector('#ritSheet #rsSave span'); if(sv) sv.textContent = t(editing?'rit_save_edit':'rit_save');
  }

  // v156: deschide sheet-ul precompletat cu un ritual existent (editare, nu creare)
  function openEdit(id){
    const r = _cache.find(x=>x.id===id); if(!r) return;
    buildSheet();
    _editId = id; setSheetMode(true);
    _sel = { key:null, icon:r.icon||'leaf', color:r.color||'--olive', identity:r.identity||'', two:r.twoMin||'' };
    _cueType = (r.cue && r.cue.type==='after') ? 'after' : 'time';
    _cueTime = (r.cue && r.cue.type==='time') ? (r.cue.value||'07:00') : '07:00';
    const others = _cache.filter(x=>x.id!==id);
    _cueAfter = (r.cue && r.cue.type==='after') ? (r.cue.value||'') : (others.length?others[0].id:'');
    const nm=document.getElementById('rsName'); if(nm) nm.value = r.name||'';
    const tw=document.getElementById('rsTwo');  if(tw) tw.value = r.twoMin||'';
    { const rt=document.getElementById('rsTime'); if(rt) rt.value = _cueTime; }
    // ancora habit-stacking: exclude ritualul insusi (nu se poate stivui pe sine)
    const af=document.getElementById('rsAfter');
    if(af){ af.innerHTML = others.map(x=>'<option value="'+escA(x.id)+'">'+esc(x.name)+'</option>').join('');
      if(_cueType==='after' && _cueAfter) af.value=_cueAfter; }
    const afterBtn=document.querySelector('#rsSeg button[data-cue="after"]');
    if(afterBtn) afterBtn.disabled = !others.length;
    const ar=document.getElementById('rsArea');
    if(ar){ let opts='<option value="">'+esc(t('rit_area_none'))+'</option>';
      try{ (areas||[]).forEach(c=>{ opts+='<option value="'+escA(c.id)+'">'+esc(areaLabel(c))+'</option>'; }); }catch(e){}
      ar.innerHTML=opts; ar.value=r.area||''; }
    document.getElementById('rsMorePanel').style.display = r.area ? 'block' : 'none';
    renderSugChips(); setCue(_cueType);
    // nume precompletat -> ascunde chip-urile fara sa resetezi _sel (nu apela onNameTyped, care ar sterge icon/identity)
    document.getElementById('rsChips').style.display = 'none';
    document.getElementById('rsSub').textContent = t('rit_what_sub_written');
    updateVote();
    const w=document.getElementById('ritSheet');
    _lastFocus = document.activeElement;
    w.classList.add('show'); w.setAttribute('aria-hidden','false');
    setTimeout(()=>{ const n=document.getElementById('rsName'); if(n) n.focus(); }, 60);
  }

  function openCreate(prefill){
    buildSheet();
    _editId = null; setSheetMode(false);
    // reset stare
    _sel = { key:null, icon:'leaf', color:'--olive', identity:'', two:'' };
    _cueType='time'; _cueTime='07:00'; _cueAfter = _cache.length ? _cache[0].id : '';
    const nm=document.getElementById('rsName'); if(nm) nm.value='';
    const tw=document.getElementById('rsTwo');  if(tw) tw.value='';
    // ora: input type=time vizibil (merge pe desktop SI mobil)
    { const rt=document.getElementById('rsTime'); if(rt) rt.value = _cueTime || '07:00'; }
    // dropdown ancora (habit stacking)
    const af=document.getElementById('rsAfter');
    if(af){ af.innerHTML = _cache.map(r=>'<option value="'+escA(r.id)+'">'+esc(r.name)+'</option>').join(''); if(_cache.length) af.value=_cache[0].id; }
    // enable/disable "dupa un ritual"
    const afterBtn=document.querySelector('#rsSeg button[data-cue="after"]');
    if(afterBtn) afterBtn.disabled = !_cache.length;
    // area picker
    const ar=document.getElementById('rsArea');
    if(ar){ let opts='<option value="">'+esc(t('rit_area_none'))+'</option>';
      try{ (areas||[]).forEach(c=>{ opts+='<option value="'+escA(c.id)+'">'+esc(areaLabel(c))+'</option>'; }); }catch(e){}
      ar.innerHTML=opts; ar.value=''; }
    document.getElementById('rsMorePanel').style.display='none';
    renderSugChips(); setCue('time'); onNameTyped(); updateVote();
    // prefill (ex. din onboarding)
    if(prefill && prefill.key) selectSug(prefill.key);
    // show
    const w=document.getElementById('ritSheet');
    _lastFocus = document.activeElement;   // retine declansatorul pt focus-return la inchidere
    w.classList.add('show'); w.setAttribute('aria-hidden','false');
    setTimeout(()=>{ const n=document.getElementById('rsName'); if(n) n.focus(); }, 60);
  }

  function closeSheet(){
    const w=document.getElementById('ritSheet'); if(!w) return;
    w.classList.remove('show'); w.setAttribute('aria-hidden','true');
    // focus-return: intoarce focusul pe controlul care a deschis sheet-ul (ex. .r-add)
    try{ if(_lastFocus && _lastFocus.focus){ _lastFocus.focus(); } }catch(e){}
    _lastFocus = null;
    _editId = null;
  }

  function areaLabel(c){
    // eticheta ariei in limba curenta: catLabel(key) e helperul host (primeste ID-ul ariei)
    try{ if(c && c.id && typeof catLabel==='function') return catLabel(c.id); }catch(e){}
    return (c && (c.label||c.id)) || '';
  }
  function colorOfArea(id){
    try{ const c=(areas||[]).find(x=>x.id===id); if(c && c.color){ return (''+c.color).replace(/^var\(|\)$/g,''); } }catch(e){}
    return '';
  }

  async function commit(){
    const name = effectiveName();
    if(!name){ const n=document.getElementById('rsName'); if(n){ n.focus(); n.classList.add('rs-err'); setTimeout(()=>n.classList.remove('rs-err'),900); } return; }
    const two = (document.getElementById('rsTwo')||{}).value || '';
    const area = (document.getElementById('rsArea')||{}).value || '';
    let color = _sel.color || '--olive';
    if(area){ const ca=colorOfArea(area); if(ca) color=ca; }
    const cue = (_cueType==='after' && _cueAfter) ? { type:'after', value:_cueAfter } : { type:'time', value:_cueTime||'07:00' };
    if(_editId){
      const ex = _cache.find(x=>x.id===_editId);
      if(ex){ ex.name=name; ex.identity=_sel.identity||ex.identity||userIdentity||''; ex.cue=cue;
        ex.twoMin=(''+two).trim(); ex.area=area; ex.color=color; ex.icon=_sel.icon||ex.icon||'leaf'; }
      _editId=null;
      await save(); closeSheet(); render(); try{ toast(t('rit_updated')); }catch(e){} emit();
      return;
    }
    const r = {
      id: 'r_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),  // M7: sufix random -> fara coliziune la acelasi ms
      name: name,
      identity: _sel.identity || userIdentity || '',
      cue: cue,
      twoMin: (''+two).trim(),
      area: area,
      color: color,
      icon: _sel.icon || 'leaf',
      freq: 'daily',
      log: [],
      createdAt: dkey(todayD())
    };
    _cache.unshift(r);
    await save();
    closeSheet();
    render();
    try{ toast(t('rit_added')); }catch(e){}
    emit();
  }

  /* ─── PROGRES: "Ritualurile mele" (istoric) — Faza 4 / v149 ────────── */
  // mini-calendar 28 zile: cel mai recent = azi (dreapta-jos), on = zi bifata.
  // v154: celulele "due" sunt TAPABILE -> backfill explicit (comuti o zi trecuta facut/nefacut).
  function monthDots(r, today){
    let html = '<div class="rst-cal">';
    const d = new Date(today); d.setHours(0,0,0,0); d.setDate(d.getDate()-27);
    for(let i=0;i<28;i++){
      const due = dueToday(r, d);
      const k = dkey(d);
      const on  = due && isDone(r, d);
      if(due){
        const lbl = d.getDate()+' '+(MON[lang]?MON[lang][d.getMonth()]:'')+' · '+(on?t('rit_bf_done'):t('rit_bf_undone'));
        html += '<button type="button" class="rst-c'+(on?' on':'')+'" data-rid="'+escA(r.id)+'" data-day="'+k+'" aria-label="'+escA(lbl)+'" aria-pressed="'+(on?'true':'false')+'"></button>';
      } else {
        html += '<span class="rst-c off"></span>';
      }
      d.setDate(d.getDate()+1);
    }
    return html + '</div>';
  }

  function ritStatCard(r, today){
    const streak = streakOf(r, today);
    const record = recordStreak(r, today);
    const ac = 'style="--ac:var('+ escA(r.color||'--olive') +')"';
    return '<div class="rst-card" '+ac+'>'+
             '<div class="rst-top">'+
               '<span class="rst-ic">'+iconSvg(r.icon)+'</span>'+
               '<span class="rst-name">'+esc(r.name||'')+'</span>'+
             '</div>'+
             '<div class="rst-nums">'+
               '<span class="rst-nb"><b class="rst-n">'+streak+'</b>'+
                 '<span class="rst-lbl">'+esc(t('rit_prog_current'))+'</span></span>'+
               '<span class="rst-nb"><b class="rst-n">'+record+'</b>'+
                 '<span class="rst-lbl">'+esc(t('rit_prog_record'))+'</span></span>'+
             '</div>'+
             monthDots(r, today)+
           '</div>';
  }

  // voturile de azi (pt cardul de identitate de pe Home): ritualuri "due" bifate azi
  function todayVotes(){
    const today = todayD();
    const due = _cache.filter(r=>dueToday(r,today));
    return { due: due.length, done: due.filter(r=>isDone(r,today)).length };
  }

  function renderRitualStats(){
    const mount = document.getElementById('ritStatsMount');
    if(!mount) return;
    if(!_cache.length){ mount.innerHTML = ''; return; }
    const today = todayD();
    let html = '<div class="panel rst-panel">'+
               '<h2 class="rst-h">'+esc(t('rit_section'))+'</h2>'+
               '<div class="rst-hint">'+esc(t('rit_backfill_hint'))+'</div>';
    _cache.forEach(r=>{ html += ritStatCard(r, today); });
    html += '</div>';
    mount.innerHTML = html;
    // backfill: comuta o zi trecuta din mini-calendar
    mount.querySelectorAll('.rst-c[data-rid]').forEach(el=>{
      el.onclick = ()=> backfillToggle(el.getAttribute('data-rid'), el.getAttribute('data-day'));
    });
  }

  // backfill explicit (Progres): comuta o zi (facut/nefacut) pt un ritual — repara o zi uitata.
  async function backfillToggle(rid, dayKey){
    const r = _cache.find(x=>x.id===rid); if(!r) return;
    if(!dayKey) return;
    if(!Array.isArray(r.log)) r.log = [];
    const i = r.log.indexOf(dayKey);
    if(i<0) r.log.push(dayKey); else r.log.splice(i,1);
    await save();
    renderRitualStats();
    emit();   // actualizeaza Home (serie, card identitate) daca e vizibil
  }

  /* ─── CSS (tokens-only -> tema automata) ───────────────────────────── */
  function injectCSS(){
    if(document.getElementById('ritual-css')) return;
    const s = document.createElement('style'); s.id = 'ritual-css';
    s.textContent = `
.ident-strip[hidden],.ident-card[hidden]{display:none}
/* v152: identity CARD (B keepsake + micro-C votes today) */
.ident-card{margin:14px 20px 2px;position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;
  background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px 13px;cursor:pointer;
  box-shadow:0 6px 18px -14px rgba(120,90,60,.5);-webkit-tap-highlight-color:transparent}
.ident-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--gold-hair)}
.ident-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(200,162,76,.28)}
.ident-card .ident-seal{width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 38%,#fff6e2,var(--sand-deep));border:1.5px solid var(--gold-gilt)}
[data-theme="dark"] .ident-card .ident-seal{background:radial-gradient(circle at 50% 38%,#5a1f3c,#38111f)}
.ident-card .ident-seal svg{width:17px;height:17px;stroke:var(--gold-deep);fill:none;stroke-width:1.5}
[data-theme="dark"] .ident-card .ident-seal svg{stroke:var(--gold-1)}
.ident-card .ident-body{flex:1;min-width:0;display:flex;flex-direction:column}
.ident-card .ident-lbl{font-size:.56rem;letter-spacing:.18em;text-transform:uppercase;color:var(--text-soft);font-weight:800}
.ident-card .ident-who{font-family:'Fraunces',serif;font-weight:500;font-size:1.08rem;color:var(--accent);line-height:1.2;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-theme="dark"] .ident-card .ident-who{color:var(--gold-1)}
.ident-card .ident-sub{display:flex;align-items:center;gap:7px;margin-top:4px}
.ident-card .ident-dots{display:flex;gap:4px}
.ident-card .ident-dots i{width:7px;height:7px;border-radius:50%;background:var(--line)}
.ident-card .ident-dots i.on{background:var(--gold-gilt)}
.ident-card .ident-vt{font-size:.66rem;color:var(--text-soft)}
.ident-card .ident-pen{width:26px;height:26px;flex:none;border-radius:8px;border:1px solid var(--line);display:grid;place-items:center}
.ident-card .ident-pen svg{width:13px;height:13px;stroke:var(--gold-gilt);fill:none;stroke-width:1.6}
#ritualMount{display:block}
#ritualMount .r-rule{height:1px;background:var(--gold-hair);opacity:.55;margin:18px 2px 14px;border-radius:1px}
#ritualMount .r-sec{display:flex;align-items:center;justify-content:space-between;margin:0 2px 10px}
#ritualMount .r-sec .r-t{font-family:'Fraunces',serif;font-size:1.12rem;font-weight:500;color:var(--text);letter-spacing:.01em}
#ritualMount .r-sec .r-sum{font-size:.72rem;color:var(--text-soft);display:flex;align-items:center;gap:5px}
#ritualMount .r-sec .r-sum svg{width:13px;height:13px;stroke:var(--gold-gilt);fill:none;stroke-width:1.6}
#ritualMount .r-card{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:11px 12px;margin-bottom:9px;box-shadow:0 4px 14px -10px rgba(120,90,60,.3);position:relative;overflow:hidden}
#ritualMount .r-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ac,var(--olive))}
#ritualMount .r-card .r-ic{width:34px;height:34px;flex:none;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--ac,var(--olive)) 14%,var(--surface))}
#ritualMount .r-card .r-ic svg{width:19px;height:19px;stroke:var(--ac,var(--olive));fill:none;stroke-width:1.6}
#ritualMount .r-card .r-body{flex:1;min-width:0}
#ritualMount .r-card .r-name{font-weight:700;font-size:.96rem;color:var(--text);line-height:1.15}
#ritualMount .r-card .r-two{font-size:.72rem;color:var(--text-soft);margin-top:2px}
#ritualMount .r-card .r-two .r-tag2{font-weight:700;color:var(--gold-deep)}
[data-theme="dark"] #ritualMount .r-card .r-two .r-tag2{color:var(--gold-1)}
#ritualMount .r-streak{display:flex;flex-direction:column;align-items:center;gap:2px;flex:none;padding:0 2px}
#ritualMount .r-streak .r-n{font-family:'Fraunces',serif;font-weight:600;font-size:1.22rem;line-height:1;color:var(--accent)}
#ritualMount .r-streak .r-fl{display:flex;align-items:center;gap:3px;font-size:.6rem;color:var(--text-soft);letter-spacing:.04em}
#ritualMount .r-streak .r-fl svg{width:11px;height:11px;stroke:var(--terra);fill:none;stroke-width:1.6}
#ritualMount .r-streak .r-start{font-size:.6rem;font-weight:800;color:var(--gold-deep)}
[data-theme="dark"] #ritualMount .r-streak .r-start{color:var(--gold-1)}
#ritualMount .r-dots{display:flex;gap:3px;margin-top:3px}
#ritualMount .r-dots i{width:5px;height:5px;border-radius:50%;background:var(--line)}
#ritualMount .r-dots i.on{background:var(--gold-gilt)}
/* v152: quiet-luxury tick — hairline fina, umplere soptita, bifa gilt (nu solid strident + halo) */
#ritualMount .r-tick{width:28px;height:28px;flex:none;border-radius:9px;border:1.5px solid color-mix(in srgb,var(--ac,var(--olive)) 30%,var(--line));display:grid;place-items:center;background:transparent;cursor:pointer;transition:transform .14s ease,background .18s ease,border-color .18s ease}
#ritualMount .r-tick svg{width:15px;height:15px;stroke:var(--gold-deep);fill:none;stroke-width:2;opacity:0;transition:opacity .18s ease}
[data-theme="dark"] #ritualMount .r-tick svg{stroke:var(--gold-1)}
#ritualMount .r-card.done .r-tick{background:color-mix(in srgb,var(--ac,var(--olive)) 11%,var(--surface));border-color:color-mix(in srgb,var(--gold-gilt) 46%,var(--line));box-shadow:none}
#ritualMount .r-card.done .r-tick svg{opacity:1}
#ritualMount .r-card.done .r-name{color:var(--text-soft);text-decoration:line-through;text-decoration-color:var(--line)}
#ritualMount .r-card.done .r-dots{display:none}
#ritualMount .r-vote{display:flex;align-items:center;gap:5px;font-size:.72rem;color:var(--gold-deep);font-weight:700;margin-top:3px}
#ritualMount .r-vote svg{width:12px;height:12px;stroke:var(--gold-gilt);fill:none;stroke-width:1.8}
[data-theme="dark"] #ritualMount .r-vote{color:var(--gold-1)}
@keyframes rPulse{0%{transform:scale(1)}45%{transform:scale(1.08)}100%{transform:scale(1)}}
#ritualMount .r-tick.celebrate{animation:rPulse .3s ease}
@media (prefers-reduced-motion: reduce){ #ritualMount .r-tick.celebrate{animation:none} }
#ritualMount .r-card.miss{border-color:color-mix(in srgb,var(--terra) 40%,var(--line));background:color-mix(in srgb,var(--terra) 6%,var(--surface))}
[data-theme="dark"] #ritualMount .r-card.miss{background:color-mix(in srgb,var(--terra) 12%,var(--surface))}
#ritualMount .r-card.miss::before{background:var(--terra)}
#ritualMount .r-card .r-miss-line{font-size:.72rem;color:var(--terra);margin-top:3px;font-weight:600}
#ritualMount .r-mini2{margin-top:6px;display:inline-flex;align-items:center;gap:5px;font-size:.68rem;font-weight:700;border:1px solid var(--line);border-radius:20px;padding:3px 10px;color:var(--accent);background:var(--surface);cursor:pointer;font-family:inherit}
#ritualMount .r-card.fresh{border-color:var(--gold-gilt);box-shadow:0 0 0 2px rgba(200,162,76,.22),0 8px 20px -10px rgba(200,162,76,.5)}
#ritualMount .r-badge{font-size:.55rem;font-weight:800;letter-spacing:.08em;color:#3a2418;background:var(--gold-hair);border-radius:20px;padding:2px 7px;margin-left:6px;vertical-align:1px}
#ritualMount .r-add{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;border:1px dashed var(--line);background:transparent;border-radius:16px;padding:11px;color:var(--text-soft);font-weight:700;font-size:.82rem;margin-bottom:4px;cursor:pointer;font-family:inherit}
#ritualMount .r-add svg{width:15px;height:15px;stroke:var(--gold-gilt);fill:none;stroke-width:1.7}
#ritualMount .r-hint{font-size:.7rem;color:var(--text-soft);opacity:.85;margin:6px 2px 0}
/* v156 Faza 0: edit-mode (sterge/gestioneaza ritualuri) */
#ritualMount .r-secr{display:flex;align-items:center;gap:10px}
#ritualMount .r-editbtn{background:transparent;border:none;color:var(--text-soft);font-family:inherit;font-weight:700;font-size:.72rem;cursor:pointer;padding:4px 6px;text-decoration:underline;text-underline-offset:3px;-webkit-tap-highlight-color:transparent}
#ritualMount .r-editbtn.on{color:var(--accent)}
#ritualMount .r-del{min-width:28px;height:28px;flex:none;padding:0 10px;border-radius:9px;border:1px solid color-mix(in srgb,var(--terra) 40%,var(--line));background:color-mix(in srgb,var(--terra) 8%,var(--surface));color:var(--terra);font-size:.9rem;font-weight:700;font-family:inherit;cursor:pointer;display:grid;place-items:center;transition:transform .12s ease}
#ritualMount .r-del.arm{background:var(--terra);color:#fff;padding:0 12px;font-size:.72rem}
#ritualMount .r-del:active{transform:scale(.94)}
#ritualMount .r-card.editing{cursor:pointer}
/* ===== sheet de creare ===== */
.rs-wrap{position:fixed;inset:0;z-index:1200;display:none}
.rs-wrap.show{display:block}
.rs-scrim{position:absolute;inset:0;background:rgba(30,12,20,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
.rs-sheet{position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:100%;max-width:var(--maxw,452px);
  max-height:92vh;background:var(--bg);color:var(--text);border-radius:26px 26px 0 0;
  box-shadow:0 -18px 50px -20px rgba(0,0,0,.5);padding:10px 20px 20px;display:flex;flex-direction:column}
.rs-grip{width:38px;height:4px;border-radius:3px;background:var(--line);margin:0 auto}
.rs-head{display:flex;align-items:center;justify-content:space-between;margin:12px 0 2px}
.rs-head h2{margin:0;font-family:'Fraunces',serif;font-weight:500;font-size:1.35rem;color:var(--text)}
.rs-x{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--text-soft);font-size:1rem;display:grid;place-items:center;cursor:pointer}
.rs-body{flex:1;overflow:auto;padding-top:4px}
.rs-q{font-family:'Nunito Sans';font-weight:800;font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--text-soft);margin:16px 2px 8px;display:flex;align-items:center;gap:7px}
.rs-qsub{text-transform:none;letter-spacing:0;font-weight:600;color:var(--text-soft)}
.rs-num{width:18px;height:18px;flex:none;border-radius:50%;background:var(--gold-hair);color:#3a2418;font-size:.62rem;display:grid;place-items:center;font-weight:800}
.rs-rule{height:1px;background:var(--gold-hair);opacity:.5;margin:16px 2px}
.rs-field{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:.98rem;color:var(--text);font-family:inherit;font-weight:600}
.rs-field::placeholder{color:var(--text-soft);font-weight:500}
.rs-field:focus{outline:none;border-color:var(--gold-gilt);box-shadow:0 0 0 3px rgba(200,162,76,.18)}
.rs-field.rs-err{border-color:var(--terra);box-shadow:0 0 0 3px color-mix(in srgb,var(--terra) 22%,transparent)}
.rs-sub{font-size:.72rem;color:var(--text-soft);margin:7px 2px 0}
.rs-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.rs-chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:7px 13px;font-size:.84rem;font-weight:700;color:var(--text);cursor:pointer;font-family:inherit}
.rs-chip svg{width:15px;height:15px;stroke:var(--ac,var(--olive));fill:none;stroke-width:1.6}
.rs-chip.sel{background:linear-gradient(180deg,rgba(200,162,76,.16),rgba(200,162,76,.06));border-color:var(--gold-gilt)}
.rs-seg{display:flex;gap:8px;margin-top:4px}
.rs-seg button{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 8px;color:var(--text-soft);font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit}
.rs-seg button svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.6}
.rs-seg button.on{color:var(--text);border-color:var(--gold-gilt);background:linear-gradient(180deg,rgba(200,162,76,.14),transparent);box-shadow:0 0 0 2px rgba(200,162,76,.12)}
.rs-seg button.on svg{stroke:var(--gold-gilt)}
.rs-seg button:disabled{opacity:.4;cursor:not-allowed}
.rs-detail{margin-top:9px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.9rem;font-weight:600}
.rs-detail .achip{margin:0;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:6px 11px;color:var(--text-soft)}
.rs-detail .achip.set{background:var(--surface);border-color:var(--gold-gilt);color:var(--accent);box-shadow:none}
.rs-detail .achip .lab{color:var(--accent);font-weight:800}
.rs-detail .achip .lead svg,.rs-detail .achip.set .lead svg{stroke:var(--gold-gilt)}
.rs-select{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:7px 9px;color:var(--accent);font-weight:800;font-family:inherit;font-size:.86rem;max-width:60%}
.rs-time{background:var(--surface);border:1px solid var(--gold-gilt);border-radius:10px;padding:6px 11px;color:var(--accent);font-family:inherit;font-weight:800;font-size:.92rem;cursor:pointer}
.rs-time:focus{outline:none;box-shadow:0 0 0 3px rgba(200,162,76,.18)}
[data-theme="dark"] .rs-time::-webkit-calendar-picker-indicator{filter:invert(.85) sepia(.4) saturate(2) hue-rotate(5deg)}
.rs-hint2{font-size:.72rem;color:var(--text-soft);margin:7px 2px 0;font-style:italic}
.rs-more{display:flex;align-items:center;gap:8px;margin-top:14px;color:var(--text-soft);font-size:.82rem;font-weight:700;background:transparent;border:none;cursor:pointer;font-family:inherit;padding:2px}
.rs-more svg{width:15px;height:15px;stroke:var(--gold-gilt);fill:none;stroke-width:1.7}
.rs-more .rs-freq{color:var(--text)}
.rs-morep{margin-top:10px}
.rs-areasel{max-width:100%;width:100%;color:var(--text)}
.rs-foot{padding-top:12px}
.rs-save{width:100%;border:none;border-radius:16px;padding:15px;font-family:'Nunito Sans';font-weight:800;font-size:1rem;
  background:var(--brand);color:var(--bink,#FFFCF7);cursor:pointer;box-shadow:0 0 0 2px rgba(200,162,76,.35),0 10px 22px -10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;gap:8px}
:root .rs-save{--bink:#FFFCF7}
[data-theme="light"] .rs-save{--bink:#FFFCF7}
[data-theme="dark"] .rs-save{--bink:#3A1020}
.rs-save svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:2.4}
.rs-vote{text-align:center;font-size:.72rem;color:var(--gold-deep);font-weight:700;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px}
.rs-vote svg{width:12px;height:12px;stroke:var(--gold-gilt);fill:none;stroke-width:1.8}
[data-theme="dark"] .rs-vote{color:var(--gold-1)}
/* ===== Progres: Ritualurile mele (istoric) ===== */
#ritStatsMount .rst-panel{display:block}
#ritStatsMount .rst-h{font-family:'Fraunces',serif;font-weight:500;letter-spacing:.01em}
#ritStatsMount .rst-card{padding:12px 2px;border-top:1px solid var(--line)}
#ritStatsMount .rst-card:first-of-type{border-top:none;padding-top:4px}
#ritStatsMount .rst-top{display:flex;align-items:center;gap:9px;margin-bottom:9px}
#ritStatsMount .rst-ic{width:26px;height:26px;flex:none;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--ac,var(--olive)) 14%,var(--surface))}
#ritStatsMount .rst-ic svg{width:15px;height:15px;stroke:var(--ac,var(--olive));fill:none;stroke-width:1.6}
#ritStatsMount .rst-name{font-weight:700;font-size:.92rem;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ritStatsMount .rst-nums{display:flex;gap:22px;margin:0 0 10px 35px}
#ritStatsMount .rst-nb{display:flex;flex-direction:column;line-height:1}
#ritStatsMount .rst-n{font-family:'Fraunces',serif;font-weight:600;font-size:1.5rem;color:var(--accent)}
#ritStatsMount .rst-lbl{font-size:.6rem;letter-spacing:.05em;color:var(--text-soft);text-transform:uppercase;margin-top:4px}
#ritStatsMount .rst-cal{display:grid;grid-template-columns:repeat(14,1fr);gap:4px;margin-left:35px;max-width:260px}
#ritStatsMount .rst-cal .rst-c{aspect-ratio:1;border-radius:3px;background:var(--line);border:none;padding:0;margin:0;display:block;width:100%}
#ritStatsMount .rst-cal button.rst-c{cursor:pointer;transition:transform .1s ease,background .15s ease}
#ritStatsMount .rst-cal button.rst-c:hover{transform:scale(1.22)}
#ritStatsMount .rst-cal button.rst-c:active{transform:scale(.9)}
#ritStatsMount .rst-cal button.rst-c:focus-visible{outline:none;box-shadow:0 0 0 2px var(--gold-gilt)}
#ritStatsMount .rst-cal .rst-c.on{background:var(--gold-gilt)}
#ritStatsMount .rst-cal span.rst-c.off{opacity:.4}
#ritStatsMount .rst-hint{font-size:.7rem;color:var(--text-soft);margin:2px 2px 12px}
`;
    document.head.appendChild(s);
  }

  /* ─── PUBLIC API ───────────────────────────────────────────────────── */
  // Faza 3 (v148): seed default la PRIMA rulare. Flag-ul Store e sursa de adevar
  // a "primei rulari" -> nu re-seed-am daca userul si-a sters ritualurile mai tarziu.
  // Numele/twoMin/identity vin din i18n = limba activa la momentul seed-ului (la init()
  // lang e deja incarcat + applyI18n() a rulat; conceptual e text tastat de user).
  async function seedDefaults(){
    let seeded = null;
    try{ seeded = await Store.get('rit_seeded_v1'); }catch(e){ seeded = null; }
    if(seeded) return;
    if(!_cache.length){
      const created = dkey(todayD());
      _cache = [
        { id:'r_seed_breath', name:t('rit_seed_breath_name'), identity:t('rit_id_breath'),
          cue:{ type:'time', value:'08:00' }, twoMin:t('rit_two_breath'),
          area:'', color:'--sea', icon:'breath', freq:'daily', log:[], createdAt:created },
        { id:'r_seed_thanks', name:t('rit_seed_thanks_name'), identity:t('rit_id_thanks'),
          cue:{ type:'after', value:'r_seed_breath' }, twoMin:t('rit_two_thanks'),
          area:'', color:'--citrus', icon:'thanks', freq:'daily', log:[], createdAt:created }
      ];
      await save();
    }
    try{ await Store.set('rit_seeded_v1','1'); }catch(e){}
  }

  async function init(){
    injectCSS();
    await loadCache();
    // Faza 3 (v148): seed 2 ritualuri default la prima rulare.
    await seedDefaults();
    render();
  }
  async function refresh(){ await loadCache(); render(); emit(); }
  function onChange(fn){ if(typeof fn==='function') _cbs.push(fn); }

  return {
    init, render, refresh, onChange, openCreate, renderRitualStats, todayVotes,
    _calc: { dkey, dueToday, isDone, streakOf, missedYesterday, recordStreak, voteLabel },
    _get: ()=> _cache.slice()
  };
})();

  /* ===== MODUL ONBOARDING GHIDAT (vezi onboard.js — felie curata) ===== */
const Onboard = (function(){
  'use strict';

  let _step = 0;
  const STEPS = ['welcome','identity','plan','flower','ritual','safe'];

  function ea(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  const PEN   = '<svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16z"/></svg>';
  const FLAME = '<svg viewBox="0 0 24 24"><path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.5-4 .2 1.3 1 2 2 2 0-2.4-.5-5 1.5-7z"/></svg>';
  const SHIELD= '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';

  function flowerIllus(){
    // line-art al florii REALE din app (acelasi petalPath: teardrop, baza 64/149, varf 64/11)
    const D = "M 64 149 C 76.8 142.1 114 102.08 114 77.24 C 114 46.88 66.25 24.8 64 11 C 61.75 24.8 14 46.88 14 77.24 C 14 102.08 51.2 142.1 64 149 Z";
    const petals = [0,72,144,216,288].map(a=>'<path d="'+D+'" transform="rotate('+a+') translate(-64 -149)"/>').join('');
    // v153: floarea reala + samanta-glow in centru (intentia = inima care arde)
    return '<div class="onb-flowermark">'+
             '<svg class="onb-flower" viewBox="-150 -150 300 300" aria-hidden="true">'+
               '<g fill="none" stroke="var(--gold-gilt)" stroke-width="3.4" stroke-linejoin="round">'+petals+'</g>'+
             '</svg>'+
             '<span class="onb-seed" aria-hidden="true"></span>'+
           '</div>';
  }
  // poem cu drop-cap gilt pe prima litera + versuri separate cu <br>
  function poemHTML(txt){
    const lines = (''+txt).split('\n');
    let html = '';
    lines.forEach((ln,i)=>{
      if(i===0){ html += '<span class="onb-dc">'+esc(ln.charAt(0))+'</span>'+esc(ln.slice(1)); }
      else { html += esc(ln); }
      if(i < lines.length-1) html += '<br>';
    });
    return html;
  }

  function stepWelcome(){
    return '<div class="onb-brand">Mi <span class="onb-dia">Día</span></div>'+
           '<div class="onb-phrase"><div class="onb-es">'+esc(t('onb_es_phrase'))+'</div>'+
             '<div class="onb-tr">'+esc(t('onb_es_tr'))+'</div></div>'+
           '<h2 class="onb-t">'+esc(t('onb_welcome_t'))+'</h2>'+
           '<p class="onb-p">'+esc(t('onb_welcome_sub'))+'</p>'+
           '<div class="onb-lang" id="onbLang" role="group" aria-label="'+ea(t('onb_lang_q'))+'">'+
             ['en','es','ro'].map(L=>'<button type="button" data-l="'+L+'" aria-pressed="'+(lang===L?'true':'false')+'" class="'+(lang===L?'sel':'')+'">'+L.toUpperCase()+'</button>').join('')+
           '</div>';
  }
  function stepIdentity(){
    const opts = ['calm','active','creative','organized'];
    return '<div class="onb-ic">'+PEN+'</div>'+
           '<h2 class="onb-t">'+esc(t('onb_identity_t'))+'</h2>'+
           '<p class="onb-p">'+esc(t('onb_identity_sub'))+'</p>'+
           '<div class="onb-chips" id="onbIdChips">'+
             opts.map(k=>{ const val=t('onb_id_'+k); return '<button type="button" class="onb-chip'+(userIdentity===val?' sel':'')+'" aria-pressed="'+(userIdentity===val?'true':'false')+'" data-id="'+ea(val)+'">'+esc(val)+'</button>'; }).join('')+
           '</div>'+
           '<input class="onb-input" id="onbIdInput" type="text" maxlength="40" placeholder="'+ea(t('onb_identity_ph'))+'" value="'+ea(userIdentity)+'" autocomplete="off">';
  }
  function stepPlan(){
    return '<h2 class="onb-t">'+esc(t('onb_plan_t'))+'</h2>'+
           '<p class="onb-p">'+esc(t('onb_plan_sub'))+'</p>'+
           '<div class="onb-planrow">'+
             '<input class="onb-planinput" id="onbPlanInput" type="text" maxlength="80" placeholder="'+ea(t('onb_plan_field'))+'" autocomplete="off">'+
             '<button class="onb-planadd" id="onbPlanAdd" type="button" aria-label="'+ea(t('add'))+'">+</button>'+
           '</div>'+
           '<div class="onb-planmsg" id="onbPlanMsg" aria-live="polite"></div>';
  }
  function stepFlower(){
    // v153: pasul "Floarea" = poezie (aleasa de Ines) + floarea cu samanta-glow. Fara lista.
    return '<div class="onb-illus">'+flowerIllus()+'</div>'+
           '<div class="onb-poem">'+poemHTML(t('onb_flower_poem'))+'</div>';
  }
  function stepRitual(){
    return '<div class="onb-ic">'+FLAME+'</div>'+
           '<h2 class="onb-t">'+esc(t('onb_ritual_t'))+'</h2>'+
           '<p class="onb-p">'+esc(t('onb_ritual_sub'))+'</p>'+
           '<button class="onb-cta" id="onbRitualCta" type="button">'+esc(t('onb_ritual_cta'))+'</button>';
  }
  function stepSafe(){
    return '<div class="onb-ic">'+SHIELD+'</div>'+
           '<h2 class="onb-t">'+esc(t('onb_backup_t'))+'</h2>'+
           '<p class="onb-p">'+esc(t('onb_backup_sub'))+'</p>';
  }
  const BUILDERS = { welcome:stepWelcome, identity:stepIdentity, plan:stepPlan, flower:stepFlower, ritual:stepRitual, safe:stepSafe };

  function render(){
    const body = document.getElementById('onbBody'); if(!body) return;
    const key = STEPS[_step];
    body.innerHTML = (BUILDERS[key]||(()=> ''))();
    const dots = document.getElementById('onbDots');
    if(dots) dots.innerHTML = STEPS.map((s,i)=>'<i class="'+(i===_step?'on':'')+'"></i>').join('');
    const nx = document.getElementById('onbNext');
    if(nx){
      // pe pasul "ritual", butonul din footer e SECUNDAR ("Mai tarziu") ca sa nu concureze cu CTA-ul "Creeaza"
      if(key==='ritual'){ nx.textContent = t('onb_later'); nx.classList.add('secondary'); }
      else { nx.textContent = (_step===STEPS.length-1) ? t('onb_done') : t('onb_next'); nx.classList.remove('secondary'); }
    }
    const bk = document.getElementById('onbBack');
    if(bk){ bk.textContent = t('onb_back'); bk.style.visibility = (_step===0) ? 'hidden' : 'visible'; }
    const sk = document.getElementById('onbSkip'); if(sk) sk.textContent = t('onb_skip');
    wireStep(body, key);
  }

  function wireStep(body, key){
    if(key==='welcome'){
      body.querySelectorAll('#onbLang button').forEach(b=>{
        b.onclick = ()=>{ const L=b.getAttribute('data-l'); if(!L) return; lang=L;
          try{ saveSettings(); }catch(e){} try{ renderLangBar(); }catch(e){} try{ applyI18n(); }catch(e){}
          render(); };
      });
    } else if(key==='identity'){
      body.querySelectorAll('#onbIdChips button').forEach(b=>{
        b.onclick = ()=>{ const v=b.getAttribute('data-id')||''; userIdentity=v;
          const inp=document.getElementById('onbIdInput'); if(inp) inp.value=v;
          try{ saveSettings(); }catch(e){} try{ renderIdentStrip(); }catch(e){}
          body.querySelectorAll('#onbIdChips button').forEach(x=>{ const on=(x.getAttribute('data-id')===v); x.classList.toggle('sel',on); x.setAttribute('aria-pressed', on?'true':'false'); }); };
      });
      const inp=document.getElementById('onbIdInput');
      if(inp) inp.oninput = ()=>{ userIdentity=inp.value.slice(0,40); try{ saveSettings(); }catch(e){} try{ renderIdentStrip(); }catch(e){}
        body.querySelectorAll('#onbIdChips button').forEach(x=>{ x.classList.remove('sel'); x.setAttribute('aria-pressed','false'); }); };
    } else if(key==='plan'){
      const inp=document.getElementById('onbPlanInput');
      const addb=document.getElementById('onbPlanAdd');
      if(addb) addb.onclick = ()=> addOnbActivity();
      if(inp) inp.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addOnbActivity(); } };
    } else if(key==='ritual'){
      const cta=document.getElementById('onbRitualCta');
      if(cta) cta.onclick = ()=> createFirst();
    }
  }

  // adauga activitatea tastata direct in planul zilei (host addFromForm), fara sa iesim din onboarding
  function addOnbActivity(){
    const inp=document.getElementById('onbPlanInput'); if(!inp) return;
    const v=(inp.value||'').trim(); if(!v) return;
    try{ const it=document.getElementById('inTitle'); if(it){ it.value=v; addFromForm(); } }catch(e){}
    inp.value='';
    const msg=document.getElementById('onbPlanMsg');
    if(msg){ msg.textContent=t('onb_plan_added'); msg.classList.add('show'); setTimeout(()=>{ msg.classList.remove('show'); }, 1800); }
    try{ inp.focus(); }catch(e){}
  }

  function next(){
    if(_step < STEPS.length-1){ _step++; render(); const c=document.querySelector('#onbOverlay .onb-card'); if(c) c.scrollTop=0; }
    else finish();
  }
  function back(){
    if(_step > 0){ _step--; render(); const c=document.querySelector('#onbOverlay .onb-card'); if(c) c.scrollTop=0; }
  }

  function open(){
    injectCSS(); buildOverlay(); _step=0; render();
    const o=document.getElementById('onbOverlay');
    o.classList.add('show'); o.setAttribute('aria-hidden','false');
    try{ document.body.style.overflow='hidden'; }catch(e){}
    setTimeout(()=>{ const nx=document.getElementById('onbNext'); if(nx) nx.focus(); }, 60);
  }
  function close(){
    const o=document.getElementById('onbOverlay'); if(!o) return;
    o.classList.remove('show'); o.setAttribute('aria-hidden','true');
    try{ document.body.style.overflow=''; }catch(e){}
  }
  function markDone(){ userOnboarded=true; try{ saveSettings(); }catch(e){} }
  function finish(){ markDone(); close(); }
  function createFirst(){ markDone(); close(); try{ Ritual.openCreate(); }catch(e){} }

  function injectCSS(){
    if(document.getElementById('onb-css')) return;
    const s=document.createElement('style'); s.id='onb-css';
    s.textContent = `
.onb{position:fixed;inset:0;z-index:1500;display:none;align-items:center;justify-content:center;padding:20px;
  background:radial-gradient(120% 100% at 50% 0%,rgba(58,20,38,.72),rgba(20,8,14,.86))}
.onb.show{display:flex}
.onb-card{width:100%;max-width:390px;max-height:92vh;overflow:auto;background:var(--bg);color:var(--text);
  border:1px solid var(--line);border-radius:24px;box-shadow:0 30px 70px -28px rgba(0,0,0,.7);
  padding:26px 24px 18px;position:relative;text-align:center;animation:onbRise .4s ease}
@keyframes onbRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.onb-skip{position:absolute;top:12px;right:14px;background:transparent;border:none;color:var(--text-soft);
  font-family:inherit;font-size:.76rem;font-weight:700;cursor:pointer;padding:6px 8px;text-decoration:underline;text-underline-offset:3px}
.onb-brand{font-family:'Fraunces',serif;font-weight:500;font-size:2.2rem;color:var(--text);line-height:1;margin:6px 0 4px}
.onb-dia{font-family:'Ephesis',cursive;font-size:1.4em;background:var(--gold-hair);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding:0 .06em}
.onb-phrase{margin:8px 0 4px}
.onb-es{font-family:'Fraunces',serif;font-style:italic;font-size:1.05rem;color:var(--accent);line-height:1.3}
[data-theme="dark"] .onb-es{color:var(--gold-1)}
.onb-tr{font-size:.76rem;color:var(--text-soft);margin-top:2px}
.onb-ic{width:52px;height:52px;margin:6px auto 12px;border-radius:16px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--gold-gilt) 14%,var(--surface));border:1px solid var(--line)}
.onb-ic svg{width:26px;height:26px;stroke:var(--gold-gilt);fill:none;stroke-width:1.5}
.onb-t{font-family:'Fraunces',serif;font-weight:500;font-size:1.4rem;color:var(--text);margin:6px 0 8px;letter-spacing:.01em}
.onb-p{font-size:.9rem;color:var(--text-soft);line-height:1.5;margin:0 4px 14px}
.onb-lang{display:flex;gap:8px;justify-content:center;margin:6px 0 2px}
.onb-lang button{min-width:52px;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);
  color:var(--text-soft);font-family:inherit;font-weight:800;font-size:.8rem;letter-spacing:.05em;cursor:pointer}
.onb-lang button.sel{border-color:var(--gold-gilt);color:var(--text);background:linear-gradient(180deg,rgba(200,162,76,.14),transparent)}
.onb-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:4px 0 12px}
.onb-chip{padding:8px 14px;border-radius:22px;border:1px solid var(--line);background:var(--surface);color:var(--text);
  font-family:inherit;font-weight:700;font-size:.84rem;cursor:pointer}
.onb-chip.sel{border-color:var(--gold-gilt);background:linear-gradient(180deg,rgba(200,162,76,.16),rgba(200,162,76,.05))}
.onb-input{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:11px 14px;
  font-family:inherit;font-size:.95rem;font-weight:600;color:var(--text)}
.onb-input:focus{outline:none;border-color:var(--gold-gilt);box-shadow:0 0 0 3px rgba(200,162,76,.18)}
.onb-input::placeholder{color:var(--text-soft);font-weight:500}
.onb-illus{display:grid;place-items:center;margin:2px 0 12px}
/* v153: floarea cu samanta-glow (intentia = inima care arde) + poemul */
.onb-flowermark{position:relative;width:104px;height:104px;margin:2px auto}
.onb-flowermark::before{content:"";position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:158px;height:158px;border-radius:50%;background:radial-gradient(circle,rgba(200,162,76,.34),rgba(200,162,76,0) 68%);pointer-events:none}
.onb-flower{position:absolute;inset:0;width:100%;height:100%}
.onb-seed{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:radial-gradient(circle,var(--gold-1),var(--gold-deep));box-shadow:0 0 12px 2px rgba(200,162,76,.6)}
.onb-poem{font-family:'Fraunces',serif;font-style:italic;font-weight:400;font-size:1.14rem;line-height:1.72;color:var(--text);margin:4px 4px 2px}
.onb-dc{font-style:normal;font-weight:600;font-size:1.5em;line-height:.9;background:var(--gold-hair);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding-right:.02em}
/* plan step: real input + commit */
.onb-planrow{display:flex;align-items:center;gap:9px;margin:2px 0 4px}
.onb-planinput{flex:1;min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;
  padding:11px 14px;font-family:inherit;font-size:.95rem;font-weight:600;color:var(--text)}
.onb-planinput:focus{outline:none;border-color:var(--gold-gilt);box-shadow:0 0 0 3px rgba(200,162,76,.18)}
.onb-planinput::placeholder{color:var(--text-soft);font-weight:500}
.onb-planadd{width:42px;height:42px;flex:none;border:none;border-radius:50%;background:var(--brand);color:var(--bink,#FFFCF7);
  font-size:1.4rem;font-weight:800;line-height:1;cursor:pointer;box-shadow:0 0 0 2px rgba(200,162,76,.3)}
:root .onb-planadd,[data-theme="light"] .onb-planadd{--bink:#FFFCF7}
[data-theme="dark"] .onb-planadd{--bink:#3A1020}
.onb-planmsg{min-height:18px;font-size:.78rem;font-weight:700;color:var(--gold-deep);opacity:0;transition:opacity .2s;text-align:left;margin:2px 2px 8px}
[data-theme="dark"] .onb-planmsg{color:var(--gold-1)}
.onb-planmsg.show{opacity:1}
.onb-pet{list-style:none;margin:2px 0 12px;padding:0;text-align:left;font-size:.84rem;color:var(--text-soft);line-height:1.5}
.onb-pet li{padding:3px 0}
.onb-pet b{color:var(--text);font-weight:700}
.onb-pet .onb-pet-c b{color:var(--accent)}
[data-theme="dark"] .onb-pet .onb-pet-c b{color:var(--gold-1)}
.onb-cta{width:100%;border:none;border-radius:14px;padding:13px;font-family:inherit;font-weight:800;font-size:.95rem;
  background:var(--brand);color:var(--bink,#FFFCF7);cursor:pointer;box-shadow:0 0 0 2px rgba(200,162,76,.3),0 10px 22px -10px rgba(0,0,0,.4)}
:root .onb-cta,[data-theme="light"] .onb-cta{--bink:#FFFCF7}
[data-theme="dark"] .onb-cta{--bink:#3A1020}
.onb-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;
  padding-top:14px;border-top:1px solid var(--line)}
.onb-dots{display:flex;gap:6px}
.onb-dots i{width:6px;height:6px;border-radius:50%;background:var(--line)}
.onb-dots i.on{background:var(--gold-gilt);width:18px;border-radius:3px}
.onb-back{background:transparent;border:none;color:var(--text-soft);font-family:inherit;font-weight:700;font-size:.84rem;cursor:pointer;padding:8px 6px}
.onb-next{border:none;border-radius:12px;padding:11px 22px;font-family:inherit;font-weight:800;font-size:.9rem;
  background:var(--brand);color:var(--bink,#FFFCF7);cursor:pointer;box-shadow:0 0 0 2px rgba(200,162,76,.28)}
:root .onb-next,[data-theme="light"] .onb-next{--bink:#FFFCF7}
[data-theme="dark"] .onb-next{--bink:#3A1020}
/* secondary (ex. "Mai tarziu" pe pasul ritual) — nu concureaza cu CTA-ul */
.onb-next.secondary{background:transparent;color:var(--text-soft);box-shadow:none;border:1px solid var(--line);font-weight:700}
@media (prefers-reduced-motion: reduce){ .onb-card{animation:none} }
`;
    document.head.appendChild(s);
  }

  function buildOverlay(){
    if(document.getElementById('onbOverlay')) return;
    const o=document.createElement('div');
    o.id='onbOverlay'; o.className='onb'; o.setAttribute('aria-hidden','true');
    o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Mi Día');
    o.innerHTML =
      '<div class="onb-card" role="document">'+
        '<button class="onb-skip" id="onbSkip" type="button"></button>'+
        '<div class="onb-body" id="onbBody"></div>'+
        '<div class="onb-foot">'+
          '<button class="onb-back" id="onbBack" type="button"></button>'+
          '<div class="onb-dots" id="onbDots"></div>'+
          '<button class="onb-next" id="onbNext" type="button"></button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(o);
    o.querySelector('#onbSkip').onclick = ()=> finish();
    o.querySelector('#onbNext').onclick = ()=> next();
    o.querySelector('#onbBack').onclick = ()=> back();
    o.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ e.preventDefault(); finish(); } });
  }

  function maybeRun(){ if(!userOnboarded){ try{ open(); }catch(e){ console.warn('Onboard failed', e); } } }
  function start(){ open(); }

  return { maybeRun, start };
})();
