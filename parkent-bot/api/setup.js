// ═══════════════════════════════════════════════════════════
//  🔧  Webhook o'rnatish  (bir marta ishlatiladi)
//  Fayl: api/setup.js
//
//  Ishlatish: brauzerda   https://SIZNING-URL.vercel.app/api/setup
//  ga kiring — "Webhook o'rnatildi!" chiqsa tayyor.
// ═══════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  const token      = process.env.BOT_TOKEN;
  const vercelUrl  = process.env.VERCEL_URL;               // Vercel o'zi to'ldiradi
  const webhookUrl = `https://${vercelUrl}/api/webhook`;

  const apiUrl =
    `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

  const javob  = await fetch(apiUrl);
  const natija = await javob.json();

  if (natija.ok) {
    res.status(200).json({
      holat:      "✅ Webhook o'rnatildi!",
      webhookUrl: webhookUrl,
    });
  } else {
    res.status(500).json({
      holat:  "❌ Xatolik yuz berdi",
      xabar:  natija.description,
    });
  }
};
