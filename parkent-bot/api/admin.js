// ═══════════════════════════════════════════════════════
//  Parkent Plants — admin/rassilka endpoint  (api/admin.js)
//  Himoya: ?token=<BOT_TOKEN> (maxfiy, public repo'da yo'q)
//  Amallar:
//    GET  ?token=..&action=count            -> lead soni
//    GET  ?token=..&action=list&n=20        -> oxirgi N lead
//    POST ?token=..&action=broadcast        -> hammaga rassilka (body: {text})
//         &limit=200&offset=0  (partiyalab yuborish uchun)
// ═══════════════════════════════════════════════════════
const { kv } = require("@vercel/kv");
const TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

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
  if (q.token !== TOKEN) return res.status(401).json({ ok: false, error: "auth" });

  const action = q.action || "count";
  const ids = (await kv.smembers("leads")) || [];

  if (action === "count") {
    return res.json({ ok: true, count: ids.length });
  }

  if (action === "list") {
    const n = Math.min(parseInt(q.n || "20", 10), 100);
    const leads = [];
    for (const id of ids.slice(-n)) leads.push(await kv.get(`lead:${id}`));
    return res.json({ ok: true, count: ids.length, leads });
  }

  if (action === "broadcast") {
    let text = (req.body && req.body.text) || q.text;
    if (!text) return res.status(400).json({ ok: false, error: "text yo'q" });
    const limit = Math.min(parseInt(q.limit || "200", 10), 1000);
    const offset = parseInt(q.offset || "0", 10);
    const batch = ids.slice(offset, offset + limit);
    let sent = 0, failed = 0;
    for (const id of batch) {
      const r = await tg("sendMessage", { chat_id: id, text, parse_mode: "Markdown" });
      if (r.ok) sent++; else failed++;
      await sleep(50); // ~20/sek — Telegram bloklamasligi uchun
    }
    return res.json({ ok: true, total: ids.length, sent, failed, next_offset: offset + batch.length });
  }

  return res.status(400).json({ ok: false, error: "noma'lum action" });
};
