import re, asyncio, json
from playwright.async_api import async_playwright
txt=open('/workspace/android/store/play-reviewer-login.txt').read()
em=re.search(r'Email:\s*(\S+)',txt).group(1); pw=re.search(r'Pass\w*:\s*(\S+)',txt,re.I).group(1)
JS = r"""
async () => {
  const out = { es: new Set(), en: new Set(), pt: new Set() }, add = (l, x) => { if (x && String(x).trim()) out[l].add(String(x)); };
  const origLang = LANG;
  // nombres de ejercicios: todas las rutinas (categorías × frecuencias × fases) + alternativas
  const names = new Set(); const u0 = getUsersDB()[currentUser] || {}; const s0 = getSettings();
  Object.values(HP_ALT).forEach(a => a.slice(1).forEach(n => names.add(n)));
  for (const g of DR_CAT) for (const f of Object.keys(FREQ_SCHEDULE)) for (const ph of DR_PH.concat(['recreativo'])) for (const gen of ['hombre', 'mujer']) {
    try { const p = buildProgram(Object.assign({}, u0, { goal: g, gender: gen }), Object.assign({}, s0, { frequency: +f, phase: ph })); Object.values(p.program || {}).forEach(d => (d.exercises || []).forEach(e => names.add(e.name))); } catch (e) {}
  }
  const C = window._hpCoach, VJ = window._hpVJ, TX = window._hpSSTX;
  const ws = []; for (let w = 0.5; w <= 250; w += 0.5) ws.push(w);
  const reps = []; for (let r = 1; r <= 40; r++) reps.push(String(r)); for (let a = 1; a <= 30; a++) for (let b = a + 1; b <= a + 10; b++) reps.push(a + '-' + b);
  const sci = {};
  for (const l of ['es', 'en', 'pt']) {
    setLang(l); await new Promise(r => setTimeout(r, 300));
    const P = C.PH[l];
    ['on', 'test', 'ten', 'cd', 'go', 'done', 'exDone'].forEach(k => add(l, P[k]));
    for (let sc = 10; sc <= 300; sc += 5) add(l, P.rest(sc));
    Object.values(C.MOT[l]).forEach(arr => arr.forEach(x => add(l, x)));
    add(l, C.TECH[l] + ':');
    const ci = { es: 2, en: 3, pt: 4 }[l]; (window.HP_CUES || []).forEach(c => (c[ci] || []).forEach(x => add(l, x)));
    names.forEach(n => { try { (hpCues(n, l).cues || []).forEach(x => add(l, x)); } catch (e) {} });
    (window._hpTips || []).forEach(tp => add(l, tp[l] || tp.es));
    Object.values(window._hpCyclePH || {}).forEach(p => p.voice && add(l, p.voice[l]));
    Object.keys(I18N[l]).filter(k => k.startsWith('fuel.voice.')).forEach(k => add(l, I18N[l][k]));
    const T = TX[l]; ['lastRound', 'ssDone', 'bisDone', 'sess', 'go'].forEach(k => add(l, T[k]));
    for (let r = 1; r <= 10; r++) { add(l, T.roundDone(r)); T.nextRound(r, 'X', '', 0).split(VJ.VSEP).slice(0, 1).forEach(x => add(l, x)); }
    // partes de frases variables
    names.forEach(n => { const nm = exName(n); add(l, nm); add(l, P.nextEx(nm)); P.next(nm, '1', 0).split(VJ.VSEP).slice(0, 1).forEach(x => add(l, x)); T.noRest(nm, '', 0).split(VJ.VSEP).slice(0, 1).forEach(x => add(l, x)); });
    add(l, P.next('X', '1', 0).split(VJ.VSEP).pop());
    reps.forEach(r => add(l, P.next('X', r, 0).split(VJ.VSEP)[1]));
    if (l === 'es') ws.forEach(w => add(l, P.next('X', '1', w).split(VJ.VSEP)[2]));
    // clases de la Guía científica
    try { switchTab('science-tab', document.querySelector("[onclick*='science-tab']") || document.createElement('button')); } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
    const tx = Array.prototype.map.call(document.querySelectorAll('#science-tab .sci-speak'), el => el.textContent || '');
    sci[l] = tx.length; tx.forEach(t => window._hpSentences(t).forEach(x => add(l, x)));
  }
  setLang(origLang);
  return { es: [...out.es], en: [...out.en], pt: [...out.pt], names: names.size, sci };
}
"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell')
        pg=await b.new_page(viewport={'width':390,'height':844})
        pg.on('pageerror', lambda e: print('PAGEERR', e) if 'register' not in str(e) else None)
        await pg.context.add_init_script("navigator.serviceWorker && Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined})"); await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(2500)
        await pg.fill('#login-email',em); await pg.fill('#login-password',pw); await pg.press('#login-password','Enter'); await pg.wait_for_timeout(7000)
        print('lang', await pg.evaluate("LANG"))
        r = await pg.evaluate(JS)
        print({k:(len(v) if isinstance(v,list) else v) for k,v in r.items()})
        json.dump(r, open('/tmp/voice_texts.json','w'), ensure_ascii=False)
        print('lang after', await pg.evaluate("LANG"))
        await pg.wait_for_timeout(2000)
        await b.close()
asyncio.run(main())
