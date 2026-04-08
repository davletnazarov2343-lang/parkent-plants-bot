module.exports = async (req, res) => {
  const token      = process.env.BOT_TOKEN;
  // VERCEL_PROJECT_PRODUCTION_URL — har doim production domenini qaytaradi
  const domain     = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const webhookUrl = `https://${domain}/api/webhook`;

  const apiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

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
