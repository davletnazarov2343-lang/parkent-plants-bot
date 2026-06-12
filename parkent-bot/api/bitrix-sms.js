// ═══════════════════════════════════════════════════════
//  Parkent Plants — Bitrix24 SMS provayder handler
//  Bitrix local app -> shu endpoint.
//   • O'rnatishda: messageservice.sender.add (Telerivet "Parkent SMS" sender qo'shiladi)
//   • SMS: Bitrix message_to/message_body -> Telerivet -> telefon(2020) -> SMS -> status qaytariladi
// ═══════════════════════════════════════════════════════
const TR_KEY     = process.env.TELERIVET_API_KEY;
const TR_PROJECT = process.env.TELERIVET_PROJECT_ID;
const TR_PHONE   = process.env.TELERIVET_PHONE_ID;

const SENDER_CODE = "parkent_telerivet";
const SENDER_NAME = "Parkent SMS";
const HANDLER_URL = "https://parkent-plants-bot-r7s5.vercel.app/api/bitrix-sms";

// Bitrix auth ikki ko'rinishda keladi: event (auth:{...}) yoki iframe (AUTH_ID/DOMAIN)
function getAuth(b) {
  if (b.auth && b.auth.access_token) {
    return { token: b.auth.access_token, base: b.auth.client_endpoint || `https://${b.auth.domain}/rest/` };
  }
  if (b.AUTH_ID && b.DOMAIN) {
    return { token: b.AUTH_ID, base: `https://${b.DOMAIN}/rest/` };
  }
  return null;
}

async function bitrix(auth, method, params) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, v);
  body.append("auth", auth.token);
  const r = await fetch(auth.base + method + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return r.json().catch(() => ({}));
}

function normPhone(p) {
  let d = String(p || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("998")) return "+" + d;
  if (d.length === 9) return "+998" + d;
  return "+" + d;
}

async function sendSms(to, text) {
  const auth = "Basic " + Buffer.from(TR_KEY + ":").toString("base64");
  const r = await fetch(`https://api.telerivet.com/v1/projects/${TR_PROJECT}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ to_number: to, content: text, phone_id: TR_PHONE }),
  });
  return r.json().catch(() => ({}));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.send("Parkent Bitrix SMS handler 🌿");
  try {
    let b = req.body || {};
    if (typeof b === "string") {
      try { b = Object.fromEntries(new URLSearchParams(b)); } catch (e) {}
    }
    console.log("BITRIX hit | CT:", req.headers["content-type"], "| keys:",
      (b && typeof b === "object" ? Object.keys(b) : []).join(","));

    // 1) SMS YUBORISH so'rovi (Bitrix -> biz)
    if (b.message_to && b.message_body) {
      const to = normPhone(b.message_to);
      const tr = await sendSms(to, b.message_body).catch(() => null);
      const ok = tr && (tr.status === "queued" || tr.status === "sent" || tr.status === "delivered");
      const auth = getAuth(b);
      if (auth && b.message_id) {
        await bitrix(auth, "messageservice.message.status.update", {
          CODE: SENDER_CODE, MESSAGE_ID: b.message_id, STATUS: ok ? "delivered" : "undelivered",
        }).catch(() => {});
      }
      return res.json({ result: true });
    }

    // 2) O'RNATISH / handshake -> sender'ni ro'yxatga olish
    const auth = getAuth(b);
    if (auth) {
      await bitrix(auth, "messageservice.sender.add", {
        CODE: SENDER_CODE, TYPE: "SMS", HANDLER: HANDLER_URL, NAME: SENDER_NAME,
      }).catch(() => {});
      // iframe o'rnatishini tugatish (UI app)
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(
        `<!DOCTYPE html><html><head><meta charset="utf-8">` +
        `<script src="//api.bitrix24.com/api/v1/"></script></head>` +
        `<body><script>try{BX24.init(function(){BX24.installFinish();});}catch(e){}</script>` +
        `Parkent SMS o'rnatildi ✅</body></html>`
      );
    }

    return res.json({ ok: true, _debug: {
      ct: req.headers["content-type"] || "",
      keys: (b && typeof b === "object") ? Object.keys(b) : [],
      typ: typeof req.body,
      hasAuthId: !!b.AUTH_ID, hasDomain: !!b.DOMAIN, hasAuthObj: !!(b.auth),
    }});
  } catch (e) {
    console.error("bitrix-sms error:", e);
    return res.status(200).json({ ok: false });
  }
};
