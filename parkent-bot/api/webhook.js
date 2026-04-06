// ═══════════════════════════════════════════════════════════
//  🌿  PARKENT PLANTS — Telegram Bot  (Vercel Serverless)
//  Fayl: api/webhook.js
// ═══════════════════════════════════════════════════════════

const { Bot, session, webhookCallback, Keyboard } = require("grammy");
const { Redis } = require("@upstash/redis");
const { RedisAdapter } = require("@grammyjs/storage-redis");

// ─────────────────────────────────────
// Bosqichlar (suhbat holati)
// ─────────────────────────────────────
const BOSQICH = {
  ISM:     "ism",
  VILOYAT: "viloyat",
  TUMAN:   "tuman",
  MEVA:    "meva",
  YIL:     "yil",
  TELEFON: "telefon",
};

// ─────────────────────────────────────
// Session boshlang'ich qiymati
// ─────────────────────────────────────
function boshlangich() {
  return {
    bosqich: null,
    ism:     "",
    viloyat: "",
    tuman:   "",
    meva:    "",
    yil:     "",
    telefon: "",
  };
}

// ─────────────────────────────────────
// Redis (Upstash) ulanish
// ─────────────────────────────────────
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// ─────────────────────────────────────
// Bot yaratish
// ─────────────────────────────────────
const bot = new Bot(process.env.BOT_TOKEN);

// Session middleware — holatni Redis da saqlaydi
bot.use(
  session({
    initial: boshlangich,
    storage: new RedisAdapter({ instance: redis }),
  })
);

// ═══════════════════════════════════════════════════════════
//  /start  →  Salomlashish
// ═══════════════════════════════════════════════════════════
bot.command("start", async (ctx) => {
  ctx.session = boshlangich();
  ctx.session.bosqich = BOSQICH.ISM;

  await ctx.reply(
    `🌿 *Assalomu alaykum, ${ctx.from.first_name}!*\n\n` +
    `Men *Parkent Plants* ning raqamli yordamchisiman.\n` +
    `Meva ko'chatlari bo'yicha eng mos navlarni tavsiya qilamiz 🌱\n\n` +
    `Bir necha savol berishim kerak — atigi 1 daqiqa!\n\n` +
    `👤 *Ismingizni* yozing:`,
    { parse_mode: "Markdown" }
  );
});

// ═══════════════════════════════════════════════════════════
//  Xabar kelganda — bosqichga qarab javob qaytarish
// ═══════════════════════════════════════════════════════════
bot.on("message:text", async (ctx) => {
  const matn     = ctx.message.text.trim();
  const bosqich  = ctx.session.bosqich;

  // ── ISM ──────────────────────────────────────────────────
  if (bosqich === BOSQICH.ISM) {
    ctx.session.ism     = matn;
    ctx.session.bosqich = BOSQICH.VILOYAT;

    await ctx.reply(
      `Juda yaxshi, *${matn}*! 👋\n\n📍 *Qaysi viloyatdasiz?*`,
      { parse_mode: "Markdown" }
    );
  }

  // ── VILOYAT ──────────────────────────────────────────────
  else if (bosqich === BOSQICH.VILOYAT) {
    ctx.session.viloyat = matn;
    ctx.session.bosqich = BOSQICH.TUMAN;

    await ctx.reply(
      `🏘️ *Tuman yoki shahar nomi?*\n_(Masalan: Parkent, Chirchiq, Uchtepa…)_`,
      { parse_mode: "Markdown" }
    );
  }

  // ── TUMAN ────────────────────────────────────────────────
  else if (bosqich === BOSQICH.TUMAN) {
    ctx.session.tuman   = matn;
    ctx.session.bosqich = BOSQICH.MEVA;

    // Meva turlari tugmalari
    const klaviatura = new Keyboard()
      .text("🍎 Olma").text("🍑 Shaftoli").text("🍒 Gilos").row()
      .text("🫐 O'rik").text("🍐 Nok").text("🌰 Bodom").row()
      .text("🍇 Uzum").text("🍈 Anor").text("🌿 Boshqa")
      .resized()
      .oneTime();

    await ctx.reply(
      `🌳 *Qaysi meva daraxti ekmoqchisiz?*`,
      { parse_mode: "Markdown", reply_markup: klaviatura }
    );
  }

  // ── MEVA ─────────────────────────────────────────────────
  else if (bosqich === BOSQICH.MEVA) {
    ctx.session.meva    = matn;
    ctx.session.bosqich = BOSQICH.YIL;

    // Yillar tugmalari
    const klaviatura = new Keyboard()
      .text("2025").text("2026").text("2027").row()
      .text("2028").text("2029").text("2030")
      .resized()
      .oneTime();

    await ctx.reply(
      `📅 *Qaysi yilda ekmoqchi bo'lgansiz?*`,
      { parse_mode: "Markdown", reply_markup: klaviatura }
    );
  }

  // ── YIL ──────────────────────────────────────────────────
  else if (bosqich === BOSQICH.YIL) {
    ctx.session.yil     = matn;
    ctx.session.bosqich = BOSQICH.TELEFON;

    const { removeKeyboard } = await import("grammy");

    await ctx.reply(
      `📞 *Telefon raqamingizni yuboring:*\n_(Masalan: +998901234567)_`,
      {
        parse_mode:   "Markdown",
        reply_markup: { remove_keyboard: true },
      }
    );
  }

  // ── TELEFON — YAKUNLASH ───────────────────────────────────
  else if (bosqich === BOSQICH.TELEFON) {
    ctx.session.telefon = matn;
    ctx.session.bosqich = null;

    const d = ctx.session;

    // 1) Mijozga tasdiqlash
    await ctx.reply(
      `✅ *Rahmat, ${d.ism}!*\n\n` +
      `Ma'lumotlaringiz qabul qilindi.\n` +
      `Parkent Plants mutaxassisi *tez orada* siz bilan bog'lanadi 🌿`,
      {
        parse_mode:   "Markdown",
        reply_markup: { remove_keyboard: true },
      }
    );

    // 2) Adminga to'liq ariza
    const adminXabar =
      `🔔 *YANGI MIJOZ ARIZASI*\n` +
      `${"─".repeat(28)}\n` +
      `👤 Ism:         ${d.ism}\n` +
      `🏙 Viloyat:     ${d.viloyat}\n` +
      `🏘 Tuman:       ${d.tuman}\n` +
      `🌳 Meva turi:   ${d.meva}\n` +
      `📅 Ekish yili:  ${d.yil}\n` +
      `📞 Telefon:     ${d.telefon}\n` +
      `${"─".repeat(28)}\n` +
      `🆔 Telegram: @${ctx.from.username || "—"} (ID: ${ctx.from.id})`;

    await ctx.api.sendMessage(process.env.ADMIN_ID, adminXabar, {
      parse_mode: "Markdown",
    });
  }

  // ── Bot nima qilishini bilmasa ────────────────────────────
  else {
    await ctx.reply(
      `Boshlash uchun /start yuboring 🌱`,
    );
  }
});

// ═══════════════════════════════════════════════════════════
//  Vercel handler — Telegramdan kelgan so'rovni qabul qiladi
// ═══════════════════════════════════════════════════════════
module.exports = webhookCallback(bot, "http");
