/* =====================================================================
   MODUL ONBOARDING GHIDAT — sursa curata, oglinda a blocului inlinat in
   mi-dia-vNN.html (ca cycle.js / ritual.js / persist.js).
   INLINAT in IIFE-ul principal -> foloseste host-globals: lang, t(), esc(),
   saveSettings(), applyI18n(), renderLangBar(), renderIdentStrip(),
   userIdentity, userOnboarded (le si SCRIE), Ritual (openCreate).
   ===================================================================== */
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
             (lang==='es'?'':'<div class="onb-tr">'+esc(t('onb_es_tr'))+'</div>')+'</div>'+
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
  border:1px solid var(--line);border-radius:var(--r-xl,26px);box-shadow:0 30px 70px -28px rgba(0,0,0,.7);
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
.onb-dc{font-style:normal;font-weight:600;font-size:1.4em;color:var(--gold-gilt)} /* v168: solid gilt, no background-clip:text (era taiat — vezi .phrase-dc) */
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
