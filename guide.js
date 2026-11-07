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
  function play(which) {
    var root = document.getElementById('science-tab');
    if (!root || !window.hpSay) return;
    var text = '';
    if (which === 'all') {
      text = Array.prototype.map.call(root.querySelectorAll('.sci-speak'), function (el) { return el.innerText; }).join(' ');
    } else {
      var card = root.querySelector('[data-lesson="' + which + '"] .sci-speak');
      text = card ? card.innerText : '';
    }
    var list = sentences(text);
    if (!list.length) return;
    try { if (window.hpUnlock) window.hpUnlock(); } catch (e) {}
    setPlaying(true, which === 'all' ? '' : which);
    window.hpSay(list, true);
  }
  function stop() {
    try { if (window.hpHush) window.hpHush(); else speechSynthesis.cancel(); } catch (e) {}
    setPlaying(false);
  }
  function bind() {
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
