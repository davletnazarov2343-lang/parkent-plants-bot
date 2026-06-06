// ═══════════════════════════════════════════════════════
//  Parkent Plants — admin/rassilka endpoint (Supabase versiya)
//  Himoya: ?token=<ADMIN_SECRET>  (BOT_TOKEN'dan ALOHIDA maxfiy kalit)
//  Amallar:
//    GET  ?token=..&action=count           -> lead soni
//    GET  ?token=..&action=list&n=20       -> oxirgi N lead
//    POST ?token=..&action=broadcast       -> hammaga rassilka (body: {text})
//         &limit=200&offset=0  (partiyalab yuborish uchun)
// ═══════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

const TOKEN = process.env.BOT_TOKEN;
const API   = `https://api.telegram.org/bot${TOKEN}`;

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

async function tg(method, payload) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async (req, res) => {
  const q = req.query || {};
  if (!process.env.ADMIN_SECRET || q.token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: "auth" });
  }

  const action = q.action || "count";

  if (action === "count") {
    const { count } = await db.from("bot_leads").select("*", { count: "exact", head: true });
    return res.json({ ok: true, count: count || 0 });
  }

  if (action === "list") {
    const n = Math.min(parseInt(q.n || "20", 10), 100);
    const { data } = await db.from("bot_leads")
      .select("*").order("created_at", { ascending: false }).limit(n);
    return res.json({ ok: true, leads: data || [] });
  }

  if (action === "broadcast") {
    let text = (req.body && req.body.text) || q.text;
    if (!text) return res.status(400).json({ ok: false, error: "text yo'q" });

    // Barcha unikal chat_id larni olamiz (bir odam bir necha ariza bergan bo'lishi mumkin)
    const { data } = await db.from("bot_leads").select("chat_id");
    const ids = [...new Set((data || []).map(r => r.chat_id))];

    const limit  = Math.min(parseInt(q.limit || "200", 10), 1000);
    const offset = parseInt(q.offset || "0", 10);
    const batch  = ids.slice(offset, offset + limit);

    let sent = 0, failed = 0;
    for (const id of batch) {
      const r = await tg("sendMessage", { chat_id: id, text });
      if (r.ok) sent++; else failed++;
      await sleep(50); // ~20/sek — Telegram bloklamasligi uchun
    }
    return res.json({ ok: true, total: ids.length, sent, failed, next_offset: offset + batch.length });
  }

  return res.status(400).json({ ok: false, error: "noma'lum action" });
};
