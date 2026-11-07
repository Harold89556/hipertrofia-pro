/* Clases con audio de la Guía científica: usa la voz del teléfono (hpSay). */
(function () {
  function sentences(s) {
    return String(s || '').replace(/\s+/g, ' ').trim()
      .split(/(?<=[.!?…])\s+/)
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 1; });
  }
  function setPlaying(on, lesson) {
    document.body.classList.toggle('sci-playing', on);
    var stop = document.getElementById('sci-stop');
    if (stop) stop.hidden = !on;
    document.querySelectorAll('#science-tab .sci-lesson').forEach(function (el) {
      el.classList.toggle('sci-on', !!(on && lesson && el.dataset.lesson === lesson));
    });
    if (on) watchEnd();
    else if (window._sciWatch) clearInterval(window._sciWatch);
  }
  function watchEnd() {
    if (window._sciWatch) clearInterval(window._sciWatch);
    var quiet = 0;
    window._sciWatch = setInterval(function () {
      try {
        if (speechSynthesis.speaking || speechSynthesis.pending) { quiet = 0; return; }
        quiet++;
        if (quiet >= 3) { clearInterval(window._sciWatch); setPlaying(false); }
      } catch (e) { clearInterval(window._sciWatch); setPlaying(false); }
    }, 400);
  }
  function showMenu(on) {
    var menu = document.getElementById('sci-menu');
    var btn = document.getElementById('sci-open');
    if (!menu || !btn) return;
    menu.hidden = !on;
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    var key = on ? 'sci.hideMenu' : 'sci.openMenu';
    if (typeof setI18n === 'function') setI18n(btn, key);
    else {
      btn.setAttribute('data-i18n', key);
      btn.textContent = on ? 'Cerrar clases' : '🎧 Ver clases';
    }
  }
  function spoken(el) {
    return el ? (el.textContent || '') : '';
  }
  function play(which) {
    var root = document.getElementById('science-tab');
    if (!root || !window.hpSay) return;
    var text = '';
    if (which === 'all') {
      text = Array.prototype.map.call(root.querySelectorAll('.sci-speak'), function (el) { return spoken(el); }).join(' ');
    } else {
      var card = root.querySelector('[data-lesson="' + which + '"] .sci-speak');
      text = spoken(card);
    }
    var list = sentences(text);
    if (!list.length) return;
    showMenu(true);
    if (which !== 'all') {
      var lesson = root.querySelector('[data-lesson="' + which + '"]');
      if (lesson && 'open' in lesson) lesson.open = true;
      try { if (lesson) lesson.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
    try { if (window.hpUnlock) window.hpUnlock(); } catch (e) {}
    setPlaying(true, which === 'all' ? '' : which);
    window.hpSay(list, true);
  }
  function stop() {
    try { if (window.hpHush) window.hpHush(); else speechSynthesis.cancel(); } catch (e) {}
    setPlaying(false);
  }
  function bind() {
    var openBtn = document.getElementById('sci-open');
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = '1';
      openBtn.addEventListener('click', function () {
        var menu = document.getElementById('sci-menu');
        showMenu(menu && menu.hidden);
      });
    }
    var all = document.getElementById('sci-play-all');
    var stopBtn = document.getElementById('sci-stop');
    if (all && !all.dataset.bound) {
      all.dataset.bound = '1';
      all.addEventListener('click', function () { play('all'); });
    }
    if (stopBtn && !stopBtn.dataset.bound) {
      stopBtn.dataset.bound = '1';
      stopBtn.addEventListener('click', stop);
    }
    document.querySelectorAll('#science-tab .sci-play').forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', function () { play(b.getAttribute('data-play')); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

/* Pistas cortas en el descanso: rotan, no se repiten, y si se puede van al ejercicio de turno. */
(function () {
  var TIPS = [
    { id: 'g-grow', es: 'El músculo no crece en la serie: crece ahora, mientras descansás. Este descanso es parte del entreno.',
      en: 'Muscle does not grow during the set: it grows now, while you rest. This rest is part of the workout.',
      pt: 'O músculo não cresce na série: cresce agora, enquanto você descansa. Este descanso faz parte do treino.' },
    { id: 'g-mps', es: 'La síntesis de proteína sube después de entrenar y baja a las 36 o 48 horas. Por eso cada músculo se trabaja dos veces por semana.',
      en: 'Protein synthesis rises after training and drops at 36 to 48 hours. That is why each muscle is trained twice a week.',
      pt: 'A síntese de proteína sobe depois do treino e cai às 36 ou 48 horas. Por isso cada músculo é treinado duas vezes por semana.' },
    { id: 'g-sleep', es: 'Dormir entre 7 y 9 horas es tan importante como la serie. Ahí se recupera el sistema nervioso y se construye músculo.',
      en: 'Sleeping 7 to 9 hours matters as much as the set. That is when the nervous system recovers and muscle is built.',
      pt: 'Dormir entre 7 e 9 horas é tão importante quanto a série. É aí que o sistema nervoso recupera e o músculo é construído.' },
    { id: 'g-restsets', es: 'En series pesadas, dos o tres minutos de descanso te dejan repetir con calidad. No acortes si todavía vas jadeando.',
      en: 'On heavy sets, two or three minutes of rest let you repeat with quality. Do not cut it short if you are still gasping.',
      pt: 'Em séries pesadas, dois ou três minutos de descanso deixam você repetir com qualidade. Não corte se ainda estiver ofegante.' },
    { id: 'g-volume', es: 'La ciencia actual apunta a varias series de calidad por músculo por semana, cerca del fallo, no a una sola serie heroica.',
      en: 'Current science points to several quality weekly sets per muscle, close to failure, not one heroic set.',
      pt: 'A ciência atual aponta para várias séries de qualidade por músculo na semana, perto da falha, não uma única série heroica.' },
    { id: 'g-rir', es: 'No hace falta llegar al fallo en todas las series. Dejar una o dos repeticiones en reserva suele dar el mismo crecimiento con menos desgaste.',
      en: 'You do not need to hit failure on every set. Leaving one or two reps in reserve often grows as much with less wear.',
      pt: 'Não precisa chegar à falha em todas as séries. Deixar uma ou duas repetições na reserva costuma dar o mesmo crescimento com menos desgaste.' },
    { id: 'g-prog', es: 'Para progresar, primero buscá una repetición más en el rango. Cuando las completás todas, ahí sí subí la carga.',
      en: 'To progress, first chase one more rep in the range. When you hit them all, then add load.',
      pt: 'Para progredir, primeiro busque mais uma repetição na faixa. Quando completar todas, aí sim aumente a carga.' },
    { id: 'g-stretch', es: 'La tensión con el músculo estirado es uno de los mejores estímulos. Controlá la bajada: ahí también crecés.',
      en: 'Tension with the muscle stretched is one of the best stimuli. Control the lowering: you grow there too.',
      pt: 'A tensão com o músculo alongado é um dos melhores estímulos. Controle a descida: você também cresce aí.' },
    { id: 'g-mm-rest', es: 'Mike Mentzer insistía en esto: no crecés en el gimnasio, crecés cuando te recuperás. Este descanso es oro.',
      en: 'Mike Mentzer insisted on this: you do not grow in the gym, you grow when you recover. This rest is gold.',
      pt: 'Mike Mentzer insistia nisto: você não cresce na academia, cresce quando recupera. Este descanso é ouro.' },
    { id: 'g-mm-intense', es: 'Mentzer pedía series breves e intensas, cerca del fallo verdadero. La intensidad importa: no ahorres foco en estas repeticiones.',
      en: 'Mentzer wanted brief, intense sets close to true failure. Intensity matters: do not waste focus on these reps.',
      pt: 'Mentzer pedia séries breves e intensas, perto da falha verdadeira. A intensidade importa: não poupe foco nestas repetições.' },
    { id: 'g-mm-vol', es: 'Mentzer tenía razón con el descanso. La ciencia de hoy, eso sí, suele pedir más de una o dos series por ejercicio para la mayoría.',
      en: 'Mentzer was right about rest. Today’s science, though, usually asks most people for more than one or two sets per exercise.',
      pt: 'Mentzer tinha razão sobre o descanso. A ciência de hoje, porém, costuma pedir à maioria mais do que uma ou duas séries por exercício.' },
    { id: 'g-ar-mind', es: 'Arnold entrenaba con una conexión mente-músculo feroz. En la próxima serie, sentí el músculo trabajar, no solo mover el peso.',
      en: 'Arnold trained with a fierce mind-muscle connection. On the next set, feel the muscle work, do not just move the weight.',
      pt: 'Arnold treinava com uma conexão mente-músculo forte. Na próxima série, sinta o músculo trabalhar, não só mover o peso.' },
    { id: 'g-ar-consist', es: 'Arnold repetía que progresa el que vuelve. Superá lo de la semana pasada, aunque sea una repetición.',
      en: 'Arnold used to say progress belongs to the one who comes back. Beat last week, even if it is just one rep.',
      pt: 'Arnold repetia que progride quem volta. Supere o da semana passada, ainda que seja só uma repetição.' },
    { id: 'g-ar-vol', es: 'Arnold hacía mucho volumen. La ciencia dice que el volumen ayuda hasta el punto que puedas recuperar: más no siempre es mejor.',
      en: 'Arnold did a lot of volume. Science says volume helps up to what you can recover from: more is not always better.',
      pt: 'Arnold fazia muito volume. A ciência diz que o volume ajuda até o ponto em que você consegue recuperar: mais nem sempre é melhor.' },
    { id: 'g-hr-fst', es: 'Hany Rambod, el entrenador de CBum, usa el FST-7 como cierre: siete series cortas para el bombeo. No es el entreno entero, es el broche.',
      en: 'Hany Rambod, CBum’s coach, uses FST-7 as a closer: seven short sets for the pump. It is not the whole workout, it is the finisher.',
      pt: 'Hany Rambod, o treinador do CBum, usa o FST-7 como fechamento: sete séries curtas para o bombeamento. Não é o treino inteiro, é o broche.' },
    { id: 'g-hr-pump', es: 'Rambod busca el bombeo y el estiramiento de la fascia. La ciencia ve eso como un extra: el motor principal sigue siendo la tensión progresiva.',
      en: 'Rambod chases the pump and stretching the fascia. Science sees that as extra: the main driver is still progressive tension.',
      pt: 'Rambod busca o bombeamento e o alongamento da fáscia. A ciência vê isso como um extra: o motor principal continua sendo a tensão progressiva.' },
    { id: 'g-hr-detail', es: 'El sello de Rambod con CBum es el detalle y los puntos débiles. Hoy concentráte en hacer cada repetición limpia.',
      en: 'Rambod’s stamp with CBum is detail and weak points. Today, focus on making every rep clean.',
      pt: 'A marca de Rambod com o CBum é o detalhe e os pontos fracos. Hoje, concentre-se em fazer cada repetição limpa.' },
    { id: 'g-close', es: 'Progresar no es magia: calidad en la serie, comer para bancarla, dormir de verdad y volver a superar lo de la semana pasada.',
      en: 'Progress is not magic: quality in the set, eat enough to support it, sleep for real, and come back to beat last week.',
      pt: 'Progredir não é mágica: qualidade na série, comer para sustentá-la, dormir de verdade e voltar a superar o da semana passada.' },

    { id: 'x-bench', match: /press plano|press de banca|press de pecho|flexiones de brazos|bench press/i,
      es: 'En el press de banca, bajá con control. El pecho trabaja más cuando está estirado abajo: no rebotes la barra.',
      en: 'On the bench press, lower under control. The chest works more when it is stretched at the bottom: do not bounce the bar.',
      pt: 'No supino, desça com controle. O peito trabalha mais quando está alongado embaixo: não quique a barra.' },
    { id: 'x-incline', match: /press inclinado/i,
      es: 'En el press inclinado, un banco de unos 30 grados carga la parte alta del pecho. Bajá hasta sentir el estiramiento, sin abrir de más los codos.',
      en: 'On the incline press, a bench around 30 degrees loads the upper chest. Lower until you feel the stretch, without flaring the elbows.',
      pt: 'No supino inclinado, um banco de uns 30 graus carrega a parte alta do peito. Desça até sentir o alongamento, sem abrir demais os cotovelos.' },
    { id: 'x-fly', match: /aperturas|peck deck|cruce de poleas|chest fly/i,
      es: 'Arnold amaba las aperturas para sentir el pecho. Abrí con control y juntá pensando en abrazar, sin forzar el hombro.',
      en: 'Arnold loved flyes to feel the chest. Open under control and hug together, without forcing the shoulder.',
      pt: 'Arnold amava as aberturas para sentir o peito. Abra com controle e junte pensando em abraçar, sem forçar o ombro.' },
    { id: 'x-dips', match: /fondos en paralelas|fondos|dips/i,
      es: 'En los fondos, inclinarte un poco adelante enfatiza el pecho. Bajá hasta el estiramiento que tu hombro tolere, nada más.',
      en: 'On dips, leaning a bit forward emphasizes the chest. Lower only to the stretch your shoulder can tolerate.',
      pt: 'Nos fundos, inclinar um pouco à frente enfatiza o peito. Desça só até o alongamento que o seu ombro tolera.' },
    { id: 'x-ohp', match: /press militar|press de hombros|press arnold|overhead press/i,
      es: 'El press de hombros pide abdomen y glúteos firmes. Es un ejercicio pesado: usá este descanso para llegar estable a la próxima.',
      en: 'The overhead press needs a braced core and glutes. It is a heavy lift: use this rest to arrive stable for the next set.',
      pt: 'O desenvolvimento pede abdômen e glúteos firmes. É um exercício pesado: use este descanso para chegar estável na próxima.' },
    { id: 'x-side', match: /elevaci[oó]n(es)? laterale?s?|lateral raise|remo al ment[oó]n/i,
      es: 'En las laterales, subí con el codo, no con la mano. Es un aislamiento: peso controlable y sin balanceo.',
      en: 'On lateral raises, lead with the elbow, not the hand. It is an isolation move: controllable weight and no swinging.',
      pt: 'Nas elevações laterais, suba com o cotovelo, não com a mão. É um isolamento: peso controlável e sem balanço.' },
    { id: 'x-rear', match: /p[aá]jaros|face pull|deltoides posterior|rear delt/i,
      es: 'El deltoides posterior se trabaja con poco peso y mucha atención. Pensá en llevar los codos atrás, sin tirones.',
      en: 'The rear delt is trained with light weight and a lot of attention. Think of driving the elbows back, with no jerking.',
      pt: 'O deltoide posterior se trabalha com pouco peso e muita atenção. Pense em levar os cotovelos para trás, sem trancos.' },
    { id: 'x-lat', match: /jal[oó]n|dominadas|pull-?ups?|pulldown/i,
      es: 'En el jalón o las dominadas, sentí el estiramiento arriba. Tirar con los codos hacia la cadera activa más la espalda que balancearte.',
      en: 'On pulldowns or pull-ups, feel the stretch at the top. Driving the elbows toward the hips works the back more than swinging.',
      pt: 'No pulley ou nas barras, sinta o alongamento em cima. Puxar com os cotovelos rumo ao quadril ativa mais as costas do que balançar.' },
    { id: 'x-row', match: /remo|row/i,
      es: 'En el remo, la ciencia premia la tensión y el control. Pecho arriba y el codo hacia la cadera: apretá la espalda un segundo.',
      en: 'On rows, science rewards tension and control. Chest up and elbow to the hip: squeeze the back for a second.',
      pt: 'No remo, a ciência premia a tensão e o controle. Peito para cima e cotovelo rumo ao quadril: contraia as costas por um segundo.' },
    { id: 'x-pullover', match: /pullover/i,
      es: 'El pullover estira dorsal y pecho a la vez. Manténé los codos fijos y el abdomen firme para no arquear la espalda baja.',
      en: 'The pullover stretches the lats and chest at once. Keep the elbows fixed and the core braced so you do not arch the lower back.',
      pt: 'O pullover alonga dorsal e peito ao mesmo tempo. Mantenha os cotovelos fixos e o abdômen firme para não arquear a lombar.' },
    { id: 'x-squat', match: /sentadilla|squat/i,
      es: 'La sentadilla pide más descanso porque fatiga el sistema nervioso. Dos o tres minutos acá rinden más que apurarte con mala técnica.',
      en: 'Squats need more rest because they tax the nervous system. Two or three minutes here beat rushing with sloppy form.',
      pt: 'O agachamento pede mais descanso porque fatiga o sistema nervoso. Dois ou três minutos aqui rendem mais do que apressar com má técnica.' },
    { id: 'x-rdl', match: /peso muerto rumano|romanian|rdl|buenos d[ií]as|good morning/i,
      es: 'En el peso muerto rumano, la bajada lenta estira los isquios. Eso es tensión en estiramiento: oro para crecer.',
      en: 'On the Romanian deadlift, a slow lowering stretches the hamstrings. That is stretch-mediated tension: gold for growth.',
      pt: 'No levantamento terra romeno, a descida lenta alonga os posteriores. Isso é tensão no alongamento: ouro para crescer.' },
    { id: 'x-dl', match: /peso muerto(?! rumano)|deadlift(?! rumano)/i,
      es: 'El peso muerto es muy exigente. Mentzer pedía intensidad y después recuperar de verdad: no acortes este descanso.',
      en: 'The deadlift is very demanding. Mentzer wanted intensity and then real recovery: do not cut this rest short.',
      pt: 'O levantamento terra é muito exigente. Mentzer pedia intensidade e depois recuperar de verdade: não corte este descanso.' },
    { id: 'x-legpress', match: /prensa|leg press/i,
      es: 'En la prensa, no bloquees de golpe las rodillas. Controlá el descenso y sentí el estiramiento abajo.',
      en: 'On the leg press, do not slam the knees into lockout. Control the descent and feel the stretch at the bottom.',
      pt: 'No leg press, não trave os joelhos de golpe. Controle a descida e sinta o alongamento embaixo.' },
    { id: 'x-lunge', match: /zancada|estocada|lunge|b[uú]lgara/i,
      es: 'En zancadas o búlgaras, cada pierna trabaja sola. Bajá derecho y usá este descanso para igualar los dos lados.',
      en: 'On lunges or split squats, each leg works alone. Descend straight and use this rest to even out both sides.',
      pt: 'Em afundos ou búlgaros, cada perna trabalha sozinha. Desça alinhado e use este descanso para igualar os dois lados.' },
    { id: 'x-hip', match: /hip thrust|empuje de cadera|puente de gl[uú]teo/i,
      es: 'En el hip thrust, apretá fuerte el glúteo arriba. La conexión mente-músculo que tanto usaba Arnold acá se nota mucho.',
      en: 'On the hip thrust, squeeze the glute hard at the top. The mind-muscle connection Arnold loved shows a lot here.',
      pt: 'No hip thrust, contraia forte o glúteo em cima. A conexão mente-músculo que Arnold tanto usava aparece bastante aqui.' },
    { id: 'x-ham', match: /curl femoral|curl n[oó]rdico|femoral lying|lying leg curl/i,
      es: 'En el femoral, la bajada lenta vale más que un tirón. Tres segundos bajando dan más estímulo con el mismo peso.',
      en: 'On leg curls, a slow lowering beats a jerk. Three seconds on the way down give more stimulus with the same weight.',
      pt: 'No mesa flexora, a descida lenta vale mais do que um tranco. Três segundos descendo dão mais estímulo com o mesmo peso.' },
    { id: 'x-legext', match: /extensi[oó]n de (piernas|cu[aá]driceps)|leg extension/i,
      es: 'En la extensión de cuádriceps, la parte alta del movimiento aprieta. Controlá ambos extremos y cuidá la rodilla.',
      en: 'On leg extensions, the top of the movement is the squeeze. Control both ends and look after the knee.',
      pt: 'Na cadeira extensora, a parte alta do movimento é a contração. Controle as duas pontas e cuide do joelho.' },
    { id: 'x-curl', match: /curl(?! femoral)(?! n[oó]rdico)|b[ií]ceps/i,
      es: 'En el curl, codo quieto y bajada completa. Mentzer buscaba intensidad de verdad: cada repetición con foco, sin balanceo.',
      en: 'On curls, keep the elbow still and lower all the way. Mentzer wanted real intensity: every rep with focus, no swinging.',
      pt: 'No rosca, cotovelo parado e descida completa. Mentzer buscava intensidade de verdade: cada repetição com foco, sem balanço.' },
    { id: 'x-tri-oh', match: /sobre (la )?cabeza|press franc[eé]s|katana/i,
      es: 'El tríceps de cabeza larga crece más cuando el brazo está arriba, estirado. Bajá hasta sentirlo, con el codo quieto.',
      en: 'The long head of the triceps grows more when the arm is overhead and stretched. Lower until you feel it, elbow still.',
      pt: 'A cabeça longa do tríceps cresce mais quando o braço está acima, alongado. Desça até sentir, com o cotovelo parado.' },
    { id: 'x-tri', match: /pushdown|tr[ií]ceps|barra v|press cerrado/i,
      es: 'En el jalón de tríceps, extendé completo y apretá abajo. Es un buen cierre de aislamiento, al estilo FST-7 de Rambod.',
      en: 'On triceps pushdowns, lock out fully and squeeze at the bottom. It is a good isolation closer, in Rambod’s FST-7 style.',
      pt: 'No tríceps pulley, estenda tudo e contraia embaixo. É um bom fechamento de isolamento, no estilo FST-7 do Rambod.' },
    { id: 'x-calf', match: /gemelo|pantorrilla|calf|elevaci[oó]n de talones/i,
      es: 'En gemelos, estirá bien abajo y subí hasta el máximo. El rango completo es el estímulo: no hagas solo la mitad del movimiento.',
      en: 'On calves, stretch fully at the bottom and rise all the way up. Full range is the stimulus: do not do only half the movement.',
      pt: 'Nas panturrilhas, alongue bem embaixo e suba até o máximo. A amplitude completa é o estímulo: não faça só metade do movimento.' },
    { id: 'x-shrug', match: /encogimientos|shrug/i,
      es: 'En los encogimientos, subí los hombros hacia las orejas y listo. No hace falta rotarlos: eso no suma y carga el cuello.',
      en: 'On shrugs, lift the shoulders straight toward the ears and stop. No need to roll them: that adds nothing and loads the neck.',
      pt: 'Nos encolhimentos, suba os ombros rumo às orelhas e pronto. Não precisa girá-los: isso não soma e carrega o pescoço.' }
  ];

  function lang() {
    return (typeof LANG !== 'undefined' && (LANG === 'en' || LANG === 'pt')) ? LANG : 'es';
  }
  function heard() {
    try { return JSON.parse(sessionStorage.getItem('hp_sci_heard') || '[]'); } catch (e) { return []; }
  }
  function remember(id) {
    var h = heard().filter(function (x) { return x !== id; });
    h.push(id);
    if (h.length > 48) h = h.slice(-48);
    try { sessionStorage.setItem('hp_sci_heard', JSON.stringify(h)); } catch (e) {}
  }
  function pickFrom(list) {
    if (!list.length) return null;
    var h = heard();
    var used = {};
    h.forEach(function (id) { used[id] = true; });
    var unused = list.filter(function (t) { return !used[t.id]; });
    if (!unused.length) {
      var recent = {};
      h.slice(-8).forEach(function (id) { recent[id] = true; });
      unused = list.filter(function (t) { return !recent[t.id]; });
    }
    if (!unused.length) unused = list.filter(function (t) { return t.id !== h[h.length - 1]; });
    if (!unused.length) unused = list;
    var t = unused[Math.floor(Math.random() * unused.length)];
    remember(t.id);
    return t[lang()] || t.es;
  }

  window.hpRestLesson = function (ctx) {
    ctx = ctx || {};
    if (ctx.lastEx) return '';
    if (window._sciJustPlayed) { window._sciJustPlayed = false; return ''; }
    var name = String((ctx.last ? (ctx.next || ctx.ex) : (ctx.ex || ctx.next)) || '');
    var matched = TIPS.filter(function (t) { return t.match && name && t.match.test(name); });
    var general = TIPS.filter(function (t) { return !t.match; });
    var tip = pickFrom(matched) || pickFrom(general) || '';
    if (tip) window._sciJustPlayed = true;
    return tip;
  };
})();
