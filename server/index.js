const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");
require("dotenv").config();

const db = require("./db");
const { sign, auth, adminOnly } = require("./auth");
const tgBot = require("./telegram");

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Güvenlik başlıkları
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Giriş deneme sınırı (brute-force koruması)
const loginFails = new Map();
const clientIp = (req) => ((req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "?";
const loginBlockedSec = (ip) => { const e = loginFails.get(ip); return (e && e.until > Date.now()) ? Math.ceil((e.until - Date.now()) / 1000) : 0; };
const loginRecordFail = (ip) => { const e = loginFails.get(ip) || { count: 0, until: 0 }; e.count++; if (e.count >= 8) { e.until = Date.now() + 15 * 60 * 1000; e.count = 0; } loginFails.set(ip, e); };
const loginRecordOk = (ip) => loginFails.delete(ip);

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Sunucu tarafı firma bakiyesi (istemciyle aynı mantık) — bildirim için
function firmBalance(data, id) {
  const tx = data.tx || [], wd = data.wd || [], adjusts = data.adjusts || [], transfers = data.transfers || [];
  let b = 0;
  for (const t of tx) if (t.firmId === id) b += t.net;
  for (const w of wd) if (w.firmId === id) b -= w.gross;
  for (const a of adjusts) if (a.firmId === id) b += a.amount;
  for (const t of transfers) { if (t.toFirmId === id) b += t.amount; if (t.fromFirmId === id) b -= t.amount; }
  return Math.round(b * 100) / 100;
}
function belowLimitSet(data) {
  const s = new Set();
  for (const f of (data.firms || [])) if (f.active && firmBalance(data, f.id) < (f.limit ?? 0)) s.add(f.id);
  return s;
}
async function maybeAlert(oldData, newData) {  try {
    const notify = newData.notify || {};
    if (notify.alert === false) return;
    if (!tgBot.hasToken()) return;
    const oldBelow = belowLimitSet(oldData || {});
    const newBelow = belowLimitSet(newData || {});
    const newly = [...newBelow].filter((id) => !oldBelow.has(id));
    if (!newly.length) return;
    const firms = newData.firms || [];
    const contacts = newData.contacts || [];
    for (const id of newly) {
      const f = firms.find((x) => x.id === id);
      const text = `⚠️ <b>Bakiye Uyarısı</b>\n\n<b>${f ? f.name : id}</b> kasası uyarı eşiğinin altına düştü.\nGüncel: ${firmBalance(newData, id)}₺ (eşik ${f ? (f.limit ?? 0) : 0}₺)`;
      const recips = contacts.filter((c) => c.scope === "firma" && Number(c.targetId) === Number(id));
      for (const c of recips) await tgBot.sendMessage(c.chatId, text);
    }
  } catch (e) { console.error("alert hata:", e); }
}

// ---- Zamanlanmış günlük rapor (sunucu tarafı) ----
const fmtTR = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + " ₺";
const trDate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}.${m}.${y}`; };
function shareBalance(data, id) { return Math.round((data.shareTx || []).filter((p) => p.shareId === id).reduce((a, p) => a + p.amount, 0) * 100) / 100; }
function fillTpl(tpl, map, extra) { let s = tpl || ""; for (const k in map) s = s.split("{" + k + "}").join(map[k]); if (extra && String(extra).trim()) s += "\n\n" + String(extra).trim(); return s; }
function istParts() {  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = {}; f.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}
function prevDay(d) { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); }
function sisData(data, date) { const tx = data.tx || [], wd = data.wd || [], firms = data.firms || []; const d = tx.filter((t) => t.date === date), w = wd.filter((x) => x.date === date); return { sis_yat: fmtTR(d.reduce((a, t) => a + t.gross, 0)), sis_cek: fmtTR(w.reduce((a, x) => a + x.gross, 0)), sis_kom: fmtTR(d.reduce((a, t) => a + t.commission, 0) + w.reduce((a, x) => a + x.commission, 0)), firma_kasalari: fmtTR(firms.reduce((a, f) => a + firmBalance(data, f.id), 0)) }; }
function firmReport(data, f, date) { const tx = data.tx || [], wd = data.wd || [], tpl = data.templates || {}; const d = tx.filter((t) => t.firmId === f.id && t.date === date), w = wd.filter((x) => x.firmId === f.id && x.date === date); return fillTpl(tpl.firm, { firma: f.name, tarih: trDate(date), kasa: fmtTR(firmBalance(data, f.id)), yat_adet: d.length, yat_toplam: fmtTR(d.reduce((a, t) => a + t.gross, 0)), yat_komisyon: fmtTR(d.reduce((a, t) => a + t.commission, 0)), yat_net: fmtTR(d.reduce((a, t) => a + t.net, 0)), cek_adet: w.length, cek_brut: fmtTR(w.reduce((a, x) => a + x.gross, 0)) }, tpl.extra); }
function shareReport(data, s, date) { const shareTx = data.shareTx || [], tpl = data.templates || {}; const today = shareTx.filter((p) => p.shareId === s.id && p.date === date && p.type === "commission"); return fillTpl(tpl.share, { ortak: s.name, tarih: trDate(date), bugun_pay: fmtTR(today.reduce((a, p) => a + p.amount, 0)), toplam_kasa: fmtTR(shareBalance(data, s.id)), ...sisData(data, date) }, tpl.extra); }
function buildScheduledItems(data, date) {
  const firms = data.firms || [], shares = data.shares || [], contacts = data.contacts || [];
  const chatsFor = (scope, targetId) => contacts.filter((c) => c.scope === scope && Number(c.targetId) === Number(targetId)).map((c) => c.chatId);
  const sc = data.schedule || {}; const items = [];
  if (sc.firms && sc.firms.mode !== "none") { const list = sc.firms.mode === "all" ? firms.filter((f) => f.active) : firms.filter((f) => (sc.firms.ids || []).includes(f.id)); list.forEach((f) => { const ch = chatsFor("firma", f.id); if (ch.length) items.push({ chatIds: ch, text: firmReport(data, f, date) }); }); }
  if (sc.shares && sc.shares.mode !== "none") { const list = sc.shares.mode === "all" ? shares : shares.filter((s) => (sc.shares.ids || []).includes(s.id)); list.forEach((s) => { const ch = chatsFor("karpayi", s.id); if (ch.length) items.push({ chatIds: ch, text: shareReport(data, s, date) }); }); }
  return items;
}
// /rapor komutu: bir chatId hangi firma/ortağa tanımlıysa o anki raporu döndürür
async function reportForChat(chatId) {
  const r = await db.query("SELECT data FROM app_state WHERE id=1");
  const data = r.rows[0] ? r.rows[0].data : {};
  const { date } = istParts();
  const contacts = data.contacts || [], firms = data.firms || [], shares = data.shares || [];
  const out = [];
  contacts.filter((c) => c.scope === "firma" && String(c.chatId) === String(chatId)).forEach((c) => { const f = firms.find((x) => x.id === Number(c.targetId)); if (f) out.push(firmReport(data, f, date)); });
  contacts.filter((c) => c.scope === "karpayi" && String(c.chatId) === String(chatId)).forEach((c) => { const s = shares.find((x) => x.id === Number(c.targetId)); if (s) out.push(shareReport(data, s, date)); });
  return out;
}
let lastSchedDate = null;
async function loadLastSched() { try { await db.query("CREATE TABLE IF NOT EXISTS scheduler_state (id INTEGER PRIMARY KEY, last_sent_date TEXT)"); const r = await db.query("SELECT last_sent_date FROM scheduler_state WHERE id=1"); lastSchedDate = r.rows[0] ? r.rows[0].last_sent_date : null; } catch (e) { console.error("sched init hata:", e); } }
async function saveLastSched(d) { lastSchedDate = d; try { await db.query("INSERT INTO scheduler_state(id, last_sent_date) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET last_sent_date=$1", [d]); } catch (e) {} }
async function schedTick() {
  try {
    if (!tgBot.hasToken()) return;
    const r = await db.query("SELECT data FROM app_state WHERE id=1");
    const data = r.rows[0] ? r.rows[0].data : {};
    const sc = data.schedule;
    if (!sc || !sc.enabled || !sc.time) return;
    const { date, hm } = istParts();
    if (hm !== sc.time || lastSchedDate === date) return;
    await saveLastSched(date); // göndermeden önce işaretle (çift gönderimi önle)
    const reportDate = prevDay(date); // gün sonu mantığı: otomatik bildirim DÜNKÜ veriyi gönderir
    const items = buildScheduledItems(data, reportDate);
    let sent = 0;
    for (const it of items) for (const cid of it.chatIds) { const res = await tgBot.sendMessage(cid, it.text); if (res && res.ok) sent++; }
    console.log(`Zamanlanmış bildirim: ${date} ${hm} — ${reportDate} tarihli rapor, ${sent} mesaj gönderildi.`);
  } catch (e) { console.error("sched tick hata:", e); }
}

// ---- Sağlık kontrolü ----
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---- Giriş ----
// body: { username, password, code?, remember?, deviceToken? }
app.post("/api/login", async (req, res) => {
  try {
    const ip = clientIp(req);
    const blk = loginBlockedSec(ip);
    if (blk) return res.status(429).json({ error: `Çok fazla başarısız deneme. ${Math.ceil(blk / 60)} dakika sonra tekrar deneyin.` });
    const { username, password, code, remember, deviceToken } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });

    const r = await db.query("SELECT * FROM users WHERE username=$1", [username]);
    const u = r.rows[0];
    if (!u || !u.active) { loginRecordFail(ip); return res.status(401).json({ error: "Hatalı kullanıcı adı veya şifre" }); }

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) { loginRecordFail(ip); return res.status(401).json({ error: "Hatalı kullanıcı adı veya şifre" }); }

    // 2FA açıksa: güvenilir cihaz var mı, yoksa kod gerekli mi?
    if (u.twofa_enabled) {
      let trusted = false;
      if (deviceToken) {
        const d = await db.query(
          "SELECT * FROM trusted_devices WHERE token_hash=$1 AND user_id=$2 AND expires_at > now()",
          [sha(deviceToken), u.id]
        );
        trusted = d.rows.length > 0;
      }
      if (!trusted) {
        if (!code) return res.status(200).json({ twofaRequired: true });
        const valid = authenticator.verify({ token: String(code), secret: u.twofa_secret });
        if (!valid) { loginRecordFail(ip); return res.status(401).json({ error: "2FA kodu hatalı", twofaRequired: true }); }
      }
    }

    loginRecordOk(ip);
    const token = sign(u);
    const out = {
      token,
      user: { id: u.id, username: u.username, role: u.role, firmIds: u.firm_ids, twofa: u.twofa_enabled },
    };

    // "Bu tarayıcıda hatırla" → 30 gün geçerli cihaz jetonu
    if (remember && u.twofa_enabled) {
      const dt = crypto.randomBytes(24).toString("hex");
      const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await db.query(
        "INSERT INTO trusted_devices(token_hash, user_id, expires_at) VALUES ($1,$2,$3)",
        [sha(dt), u.id, exp]
      );
      out.deviceToken = dt;
    }

    res.json(out);
  } catch (e) {
    console.error("login hata:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ---- Oturum bilgisi ----
app.get("/api/me", auth, async (req, res) => {
  const r = await db.query("SELECT id, username, role, firm_ids, twofa_enabled FROM users WHERE id=$1", [req.user.id]);
  const u = r.rows[0];
  if (!u) return res.status(401).json({ error: "Kullanıcı yok" });
  res.json({ user: { id: u.id, username: u.username, role: u.role, firmIds: u.firm_ids, twofa: u.twofa_enabled } });
});

// ---- İş verisini oku ----
app.get("/api/state", auth, async (req, res) => {
  const r = await db.query("SELECT data, version FROM app_state WHERE id=1");
  if (!r.rows[0]) {
    await db.query("INSERT INTO app_state(id, data, version) VALUES (1, '{}', 0) ON CONFLICT (id) DO NOTHING");
    return res.json({ data: {}, version: 0 });
  }
  res.json({ data: r.rows[0].data, version: r.rows[0].version });
});

// ---- İş verisini kaydet (sürüm kontrollü) ----
// body: { data, baseVersion }
app.put("/api/state", auth, async (req, res) => {
  const { data, baseVersion } = req.body || {};
  if (typeof data !== "object" || data === null) return res.status(400).json({ error: "Geçersiz veri" });

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT data, version FROM app_state WHERE id=1 FOR UPDATE");
    const curVer = cur.rows[0] ? cur.rows[0].version : 0;
    const oldData = cur.rows[0] ? cur.rows[0].data : {};

    if (typeof baseVersion === "number" && baseVersion !== curVer) {
      await client.query("ROLLBACK");
      const fresh = await db.query("SELECT data, version FROM app_state WHERE id=1");
      return res.status(409).json({ error: "Veri başkası tarafından güncellendi", data: fresh.rows[0].data, version: fresh.rows[0].version });
    }

    const newVer = curVer + 1;
    await client.query(
      "INSERT INTO app_state(id, data, version, updated_at) VALUES (1,$1,$2, now()) ON CONFLICT (id) DO UPDATE SET data=$1, version=$2, updated_at=now()",
      [data, newVer]
    );
    await client.query("COMMIT");
    res.json({ version: newVer });
    maybeAlert(oldData, data); // bildirim (engellemeden, yanıt sonrası)
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("state kaydetme hata:", e);
    res.status(500).json({ error: "Kaydedilemedi" });
  } finally {
    client.release();
  }
});

// ---- 2FA kurulum (giriş yapmış kullanıcı kendi hesabı için) ----
app.post("/api/2fa/setup", auth, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.username, "GC Sistem", secret);
  // Henüz etkinleştirmiyoruz; doğrulama sonrası enable edilecek. Geçici sakla:
  await db.query("UPDATE users SET twofa_secret=$1 WHERE id=$2", [secret, req.user.id]);
  res.json({ secret, otpauth });
});

app.post("/api/2fa/enable", auth, async (req, res) => {
  const { code } = req.body || {};
  const r = await db.query("SELECT twofa_secret FROM users WHERE id=$1", [req.user.id]);
  const secret = r.rows[0] && r.rows[0].twofa_secret;
  if (!secret) return res.status(400).json({ error: "Önce kurulum yapın" });
  if (!authenticator.verify({ token: String(code || ""), secret })) return res.status(400).json({ error: "Kod hatalı" });
  await db.query("UPDATE users SET twofa_enabled=TRUE WHERE id=$1", [req.user.id]);
  res.json({ ok: true });
});

app.post("/api/2fa/disable", auth, async (req, res) => {
  await db.query("UPDATE users SET twofa_enabled=FALSE, twofa_secret=NULL WHERE id=$1", [req.user.id]);
  await db.query("DELETE FROM trusted_devices WHERE user_id=$1", [req.user.id]);
  res.json({ ok: true });
});

// ---- Kullanıcı yönetimi (sadece patron/yönetici) ----
const ROLES = ["patron", "yonetici", "owner", "employee"];
const mapUser = (u) => ({ id: u.id, username: u.username, role: u.role, firmIds: u.firm_ids, active: u.active, twofa: u.twofa_enabled });

app.get("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const r = await db.query("SELECT id, username, role, firm_ids, active, twofa_enabled FROM users ORDER BY id ASC");
    res.json({ users: r.rows.map(mapUser) });
  } catch (e) { console.error("users list hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

app.post("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const { username, password, role, firmIds, active } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });
    if (!ROLES.includes(role)) return res.status(400).json({ error: "Geçersiz rol" });
    const exists = await db.query("SELECT id FROM users WHERE username=$1", [username]);
    if (exists.rows.length) return res.status(409).json({ error: "Bu kullanıcı adı zaten var" });
    const hash = await bcrypt.hash(String(password), 10);
    const r = await db.query(
      "INSERT INTO users(username, password_hash, role, firm_ids, active) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, role, firm_ids, active, twofa_enabled",
      [username, hash, role, JSON.stringify(firmIds || []), active !== false]
    );
    res.json({ user: mapUser(r.rows[0]) });
  } catch (e) { console.error("user create hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

app.put("/api/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { username, password, role, firmIds, active } = req.body || {};
    const cur = await db.query("SELECT * FROM users WHERE id=$1", [id]);
    if (!cur.rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    if (role && !ROLES.includes(role)) return res.status(400).json({ error: "Geçersiz rol" });
    // Kendini pasife alma / rol düşürme kilidini önle
    if (id === req.user.id && active === false) return res.status(400).json({ error: "Kendi hesabınızı pasife alamazsınız" });
    if (username && username !== cur.rows[0].username) {
      const ex = await db.query("SELECT id FROM users WHERE username=$1 AND id<>$2", [username, id]);
      if (ex.rows.length) return res.status(409).json({ error: "Bu kullanıcı adı zaten var" });
    }
    const newUsername = username || cur.rows[0].username;
    const newRole = role || cur.rows[0].role;
    const newFirm = firmIds !== undefined ? JSON.stringify(firmIds) : JSON.stringify(cur.rows[0].firm_ids);
    const newActive = active !== undefined ? active : cur.rows[0].active;
    if (password) {
      const hash = await bcrypt.hash(String(password), 10);
      await db.query("UPDATE users SET username=$1, role=$2, firm_ids=$3, active=$4, password_hash=$5 WHERE id=$6", [newUsername, newRole, newFirm, newActive, hash, id]);
    } else {
      await db.query("UPDATE users SET username=$1, role=$2, firm_ids=$3, active=$4 WHERE id=$5", [newUsername, newRole, newFirm, newActive, id]);
    }
    const r = await db.query("SELECT id, username, role, firm_ids, active, twofa_enabled FROM users WHERE id=$1", [id]);
    res.json({ user: mapUser(r.rows[0]) });
  } catch (e) { console.error("user update hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

app.delete("/api/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
    const cur = await db.query("SELECT role FROM users WHERE id=$1", [id]);
    if (!cur.rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    await db.query("DELETE FROM users WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (e) { console.error("user delete hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

// ---- Telegram bildirim gönderimi (gerçek) ----
app.post("/api/notify/send", auth, adminOnly, async (req, res) => {
  try {
    if (!tgBot.hasToken()) return res.status(400).json({ error: "Bot token sunucuda tanımlı değil (.env içine TELEGRAM_BOT_TOKEN ekleyin)" });
    const items = (req.body && req.body.items) || [];
    let sent = 0, failed = 0;
    for (const it of items) {
      const text = (it && it.text) || "";
      const chatIds = (it && it.chatIds) || [];
      for (const cid of chatIds) {
        if (!cid) continue;
        const r = await tgBot.sendMessage(cid, text);
        if (r && r.ok) sent++; else failed++;
      }
    }
    res.json({ sent, failed });
  } catch (e) { console.error("notify send hata:", e); res.status(500).json({ error: "Gönderilemedi" }); }
});

// ---- Hata logları (tüm kullanıcıların panellerinden, kalıcı) ----
async function initErrorTable() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS error_log (
      id BIGSERIAL PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT now(),
      username TEXT, role TEXT, ip TEXT,
      message TEXT, stack TEXT, ctx TEXT
    )`);
  } catch (e) { console.error("error_log init hata:", e); }
}

app.post("/api/errors", auth, async (req, res) => {
  try {
    const { message, stack, ctx } = req.body || {};
    if (!message) return res.status(400).json({ error: "message gerekli" });
    await db.query(
      "INSERT INTO error_log(username, role, ip, message, stack, ctx) VALUES ($1,$2,$3,$4,$5,$6)",
      [req.user.username || null, req.user.role || null, clientIp(req), String(message).slice(0, 500), String(stack || "").slice(0, 4000), String(ctx || "").slice(0, 200)]
    );
    // tabloyu makul boyutta tut: 60 günden eski ve 5000'i aşan kayıtları temizle
    await db.query("DELETE FROM error_log WHERE at < now() - interval '60 days'");
    await db.query("DELETE FROM error_log WHERE id NOT IN (SELECT id FROM error_log ORDER BY id DESC LIMIT 5000)");
    res.json({ ok: true });
  } catch (e) { console.error("error_log yazma hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

app.get("/api/errors", auth, adminOnly, async (req, res) => {
  try {
    const r = await db.query("SELECT id, at, username, role, ip, message, stack, ctx FROM error_log ORDER BY id DESC LIMIT 300");
    res.json({ errors: r.rows });
  } catch (e) { console.error("error_log okuma hata:", e); res.status(500).json({ error: "Sunucu hatası" }); }
});

app.delete("/api/errors", auth, adminOnly, async (req, res) => {
  try { await db.query("DELETE FROM error_log"); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: "Sunucu hatası" }); }
});

// ---- Frontend (derlenmiş arayüz) servis et ----
const distPath = path.join(__dirname, "..", "app", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`GC backend çalışıyor: http://localhost:${PORT}`);
  tgBot.setReportHandler(reportForChat);
  tgBot.start();
  await loadLastSched();
  await initErrorTable();
  setInterval(schedTick, 30000); // her 30 sn'de bir zamanlanmış bildirim kontrolü
  console.log("Zamanlanmış bildirim kontrolü aktif (Europe/Istanbul saatine göre).");
});
