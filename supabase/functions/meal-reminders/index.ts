// Meal reminders: called every 5 min by pg_cron. Sends a Web Push for each meal whose time just arrived.
import { createClient } from "npm:@supabase/supabase-js@2";
const APP = "https://harold89556.github.io/hipertrofia-pro/";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm);
  const t = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}
async function vapidJwt(audience: string, subject: string, publicRaw: Uint8Array, privateRaw: Uint8Array): Promise<string> {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const unsigned = `${header}.${payload}`;
  const x = b64urlEncode(publicRaw.slice(1, 33));
  const y = b64urlEncode(publicRaw.slice(33, 65));
  const d = b64urlEncode(privateRaw);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64urlEncode(sig)}`;
}
async function sendWebPush(opts: {
  endpoint: string; p256dh: string; auth: string; payload: string;
  vapidPublic: string; vapidPrivate: string; subject: string;
}): Promise<{ ok: boolean; status: number }> {
  const subscriberKey = b64urlDecode(opts.p256dh);
  const subscriberAuth = b64urlDecode(opts.auth);
  const vapidPub = b64urlDecode(opts.vapidPublic);
  const vapidPriv = b64urlDecode(opts.vapidPrivate);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPub = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const userKey = await crypto.subtle.importKey("raw", subscriberKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userKey }, local.privateKey, 256));
  const enc = new TextEncoder();
  const keyInfo = concat(enc.encode("WebPush: info\0"), subscriberKey, localPub);
  const ikm = await hkdf(subscriberAuth, shared, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const plain = concat(enc.encode(opts.payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plain));
  const rs = 4096;
  const body = concat(salt, new Uint8Array([0, 0, (rs >> 8) & 255, rs & 255]), new Uint8Array([localPub.length]), localPub, ciphertext);
  const jwt = await vapidJwt(new URL(opts.endpoint).origin, opts.subject, vapidPub, vapidPriv);
  const res = await fetch(opts.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${opts.vapidPublic}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}


const COPY: Record<string, { title: (n: string) => string; body: string; supp: string }> = {
  es: { title: (n) => `🍽️ Hora de: ${n}`, body: "Abrí tu dieta para ver qué te toca.", supp: "Tomá también" },
  en: { title: (n) => `🍽️ Time for: ${n}`, body: "Open your diet to see what's next.", supp: "Also take" },
  pt: { title: (n) => `🍽️ Hora de: ${n}`, body: "Abra sua dieta para ver o que tem agora.", supp: "Tome também" },
};
function localNow(tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
  const p: Record<string, string> = {}; for (const x of f.formatToParts(new Date())) p[x.type] = x.value;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute), dow };
}
const DRANK: Record<string, string> = { es: "✅ Ya tomé", en: "✅ I drank it", pt: "✅ Já bebi" };
// ml de la toma: campo ml (app v48+) o el número del nombre ("300 ml")
const waterMl = (m: { ml?: number; name?: string }) => Number(m.ml) > 0 ? Math.round(Number(m.ml)) : Number(String(m.name || "").replace(/[^\d]/g, "")) || 0;
const toMin = (s: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: key } = await db.rpc("read_cron_key");
  if (!key || req.headers.get("x-cron-key") !== key) return json(401, { error: "auth" });
  const { data: secrets } = await db.rpc("read_push_secrets");
  const vapidPublic = secrets?.vapid_public, vapidPrivate = secrets?.vapid_private;
  if (!vapidPublic || !vapidPrivate) return json(503, { error: "not configured" });

  const { data: rows } = await db.from("meal_reminders").select("*").eq("enabled", true);
  let sent = 0;
  for (const r of rows || []) {
    let tz = r.tz || "America/Asuncion"; let now;
    try { now = localNow(tz); } catch { tz = "America/Asuncion"; now = localNow(tz); }
    // base trae una lista para días de entrenamiento y otra para descanso (dows = días de la semana, 0 = domingo); sin dows vale todos los días
    const list = ((r.day === now.date ? r.today : r.base) || []).filter((m: { dows?: number[] }) => !Array.isArray(m.dows) || m.dows.includes(now.dow));
    const done: string[] = r.sent_day === now.date ? (r.sent || []) : [];
    const due = (list as { mk: string; name: string; t: string; supp?: string[] }[]).filter((m) => {
      const t = toMin(m.t); return t != null && now.min >= t && now.min - t < 20 && !done.includes(m.mk);
    });
    if (!due.length) continue;
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth,lang").eq("user_id", r.user_id);
    for (const m of due) {
      for (const sub of subs || []) {
        const lang = COPY[sub.lang] ? sub.lang : (COPY[r.lang] ? r.lang : "es"); const c = COPY[lang];
        const water = (m as { kind?: string }).kind === "water";
        const W: Record<string, [string, string]> = { es: ["💧 Hora de tomar agua", `Tomá ${m.name} ahora`], en: ["💧 Time to drink water", `Drink ${m.name} now`], pt: ["💧 Hora de beber água", `Beba ${m.name} agora`] };
        const body = water ? W[lang][1] : m.supp && m.supp.length ? `${c.supp}: ${m.supp.join(", ")}` : c.body;
        try {
          const res = await sendWebPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth,
            payload: JSON.stringify(Object.assign({ title: water ? W[lang][0] : c.title(m.name), body, url: `${APP}?go=diet`, go: "diet", tag: water ? "water" : `meal-${m.mk}`, lang, alarm: !water },
              water ? { actions: [{ action: "drank", title: DRANK[lang] }], data: { kind: "water", ml: waterMl(m), slot: m.mk, date: now.date, uid: r.user_id } } : {})),
            vapidPublic, vapidPrivate, subject: "mailto:henro89@gmail.com" });
          if (res.status === 404 || res.status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
          else if (res.ok) sent++;
        } catch (e) { console.warn("push", sub.id, e); }
      }
      done.push(m.mk);
    }
    await db.from("meal_reminders").update({ sent_day: now.date, sent: done }).eq("user_id", r.user_id);
  }
  return json(200, { ok: true, sent });
});
