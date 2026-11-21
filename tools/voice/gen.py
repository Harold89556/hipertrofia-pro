import json, re, asyncio, os, subprocess, sys, hashlib
import edge_tts
VOICES = {'es': 'es-PY-TaniaNeural', 'en': 'en-US-AvaNeural', 'pt': 'pt-BR-FranciscaNeural'}
OUT = '/tmp/hp/voice'; CACHE = '/tmp/vgen/raw'
os.makedirs(CACHE, exist_ok=True)
def vnorm(x):
    x = x.replace('\u2063', ' '); x = re.sub(r'\s+', ' ', x).strip(); x = re.sub(r'[.\s]+$', '', x); return x.lower()
def fnv(s):
    h = 0x811c9dc5; b = s.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i+1] << 8); h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h
def keep(l, x):
    m = re.match(r'^(con|with|com) ([\d,.]+) (kilos|quilos)$', x)
    if m:
        w = float(m.group(2).replace(',', '.')); return l == 'es' and (w <= 100 or w == int(w))
    m = re.match(r'^(\d+)(?: (?:a|to) (\d+))? (repeticiones|reps|repetições)$', x)
    if m:
        a = int(m.group(1)); b = m.group(2)
        return a <= 40 if b is None else (3 <= a <= 25 and 1 <= int(b) - a <= 5)
    return True
src = json.load(open('/tmp/voice_texts.json'))
jobs = []
for l in ['es', 'en', 'pt']:
    seen = {}
    for x in src[l]:
        if not keep(l, x): continue
        n = vnorm(x)
        if not n: continue
        h = fnv(l + '|' + n)
        if h in seen and seen[h] != n: print('COLLISION', l, n, seen[h]); continue
        seen[h] = n; jobs.append((l, h, x.replace('\u2063', ' ').strip()))
print('jobs', len(jobs), {l: sum(1 for j in jobs if j[0] == l) for l in VOICES})
sem = asyncio.Semaphore(int(os.environ.get('CONC', '6')))
done = 0; fails = []
async def one(l, h, text):
    global done
    os.makedirs(f'{OUT}/{l}', exist_ok=True)
    dst = f'{OUT}/{l}/{h}.mp3'
    if os.path.exists(dst) and os.path.getsize(dst) > 500: done += 1; return
    raw = f'{CACHE}/{l}-{h}.mp3'
    async with sem:
        for attempt in range(4):
            try:
                if not (os.path.exists(raw) and os.path.getsize(raw) > 500):
                    await edge_tts.Communicate(text, VOICES[l], rate='-2%').save(raw)
                p = await asyncio.create_subprocess_exec('ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af',
                    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse',
                    '-ac', '1', '-ar', '24000', '-b:a', '32k', dst)
                await p.wait()
                if p.returncode == 0 and os.path.getsize(dst) > 300: break
            except Exception as e:
                if attempt == 3: fails.append((l, h, text, str(e)))
                await asyncio.sleep(2 * (attempt + 1))
        done += 1
        if done % 200 == 0: print('done', done, flush=True)
async def main():
    await asyncio.gather(*[one(*j) for j in jobs])
    man = {'v': 1, 'voices': VOICES}
    for l in VOICES:
        man[l] = sorted(h for (ll, h, _) in jobs if ll == l and os.path.exists(f'{OUT}/{l}/{h}.mp3'))
    json.dump(man, open(f'{OUT}/manifest.json', 'w'), separators=(',', ':'))
    print('fails', len(fails), fails[:5])
asyncio.run(main())
