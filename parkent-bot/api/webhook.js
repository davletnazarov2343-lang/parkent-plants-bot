const { kv } = require("@vercel/kv");

const TOKEN    = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const API      = `https://api.telegram.org/bot${TOKEN}`;

async function send(chat_id, text, extra = {}) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "Markdown", ...extra }),
  });
}

async function answer(id) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id }),
  });
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

async function getS(id) { return (await kv.get(`s:${id}`)) || {}; }
async function setS(id, data) { await kv.set(`s:${id}`, data, { ex: 3600 }); }
async function delS(id) { await kv.del(`s:${id}`); }

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.send("Bot ishlayapti 🌿");

  try {
    const body = req.body;

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
        await send(id, `✅ Reja: ${matn}\n\n📣 Bizni qayerdan ko'rib yozyabsiz?`, { reply_markup: MANBA_KB });

      } else if (s.step === "telefon") {
        const d = { ...s, telefon: matn };
        await delS(id);
        await send(id,
          `✅ Rahmat, ${d.ism}!\n\n` +
          `Ma'lumotlaringiz qabul qilindi.\n` +
          `Mutaxassisimiz tez orada bog'lanadi 🌿\n\n_Yangi ariza: /start_`
        );
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

        // ── Leadni DOIMIY saqlash (rassilka uchun) ──────────────
        // try/catch: saqlash xato bo'lsa ham mavjud oqim (admin xabari) buzilmaydi
        try {
          const lead = {
            id, ism: d.ism, viloyat: d.viloyat, tuman: d.tuman, meva: d.meva,
            yil: d.yil, maydon: d.maydon, reja_maydon: d.reja_maydon,
            manba: d.manba, telefon: d.telefon,
            username: body.message.from.username || "", ts: Date.now(),
          };
          await kv.set(`lead:${id}`, lead);   // har lead — alohida yozuv (muddatsiz)
          await kv.sadd("leads", String(id)); // barcha lead chat_id lari to'plami
        } catch (e) { console.error("lead save error:", e); }

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
        await send(id, `✅ Viloyat: ${viloyat}\n\n🏘️ Tuman nomini yozing:\n_(Masalan: Parkent, Chirchiq…)_`);

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
        await send(id, `✅ Maydon: ${maydon}\n\n🌱 Qancha maydonga bog' qilishni reja qilyabsiz?\n_(Masalan: 20 sotix, 2 gektar)_`);

      } else if (data.startsWith("MB|")) {
        const manba = data.split("|")[1];
        await setS(id, { ...s, step: "telefon", manba });
        await send(id, `✅ Manba: ${manba}\n\n📞 Telefon raqamingizni yozing:\n_(+998901234567)_`);
      }

      return res.json({ ok: true });
    }

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(200).json({ ok: false });
  }
};
