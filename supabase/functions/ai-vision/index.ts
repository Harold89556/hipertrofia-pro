// Supabase Edge Function: análisis de físico por foto y técnica por video (frames) — Hipertrofia Pro
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const ALLOWED = ["https://harold89556.github.io", "https://hipertrofiapro.app", "https://www.hipertrofiapro.app"];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const LITE = Deno.env.get("AI_MODEL") ?? Deno.env.get("GEMINI_MODEL_LITE") ?? "gemini-3.5-flash-lite";
const LIMIT: Record<string, number> = { physique: Number(Deno.env.get("PHYSIQUE_MONTHLY") ?? 5), technique: Number(Deno.env.get("TECHNIQUE_MONTHLY") ?? 10), compare: 5, weekly: 6 };
const FOOD_PRO = Number(Deno.env.get("FOOD_TEXT_DAILY_PRO") ?? 60), FOOD_FREE = Number(Deno.env.get("FOOD_TEXT_DAILY_FREE") ?? 3);
const PHOTO_PRO = Number(Deno.env.get("FOOD_PHOTO_DAILY_PRO") ?? 20), PHOTO_FREE = Number(Deno.env.get("FOOD_PHOTO_DAILY_FREE") ?? 1);
const FOOD_SYS = `Sos nutricionista deportivo experto en comida de Paraguay y Latinoamérica (chipa, sopa paraguaya, chipa guasu, mbejú, empanadas, asado, mandioca, vori vori, bori bori, milanesa, tereré, cocido, pastel mandi'o, lomito, hamburguesa, etc.).
El usuario describe en palabras lo que comió. Separá cada alimento/bebida en un ítem, estimá los gramos (o ml para bebidas) de una porción típica paraguaya si no se indica (ej. empanada de carne ~120 g, chipa ~60 g, porción de sopa paraguaya ~150 g, coca chica ~350 ml, un vaso ~250 ml), y calculá kcal, proteína, carbohidratos y grasa del TOTAL de ese ítem (no por 100 g). Valores realistas de tablas nutricionales. Si el texto no describe comida, devolvé items vacío y explicalo en note. name corto en español, qty = cantidad de unidades (1 si no aplica). liquid_ml = ml de líquido bebible sin alcohol que aporta ese ítem a la hidratación (agua, jugo, café, té, leche, tereré, mate, cocido, gaseosa, bebida deportiva, batido, licuado, yogur bebible; si no se indica la cantidad usá porciones típicas: 1 vaso ~250 ml, 1 taza ~200 ml, 1 botella chica ~500 ml, tereré/mate ~500 ml); 0 para sólidos, sopas y bebidas con alcohol. Devolvé JSON.`;
const FOOD_SCHEMA = { type: "OBJECT", properties: {
  items: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, qty: { type: "NUMBER" }, grams: { type: "NUMBER" }, unit: { type: "STRING", enum: ["g", "ml"] }, kcal: { type: "NUMBER" }, protein: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fat: { type: "NUMBER" }, liquid_ml: { type: "NUMBER" } }, required: ["name", "qty", "grams", "unit", "kcal", "protein", "carbs", "fat", "liquid_ml"] } },
  note: { type: "STRING" },
}, required: ["items"] };
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && (ALLOWED.includes(o) || LOCAL.test(o)) ? o : ALLOWED[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const json = (b: unknown, s: number, h: Record<string, string>) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
type Lang = "es" | "en" | "pt";
const LR: Record<Lang, string> = { es: "Respondé en español de Paraguay con voseo, neutro y profesional (sin lunfardo como che, morfi, laburo), claro y breve.", en: "Answer in clear, concise English.", pt: "Responda em português do Brasil, claro e breve." };

const PHY_SYS = `Sos juez y coach de culturismo (IFBB). Analizás 3 fotos (frente, perfil, espalda) de un usuario adulto para su categoría objetivo.
Evaluá con respeto y sin comentarios sobre atractivo: proporciones, simetría, grupos musculares atrasados y dominantes RELATIVOS a la categoría (ej. Men's Physique prioriza hombros/espalda ancha/cintura chica, sin piernas; Classic/Open todo el cuerpo; Bikini glúteos/hombros redondeados/cintura; Wellness tren inferior grande).
Si alguna foto no muestra un cuerpo o es inapropiada/no evaluable, poné valid=false y explicá en summary.
No estimes % de grasa exacto ni diagnostiques nada médico. Devolvé JSON.`;
const PHY_SCHEMA = { type: "OBJECT", properties: {
  valid: { type: "BOOLEAN" }, summary: { type: "STRING" },
  scores: { type: "ARRAY", items: { type: "OBJECT", properties: { muscle: { type: "STRING", enum: ["hombros","pecho","espalda","brazos","abdomen","cuadriceps","isquios","gluteos","pantorrillas"] }, score: { type: "INTEGER" } }, required: ["muscle","score"] } },
  lagging: { type: "ARRAY", items: { type: "STRING" } }, strong: { type: "ARRAY", items: { type: "STRING" } },
  adjustments: { type: "ARRAY", items: { type: "OBJECT", properties: { muscle: { type: "STRING", enum: ["hombros","pecho","espalda","brazos","abdomen","cuadriceps","isquios","gluteos","pantorrillas"] }, extra_sets: { type: "INTEGER" }, tip: { type: "STRING" } }, required: ["muscle","extra_sets","tip"] } },
}, required: ["valid","summary","scores","lagging","adjustments"] };
const TEC_SYS = `Sos entrenador de fuerza experto en técnica. Recibís de 6 a 10 fotogramas en orden cronológico de UNA serie de un ejercicio.
Evaluá: rango de movimiento (completo/parcial), trampas o compensaciones (rebote, impulso, balanceo, rodillas hacia adentro, espalda redondeada, etc.), y estimá repeticiones en reserva (RIR) por la velocidad/esfuerzo aparente de la última repetición visible. Sé honesto si los fotogramas no alcanzan (confidence baja). No des diagnósticos médicos. Devolvé JSON.`;
const TEC_SCHEMA = { type: "OBJECT", properties: {
  valid: { type: "BOOLEAN" }, exercise: { type: "STRING" }, rom: { type: "STRING", enum: ["completo","parcial","no_visible"] },
  rom_note: { type: "STRING" }, cheating: { type: "ARRAY", items: { type: "STRING" } }, rir: { type: "INTEGER" },
  confidence: { type: "STRING", enum: ["alta","media","baja"] }, cues: { type: "ARRAY", items: { type: "STRING" } }, summary: { type: "STRING" },
}, required: ["valid","rom","cheating","rir","confidence","cues","summary"] };


const CMP_SYS = `Sos coach de culturismo. Recibís fotos ANTES y DESPUÉS (frente, perfil, espalda) del mismo usuario. Describí cambios visibles con respeto (masa muscular, definición, proporciones), sin comentarios de atractivo ni diagnósticos. Si la luz/pose difiere mucho, aclaralo. Devolvé JSON.`;
const CMP_SCHEMA = { type: "OBJECT", properties: { summary: { type: "STRING" }, improved: { type: "ARRAY", items: { type: "STRING" } }, to_work: { type: "ARRAY", items: { type: "STRING" } }, photo_tips: { type: "STRING" } }, required: ["summary", "improved", "to_work"] };
const WK_SYS = `Sos el coach de Hipertrofia Pro. Con los datos de la semana del usuario (entrenos, series, cargas, peso, calorías, readiness), escribí un reporte semanal motivador y concreto. Nada de fármacos ni dietas extremas. Devolvé JSON.`;
const WK_SCHEMA = { type: "OBJECT", properties: { headline: { type: "STRING" }, wins: { type: "ARRAY", items: { type: "STRING" } }, misses: { type: "ARRAY", items: { type: "STRING" } }, next_week: { type: "ARRAY", items: { type: "STRING" } } }, required: ["headline", "wins", "misses", "next_week"] };

async function gemini(model: string, key: string, system: string, parts: unknown[], schema: unknown) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: schema } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  return JSON.parse(d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "{}");
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  try {
    const body = await req.json().catch(() => ({}));
    const lang: Lang = ["en", "pt"].includes(body.lang) ? body.lang : "es";
    const kind = body.kind;
    const key = Deno.env.get("AI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
    if (kind === "status") return json({ enabled: !!key, limits: LIMIT, food_text: { pro: FOOD_PRO, free: FOOD_FREE }, food_photo: { pro: PHOTO_PRO, free: PHOTO_FREE } }, 200, h);
    if (!key) return json({ error: "nokey", enabled: false }, 503, h);
    if (!["physique", "technique", "compare", "weekly", "food_text", "food_photo"].includes(kind)) return json({ error: "kind" }, 400, h);
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "login" }, 401, h);
    const uid = u.user.id;
    const { data: ok } = await admin.rpc("has_access", { p_uid: uid });
    if (kind === "food_text" || kind === "food_photo") {
      const photo = kind === "food_photo";
      const text = String(body.text ?? "").trim().slice(0, 500);
      const img = photo ? String(body.image ?? "").replace(/^data:image\/\w+;base64,/, "") : "";
      if (photo ? (img.length < 1000 || img.length > 1_500_000) : text.length < 2) return json({ error: photo ? "image" : "text" }, 400, h);
      const lim = photo ? (ok ? PHOTO_PRO : PHOTO_FREE) : (ok ? FOOD_PRO : FOOD_FREE);
      const u2 = await admin.rpc("ai_increment_day", { p_user: uid, p_kind: kind, p_limit: lim });
      if (u2.error) throw u2.error;
      if (u2.data === -1) return json({ error: "limit_day", limit: lim, pro: !!ok }, 429, h);
      const parts: any[] = photo ? [{ inline_data: { mime_type: "image/jpeg", data: img } }, { text: `Foto de lo que comí.${text ? ` Aclaración del usuario: """${text}"""` : ""} Identificá cada alimento visible y estimá la porción por el tamaño del plato/utensilios.` }] : [{ text: `Lo que comí: """${text}"""` }];
      const sys = photo ? FOOD_SYS.replace("El usuario describe en palabras lo que comió.", "El usuario manda una FOTO de su comida (y quizás una aclaración en texto, que tiene prioridad). Si la foto no muestra comida, devolvé items vacío y explicalo en note.") : FOOD_SYS;
      let out: any;
      try { out = await gemini(LITE, key, sys, parts, FOOD_SCHEMA); } catch (e) { console.error(e); out = await gemini(MODEL, key, sys, parts, FOOD_SCHEMA); }
      const r1 = (x: any) => Math.max(0, Math.round(Number(x) || 0));
      const items = (Array.isArray(out?.items) ? out.items : []).slice(0, 15).map((i: any) => ({ name: String(i.name ?? "").slice(0, 60), qty: Number(i.qty) || 1, grams: r1(i.grams), unit: i.unit === "ml" ? "ml" : "g", kcal: r1(i.kcal), protein: r1(i.protein), carbs: r1(i.carbs), fat: r1(i.fat), liquid_ml: Math.min(5000, r1(i.liquid_ml)) }));
      return json({ result: { items, note: String(out?.note ?? "").slice(0, 300) }, remaining: lim - u2.data, limit: lim, pro: !!ok }, 200, h);
    }
    if (!ok) return json({ error: "pro" }, 403, h);

    let parts: any[] = [];
    if (kind === "physique") {
      const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 3) : [];
      if (paths.length !== 3 || paths.some((p) => typeof p !== "string" || !p.startsWith(uid + "/"))) return json({ error: "photos" }, 400, h);
      const labels = ["FRENTE", "PERFIL", "ESPALDA"];
      for (let i = 0; i < 3; i++) {
        const { data: f, error } = await admin.storage.from("physique").download(paths[i]);
        if (error || !f) return json({ error: "photos" }, 400, h);
        parts.push({ text: labels[i] }, { inline_data: { mime_type: f.type || "image/jpeg", data: encodeBase64(new Uint8Array(await f.arrayBuffer())) } });
      }
      parts.push({ text: `Categoría objetivo: ${String(body.category ?? "-").slice(0, 60)}. Sexo: ${String(body.sex ?? "-").slice(0, 10)}. Puntaje 1-10 por músculo relativo a la categoría. extra_sets: 2-4 series semanales extra para los 1-3 músculos más atrasados. ${LR[lang]}` });
    } else if (kind === "compare") {
      const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 6) : [];
      if (paths.length < 2 || paths.some((p) => typeof p !== "string" || !p.startsWith(uid + "/"))) return json({ error: "photos" }, 400, h);
      for (let i = 0; i < paths.length; i++) {
        const { data: f, error } = await admin.storage.from("physique").download(paths[i]);
        if (error || !f) return json({ error: "photos" }, 400, h);
        parts.push({ text: (i < paths.length / 2 ? "ANTES " : "DESPUÉS ") + ["frente", "perfil", "espalda"][i % (paths.length / 2)] }, { inline_data: { mime_type: f.type || "image/jpeg", data: encodeBase64(new Uint8Array(await f.arrayBuffer())) } });
      }
      parts.push({ text: `Fechas: ${String(body.dates ?? "").slice(0, 60)}. Categoría: ${String(body.category ?? "-").slice(0, 60)}. ${LR[lang]}` });
    } else if (kind === "weekly") {
      parts.push({ text: `Datos de la semana: ${JSON.stringify(body.stats ?? {}).slice(0, 4000)}. 3-4 ítems por lista, frases cortas. ${LR[lang]}` });
    } else {
      const frames: string[] = Array.isArray(body.frames) ? body.frames.slice(0, 10) : [];
      if (frames.length < 4 || frames.some((f) => typeof f !== "string" || f.length > 400000)) return json({ error: "frames" }, 400, h);
      frames.forEach((f, i) => parts.push({ text: `Fotograma ${i + 1}` }, { inline_data: { mime_type: "image/jpeg", data: f.replace(/^data:image\/\w+;base64,/, "") } }));
      parts.push({ text: `Ejercicio indicado por el usuario: ${String(body.exercise ?? "-").slice(0, 80)}. ${LR[lang]}` });
    }
    const used = await admin.rpc("ai_increment", { p_user: uid, p_kind: kind, p_limit: LIMIT[kind] });
    if (used.error) throw used.error;
    if (used.data === -1) return json({ error: "limit", limit: LIMIT[kind] }, 429, h);

    const sys = ({ physique: PHY_SYS, technique: TEC_SYS, compare: CMP_SYS, weekly: WK_SYS } as any)[kind], schema = ({ physique: PHY_SCHEMA, technique: TEC_SCHEMA, compare: CMP_SCHEMA, weekly: WK_SCHEMA } as any)[kind];
    let out: any;
    try { out = await gemini(LITE, key, sys, parts, schema); } catch (e) { console.error(e); out = await gemini(MODEL, key, sys, parts, schema); }

    if (kind === "compare" || kind === "weekly") return json({ result: out, remaining: LIMIT[kind] - used.data }, 200, h);
    const table = kind === "physique" ? "physique_checks" : "technique_checks";
    const row: any = { user_id: uid, result: out };
    if (kind === "physique") { row.category = String(body.category ?? ""); row.photos = body.paths; } else row.exercise = String(body.exercise ?? "").slice(0, 80);
    const { data: saved } = await admin.from(table).insert(row).select("id,created_at").single();
    return json({ result: out, id: saved?.id, created_at: saved?.created_at, remaining: LIMIT[kind] - used.data }, 200, h);
  } catch (e) {
    console.error(e);
    return json({ error: "fail" }, 500, h);
  }
});
