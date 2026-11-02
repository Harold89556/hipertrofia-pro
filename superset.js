/* Superseries / biseries: bloque visual único, rondas alternadas A1/A2 y flujo "sin descanso" con la voz. */
(function () {
  const L = () => (typeof LANG !== 'undefined' && ({ es: 1, en: 1, pt: 1 })[LANG] ? LANG : 'es');
  const TX = {
    es: { badge: 'Sin descanso entre ejercicios', flow: (a, s) => `${a} sin pausa · descanso ${s} al terminar cada ronda`, round: (r, n) => `Ronda ${r} de ${n}`, more: 'Técnica, notas y cambiar ejercicio',
      noRest: (ex, r, w) => `¡Sin descanso! Ahora ${ex}${r ? ': ' + r + ' repeticiones' : ''}${w ? ' con ' + num(w) + ' kilos' : ''}`,
      roundDone: r => `¡Ronda ${r} completa!`, nextRound: (r, ex, rp, w) => `Siguiente ronda, la ${r}: ${ex}${rp ? ', ' + rp + ' repeticiones' : ''}${w ? ' con ' + num(w) + ' kilos' : ''}. ¡Vamos!`,
      lastRound: '¡Última ronda, dejá todo!', ssDone: '¡Superserie terminada! Excelente trabajo.', bisDone: '¡Biserie terminada! Excelente trabajo.', nextEx: ex => `Ahora sigue ${ex}. ¡Vamos!`, sess: '¡Entrenamiento completo! Estoy orgullosa de vos.', go: '¡A trabajar!', toast: ex => `⚡ Sin descanso → ${ex}` },
    en: { badge: 'No rest between exercises', flow: (a, s) => `${a} back to back · rest ${s} after each round`, round: (r, n) => `Round ${r} of ${n}`, more: 'Technique, notes and swap',
      noRest: (ex, r, w) => `No rest! Now ${ex}${r ? ': ' + r + ' reps' : ''}${w ? ' with ' + num(w) + ' kilos' : ''}`,
      roundDone: r => `Round ${r} complete!`, nextRound: (r, ex, rp, w) => `Next round, number ${r}: ${ex}${rp ? ', ' + rp + ' reps' : ''}${w ? ' with ' + num(w) + ' kilos' : ''}. Let's go!`,
      lastRound: 'Last round, give it everything!', ssDone: 'Superset finished! Excellent work.', bisDone: 'Bi-set finished! Excellent work.', nextEx: ex => `Next up: ${ex}. Let's go!`, sess: 'Workout complete! I\'m proud of you.', go: 'Let\'s work!', toast: ex => `⚡ No rest → ${ex}` },
    pt: { badge: 'Sem descanso entre exercícios', flow: (a, s) => `${a} sem pausa · descanso ${s} ao terminar cada rodada`, round: (r, n) => `Rodada ${r} de ${n}`, more: 'Técnica, notas e trocar exercício',
      noRest: (ex, r, w) => `Sem descanso! Agora ${ex}${r ? ': ' + r + ' repetições' : ''}${w ? ' com ' + num(w) + ' quilos' : ''}`,
      roundDone: r => `Rodada ${r} completa!`, nextRound: (r, ex, rp, w) => `Próxima rodada, a ${r}: ${ex}${rp ? ', ' + rp + ' repetições' : ''}${w ? ' com ' + num(w) + ' quilos' : ''}. Vamos!`,
      lastRound: 'Última rodada, dê tudo!', ssDone: 'Supersérie concluída! Excelente trabalho.', bisDone: 'Bi-set concluído! Excelente trabalho.', nextEx: ex => `Agora vem ${ex}. Vamos!`, sess: 'Treino completo! Estou orgulhosa de você.', go: 'Bora trabalhar!', toast: ex => `⚡ Sem descanso → ${ex}` } };
  const T = () => TX[L()];
  function num(w) { const n = +w; return Number.isInteger(n) ? String(n) : String(n).replace('.', L() === 'en' ? '.' : ','); }
  const nm = n => { try { return exName(n); } catch (e) { return n; } };
  const prog = () => getProgramForUser(getUsersDB()[currentUser] || {});
  const done = (dk, j, s) => { try { return !!getSavedSetData(dk, j, s).completed; } catch (e) { return false; } };
  const coach = () => window._hpCoach || {};
  const techOn = () => localStorage.getItem('hp_vtech') !== '0';
  const motOn = () => localStorage.getItem('hp_vmot') !== '0';
  const secTxt = s => s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s / 60} min`) : `${s} s`;

  // grupo = ejercicios contiguos con el mismo group.id (biserie, superserie o triserie)
  function groupOf(exs, i) {
    const g = exs[i] && exs[i].group; if (!g) return null;
    let a = i, b = i; while (a > 0 && exs[a - 1].group && exs[a - 1].group.id === g.id) a--; while (b < exs.length - 1 && exs[b + 1].group && exs[b + 1].group.id === g.id) b++;
    if (a === b) return null;
    const members = []; for (let j = a; j <= b; j++) members.push(j);
    const rounds = Math.max(...members.map(j => exs[j].sets));
    const rest = Math.max(...members.map(j => exs[j].restSeconds || 0)) || 90;
    return { g, members, rounds, rest, end: b };
  }
  function letters(exs) { const out = {}; let k = 0; exs.forEach((e, i) => { const G = groupOf(exs, i); if (G && G.members[0] === i) { const c = String.fromCharCode(65 + k++); G.members.forEach((j, n) => out[j] = c + (n + 1)); } }); return out; }
  function target(dk, j, s, ex) {
    const tg = window._apTargets && window._apTargets[dk + '_' + j];
    const w = document.getElementById(`w_${dk}_${j}_${s}`), r = document.getElementById(`r_${dk}_${j}_${s}`);
    let reps = tg && !tg.first ? tg.reps : (r && r.value) || (tg && tg.lo) || (String(ex.target || '').match(/\d+(?:-\d+)?/) || [''])[0];
    let kg = tg && !tg.first ? tg.w : (w && +w.value) || 0;
    return { reps: String(reps || '').replace('-', ' a '), kg };
  }
  function focusRow(dk, j, s) {
    document.querySelectorAll('.set-row.ss-next').forEach(x => x.classList.remove('ss-next'));
    const row = document.getElementById(`row_${dk}_${j}_${s}`); if (!row) return;
    row.classList.add('ss-next'); setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  }
  function nextRound(dk, exs, G) { for (let r = 1; r <= G.rounds; r++) for (const j of G.members) if (exs[j].sets >= r && !done(dk, j, r)) return { r, j }; return null; }

  // Llamado por completeSetWorkflow. Devuelve true si se encargó del descanso/scroll.
  window.hpSuperset = function (dk, i, s, program) {
    const exs = program[dk].exercises; const G = groupOf(exs, i); if (!G) return false;
    const pend = G.members.find(j => exs[j].sets >= s && !done(dk, j, s));
    if (pend !== undefined) { // falta otro ejercicio de esta ronda: NO hay descanso
      try { resetTimer(); } catch (e) {}
      const ex = exs[pend], tg = target(dk, pend, s, ex), n = nm(ex.name);
      const msg = [T().noRest(n, tg.reps, tg.kg)]; if (techOn() && coach().oneCue) msg.push(coach().oneCue(ex.origName || ex.name));
      if (window.hpSay) window.hpSay(msg);
      if (typeof showToast === 'function') showToast(T().toast(n));
      focusRow(dk, pend, s); return true;
    }
    const nx = nextRound(dk, exs, G);
    startTimer(G.rest, 'timer.restEx', { name: tc(G.g.id) });
    if (nx) focusRow(dk, nx.j, nx.r);
    else { document.querySelectorAll('.set-row.ss-next').forEach(x => x.classList.remove('ss-next')); const c = document.getElementById(`card_${dk}_${G.end + 1}`); if (c) setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500); }
    return true;
  };
  // Mensajes de voz del descanso (usado por pro2.js nextInfo)
  window.hpSSNext = function (ls) {
    if (!ls) return null; let exs; try { exs = prog()[ls.dk].exercises; } catch (e) { return null; }
    const G = groupOf(exs, ls.i); if (!G) return null;
    const nx = nextRound(ls.dk, exs, G);
    if (nx) {
      const ex = exs[nx.j], tg = target(ls.dk, nx.j, nx.r, ex);
      const msg = []; if (motOn() && nx.r === G.rounds) msg.push(T().lastRound);
      msg.push(T().nextRound(nx.r, nm(ex.name), tg.reps, tg.kg)); if (techOn() && coach().oneCue) msg.push(coach().oneCue(ex.origName || ex.name));
      return { last: false, first: T().roundDone(ls.s), msg };
    }
    const after = exs[G.end + 1];
    const msg = [after ? T().nextEx(nm(after.name)) : T().go]; if (after && techOn() && coach().fullCues) msg.push(...coach().fullCues(after.origName || after.name));
    return { last: true, lastEx: !after, first: after ? (G.g.kind === 'bis' ? T().bisDone : T().ssDone) : T().sess, msg };
  };

  // Render: un solo bloque con las tarjetas compactas y una tabla de rondas alternadas
  function render() {
    const cont = document.getElementById('exercises-container'); if (!cont || !currentUser) return;
    const first = cont.querySelector('.exercise-card[id^="card_"]'); if (!first) return;
    const dk = first.id.match(/^card_(.+)_\d+$/)[1]; let exs; try { exs = prog()[dk].exercises; } catch (e) { return; }
    const LET = letters(exs);
    exs.forEach((ex, i) => {
      const G = groupOf(exs, i); if (!G || G.members[0] !== i) return;
      const c0 = document.getElementById(`card_${dk}_${i}`); if (!c0 || c0.closest('.ss-block')) return;
      const block = document.createElement('div'); block.className = 'ss-block';
      const head = c0.previousElementSibling && c0.previousElementSibling.classList.contains('group-head') ? c0.previousElementSibling : null;
      const kindTitle = G.g.kind === 'bis' ? t('bis.title', { g: catEsc(tc(G.g.id)) }) : '⚡ ' + catEsc(tc(G.g.id));
      const seq = G.members.map(j => LET[j]).join(' → ');
      cont.insertBefore(block, head || c0); if (head) head.remove();
      block.innerHTML = `<div class="ss-head"><b>${kindTitle}</b><span class="ss-badge">⛔⏱️ ${T().badge}</span><small>${T().flow(seq, secTxt(G.rest))}</small></div>`;
      const tb = document.createElement('table'); tb.className = 'ss-rounds';
      tb.innerHTML = `<thead><tr><th></th><th>${t('th.load')}</th><th>${t('th.reps')}</th><th>${t('th.state')}</th></tr></thead>`;
      const body = document.createElement('tbody'); tb.appendChild(body);
      G.members.forEach(j => {
        const c = document.getElementById(`card_${dk}_${j}`); if (!c) return; block.appendChild(c); c.classList.add('ss-card');
        const tt = c.querySelector('.exercise-title > span'); if (tt && !tt.querySelector('.ss-tag')) tt.insertAdjacentHTML('afterbegin', `<span class="ss-tag">${LET[j]}</span>`);
        const keep = new Set(['exercise-title', 'angle-chip', 'ap-box', 'inj-flag', 'rec-box']);
        const det = document.createElement('details'); det.className = 'ss-more'; det.innerHTML = `<summary>${T().more}</summary>`;
        [...c.children].forEach(ch => { if (ch.classList.contains('sets-table-wrapper')) return; if (![...ch.classList].some(k => keep.has(k))) det.appendChild(ch); });
        c.appendChild(det);
      });
      for (let r = 1; r <= G.rounds; r++) {
        const hr = document.createElement('tr'); hr.className = 'ss-round-h'; hr.innerHTML = `<td colspan="4">${T().round(r, G.rounds)}</td>`; body.appendChild(hr);
        G.members.forEach(j => {
          const row = document.getElementById(`row_${dk}_${j}_${r}`); if (!row) return;
          row.classList.add('ss-row'); row.cells[0].innerHTML = `<span class="ss-tag">${LET[j]}</span><small>${catEsc(nm(exs[j].name)).slice(0, 18)}</small>`;
          body.appendChild(row);
        });
      }
      G.members.forEach(j => { const w = document.querySelector(`#card_${dk}_${j} .sets-table-wrapper`); if (w) w.remove(); });
      const wrap = document.createElement('div'); wrap.className = 'sets-table-wrapper ss-table'; wrap.appendChild(tb); block.appendChild(wrap);
      const nx = nextRound(dk, exs, G); if (nx && (nx.r > 1 || nx.j !== G.members[0])) { const row = document.getElementById(`row_${dk}_${nx.j}_${nx.r}`); if (row) row.classList.add('ss-next'); }
    });
  }
  window.hpSSRender = render;
  const st = document.createElement('style');
  st.textContent = `.ss-block{border:2px solid var(--accent);border-radius:16px;padding:10px;margin:16px 0;background:rgba(255,255,255,.03)}
.ss-head{display:flex;flex-direction:column;gap:4px;margin:2px 4px 10px}.ss-head small{color:#a1a1aa;font-size:12px}
.ss-badge{align-self:flex-start;background:var(--accent);color:#000;font-weight:800;font-size:12px;padding:3px 10px;border-radius:999px}
.ss-block .exercise-card{margin-bottom:8px;padding:12px;border-left:3px solid var(--accent)}
.ss-tag{display:inline-block;min-width:26px;text-align:center;background:var(--accent);color:#000;font-weight:800;border-radius:8px;padding:1px 6px;margin-right:6px;font-size:13px}
.ss-more summary{cursor:pointer;color:#a1a1aa;font-size:13px;padding:8px 0;min-height:32px}
.ss-rounds{width:100%}.ss-round-h td{font-weight:800;color:var(--accent);padding:10px 4px 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
.ss-row td:first-child{white-space:nowrap}.ss-row td:first-child small{display:block;color:#a1a1aa;font-size:10px;max-width:80px;overflow:hidden;text-overflow:ellipsis}
.ss-row .prev-ref{font-size:10px;white-space:nowrap;display:block;line-height:1.2;margin-bottom:2px}
.ss-row button[id^="btn_"]{min-height:44px;min-width:64px}
.set-row.ss-next{outline:2px solid var(--accent);outline-offset:-2px;animation:ssPulse 1.2s ease-in-out 3}
@keyframes ssPulse{50%{background:rgba(255,255,255,.12)}}`;
  document.head.appendChild(st);
  const origLWD = window.loadWorkoutDay;
  if (typeof origLWD === 'function') window.loadWorkoutDay = function () { const r = origLWD.apply(this, arguments); try { render(); } catch (e) { console.warn('superset', e); } return r; };
  setTimeout(() => { try { render(); } catch (e) {} }, 700);
})();
