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
  function readiness() { const b = readiness0(), ex = [window.hpCycleAdj && window.hpCycleAdj(), window.hpWearAdj && window.hpWearAdj(), window.hpFuelAdj && window.hpFuelAdj()].filter(Boolean); if (!ex.length) return b; const f = Object.assign({ sets: 0, load: 1, lbl: '' }, b ? b.f : {}); ex.forEach(x => { f.sets = Math.max(-2, Math.min(f.sets, 0) + x.sets); f.load = Math.max(0.85, f.load * x.load); }); f.lbl = [b && b.f.lbl, ...ex.map(x => x.lbl)].filter(Boolean).join('<br>'); return { r: b ? b.r : {}, avg: b ? b.avg : 3, f }; }
  function readiness0() { const r = store.get('hp_ready', {})[today()]; if (!r) return null; const avg = RQ.reduce((a, [k]) => a + (r[k] || 3), 0) / 4; return { r, avg, f: avg >= 4 ? { sets: 0, load: 1, lbl: '🟢 Listo para rendir: entrená normal y buscá superar tus marcas.' } : avg >= 3 ? { sets: 0, load: 1, lbl: '🟡 Normal: seguí el plan.' } : avg >= 2 ? { sets: -1, load: 0.95, lbl: '🟠 Recuperación baja: hoy 1 serie menos por ejercicio y −5 % de carga.' } : { sets: -2, load: 0.9, lbl: '🔴 Muy cansado: hacé la mitad del volumen, −10 % de carga, o descansá / caminá.' } }; }
  function renderReadiness() {
    const wt = $('workout-tab'); if (!wt || !currentUser) return;
    let c = $('ready-card'); if (!c) { c = document.createElement('div'); c.className = 'exercise-card'; c.id = 'ready-card'; const ec = $('exercises-container'); ec.parentNode.insertBefore(c, $('warmup-section') || ec); }
    if (!pro()) { c.style.display = 'none'; return; } c.style.display = '';
    const rd = readiness(), all = store.get('hp_ready', {}), cur = all[today()] || {};
    const RL = { es: { legend: '1 = peor · 5 = excelente', lo: 'peor', hi: 'excelente' }, en: { legend: '1 = worst · 5 = excellent', lo: 'worst', hi: 'excellent' }, pt: { legend: '1 = pior · 5 = excelente', lo: 'pior', hi: 'excelente' } }[VL()];
    c.innerHTML = `<h2 class="pc-title">🔋 ¿Cómo llegás hoy? <small class="rd-sub">10 segundos</small></h2>
      <p class="rd-legend">${RL.legend}</p>
      ${RQ.map(([k, l, o]) => { const v = cur[k]; const pick = v ? ` <span class="rd-pick">${o[v - 1]}</span>` : ''; return `<div class="rd-q"><span>${l}${pick}</span><div class="rd-scale"><span class="rd-end rd-lo">${RL.lo}</span><div class="rd-btns">${o.map((x, i) => `<button type="button" class="${v === i + 1 ? 'on' : ''}" data-k="${k}" data-v="${i + 1}" title="${x}" aria-label="${l}: ${i + 1}, ${x}">${i + 1}</button>`).join('')}</div><span class="rd-end rd-hi">${RL.hi}</span></div></div>`; }).join('')}
      ${rd && rd.f && rd.f.lbl ? `<p class="rd-res">${rd.f.lbl}</p>` : ''}`;
    if (window.hpAfterReady) window.hpAfterReady();
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

  // ---------- 14. COACH POR VOZ (voz natural Gemini TTS + respaldo del sistema) ----------
  const voiceOn = () => localStorage.getItem('hp_voice') === '1';
  const VL = () => (typeof LANG !== 'undefined' && (LANG === 'en' || LANG === 'pt')) ? LANG : 'es';
  const num = (n, l) => String(n).replace('.', l === 'en' ? '.' : ',');
  const PH = {
    es: { on: 'Coach de voz activado. ¡Vamos con todo!', test: 'Hola, soy tu coach de voz. ¡Vamos a entrenar juntos!', ten: 'Diez segundos', cd: 'Tres, dos, uno', go: '¡A trabajar!', done: 'Serie completada. ¡Muy bien!', exDone: '¡Ejercicio terminado! Excelente trabajo.',
      rest: s => `Descanso de ${s >= 60 && s % 30 === 0 ? (s / 60).toLocaleString('es') + (s === 60 ? ' minuto' : ' minutos') : s + ' segundos'}`,
      next: (ex, r, w) => `Siguiente serie de ${ex}: ${r} repeticiones${w ? ' con ' + num(w, 'es') + ' kilos' : ''}. ¡Vamos!`, nextEx: ex => `Ahora sigue ${ex}. ¡Vamos!` },
    en: { on: 'Voice coach activated. Let\'s go!', test: 'Hi, I\'m your voice coach. Let\'s train together!', ten: 'Ten seconds', cd: 'Three, two, one', go: 'Let\'s work!', done: 'Set complete. Great job!', exDone: 'Exercise finished! Excellent work.',
      rest: s => `Rest for ${s >= 60 && s % 30 === 0 ? (s / 60) + (s === 60 ? ' minute' : ' minutes') : s + ' seconds'}`,
      next: (ex, r, w) => `Next set of ${ex}: ${r} reps${w ? ' with ' + num(w, 'en') + ' kilos' : ''}. Let's go!`, nextEx: ex => `Next up: ${ex}. Let's go!` },
    pt: { on: 'Coach de voz ativado. Vamos com tudo!', test: 'Olá, sou sua coach de voz. Vamos treinar juntos!', ten: 'Dez segundos', cd: 'Três, dois, um', go: 'Bora trabalhar!', done: 'Série concluída. Muito bem!', exDone: 'Exercício concluído! Excelente trabalho.',
      rest: s => `Descanso de ${s >= 60 && s % 30 === 0 ? (s / 60).toLocaleString('pt') + (s === 60 ? ' minuto' : ' minutos') : s + ' segundos'}`,
      next: (ex, r, w) => `Próxima série de ${ex}: ${r} repetições${w ? ' com ' + num(w, 'pt') + ' quilos' : ''}. Vamos!`, nextEx: ex => `Agora vem ${ex}. Vamos!` },
  };
  const P = () => PH[VL()];
  // frases de ánimo variadas (cortas y fijas => cacheables)
  const MOT = {
    es: { set: ['¡Muy bien!', '¡Eso es!', '¡Excelente serie!', '¡Bien hecho, seguí así!', '¡Qué fuerza!', '¡Así se entrena!', '¡Impecable!', '¡Vas muy bien!'],
      mid: ['Respirá profundo y recuperá', 'Soltá los hombros y relajá', 'Tomá un poco de agua', 'Visualizá la próxima serie', 'Cada serie te acerca a tu objetivo', 'La constancia vence al talento'],
      exLast: ['¡Ejercicio terminado! Excelente trabajo.', '¡Listo ese ejercicio! Lo diste todo.', '¡Terminaste! Ese músculo ya trabajó.', '¡Gran trabajo! Uno menos.'],
      sess: ['¡Entrenamiento completo! Estoy orgullosa de vos.', '¡Terminaste la sesión! Hoy ganaste.', '¡Sesión cumplida! Ahora a comer y descansar.'],
      pr: ['¡Subimos el peso! Te estás haciendo más fuerte.', '¡Nuevo récord a la vista! Vamos con todo.', '¡Más carga hoy! Tu progreso se nota.'],
      lastSet: ['Última serie, ¡dejá todo!', 'Última serie, ¡a fondo!', 'Última, ¡vos podés!'] },
    en: { set: ['Great job!', 'That\'s it!', 'Excellent set!', 'Well done, keep it up!', 'So strong!', 'That\'s how you train!', 'Flawless!', 'You\'re doing great!'],
      mid: ['Breathe deep and recover', 'Relax your shoulders', 'Grab some water', 'Visualize your next set', 'Every set gets you closer to your goal', 'Consistency beats talent'],
      exLast: ['Exercise finished! Excellent work.', 'That exercise is done! You gave it all.', 'Finished! That muscle got worked.', 'Great work! One down.'],
      sess: ['Workout complete! I\'m proud of you.', 'Session done! You won today.', 'Session complete! Now eat and rest.'],
      pr: ['Weight goes up! You\'re getting stronger.', 'New record ahead! Let\'s go all in.', 'More load today! Your progress shows.'],
      lastSet: ['Last set, give it everything!', 'Last set, all out!', 'Last one, you\'ve got this!'] },
    pt: { set: ['Muito bem!', 'Isso aí!', 'Excelente série!', 'Bom trabalho, continue assim!', 'Que força!', 'É assim que se treina!', 'Impecável!', 'Você está indo muito bem!'],
      mid: ['Respire fundo e recupere', 'Solte os ombros e relaxe', 'Beba um pouco de água', 'Visualize a próxima série', 'Cada série te aproxima do objetivo', 'A constância vence o talento'],
      exLast: ['Exercício concluído! Excelente trabalho.', 'Esse exercício já foi! Você deu tudo.', 'Terminou! Esse músculo trabalhou.', 'Ótimo trabalho! Menos um.'],
      sess: ['Treino completo! Estou orgulhosa de você.', 'Sessão concluída! Hoje você venceu.', 'Sessão cumprida! Agora coma e descanse.'],
      pr: ['Subimos o peso! Você está ficando mais forte.', 'Novo recorde à vista! Vamos com tudo.', 'Mais carga hoje! Seu progresso aparece.'],
      lastSet: ['Última série, dê tudo!', 'Última série, com tudo!', 'Última, você consegue!'] } };
  const techOn = () => localStorage.getItem('hp_vtech') !== '0';
  const motOn = () => localStorage.getItem('hp_vmot') !== '0';
  const lastPick = {};
  function pick(pool) { const arr = MOT[VL()][pool]; let i, k = VL() + pool; do { i = Math.floor(Math.random() * arr.length); } while (arr.length > 1 && i === lastPick[k]); lastPick[k] = i; return arr[i]; }
  const TECH = { es: 'Técnica', en: 'Technique', pt: 'Técnica' };
  const cuesOf = n => (typeof hpCues === 'function' ? hpCues(n, VL()).cues : []);
  const cueRot = {};
  function oneCue(n) { const c = cuesOf(n); if (!c.length) return ''; const k = VL() + n; cueRot[k] = ((cueRot[k] === undefined ? Math.floor(Math.random() * c.length) : cueRot[k]) + 1) % c.length; return c[cueRot[k]]; }
  const fullCues = n => { const c = cuesOf(n); return c.length ? [TECH[VL()] + ':', ...c] : []; };
  window._hpCoach = { MOT, pick, oneCue, fullCues };
  // Solo voces del celular (speechSynthesis). No se usa la función tts de Gemini ni el bucket de voz.
  const audio = { pause() {} };
  window._hpVoice = { log: [] };
  let unlocked = false;
  function unlock() { // debe correr dentro del toque del usuario (Android/iOS bloquean audio sin gesto)
    try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); unlocked = true; } } catch (e) {}
  }
  document.addEventListener('pointerdown', () => { if (voiceOn() && !unlocked) unlock(); }, { capture: true });
  let sysVoices = [];
  const loadV = () => { try { sysVoices = speechSynthesis.getVoices() || []; } catch (e) {} };
  if ('speechSynthesis' in window) { loadV(); speechSynthesis.onvoiceschanged = () => { loadV(); const s = document.getElementById('vc-voice'); if (s && +s.dataset.n !== sysVoices.length) fillVoices(s); }; }
  const FEM = /female|mujer|femenin|paulina|sabina|m[oó]nica|ang[eé]lica|helena|laura|elvira|dalia|lupe|pe?nelope|samantha|victoria|karen|zira|aria|jenny|ava|allison|susan|luciana|francisca|joana|fernanda|vit[oó]ria|maria|google (español|us english|português)/i;
  const MALE = /male\b|hombre|jorge|diego|carlos|juan|pablo|alex|daniel|fred|tom\b|david|mark|guy|ant[oô]nio|felipe/i;
  const norm = v => String(v.lang || '').replace('_', '-');
  const PREF = { es: ['es-419', 'es-US', 'es-MX', 'es-CO', 'es-AR', 'es-CL', 'es-PY', 'es'], en: ['en-US', 'en-GB', 'en'], pt: ['pt-BR', 'pt'] };
  function bestVoice(l) {
    for (const pre of PREF[l]) {
      const c = sysVoices.filter(v => norm(v).toLowerCase().startsWith(pre.toLowerCase()) && !(l === 'es' && pre === 'es' && /^es-ES/i.test(norm(v))));
      if (!c.length) continue;
      return c.find(v => FEM.test(v.name) && !MALE.test(v.name)) || c.find(v => !MALE.test(v.name)) || c[0];
    }
    return sysVoices.find(v => norm(v).toLowerCase().startsWith(l)) || null;
  }
  function pickVoice(l) {
    loadV(); const saved = localStorage.getItem('hp_vname_' + l);
    return (saved && sysVoices.find(v => v.name === saved)) || bestVoice(l);
  }
  function fillVoices(s) {
    const l = VL(); const pref = PREF[l].map(x => x.toLowerCase());
    const rank = v => { const g = norm(v).toLowerCase(); const i = pref.findIndex(p => g.startsWith(p) && !(l === 'es' && p === 'es' && g.startsWith('es-es'))); return i >= 0 ? i : g.startsWith(l) ? pref.length : 99; };
    const all = sysVoices.slice().sort((a, b) => rank(a) - rank(b) || norm(a).localeCompare(norm(b)) || a.name.localeCompare(b.name));
    const cur = pickVoice(l); const esc = x => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const tag = v => v.localService === true ? ' · local' : v.localService === false ? ' · online' : '';
    const opt = v => `<option value="${esc(v.name)}"${cur && v.name === cur.name ? ' selected' : ''}>${esc(v.name)} (${esc(norm(v))}${tag(v)})</option>`;
    const mine = all.filter(v => rank(v) < 99), rest = all.filter(v => rank(v) >= 99);
    const G = { es: ['Español', 'Otros idiomas'], en: ['English', 'Other languages'], pt: ['Português', 'Outros idiomas'] }[l];
    s.innerHTML = (mine.length ? `<optgroup label="${G[0]}">${mine.map(opt).join('')}</optgroup>` : '') + (rest.length ? `<optgroup label="${G[1]}">${rest.map(opt).join('')}</optgroup>` : '');
    s.dataset.n = sysVoices.length;
  }
  let playId = 0;
  const end = x => /[.!?:,¡¿]$/.test(x) ? x : x + '.';
  // dice una o varias frases en orden, con una pausa breve entre cada una
  function say(t, force) {
    const list = (Array.isArray(t) ? t : [t]).filter(Boolean);
    if (!list.length || (!voiceOn() && !force) || !('speechSynthesis' in window)) return;
    const id = ++playId;
    const speakOne = k => {
      if (id !== playId || k >= list.length) return;
      const u = new SpeechSynthesisUtterance(end(list[k])); const l = VL();
      u.lang = { es: 'es-US', en: 'en-US', pt: 'pt-BR' }[l]; const v = pickVoice(l); if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = 0.97; u.pitch = 1.08;
      let done = false; const next = () => { if (done) return; done = true; setTimeout(() => speakOne(k + 1), 350); };
      u.onend = next; u.onerror = next; setTimeout(next, 4000 + list[k].length * 120); // por si onend no llega
      speechSynthesis.speak(u); window._hpVoice.log.push('sys:' + list[k]);
    };
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(() => speakOne(0), 150); } else speakOne(0); // cancel()+speak() juntos se pierden en Chrome Android
    } catch (e) {}
  }
  const prefetch = () => {};
  window.hpSay = say;
  window.hpUnlock = unlock;
  window.hpHush = function () { playId++; audio.pause(); try { speechSynthesis.cancel(); } catch (e) {} };
  const fixed = () => { const x = P(); return [x.on, x.test, x.ten, x.cd, x.go, x.done, x.exDone, ...[30, 45, 60, 90, 120, 150, 180].map(x.rest), ...(motOn() ? MOT[VL()].set.slice(0, 4) : [])]; };
  let lastSet = null;
  const origCSW = window.completeSetWorkflow;
  if (typeof origCSW === 'function') window.completeSetWorkflow = function (dk, i, s) { lastSet = { dk, i, s }; return origCSW.apply(this, arguments); };
  const prSaid = {};
  function nextInfo(ls) {
    if (!ls) return null;
    if (window.hpSSNext) { const g = window.hpSSNext(ls); if (g) return g; }
    let sets = 0, nextName = '', curName = '', lastEx = false;
    try { const pr = getProgramForUser(getUsersDB()[currentUser] || {}); const exs = pr[ls.dk].exercises; sets = exs[ls.i].sets; curName = exs[ls.i].origName || exs[ls.i].name; const nx = exs[ls.i + 1]; nextName = nx ? (nx.origName || nx.name) : ''; lastEx = !nx; } catch (e) {}
    const tg = window._apTargets && window._apTargets[ls.dk + '_' + ls.i];
    const nm = n => { try { return exName(n); } catch (e) { return n; } };
    if (sets && ls.s >= sets) {
      const msg = [nextName ? P().nextEx(nm(nextName)) : P().go];
      if (nextName && techOn()) msg.push(...fullCues(nextName));
      return { last: true, lastEx, msg };
    }
    const msg = [];
    if (motOn() && tg && tg.w && tg.prevW && tg.w > tg.prevW && !prSaid[ls.dk + ls.i]) { prSaid[ls.dk + ls.i] = 1; msg.push(pick('pr')); }
    if (motOn() && sets && ls.s === sets - 1) msg.push(pick('lastSet'));
    msg.push(tg ? P().next(nm(tg.name), tg.reps || tg.lo, tg.w) : P().go);
    if (techOn() && curName) msg.push(oneCue(curName));
    return { last: false, msg };
  }
  const origST = window.startTimer;
  if (typeof origST === 'function') window.startTimer = function (sec) {
    const r = origST.apply(this, arguments);
    if (voiceOn()) {
      const ls = lastSet; lastSet = null;
      const ni = nextInfo(ls);
      const first = ni && ni.first ? ni.first : !ls ? '' : ni && ni.last ? (ni.lastEx ? (motOn() ? pick('sess') : P().exDone) : (motOn() ? pick('exLast') : P().exDone)) : (motOn() ? pick('set') : P().done);
      say([first, P().rest(sec), ...(window.hpCycleVoice ? window.hpCycleVoice() : []), ...(window.hpFuelVoice ? window.hpFuelVoice() : [])]);
      if (ni) prefetch(ni.msg);
      const mid = sec >= 60 && motOn() ? Math.round(sec / 2) : 0; let saidMid = false;
      clearInterval(window._hpVoiceInt); let said10 = false, said3 = false;
      window._hpVoiceInt = setInterval(() => {
        const left = typeof timerSeconds !== 'undefined' ? timerSeconds : 0;
        if (!voiceOn()) return clearInterval(window._hpVoiceInt);
        if (mid && !saidMid && left <= mid && left > 12) { saidMid = true; say(pick('mid')); }
        if (left <= 10 && left > 5 && !said10 && sec > 15) { said10 = true; say(P().ten); }
        else if (left <= 3 && left > 0 && !said3) { said3 = true; say(P().cd); }
        else if (left <= 0) { clearInterval(window._hpVoiceInt); say(ni ? ni.msg : P().go); }
      }, 500);
    }
    return r;
  };
  const origRT = window.resetTimer;
  if (typeof origRT === 'function') window.resetTimer = function () { clearInterval(window._hpVoiceInt); return origRT.apply(this, arguments); };
  function setVoice(on) {
    localStorage.setItem('hp_voice', on ? '1' : '0');
    if (on) { unlock(); say(P().on, true); prefetch(fixed()); } else { playId++; audio.pause(); try { speechSynthesis.cancel(); } catch (e) {} }
    document.querySelectorAll('.voice-tg,#voice-set-tg').forEach(lab);
  }
  function lab(b) { if (b.id === 'voice-set-tg') { b.textContent = voiceOn() ? '🔊 Activado' : '🔇 Desactivado'; b.classList.toggle('on', voiceOn()); } else b.textContent = voiceOn() ? '🔊 Voz' : '🔇 Voz'; b.setAttribute('aria-pressed', voiceOn()); }
  function voiceToggle() {
    const tb = $('timer-bubble');
    if (tb && !$('voice-tg')) { const b = document.createElement('button'); b.type = 'button'; b.id = 'voice-tg'; b.className = 'voice-tg'; b.onclick = () => setVoice(!voiceOn()); lab(b); tb.appendChild(b); }
    const wt = $('workout-tab');
    if (wt && !$('voice-card')) {
      const c = document.createElement('div'); c.className = 'exercise-card voice-card'; c.id = 'voice-card'; c.dataset.lang = VL();
      const T = { es: ['🎙️ Coach de voz', 'Te habla durante el descanso: cuenta regresiva y tu siguiente serie.', '▶️ Probar voz'], en: ['🎙️ Voice coach', 'Talks to you during rest: countdown and your next set.', '▶️ Test voice'], pt: ['🎙️ Coach de voz', 'Fala com você no descanso: contagem regressiva e sua próxima série.', '▶️ Testar voz'] }[VL()];
      c.innerHTML = `<div class="vc-row"><div><b>${T[0]}</b><div class="vc-sub">${T[1]}</div></div><div class="vc-btns"><button type="button" id="voice-set-tg" class="btn-3d btn-small"></button><button type="button" id="voice-test" class="btn-3d btn-small">${T[2]}</button></div></div>`;
      const T2 = { es: ['🎯 Decir técnica', '💪 Frases de ánimo'], en: ['🎯 Say technique', '💪 Encouragement'], pt: ['🎯 Dizer técnica', '💪 Frases de ânimo'] }[VL()];
      c.innerHTML += `<div class="vc-opts"><label class="pro-sw"><input type="checkbox" id="vc-tech" ${techOn() ? 'checked' : ''}> ${T2[0]}</label><label class="pro-sw"><input type="checkbox" id="vc-mot" ${motOn() ? 'checked' : ''}> ${T2[1]}</label></div>`;
      c.innerHTML += `<div class="vc-opts"><label>${{ es: '🗣️ Voz', en: '🗣️ Voice', pt: '🗣️ Voz' }[VL()]} <select id="vc-voice" style="max-width:230px;font-size:16px"></select></label></div>`;
      wt.insertBefore(c, wt.firstChild);
      $('vc-tech').onchange = e => localStorage.setItem('hp_vtech', e.target.checked ? '1' : '0');
      $('vc-mot').onchange = e => localStorage.setItem('hp_vmot', e.target.checked ? '1' : '0');
      fillVoices($('vc-voice')); $('vc-voice').onchange = e => { localStorage.setItem('hp_vname_' + VL(), e.target.value); unlock(); say(P().test, true); };
      $('voice-set-tg').onclick = () => setVoice(!voiceOn());
      $('voice-test').onclick = () => { unlock(); say(P().test, true); };
      lab($('voice-set-tg'));
    }
  }
  voiceToggle();
  // 🎯 Técnica en cada tarjeta + claves habladas al empezar un ejercicio
  const spokenStart = {};
  function techCards() {
    const vc = $('voice-card'); if (vc && vc.dataset.lang !== VL()) { vc.remove(); voiceToggle(); }
    if (!currentUser) return; let prog; try { prog = getProgramForUser(getUsersDB()[currentUser] || {}); } catch (e) { return; }
    const H = { es: '🎯 Técnica', en: '🎯 Technique', pt: '🎯 Técnica' }[VL()];
    document.querySelectorAll('#exercises-container .exercise-card[id^="card_"]').forEach(card => {
      const m = card.id.match(/^card_(.+)_(\d+)$/); if (!m) return; const ex = prog[m[1]] && prog[m[1]].exercises[+m[2]]; if (!ex) return;
      const n = ex.origName || ex.name; const c = cuesOf(n); if (!c.length) return;
      let b = card.querySelector('.tech-box'); if (!b) { b = document.createElement('div'); b.className = 'tech-box'; const note = card.querySelector('.exercise-note'); note ? note.after(b) : card.appendChild(b); }
      b.innerHTML = `<div class="tech-h"><b>${H}</b><button type="button" class="tech-say" aria-label="${H}">🔊</button></div><ul>${c.map((x, j) => `<li${j === c.length - 1 ? ' class="tech-safe"' : ''}>${j === c.length - 1 ? '⚠️ ' : ''}${x}</li>`).join('')}</ul>`;
      b.querySelector('.tech-say').onclick = ev => { ev.stopPropagation(); unlock(); say(fullCues(n), true); };
      card.dataset.techName = n;
    });
  }
  document.addEventListener('pointerdown', ev => {
    if (!voiceOn() || !techOn()) return; const card = ev.target.closest && ev.target.closest('#exercises-container .exercise-card[id^="card_"]'); if (!card || !card.dataset.techName || ev.target.closest('.tech-say')) return;
    if (card.querySelector('.btn-complete') || card.classList.contains('card-completed')) return; // ya empezó
    const k = today() + card.id; if (spokenStart[k]) return; spokenStart[k] = 1;
    if (ev.target.closest('button[id^="btn_"]')) return; // al marcar serie habla el flujo del descanso
    say(fullCues(card.dataset.techName));
  }, { capture: true });
  const origLWD2 = window.loadWorkoutDay;
  if (typeof origLWD2 === 'function') window.loadWorkoutDay = function () { const r = origLWD2.apply(this, arguments); try { techCards(); } catch (e) { console.warn(e); } return r; };
  setTimeout(() => { try { techCards(); } catch (e) {} }, 500);
  if (voiceOn()) setTimeout(() => prefetch(fixed()), 3000);

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
