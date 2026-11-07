// Notify the other party when a coach_messages row is created (Web Push).
// Called by the signed-in sender via supabase.functions.invoke after insert.
import { createClient } from "npm:@supabase/supabase-js@2";

const APP = "https://harold89556.github.io/hipertrofia-pro/";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function preview(s: string) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, 80);
}
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

const COPY: Record<string, { coachTitle: string; coachBody: string; adminTitle: (n: string) => string; adminBody: string }> = {
  es: { coachTitle: "Respuesta del coach", coachBody: "El coach te respondió", adminTitle: (n) => `Mensaje de ${n}`, adminBody: "Nuevo mensaje para el coach" },
  en: { coachTitle: "Coach reply", coachBody: "Your coach replied", adminTitle: (n) => `Message from ${n}`, adminBody: "New message for the coach" },
  pt: { coachTitle: "Resposta do coach", coachBody: "O coach te respondeu", adminTitle: (n) => `Mensagem de ${n}`, adminBody: "Nova mensagem para o coach" },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return json(401, { error: "auth" });

  let payload: { id?: number | string };
  try { payload = await req.json(); } catch { return json(400, { error: "bad json" }); }
  const id = Number(payload?.id);
  if (!Number.isFinite(id) || id <= 0) return json(400, { error: "id" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userSb = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userErr } = await userSb.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "auth" });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: msg, error: msgErr } = await db.from("coach_messages").select("id,user_id,from_admin,body,created_at").eq("id", id).maybeSingle();
  if (msgErr || !msg) return json(404, { error: "not found" });
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  if (ageMs > 5 * 60 * 1000) return json(400, { error: "expired" });

  const { data: me } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (msg.from_admin) {
    if (!me?.is_admin) return json(403, { error: "forbidden" });
  } else if (msg.user_id !== user.id) {
    return json(403, { error: "forbidden" });
  }

  const { data: secrets, error: secErr } = await db.rpc("read_push_secrets");
  const vapidPublic = secrets?.vapid_public;
  const vapidPrivate = secrets?.vapid_private;
  if (secErr || !vapidPublic || !vapidPrivate) return json(503, { error: "not configured" });

  let targets: string[] = [];
  let title = "";
  let body = preview(msg.body);
  let go = "coachh";
  if (msg.from_admin) {
    targets = [msg.user_id];
    go = "coachh";
  } else {
    const { data: admins } = await db.from("profiles").select("id").eq("is_admin", true);
    targets = (admins || []).map((a: { id: string }) => a.id);
    go = "admin";
  }
  if (!targets.length) return json(200, { ok: true, sent: 0 });

  const { data: sender } = await db.from("profiles").select("first_name,last_name,email").eq("id", msg.user_id).maybeSingle();
  const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(" ").trim() || sender?.email || "un usuario";

  const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth,lang").in("user_id", targets);
  let sent = 0;
  for (const sub of subs || []) {
    const lang = COPY[sub.lang] ? sub.lang : "es";
    const t = COPY[lang];
    title = msg.from_admin ? t.coachTitle : t.adminTitle(senderName);
    const text = body || (msg.from_admin ? t.coachBody : t.adminBody);
    try {
      const r = await sendWebPush({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        payload: JSON.stringify({ title, body: text, url: `${APP}?go=${go}`, go, tag: `coach-${msg.id}`, lang }),
        vapidPublic,
        vapidPrivate,
        subject: "mailto:henro89@gmail.com",
      });
      if (r.status === 404 || r.status === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id);
      } else if (r.ok) sent++;
    } catch (e) {
      console.warn("push", sub.id, e);
    }
  }
  return json(200, { ok: true, sent });
});
