/* Hipertrofia Pro — funciones 7-14: autoprogresión, readiness, dieta adaptativa, comparación de fotos,
   reporte semanal IA, molestias/lesiones, suplementos por peso, coach por voz */
(function () {
  const $ = id => document.getElementById(id);
  const E = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pro = () => !!(window._access && window._access.has_access);
  const today = () => (typeof getTodayISO === 'function' ? getTodayISO() : new Date().toISOString().slice(0, 10));
  const store = { get(k, d) { try { return JSON.parse(cloudStore.getItem(k + '_' + currentUser) || 'null') ?? d; } catch (e) { return d; } }, set(k, v) { cloudStore.setItem(k + '_' + currentUser, JSON.stringify(v)); } };
  const toast = m => (typeof showToast === 'function' ? showToast(m) : alert(m));
  const hist = () => { try { return JSON.parse(cloudStore.getItem(`gym_workout_history_${currentUser}`) || '[]'); } catch (e) { return []; } };
  const r25 = (w, step) => Math.round(w / step) * step;

  // ---------- 8. READINESS ----------
  const RQ = [['sleep', '😴 Sueño', ['Pésimo', 'Malo', 'Normal', 'Bueno', 'Excelente']], ['sore', '🦵 Dolor muscular', ['Mucho', 'Bastante', 'Algo', 'Poco', 'Nada']], ['stress', '🧠 Estrés', ['Muy alto', 'Alto', 'Normal', 'Bajo', 'Muy bajo']], ['energy', '⚡ Energía', ['Muy baja', 'Baja', 'Normal', 'Buena', 'Muy buena']]];
  // Hook para Google Fit / Health Connect (futuro): window.hpReadinessSource = async () => ({ sleep: 1-5, ... })
  window.hpReadinessSource = window.hpReadinessSource || null;
  function readiness() { const r = store.get('hp_ready', {})[today()]; if (!r) return null; const avg = RQ.reduce((a, [k]) => a + (r[k] || 3), 0) / 4; return { r, avg, f: avg >= 4 ? { sets: 0, load: 1, lbl: '🟢 Listo para rendir: entrená normal y buscá superar tus marcas.' } : avg >= 3 ? { sets: 0, load: 1, lbl: '🟡 Normal: seguí el plan.' } : avg >= 2 ? { sets: -1, load: 0.95, lbl: '🟠 Recuperación baja: hoy 1 serie menos por ejercicio y −5 % de carga.' } : { sets: -2, load: 0.9, lbl: '🔴 Muy cansado: hacé la mitad del volumen, −10 % de carga, o descansá / caminá.' } }; }
  function renderReadiness() {
    const wt = $('workout-tab'); if (!wt || !currentUser) return;
    let c = $('ready-card'); if (!c) { c = document.createElement('div'); c.className = 'exercise-card'; c.id = 'ready-card'; const ec = $('exercises-container'); ec.parentNode.insertBefore(c, $('warmup-section') || ec); }
    if (!pro()) { c.style.display = 'none'; return; } c.style.display = '';
    const rd = readiness(), all = store.get('hp_ready', {}), cur = all[today()] || {};
    c.innerHTML = `<h2 class="pc-title">🔋 ¿Cómo llegás hoy? <small class="rd-sub">10 segundos</small></h2>
      ${RQ.map(([k, l, o]) => `<div class="rd-q"><span>${l}</span><div>${o.map((x, i) => `<button type="button" class="${cur[k] === i + 1 ? 'on' : ''}" data-k="${k}" data-v="${i + 1}" title="${x}" aria-label="${l}: ${x}">${i + 1}</button>`).join('')}</div></div>`).join('')}
      ${rd ? `<p class="rd-res">${rd.f.lbl}</p>` : '<p class="pc-note">1 = peor · 5 = mejor. Ajusta el volumen y la carga de hoy.</p>'}`;
    c.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const a = store.get('hp_ready', {}); a[today()] = Object.assign(a[today()] || {}, { [b.dataset.k]: +b.dataset.v }); Object.keys(a).sort().slice(0, -60).forEach(k => delete a[k]); store.set('hp_ready', a); renderReadiness(); decorateWorkout(); });
  }

  // ---------- 7. AUTOPROGRESIÓN + 12. MOLESTIAS ----------
  function rirLog() { return store.get('hp_rir', {}); }
  function nextTarget(ex) {
    const m = String(ex.target || '').match(/(\d+)\s*[-–]\s*(\d+)/); const lo = m ? +m[1] : 8, hi = m ? +m[2] : 12;
    const H = hist().filter(h => h.exercise === ex.name && +h.weight > 0 && +h.reps > 0);
    if (!H.length) return { first: true, lo, hi };
    const last = H.map(h => String(h.date).slice(0, 10)).sort().pop(); const S = H.filter(h => String(h.date).slice(0, 10) === last);
    const w = Math.max(...S.map(s => +s.weight)), top = S.filter(s => +s.weight === w), minR = Math.min(...top.map(s => +s.reps)), maxR = Math.max(...top.map(s => +s.reps));
    const rir = rirLog()[last + '|' + ex.name];
    const step = /mancuerna|dumbbell|polea|cable|máquina|maquina|lateral|curl|extensi/i.test(ex.name) ? 1 : 2.5;
    let nw = w, nr, why;
    if (minR >= hi || (rir != null && rir >= 3 && minR >= lo)) { nw = r25(w * (rir >= 3 ? 1.05 : 1.025), step); if (nw <= w) nw = w + step; nr = lo; why = rir >= 3 ? `te sobraron ${rir} reps (RIR ${rir}): subí la carga` : `llegaste a ${hi} reps en todas las series: subí la carga`; }
    else if (minR < lo && rir === 0) { nw = r25(w * 0.95, step); nr = lo; why = 'llegaste al fallo por debajo del rango: bajá un poco la carga'; }
    else { nr = Math.min(hi, maxR + 1); why = `sumá 1 rep (doble progresión, rango ${lo}-${hi})`; }
    const rd = readiness(); if (rd && rd.f.load < 1) { nw = r25(nw * rd.f.load, step); why += ' · ajustado por tu readiness'; }
    return { w: nw, reps: nr, lo, hi, why, last, prevW: w };
  }
  const INJ = {
    hombro: ['🦾 Hombro', /press (militar|de hombro|arnold)|overhead|elevaciones? laterales|fondos|dips|press (de )?banca|press inclinado|remo al ment[oó]n|upright|tras nuca/i, 'Rotaciones externas con banda 2×15, wall slides 2×10, movilidad torácica en banco.'],
    codo: ['💪 Codo', /press franc[eé]s|skull|rompecr[aá]neos|curl (con )?barra|fondos|dips|extensi[oó]n.*nuca/i, 'Curl excéntrico de muñeca, estiramiento de flexores/extensores 2×30 s.'],
    muneca: ['✋ Muñeca', /curl (con )?barra|press (de )?banca|flexiones|push.?up|front squat|frontal/i, 'Círculos de muñeca, extensiones con banda liviana 2×15.'],
    lumbar: ['🔙 Zona lumbar', /peso muerto|deadlift|remo con barra|buenos d[ií]as|good morning|sentadilla con barra|hiperextensi/i, 'Cat-camel 2×10, bird-dog 2×8, puente de glúteo 2×12, McGill curl-up.'],
    rodilla: ['🦵 Rodilla', /sentadilla|squat|zancada|estocada|lunge|extensi[oó]n de (piernas|cu[aá]driceps)|leg extension|prensa|salto|b[uú]lgara/i, 'Spanish squat isométrico 3×30 s, puente de glúteo, movilidad de tobillo.'],
    cadera: ['🦴 Cadera', /sentadilla|squat|peso muerto|hip thrust|zancada|b[uú]lgara|abductor|aductor/i, 'Estiramiento 90/90, flexor de cadera 2×30 s, clamshell con banda 2×15.']
  };
  function injuries() { return store.get('hp_injury', {}); }
  function decorateWorkout() {
    if (!currentUser || !pro()) return;
    let prog, dk; try { prog = getProgramForUser(getUsersDB()[currentUser] || {}); } catch (e) { return; }
    const cards = document.querySelectorAll('#exercises-container .exercise-card[id^="card_"]'); const inj = injuries(); const rd = readiness();
    cards.forEach(card => {
      const m = card.id.match(/^card_(.+)_(\d+)$/); if (!m) return; dk = m[1]; const i = +m[2]; const ex = prog[dk] && prog[dk].exercises[i]; if (!ex) return;
      card.querySelectorAll('.ap-box,.inj-flag').forEach(x => x.remove());
      const box = document.createElement('div'); box.className = 'ap-box';
      if (!/reps/i.test(ex.target || '') || /\bs\b|seg/.test(ex.target || '') && !/reps/.test(ex.target)) return;
      const tg = nextTarget(ex); const sets = Math.max(1, ex.sets + (rd ? rd.f.sets : 0));
      box.innerHTML = tg.first ? `🎯 <b>Objetivo:</b> ${sets}×${tg.lo}-${tg.hi} reps · elegí una carga que te deje 1-2 reps en reserva` :
        `🎯 <b>Objetivo hoy:</b> ${sets}×${tg.reps} reps @ <b>${tg.w} kg</b><small>${E(tg.why)} (última vez ${tg.prevW} kg)</small>`;
      const rirSel = `<div class="ap-rir">¿Cuántas reps te sobraron en la última serie? ${[0, 1, 2, 3].map(v => `<button type="button" data-rir="${v}" class="${rirLog()[today() + '|' + ex.name] === v ? 'on' : ''}">${v}${v === 3 ? '+' : ''}</button>`).join('')}</div>`;
      box.innerHTML += rirSel;
      box.querySelectorAll('[data-rir]').forEach(b => b.onclick = () => { const r = rirLog(); r[today() + '|' + ex.name] = +b.dataset.rir; const ks = Object.keys(r); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(k => delete r[k]); store.set('hp_rir', r); decorateWorkout(); toast('RIR guardado: se usa para tu próxima sesión'); });
      let head = card.querySelector('table') || card.firstChild; while (head && head.parentNode !== card) head = head.parentNode; card.insertBefore(box, head || null);
      if (!tg.first) for (let s = 1; s <= ex.sets; s++) { const w = $(`w_${dk}_${i}_${s}`), r = $(`r_${dk}_${i}_${s}`); if (w && !w.value) w.placeholder = tg.w + ' kg'; if (r && !r.value) r.placeholder = tg.reps + ' reps'; }
      if (rd && rd.f.sets < 0) for (let s = sets + 1; s <= ex.sets; s++) { const row = $(`row_${dk}_${i}_${s}`); if (row) row.classList.add('rd-skip'); }
      window._apTargets = window._apTargets || {}; window._apTargets[dk + '_' + i] = { name: ex.name, ...tg };
      const hits = Object.entries(INJ).filter(([k, v]) => inj[k] && v[1].test(ex.name + ' ' + (ex.origName || '')));
      if (hits.length) { const f = document.createElement('div'); f.className = 'inj-flag'; f.innerHTML = `⚠️ Cuidado con tu ${hits.map(h => h[1][0].replace(/^\S+\s/, '').toLowerCase()).join(' y ')}: este ejercicio puede molestar. <button type="button" class="btn-3d btn-small">🔄 Cambiar por alternativa segura</button>`; f.querySelector('button').onclick = () => openSwap(dk, i); card.insertBefore(f, box); }
    });
  }
  const origLWD = window.loadWorkoutDay;
  if (typeof origLWD === 'function') window.loadWorkoutDay = function () { const r = origLWD.apply(this, arguments); try { renderReadiness(); decorateWorkout(); } catch (e) { console.warn(e); } return r; };

  // ---------- 14. COACH POR VOZ ----------
  const voiceOn = () => localStorage.getItem('hp_voice') === '1';
  let lastSet = null;
  function say(t) { if (!voiceOn() || !('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-419'; const v = speechSynthesis.getVoices().find(v => /^es/.test(v.lang) && /419|MX|US|AR/.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/.test(v.lang)); if (v) u.voice = v; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {} }
  const origCSW = window.completeSetWorkflow;
  if (typeof origCSW === 'function') window.completeSetWorkflow = function (dk, i, s) { lastSet = { dk, i, s }; return origCSW.apply(this, arguments); };
  const origST = window.startTimer;
  if (typeof origST === 'function') window.startTimer = function (sec) {
    const r = origST.apply(this, arguments);
    if (voiceOn()) {
      say(`Descanso de ${sec >= 60 ? (sec / 60).toLocaleString('es') + (sec === 60 ? ' minuto' : ' minutos') : sec + ' segundos'}`);
      const ls = lastSet; clearInterval(window._hpVoiceInt);
      window._hpVoiceInt = setInterval(() => {
        const left = typeof timerSeconds !== 'undefined' ? timerSeconds : 0;
        if (left === 10) say('Diez segundos');
        else if (left === 3) say('Tres, dos, uno');
        else if (left <= 0) {
          clearInterval(window._hpVoiceInt);
          const tg = ls && window._apTargets && window._apTargets[ls.dk + '_' + ls.i]; let msg = '¡A trabajar!';
          if (ls && tg) { let ex = ''; try { ex = exName(tg.name); } catch (e) { ex = tg.name; } msg = `Siguiente serie de ${ex}: ${tg.reps || tg.lo} repeticiones${tg.w ? ' con ' + String(tg.w).replace('.', ',') + ' kilos' : ''}. ¡Vamos!`; }
          say(msg);
        }
      }, 1000);
    }
    return r;
  };
  function voiceToggle() {
    const tb = $('timer-bubble'); if (!tb || $('voice-tg')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'voice-tg'; b.className = 'voice-tg';
    const lab = () => { b.textContent = voiceOn() ? '🔊 Voz' : '🔇 Voz'; b.setAttribute('aria-pressed', voiceOn()); };
    b.onclick = () => { localStorage.setItem('hp_voice', voiceOn() ? '0' : '1'); lab(); if (voiceOn()) say('Coach por voz activado'); else speechSynthesis && speechSynthesis.cancel(); };
    lab(); tb.appendChild(b);
  }
  voiceToggle();

  // ---------- 9. DIETA ADAPTATIVA ----------
  const origCWA = window.checkWeightAlert;
  if (typeof origCWA === 'function') window.checkWeightAlert = function () {
    const r = origCWA.apply(this, arguments);
    try {
      const box = $('smart-alert'); const s = getSettings();
      if (pro() && s.autoDiet !== false && box && box.style.display !== 'none') {
        const btn = box.querySelector('[onclick^="acceptKcalAdjust"]'); const d = btn && +btn.getAttribute('onclick').match(/-?\d+/)[0];
        if (d) {
          const tr = weightTrend(); const tg = computeTargets(getUsersDB()[currentUser] || {});
          acceptKcalAdjust(d);
          const log = store.get('hp_autodiet', []); log.push({ date: today(), delta: d, pct: tr.pctWeek, kg: tr.kgWeek, lo: tg.rate[0], hi: tg.rate[1], from: tg.kcal, to: tg.kcal + d }); store.set('hp_autodiet', log.slice(-20));
          toast(`Dieta adaptada automáticamente: ${d > 0 ? '+' : ''}${d} kcal`);
        }
      }
    } catch (e) { console.warn(e); }
    return r;
  };
  function renderAdaptive() {
    const tab = $('diet-tab'); if (!tab || !currentUser) return;
    let c = $('diet-adapt'); if (!c) { c = document.createElement('div'); c.className = 'exercise-card'; c.id = 'diet-adapt'; tab.insertBefore(c, tab.children[1] || null); }
    if (!pro()) { c.style.display = 'none'; return; } c.style.display = '';
    const s = getSettings(), tr = weightTrend(), tg = computeTargets(getUsersDB()[currentUser] || {}), log = store.get('hp_autodiet', []), last = log[log.length - 1];
    const f = n => (n > 0 ? '+' : '') + String(n).replace('.', ',');
    c.innerHTML = `<h2 class="pc-title">📈 Dieta adaptativa</h2>
      <label class="pro-sw"><input type="checkbox" id="ad-on" ${s.autoDiet !== false ? 'checked' : ''}> Ajustar calorías y macros automáticamente según mi tendencia de peso</label>
      <p class="pc-note">Cómo funciona: calculamos la tendencia de tu peso de los últimos 14-28 días (regresión sobre tus pesajes, no un día aislado). Si te alejás del ritmo de tu objetivo${tg ? ` (${f(tg.rate[0])} a ${f(tg.rate[1])} % del peso por semana)` : ''}, corregimos entre 150 y 250 kcal (≈ 7700 kcal por kg) y esperamos 14 días antes de volver a ajustar. Las proteínas se mantienen y el cambio va a carbohidratos y grasas.</p>
      <div class="pro-box">${!tr ? 'Registrá tu peso en <b>Medidas</b> al menos 1 vez por semana para activar los ajustes.' : tr.insufficient ? `Tenés ${Math.round(tr.span)} días de datos: hacen falta 14. Seguí pesándote 2-3 veces por semana, en ayunas.` : `Tendencia actual: <b>${f(tr.kgWeek)} kg/semana</b> (${f(tr.pctWeek)} %). Calorías de hoy: <b>${tg ? tg.kcal : '—'} kcal</b>${s.kcalAdjust ? ` (ajuste acumulado ${f(s.kcalAdjust)} kcal)` : ''}.`}</div>
      ${last ? `<p class="pc-note">Último ajuste automático (${last.date}): ibas a ${f(last.pct)} %/sem y tu objetivo es ${f(last.lo)} a ${f(last.hi)} %, así que pasamos de ${last.from} a ${last.to} kcal (${f(last.delta)}).</p>` : ''}`;
    $('ad-on').onchange = e => { const s2 = getSettings(); s2.autoDiet = e.target.checked; saveSettings(s2); toast(e.target.checked ? 'Ajuste automático activado' : 'Vas a ver sugerencias para aceptar a mano'); };
  }

  // ---------- 13. SUPLEMENTOS POR PESO ----------
  const origRS = window.renderSupplements;
  if (typeof origRS === 'function') window.renderSupplements = function () {
    const r = origRS.apply(this, arguments);
    try {
      const box = $('supp-content'); const u = getUsersDB()[currentUser] || {}; const w = parseFloat(u.weight) || 70; const R = n => Math.round(n);
      box.insertAdjacentHTML('afterbegin', `<table class="cp-tbl supp-dose"><tr><th>Suplemento (evidencia A)</th><th>Dosis para tus ${R(w)} kg</th></tr>
        <tr><td>Creatina monohidrato</td><td>${Math.min(5, Math.max(3, Math.round(w * 0.07 * 2) / 2))} g/día, todos los días (sin carga)</td></tr>
        <tr><td>Proteína total (comida + whey)</td><td>${R(w * 1.6)}–${R(w * 2.2)} g/día (1,6–2,2 g/kg)</td></tr>
        <tr><td>Cafeína (opcional)</td><td>${R(w * 3)}–${R(Math.min(w * 6, 400))} mg, 30-60 min antes de entrenar; no después de las 16 h</td></tr>
        <tr><td>Vitamina D3</td><td>1000–2000 UI/día (ideal: con análisis de sangre)</td></tr>
        <tr><td>Omega-3 (EPA+DHA)</td><td>1–2 g/día</td></tr></table>
        <p class="pc-note">⚠️ Si tenés problemas renales, cardíacos, presión alta, estás embarazada o tomás medicación, consultá a un médico antes. Elegí productos con certificación (Informed Sport / NSF).</p>`);
    } catch (e) {}
    return r;
  };
  const origRD = window.renderDiet;
  if (typeof origRD === 'function') window.renderDiet = function () { const r = origRD.apply(this, arguments); try { renderAdaptive(); } catch (e) { console.warn(e); } return r; };

  // ---------- pestañas extra: Molestias, Fotos de progreso, Reporte semanal ----------
  const TABS = [['injury-tab', '🩹', 'Molestias y lesiones'], ['photos-tab', '🖼️', 'Comparar fotos'], ['report-tab', '📊', 'Reporte semanal IA']];
  const anchor = $('admin-tab'), bar = document.querySelector('.tab-btn')?.parentElement;
  const sheet = document.querySelector('#more-sheet .more-card'), before = sheet.querySelector('[data-m="history-tab"]');
  TABS.forEach(([id, ic, n]) => {
    const div = document.createElement('div'); div.id = id; div.className = 'tab-content'; div.innerHTML = `<div class="exercise-card"><h2 class="pc-title">${ic} ${n}</h2><div id="${id}-body"></div></div>`; anchor.parentNode.insertBefore(div, anchor);
    const b = document.createElement('button'); b.className = 'tab-btn'; b.setAttribute('onclick', `switchTab('${id}', this)`); b.textContent = n; bar && bar.appendChild(b);
    const m = document.createElement('button'); m.type = 'button'; m.innerHTML = `${ic} ${n}`; m.onclick = () => { hpMore(false); switchTab(id); scrollTo({ top: 0 }); }; sheet.insertBefore(m, before.previousElementSibling && before.previousElementSibling.classList.contains('more-sec') ? before.previousElementSibling : before);
  });
  const RENDER = { 'injury-tab': renderInjury, 'photos-tab': renderPhotos, 'report-tab': renderReport };
  const origSwitch = window.switchTab;
  window.switchTab = function (id, btn) { const r = origSwitch.apply(this, arguments); try { RENDER[id] && RENDER[id](); } catch (e) { console.warn(e); } return r; };
  const lockHTML = () => `<div class="pro-lock"><p>🔒 Esta función es parte del plan Pro.</p><button class="btn-3d" onclick="openPlans(false)">Ver planes</button></div>`;

  function renderInjury() {
    const box = $('injury-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const inj = injuries();
    box.innerHTML = `<p class="pc-note">Marcá dónde tenés molestias. En tu rutina se van a marcar los ejercicios que pueden empeorarla, con un botón para cambiarlos por una alternativa segura, y te sugerimos movilidad.</p>
      <div class="inj-grid">${Object.entries(INJ).map(([k, v]) => `<button type="button" class="${inj[k] ? 'on' : ''}" data-a="${k}" aria-pressed="${!!inj[k]}">${v[0]}</button>`).join('')}</div>
      ${Object.entries(INJ).filter(([k]) => inj[k]).map(([k, v]) => `<div class="pro-box"><b>${v[0]}: movilidad y prehab</b><p>${v[2]}</p><small>Hacelo antes de entrenar y en días de descanso. Entrená sin dolor (máx. 3/10).</small></div>`).join('')}
      <p class="pc-note pro-disc">⚠️ Si el dolor es fuerte, punzante, aparece con hinchazón u hormigueo, o dura más de 1-2 semanas, consultá a un médico o kinesiólogo. Esto no es un diagnóstico.</p>`;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const i = injuries(); i[b.dataset.a] = !i[b.dataset.a]; store.set('hp_injury', i); renderInjury(); try { _programCache = null; } catch (e) {} });
  }

  async function renderPhotos() {
    const box = $('photos-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    box.innerHTML = '<p class="pc-note">Cargando…</p>';
    const { data } = await sb.from('physique_checks').select('id,created_at,photos,category').order('created_at', { ascending: true }).limit(50);
    const rows = (data || []).filter(d => (d.photos || []).length === 3);
    const guide = `<div class="pose-guide"><b>Guía de pose</b> (la misma cada vez): misma hora y luz, cámara a la altura del ombligo a 2-3 m, cuerpo entero, brazos relajados, pies al ancho de hombros. Usá el análisis de físico para subir fotos nuevas.</div>`;
    if (rows.length < 2) { box.innerHTML = guide + `<p class="pc-note">Necesitás al menos 2 sets de fotos. Subilas en <b>Análisis de físico IA</b> (${rows.length} por ahora).</p><button class="btn-3d" onclick="switchTab('physique-tab')">📸 Ir a subir fotos</button>`; return; }
    const { data: urls } = await sb.storage.from('physique').createSignedUrls(rows.flatMap(r => r.photos), 3600); const U = {}; (urls || []).forEach(x => U[x.path] = x.signedUrl);
    const opt = sel => rows.map((r, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${new Date(r.created_at).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}</option>`).join('');
    let a = 0, b = rows.length - 1, view = 0;
    const draw = () => {
      box.innerHTML = guide + `<div class="grid-2"><div><label class="field-label">Antes</label><select id="pc-a">${opt(a)}</select></div><div><label class="field-label">Después</label><select id="pc-b">${opt(b)}</select></div></div>
        <div class="rk-tabs">${['Frente', 'Perfil', 'Espalda'].map((v, i) => `<button type="button" class="${view === i ? 'on' : ''}" data-v="${i}">${v}</button>`).join('')}</div>
        <div class="pc-side">${[a, b].map(i => `<figure><div class="pc-ov"><img src="${U[rows[i].photos[view]] || ''}" alt=""><i class="gl gl1"></i><i class="gl gl2"></i><i class="gl gl3"></i></div><figcaption>${new Date(rows[i].created_at).toLocaleDateString('es-PY')}</figcaption></figure>`).join('')}</div>
        <button class="btn-3d" id="pc-ai">🤖 Resumen IA de los cambios</button><div id="pc-out"></div>`;
      $('pc-a').onchange = e => { a = +e.target.value; draw(); }; $('pc-b').onchange = e => { b = +e.target.value; draw(); };
      box.querySelectorAll('[data-v]').forEach(x => x.onclick = () => { view = +x.dataset.v; draw(); });
      $('pc-ai').onclick = async () => {
        if (a === b) { toast('Elegí dos fechas distintas'); return; }
        const btn = $('pc-ai'); btn.disabled = true; btn.textContent = '⏳ Comparando…';
        const { data: r, error } = await sb.functions.invoke('ai-vision', { body: { kind: 'compare', lang: typeof LANG !== 'undefined' ? LANG : 'es', paths: [...rows[a].photos, ...rows[b].photos], dates: `${rows[a].created_at.slice(0, 10)} → ${rows[b].created_at.slice(0, 10)}`, category: rows[b].category } });
        btn.disabled = false; btn.textContent = '🤖 Resumen IA de los cambios';
        if (error || !r || !r.result) { let j = null; try { j = await error.context.json(); } catch (_) {} $('pc-out').innerHTML = `<p class="pro-err">${j && j.error === 'limit' ? 'Llegaste al límite mensual de comparaciones (5).' : j && j.error === 'nokey' ? 'Próximamente.' : 'La IA no pudo responder. Probá de nuevo.'}</p>`; return; }
        const o = r.result; $('pc-out').innerHTML = `<div class="pro-box"><p>${E(o.summary)}</p>${(o.improved || []).length ? `<p><b>✅ Mejoró:</b></p><ul>${o.improved.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : ''}${(o.to_work || []).length ? `<p><b>🎯 A trabajar:</b></p><ul>${o.to_work.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : ''}${o.photo_tips ? `<small>📷 ${E(o.photo_tips)}</small>` : ''}</div><p class="pc-note pro-disc">Orientativo, generado por IA.</p>`;
      };
    };
    draw();
  }

  function weekKey(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x.toISOString().slice(0, 10); } // domingo
  function weekStats() {
    const ws = weekKey(); const from = new Date(Date.parse(ws) - 7 * 864e5).toISOString().slice(0, 10);
    const H = hist().filter(h => String(h.date).slice(0, 10) >= from && String(h.date).slice(0, 10) < ws);
    const byEx = {}; H.forEach(h => { const k = h.exercise; byEx[k] = byEx[k] || { sets: 0, best: 0 }; byEx[k].sets++; byEx[k].best = Math.max(byEx[k].best, (+h.weight || 0) * (1 + (+h.reps || 0) / 30)); });
    const days = new Set(H.map(h => String(h.date).slice(0, 10))).size; const s = getSettings(); const tr = weightTrend(); const u = getUsersDB()[currentUser] || {}; const tg = computeTargets(u);
    const rd = store.get('hp_ready', {}); const rv = Object.entries(rd).filter(([d]) => d >= from && d < ws).map(([, v]) => v);
    return { semana: `${from} a ${ws}`, categoria: typeof goalLabel === 'function' ? goalLabel(u.goal) : u.goal, fase: s.phase, dias_planificados: s.frequency, dias_entrenados: days, series_totales: H.length,
      ejercicios: Object.entries(byEx).slice(0, 25).map(([k, v]) => `${k}: ${v.sets} series, e1RM ${Math.round(v.best)} kg`), tendencia_peso: tr && !tr.insufficient ? `${tr.kgWeek} kg/sem` : 'sin datos', kcal: tg && tg.kcal, objetivo_ritmo: tg && tg.rate, readiness_promedio: rv.length ? (rv.reduce((a, r) => a + ((r.sleep || 3) + (r.sore || 3) + (r.stress || 3) + (r.energy || 3)) / 4, 0) / rv.length).toFixed(1) : 'sin datos', molestias: Object.keys(injuries()).filter(k => injuries()[k]) };
  }
  async function renderReport(force) {
    const box = $('report-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const wk = weekKey(), cache = store.get('hp_wreport', {});
    const show = r => { box.innerHTML = `<p class="pc-note">Semana que terminó el ${new Date(Date.parse(wk) + 12 * 36e5).toLocaleDateString('es-PY')}. Se genera cada domingo al abrirlo.</p>
      <div class="pro-box"><h3>${E(r.headline)}</h3><p><b>🏆 Logros</b></p><ul>${(r.wins || []).map(x => `<li>${E(x)}</li>`).join('')}</ul><p><b>⚠️ A mejorar</b></p><ul>${(r.misses || []).map(x => `<li>${E(x)}</li>`).join('')}</ul><p><b>📅 Plan para esta semana</b></p><ul>${(r.next_week || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div>
      <p class="pc-note pro-disc">Generado por IA con tus registros. Orientativo.</p><button class="btn-3d btn-secondary btn-small" id="wr-re">🔄 Regenerar</button>`; $('wr-re').onclick = () => renderReport(true); };
    if (cache[wk] && !force) { show(cache[wk]); return; }
    box.innerHTML = '<p class="pc-note">⏳ Armando tu reporte semanal…</p>';
    const { data, error } = await sb.functions.invoke('ai-vision', { body: { kind: 'weekly', lang: typeof LANG !== 'undefined' ? LANG : 'es', stats: weekStats() } });
    if (error || !data || !data.result) { let j = null; try { j = await error.context.json(); } catch (_) {} box.innerHTML = `<p class="pro-err">${j && j.error === 'limit' ? 'Ya generaste varios reportes este mes. Probá más adelante.' : j && j.error === 'nokey' ? 'Próximamente.' : 'No se pudo generar el reporte. Probá de nuevo.'}</p>`; return; }
    const c = store.get('hp_wreport', {}); c[wk] = data.result; Object.keys(c).sort().slice(0, -8).forEach(k => delete c[k]); store.set('hp_wreport', c); show(data.result);
  }
  // domingo: aviso suave en Rutina
  setTimeout(function nudge() { if (!currentUser || !pro()) return setTimeout(nudge, 3000); if (new Date().getDay() === 0 && !store.get('hp_wreport', {})[weekKey()]) toast('📊 Tu reporte semanal está listo en Más → Reporte semanal IA'); }, 4000);
})();
