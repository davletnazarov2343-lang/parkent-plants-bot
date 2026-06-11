// ═══════════════════════════════════════════════════════
//  Parkent Plants — Telegram bot webhook (Supabase versiya)
//  Saqlash: Supabase Postgres (bot_sessions, bot_leads)
//  v3.0 — KV o'rniga Supabase + buglar tuzatildi
// ═══════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

const TOKEN    = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const API      = `https://api.telegram.org/bot${TOKEN}`;

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── Telegram yordamchilari ──────────────────────────────
// parse_mode ISHLATILMAYDI — shunda mijoz ismida _ * [ kabi belgi
// bo'lsa ham xabar buzilmaydi/yo'qolmaydi (eski bug tuzatildi).
async function send(chat_id, text, extra = {}) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, ...extra }),
  }).catch(() => {});
}

async function answer(id) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id }),
  }).catch(() => {});
}

async function deleteMsg(chat_id, mid) {
  await fetch(`${API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, message_id: mid }),
  }).catch(() => {});
}

function kb(rows) {
  return { inline_keyboard: rows.map(r => r.map(([t, d]) => ({ text: t, callback_data: d }))) };
}

const VILOYAT_KB = kb([
  [["Toshkent sh.","V|Toshkent_sh"],["Toshkent vil.","V|Toshkent_vil"]],
  [["Farg'ona","V|Fargona"],["Andijon","V|Andijon"]],
  [["Namangan","V|Namangan"],["Samarqand","V|Samarqand"]],
  [["Buxoro","V|Buxoro"],["Navoiy","V|Navoiy"]],
  [["Qashqadaryo","V|Qashqa"],["Surxondaryo","V|Surxon"]],
  [["Sirdaryo","V|Sirdaryo"],["Jizzax","V|Jizzax"]],
  [["Xorazm","V|Xorazm"],["QQR","V|QQR"]],
]);

const MEVA_KB = kb([
  [["🍎 Olma","M|Olma"],["🍑 Shaftoli","M|Shaftoli"],["🍒 Gilos","M|Gilos"]],
  [["🫐 O'rik","M|Orik"],["🍐 Nok","M|Nok"],["🌰 Bodom","M|Bodom"]],
  [["🍇 Uzum","M|Uzum"],["🍈 Anor","M|Anor"],["🌿 Boshqa","M|Boshqa"]],
]);

const YIL_KB = kb([
  [["2025","Y|2025"],["2026","Y|2026"],["2027","Y|2027"]],
  [["2028","Y|2028"],["2029","Y|2029"],["2030","Y|2030"]],
]);

const MAYDON_KB = kb([
  [["10 sotix","MD|10_sotix"],["30 sotix","MD|30_sotix"]],
  [["50 sotix","MD|50_sotix"],["1 gektar","MD|1_gektar"]],
  [["3 gektar","MD|3_gektar"],["5 gektar","MD|5_gektar"]],
  [["10 gektardan ko'p","MD|10_gektar_ ortiq"],["30 gektardan ko'p","MD|30_gektar_ortiq"]],
]);

const MANBA_KB = kb([
  [["▶️ YouTube","MB|YouTube"],["📸 Instagram","MB|Instagram"]],
  [["👥 Facebook","MB|Facebook"],["📢 Telegram kanal","MB|Telegram"]],
  [["🔎 Boshqa","MB|Boshqa"]],
]);

// ── Sessiya (suhbat holati) — Supabase bot_sessions ─────
async function getS(id) {
  const { data } = await db.from("bot_sessions").select("data").eq("chat_id", id).maybeSingle();
  return (data && data.data) || {};
}
async function setS(id, obj) {
  await db.from("bot_sessions").upsert({
    chat_id: id, step: obj.step || null, data: obj, updated_at: new Date().toISOString(),
  });
}
async function delS(id) {
  await db.from("bot_sessions").delete().eq("chat_id", id);
}

// ── Idempotency: bir update ikki marta ishlanmasin ──────
// (Telegram timeout'da xabarni qayta yuborsa, dubl lead/xabar bo'lmaydi)
async function alreadyProcessed(updateId) {
  if (!updateId) return false;
  const { error } = await db.from("bot_processed_updates").insert({ update_id: updateId });
  if (error && error.code === "23505") return true;  // PK takror = oldin ishlangan
  return false;                                       // boshqa xato bo'lsa — bloklamaymiz
}

// ════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.send("Bot ishlayapti 🌿");

  try {
    const body = req.body;

    if (await alreadyProcessed(body.update_id)) return res.json({ ok: true });

    // /start KOD — deep-link (mavjud mijoz obunasi). KOD = mijoz telefoni (oxirgi 9 raqam).
    if (body.message?.text?.startsWith("/start ")) {
      const id = body.message.from.id;
      const firstName = body.message.from.first_name || "Do'st";
      const kod = body.message.text.slice(7).trim().slice(0, 32);
      try {
        await db.from("bot_subscribers").upsert({
          kod, chat_id: id, name: firstName,
          username: body.message.from.username || null,
        }, { onConflict: "kod" });
      } catch (e) { console.error("sub save error:", e); }
      await send(id,
        `🌿 Assalomu alaykum, ${firstName}!\n\n` +
        `Parkent Plants kanaliga obuna bo'ldingiz ✅\n` +
        `Endi buyurtmalaringiz, yangi navlar va siz uchun maxsus takliflar haqida shu yerda xabar berib turamiz 🌱`
      );
      await send(ADMIN_ID,
        `✅ YANGI OBUNACHI\n👤 ${firstName} (@${body.message.from.username || "—"})\n🔑 Kod: ${kod}\n🆔 ID: ${id}`
      );
      return res.json({ ok: true });
    }

    // /start
    if (body.message?.text === "/start") {
      const id = body.message.from.id;
      const firstName = body.message.from.first_name || "Do'st";
      await setS(id, { step: "ism" });
      await send(id,
        `🌿 Assalomu alaykum, ${firstName}!\n\n` +
        `Men Parkent Plants ning raqamli yordamchisiman 🌱\n` +
        `Ko'chat tanlashda yordam beraman.\n\n` +
        `👤 Ismingizni yozing:`
      );
      return res.json({ ok: true });
    }

    // Matn xabarlari
    if (body.message?.text && !body.message.text.startsWith("/")) {
      const id   = body.message.from.id;
      const matn = body.message.text.trim();
      const s    = await getS(id);

      if (s.step === "ism") {
        await setS(id, { ...s, step: "viloyat", ism: matn });
        await send(id, `👋 Yaxshi, ${matn}!\n\n📍 Viloyatingizni tanlang:`, { reply_markup: VILOYAT_KB });

      } else if (s.step === "tuman") {
        await setS(id, { ...s, step: "meva", tuman: matn });
        await send(id, `✅ Tuman: ${matn}\n\n🌳 Qaysi meva ekmoqchisiz?`, { reply_markup: MEVA_KB });

      } else if (s.step === "reja_maydon") {
        await setS(id, { ...s, step: "manba", reja_maydon: matn });
        await send(id, `✅ Reja: ${matn}\n\n📣 Bizni qayerdan ko'rib yozyapsiz?`, { reply_markup: MANBA_KB });

      } else if (s.step === "telefon") {
        const d = { ...s, telefon: matn };

        // ── 1) AVVAL leadni saqlaymiz (eng muhim — yo'qolmasin) ──
        try {
          await db.from("bot_leads").insert({
            chat_id: id, ism: d.ism, viloyat: d.viloyat, tuman: d.tuman, meva: d.meva,
            yil: d.yil, maydon: d.maydon, reja_maydon: d.reja_maydon,
            manba: d.manba, telefon: d.telefon,
            username: body.message.from.username || null,
          });
        } catch (e) { console.error("lead save error:", e); }

        await delS(id);

        // ── 2) Mijozga tasdiq ──
        await send(id,
          `✅ Rahmat, ${d.ism}!\n\n` +
          `Ma'lumotlaringiz qabul qilindi.\n` +
          `Mutaxassisimiz tez orada bog'lanadi 🌿\n\n` +
          `Yangi ariza: /start`
        );

        // ── 3) Adminга xabar (parse_mode yo'q — hech qachon buzilmaydi) ──
        await send(ADMIN_ID,
          `🔔 YANGI MIJOZ ARIZASI\n` +
          `──────────────────────────\n` +
          `👤 Ism:         ${d.ism}\n` +
          `🏙 Viloyat:     ${d.viloyat}\n` +
          `🏘 Tuman:       ${d.tuman}\n` +
          `🌳 Meva:        ${d.meva}\n` +
          `📅 Yil:         ${d.yil}\n` +
          `🌾 Jami maydon: ${d.maydon}\n` +
          `🌱 Reja maydon: ${d.reja_maydon}\n` +
          `📣 Manba:       ${d.manba}\n` +
          `📞 Telefon:     ${d.telefon}\n` +
          `──────────────────────────\n` +
          `🆔 @${body.message.from.username || "—"} | ID: ${id}`
        );

      } else {
        await send(id, `Boshlash uchun /start yuboring 🌱`);
      }

      return res.json({ ok: true });
    }

    // Callback tugmalar
    if (body.callback_query) {
      const cq   = body.callback_query;
      const id   = cq.from.id;
      const data = cq.data;
      const s    = await getS(id);

      await answer(cq.id);
      await deleteMsg(id, cq.message.message_id);

      if (data.startsWith("V|")) {
        const viloyat = data.split("|")[1].replace(/_/g, " ");
        await setS(id, { ...s, step: "tuman", viloyat });
        await send(id, `✅ Viloyat: ${viloyat}\n\n🏘️ Tuman nomini yozing:\n(Masalan: Parkent, Chirchiq…)`);

      } else if (data.startsWith("M|")) {
        const meva = data.split("|")[1];
        await setS(id, { ...s, step: "yil", meva });
        await send(id, `✅ Meva: ${meva}\n\n📅 Qaysi yilda ekmoqchisiz?`, { reply_markup: YIL_KB });

      } else if (data.startsWith("Y|")) {
        const yil = data.split("|")[1];
        await setS(id, { ...s, step: "maydon", yil });
        await send(id, `✅ Yil: ${yil}\n\n🌾 Jami maydoningiz qancha?`, { reply_markup: MAYDON_KB });

      } else if (data.startsWith("MD|")) {
        const maydon = data.split("|")[1].replace(/_/g, " ");
        await setS(id, { ...s, step: "reja_maydon", maydon });
        await send(id, `✅ Maydon: ${maydon}\n\n🌱 Qancha maydonga bog' qilishni reja qilyapsiz?\n(Masalan: 20 sotix, 2 gektar)`);

      } else if (data.startsWith("MB|")) {
        const manba = data.split("|")[1];
        await setS(id, { ...s, step: "telefon", manba });
        await send(id, `✅ Manba: ${manba}\n\n📞 Telefon raqamingizni yozing:\n(+998901234567)`);
      }

      return res.json({ ok: true });
    }

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(200).json({ ok: false });
  }
};
