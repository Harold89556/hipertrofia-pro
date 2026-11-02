/* Hipertrofia Pro — ciclo menstrual, predicción 12 semanas, datos de reloj (sueño/pasos/pulso) */
(function () {
  const $ = id => document.getElementById(id);
  const E = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pro = () => !!(window._access && window._access.has_access);
  const today = () => (typeof getTodayISO === 'function' ? getTodayISO() : new Date().toISOString().slice(0, 10));
  const store = { get(k, d) { try { return JSON.parse(cloudStore.getItem(k + '_' + currentUser) || 'null') ?? d; } catch (e) { return d; } }, set(k, v) { cloudStore.setItem(k + '_' + currentUser, JSON.stringify(v)); } };
  const LG = () => (typeof LANG !== 'undefined' && ['en', 'pt'].includes(LANG) ? LANG : 'es');
  const T = o => o[LG()] || o.es;
  const user = () => { try { return getUsersDB()[currentUser] || {}; } catch (e) { return {}; } };
  const female = () => user().gender === 'mujer';
  const toast = m => (typeof showToast === 'function' ? showToast(m) : 0);
  const n1 = x => Math.round(x * 10) / 10;

  // ================= CICLO MENSTRUAL =================
  const cyc = () => Object.assign({ on: false, last: '', len: 28, plen: 5 }, store.get('hp_cycle', {}));
  const PH = {
    menstrual: { ic: '🩸', n: { es: 'Menstrual', en: 'Menstrual', pt: 'Menstrual' },
      tip: { es: 'Bajamos ~15 % el volumen (1 serie menos por ejercicio). Si tenés cólicos o fatiga, marcá abajo y bajamos también la carga. Moverse suele aliviar los cólicos.', en: 'Volume is reduced ~15% (1 fewer set per exercise). If you have cramps or fatigue, log it below and load is lowered too. Light movement often eases cramps.', pt: 'Reduzimos ~15 % o volume (1 série a menos por exercício). Se tiver cólicas ou fadiga, marque abaixo e reduzimos a carga também. Movimento leve costuma aliviar as cólicas.' },
      voice: { es: 'Estás en fase menstrual: hoy hacemos un poco menos de volumen. Escuchá a tu cuerpo.', en: 'You are in your menstrual phase: a bit less volume today. Listen to your body.', pt: 'Você está na fase menstrual: hoje um pouco menos de volume. Ouça seu corpo.' } },
    folicular: { ic: '🌱', n: { es: 'Folicular', en: 'Follicular', pt: 'Folicular' },
      tip: { es: 'Energía en subida: buen momento para buscar récords y subir cargas.', en: 'Energy is rising: a good time to chase PRs and add load.', pt: 'Energia em alta: bom momento para buscar recordes e subir cargas.' },
      voice: { es: 'Fase folicular: tu energía está subiendo, buen día para buscar un récord.', en: 'Follicular phase: your energy is rising, a good day to go for a record.', pt: 'Fase folicular: sua energia está subindo, bom dia para buscar um recorde.' } },
    ovulatoria: { ic: '⚡', n: { es: 'Ovulatoria', en: 'Ovulatory', pt: 'Ovulatória' },
      tip: { es: 'Pico de fuerza para muchas mujeres: andá por tus marcas, pero cuidá la técnica y entrá bien en calor (ligamentos algo más laxos).', en: 'Peak strength for many women: go for your PRs, but keep strict technique and warm up well (ligaments may be laxer).', pt: 'Pico de força para muitas mulheres: vá atrás dos recordes, mas cuide da técnica e aqueça bem (ligamentos mais frouxos).' },
      voice: { es: 'Fase ovulatoria: buen momento para tus mejores marcas, con técnica impecable.', en: 'Ovulatory phase: a good time for your best lifts, with clean technique.', pt: 'Fase ovulatória: bom momento para suas melhores marcas, com técnica impecável.' } },
    lutea: { ic: '🌙', n: { es: 'Lútea', en: 'Luteal', pt: 'Lútea' },
      tip: { es: 'Sumamos ~125 kcal (en carbohidratos) porque el gasto y el hambre suben un poco. Es normal retener líquido: el peso puede subir 0,5–2 kg sin ser grasa.', en: 'We add ~125 kcal (as carbs) since energy use and hunger rise a bit. Water retention is normal: weight can rise 0.5–2 kg without being fat.', pt: 'Somamos ~125 kcal (em carboidratos) porque o gasto e a fome sobem um pouco. Reter líquido é normal: o peso pode subir 0,5–2 kg sem ser gordura.' },
      voice: { es: 'Fase lútea: puede costar un poco más, es normal. Mantené la técnica y hidratate.', en: 'Luteal phase: it may feel a bit harder, that is normal. Keep your technique and hydrate.', pt: 'Fase lútea: pode custar um pouco mais, é normal. Mantenha a técnica e se hidrate.' } },
  };
  function cyclePhase(dateISO) {
    const c = cyc(); if (!c.on || !female() || !/^\d{4}-\d{2}-\d{2}$/.test(c.last)) return null;
    const len = Math.min(45, Math.max(21, +c.len || 28)), plen = Math.min(10, Math.max(2, +c.plen || 5));
    const diff = Math.floor((Date.parse(dateISO || today()) - Date.parse(c.last)) / 864e5); if (diff < 0) return null;
    const day = (diff % len) + 1, ov = len - 14;
    const k = day <= plen ? 'menstrual' : day < ov - 1 ? 'folicular' : day <= ov + 1 ? 'ovulatoria' : 'lutea';
    return { k, day, len, next: len - day + 1 };
  }
  const sym = () => store.get('hp_csym', {})[today()] || '';
  window.hpCyclePhase = cyclePhase;
  window.hpCycleAdj = function () {
    if (!pro()) return null; const p = cyclePhase(); if (!p) return null; const s = sym();
    let sets = 0, load = 1, lbl = '';
    if (p.k === 'menstrual') { sets = -1; lbl = T({ es: '🩸 Fase menstrual: −1 serie', en: '🩸 Menstrual phase: −1 set', pt: '🩸 Fase menstrual: −1 série' }); }
    if (s === 'colicos') { sets = Math.min(sets, -1); load = 0.9; lbl = T({ es: '🩸 Cólicos: −1 serie y −10 % de carga, RPE 6-7', en: '🩸 Cramps: −1 set and −10% load, RPE 6-7', pt: '🩸 Cólicas: −1 série e −10 % de carga, RPE 6-7' }); }
    else if (s === 'fatiga') { sets = Math.min(sets, -1); load = 0.95; lbl = T({ es: '😮‍💨 Fatiga: −1 serie y −5 % de carga', en: '😮‍💨 Fatigue: −1 set and −5% load', pt: '😮‍💨 Fadiga: −1 série e −5 % de carga' }); }
    return sets || load < 1 ? { sets, load, lbl } : null;
  };
  let voiceDay = '';
  window.hpCycleVoice = function () { const p = pro() && cyclePhase(); if (!p || voiceDay === today()) return []; voiceDay = today(); return [T(PH[p.k].voice)]; };
  // Dieta: fase lútea +125 kcal en carbohidratos
  const origCT = window.computeTargets;
  if (typeof origCT === 'function') window.computeTargets = function (u) {
    const r = origCT.apply(this, arguments);
    try { if (r && pro() && u && u.gender === 'mujer') { const p = cyclePhase(); if (p && p.k === 'lutea') { r.kcal += 125; r.carbs += 31; r.cycle = 'lutea'; } } } catch (e) {}
    return r;
  };
  function renderCycleCard() {
    const ec = $('exercises-container'); if (!ec || !currentUser) return;
    let c = $('cycle-card');
    if (!female()) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.className = 'exercise-card'; c.id = 'cycle-card'; const rc = $('ready-card'); ec.parentNode.insertBefore(c, rc || $('warmup-section') || ec); }
    const cf = cyc(), p = cyclePhase();
    const ttl = T({ es: '🌸 Ciclo menstrual', en: '🌸 Menstrual cycle', pt: '🌸 Ciclo menstrual' });
    if (!pro()) { c.innerHTML = `<h2 class="pc-title">${ttl} <small class="rd-sub">Pro</small></h2><p class="pc-note">${T({ es: 'Con Pro, tu entrenamiento y dieta se adaptan a cada fase de tu ciclo.', en: 'With Pro, training and diet adapt to each phase of your cycle.', pt: 'Com Pro, treino e dieta se adaptam a cada fase do seu ciclo.' })}</p>`; return; }
    const form = `<div class="cy-form" id="cy-form" style="display:${cf.on && cf.last ? 'none' : 'block'}">
      <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="cy-on" ${cf.on ? 'checked' : ''}> ${T({ es: 'Adaptar entrenamiento y dieta a mi ciclo', en: 'Adapt training and diet to my cycle', pt: 'Adaptar treino e dieta ao meu ciclo' })}</label>
      <div class="grid-2"><div><label class="pc-note">${T({ es: 'Inicio de la última menstruación', en: 'First day of last period', pt: 'Início da última menstruação' })}</label><input type="date" id="cy-last" value="${E(cf.last)}" max="${today()}"></div>
      <div><label class="pc-note">${T({ es: 'Duración del ciclo (días)', en: 'Cycle length (days)', pt: 'Duração do ciclo (dias)' })}</label><input type="number" id="cy-len" min="21" max="45" value="${+cf.len || 28}"></div>
      <div><label class="pc-note">${T({ es: 'Días de sangrado', en: 'Period length (days)', pt: 'Dias de menstruação' })}</label><input type="number" id="cy-plen" min="2" max="10" value="${+cf.plen || 5}"></div></div>
      <button type="button" class="btn-3d btn-small" id="cy-save" style="margin-top:8px">💾 ${T({ es: 'Guardar', en: 'Save', pt: 'Salvar' })}</button></div>`;
    let body = '';
    if (p) {
      const ph = PH[p.k], s = sym();
      const sb = [['normal', T({ es: '🙂 Normal', en: '🙂 Normal', pt: '🙂 Normal' })], ['colicos', T({ es: '🩸 Cólicos', en: '🩸 Cramps', pt: '🩸 Cólicas' })], ['fatiga', T({ es: '😮‍💨 Fatiga', en: '😮‍💨 Fatigue', pt: '😮‍💨 Fadiga' })]];
      body = `<div class="cy-phase" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b style="font-size:1.05rem">${ph.ic} ${T({ es: 'Fase', en: 'Phase', pt: 'Fase' })} ${T(ph.n)}</b><div class="pc-note" style="margin:2px 0 0">${T({ es: 'Día', en: 'Day', pt: 'Dia' })} ${p.day} ${T({ es: 'de', en: 'of', pt: 'de' })} ${p.len} · ${T({ es: 'próxima menstruación en', en: 'next period in', pt: 'próxima menstruação em' })} ~${p.next} ${T({ es: 'días', en: 'days', pt: 'dias' })}</div></div><button type="button" class="btn-3d btn-secondary btn-small" id="cy-edit">⚙️</button></div>
        <p class="rd-res" style="margin-top:8px">${T(ph.tip)}</p>
        <div class="rd-q"><span>${T({ es: '¿Cómo te sentís hoy?', en: 'How do you feel today?', pt: 'Como você se sente hoje?' })}</span><div>${sb.map(([k, l]) => `<button type="button" data-sym="${k}" class="${s === k ? 'on' : ''}" style="width:auto;padding:0 8px">${l}</button>`).join('')}</div></div>`;
    } else if (cf.on) body = `<p class="pc-note">${T({ es: 'Cargá la fecha de tu última menstruación.', en: 'Enter the date of your last period.', pt: 'Informe a data da sua última menstruação.' })}</p>`;
    else body = `<p class="pc-note">${T({ es: 'Opcional: activalo para que el plan se adapte a tu ciclo.', en: 'Optional: turn it on so the plan adapts to your cycle.', pt: 'Opcional: ative para o plano se adaptar ao seu ciclo.' })}</p>`;
    c.innerHTML = `<h2 class="pc-title">${ttl}</h2>${body}${form}<p class="pc-note pro-disc" style="font-size:.72rem;margin-top:8px">${T({ es: 'Orientativo, basado en estudios sobre ciclo y entrenamiento (la evidencia muestra efectos pequeños y muy individuales). No es anticonceptivo ni consejo médico. Si usás anticonceptivos hormonales, las fases pueden no aplicar. Ante dolor fuerte o irregularidades, consultá a tu ginecóloga/o.', en: 'Guidance based on research on the cycle and training (effects are small and highly individual). Not contraception or medical advice. With hormonal contraception, phases may not apply. For severe pain or irregularities, see your gynecologist.', pt: 'Orientativo, baseado em estudos sobre ciclo e treino (efeitos pequenos e muito individuais). Não é contraceptivo nem conselho médico. Com anticoncepcional hormonal, as fases podem não se aplicar. Em caso de dor forte ou irregularidades, consulte seu ginecologista.' })}</p>`;
    const ed = $('cy-edit'); if (ed) ed.onclick = () => { const f = $('cy-form'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
    $('cy-save').onclick = () => {
      const on = $('cy-on').checked, last = $('cy-last').value; if (on && !last) { toast(T({ es: 'Elegí la fecha', en: 'Pick the date', pt: 'Escolha a data' })); return; }
      store.set('hp_cycle', { on, last, len: Math.min(45, Math.max(21, +$('cy-len').value || 28)), plen: Math.min(10, Math.max(2, +$('cy-plen').value || 5)) });
      toast('🌸 ' + T({ es: 'Ciclo guardado', en: 'Cycle saved', pt: 'Ciclo salvo' })); refresh();
    };
    c.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => { const a = store.get('hp_csym', {}); a[today()] = a[today()] === b.dataset.sym ? '' : b.dataset.sym; Object.keys(a).sort().slice(0, -90).forEach(k => delete a[k]); store.set('hp_csym', a); refresh(); });
  }

  // ================= RELOJ / DATOS DE SALUD (carga manual) =================
  const wear = () => store.get('hp_wear', {});
  window.hpWearAdj = function () {
    if (!pro()) return null; const all = wear(), w = all[today()]; if (!w) return null;
    let sets = 0, load = 1; const why = [];
    if (w.sleep > 0 && w.sleep < 5) { sets = -1; load = 0.95; why.push(T({ es: `dormiste ${w.sleep} h`, en: `${w.sleep} h of sleep`, pt: `dormiu ${w.sleep} h` })); }
    else if (w.sleep > 0 && w.sleep < 6) { load = 0.975; why.push(T({ es: `dormiste ${w.sleep} h`, en: `${w.sleep} h of sleep`, pt: `dormiu ${w.sleep} h` })); }
    const prev = Object.entries(all).filter(([d, v]) => d < today() && v.hr > 0).slice(-14).map(([, v]) => v.hr);
    if (w.hr > 0 && prev.length >= 3) { const base = prev.reduce((a, b) => a + b, 0) / prev.length; if (w.hr >= base + 7) { sets = Math.min(sets, -1); load = Math.min(load, 0.95); why.push(T({ es: `pulso en reposo +${Math.round(w.hr - base)} lpm`, en: `resting HR +${Math.round(w.hr - base)} bpm`, pt: `FC em repouso +${Math.round(w.hr - base)} bpm` })); } }
    return why.length ? { sets, load, lbl: '⌚ ' + why.join(' · ') } : null;
  };
  function renderWear() {
    const rc = $('ready-card'); if (!rc || !pro() || rc.style.display === 'none') return;
    let b = $('wear-box'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'wear-box'; b.style.marginTop = '10px';
    const w = wear()[today()] || {};
    b.innerHTML = `<details${w.sleep || w.steps || w.hr ? ' open' : ''}><summary style="cursor:pointer;font-weight:700">⌚ ${T({ es: 'Datos de tu reloj (opcional)', en: 'Your watch data (optional)', pt: 'Dados do seu relógio (opcional)' })}</summary>
      <div class="grid-2" style="margin-top:6px"><div><label class="pc-note">😴 ${T({ es: 'Sueño (h)', en: 'Sleep (h)', pt: 'Sono (h)' })}</label><input type="number" step="0.5" min="0" max="14" id="wr-sleep" value="${w.sleep || ''}"></div>
      <div><label class="pc-note">👣 ${T({ es: 'Pasos ayer', en: 'Steps yesterday', pt: 'Passos ontem' })}</label><input type="number" min="0" max="80000" id="wr-steps" value="${w.steps || ''}"></div>
      <div><label class="pc-note">❤️ ${T({ es: 'Pulso en reposo', en: 'Resting HR', pt: 'FC em repouso' })}</label><input type="number" min="30" max="120" id="wr-hr" value="${w.hr || ''}"></div></div>
      <button type="button" class="btn-3d btn-secondary btn-small" id="wr-save" style="margin-top:6px">💾 ${T({ es: 'Guardar', en: 'Save', pt: 'Salvar' })}</button>
      <p class="pc-note" style="font-size:.72rem">${T({ es: 'Copiá los números de tu reloj o app de salud. Poco sueño o pulso alto ajustan la carga de hoy.', en: 'Copy the numbers from your watch or health app. Short sleep or high HR adjust today\'s load.', pt: 'Copie os números do seu relógio ou app de saúde. Pouco sono ou FC alta ajustam a carga de hoje.' })}</p></details>`;
    rc.appendChild(b);
    $('wr-save').onclick = () => {
      const a = wear(); const v = { sleep: +$('wr-sleep').value || 0, steps: +$('wr-steps').value || 0, hr: +$('wr-hr').value || 0 };
      a[today()] = v; Object.keys(a).sort().slice(0, -60).forEach(k => delete a[k]); store.set('hp_wear', a);
      if (v.sleep) { const r = store.get('hp_ready', {}); const cur = r[today()] || {}; if (!cur.sleep) { cur.sleep = v.sleep >= 8 ? 5 : v.sleep >= 7 ? 4 : v.sleep >= 6 ? 3 : v.sleep >= 5 ? 2 : 1; r[today()] = cur; store.set('hp_ready', r); } }
      toast('⌚ ' + T({ es: 'Datos guardados', en: 'Saved', pt: 'Salvo' })); refresh();
    };
  }

  // ================= PREDICCIÓN 12 SEMANAS =================
  function metrics() { try { return JSON.parse(cloudStore.getItem(`body_metrics_${currentUser}`) || '[]').filter(x => parseFloat(x.weight) > 0 && /^\d{4}-\d{2}-\d{2}/.test(x.date)).sort((a, b) => a.date < b.date ? -1 : 1); } catch (e) { return []; } }
  function workoutAdh() {
    let H = []; try { H = JSON.parse(cloudStore.getItem(`gym_workout_history_${currentUser}`) || '[]'); } catch (e) {}
    const from = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
    const days = new Set(H.map(h => String(h.date).slice(0, 10)).filter(d => d >= from)).size;
    const f = (typeof getSettings === 'function' ? getSettings().frequency : 5) || 5;
    return Math.min(1, days / (f * 4));
  }
  function dietAdh() {
    const a = store.get('hp_dadh', {}); const v = Object.values(a); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
  }
  function logDietAdh() {
    try { const o = JSON.parse(cloudStore.getItem(`hp_dietlog_${currentUser}`) || 'null'); if (!o || !o.meals) return; const vals = Object.values(o.meals); if (!vals.length) return;
      const done = vals.filter(v => v === 'done' || v === 'ate').length; const tot = document.querySelectorAll('#diet-tab [data-mk], #diet-tab .dl-meal').length || Math.max(vals.length, 4);
      const a = store.get('hp_dadh', {}); a[o.date] = Math.min(1, done / tot); Object.keys(a).sort().slice(0, -28).forEach(k => delete a[k]); store.set('hp_dadh', a); } catch (e) {}
  }
  const rfm = (h, waist, fem) => Math.max(4, Math.min(55, 64 - 20 * (h / waist) + (fem ? 12 : 0))); // Relative Fat Mass (Woolcott 2018)
  function predict() {
    const u = user(); const M = metrics(); const tg = typeof computeTargets === 'function' ? computeTargets(u) : null;
    const w0 = M.length ? parseFloat(M[M.length - 1].weight) : parseFloat(u.weight); if (!(w0 > 0) || !tg) return null;
    const fem = u.gender === 'mujer', H = parseFloat(u.height) || 0;
    const goalRate = (tg.rate[0] + tg.rate[1]) / 2 / 100 * w0; // kg/sem
    const wa = workoutAdh(), da = dietAdh(), adh = da == null ? wa : 0.5 * wa + 0.5 * da;
    const tr = typeof weightTrend === 'function' ? weightTrend() : null;
    let rate = goalRate * (0.3 + 0.7 * adh), basis = 'goal';
    if (tr && !tr.insufficient) { rate = 0.6 * tr.kgWeek + 0.4 * rate; basis = 'trend'; }
    rate = Math.max(-1.0 / 100 * w0, Math.min(0.5 / 100 * w0 + 0.1, rate)); // límites fisiológicos razonables
    const dw = rate * 12, w12 = w0 + dw;
    const lastW = M.slice().reverse().find(x => parseFloat(x.waist) > 0); const waist0 = lastW ? parseFloat(lastW.waist) : null;
    let bf0 = null, bf12 = null, waist12 = null;
    if (waist0 && H) {
      bf0 = rfm(H, waist0, fem); const fm0 = w0 * bf0 / 100;
      const fatShare = dw < 0 ? 0.8 : (0.3 + 0.4 * (1 - wa)); // en déficit ~80 % grasa; en superávit depende del entreno
      const fm12 = Math.max(w12 * 0.05, fm0 + dw * fatShare); bf12 = fm12 / w12 * 100;
      waist12 = waist0 + (fm12 - fm0) * 1.0; // ~1 cm de cintura por kg de grasa
    }
    return { w0, w12, rate, adh, wa, da, basis, bf0, bf12, waist0, waist12, M };
  }
  function chart(p) {
    const pts = p.M.slice(-12).map(x => ({ t: Date.parse(x.date), w: parseFloat(x.weight) }));
    const now = Date.parse(today()); if (!pts.length) pts.push({ t: now, w: p.w0 });
    const tEnd = now + 84 * 864e5, lo = pts[pts.length - 1];
    const proj = [{ t: Math.max(lo.t, now - 864e5), w: p.w0 }, { t: tEnd, w: p.w12 }];
    const band = Math.abs(p.w12 - p.w0) * 0.35 + 0.6;
    const all = pts.concat(proj); const t0 = Math.min(...all.map(a => a.t)), t1 = tEnd;
    const ws = all.map(a => a.w).concat([p.w12 + band, p.w12 - band]); const y0 = Math.min(...ws) - 0.5, y1 = Math.max(...ws) + 0.5;
    const W = 340, Hh = 160, X = t => 30 + (t - t0) / (t1 - t0 || 1) * (W - 40), Y = w => 10 + (y1 - w) / (y1 - y0 || 1) * (Hh - 30);
    const line = pts.map((a, i) => `${i ? 'L' : 'M'}${X(a.t).toFixed(1)},${Y(a.w).toFixed(1)}`).join('');
    const pA = proj[0];
    return `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto" role="img" aria-label="chart">
      <polygon points="${X(pA.t)},${Y(pA.w)} ${X(tEnd)},${Y(p.w12 + band)} ${X(tEnd)},${Y(p.w12 - band)}" fill="rgba(56,189,248,.15)"/>
      <path d="${line}" stroke="#a3e635" stroke-width="2.5" fill="none"/>${pts.map(a => `<circle cx="${X(a.t)}" cy="${Y(a.w)}" r="3" fill="#a3e635"/>`).join('')}
      <path d="M${X(pA.t)},${Y(pA.w)}L${X(tEnd)},${Y(p.w12)}" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 5" fill="none"/>
      <circle cx="${X(tEnd)}" cy="${Y(p.w12)}" r="4" fill="#38bdf8"/>
      <text x="${X(tEnd) - 4}" y="${Y(p.w12) - 8}" fill="#38bdf8" font-size="12" text-anchor="end" font-weight="700">${n1(p.w12)} kg</text>
      <text x="30" y="${Hh - 4}" fill="#94a3b8" font-size="10">${T({ es: 'hoy', en: 'today', pt: 'hoje' }) === 'hoy' ? '' : ''}${new Date(t0).toLocaleDateString()}</text>
      <text x="${W - 10}" y="${Hh - 4}" fill="#94a3b8" font-size="10" text-anchor="end">+12 ${T({ es: 'sem', en: 'wk', pt: 'sem' })}</text>
      <text x="4" y="${Y(y1 - 0.5) + 4}" fill="#94a3b8" font-size="10">${n1(y1 - 0.5)}</text><text x="4" y="${Y(y0 + 0.5)}" fill="#94a3b8" font-size="10">${n1(y0 + 0.5)}</text></svg>`;
  }
  function renderPredict() {
    const tab = $('workout-history-tab'); if (!tab || !currentUser) return;
    let c = $('pred-card'); if (!c) { c = document.createElement('div'); c.className = 'exercise-card'; c.id = 'pred-card'; tab.insertBefore(c, tab.firstChild); }
    const ttl = T({ es: '🔮 Tu proyección a 12 semanas', en: '🔮 Your 12-week projection', pt: '🔮 Sua projeção em 12 semanas' });
    if (!pro()) { c.innerHTML = `<h2 class="pc-title">${ttl} <small class="rd-sub">Pro</small></h2><p class="pc-note">${T({ es: 'Con Pro ves cómo vas a estar en 12 semanas según tu plan y tu constancia.', en: 'With Pro, see where you will be in 12 weeks based on your plan and consistency.', pt: 'Com Pro, veja como você estará em 12 semanas conforme seu plano e constância.' })}</p>`; return; }
    const p = predict(); if (!p) { c.innerHTML = `<h2 class="pc-title">${ttl}</h2><p class="pc-note">${T({ es: 'Completá tu perfil (peso, altura, edad) y registrá tus medidas para ver la proyección.', en: 'Complete your profile and log your measurements to see the projection.', pt: 'Complete seu perfil e registre suas medidas para ver a projeção.' })}</p>`; return; }
    const sg = x => (x > 0 ? '+' : '') + n1(x);
    const row = (l, a, b, u) => `<div class="dlr"><div class="dlr-m"><b>${l}</b></div><div style="text-align:right"><span class="pc-note">${a == null ? '—' : n1(a) + u}</span> → <b style="color:#38bdf8">${b == null ? '—' : n1(b) + u}</b>${a != null && b != null ? ` <small>(${sg(b - a)}${u})</small>` : ''}</div></div>`;
    const pct = x => Math.round(x * 100) + ' %';
    const cy = cyclePhase(); const water = cy && (cy.k === 'lutea' || cy.k === 'menstrual');
    c.innerHTML = `<h2 class="pc-title">${ttl}</h2>${chart(p)}
      <div style="margin-top:6px">${row(T({ es: '⚖️ Peso', en: '⚖️ Weight', pt: '⚖️ Peso' }), p.w0, p.w12, ' kg')}${row(T({ es: '🔥 Grasa corporal (est.)', en: '🔥 Body fat (est.)', pt: '🔥 Gordura corporal (est.)' }), p.bf0, p.bf12, ' %')}${row(T({ es: '📏 Cintura', en: '📏 Waist', pt: '📏 Cintura' }), p.waist0, p.waist12, ' cm')}</div>
      <p class="pc-note">${T({ es: 'Ritmo estimado', en: 'Estimated rate', pt: 'Ritmo estimado' })}: <b>${sg(p.rate)} kg/${T({ es: 'sem', en: 'wk', pt: 'sem' })}</b> · ${T({ es: 'Constancia en entrenos', en: 'Workout consistency', pt: 'Constância nos treinos' })}: <b>${pct(p.wa)}</b>${p.da != null ? ` · ${T({ es: 'Dieta', en: 'Diet', pt: 'Dieta' })}: <b>${pct(p.da)}</b>` : ''}</p>
      <p class="pc-note">${p.basis === 'trend' ? T({ es: 'Basado en tu tendencia real de peso, tu objetivo y tu constancia.', en: 'Based on your real weight trend, your goal and consistency.', pt: 'Baseado na sua tendência real de peso, objetivo e constância.' }) : T({ es: 'Basado en tu objetivo y tu constancia. Registrá tu peso 2-3 veces por semana durante 2 semanas para usar tu tendencia real.', en: 'Based on your goal and consistency. Log weight 2-3×/week for 2 weeks to use your real trend.', pt: 'Baseado no objetivo e constância. Registre o peso 2-3×/semana por 2 semanas para usar sua tendência real.' })}${p.waist0 ? '' : ' ' + T({ es: 'Cargá tu cintura en Medidas para estimar la grasa.', en: 'Log your waist in Measures to estimate body fat.', pt: 'Registre a cintura em Medidas para estimar a gordura.' })}${water ? ' ' + T({ es: '🌙 Ojo: en esta fase del ciclo es normal retener líquido; el peso puede marcar más.', en: '🌙 Note: water retention is normal in this cycle phase; weight may read higher.', pt: '🌙 Atenção: nesta fase do ciclo é normal reter líquido; o peso pode marcar mais.' }) : ''}</p>
      <p class="pc-note" style="font-size:.72rem">${T({ es: 'Si subís la constancia, la línea se acerca a tu objetivo. Estimación orientativa: la grasa se calcula con la fórmula RFM (altura/cintura); los resultados reales varían.', en: 'Higher consistency moves the line toward your goal. Illustrative estimate: body fat uses the RFM formula (height/waist); real results vary.', pt: 'Mais constância aproxima a linha do objetivo. Estimativa orientativa: gordura pela fórmula RFM (altura/cintura); resultados reais variam.' })}</p>`;
  }

  function refresh() { try { renderCycleCard(); } catch (e) { console.warn(e); } try { if (lastDK) loadWorkoutDay(lastDK); } catch (e) {} try { renderWear(); } catch (e) {} try { typeof updateNutritionAndHero === 'function' && updateNutritionAndHero(user()); } catch (e) {} }
  let lastDK = null;
  window.hpAfterReady = () => { try { renderWear(); } catch (e) {} };
  const origLWD = window.loadWorkoutDay;
  if (typeof origLWD === 'function') window.loadWorkoutDay = function (dk) { lastDK = dk; const r = origLWD.apply(this, arguments); setTimeout(() => { try { renderCycleCard(); renderWear(); } catch (e) { console.warn(e); } }, 0); return r; };
  const origSW = window.switchTab;
  window.switchTab = function (id) { const r = origSW.apply(this, arguments); try { if (id === 'workout-history-tab') renderPredict(); if (id === 'diet-tab') logDietAdh(); } catch (e) { console.warn(e); } return r; };
  const origRD = window.renderDiet;
  if (typeof origRD === 'function') window.renderDiet = function () { const r = origRD.apply(this, arguments); try { logDietAdh(); } catch (e) {} return r; };
  setTimeout(function boot() { if (!currentUser) return setTimeout(boot, 1500); try { renderCycleCard(); renderWear(); } catch (e) { console.warn(e); } }, 1500);
})();
