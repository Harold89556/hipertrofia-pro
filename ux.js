/* Hipertrofia Pro · v56 — pantallas despejadas: cada sección, comida, extra y ejercicio es un botón que se abre al tocarlo
   y cierra el anterior (acordeón exclusivo). Objetivos de la dieta siempre visibles arriba, en porcentajes y sin barras. */
(function () {
  'use strict';
  const LT = {
    es: { sum: 'Resumen del día', water: 'Agua', meals: 'Comidas del día', left: 'Te faltan {k} kcal', over: 'Pasaste {k} kcal', done: '{d}/{n} cumplidas',
      kcal: 'Kcal', p: 'Prot', c: 'Carb', f: 'Grasa', w: 'Agua', det: 'Tocá para ver gramos', hide: 'Tocá para ocultar', items: '{n} registrados', series: '{n} series',
      last: 'Último: {d} · {w} kg × {r}', lastBw: 'Último: {d} · {x}', wuBw: 'peso corporal: sin lastre, reps fáciles', wuB1: 'Sin lastre · 8-10 reps fáciles', wuB2: 'Sin lastre · 4-5 reps, rango completo', coach: 'Coach de voz', on: 'Activado', off: 'Desactivado', warm: 'Calentamiento', phases: '{n} fases', block: 'Bloque combinado',
      goals: 'Objetivos del día', wuEx: 'Ejercicio:', wuWork: 'carga de trabajo {w} kg', wuFirst: 'Hacelas con el primer ejercicio del día', wuPct: '{p}% de tu carga', topT: 'Tus objetivos y categoría', next: 'Próxima: {m}', noHist: 'Sin registros guardados.', rest: 'Descanso', open: 'Abrir', close: 'Cerrar' },
    en: { sum: 'Day summary', water: 'Water', meals: "Day's meals", left: '{k} kcal to go', over: '{k} kcal over', done: '{d}/{n} done',
      kcal: 'Kcal', p: 'Prot', c: 'Carb', f: 'Fat', w: 'Water', det: 'Tap to see grams', hide: 'Tap to hide', items: '{n} logged', series: '{n} sets',
      last: 'Last: {d} · {w} kg × {r}', lastBw: 'Last: {d} · {x}', wuBw: 'bodyweight: no added weight, easy reps', wuB1: 'No added weight · 8-10 easy reps', wuB2: 'No added weight · 4-5 reps, full range', coach: 'Voice coach', on: 'On', off: 'Off', warm: 'Warm-up', phases: '{n} phases', block: 'Combined block',
      goals: 'Daily goals', wuEx: 'Exercise:', wuWork: 'working load {w} kg', wuFirst: "Do them on the day's first exercise", wuPct: '{p}% of your load', topT: 'Your targets and category', next: 'Next: {m}', noHist: 'No saved records.', rest: 'Rest', open: 'Open', close: 'Close' },
    pt: { sum: 'Resumo do dia', water: 'Água', meals: 'Refeições do dia', left: 'Faltam {k} kcal', over: 'Passou {k} kcal', done: '{d}/{n} feitas',
      kcal: 'Kcal', p: 'Prot', c: 'Carb', f: 'Gord', w: 'Água', det: 'Toque para ver gramas', hide: 'Toque para ocultar', items: '{n} registrados', series: '{n} séries',
      last: 'Último: {d} · {w} kg × {r}', lastBw: 'Último: {d} · {x}', wuBw: 'peso corporal: sem carga extra, reps fáceis', wuB1: 'Sem carga extra · 8-10 reps fáceis', wuB2: 'Sem carga extra · 4-5 reps, amplitude completa', coach: 'Coach de voz', on: 'Ativado', off: 'Desativado', warm: 'Aquecimento', phases: '{n} fases', block: 'Bloco combinado',
      goals: 'Metas do dia', wuEx: 'Exercício:', wuWork: 'carga de trabalho {w} kg', wuFirst: 'Faça no primeiro exercício do dia', wuPct: '{p}% da sua carga', topT: 'Suas metas e categoria', next: 'Próxima: {m}', noHist: 'Sem registros salvos.', rest: 'Descanso', open: 'Abrir', close: 'Fechar' }
  };
  const lang = () => (typeof LANG !== 'undefined' && LT[LANG]) ? LANG : 'es';
  const L = (k, o) => { let s = LT[lang()][k] || LT.es[k] || k; if (o) Object.keys(o).forEach(x => { s = s.split('{' + x + '}').join(o[x]); }); return s; };
  const N = (v, d) => { try { return typeof fmtN === 'function' ? fmtN(v, d) : String(v); } catch (e) { return String(v); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = el => el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  window.uxT = L;
  // ---------- estilos ----------
  const CSS = `
  .ux-sec{position:relative}
  .ux-sec.ux-closed > :not(.ux-h){display:none!important}
  .ux-t0{display:none!important}
  .ux-h{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;min-height:58px;padding:10px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:inherit;font-family:inherit;color:var(--text)}
  .ux-h:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .ux-h:active{background:rgba(255,255,255,.045)}
  .ux-i{flex:none;width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.06);display:grid;place-items:center;font-size:1.05rem;line-height:1}
  .ux-i .ux-num{font-style:normal;font-weight:800;font-size:.95rem;color:var(--text-muted)}
  .ux-i .ux-time{font-style:normal;font-weight:800;font-size:.7rem;letter-spacing:-.02em;color:var(--text)}
  .ux-tt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;text-align:left}
  .ux-tt b{font-size:.98rem;font-weight:700;line-height:1.25;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .ux-tt small{font-size:.78rem;line-height:1.3;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ux-bd{flex:none;font-size:.76rem;font-weight:800;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text-muted);white-space:nowrap}
  .ux-bd.ok{background:rgba(16,185,129,.16);color:#34d399}
  .ux-bd.mid{background:rgba(255,107,26,.16);color:var(--orange-light)}
  .ux-bd.rest{background:rgba(99,102,241,.18);color:#a5b4fc}
  .ux-cv{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:.85rem;color:var(--text-muted);background:rgba(255,255,255,.05);transition:transform .22s ease,color .2s,background .2s}
  .ux-open > .ux-h .ux-cv{transform:rotate(90deg);color:#fff;background:var(--accent)}
  .ux-open > .ux-h .ux-tt b{color:var(--accent)}
  .ux-open > .ux-h{border-bottom:1px solid rgba(255,255,255,.07);border-bottom-left-radius:0;border-bottom-right-radius:0;margin-bottom:12px}
  /* secciones creadas (Dieta) */
  .ux-wrap{background:var(--surface-elevated);border:1px solid var(--border);border-radius:16px;margin:0 0 10px;transition:border-color .2s,box-shadow .2s}
  .ux-wrap > .ux-b{padding:0 14px 14px}
  .ux-sec.ux-open{border-color:rgba(255,107,26,.6)!important;box-shadow:0 0 0 1px rgba(255,107,26,.18),0 10px 26px -14px rgba(255,107,26,.45)!important}
  /* tarjetas existentes plegadas */
  .exercise-card.ux-card,.warmup-box.ux-card{padding:0 16px!important;margin-bottom:10px!important;transition:border-color .2s,box-shadow .2s}
  .exercise-card.ux-card.ux-open,.warmup-box.ux-card.ux-open{padding-bottom:16px!important}
  .ux-card > .ux-h{margin-left:-16px;margin-right:-16px;width:calc(100% + 32px)}
  .ux-card.ux-closed{box-shadow:none}
  .ss-block.ux-card{padding:0 10px!important;margin-bottom:10px!important}
  .ss-block.ux-card > .ux-h{margin-left:-10px;margin-right:-10px;width:calc(100% + 20px)}
  .ss-block.ux-card.ux-open{padding-bottom:10px!important}
  .exercise-card.ux-card.card-completed.ux-closed{border-color:rgba(16,185,129,.45)}
  .exercise-card.ux-card > .exercise-title{display:none}
  .ss-block.ux-card > .ss-head > b{display:none}
  .ux-wu-ex{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:10px 0 8px;padding:10px 12px;border-radius:12px;background:rgba(255,107,26,.08);border:1px solid rgba(255,107,26,.3)}
  .ux-wu-ex b{color:var(--text);font-size:.95rem}
  .ux-wu-ex small{color:var(--text-muted);font-size:.78rem;flex-basis:100%}
  .ux-wu-l{color:var(--orange-light);font-weight:700;font-size:.82rem}
  #warmup-row-1 td:first-child,#warmup-row-2 td:first-child{white-space:nowrap;line-height:1.2}
  .ux-wu-s{display:block;color:var(--accent);font-weight:800}
  .ux-wu-p{display:block;font-size:.72rem;font-weight:700;color:var(--orange-light);white-space:normal}
  #warmup-row-1 td,#warmup-row-2 td,#warmup-row-1 ~ tr td,.warmup-phase-card thead th{padding-left:4px!important;padding-right:4px!important}
  .warmup-phase-card thead th{font-size:.72rem}
  #wu-btn-1,#wu-btn-2{padding:10px 10px!important;font-size:.82rem!important;min-width:0!important;white-space:nowrap}
  #warmup-row-1 td:nth-child(2),#warmup-row-2 td:nth-child(2),#warmup-row-1 td:nth-child(3),#warmup-row-2 td:nth-child(3){width:64px}
  #wu-r-1,#wu-r-2,#wu-w-1,#wu-w-2{min-width:58px;width:62px!important;text-align:center;padding-left:4px!important;padding-right:4px!important;box-sizing:border-box}
  .ss-rounds td{padding-left:3px!important;padding-right:3px!important}
  .ss-rounds td:first-child{max-width:74px}
  .ss-row td:first-child small{max-width:70px!important}
  .ss-rounds input[id^="w_"],.ss-rounds input[id^="r_"]{width:100%;min-width:52px;max-width:72px;padding-left:4px!important;padding-right:4px!important;text-align:center;box-sizing:border-box}
  .ss-row button[id^="btn_"]{min-width:0!important;padding:10px 9px!important;font-size:.8rem!important;white-space:nowrap}
  .ss-block .sets-table-wrapper{overflow-x:visible}
  #exercises-container .set-row td{padding-left:4px!important;padding-right:4px!important}
  #exercises-container .set-row input[id^="w_"],#exercises-container .set-row input[id^="r_"]{min-width:60px;padding-left:6px!important;padding-right:6px!important;text-align:center;box-sizing:border-box}
  #exercises-container .set-row button[id^="btn_"]{white-space:nowrap;padding-left:10px!important;padding-right:10px!important;min-width:0}
  #workout-tab > .plan-card > .ux-h small{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25}
  #ux-top{margin:0 0 14px}
  #ux-top > .ux-b{padding:0 10px 12px}
  #ux-top .nutrition-banner{margin:0 0 12px}
  body.compact-header #ux-top{display:none!important}
  /* comidas */
  .meal.ux-card{padding:0 12px!important;margin:0 0 8px!important;border-radius:14px}
  .meal.ux-card > .ux-h{margin-left:-12px;margin-right:-12px;width:calc(100% + 24px);min-height:56px}
  .meal.ux-card.ux-open{padding-bottom:12px!important}
  .meal.ux-card .meal-head strong{display:none}
  .meal.ux-card .meal-head{margin-bottom:6px}
  .meal-skip.ux-closed{opacity:.7}
  .ux-dmeals > .ux-b > .pc-note{margin-top:10px}
  .ux-plain{background:none!important;border:0!important;padding:0!important;box-shadow:none!important;margin-bottom:0!important}
  .ux-plain > h2.pc-title{display:none}
  .ux-plain #diet-content{padding-bottom:0}
  #diet-tab{padding-bottom:calc(110px + env(safe-area-inset-bottom))}
  /* extras: botón compacto */
  li.ux-x{cursor:pointer;min-height:52px;flex-wrap:wrap;-webkit-tap-highlight-color:transparent;transition:border-color .2s,background .2s}
  li.ux-x.ux-closed .dl-time-i,li.ux-x.ux-closed .dlr-ch,li.ux-x.ux-closed .dlr-x,li.ux-x.ux-closed .wt-q{display:none!important}
  li.ux-x .dlr-t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  li.ux-x::after{content:'▸';flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.8rem;color:var(--text-muted);background:rgba(255,255,255,.05);transition:transform .2s;order:3}
  li.ux-x .dlr-x{order:4}
  li.ux-x.ux-open{border-color:rgba(255,107,26,.6);background:rgba(255,107,26,.06)}
  li.ux-x.ux-open::after{transform:rotate(90deg);background:var(--accent);color:#fff}
  li.ux-x:focus-visible{outline:2px solid var(--accent)}
  /* tira de objetivos (siempre arriba, sin barras) */
  .ux-goals{position:sticky;top:max(4px,env(safe-area-inset-top));z-index:70;margin:0 0 12px;padding:8px 8px 6px;border-radius:16px;background:rgba(14,14,17,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid var(--border);box-shadow:0 8px 20px -12px rgba(0,0,0,.8);cursor:pointer;-webkit-tap-highlight-color:transparent}
  .ux-gr{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:6px}
  .ux-gc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:50px;padding:4px 2px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05)}
  .ux-gc b{font-size:1.08rem;font-weight:800;line-height:1.1;color:var(--text);font-variant-numeric:tabular-nums}
  .ux-gc span{font-size:.66rem;font-weight:700;color:var(--text-muted);white-space:nowrap}
  .ux-gc small{display:none;font-size:.62rem;color:var(--text-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
  .ux-goals.det .ux-gc small{display:block}
  .ux-gc.mid b{color:var(--orange-light)}
  .ux-gc.ok b{color:#34d399}
  .ux-gc.hi b{color:#f87171}
  .ux-gtip{text-align:center;font-size:.62rem;color:var(--text-muted);opacity:.7;margin-top:4px}
  /* <details> que ya eran tarjetas */
  details.ux-det{padding:0 16px!important;margin-bottom:10px!important}
  details.ux-det > summary{min-height:58px;display:flex;align-items:center;list-style:none;cursor:pointer;margin:0}
  details.ux-det > summary::-webkit-details-marker{display:none}
  details.ux-det > summary{gap:12px;padding:10px 14px;margin:0 -16px!important;font-size:inherit;color:var(--text)}
  details.ux-det > summary::after{display:none!important}
  details.ux-det[open] > summary{border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:12px!important}
  details.ux-det[open] > summary .ux-cv{transform:rotate(90deg);background:var(--accent);color:#fff}
  details.ux-det[open] > summary .ux-tt b{color:var(--accent)}
  details.ux-det[open]{padding-bottom:16px!important;border-color:rgba(255,107,26,.6)}
  /* historial de cargas agrupado por ejercicio */
  .wh-list{display:flex;flex-direction:column;gap:8px}
  .wh-ex{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:14px}
  .wh-ex > .ux-b{padding:0 12px 12px}
  .wh-day{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}
  .wh-day:first-child{border-top:0}
  .wh-day > b{flex:1 0 100%;font-size:.8rem;color:var(--text-muted);font-weight:700}
  .wh-set{font-size:.8rem;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.06);white-space:nowrap}
  .wh-set em{font-style:normal;color:var(--text-muted);margin-right:4px}
  .wh-empty{color:var(--text-muted);text-align:center;padding:14px 0}
  `;
  (function () { const st = document.createElement('style'); st.id = 'ux-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); })();

  // ---------- estado: qué está abierto en cada grupo (sobrevive a los re-render) ----------
  let S = {}; try { S = JSON.parse(sessionStorage.getItem('hp_ux_open') || '{}') || {}; } catch (e) { S = {}; }
  const save = () => { try { sessionStorage.setItem('hp_ux_open', JSON.stringify(S)); } catch (e) {} };
  window.uxIsOpen = (g, k) => S[g] === k;
  let busy = false; // mientras aplicamos cambios propios no reaccionamos al observer

  function head(icon, title, meta, badge, bcls) {
    return `<span class="ux-i" aria-hidden="true">${icon || '•'}</span><span class="ux-tt"><b>${title}</b>${meta ? `<small>${meta}</small>` : ''}</span>${badge ? `<span class="ux-bd${bcls ? ' ' + bcls : ''}">${badge}</span>` : ''}<span class="ux-cv" aria-hidden="true">▸</span>`;
  }
  function setHead(item, html) {
    let h = item.firstElementChild;
    if (!h || !h.classList.contains('ux-h')) {
      h = document.createElement('button'); h.type = 'button'; h.className = 'ux-h';
      item.insertBefore(h, item.firstChild);
    }
    if (h._html !== html) { h.innerHTML = html; h._html = html; }
    const open = item.classList.contains('ux-open');
    if (h.getAttribute('aria-expanded') !== String(open)) h.setAttribute('aria-expanded', String(open));
    return h;
  }
  // marca un elemento como ítem del grupo g con clave k y aplica el estado guardado
  function mark(item, g, k, extraCls) {
    if (item.dataset.uxg !== g) item.dataset.uxg = g;
    if (item.dataset.uxk !== k) item.dataset.uxk = k;
    const want = S[g] === k;
    if (!item.classList.contains('ux-sec')) item.classList.add('ux-sec');
    if (extraCls && !item.classList.contains(extraCls)) item.classList.add(extraCls);
    if (item.classList.contains('ux-open') !== want) item.classList.toggle('ux-open', want);
    if (item.classList.contains('ux-closed') === want) item.classList.toggle('ux-closed', !want);
  }
  const OFFSET = () => { const g = $('#ux-goals'); const act = $('.tab-content.active'); return (g && act && act.id === 'diet-tab' ? g.offsetHeight + 14 : 10); };
  function keepVisible(item) {
    const h = item.querySelector(':scope > .ux-h') || item; const r = h.getBoundingClientRect();
    const off = OFFSET(), vh = window.innerHeight;
    if (r.top < off || r.top > vh * 0.55) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - off), behavior: 'smooth' });
  }
  function setOpen(item, open, opts) {
    const g = item.dataset.uxg, k = item.dataset.uxk; if (!g) return;
    busy = true;
    if (g === 'ex' && window.hpTechStop) { try { window.hpTechStop(); } catch (e) {} } // al cambiar de ejercicio se corta la técnica; abrir nunca la reproduce
    if (open) {
      $$(`[data-uxg="${g}"].ux-open`).forEach(o => { if (o !== item) { o.classList.remove('ux-open'); o.classList.add('ux-closed'); const hh = o.querySelector(':scope > .ux-h'); if (hh) hh.setAttribute('aria-expanded', 'false'); } });
      $$(`details[data-uxg="${g}"][open]`).forEach(o => { if (o !== item) o.open = false; });
      S[g] = k; item.classList.add('ux-open'); item.classList.remove('ux-closed');
    } else {
      if (S[g] === k) delete S[g]; item.classList.remove('ux-open'); item.classList.add('ux-closed');
    }
    const hh = item.querySelector(':scope > .ux-h'); if (hh) hh.setAttribute('aria-expanded', String(open));
    save(); busy = false;
    if (open && k === 'top' && g === 'wtop') setTimeout(centerCat, 30);
    if (open && !(opts && opts.noScroll)) requestAnimationFrame(() => requestAnimationFrame(() => keepVisible(item)));
  }
  window.uxReveal = function (el) { // abre las secciones que contienen a el (para avisos que llevan a un campo)
    let p = el && el.parentElement; const chain = [];
    while (p && p !== document.body) { if (p.dataset && p.dataset.uxg && !p.classList.contains('ux-open')) chain.unshift(p); p = p.parentElement; }
    chain.forEach(x => setOpen(x, true, { noScroll: true }));
  };

  document.addEventListener('click', e => {
    const h = e.target.closest('.ux-h');
    if (h && h.parentElement && h.parentElement.dataset.uxg) { e.preventDefault(); const it = h.parentElement; setOpen(it, !it.classList.contains('ux-open')); return; }
    const x = e.target.closest('li.ux-x');
    if (x && !e.target.closest('input,button,select,a,label,textarea')) { setOpen(x, !x.classList.contains('ux-open')); }
    const gs = e.target.closest('#ux-goals');
    if (gs) { const on = !gs.classList.contains('det'); gs.classList.toggle('det', on); gs.setAttribute('aria-expanded', String(on)); try { localStorage.setItem('hp_ux_goaldet', on ? '1' : ''); } catch (er) {} const tip = gs.querySelector('.ux-gtip'); if (tip) tip.textContent = on ? L('hide') : L('det'); }
  });
  document.addEventListener('keydown', e => { const x = e.target.closest && e.target.closest('li.ux-x, #ux-goals'); if (x && (e.key === 'Enter' || e.key === ' ') && e.target === x) { e.preventDefault(); x.click(); } });
  // <details> hermanos: abrir uno cierra los demás (guía, ayudas, admin, formularios)
  document.addEventListener('toggle', e => {
    const d = e.target; if (!d || d.tagName !== 'DETAILS' || !d.open || !d.parentElement) return;
    Array.from(d.parentElement.children).forEach(s => { if (s !== d && s.tagName === 'DETAILS' && s.open && !s.hasAttribute('data-ux-multi')) s.open = false; });
    if (d.dataset.uxg) { const g = d.dataset.uxg; $$(`[data-uxg="${g}"]`).forEach(o => { if (o !== d) { if (o.tagName === 'DETAILS') o.open = false; else if (o.classList.contains('ux-open')) setOpen(o, false); } }); }
  }, true);

  // ---------- Dieta ----------
  // dlBar ya no dibuja barras en el resumen: guardamos los números para la tira de porcentajes
  let goals = [];
  if (typeof window.dlBar === 'function') {
    const ob = window.dlBar;
    window.dlBar = function (label, v, tgt, unit) { goals.push({ v: Number(v) || 0, tgt: Number(tgt) || 0, unit }); return ob.apply(this, arguments); };
  }
  if (typeof window.renderDiet === 'function') {
    const orD = window.renderDiet;
    window.renderDiet = function () { goals = []; const r = orD.apply(this, arguments); try { diet(true); } catch (e) { console.warn('ux diet', e); } return r; };
  }
  let lastGoals = null;
  function strip() {
    const tab = $('#diet-tab'); if (!tab) return;
    const mac = goals.filter(x => x.unit !== 'ml').slice(0, 4), wat = goals.find(x => x.unit === 'ml');
    if (mac.length === 4) lastGoals = { mac, wat };
    if (!lastGoals) return;
    let g = $('#ux-goals');
    if (!g) { g = document.createElement('div'); g.id = 'ux-goals'; g.className = 'ux-goals'; g.setAttribute('role', 'button'); g.tabIndex = 0; tab.insertBefore(g, tab.firstChild); }
    const dbar = $('#dl-daybar'); if (dbar && dbar.parentNode === tab && dbar.nextSibling !== g) tab.insertBefore(g, dbar.nextSibling); // v61: el selector de día va arriba de los objetivos
    const det = (function () { try { return !!localStorage.getItem('hp_ux_goaldet'); } catch (e) { return false; } })();
    const cells = [['kcal', '🔥', lastGoals.mac[0], 'kcal'], ['p', '🥩', lastGoals.mac[1], 'g'], ['c', '🍚', lastGoals.mac[2], 'g'], ['f', '🥑', lastGoals.mac[3], 'g']];
    if (lastGoals.wat) cells.push(['w', '💧', lastGoals.wat, 'ml']);
    const html = `<div class="ux-gr">${cells.map(([k, ic, x, u]) => {
      const pc = x.tgt > 0 ? Math.round(x.v / x.tgt * 100) : 0; const cl = pc > 110 ? 'hi' : pc >= 90 ? 'ok' : pc >= 50 ? 'mid' : '';
      const vv = u === 'ml' ? N(Math.round(x.v / 100) / 10, 1) + '/' + N(Math.round(x.tgt / 100) / 10, 1) + ' L' : N(Math.round(x.v)) + '/' + N(Math.round(x.tgt)) + (u === 'g' ? ' g' : '');
      return `<div class="ux-gc ${cl}"><b>${pc}%</b><span>${ic} ${L(k)}</span><small>${vv}</small></div>`;
    }).join('')}</div><div class="ux-gtip">${det ? L('hide') : L('det')}</div>`;
    if (g._html !== html) { g.innerHTML = html; g._html = html; }
    g.classList.toggle('det', det); g.setAttribute('aria-expanded', String(det)); g.setAttribute('aria-label', L('goals'));
  }
  function wrap(parent, before, nodes, g, k, cls) {
    nodes = nodes.filter(Boolean); if (!nodes.length) return null;
    const sec = document.createElement('div'); sec.className = 'ux-sec ux-wrap' + (cls ? ' ' + cls : '');
    const body = document.createElement('div'); body.className = 'ux-b';
    parent.insertBefore(sec, before || nodes[0]);
    nodes.forEach(n => body.appendChild(n)); sec.appendChild(body);
    mark(sec, g, k); return sec;
  }
  function diet(fresh) {
    const box = $('#diet-content'); if (!box) return;
    if (fresh) strip();
    const prog = $(':scope > .dl-progress:not(.dl-ai)', box);
    if (prog) { // primera pasada después de renderDiet: armamos las secciones
      const card = box.parentElement; if (card && !card.classList.contains('ux-plain')) card.classList.add('ux-plain');
      const kids = Array.from(prog.children);
      const h3 = prog.querySelector(':scope > h3'); const restB = h3 && h3.querySelector('.rest-badge');
      kids.filter(n => n.classList.contains('dl-bar')).forEach(n => n.remove()); // sin barras: los % están arriba
      const wt = prog.querySelector(':scope > .wt-box'); if (wt) { const wb = wt.querySelector(':scope > .dl-bar'); if (wb) wb.remove(); }
      const xh = kids.find(n => n.tagName === 'H4'), xul = xh && xh.nextElementSibling, xtot = xul && xul.nextElementSibling;
      const sumEl = prog.querySelector(':scope > .dl-sum');
      const sumNodes = kids.filter(n => n.isConnected && n !== wt && n !== xh && n !== xul && n !== xtot && !n.classList.contains('dl-bar'));
      const ai = $(':scope > .dl-ai', box), folds = $$(':scope > details.dp-fold', box), meals = $$(':scope > .meal', box);
      const after = meals.length ? meals[meals.length - 1] : null; const tail = []; let n = after && after.nextElementSibling; while (n) { tail.push(n); n = n.nextElementSibling; }
      // Resumen
      if (h3) h3.classList.add('ux-t0');
      const left = sumEl ? txt(sumEl.querySelector('b')) : '';
      const sSum = wrap(box, prog, sumNodes, 'diet', 'sum', 'ux-dsum');
      if (sSum) setHead(sSum, head('📊', esc(L('sum')), left ? esc(txt(sumEl).split('—')[0]) : '', restB ? '😴 ' + esc(L('rest')) : '', 'rest'));
      // Agua
      if (wt) {
        const w = lastGoals && lastGoals.wat; const pc = w && w.tgt ? Math.round(w.v / w.tgt * 100) : 0;
        const s = wrap(box, prog, [wt], 'diet', 'water');
        setHead(s, head('💧', esc(L('water')), w ? `${N(Math.round(w.v))} / ${N(Math.round(w.tgt))} ml` : '', pc + '%', pc >= 90 ? 'ok' : ''));
      }
      // Comidas
      if (meals.length) {
        const dn = meals.filter(m => m.classList.contains('meal-done') || m.classList.contains('meal-ate')).length;
        const totK = meals.reduce((a, m) => { const mm = /([\d.,]+)\s*kcal/.exec(txt(m.querySelector('.meal-head small'))); return a + (mm ? parseFloat(mm[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) || 0 : 0); }, 0);
        const s = wrap(box, prog, meals.concat(tail), 'diet', 'meals', 'ux-dmeals');
        const nx = meals.find(m => m.classList.contains('meal-pend')); const nxT = nx && nx.querySelector('input[type="time"]');
        const meta = nx ? L('next', { m: txt(nx.querySelector('.meal-head strong')) + (nxT && nxT.value ? ' · ' + nxT.value : '') }) : `${N(Math.round(totK))} kcal`;
        setHead(s, head('🍳', esc(L('meals')), esc(meta), L('done', { d: dn, n: meals.length }), dn === meals.length ? 'ok' : ''));
      }
      // Registrar lo que comí
      if (ai) {
        const t3 = ai.querySelector(':scope > h3, :scope > h4, :scope > b'); if (t3) t3.classList.add('ux-t0');
        const tt = t3 ? txt(t3) : '🍽️ Registrar lo que comí'; const m = /^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u.exec(tt);
        const s = wrap(box, prog, [ai], 'diet', 'log');
        setHead(s, head(m ? m[1] : '🍽️', esc(m ? m[2] : tt), '', ''));
      }
      // Extras
      if (xh && xul) {
        const lis = $$(':scope > li.dlr', xul); const kk = xtot ? txt(xtot.querySelector('.dlr-k')) : '';
        const tt = txt(xh); const m = /^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u.exec(tt);
        xh.classList.add('ux-t0');
        const s = wrap(box, prog, [xh, xul, xtot], 'diet', 'extras');
        setHead(s, head(m ? m[1] : '➕', esc(m ? m[2] : tt), L('items', { n: lis.length }), esc(kk)));
      }
      // Alarmas / Cómo se calculó
      folds.forEach((d, i) => {
        const sm = d.querySelector(':scope > summary'); const raw = sm ? sm.innerHTML : ''; const tt = txt(sm);
        const m = /^(\p{Extended_Pictographic}\uFE0F?)\s*/u.exec(tt);
        const body = Array.from(d.children).filter(c => c !== sm);
        const s = wrap(box, d, body, 'diet', 'fold' + i); d.remove();
        const cnt = sm && sm.querySelector('.dp-count');
        setHead(s, head(m ? m[1] : 'ℹ️', esc(tt.replace(m ? m[0] : '', '').replace(cnt ? txt(cnt) : '\u0000', '').trim()), '', cnt ? esc(txt(cnt)) : ''));
        void raw;
      });
      prog.remove();
      // orden: Resumen, Agua, Comidas, Registrar, Extras, Alarmas, Cómo
      ['sum', 'water', 'meals', 'log', 'extras', 'fold0', 'fold1'].map(k => $(`:scope > [data-uxk="${k}"]`, box)).filter(Boolean).forEach(s => box.appendChild(s));
      $$(':scope > :not(.ux-sec)', box).forEach(x => box.appendChild(x));
    }
    // comidas: cada una es un botón
    $$('.meal', box).forEach(m => {
      const ti = m.querySelector('[onchange*="dlSetMealTime"]'); const mk = ti ? (/dlSetMealTime\('([^']+)'/.exec(ti.getAttribute('onchange')) || [])[1] : null; if (!mk) return;
      mark(m, 'meal', mk, 'ux-card');
      const st = m.classList.contains('meal-done') ? '✅' : m.classList.contains('meal-skip') ? '⏭️' : m.classList.contains('meal-ate') ? '🍽️' : '🕐';
      const nm = txt(m.querySelector('.meal-head strong')).replace(/^(✅|⏭️|🍽️)\s*/u, '');
      const km = /^([^·]+kcal)/.exec(txt(m.querySelector('.meal-head small'))); const tv = ti.value;
      const bd = st === '✅' ? '✅' : st === '⏭️' ? '⏭️' : st === '🍽️' ? '🍽️' : '';
      setHead(m, head(tv ? `<em class="ux-time">${esc(tv)}</em>` : st, esc(nm), km ? esc(km[1].trim()) : '', bd, st === '✅' ? 'ok' : ''));
    });
    // extras: botón compacto (nombre, cantidad, kcal); al tocar muestra hora, macros y borrar
    $$('li.dlr', box).forEach(li => {
      const x = li.querySelector('.dlr-x'); const id = x ? (/dlExtraDel\('([^']+)'/.exec(x.getAttribute('onclick') || '') || [])[1] : null; if (!id) return;
      const g = li.closest('.meal') ? 'xm' : 'xtra';
      if (li.dataset.uxg !== g) { li.dataset.uxg = g; li.dataset.uxk = id; li.classList.add('ux-x'); li.tabIndex = 0; li.setAttribute('role', 'button'); }
      const want = S[g] === id; if (li.classList.contains('ux-open') !== want) li.classList.toggle('ux-open', want); if (li.classList.contains('ux-closed') === want) li.classList.toggle('ux-closed', !want);
      if (li.getAttribute('aria-expanded') !== String(want)) li.setAttribute('aria-expanded', String(want));
    });
    // tarjetas de afuera: dieta adaptativa, comida local y compras, suplementos
    const tab = $('#diet-tab');
    if (tab) $$(':scope > .exercise-card', tab).forEach(c => {
      if (c.contains(box)) return;
      foldCard(c, 'diet', c.id || ('c' + (c.querySelector('#supp-content') ? 'supp' : txt(c.querySelector('h2')).slice(0, 12))), metaFor(c));
    });
  }
  function metaFor(c) {
    if (c.id === 'diet-adapt') { const i = c.querySelector('#ad-on'); return { badge: i ? (i.checked ? L('on') : L('off')) : '', bcls: i && i.checked ? 'ok' : '' }; }
    if (c.id === 'diet-py') { const b = c.querySelector('.py-tot b'); return { meta: b ? txt(b) : '' }; }
    if (c.id === 'voice-card') { const b = c.querySelector('#voice-set-tg'); const on = b && !/🔇/.test(txt(b)); return { title: '🎙️ ' + L('coach'), badge: on ? L('on') : L('off'), bcls: on ? 'ok' : '' }; }
    if (c.id === 'fuel-card') { const n = c.querySelector('#fuel-note'); return { title: '🍌 ' + txt(c.querySelector('.fuel-head b, .fuel-head strong, .fuel-head h3') || c.querySelector('.fuel-head')).split(/(?<=entreno|workout|treino)/i)[0], meta: n ? txt(n).split(/[.!]/)[0] : '' }; }
    if (c.id === 'ready-card') { const r = c.querySelector('.rd-res'); const m = r ? /^([^:.]+)/.exec(txt(r)) : null; return { meta: m ? m[1] : '' }; }
    if (c.id === 'warmup-section') { const n = c.querySelectorAll('.warmup-phase-card').length; return { title: '⚡ ' + txt(c.querySelector('.warmup-header-title')), meta: n ? L('phases', { n }) : '' }; }
    if (c.classList.contains('plan-card') && c.querySelector('#plan-controls')) { const ch = c.querySelector('.chips .on, .chips .active, .chips [aria-pressed="true"]'); const ps = c.querySelector('#phase-select'); const cy = typeof window.hpCycleMeta === 'function' ? window.hpCycleMeta() : ''; return { meta: cy || [ch ? txt(ch) : '', ps && ps.selectedOptions[0] ? txt(ps.selectedOptions[0]) : ''].filter(Boolean).join(' · ') }; }
    return {};
  }
  // tarjeta existente → botón plegable (sin mover nada: lo de adentro se oculta con CSS)
  function foldCard(c, g, k, o) {
    o = o || {};
    if (c.tagName === 'DETAILS') { // tarjetas que ya eran <details>: solo participan del grupo exclusivo
      if (c.dataset.uxg !== g) { c.dataset.uxg = g; c.dataset.uxk = k; c.classList.add('ux-det'); }
      const sm = c.querySelector(':scope > summary');
      if (sm && !sm.querySelector('.ux-tt')) { const tt = txt(sm); const m = ICRX.exec(tt); sm.innerHTML = head(m ? m[1] : ICON[g] || '•', esc(m ? m[2] : tt), esc(o.meta || ''), ''); }
      return;
    }
    const t0 = c.querySelector(':scope > h2, :scope > h3, :scope > .pc-title, :scope > .warmup-header, :scope > .fuel-head, :scope > div > h2.pc-title, :scope > .vc-row > div:first-child');
    let title = o.title || (t0 ? txt(t0.matches('.fuel-head') ? (t0.querySelector('b,strong,h3,span') || t0) : t0) : '');
    if (t0 && t0.matches('.pc-title') && t0.querySelector('small')) title = txt(t0.childNodes[0]) || title;
    if (!title) return;
    if (t0 && !t0.classList.contains('ux-t0')) t0.classList.add('ux-t0');
    mark(c, g, k, 'ux-card');
    const m = ICRX.exec(title);
    setHead(c, head(m ? m[1] : ICON[g] || '•', esc(m ? m[2] : title), esc(o.meta || ''), esc(o.badge || ''), o.bcls));
  }
  const ICRX = /^((?:\p{Regional_Indicator}{2})|\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)?)\s*(.*)$/u;
  const ICON = { 'workout-history-tab': '📈', 'body-tab': '📏', 'history-tab': '📊', 'backup-tab': '💾', 'admin-tab': '🛡️', 'science-tab': '🔬', wtop: '📋', diet: '🍽️' };

  // ---------- Rutina ----------
  const prevDone = {};
  function exInfo(c) {
    const rows = c.querySelectorAll('.set-row'), dn = c.querySelectorAll('.set-row.completed-row').length;
    return { n: rows.length, d: dn, all: !!((rows.length && dn === rows.length) || c.classList.contains('card-completed')) };
  }
  function exName(c) { const s = c.querySelector('.exercise-title > span'); if (!s) return txt(c.querySelector('.exercise-title')); const cl = s.cloneNode(true); cl.querySelectorAll('.ss-tag, .ss-lbl, b.ss-l, small').forEach(x => x.remove()); return txt(cl).replace(/^[AB]\d\s*/, ''); }
  function exMeta(c) {
    const mt = txt(c.querySelector('.exercise-meta')); const parts = [];
    const m = /(\d+)\s*\S*\s*x\s*([\d\-–]+)/i.exec(mt); if (m) parts.push(`${m[1]}×${m[2]}`);
    const rir = /RIR\s*[\d\-–]+/.exec(mt); const ap = /@\s*([\d.,]+\s*kg)/i.exec(txt(c.querySelector('.ap-box'))); const rb = txt(c.querySelector('.rec-box strong')); const kg = ap ? [0, ap[1]] : /^([\d.,]+\s*kg)/.exec(rb);
    if (c.dataset && c.dataset.bwl) parts.push('🎯 ' + c.dataset.bwl); else if (kg) parts.push('🎯 ' + kg[1]); if (rir) parts.push(rir[0]);
    return parts.join(' · ');
  }
  function topFold() {
    const nb = $('#nutrition-banner'), cs = $('#cat-selector'); if (!nb) return;
    let w = $('#ux-top');
    if (!w) {
      w = document.createElement('div'); w.id = 'ux-top'; w.className = 'ux-sec ux-wrap';
      const body = document.createElement('div'); body.className = 'ux-b'; nb.parentNode.insertBefore(w, nb);
      [nb, $('#hero-image'), cs].filter(Boolean).forEach(x => body.appendChild(x)); w.appendChild(body);
      new MutationObserver(() => { busy || kick(); }).observe(nb, { attributes: true, attributeFilter: ['style'] });
    }
    const hide = nb.style.display === 'none'; if ((w.style.display === 'none') !== hide) w.style.display = hide ? 'none' : '';
    mark(w, 'wtop', 'top');
    const v = id => txt(document.getElementById(id));
    setHead(w, head('🎯', esc(L('topT')), esc([v('nut-calories'), v('nut-protein') + ' ' + L('p').toLowerCase(), v('nut-water')].filter(x => x && x !== '-' && x.trim() !== L('p').toLowerCase()).join(' · ')), ''));
  }
  function centerCat() { const tr = $('#cat-track'); if (!tr) return; const on = tr.querySelector('[aria-selected="true"], .on, .active'); if (on) tr.scrollLeft = on.offsetLeft - (tr.clientWidth - on.offsetWidth) / 2; }
  // Calentamiento fase 03: sobre qué ejercicio y con cuántos kilos (40% / 60% de la carga de trabajo del primer ejercicio)
  const NK = v => Number.isInteger(v) ? N(v) : N(v, 1);
  const r25 = v => Math.max(2.5, Math.round(v / 2.5) * 2.5);
  const kgNum = s => { const m = /([\d]+(?:[.,]\d+)?)\s*kg/i.exec(s || ''); return m ? parseFloat(m[1].replace(',', '.')) : 0; };
  function warmup() {
    const r1 = $('#warmup-row-1'); if (!r1) return; const card = r1.closest('.warmup-phase-card'); if (!card) return;
    const c0 = $('#exercises-container .exercise-card[id$="_0"][id^="card_"]') || $('#exercises-container .exercise-card[id^="card_"]');
    const nm = c0 ? exName(c0) : '';
    const bw = !!(c0 && c0.dataset.bw);
    let w = 0; if (c0 && !bw) { const ap = c0.querySelector('.ap-box'); const at = ap ? /@\s*([\d.,]+\s*kg)/i.exec(txt(ap)) : null; w = at ? kgNum(at[1]) : kgNum(txt(c0.querySelector('.rec-box strong'))); }
    let info = $('#ux-wu-ex', card);
    if (!info) { info = document.createElement('div'); info.id = 'ux-wu-ex'; info.className = 'ux-wu-ex'; const tw = card.querySelector('.sets-table-wrapper'); card.insertBefore(info, tw); }
    const html = nm ? `<span class="ux-wu-l">🏋️ ${esc(L('wuEx'))}</span><b>${esc(nm)}</b>${bw ? `<small>${esc(L('wuBw'))}</small>` : w ? `<small>${esc(L('wuWork', { w: NK(w) }))}</small>` : ''}` : `<small>${esc(L('wuFirst'))}</small>`;
    if (info._html !== html) { info.innerHTML = html; info._html = html; }
    [[1, 0.4], [2, 0.6]].forEach(([i, f]) => {
      const row = $('#warmup-row-' + i); if (!row) return; const td = row.cells[0], inp = $('#wu-w-' + i); const kg = w ? r25(w * f) : 0;
      const lab = `<span class="ux-wu-s">S${i}</span><span class="ux-wu-p">${bw ? esc(L(i === 1 ? 'wuB1' : 'wuB2')) : kg ? '~' + NK(kg) + ' kg' : esc(L('wuPct', { p: Math.round(f * 100) }))}</span>`;
      if (td && td._html !== lab) { td.innerHTML = lab; td._html = lab; }
      if (inp) {
        const ph = bw ? '0' : kg ? String(kg) : 'kg'; if (inp.placeholder !== ph) inp.placeholder = ph;
        if (kg && (inp.value === '' || inp.dataset.uxAuto === '1') && inp.value !== String(kg)) { inp.value = String(kg); inp.dataset.uxAuto = '1'; }
        else if (!kg && inp.dataset.uxAuto === '1' && inp.value !== '') { inp.value = ''; inp.dataset.uxAuto = ''; } // peso corporal: sin kilos automáticos
        if (!inp._uxL) { inp._uxL = 1; inp.addEventListener('input', () => { inp.dataset.uxAuto = ''; }); }
      }
    });
  }
  function workout() {
    const tab = $('#workout-tab'); if (!tab) return;
    topFold(); warmup(); carryAll();
    $$(':scope > .exercise-card, :scope > .warmup-box, :scope > details.exercise-card', tab).forEach(c => {
      if (c.offsetParent === null && getComputedStyle(c).display === 'none') return;
      foldCard(c, 'wtop', c.id || ('p' + txt(c.querySelector('h2,summary,h3')).slice(0, 14)), metaFor(c));
    });
    const box = $('#exercises-container'); if (!box) return;
    const items = $$(':scope > .ss-block, :scope > .exercise-card[id^="card_"]', box);
    items.forEach((it, i) => {
      const cards = it.classList.contains('ss-block') ? $$('.exercise-card[id^="card_"]', it) : [it]; if (!cards.length) return;
      const key = cards[0].id; mark(it, 'ex', key, 'ux-card');
      let n = 0, d = 0, all = true;
      if (it.classList.contains('ss-block')) { const x = exInfo(it); n = x.n; d = x.d; all = !!n && d === n || cards.every(c => c.classList.contains('card-completed')); }
      else { const x = exInfo(it); n = x.n; d = x.d; all = x.all; }
      let html;
      if (it.classList.contains('ss-block')) {
        const hb = it.querySelector('.ss-head > b'); const tt = txt(hb).replace(/^🔗\s*/u, '');
        html = head('🔗', esc(tt || L('block')), esc(cards.map(c => exName(c)).join(' + ')), all ? '✓' : `${d}/${n}`, all ? 'ok' : d ? 'mid' : '');
      } else {
        html = head(`<em class="ux-num">${i + 1}</em>`, esc(exName(it)), esc(exMeta(it)), all ? '✓' : `${d}/${n}`, all ? 'ok' : d ? 'mid' : '');
      }
      setHead(it, html);
      // al completar el ejercicio abierto pasamos solos al siguiente sin terminar (sin reproducir nada)
      if (prevDone[key] === false && all && it.classList.contains('ux-open')) {
        const nx = items.slice(i + 1).find(o => !o.querySelector('.ux-bd.ok'));
        if (nx) setTimeout(() => { if (it.classList.contains('ux-open')) setOpen(nx, true); }, 900);
      }
      prevDone[key] = all;
    });
  }

  // ---------- Peso que arrastra: lo que pusiste a mano en una serie pasa a las siguientes del mismo ejercicio ----------
  // (normales y biseries/superseries, cada ejercicio por separado). Nunca pisa una serie ya hecha ni un peso que escribiste vos.
  const WRX = /^w_(.+)_(\d+)_(\d+)$/;
  // W_max (carga pico) = máx(tu carga más alta registrada en el historial, la sugerida por la progresión).
  function baseKg(dk, j) {
    let b = 0; const tg = window._apTargets && window._apTargets[dk + '_' + j]; if (tg && !tg.first && +tg.w > 0) b = +tg.w;
    let nm = tg && tg.name;
    if (!nm) { try { nm = getProgramForUser(getUsersDB()[currentUser] || {})[dk].exercises[+j].name; } catch (e) {} }
    if (nm && window.hpMaxKg) b = Math.max(b, window.hpMaxKg(nm) || 0);
    return b;
  }
  const fmtKg = v => String(Math.round(v * 100) / 100);
  // Rampa ascendente: la serie 1 más liviana y la última serie activa llega a la carga pico (W_max)
  const RAMP = { 1: [1], 2: [0.85, 1], 3: [0.8, 0.9, 1], 4: [0.75, 0.85, 0.925, 1], 5: [0.7, 0.8, 0.875, 0.95, 1] };
  function rampW(i, n, W) { // i = 0..n-1
    if (!(W > 0)) return 0; if (i >= n - 1) return W;
    const f = RAMP[n] ? RAMP[n][i] : 0.7 + 0.3 * i / (n - 1);
    const v = f * W; let r = W >= 10 ? Math.round(v / 2.5) * 2.5 : Math.round(v);
    if (W >= 2.5) r = Math.max(r, Math.min(2.5, W)); return Math.min(W, Math.max(r, 0));
  }
  // Peso de cada serie sin hacer = máx(rampa hacia W_max, el más alto de las series anteriores de hoy).
  // W_max = máx(tu carga más alta registrada, la sugerida). Una serie más liviana nunca baja las siguientes.
  function carry(dk, j) {
    const W = baseKg(dk, j); const items = [];
    for (let s = 1; s < 60; s++) {
      const w = document.getElementById(`w_${dk}_${j}_${s}`); if (!w) break;
      if (w.type === 'hidden') continue;
      const row = document.getElementById(`row_${dk}_${j}_${s}`);
      items.push({ w, done: !!(row && row.classList.contains('completed-row')), skip: !!(row && row.classList.contains('rd-skip')) });
    }
    const n = items.filter(x => !x.skip).length || items.length; let k = 0, hi = 0;
    items.forEach(x => {
      const idx = x.skip ? n - 1 : k++; // series apagadas por «¿Cómo llegás hoy?» quedan en W_max
      const v = parseFloat(String(x.w.value).replace(',', '.'));
      if (x.done || x.w.dataset.uxMan === '1') { if (v > 0 && v < 1000) hi = Math.max(hi, v); return; }
      const tgt = Math.max(rampW(Math.min(idx, n - 1), n, W), hi);
      const want = tgt > 0 ? fmtKg(tgt) : '';
      if (want && x.w.value !== want) { x.w.value = want; x.w.dataset.uxAuto = '1'; }
      else if (!want && x.w.dataset.uxAuto === '1' && x.w.value !== '') { x.w.value = ''; x.w.dataset.uxAuto = ''; }
    });
  }
  window.uxCarry = carry;
  document.addEventListener('input', e => {
    const w = e.target; const m = w && w.id && WRX.exec(w.id); if (!m || !w.closest('#exercises-container')) return;
    w.dataset.uxMan = '1'; w.dataset.uxAuto = ''; carry(m[1], m[2]);
  }, true);
  // antes de «Marcar» (captura: corre antes del onclick) dejamos los pesos al día
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[id^="btn_"]'); if (!b) return; const m = /^btn_(.+)_(\d+)_(\d+)$/.exec(b.id); if (!m) return;
    carry(m[1], m[2]); setTimeout(() => carry(m[1], m[2]), 0);
  }, true);
  function carryAll() {
    const seen = {}; $$('#exercises-container input[id^="w_"]').forEach(w => { const m = WRX.exec(w.id); if (m && !seen[m[1] + '|' + m[2]]) { seen[m[1] + '|' + m[2]] = 1; carry(m[1], m[2]); } });
  }

  // ---------- resto de pestañas ----------
  function generic(id) {
    const tab = document.getElementById(id); if (!tab) return;
    $$(':scope > .exercise-card, :scope > details.exercise-card', tab).forEach((c, i) => {
      if (c.classList.contains('sci-hero')) return;
      if (id === 'admin-tab' && i === 0) return; // cabecera del panel (Actualizar + números)
      if (getComputedStyle(c).display === 'none') return;
      foldCard(c, id, c.id || ('c' + i), metaFor(c));
    });
  }

  let raf = 0;
  function apply() {
    raf = 0; if (busy) return; busy = true;
    try {
      const act = $('.tab-content.active'); const id = act && act.id;
      if (id === 'diet-tab') diet(false);
      else if (id === 'workout-tab') workout();
      else if (id) generic(id);
    } catch (e) { console.warn('ux', e); }
    busy = false;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
  window.uxApply = kick;
  const mo = new MutationObserver(ms => { if (busy) return; kick(); });
  function boot() {
    $$('.tab-content').forEach(el => mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }));
    kick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
