/* Hipertrofia Pro — 6 funciones Pro: físico IA, técnica IA, preparación, comida local, coach humano, rankings */
(function () {
  const $ = id => document.getElementById(id);
  const E = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = () => (typeof LANG !== 'undefined' ? LANG : 'es');
  const TX = {
    es: { physique: 'Análisis de físico IA', technique: 'Técnica por video IA', comp: 'Preparación para competir', coachh: 'Coach humano', rank: 'Rankings y retos', locked: 'Esta función es parte del plan Pro.', seePlans: 'Ver planes', soon: 'Próximamente: la IA todavía no está activada.', notifyBtn: 'Activar notificaciones', notifyHint: 'Así te avisamos cuando el coach responda, aunque la app esté cerrada.', notifyHintAdmin: 'Así te avisamos cuando un usuario te escriba, aunque la app esté cerrada.', notifyOn: 'Notificaciones activadas', notifyDenied: 'Las notificaciones están bloqueadas. Activalas desde los ajustes del teléfono o del navegador.' },
    en: { physique: 'AI physique analysis', technique: 'AI technique check', comp: 'Contest prep', coachh: 'Human coach', rank: 'Rankings & challenges', locked: 'This feature is part of the Pro plan.', seePlans: 'See plans', soon: 'Coming soon: AI is not enabled yet.', notifyBtn: 'Enable notifications', notifyHint: 'We will notify you when the coach replies, even if the app is closed.', notifyHintAdmin: 'We will notify you when a user writes to you, even if the app is closed.', notifyOn: 'Notifications enabled', notifyDenied: 'Notifications are blocked. Enable them in your phone or browser settings.' },
    pt: { physique: 'Análise de físico IA', technique: 'Técnica por vídeo IA', comp: 'Preparação para competir', coachh: 'Coach humano', rank: 'Rankings e desafios', locked: 'Este recurso faz parte do plano Pro.', seePlans: 'Ver planos', soon: 'Em breve: a IA ainda não está ativada.', notifyBtn: 'Ativar notificações', notifyHint: 'Assim avisamos quando o coach responder, mesmo com o app fechado.', notifyHintAdmin: 'Assim avisamos quando um usuário te escrever, mesmo com o app fechado.', notifyOn: 'Notificações ativadas', notifyDenied: 'As notificações estão bloqueadas. Ative-as nos ajustes do telefone ou do navegador.' }
  };
  const tx = k => (TX[L()] || TX.es)[k] || TX.es[k];
  const pro = () => !!(window._access && window._access.has_access);
  const uid = () => (typeof cloudUserId !== 'undefined' && cloudUserId) || null;
  const toast = m => (typeof showToast === 'function' ? showToast(m) : alert(m));
  const dt = d => new Date(d).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: 'short', year: 'numeric' });
  const gs = n => '₲ ' + Math.round(n).toLocaleString('es-PY');
  const store = { get(k, d) { try { return JSON.parse(cloudStore.getItem(k + '_' + currentUser) || 'null') ?? d; } catch (e) { return d; } }, set(k, v) { cloudStore.setItem(k + '_' + currentUser, JSON.stringify(v)); } };
  const lockHTML = () => `<div class="exercise-card pro-lock"><p>🔒 ${tx('locked')}</p><button class="btn-3d" onclick="openPlans(false)">${tx('seePlans')}</button></div>`;
  const DISC = '<p class="pc-note pro-disc">⚠️ Orientativo, generado por IA. No reemplaza a un entrenador presencial ni a un profesional de la salud. Ante dolor o lesión, frená y consultá a un médico.</p>';

  // ---------- estructura: pestañas + menú Más ----------
  const TABS = [['physique-tab', '📸', 'physique'], ['technique-tab', '🎥', 'technique'], ['comp-tab', '🏆', 'comp'], ['coachh-tab', '🧑‍🏫', 'coachh'], ['rank-tab', '🥇', 'rank']];
  const bar = document.querySelector('.tab-btn')?.parentElement;
  const anchor = $('admin-tab');
  TABS.forEach(([id, ic, k]) => {
    const div = document.createElement('div'); div.id = id; div.className = 'tab-content'; div.innerHTML = `<div class="exercise-card"><h2 class="pc-title">${ic} <span data-px="${k}"></span></h2><div id="${id}-body"></div></div>`;
    anchor.parentNode.insertBefore(div, anchor);
    const b = document.createElement('button'); b.className = 'tab-btn'; b.style.display = 'none'; b.setAttribute('onclick', `switchTab('${id}', this)`); b.dataset.pxtab = '1'; b.textContent = k; bar && bar.appendChild(b);
  });
  const sheet = document.querySelector('#more-sheet .more-card'), before = sheet.querySelector('[data-m="history-tab"]');
  const hdr = document.createElement('div'); hdr.className = 'more-sec'; hdr.textContent = '⭐ Pro'; sheet.insertBefore(hdr, before);
  TABS.forEach(([id, ic, k]) => { const b = document.createElement('button'); b.type = 'button'; if (k === 'coachh') b.id = 'more-coachh'; b.innerHTML = `${ic} <span data-px="${k}"></span>${k === 'coachh' ? ' <span class="badge hp-nbadge" id="ch-more-badge" hidden></span>' : ''}`; b.addEventListener('click', () => { hpMore(false); switchTab(id); scrollTo({ top: 0 }); }); sheet.insertBefore(b, before); });
  const hr = document.createElement('div'); hr.className = 'more-sec'; hr.innerHTML = '&nbsp;'; sheet.insertBefore(hr, before);
  function labels() { document.querySelectorAll('[data-px]').forEach(e => e.textContent = tx(e.dataset.px)); }
  let ll = null; setInterval(() => { if (L() !== ll) { ll = L(); labels(); } }, 800); labels();
  // botones de pestaña visibles cuando hay sesión (necesario para el historial/atrás)
  function syncBtns() { const on = !!currentUser; document.querySelectorAll('[data-pxtab]').forEach(b => { b.style.display = on ? '' : 'none'; b.classList.add('px-hidden'); }); }
  setInterval(syncBtns, 1000);

  const RENDER = { 'physique-tab': renderPhysique, 'technique-tab': renderTechnique, 'comp-tab': renderComp, 'coachh-tab': renderCoachH, 'rank-tab': renderRank };
  const origSwitch = window.switchTab;
  window.switchTab = function (id, btn) {
    btn = btn || document.querySelector(`.tab-btn[onclick*="'${id}'"]`);
    const r = origSwitch.call(this, id, btn);
    try { if (RENDER[id]) RENDER[id](); if (id === 'admin-tab') renderInbox(); } catch (e) { console.warn(e); }
    return r;
  };

  let aiStatus = null;
  async function aiEnabled() {
    if (aiStatus) return aiStatus;
    try { const { data } = await sb.functions.invoke('ai-vision', { body: { kind: 'status' } }); aiStatus = data || { enabled: false }; } catch (e) { aiStatus = { enabled: false }; }
    return aiStatus;
  }
  async function aiCall(body) {
    const { data, error } = await sb.functions.invoke('ai-vision', { body: Object.assign({ lang: L() }, body) });
    if (error) { let j = null; try { j = await error.context.json(); } catch (_) {} return { error: (j && j.error) || 'fail', limit: j && j.limit }; }
    return data;
  }
  const aiErr = r => ({ limit: `Llegaste al límite mensual (${r.limit}). Se renueva el mes que viene.`, nokey: tx('soon'), pro: tx('locked'), photos: 'No se pudieron leer las fotos. Probá de nuevo.', frames: 'No se pudieron extraer cuadros del video.' }[r.error] || 'La IA no pudo responder. Probá de nuevo en un momento.');

  function resizeImg(file, max = 1024, q = 0.8) {
    return new Promise((res, rej) => {
      const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); c.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', q); };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  // ---------- 1. FÍSICO ----------
  const MUS = { hombros: ['side_delt', 'rear_delt'], pecho: ['chest', 'upper_chest'], espalda: ['lats', 'midback'], brazos: ['biceps', 'triceps'], abdomen: ['abs'], cuadriceps: ['quads'], isquios: ['hams'], gluteos: ['glutes', 'abductors'], pantorrillas: ['calves'] };
  const MUSN = { hombros: 'Hombros', pecho: 'Pecho', espalda: 'Espalda', brazos: 'Brazos', abdomen: 'Abdomen', cuadriceps: 'Cuádriceps', isquios: 'Isquios', gluteos: 'Glúteos', pantorrillas: 'Pantorrillas' };
  const phyFiles = {};
  async function renderPhysique() {
    const box = $('physique-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const st = await aiEnabled();
    const ai = store.get('hp_aiweak', null);
    box.innerHTML = `<p class="pc-note">Subí 3 fotos con buena luz, de cuerpo entero y en la misma pose cada vez. La IA marca los músculos atrasados según tu categoría (<b>${E(goalLabel((getUsersDB()[currentUser] || {}).goal))}</b>) y te sugiere series extra.</p>
      ${st.enabled ? '' : `<p class="pro-soon">${tx('soon')}</p>`}
      <div class="phy-grid">${['front', 'side', 'back'].map((k, i) => `<label class="phy-slot" id="phy-${k}"><input type="file" accept="image/*" hidden data-k="${k}"><span>${['Frente', 'Perfil', 'Espalda'][i]}</span><small>Tocá para subir</small></label>`).join('')}</div>
      <button class="btn-3d" id="phy-go" ${st.enabled ? '' : 'disabled'}>🔍 Analizar físico</button>
      <p class="pc-note">🔒 Las fotos se guardan en privado y solo vos podés verlas. Límite: ${st.limits?.physique ?? 5} análisis por mes.</p>
      <div id="phy-out"></div>
      ${ai ? `<div class="pro-box"><b>Ajuste activo en tu rutina:</b> +series para ${ai.muscles.map(m => MUSN[m] || m).join(', ')} <button class="btn-3d btn-small btn-secondary" id="phy-clear">Quitar</button></div>` : ''}
      ${DISC}<h3 class="adm-h">Historial</h3><div id="phy-hist" class="pc-note">Cargando…</div>`;
    box.querySelectorAll('input[type=file]').forEach(inp => inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return; phyFiles[inp.dataset.k] = f;
      const sl = $('phy-' + inp.dataset.k); sl.style.backgroundImage = `url(${URL.createObjectURL(f)})`; sl.classList.add('has');
    }));
    Object.entries(phyFiles).forEach(([k, f]) => { const sl = $('phy-' + k); sl.style.backgroundImage = `url(${URL.createObjectURL(f)})`; sl.classList.add('has'); });
    $('phy-go').onclick = analyzePhysique;
    if ($('phy-clear')) $('phy-clear').onclick = () => { store.set('hp_aiweak', null); applyAiWeak(); renderPhysique(); toast('Ajuste quitado'); };
    loadPhyHist();
  }
  async function analyzePhysique() {
    if (!['front', 'side', 'back'].every(k => phyFiles[k])) { toast('Subí las 3 fotos: frente, perfil y espalda'); return; }
    const btn = $('phy-go'), out = $('phy-out'); btn.disabled = true; btn.textContent = '⏳ Analizando… (hasta 30 s)';
    try {
      const ts = Date.now(), paths = [];
      for (const k of ['front', 'side', 'back']) {
        const blob = await resizeImg(phyFiles[k]); const p = `${uid()}/${ts}-${k}.jpg`;
        const { error } = await sb.storage.from('physique').upload(p, blob, { contentType: 'image/jpeg' }); if (error) throw error; paths.push(p);
      }
      const u = getUsersDB()[currentUser] || {};
      const r = await aiCall({ kind: 'physique', paths, category: goalLabel(u.goal), sex: u.gender });
      if (r.error) { out.innerHTML = `<p class="pro-err">${aiErr(r)}</p>`; return; }
      out.innerHTML = phyResult(r.result, true);
      const ap = $('phy-apply'); if (ap) ap.onclick = () => { const ms = (r.result.adjustments || []).map(a => a.muscle).filter(m => MUS[m]); store.set('hp_aiweak', { muscles: ms, date: new Date().toISOString() }); applyAiWeak(); toast('Rutina ajustada ✅'); renderPhysique(); };
      for (const k in phyFiles) delete phyFiles[k];
      loadPhyHist();
    } catch (e) { console.warn(e); out.innerHTML = `<p class="pro-err">No se pudo subir/analizar. Revisá tu conexión.</p>`; }
    finally { btn.disabled = false; btn.textContent = '🔍 Analizar físico'; }
  }
  function phyResult(r, canApply) {
    if (!r || r.valid === false) return `<p class="pro-err">${E(r && r.summary || 'Las fotos no se pudieron evaluar.')}</p>`;
    return `<div class="pro-box"><p>${E(r.summary)}</p>
      <div class="phy-bars">${(r.scores || []).map(s => `<div><span>${E(MUSN[s.muscle] || s.muscle)}</span><i style="--w:${Math.max(0, Math.min(10, s.score)) * 10}%"></i><b>${s.score}</b></div>`).join('')}</div>
      ${(r.adjustments || []).length ? `<p><b>Prioridades sugeridas:</b></p><ul>${r.adjustments.map(a => `<li><b>${E(MUSN[a.muscle] || a.muscle)}</b>: +${a.extra_sets} series/semana. ${E(a.tip)}</li>`).join('')}</ul>` : ''}
      ${canApply && (r.adjustments || []).length ? '<button class="btn-3d" id="phy-apply">✅ Aplicar a mi rutina</button>' : ''}</div>`;
  }
  async function loadPhyHist() {
    const el = $('phy-hist'); if (!el) return;
    const { data, error } = await sb.from('physique_checks').select('id,created_at,category,photos,result').order('created_at', { ascending: false }).limit(12);
    if (error || !data || !data.length) { el.textContent = 'Todavía no hiciste ningún análisis.'; return; }
    const all = data.flatMap(d => d.photos || []);
    const { data: urls } = await sb.storage.from('physique').createSignedUrls(all, 3600);
    const U = {}; (urls || []).forEach(x => { U[x.path] = x.signedUrl; });
    el.innerHTML = data.map(d => `<details class="phy-h"><summary>${dt(d.created_at)} · ${E(d.category)} · atrasados: ${E((d.result?.lagging || []).join(', ') || '—')}</summary>
      <div class="phy-thumbs">${(d.photos || []).map(p => U[p] ? `<img src="${U[p]}" alt="" loading="lazy">` : '').join('')}</div>${phyResult(d.result, false)}</details>`).join('') +
      (data.length > 1 ? '<p class="pc-note">Abrí dos análisis para comparar tu evolución.</p>' : '');
  }
  // integrar con el generador de rutina: los músculos atrasados por IA cuentan como puntos débiles
  const origWP = window.analyzeWeakPoints;
  if (typeof origWP === 'function') window.analyzeWeakPoints = function (u) {
    const r = origWP.apply(this, arguments);
    try { const ai = store.get('hp_aiweak', null); if (ai && ai.muscles) ai.muscles.forEach(m => (MUS[m] || []).forEach(x => { if (!r.weak.includes(x)) r.weak.push(x); const i = r.strong.indexOf(x); if (i >= 0) r.strong.splice(i, 1); })); } catch (e) {}
    return r;
  };
  function applyAiWeak() { try { _programCache = null; _programSig = ''; } catch (e) {} if (typeof refreshAll === 'function') try { refreshAll(); } catch (e) {} }

  // ---------- 2. TÉCNICA ----------
  async function extractFrames(file, n = 8) {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('video')); setTimeout(() => rej(new Error('video')), 15000); });
    if (!isFinite(v.duration) || v.duration > 90) throw new Error('long');
    const c = document.createElement('canvas'), out = [];
    for (let i = 0; i < n; i++) {
      v.currentTime = Math.min(v.duration - 0.05, (v.duration * (i + 0.5)) / n);
      await new Promise(r => { v.onseeked = r; setTimeout(r, 2000); });
      const s = Math.min(1, 448 / Math.max(v.videoWidth, v.videoHeight)); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); out.push(c.toDataURL('image/jpeg', 0.7));
    }
    URL.revokeObjectURL(v.src); return out;
  }
  let tecFrames = null;
  async function renderTechnique() {
    const box = $('technique-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const st = await aiEnabled();
    box.innerHTML = `<p class="pc-note">Filmá UNA serie de costado (máx. 60 s), con todo el cuerpo y la barra a la vista. La app extrae 8 cuadros en tu teléfono (el video no se sube) y la IA te dice si hiciste el rango completo, si hubo trampa y cuántas repeticiones te quedaban (RIR).</p>
      ${st.enabled ? '' : `<p class="pro-soon">${tx('soon')}</p>`}
      <label class="field-label" for="tec-ex">Ejercicio</label><input id="tec-ex" list="tec-exl" placeholder="Ej: Sentadilla con barra">
      <datalist id="tec-exl">${['Sentadilla con barra', 'Press de banca', 'Peso muerto', 'Peso muerto rumano', 'Hip thrust', 'Press militar', 'Remo con barra', 'Dominadas', 'Curl con barra', 'Prensa'].map(x => `<option>${x}</option>`).join('')}</datalist>
      <label class="btn-3d btn-secondary tec-pick">🎥 Elegir o grabar video<input type="file" accept="video/*" hidden id="tec-file"></label>
      <div id="tec-frames" class="tec-frames"></div>
      <button class="btn-3d" id="tec-go" ${st.enabled ? '' : 'disabled'}>🔍 Revisar técnica</button>
      <p class="pc-note">Límite: ${st.limits?.technique ?? 10} revisiones por mes.</p><div id="tec-out"></div>
      <p class="pc-note pro-disc">⚠️ La revisión es una estimación de IA hecha con pocos cuadros. Puede equivocarse, sobre todo con el RIR. No reemplaza a un entrenador presencial. Si sentís dolor, frená y consultá a un profesional de la salud.</p>
      <h3 class="adm-h">Historial</h3><div id="tec-hist" class="pc-note">Cargando…</div>`;
    $('tec-file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; $('tec-frames').textContent = '⏳ Extrayendo cuadros…';
      try { tecFrames = await extractFrames(f); $('tec-frames').innerHTML = tecFrames.map(s => `<img src="${s}" alt="">`).join(''); }
      catch (err) { tecFrames = null; $('tec-frames').textContent = err.message === 'long' ? 'El video es muy largo: usá uno de una sola serie (máx. 60 s).' : 'No se pudo leer el video. Probá con otro formato.'; }
    };
    if (tecFrames) $('tec-frames').innerHTML = tecFrames.map(s => `<img src="${s}" alt="">`).join('');
    $('tec-go').onclick = async () => {
      if (!tecFrames) { toast('Elegí primero el video de tu serie'); return; }
      const b = $('tec-go'); b.disabled = true; b.textContent = '⏳ Revisando…';
      const r = await aiCall({ kind: 'technique', frames: tecFrames, exercise: $('tec-ex').value });
      b.disabled = false; b.textContent = '🔍 Revisar técnica';
      $('tec-out').innerHTML = r.error ? `<p class="pro-err">${aiErr(r)}</p>` : tecResult(r.result);
      if (!r.error) { tecFrames = null; $('tec-frames').innerHTML = ''; loadTecHist(); }
    };
    loadTecHist();
  }
  const ROM = { completo: '✅ Rango completo', parcial: '⚠️ Rango parcial', no_visible: '❔ Rango no visible' };
  function tecResult(r) {
    if (!r || r.valid === false) return `<p class="pro-err">${E(r && r.summary || 'No se pudo evaluar la serie.')}</p>`;
    return `<div class="pro-box"><p><b>${E(r.exercise || '')}</b> ${E(r.summary)}</p>
      <div class="tec-kpi"><div><b>${ROM[r.rom] || ''}</b><small>${E(r.rom_note || '')}</small></div><div><b>RIR ≈ ${r.rir}</b><small>confianza ${E(r.confidence)}</small></div></div>
      ${(r.cheating || []).length ? `<p><b>Compensaciones:</b> ${r.cheating.map(E).join(', ')}</p>` : '<p>✅ Sin trampas visibles.</p>'}
      ${(r.cues || []).length ? `<p><b>Para la próxima:</b></p><ul>${r.cues.map(c => `<li>${E(c)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  async function loadTecHist() {
    const el = $('tec-hist'); if (!el) return;
    const { data } = await sb.from('technique_checks').select('created_at,exercise,result').order('created_at', { ascending: false }).limit(10);
    el.innerHTML = data && data.length ? data.map(d => `<details class="phy-h"><summary>${dt(d.created_at)} · ${E(d.exercise || d.result?.exercise || '')} · RIR ${d.result?.rir ?? '–'}</summary>${tecResult(d.result)}</details>`).join('') : 'Todavía no revisaste ninguna serie.';
  }

  // ---------- 3. PREPARACIÓN PARA COMPETIR ----------
  const POSES = {
    open: ['Doble bíceps de frente|Brazos arriba a 90°, abrí dorsales, cuádriceps marcados y abdomen apretado.', 'Dorsales de frente|Puños en la cintura, empujá los codos hacia adelante y abrí la espalda.', 'Pecho de costado|Rodilla delantera flexionada, empujá el pecho arriba y apretá el bíceps.', 'Doble bíceps de espalda|Un pie atrás en puntas (pantorrilla), arqueá la espalda y contraé.', 'Dorsales de espalda|Puños en la cintura, abrí la espalda de a poco desde abajo.', 'Tríceps de costado|Brazo extendido, agarrá la muñeca por detrás y apretá tríceps y pierna.', 'Abdominales y muslo|Manos detrás de la cabeza, una pierna adelante, exhalá y contraé todo.'],
    classic: [], mens_physique: ['Pose de frente|Una mano en la cintura, hombros anchos, abdomen contraído, sonrisa.', 'Giro a la derecha|Cuarto de giro, mostrá la línea del hombro y la cintura chica.', 'Pose de espalda|Abrí dorsales, una mano en la cadera, mirá al costado.', 'Giro a la izquierda|Cuarto de giro, postura relajada y segura.', 'Transición (walk)|Caminata al centro, pausa, giro fluido.'],
    bikini: ['Pose de frente|Cadera hacia un lado, mano en el muslo, cintura chica, hombros atrás.', 'Pose de espalda|Arqueá la zona lumbar, glúteo arriba, cabeza girada al juez.', 'Giros (cuartos)|Transiciones suaves de frente a espalda.', 'T-walk|Caminata con poses en cada punto de la T, sonrisa constante.'],
    wellness: ['Pose de frente|Piernas separadas, cuádriceps visibles, cintura contraída.', 'Costado|Glúteo e isquio marcados, torso girado al juez.', 'Pose de espalda|Glúteos y piernas contraídas, espalda arqueada.', 'Transiciones|Fluidas, mostrando el tren inferior.'],
    figure: ['Frente (cuarto)|Dorsales abiertos, manos abiertas, cintura apretada.', 'Costado derecho|Hombros redondos, piernas marcadas.', 'Espalda|Abrí dorsales en V, glúteos firmes.', 'Costado izquierdo|Mismo control que el derecho.'],
    womens_physique: ['Doble bíceps de frente (manos abiertas)|Brazos a 90°, piernas marcadas.', 'Tríceps de costado|Brazo extendido, pierna flexionada.', 'Doble bíceps de espalda|Pie atrás en puntas, espalda contraída.', 'Abdominales y muslo|Manos atrás de la cabeza, exhalá y contraé.']
  };
  POSES.classic = POSES.open.concat(['Pose favorita clásica (vacío)|Abdomen hacia adentro (vacuum), brazos arriba, línea estética clásica.']);
  const COMP_CATS = { open: "Men's Bodybuilding (Open)", classic: 'Classic Physique', mens_physique: "Men's Physique", bikini: 'Bikini', wellness: 'Wellness', figure: 'Figure', womens_physique: "Women's Physique" };
  let poseTimer = null;
  function renderComp() {
    const box = $('comp-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const u = getUsersDB()[currentUser] || {}; const c = store.get('hp_comp', null) || { date: '', cat: COMP_CATS[u.goal] ? u.goal : (u.gender === 'mujer' ? 'bikini' : 'classic'), done: {} };
    const days = c.date ? Math.ceil((new Date(c.date + 'T12:00:00') - new Date()) / 864e5) : null;
    const ph = days == null ? null : days < 0 ? ['post', 'Post-show', 'Dieta inversa: sumá 100–150 kcal por semana, bajá el cardio de a poco y descansá. Hacete un control médico.'] : days <= 7 ? ['peak', 'Peak week', 'Semana final: mantené el entrenamiento liviano y practicá poses todos los días.'] : days <= 112 ? ['cut', 'Definición (prep)', 'Déficit moderado (−0,5 a −1 % del peso por semana), proteína 2,0–2,5 g/kg, cardio progresivo y fotos semanales.'] : ['off', 'Off-season', 'Construí músculo con superávit moderado y priorizá los puntos débiles. La definición arranca 16 semanas antes del show.'];
    const poses = POSES[c.cat] || POSES.classic;
    box.innerHTML = `<div class="grid-2"><div><label class="field-label" for="cp-date">Fecha del torneo</label><input type="date" id="cp-date" value="${E(c.date)}"></div>
      <div><label class="field-label" for="cp-cat">Categoría</label><select id="cp-cat">${Object.entries(COMP_CATS).map(([k, v]) => `<option value="${k}" ${k === c.cat ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
      ${days == null ? '<p class="pc-note">Elegí la fecha de tu torneo para ver la cuenta regresiva y las fases.</p>' : `
      <div class="cp-count"><b>${Math.abs(days)}</b><span>${days >= 0 ? 'días para el show' : 'días desde el show'} · ${days >= 0 ? (days / 7).toFixed(1) + ' semanas' : ''}</span></div>
      <div class="cp-phases">${[['off', 'Off-season'], ['cut', 'Definición'], ['peak', 'Peak week'], ['post', 'Post-show']].map(([k, n]) => `<span class="${ph[0] === k ? 'on' : ''}">${n}</span>`).join('')}</div>
      <div class="pro-box"><b>Fase actual: ${ph[1]}</b><p>${ph[2]}</p></div>`}
      ${ph && ph[0] === 'peak' || days == null || days <= 21 ? `<details class="phy-h" ${ph && ph[0] === 'peak' ? 'open' : ''}><summary>🗓️ Guía de peak week (orientativa)</summary>
        <table class="cp-tbl"><tr><th>Día</th><th>Carbohidratos</th><th>Agua</th><th>Entreno</th></tr>
        <tr><td>−7 a −5</td><td>Bajos-moderados (como en la prep)</td><td>Normal (35–45 ml/kg)</td><td>Liviano, bombeo</td></tr>
        <tr><td>−4 a −2</td><td>Carga: 6–8 g/kg, fuentes simples (arroz, mandioca, papa)</td><td>Normal, no cortes</td><td>Solo poses</td></tr>
        <tr><td>−1</td><td>Moderados, ajustá según cómo te veas</td><td>Normal, repartida</td><td>Poses suaves</td></tr>
        <tr><td>Show</td><td>Comidas chicas y conocidas</td><td>Sorbos a demanda</td><td>Bombeo previo</td></tr></table>
        <p class="pro-err">⚠️ <b>Salud primero:</b> NO cortes el agua, NO uses diuréticos ni elimines el sodio de golpe. Esas prácticas causan calambres, desmayos, arritmias e insuficiencia renal, y hubo muertes por eso. Cualquier ajuste fuerte hacelo solo con un profesional de la salud y un coach con experiencia. Esta guía es educativa.</p></details>` : ''}
      <h3 class="adm-h">🕺 Práctica de poses obligatorias</h3>
      <div class="cp-timer"><select id="cp-secs"><option>10</option><option selected>20</option><option>30</option><option>60</option></select> s por pose <button class="btn-3d btn-small" id="cp-start">▶️ Practicar rutina</button><b id="cp-clock"></b></div>
      <ul class="cp-poses">${poses.map((p, i) => { const [n, d] = p.split('|'); return `<li id="cp-p${i}"><label><input type="checkbox" data-i="${i}" ${c.done && c.done[c.cat + i] === new Date().toISOString().slice(0, 10) ? 'checked' : ''}> <b>${n}</b></label><small>${d}</small></li>`; }).join('')}</ul>
      <p class="pc-note">Marcá las poses que practicaste hoy. Practicá frente al espejo y filmate una vez por semana.</p>`;
    const save = () => { c.date = $('cp-date').value; c.cat = $('cp-cat').value; store.set('hp_comp', c); renderComp(); };
    $('cp-date').onchange = save; $('cp-cat').onchange = save;
    box.querySelectorAll('.cp-poses input').forEach(ch => ch.onchange = () => { c.done = c.done || {}; c.done[c.cat + ch.dataset.i] = ch.checked ? new Date().toISOString().slice(0, 10) : null; store.set('hp_comp', c); });
    $('cp-start').onclick = () => {
      if (poseTimer) { clearInterval(poseTimer); poseTimer = null; $('cp-clock').textContent = ''; $('cp-start').textContent = '▶️ Practicar rutina'; box.querySelectorAll('.cp-poses li').forEach(l => l.classList.remove('now')); return; }
      const secs = +$('cp-secs').value; let i = 0, left = secs; $('cp-start').textContent = '⏹️ Parar';
      const mark = () => box.querySelectorAll('.cp-poses li').forEach((l, j) => l.classList.toggle('now', j === i));
      mark(); $('cp-clock').textContent = `${left}s`;
      poseTimer = setInterval(() => {
        left--; if (left <= 0) { const ch = box.querySelector(`.cp-poses input[data-i="${i}"]`); if (ch && !ch.checked) { ch.checked = true; ch.onchange(); } i++; left = secs; if (navigator.vibrate) navigator.vibrate(200); if (i >= poses.length) { $('cp-start').click(); toast('¡Rutina de poses completa! 💪'); return; } mark(); }
        if ($('cp-clock')) $('cp-clock').textContent = `${left}s`; else { clearInterval(poseTimer); poseTimer = null; }
      }, 1000);
    };
  }

  // ---------- 4. COMIDA LOCAL + LISTA DE COMPRAS ----------
  const LOCAL = {
    chipa: { n: 'Chipa', p: 9, c: 45, f: 15, unit: 60, un: 'u' }, sopa: { n: 'Sopa paraguaya', p: 9, c: 25, f: 15 }, chipaguasu: { n: 'Chipa guasu', p: 8, c: 22, f: 12 },
    mbeju: { n: 'Mbeju', p: 7, c: 35, f: 12 }, vacio: { n: 'Vacío (asado, cocido)', p: 26, c: 0, f: 17 }, costilla: { n: 'Costilla / asado de tira (cocida)', p: 24, c: 0, f: 25 },
    cuadril: { n: 'Colita de cuadril (cocida)', p: 29, c: 0, f: 8 }, locro: { n: 'Locro', p: 4, c: 16, f: 2 }, kiveve: { n: 'Kiveve', p: 3, c: 15, f: 6 },
    pirapire: { n: 'Pira caldo', p: 8, c: 3, f: 4 }, quesopy: { n: 'Queso Paraguay (entero)', p: 20, c: 2, f: 22 }, mandiocaf: { n: 'Mandioca frita', p: 1.5, c: 40, f: 10 }
  };
  const PORTION = { chipa: '1 chipa mediana (60 g)', sopa: '1 porción (150 g)', chipaguasu: '1 porción (150 g)', mbeju: '1 mbeju (100 g)', vacio: '1 porción (200 g)', costilla: '1 porción (200 g)', cuadril: '1 porción (200 g)', locro: '1 plato (300 g)', kiveve: '1 porción (200 g)', pirapire: '1 plato (300 ml)', quesopy: '1 feta (30 g)', mandiocaf: '1 porción (150 g)' };
  const PG = { chipa: 60, sopa: 150, chipaguasu: 150, mbeju: 100, vacio: 200, costilla: 200, cuadril: 200, locro: 300, kiveve: 200, pirapire: 300, quesopy: 30, mandiocaf: 150 };
  // precio ₲/kg (o ₲/u) aproximado y factor cocido→crudo
  const PRICE = { pollo: [30000, 1.35], carne: [55000, 1.35], pescado: [45000, 1.3], cerdo: [40000, 1.35], atun: [70000, 1], huevo: [1000, 1, 'u'], claras: [1000, 1, 'u'], yogur: [12000, 1], leche: [7000, 1], queso: [40000, 1], whey: [225000, 1],
    arroz: [8000, 0.37], mandioca: [5000, 1.1], fideos: [9000, 0.43], papa: [7000, 1.05], batata: [6000, 1.1], poroto: [15000, 0.4], avena: [20000, 1], pan: [20000, 1], galleta: [40000, 1], banana: [6000, 1.4], manzana: [15000, 1.1], naranja: [4000, 1.5], mamon: [6000, 1.3],
    aceite: [18000, 1], palta: [15000, 1.4], mani: [35000, 1], ensalada: [10000, 1.2], verduras: [9000, 1.2], chipa: [3000, 1, 'u'], sopa: [40000, 1], chipaguasu: [40000, 1], mbeju: [30000, 1], vacio: [50000, 1.4], costilla: [45000, 1.5], cuadril: [60000, 1.35], locro: [12000, 0.4], kiveve: [8000, 1], pirapire: [35000, 0.3], quesopy: [45000, 1], mandiocaf: [5000, 1.3] };
  let ORIG = null;
  function dietCfg() { return store.get('hp_dietpy', { local: false, budget: false, weekly: 500000, prices: {}, removed: {} }); }
  function applyDietCfg() {
    if (typeof FOODS === 'undefined' || typeof MEAL_TPL === 'undefined') return;
    Object.entries(LOCAL).forEach(([k, v]) => { if (!FOODS[k]) FOODS[k] = v; });
    if (!ORIG) ORIG = JSON.parse(JSON.stringify(MEAL_TPL));
    const cfg = dietCfg();
    Object.keys(MEAL_TPL).forEach(mk => ['prot', 'carb', 'fat'].forEach(s => { MEAL_TPL[mk][s] = ORIG[mk][s].slice(); }));
    if (cfg.local) {
      const add = (mk, s, arr) => MEAL_TPL[mk] && arr.forEach(x => MEAL_TPL[mk][s].includes(x) || MEAL_TPL[mk][s].push(x));
      add('almuerzo', 'prot', ['cuadril', 'vacio']); add('cena', 'prot', ['cuadril']); add('desayuno', 'carb', ['chipa', 'mbeju']); add('merienda', 'carb', ['chipa', 'sopa']);
      add('almuerzo', 'carb', ['sopa', 'chipaguasu', 'locro']); add('desayuno', 'prot', ['quesopy']);
    }
    if (cfg.budget) {
      const cost = k => { const pr = (cfg.prices[k] ?? PRICE[k]?.[0] ?? 50000); const fd = FOODS[k]; const per = PRICE[k]?.[2] === 'u' ? pr / (fd.unit || 50) * 1000 : pr * (PRICE[k]?.[1] || 1); return per / Math.max(1, fd.p * 4 + fd.c * 4 + fd.f * 9); };
      Object.keys(MEAL_TPL).forEach(mk => ['prot', 'carb', 'fat'].forEach(s => MEAL_TPL[mk][s].sort((a, b) => cost(a) - cost(b))));
    }
  }
  function shoppingList() {
    const u = getUsersDB()[currentUser] || {}; const tg = computeTargets(u); if (!tg) return null;
    const d = buildDiet(tg, getDietPrefs()); const cfg = dietCfg(); const g = {};
    d.meals.forEach(m => m.items.forEach(it => { g[it.key] = (g[it.key] || 0) + it.g * 7; }));
    return Object.entries(g).map(([k, grams]) => {
      const P = PRICE[k] || [30000, 1]; const fd = FOODS[k]; const price = cfg.prices[k] ?? P[0];
      if (P[2] === 'u') { const n = Math.ceil(grams / (fd.unit || 50)); return { k, n: fd.n, qty: `${n} u`, unitLbl: '₲/u', price, cost: n * price, removed: !!cfg.removed[k] }; }
      const kg = grams * P[1] / 1000; return { k, n: fd.n, qty: kg >= 1 ? kg.toFixed(1) + ' kg' : Math.round(kg * 1000) + ' g', unitLbl: fd.ml ? '₲/L' : '₲/kg', price, cost: kg * price, removed: !!cfg.removed[k] };
    }).sort((a, b) => b.cost - a.cost);
  }
  function renderLocalCard() {
    let card = $('diet-py'); const tab = $('diet-tab'); if (!tab) return;
    if (!card) { card = document.createElement('div'); card.className = 'exercise-card'; card.id = 'diet-py'; tab.insertBefore(card, tab.children[1] || null); }
    if (!pro()) { card.innerHTML = `<h2 class="pc-title">🇵🇾 Comida local y lista de compras</h2>${lockHTML()}`; return; }
    const cfg = dietCfg(); const list = shoppingList() || []; const tot = list.filter(x => !x.removed).reduce((a, x) => a + x.cost, 0);
    card.innerHTML = `<h2 class="pc-title">🇵🇾 Comida local y lista de compras</h2>
      <label class="pro-sw"><input type="checkbox" id="py-local" ${cfg.local ? 'checked' : ''}> Incluir comidas típicas en mi dieta (chipa, sopa paraguaya, asado, locro…)</label>
      <label class="pro-sw"><input type="checkbox" id="py-budget" ${cfg.budget ? 'checked' : ''}> Modo presupuesto: priorizar los alimentos más baratos</label>
      <details class="phy-h"><summary>📖 Tabla de comidas típicas (macros por porción)</summary><table class="cp-tbl"><tr><th>Comida</th><th>Porción</th><th>kcal</th><th>P/C/G</th></tr>
      ${Object.entries(LOCAL).map(([k, f]) => { const m = PG[k] / 100; return `<tr><td>${f.n}</td><td>${PORTION[k]}</td><td>${Math.round((f.p * 4 + f.c * 4 + f.f * 9) * m)}</td><td>${Math.round(f.p * m)}/${Math.round(f.c * m)}/${Math.round(f.f * m)}</td></tr>`; }).join('')}
      <tr><td>Mandioca hervida</td><td>1 porción (200 g)</td><td>${Math.round(1.4 * 8 + 38 * 8 + 0.3 * 18)}</td><td>3/76/1</td></tr><tr><td>Poroto cocido</td><td>1 taza (180 g)</td><td>${Math.round((8.7 * 4 + 22.8 * 4 + 0.5 * 9) * 1.8)}</td><td>16/41/1</td></tr></table></details>
      <h3 class="adm-h">🛒 Lista de compras semanal</h3>
      <div class="py-budget"><label for="py-w">Presupuesto semanal ₲</label><input id="py-w" type="number" inputmode="numeric" step="10000" value="${cfg.weekly}"></div>
      <div class="py-tot ${cfg.weekly && tot > cfg.weekly ? 'over' : ''}">Total estimado: <b>${gs(tot)}</b>${cfg.weekly ? ` · ${tot > cfg.weekly ? '⚠️ te pasás por ' + gs(tot - cfg.weekly) + (cfg.budget ? '' : '. Activá el modo presupuesto') : '✅ dentro del presupuesto'}` : ''}</div>
      <table class="cp-tbl py-list"><tr><th></th><th>Alimento</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
      ${list.map(x => `<tr class="${x.removed ? 'off' : ''}"><td><input type="checkbox" data-rm="${x.k}" ${x.removed ? '' : 'checked'} aria-label="Incluir"></td><td>${E(tc(x.n))}</td><td>${x.qty}</td><td><input type="number" class="py-pr" data-pr="${x.k}" value="${x.price}" step="500" aria-label="${x.unitLbl}"><small>${x.unitLbl}</small></td><td>${gs(x.cost)}</td></tr>`).join('')}</table>
      <p class="pc-note">Precios aproximados de supermercados de Asunción y Gran Asunción (2026). Podés editarlos según dónde comprás. Cantidades en crudo para 7 días.</p>
      <button class="btn-3d btn-small btn-secondary" id="py-copy">📋 Copiar lista</button>`;
    const upd = fn => { const c = dietCfg(); fn(c); store.set('hp_dietpy', c); applyDietCfg(); renderDiet(); };
    $('py-local').onchange = e => upd(c => c.local = e.target.checked);
    $('py-budget').onchange = e => upd(c => { c.budget = e.target.checked; if (c.budget) cloudStore.setItem(dietKey(), '{}'); });
    $('py-w').onchange = e => upd(c => c.weekly = Math.max(0, +e.target.value || 0));
    card.querySelectorAll('[data-rm]').forEach(i => i.onchange = () => upd(c => { c.removed[i.dataset.rm] = !i.checked; }));
    card.querySelectorAll('[data-pr]').forEach(i => i.onchange = () => upd(c => { c.prices[i.dataset.pr] = Math.max(0, +i.value || 0); }));
    $('py-copy').onclick = () => { const txt = '🛒 Lista Hipertrofia Pro\n' + list.filter(x => !x.removed).map(x => `- ${tc(x.n)}: ${x.qty} (~${gs(x.cost)})`).join('\n') + `\nTotal ≈ ${gs(tot)}`; navigator.clipboard?.writeText(txt).then(() => toast('Lista copiada ✅'), () => toast('No se pudo copiar')); };
  }
  const origRD = window.renderDiet;
  if (typeof origRD === 'function') window.renderDiet = function () { applyDietCfg(); const r = origRD.apply(this, arguments); try { renderLocalCard(); } catch (e) { console.warn(e); } return r; };

  // ---------- notificaciones del coach humano ----------
  const VAPID_PUBLIC = 'BMzWpcXbZWP6aLcqiUZzGjgYn_Tp-1tklvUHBTg7ApmR4jI3cuQGQnsZVLGyqChLQmtFrjrZl2jZuRJguZUKx0I';
  function b64ToU8(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function paintBadge(el, n) {
    if (!el) return;
    let b = el.classList && el.classList.contains('hp-nbadge') ? el : el.querySelector(':scope > .hp-nbadge');
    if (!b) { b = document.createElement('span'); b.className = 'badge hp-nbadge'; el.appendChild(b); }
    const v = Number(n) || 0;
    if (v > 0) { b.hidden = false; b.textContent = v > 99 ? '99+' : String(v); }
    else { b.hidden = true; b.textContent = ''; }
  }
  function pushHintHTML(admin) {
    if (typeof Notification === 'undefined') return '';
    if (Notification.permission === 'granted') return '';
    return `<p class="pc-note" id="ch-push-box"><button type="button" class="btn-3d btn-secondary" id="ch-push-btn">${tx('notifyBtn')}</button> ${tx(admin ? 'notifyHintAdmin' : 'notifyHint')}</p>`;
  }
  function bindPushBtn() {
    const btn = $('ch-push-btn'); if (!btn) return;
    btn.onclick = async () => {
      const ok = await ensurePush(true);
      toast(ok ? tx('notifyOn') : tx('notifyDenied'));
      if (ok) { const n = $('ch-push-box'); if (n) n.remove(); }
    };
  }
  async function notifyNewMessage(id) {
    if (!id) return;
    try { await sb.functions.invoke('notify-coach-message', { body: { id } }); } catch (e) { console.warn('notify', e); }
  }
  async function ensurePush(ask) {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !uid()) return false;
      if (Notification.permission === 'default' && ask) await Notification.requestPermission();
      if (Notification.permission !== 'granted') return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) });
      }
      const json = sub.toJSON();
      if (!json || !json.endpoint || !json.keys) return false;
      const { error } = await sb.from('push_subscriptions').upsert({
        user_id: uid(),
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        lang: L(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
      if (error) { console.warn('push sub', error); return false; }
      return true;
    } catch (e) { console.warn('ensurePush', e); return false; }
  }
  async function refreshBadges() {
    try {
      if (!uid()) return;
      let userN = 0;
      const { count } = await sb.from('coach_messages').select('id', { count: 'exact', head: true }).eq('user_id', uid()).eq('from_admin', true).is('read_at', null);
      userN = count || 0;
      paintBadge($('ch-more-badge'), userN);
      let adminN = 0;
      if (window._isAdmin) {
        const { data } = await sb.rpc('coach_inbox');
        adminN = (data || []).reduce((a, r) => a + (Number(r.unread) || 0), 0);
        paintBadge($('admin-tab-btn'), adminN);
        paintBadge($('more-admin'), adminN);
      }
      paintBadge($('bnav-more'), userN + adminN);
    } catch (e) {}
  }
  let coachChan = null, pushBooted = false;
  function bindCoachRealtime() {
    if (coachChan || !sb) return;
    coachChan = sb.channel('hp-coach-push')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coach_messages' }, (payload) => {
        const m = payload.new || {};
        refreshBadges();
        if (m.from_admin && m.user_id === uid() && $('coachh-tab') && $('coachh-tab').classList.contains('active')) loadMsgs();
        if (!m.from_admin && window._isAdmin && $('admin-tab') && $('admin-tab').classList.contains('active')) renderInbox();
      })
      .subscribe();
  }
  function bootCoachPush() {
    if (!uid()) { pushBooted = false; return; }
    if (pushBooted) return;
    pushBooted = true;
    bindCoachRealtime();
    refreshBadges();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') ensurePush(false);
  }
  setInterval(() => { if (uid()) bootCoachPush(); else pushBooted = false; }, 1500);
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (ev) => {
      const go = ev.data && ev.data.go;
      if (!ev.data || ev.data.type !== 'hp-notif-click' || !go) return;
      const map = { coachh: 'coachh-tab', admin: 'admin-tab' };
      if (map[go] && typeof switchTab === 'function') switchTab(map[go]);
    });
  }

  // ---------- 5. COACH HUMANO ----------
  async function renderCoachH() {
    const box = $('coachh-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const permHint = pushHintHTML(false);
    box.innerHTML = `<p class="pc-note">Una vez por mes mandá tu check-in y un coach profesional certificado revisa tu progreso y te responde por acá (normalmente en 24–48 h).</p>
      ${permHint}
      <div id="ch-msgs" class="ch-msgs">Cargando…</div>
      <textarea id="ch-in" rows="4" maxlength="2000" placeholder="Escribí tu mensaje…"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-3d" id="ch-send">Enviar</button><button class="btn-3d btn-secondary" id="ch-tpl">📝 Usar plantilla de check-in</button></div>`;
    bindPushBtn();
    ensurePush(false);
    $('ch-tpl').onclick = () => {
      const u = getUsersDB()[currentUser] || {}; const m = new Date().toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
      $('ch-in').value = `Check-in de ${m}\n• Peso actual: ${u.weight || '__'} kg\n• Adherencia a la dieta (1-10): \n• Entrenamientos por semana: \n• Energía y descanso: \n• Dudas o molestias: `;
    };
    $('ch-send').onclick = async () => {
      const v = $('ch-in').value.trim(); if (!v) return; $('ch-send').disabled = true;
      const { data, error } = await sb.from('coach_messages').insert({ user_id: uid(), body: v }).select('id').single();
      $('ch-send').disabled = false; if (error) { toast('No se pudo enviar'); return; } $('ch-in').value = ''; toast('Mensaje enviado ✅'); notifyNewMessage(data && data.id); ensurePush(true); loadMsgs();
    };
    loadMsgs();
  }
  async function loadMsgs() {
    const el = $('ch-msgs'); const { data, error } = await sb.from('coach_messages').select('id,from_admin,body,created_at,read_at').eq('user_id', uid()).order('created_at').limit(200);
    if (error) { el.textContent = 'No se pudieron cargar los mensajes.'; return; }
    el.innerHTML = data.length ? data.map(m => `<div class="ch-m ${m.from_admin ? 'c' : 'u'}"><p>${E(m.body).replace(/\n/g, '<br>')}</p><small>${m.from_admin ? '🧑‍🏫 Coach · ' : ''}${dt(m.created_at)}</small></div>`).join('') : '<p class="pc-note">Todavía no hay mensajes. ¡Mandá tu primer check-in!</p>';
    el.scrollTop = el.scrollHeight;
    const unread = data.filter(m => m.from_admin && !m.read_at).map(m => m.id);
    if (unread.length) sb.from('coach_messages').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => refreshBadges());
    else refreshBadges();
  }
  // bandeja del admin
  let inboxSel = null;
  async function renderInbox() {
    if (!window._isAdmin) return;
    let card = $('adm-inbox'); if (!card) { card = document.createElement('div'); card.className = 'exercise-card'; card.id = 'adm-inbox'; const at = $('admin-tab'); at.insertBefore(card, at.children[1] || null); }
    const { data, error } = await sb.rpc('coach_inbox');
    if (error) { card.innerHTML = '<h3 class="adm-h">🧑‍🏫 Coach: mensajes</h3><p class="pc-note">No se pudo cargar.</p>'; return; }
    const unread = data.reduce((a, r) => a + r.unread, 0);
    card.innerHTML = `<h3 class="adm-h">🧑‍🏫 Coach: mensajes ${unread ? `<span class="badge">${unread}</span>` : ''}</h3>
      ${pushHintHTML(true)}
      ${data.length ? data.map(r => `<button type="button" class="ch-conv ${r.unread ? 'new' : ''}" data-u="${r.user_id}"><b>${E(r.name || r.email)}</b> <small>${E(r.email)} · ${dt(r.last_at)}</small><span>${E(String(r.last_body).slice(0, 80))}</span></button>`).join('') : '<p class="pc-note">Sin mensajes todavía.</p>'}
      <div id="adm-thread"></div>`;
    bindPushBtn();
    ensurePush(false);
    card.querySelectorAll('.ch-conv').forEach(b => b.onclick = () => { inboxSel = b.dataset.u; openThread(); });
    if (inboxSel) openThread();
  }
  async function openThread() {
    const el = $('adm-thread'); const { data } = await sb.from('coach_messages').select('*').eq('user_id', inboxSel).order('created_at');
    el.innerHTML = `<div class="ch-msgs">${(data || []).map(m => `<div class="ch-m ${m.from_admin ? 'u' : 'c'}"><p>${E(m.body).replace(/\n/g, '<br>')}</p><small>${m.from_admin ? 'Vos · ' : ''}${dt(m.created_at)}</small></div>`).join('')}</div>
      <textarea id="adm-rep" rows="3" maxlength="2000" placeholder="Responder…"></textarea><button class="btn-3d btn-small" id="adm-send">Responder</button>`;
    const ids = (data || []).filter(m => !m.from_admin && !m.read_at).map(m => m.id);
    if (ids.length) await sb.from('coach_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
    refreshBadges();
    $('adm-send').onclick = async () => { const v = $('adm-rep').value.trim(); if (!v) return; const { data, error } = await sb.from('coach_messages').insert({ user_id: inboxSel, from_admin: true, body: v }).select('id').single(); if (error) toast('Error al enviar'); else { toast('Respuesta enviada'); notifyNewMessage(data && data.id); ensurePush(true); renderInbox(); } };
  }

  // ---------- 6. RANKINGS Y RETOS ----------
  const LIFTS = { total: 'Total', squat: 'Sentadilla', bench: 'Press banca', deadlift: 'Peso muerto' };
  function est1RM() {
    let h = []; try { h = JSON.parse(cloudStore.getItem(`gym_workout_history_${currentUser}`) || '[]'); } catch (e) {}
    const best = { squat: 0, bench: 0, deadlift: 0 };
    const RX = { squat: [/sentadilla|squat/i, /búlgara|bulgara|goblet|sissy|hack|split|zancada/i], bench: [/press (de )?banca|bench press|press plano/i, /inclin|declin|mancuerna|dumbbell|cerrad/i], deadlift: [/peso muerto|deadlift/i, /rumano|romanian|piernas rígidas|stiff|sumo/i] };
    h.forEach(it => { const w = +it.weight, r = +it.reps; if (!(w > 0) || !(r > 0) || r > 12) return; Object.entries(RX).forEach(([k, [y, n]]) => { if (y.test(it.exercise) && !n.test(it.exercise)) best[k] = Math.max(best[k], Math.round(w * (1 + r / 30))); }); });
    return best;
  }
  let rkScope = 'global', rkLift = 'total';
  async function renderRank() {
    const box = $('rank-tab-body'); if (!pro()) { box.innerHTML = lockHTML(); return; }
    const { data: me } = await sb.from('lift_shares').select('*').eq('user_id', uid()).maybeSingle();
    const e = est1RM(); const u = getUsersDB()[currentUser] || {};
    box.innerHTML = `<details class="phy-h" ${me ? '' : 'open'}><summary>${me ? '✅ Compartís tus marcas como <b>' + E(me.display_name) + '</b>' : '🔓 Sumate al ranking (opcional)'}</summary>
      <p class="pc-note">Solo se muestran tu nombre público, ciudad, gimnasio y tu 1RM estimado. Podés salir cuando quieras.</p>
      <div class="grid-2"><div><label class="field-label" for="rk-n">Nombre público</label><input id="rk-n" maxlength="30" value="${E(me?.display_name || u.firstName || '')}"></div>
      <div><label class="field-label" for="rk-c">Ciudad</label><input id="rk-c" maxlength="40" value="${E(me?.city || '')}" placeholder="Fernando de la Mora"></div>
      <div><label class="field-label" for="rk-g">Gimnasio</label><input id="rk-g" maxlength="40" value="${E(me?.gym || '')}"></div>
      <div><label class="field-label" for="rk-sq">Sentadilla 1RM (kg)</label><input id="rk-sq" type="number" inputmode="decimal" value="${me?.squat ?? (e.squat || '')}"></div>
      <div><label class="field-label" for="rk-be">Press banca 1RM (kg)</label><input id="rk-be" type="number" inputmode="decimal" value="${me?.bench ?? (e.bench || '')}"></div>
      <div><label class="field-label" for="rk-dl">Peso muerto 1RM (kg)</label><input id="rk-dl" type="number" inputmode="decimal" value="${me?.deadlift ?? (e.deadlift || '')}"></div></div>
      <p class="pc-note">Estimado desde tus cargas (fórmula de Epley): sentadilla ${e.squat || '—'}, banca ${e.bench || '—'}, peso muerto ${e.deadlift || '—'} kg.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-3d" id="rk-save">${me ? 'Actualizar' : 'Compartir mis marcas'}</button>${me ? '<button class="btn-3d btn-danger-outline" id="rk-out">Salir del ranking</button>' : ''}</div></details>
      <div class="rk-tabs">${['global', 'city', 'gym'].map(s => `<button type="button" class="${rkScope === s ? 'on' : ''}" data-s="${s}">${{ global: '🌎 Global', city: '🏙️ Mi ciudad', gym: '🏋️ Mi gimnasio' }[s]}</button>`).join('')}</div>
      <div class="rk-tabs">${Object.entries(LIFTS).map(([k, v]) => `<button type="button" class="${rkLift === k ? 'on' : ''}" data-l="${k}">${v}</button>`).join('')}</div>
      <div id="rk-board" class="pc-note">Cargando…</div>
      <h3 class="adm-h">⚔️ Retos con amigos</h3>
      <div class="grid-2"><div><label class="field-label" for="rk-cn">Nombre del reto</label><input id="rk-cn" maxlength="60" placeholder="Ej: Reto banca noviembre"></div>
      <div><label class="field-label" for="rk-cl">Levantamiento</label><select id="rk-cl">${Object.entries(LIFTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div><label class="field-label" for="rk-ce">Termina</label><input id="rk-ce" type="date"></div><div style="align-self:end"><button class="btn-3d" id="rk-create">Crear reto</button></div></div>
      <div class="py-budget"><input id="rk-code" maxlength="6" placeholder="Código de invitación" style="text-transform:uppercase"><button class="btn-3d btn-secondary" id="rk-join">Unirme</button></div>
      <div id="rk-ch">Cargando…</div>`;
    const err = m => toast(/share/.test(m) ? 'Primero compartí tus marcas para participar' : /code/.test(m) ? 'Código inválido' : 'No se pudo completar');
    $('rk-save').onclick = async () => {
      const n = $('rk-n').value.trim(); if (n.length < 2) { toast('Poné un nombre público'); return; }
      const num = id => { const v = parseFloat($(id).value); return v > 0 && v < 600 ? v : null; };
      const { error } = await sb.from('lift_shares').upsert({ user_id: uid(), display_name: n, city: $('rk-c').value.trim() || null, gym: $('rk-g').value.trim() || null, squat: num('rk-sq'), bench: num('rk-be'), deadlift: num('rk-dl'), bodyweight: parseFloat(u.weight) || null, updated_at: new Date().toISOString() });
      if (error) toast('No se pudo guardar'); else { toast('Marcas compartidas ✅'); renderRank(); }
    };
    if ($('rk-out')) $('rk-out').onclick = async () => { if (!confirm('¿Salir del ranking? Se borran tus marcas públicas.')) return; await sb.from('lift_shares').delete().eq('user_id', uid()); renderRank(); };
    box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { rkScope = b.dataset.s; renderRank(); });
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { rkLift = b.dataset.l; renderRank(); });
    $('rk-create').onclick = async () => { const n = $('rk-cn').value.trim(); if (n.length < 2) { toast('Poné un nombre al reto'); return; } const { data, error } = await sb.rpc('create_challenge', { p_name: n, p_lift: $('rk-cl').value, p_ends: $('rk-ce').value || null }); if (error) return err(error.message); toast('Reto creado. Código: ' + data); renderRank(); };
    $('rk-join').onclick = async () => { const { error } = await sb.rpc('join_challenge', { p_code: $('rk-code').value }); if (error) return err(error.message); toast('¡Te uniste al reto! 💪'); renderRank(); };
    // tabla
    const val = r => rkLift === 'total' ? (+r.squat || 0) + (+r.bench || 0) + (+r.deadlift || 0) : +r[rkLift] || 0;
    let q = sb.from('lift_shares').select('user_id,display_name,city,gym,squat,bench,deadlift').limit(500);
    if (rkScope === 'city') { if (!me?.city) { $('rk-board').textContent = 'Cargá tu ciudad para ver este ranking.'; q = null; } else q = q.ilike('city', me.city); }
    if (rkScope === 'gym') { if (!me?.gym) { $('rk-board').textContent = 'Cargá tu gimnasio para ver este ranking.'; q = null; } else q = q.ilike('gym', me.gym); }
    if (q) { const { data } = await q; $('rk-board').innerHTML = board((data || []).filter(r => val(r) > 0).sort((a, b) => val(b) - val(a)).slice(0, 50), val); }
    // retos
    const { data: chs } = await sb.from('challenges').select('id,code,name,lift,ends_at').order('created_at', { ascending: false });
    if (!chs || !chs.length) { $('rk-ch').innerHTML = '<p class="pc-note">No estás en ningún reto. Creá uno y pasale el código a tus amigos.</p>'; return; }
    const { data: mem } = await sb.from('challenge_members').select('challenge_id,user_id').in('challenge_id', chs.map(c => c.id));
    const ids = [...new Set((mem || []).map(m => m.user_id))];
    const { data: ls } = await sb.from('lift_shares').select('user_id,display_name,city,gym,squat,bench,deadlift').in('user_id', ids);
    $('rk-ch').innerHTML = chs.map(c => { const v = r => c.lift === 'total' ? (+r.squat || 0) + (+r.bench || 0) + (+r.deadlift || 0) : +r[c.lift] || 0; const rows = (ls || []).filter(r => (mem || []).some(m => m.challenge_id === c.id && m.user_id === r.user_id)).sort((a, b) => v(b) - v(a));
      return `<details class="phy-h"><summary><b>${E(c.name)}</b> · ${LIFTS[c.lift]} · código <code>${c.code}</code>${c.ends_at ? ' · hasta ' + dt(c.ends_at + 'T12:00:00') : ''}</summary>${board(rows, v)}</details>`; }).join('');
  }
  function board(rows, val) {
    if (!rows.length) return '<p class="pc-note">Todavía no hay marcas acá.</p>';
    return `<ol class="rk-list">${rows.map((r, i) => `<li class="${r.user_id === uid() ? 'me' : ''}"><span class="pos">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="nm">${E(r.display_name)}<small>${E([r.city, r.gym].filter(Boolean).join(' · '))}</small></span><b>${Math.round(val(r))} kg</b></li>`).join('')}</ol>`;
  }
})();
