// Telegram botu: /start → Telegram ID, /rapor → o kişinin anlık raporu, bildirim gönderimi.
// Token sunucudaki .env içinde TELEGRAM_BOT_TOKEN olarak tutulur (repoda değil).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
let offset = 0;
let running = false;
let reportHandler = null; // index.js: async (chatId) => [text,...]
let groupHandler = null;  // index.js: async ({chatId,text,msgId,replyToId,fromName})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tg(method, params) {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Hız sınırına (429) takılırsa bekleyip bir kez daha dener — toplu gönderimde "bazıları gitmiyor" sorununu çözer
async function sendMessage(chatId, text, opts) {
  if (!TOKEN || !chatId) return null;
  const base = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (opts && opts.replyTo) { base.reply_to_message_id = opts.replyTo; base.allow_sending_without_reply = true; }
  let r = await tg("sendMessage", base);
  if (r && r.ok === false && r.error_code === 429) {
    const wait = (r.parameters && r.parameters.retry_after ? r.parameters.retry_after : 1) * 1000 + 200;
    await sleep(wait);
    r = await tg("sendMessage", base);
  }
  if (r && r.ok === false) console.error("Telegram gönderim hatası:", r.error_code, r.description, "chat:", chatId);
  await sleep(60); // toplu gönderimde nazik tempo
  return r;
}

function setReportHandler(fn) { reportHandler = fn; }
async function pinMessage(chatId, messageId) { if (!TOKEN || !chatId || !messageId) return null; return await tg("pinChatMessage", { chat_id: chatId, message_id: messageId, disable_notification: false }); }
function setGroupHandler(fn) { groupHandler = fn; }

const idMsg = (chatId, name) => `👋 Merhaba${name ? " " + name : ""}!\n\nSizin Telegram ID'niz: <code>${chatId}</code>\n\nKomutlar:\n• <b>/rapor</b> — size tanımlı firmanın/ortağın güncel raporunu gönderir\n• <b>/id</b> — Telegram ID'nizi gösterir\n\nBu ID'yi yöneticinize iletin; sizi bildirimlere ekleyebilir.`;

async function poll() {
  if (!TOKEN) return;
  try {
    const r = await tg("getUpdates", { offset, timeout: 30 });
    if (r && r.ok === false && r.error_code === 409) { console.log("Telegram 409: aynı token başka yerde de çekiliyor (çift bot). Diğer botu durdurun."); }
    if (r && r.ok && Array.isArray(r.result)) {
      for (const u of r.result) {
        offset = u.update_id + 1;
        const msg = u.message || u.edited_message;
        if (!msg || !msg.chat) continue;
        const chatId = msg.chat.id;
        const name = (msg.from && (msg.from.first_name || msg.from.username)) || "";
        const text = (msg.text || "").trim().toLowerCase();
        const ct = msg.chat.type;
        if (ct === "group" || ct === "supergroup") {
          const raw = (msg.text || "").trim();
          if (raw.startsWith("!") && groupHandler) {
            try { await groupHandler({ chatId, text: raw, msgId: msg.message_id, replyToId: msg.reply_to_message && msg.reply_to_message.message_id, fromName: name }); } catch (e) { console.error("grup komut hatası:", e && e.stack ? e.stack : e); }
          }
          continue;
        }
        if (text === "/rapor" || text === "!rapor" || text === "rapor") {
          if (reportHandler) {
            try {
              const reports = await reportHandler(chatId);
              if (reports && reports.length) { for (const t of reports) await sendMessage(chatId, t); }
              else await sendMessage(chatId, "Bu sohbet henüz bir firmaya/ortağa tanımlı değil. Telegram ID'nizi (<code>" + chatId + "</code>) yöneticinize iletin.");
            } catch (e) { await sendMessage(chatId, "Rapor şu an alınamadı."); }
          } else { await sendMessage(chatId, "Rapor servisi hazır değil."); }
          continue;
        }
        // /start, /id veya diğer mesajlar → ID + komut bilgisi
        await sendMessage(chatId, idMsg(chatId, name));
      }
    }
  } catch (e) {
    // sessiz geç
  }
  setTimeout(poll, 500);
}

function start() {
  if (running) return;
  if (!TOKEN) { console.log("Telegram: TELEGRAM_BOT_TOKEN tanımlı değil, bot kapalı."); return; }
  running = true;
  (async () => {
    try {
      const wh = await tg("getWebhookInfo");
      if (wh && wh.result && wh.result.url) { await tg("deleteWebhook", { drop_pending_updates: false }); console.log("Telegram: webhook kaldırıldı (getUpdates için)."); }
      const me = await tg("getMe");
      if (me && me.ok) console.log(`Telegram botu aktif: @${me.result.username} (grup + /rapor destekli).`);
      else console.log("Telegram: getMe başarısız — token'ı kontrol edin.");
    } catch (e) { console.log("Telegram başlangıç kontrolü hatası:", e && e.message); }
    poll();
  })();
}

module.exports = { start, sendMessage, pinMessage, setReportHandler, setGroupHandler, hasToken: () => !!TOKEN };
