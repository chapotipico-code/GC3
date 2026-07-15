// Telegram botu: /start → Telegram ID, /rapor → o kişinin anlık raporu, bildirim gönderimi.
// Token sunucudaki .env içinde TELEGRAM_BOT_TOKEN olarak tutulur (repoda değil).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
let offset = 0;
let running = false;
let reportHandler = null; // index.js tarafından ayarlanır: async (chatId) => [text,...]

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
async function sendMessage(chatId, text) {
  if (!TOKEN || !chatId) return null;
  let r = await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
  if (r && r.ok === false && r.error_code === 429) {
    const wait = (r.parameters && r.parameters.retry_after ? r.parameters.retry_after : 1) * 1000 + 200;
    await sleep(wait);
    r = await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
  }
  await sleep(60); // toplu gönderimde nazik tempo (Telegram limitlerini aşmamak için)
  return r;
}

function setReportHandler(fn) { reportHandler = fn; }

const idMsg = (chatId, name) => `👋 Merhaba${name ? " " + name : ""}!\n\nSizin Telegram ID'niz: <code>${chatId}</code>\n\nKomutlar:\n• <b>/rapor</b> — size tanımlı firmanın/ortağın güncel raporunu gönderir\n• <b>/id</b> — Telegram ID'nizi gösterir\n\nBu ID'yi yöneticinize iletin; sizi bildirimlere ekleyebilir.`;

async function poll() {
  if (!TOKEN) return;
  try {
    const r = await tg("getUpdates", { offset, timeout: 30 });
    if (r && r.ok && Array.isArray(r.result)) {
      for (const u of r.result) {
        offset = u.update_id + 1;
        const msg = u.message || u.edited_message;
        if (!msg || !msg.chat) continue;
        const chatId = msg.chat.id;
        const name = (msg.from && (msg.from.first_name || msg.from.username)) || "";
        const text = (msg.text || "").trim().toLowerCase();
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
  console.log("Telegram botu aktif (uzun yoklama, /rapor destekli).");
  poll();
}

module.exports = { start, sendMessage, setReportHandler, hasToken: () => !!TOKEN };
