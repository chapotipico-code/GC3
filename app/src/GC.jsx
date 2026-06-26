import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, TrendingUp, TrendingDown, PieChart, Eye, Bell, BarChart3, Settings,
  Plus, Trash2, Edit2, X, BookOpen, PlusCircle, MinusCircle, LogOut, Wallet,
  Shield, Send, Building2, Users, Check, Layers, Repeat, Terminal, AlertTriangle,
  Activity, MapPin, Wifi, Archive, RotateCcw, Download, Search, Receipt, Clock, Lock,
  Menu, MessageSquare, AlertCircle, Sun, Moon
} from "lucide-react";
import { BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import QRCode from "qrcode";

/* ============ yardimcilar ============ */
const fmt = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + " ₺";
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayIso = () => iso(new Date());
const trDate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}.${m}.${y}`; };
const trDT = (d) => new Date(d).toLocaleString("tr-TR");
const MASK = "✱✱✱✱";
let _id = 1000; const nid = () => ++_id;
let _ord = 0; const nextOrd = () => ++_ord;
const bumpId = (m) => { if (m > _id) _id = m; };
const bumpOrd = (m) => { if (m > _ord) _ord = m; };
let TOKEN = (typeof localStorage !== "undefined" && localStorage.getItem("gc_token")) || "";
const setToken = (t) => { TOKEN = t || ""; try { if (t) localStorage.setItem("gc_token", t); else localStorage.removeItem("gc_token"); } catch (e) {} };
const api = async (pathStr, opts = {}) => {
  const res = await fetch(pathStr, { ...opts, headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}), ...(opts.headers || {}) } });
  let body = null; try { body = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((body && body.error) || "İstek başarısız"); err.status = res.status; err.body = body; throw err; }
  return body;
};
const DEMO_2FA = "123456";
const FULL = ["patron", "yonetici"];
const b32 = () => { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let s = ""; for (let i = 0; i < 16; i++) s += A[Math.floor(Math.random() * 32)]; return s; };
const EXP_CATS = ["Maaş", "Kira", "Reklam", "Bonus Ödemesi", "Yazılım", "Diğer"];

function rangeFor(key) {
  const d = new Date(); const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  if (key === "bugun") return { from: iso(d), to: iso(d), label: "Bugün" };
  if (key === "dun") { const p = new Date(y, m, day - 1); return { from: iso(p), to: iso(p), label: "Dün" }; }
  if (key === "son7") { const p = new Date(y, m, day - 6); return { from: iso(p), to: iso(d), label: "Son 7 Gün" }; }
  if (key === "buay") return { from: iso(new Date(y, m, 1)), to: iso(d), label: "Bu Ay" };
  if (key === "gecenay") return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)), label: "Geçen Ay" };
  return { from: "0000-01-01", to: "9999-12-31", label: "Tümü" };
}
const inRange = (date, rg) => date >= rg.from && date <= rg.to;
const computeRg = (st) => (st.mode === "gun" ? { from: st.day, to: st.day, label: trDate(st.day) } : rangeFor(st.mode));

function downloadFile(name, content, type) {
  try { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  catch (e) { alert("İndirme engellendi: " + e.message); }
}
const toCSV = (headers, rows) => "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");

/* ============ seed ============ */
function seedData() {
  const firms = [{ id: 1, name: "Yıldız Bahis", rate: 10, wrate: 5, limit: 0, active: true }, { id: 2, name: "Mega Oyun", rate: 8, wrate: 4, limit: 0, active: true }];
  const shares = [{ id: 11, name: "Ortak Ali", pct: 50, active: true }, { id: 12, name: "Ortak Veli", pct: 30, active: true }, { id: 13, name: "Ortak Can", pct: 20, active: true }];
  const tx = [], shareTx = [], wd = [];
  const t = new Date();
  const dStr = (off) => iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() - off));
  const dist = (commission, firmName, date, sourceId, kind) => shares.filter((s) => s.active && s.pct > 0).forEach((s) => { const a = r2(commission * s.pct / 100); if (a) shareTx.push({ id: nid(), shareId: s.id, type: "commission", amount: a, date, desc: (kind === "wd" ? "Çekim" : "Yatırım") + " komisyon payı", firmName, sourceId, ord: nextOrd() }); });
  const dep = (firmId, gross, off) => { const f = firms.find((x) => x.id === firmId); const commission = r2(gross * f.rate / 100), net = r2(gross - commission), id = nid(); tx.push({ id, firmId, gross, rate: f.rate, commission, net, date: dStr(off), note: "", ord: nextOrd() }); dist(commission, f.name, dStr(off), id, "dep"); };
  const wdr = (firmId, net, off) => { const f = firms.find((x) => x.id === firmId); const commission = r2(net * f.wrate / 100), gross = r2(net + commission), id = nid(); wd.push({ id, firmId, net, rate: f.wrate, commission, gross, date: dStr(off), note: "", ord: nextOrd() }); dist(commission, f.name, dStr(off), id, "wd"); };
  dep(1, 10000, 0); dep(1, 5000, 0); dep(2, 8000, 1); dep(1, 12000, 2); dep(2, 3000, 3); dep(1, 7000, 6);
  wdr(1, 3000, 0); wdr(2, 1500, 1);
  const expenses = [{ id: nid(), title: "Ofis kirası", amount: 15000, category: "Kira", date: dStr(2), note: "", ord: nextOrd() }, { id: nid(), title: "Reklam kampanyası", amount: 5000, category: "Reklam", date: dStr(1), note: "", ord: nextOrd() }];
  return { firms, shares, tx, shareTx, wd, expenses };
}

/* ============ stiller ============ */
const overlay = { position: "fixed", inset: 0, background: "rgba(2,6,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 };
const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 outline-none focus:border-blue-500 transition";
const btnP = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition";
const btnG = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition";
const btnD = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition";
const card = "bg-slate-900 border border-slate-800 rounded-xl";
const CHART_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

/* ============ ui parcalari ============ */
function Stat({ label, value, color, icon: Icon }) { return (<div className={card + " p-4"}><div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500 mb-1.5">{Icon && <Icon size={13} />} {label}</div><div className={"text-xl font-bold tracking-tight " + (color || "text-slate-100")}>{value}</div></div>); }
function Header({ title, sub, children }) { return (<div className="flex items-end justify-between mb-5 flex-wrap gap-3"><div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{sub && <div className="text-sm text-slate-500 mt-0.5">{sub}</div>}</div><div className="flex items-center gap-2 flex-wrap">{children}</div></div>); }
function Modal({ title, onClose, children, footer, wide }) { return (<div style={overlay} onClick={onClose}><div className={card + " w-full flex flex-col shadow-2xl"} style={{ maxWidth: wide ? 760 : 460, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between px-5 py-4 border-b border-slate-800"><span className="font-bold">{title}</span><button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button></div><div className="p-5 overflow-y-auto">{children}</div>{footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-800">{footer}</div>}</div></div>); }
function Field({ label, children }) { return (<div className="mb-3"><label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>{children}</div>); }
function Chip({ on, onClick, children }) { return <button onClick={onClick} className={"px-3 py-1.5 rounded-lg text-sm font-semibold transition " + (on ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}>{children}</button>; }
function Badge({ tone, children }) { const map = { blue: "bg-blue-500/15 text-blue-300", green: "bg-emerald-500/15 text-emerald-300", amber: "bg-amber-500/15 text-amber-300", red: "bg-red-500/15 text-red-300", purple: "bg-purple-500/15 text-purple-300", slate: "bg-slate-700 text-slate-300" }; return <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + (map[tone] || map.slate)}>{children}</span>; }
function Table({ cols, children }) { return (<div className={card + " overflow-hidden"}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-950/40">{cols.map((c, i) => <th key={i} className={"px-4 py-3 font-semibold " + (c.r ? "text-right" : c.c ? "text-center" : "text-left")} style={c.w ? { width: c.w } : undefined}>{c.t}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>); }
function DateFilter({ st, setSt }) { const presets = [["bugun", "Bugün"], ["dun", "Dün"], ["son7", "Son 7 Gün"], ["buay", "Bu Ay"], ["gecenay", "Geçen Ay"], ["tumu", "Tümü"]]; return (<div className="flex gap-2 flex-wrap items-center">{presets.map(([k, l]) => <Chip key={k} on={st.mode === k} onClick={() => setSt({ ...st, mode: k })}>{l}</Chip>)}<input type="date" className={inputCls} style={{ width: 150 }} value={st.day} onChange={(e) => setSt({ mode: "gun", day: e.target.value })} /></div>); }
function Pager({ page, pages, setPage }) { if (pages <= 1) return null; return (<div className="flex items-center justify-end gap-2 mt-3"><button className={btnG} disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><span className="text-sm text-slate-400">{page} / {pages}</span><button className={btnG} disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>); }
function QrBox({ secret }) {
  const N = 21; let h = 0; for (const c of (secret || "X")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const cells = []; for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N; x++) row.push(rnd() > 0.5); cells.push(row); }
  const place = (ox, oy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) cells[oy + y][ox + x] = (x === 0 || x === 6 || y === 0 || y === 6) || (x >= 2 && x <= 4 && y >= 2 && y <= 4); };
  place(0, 0); place(14, 0); place(0, 14);
  return (<div style={{ background: "#fff", padding: 10, borderRadius: 10, display: "inline-block" }}><div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 7px)`, gridTemplateRows: `repeat(${N}, 7px)` }}>{cells.flatMap((row, y) => row.map((on, x) => <div key={y + "-" + x} style={{ width: 7, height: 7, background: on ? "#0f172a" : "#fff" }} />))}</div></div>);
}

function Security2FA({ auth, setAuth, onClose }) {
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const on = !!(auth && auth.twofa);
  const startSetup = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api("/api/2fa/setup", { method: "POST" });
      setSetup(r);
      try { setQr(await QRCode.toDataURL(r.otpauth, { margin: 1, width: 220 })); } catch (e) { setQr(""); }
    } catch (e) { setErr("Kurulum başlatılamadı: " + (e.message || "")); }
    setBusy(false);
  };
  const enable = async () => {
    if ((code || "").length < 6) { setErr("6 haneli kodu girin."); return; }
    setErr(""); setBusy(true);
    try { await api("/api/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }); setAuth((a) => ({ ...a, twofa: true })); setSetup(null); setCode(""); }
    catch (e) { setErr("Kod doğrulanamadı. Authenticator'daki güncel kodu girin."); }
    setBusy(false);
  };
  const disable = async () => {
    setErr(""); setBusy(true);
    try { await api("/api/2fa/disable", { method: "POST" }); setAuth((a) => ({ ...a, twofa: false })); setSetup(null); setCode(""); }
    catch (e) { setErr("Kapatılamadı: " + (e.message || "")); }
    setBusy(false);
  };
  return (
    <Modal title="Hesap Güvenliği — İki Adımlı Doğrulama (2FA)" onClose={onClose} footer={<button className={btnG} onClick={onClose}>Kapat</button>}>
      <div className="flex items-center gap-2 mb-4"><Shield size={18} className={on ? "text-emerald-400" : "text-slate-400"} /><span className="font-semibold">Durum:</span>{on ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Kapalı</Badge>}</div>
      {err && <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 text-sm text-red-300 mb-3">{err}</div>}
      {on && !setup && (<div><p className="text-sm text-slate-400 mb-4">Hesabınız iki adımlı doğrulama ile korunuyor. Her girişte şifrenizin yanında Authenticator kodunuz istenir.</p><button className={btnD} onClick={disable} disabled={busy}>{busy ? "..." : "2FA'yı Kapat"}</button></div>)}
      {!on && !setup && (<div><p className="text-sm text-slate-400 mb-4">Google Authenticator / Authy gibi bir uygulama ile hesabınızı koruyun. Açtıktan sonra her girişte şifrenizin yanında 6 haneli kod istenir.</p><button className={btnP} onClick={startSetup} disabled={busy}>{busy ? "..." : "2FA'yı Kur"}</button></div>)}
      {setup && (<div>
        <ol className="text-sm text-slate-300 space-y-1 mb-4 list-decimal pl-5"><li>Authenticator uygulamasını açın, "QR tara" deyin.</li><li>Aşağıdaki kodu taratın (veya anahtarı elle girin).</li><li>Uygulamadaki 6 haneli kodu girip "Doğrula ve Aç"a basın.</li></ol>
        <div className="flex flex-col items-center gap-3 mb-4">{qr ? <img src={qr} alt="2FA QR" width={220} height={220} style={{ borderRadius: 10, background: "#fff", padding: 6 }} /> : <div className="text-slate-500 text-sm">QR oluşturulamadı, anahtarı elle girin.</div>}<div className="text-xs text-slate-500">Elle giriş anahtarı:</div><div className="font-mono text-sm bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 break-all text-center">{setup.secret}</div></div>
        <Field label="Authenticator kodu (6 hane)"><input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoFocus /></Field>
        <div className="flex gap-2"><button className={btnP} onClick={enable} disabled={busy}>{busy ? "..." : "Doğrula ve Aç"}</button><button className={btnG} onClick={() => { setSetup(null); setCode(""); setErr(""); }}>Vazgeç</button></div>
      </div>)}
    </Modal>
  );
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e) { if (this.props.onError) this.props.onError(e.message, e.stack); }
  render() { if (this.state.err) return (<div className="p-6"><div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-red-300">Bir hata oluştu ve IT &gt; Hatalar'a kaydedildi: <b>{String(this.state.err.message)}</b><div className="mt-2"><button className={btnG} onClick={() => this.setState({ err: null })}>Tekrar dene</button></div></div></div>); return this.props.children; }
}

/* ============ ana bilesen ============ */
export default function GC() {
  const seed = useMemo(() => seedData(), []);
  const sIp = useMemo(() => `45.${1 + Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, []);
  const [users, setUsers] = useState([{ id: 1, username: "patron", password: "Mahmut48", role: "patron", twofa: false, secret: "", active: true, firmIds: [] }]);
  const [auth, setAuth] = useState(null);
  const [firms, setFirms] = useState(seed.firms);
  const [tx, setTx] = useState(seed.tx);
  const [wd, setWd] = useState(seed.wd);
  const [shares, setShares] = useState(seed.shares);
  const [shareTx, setShareTx] = useState(seed.shareTx);
  const [transfers, setTransfers] = useState([]);
  const [adjusts, setAdjusts] = useState([]);
  const [expenses, setExpenses] = useState(seed.expenses);
  const [botToken, setBotToken] = useState("");
  const [notify, setNotify] = useState({ alert: true, chats: [] });
  const [contacts, setContacts] = useState([]);
  const [schedule, setSchedule] = useState({ enabled: false, time: "09:00", firms: { mode: "all", ids: [] }, shares: { mode: "all", ids: [] } });
  const [templates, setTemplates] = useState({
    firm: "📊 {firma} — Günlük Rapor ({tarih})\n\n💰 Güncel Kasa: {kasa}\n\n📥 Yatırım: {yat_adet} adet · {yat_toplam}\n   Komisyon: {yat_komisyon}\n   Net: {yat_net}\n\n📤 Çekim: {cek_adet} adet · brüt {cek_brut}",
    share: "💼 {ortak} — Günlük Hakediş ({tarih})\n\nBugünkü pay: {bugun_pay}\nToplam kasa: {toplam_kasa}\n\n🏦 SİSTEM\nYatırım: {sis_yat}\nÇekim: {sis_cek}\nKomisyon: {sis_kom}\nFirma Kasaları Toplamı: {firma_kasalari}",
    extra: ""
  });
  const [confirm, setConfirm] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loginLog, setLoginLog] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [trash, setTrash] = useState([]);
  const [sessions, setSessions] = useState([{ id: nid(), user: "yonetici1", role: "yonetici", ip: "78.180.12.4", at: new Date(Date.now() - 5400000), current: false }]);
  const [ipAllow, setIpAllow] = useState({ enabled: false, ips: [] });
  const [autoBackup, setAutoBackup] = useState({ enabled: true, time: "03:00" });
  const [failed, setFailed] = useState({});
  const [lockUntil, setLockUntil] = useState(0);
  const [bannedIps, setBannedIps] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [booted, setBooted] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [security, setSecurity] = useState(false);
  const [theme, setTheme] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("gc_theme")) || "dark");
  useEffect(() => { try { document.documentElement.classList.toggle("theme-light", theme === "light"); localStorage.setItem("gc_theme", theme); } catch (e) {} }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const dataRef = useRef({ version: 0, last: "" });

  const gather = () => ({ firms, tx, wd, shares, shareTx, transfers, adjusts, expenses, botToken, notify, contacts, schedule, templates, auditLog, trash, ipAllow, autoBackup, bannedIps });
  const applyData = (s) => {
    if (!s) return;
    if (s.firms) setFirms(s.firms); if (s.tx) setTx(s.tx); if (s.wd) setWd(s.wd); if (s.shares) setShares(s.shares);
    if (s.shareTx) setShareTx(s.shareTx); if (s.transfers) setTransfers(s.transfers); if (s.adjusts) setAdjusts(s.adjusts);
    if (s.expenses) setExpenses(s.expenses); if (typeof s.botToken === "string") setBotToken(s.botToken); if (s.notify) setNotify(s.notify); if (s.contacts) setContacts(s.contacts);
    if (s.schedule) setSchedule(s.schedule); if (s.templates) setTemplates(s.templates); if (s.auditLog) setAuditLog(s.auditLog);
    if (s.trash) setTrash(s.trash); if (s.ipAllow) setIpAllow(s.ipAllow); if (s.autoBackup) setAutoBackup(s.autoBackup); if (s.bannedIps) setBannedIps(s.bannedIps);
    const idPool = [].concat(s.firms || [], s.tx || [], s.wd || [], s.shares || [], s.shareTx || [], s.transfers || [], s.adjusts || [], s.expenses || [], s.contacts || [], s.trash || [], s.bannedIps || []);
    bumpId(Math.max(0, ...idPool.map((o) => o.id || 0)));
    const ordPool = [].concat(s.tx || [], s.wd || [], s.shareTx || [], s.transfers || [], s.adjusts || [], s.expenses || []);
    bumpOrd(Math.max(0, ...ordPool.map((o) => o.ord || 0)));
  };

  // Çakışma birleştirme: iki tarafın eklemelerini de korur (id bazlı union; yerel düzenleme öncelikli)
  const MERGE_ARRAYS = ["firms", "tx", "wd", "shares", "shareTx", "transfers", "adjusts", "expenses", "contacts", "trash", "bannedIps", "auditLog"];
  const mergeById = (server, local) => { const m = new Map(); (server || []).forEach((o) => m.set(o.id, o)); (local || []).forEach((o) => m.set(o.id, o)); return Array.from(m.values()); };
  const mergeData = (server, local) => { const out = { ...(server || {}) }; MERGE_ARRAYS.forEach((k) => { out[k] = mergeById(server && server[k], local && local[k]); }); ["botToken", "notify", "schedule", "templates", "ipAllow", "autoBackup"].forEach((k) => { if (local && local[k] !== undefined) out[k] = local[k]; }); return out; };

  const loadState = async () => {
    const r = await api("/api/state");
    dataRef.current.version = r.version;
    if (r.data && Object.keys(r.data).length) {
      applyData(r.data);
      dataRef.current.last = JSON.stringify(r.data);
    } else {
      const d = gather();
      try { const s = await api("/api/state", { method: "PUT", body: JSON.stringify({ data: d, baseVersion: r.version }) }); dataRef.current.version = s.version; dataRef.current.last = JSON.stringify(d); } catch (e) {}
    }
    setHydrated(true);
  };

  // Açılışta: token varsa oturumu doğrula ve veriyi yükle
  useEffect(() => {
    (async () => {
      if (TOKEN) {
        try { const me = await api("/api/me"); setAuth(me.user); await loadState(); await loadUsers(me.user); }
        catch (e) { setToken(""); }
      }
      setBooted(true);
    })();
  }, []);

  // Yerel değişiklikleri sunucuya kaydet (debounce + sürüm kontrolü)
  useEffect(() => {
    if (!hydrated || !auth) return;
    const d = gather();
    const str = JSON.stringify(d);
    if (str === dataRef.current.last) return;
    const t = setTimeout(async () => {
      try {
        const s = await api("/api/state", { method: "PUT", body: JSON.stringify({ data: d, baseVersion: dataRef.current.version }) });
        dataRef.current.version = s.version; dataRef.current.last = str;
      } catch (e) {
        if (e.status === 409 && e.body) {
          // Çakışma: yereli SİLME — sunucuyla birleştir, ekleneni koru, tekrar kaydet
          const merged = mergeData(e.body.data, gather());
          applyData(merged);
          const mstr = JSON.stringify(merged);
          try {
            const s2 = await api("/api/state", { method: "PUT", body: JSON.stringify({ data: merged, baseVersion: e.body.version }) });
            dataRef.current.version = s2.version; dataRef.current.last = mstr;
          } catch (e2) {
            if (e2.status === 409 && e2.body) { const m2 = mergeData(e2.body.data, gather()); applyData(m2); dataRef.current.version = e2.body.version; dataRef.current.last = JSON.stringify(m2); }
            setConflict(true);
          }
        }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [hydrated, auth, firms, tx, wd, shares, shareTx, transfers, adjusts, expenses, botToken, notify, contacts, schedule, templates, auditLog, trash, ipAllow, autoBackup, bannedIps]);

  // Diğer kullanıcıların değişikliklerini çek (5 sn)
  useEffect(() => {
    if (!hydrated || !auth) return;
    const iv = setInterval(async () => {
      try {
        // Yerelde kaydedilmemiş değişiklik varsa bu döngüyü atla (ezme önlenir)
        if (JSON.stringify(gather()) !== dataRef.current.last) return;
        const r = await api("/api/state");
        if (r.version !== dataRef.current.version) {
          const str = JSON.stringify(r.data);
          if (str !== dataRef.current.last) { applyData(r.data); dataRef.current.last = str; }
          dataRef.current.version = r.version;
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(iv);
  }, [hydrated, auth]);

  const pushAudit = (action, detail) => setAuditLog((l) => [{ id: nid(), at: new Date(), user: auth ? auth.username : "-", action, detail }, ...l].slice(0, 300));
  const pushError = (message, stack) => setErrorLog((l) => [{ id: nid(), at: new Date(), message, stack: stack || "" }, ...l].slice(0, 300));
  const doLogin = (u) => { setLoginLog((l) => [{ id: nid(), at: new Date(), user: u.username, ip: sIp, role: u.role }, ...l].slice(0, 300)); setSessions((s) => [{ id: nid(), user: u.username, role: u.role, ip: sIp, at: new Date(), current: true }, ...s.map((x) => ({ ...x, current: false }))]); setAuth(u); };

  const diffDetail = (pairs) => pairs.filter(([l, o, n]) => String(o) !== String(n)).map(([l, o, n]) => `${l}: ${o} → ${n}`).join(", ") || "değişiklik yok";

  const apiLogin = async ({ username, password, code, remember }) => {
    const deviceToken = (typeof localStorage !== "undefined" && localStorage.getItem("gc_device")) || undefined;
    const r = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password, code, remember, deviceToken }) });
    if (r.twofaRequired) return { need2fa: true };
    setToken(r.token);
    if (r.deviceToken) { try { localStorage.setItem("gc_device", r.deviceToken); } catch (e) {} }
    setAuth(r.user);
    doLogin(r.user);
    await loadState();
    await loadUsers(r.user);
    return { ok: true };
  };
  const logout = () => { setToken(""); setAuth(null); setHydrated(false); dataRef.current = { version: 0, last: "" }; };

  const firmBalance = (id) => r2(tx.filter((t) => t.firmId === id).reduce((a, t) => a + t.net, 0) - wd.filter((w) => w.firmId === id).reduce((a, w) => a + w.gross, 0) + adjusts.filter((x) => x.firmId === id).reduce((a, x) => a + x.amount, 0) + transfers.filter((x) => x.toFirmId === id).reduce((a, x) => a + x.amount, 0) - transfers.filter((x) => x.fromFirmId === id).reduce((a, x) => a + x.amount, 0));
  const shareBalance = (id) => r2(shareTx.filter((p) => p.shareId === id).reduce((a, p) => a + p.amount, 0));

  const distribute = (commission, firmName, date, sourceId, kind) => shares.filter((s) => s.active && s.pct > 0).map((s) => ({ id: nid(), shareId: s.id, type: "commission", amount: r2(commission * s.pct / 100), date, desc: (kind === "wd" ? "Çekim" : "Yatırım") + " komisyon payı", firmName, sourceId, ord: nextOrd() })).filter((e) => e.amount !== 0);

  const addDeposit = ({ firmId, amount, date, note }) => { const f = firms.find((x) => x.id === firmId); if (!f) return; const gross = Number(amount), commission = r2(gross * f.rate / 100), net = r2(gross - commission), id = nid(); setTx((t) => [{ id, firmId, gross, rate: f.rate, commission, net, date, note: note || "", ord: nextOrd() }, ...t]); setShareTx((st) => [...distribute(commission, f.name, date, id, "dep"), ...st]); pushAudit("Yatırım eklendi", `${f.name} · ${fmt(gross)}`); };
  const editDeposit = (id, { firmId, amount, date, note }) => { const f = firms.find((x) => x.id === firmId); if (!f) return; const old = tx.find((x) => x.id === id); const gross = Number(amount), commission = r2(gross * f.rate / 100), net = r2(gross - commission); setTx((t) => t.map((x) => (x.id === id ? { ...x, firmId, gross, rate: f.rate, commission, net, date, note } : x))); setShareTx((st) => [...distribute(commission, f.name, date, id, "dep"), ...st.filter((p) => p.sourceId !== id)]); pushAudit("Yatırım düzenlendi", diffDetail([["Firma", firms.find((x) => x.id === old.firmId)?.name, f.name], ["Tutar", fmt(old.gross), fmt(gross)], ["Tarih", trDate(old.date), trDate(date)]])); };
  const delDeposit = (id) => { const t = tx.find((x) => x.id === id); const sx = shareTx.filter((p) => p.sourceId === id); setTx((a) => a.filter((x) => x.id !== id)); setShareTx((a) => a.filter((p) => p.sourceId !== id)); setTrash((tr) => [{ id: nid(), type: "tx", label: `Yatırım · ${firms.find((f) => f.id === t.firmId)?.name} · ${fmt(t.gross)} · ${trDate(t.date)}`, at: new Date(), by: auth.username, payload: { tx: t, sx } }, ...tr]); pushAudit("Yatırım çöpe taşındı", ""); };

  const addWithdrawal = ({ firmId, amount, date, note, noComm }) => { const f = firms.find((x) => x.id === firmId); if (!f) return; const net = Number(amount), wr = noComm ? 0 : f.wrate, commission = r2(net * wr / 100), gross = r2(net + commission), id = nid(); setWd((w) => [{ id, firmId, net, rate: wr, commission, gross, date, note: note || "", noComm: !!noComm, ord: nextOrd() }, ...w]); setShareTx((st) => [...distribute(commission, f.name, date, id, "wd"), ...st]); pushAudit("Çekim eklendi", `${f.name} · ${fmt(net)}${noComm ? " · komisyonsuz" : ""}`); };
  const editWithdrawal = (id, { firmId, amount, date, note, noComm }) => { const f = firms.find((x) => x.id === firmId); if (!f) return; const old = wd.find((x) => x.id === id); const net = Number(amount), wr = noComm ? 0 : f.wrate, commission = r2(net * wr / 100), gross = r2(net + commission); setWd((w) => w.map((x) => (x.id === id ? { ...x, firmId, net, rate: wr, commission, gross, date, note, noComm: !!noComm } : x))); setShareTx((st) => [...distribute(commission, f.name, date, id, "wd"), ...st.filter((p) => p.sourceId !== id)]); pushAudit("Çekim düzenlendi", diffDetail([["Firma", firms.find((x) => x.id === old.firmId)?.name, f.name], ["Net", fmt(old.net), fmt(net)], ["Komisyon", old.noComm ? "yok" : "var", noComm ? "yok" : "var"], ["Tarih", trDate(old.date), trDate(date)]])); };
  const delWithdrawal = (id) => { const w = wd.find((x) => x.id === id); const sx = shareTx.filter((p) => p.sourceId === id); setWd((a) => a.filter((x) => x.id !== id)); setShareTx((a) => a.filter((p) => p.sourceId !== id)); setTrash((tr) => [{ id: nid(), type: "wd", label: `Çekim · ${firms.find((f) => f.id === w.firmId)?.name} · ${fmt(w.net)} · ${trDate(w.date)}`, at: new Date(), by: auth.username, payload: { wd: w, sx } }, ...tr]); pushAudit("Çekim çöpe taşındı", ""); };

  const addTransfer = ({ fromFirmId, toFirmId, amount, date, note }) => { setTransfers((t) => [{ id: nid(), fromFirmId, toFirmId, amount: Number(amount), date, note: note || "", ord: nextOrd() }, ...t]); pushAudit("Virman", `${firms.find((f) => f.id === fromFirmId)?.name} → ${firms.find((f) => f.id === toFirmId)?.name} · ${fmt(amount)}`); };
  const delTransfer = (id) => { const t = transfers.find((x) => x.id === id); setTransfers((a) => a.filter((x) => x.id !== id)); setTrash((tr) => [{ id: nid(), type: "transfer", label: `Virman · ${firms.find((f) => f.id === t.fromFirmId)?.name} → ${firms.find((f) => f.id === t.toFirmId)?.name} · ${fmt(t.amount)}`, at: new Date(), by: auth.username, payload: { transfer: t } }, ...tr]); pushAudit("Virman çöpe taşındı", ""); };

  const restoreTrash = (id) => { const it = trash.find((x) => x.id === id); if (!it) return; if (it.type === "tx") { setTx((a) => [it.payload.tx, ...a]); setShareTx((a) => [...it.payload.sx, ...a]); } else if (it.type === "wd") { setWd((a) => [it.payload.wd, ...a]); setShareTx((a) => [...it.payload.sx, ...a]); } else if (it.type === "transfer") { setTransfers((a) => [it.payload.transfer, ...a]); } setTrash((tr) => tr.filter((x) => x.id !== id)); pushAudit("Çöpten geri yüklendi", it.label); };
  const purgeTrash = (id) => setTrash((tr) => tr.filter((x) => x.id !== id));

  const addAdjust = ({ firmId, amount, date, note }) => { setAdjusts((a) => [{ id: nid(), firmId, amount: Number(amount), date, note: note || "", ord: nextOrd() }, ...a]); pushAudit("Kasa düzeltme (komisyonsuz)", `${firms.find((x) => x.id === firmId)?.name} · ${Number(amount) >= 0 ? "+" : ""}${fmt(amount)}`); };

  const addShareTx = ({ shareId, kind, amount, date, desc }) => { const signed = kind === "withdraw" ? -Math.abs(amount) : Math.abs(amount); setShareTx((st) => [{ id: nid(), shareId, type: kind, amount: signed, date, desc: desc || (kind === "withdraw" ? "Çekim" : "Manuel ekleme"), ord: nextOrd() }, ...st]); };
  const editShareTx = (id, { amount, date, desc }) => { const old = shareTx.find((x) => x.id === id); setShareTx((st) => st.map((x) => { if (x.id !== id) return x; const a = x.type === "withdraw" ? -Math.abs(amount) : Math.abs(amount); return { ...x, amount: a, date, desc }; })); if (old) pushAudit("Kar payı hareketi düzenlendi", diffDetail([["Tutar", fmt(Math.abs(old.amount)), fmt(Math.abs(amount))], ["Tarih", trDate(old.date), trDate(date)], ["Açıklama", old.desc, desc]])); };
  const delShareTx = (id) => setShareTx((st) => st.filter((x) => x.id !== id));

  const distributeExpense = (amount, expId, date) => {
    const parts = shares.filter((s) => s.active && s.gider !== false && s.pct > 0);
    const sum = parts.reduce((a, s) => a + s.pct, 0);
    if (sum <= 0 || !amount) return [];
    return parts.map((s) => ({ id: nid(), shareId: s.id, type: "expense", amount: -r2(amount * s.pct / sum), date, desc: "Gider payı düşümü", sourceId: expId, ord: nextOrd() })).filter((e) => e.amount !== 0);
  };
  const addExpense = (d) => { const id = nid(); setExpenses((e) => [{ id, title: d.title, amount: Number(d.amount), category: d.category, date: d.date, note: d.note || "", ord: nextOrd() }, ...e]); setShareTx((st) => [...distributeExpense(Number(d.amount), id, d.date), ...st]); pushAudit("Gider eklendi", `${d.title} · ${fmt(d.amount)}`); };
  const editExpense = (id, d) => { const old = expenses.find((x) => x.id === id); setExpenses((e) => e.map((x) => x.id === id ? { ...x, title: d.title, amount: Number(d.amount), category: d.category, date: d.date, note: d.note } : x)); setShareTx((st) => [...distributeExpense(Number(d.amount), id, d.date), ...st.filter((p) => p.sourceId !== id)]); pushAudit("Gider düzenlendi", diffDetail([["Başlık", old.title, d.title], ["Tutar", fmt(old.amount), fmt(d.amount)], ["Kategori", old.category, d.category], ["Tarih", trDate(old.date), trDate(d.date)]])); };
  const delExpense = (id) => { setExpenses((e) => e.filter((x) => x.id !== id)); setShareTx((a) => a.filter((p) => p.sourceId !== id)); pushAudit("Gider silindi", ""); };

  const closeSession = (id) => { const s = sessions.find((x) => x.id === id); setSessions((arr) => arr.filter((x) => x.id !== id)); pushAudit("Oturum kapatıldı", s?.user || ""); if (s?.current) setAuth(null); };

  const snapshot = () => ({ v: 1, at: new Date(), firms, tx, wd, shares, shareTx, transfers, adjusts, expenses, contacts, schedule, templates, ipAllow, bannedIps });
  const applySnapshot = (s) => { if (s.firms) setFirms(s.firms); if (s.tx) setTx(s.tx); if (s.wd) setWd(s.wd); if (s.shares) setShares(s.shares); if (s.shareTx) setShareTx(s.shareTx); if (s.transfers) setTransfers(s.transfers); if (s.adjusts) setAdjusts(s.adjusts); if (s.expenses) setExpenses(s.expenses); if (s.contacts) setContacts(s.contacts); if (s.schedule) setSchedule(s.schedule); if (s.templates) setTemplates(s.templates); if (s.ipAllow) setIpAllow(s.ipAllow); if (s.bannedIps) setBannedIps(s.bannedIps); pushAudit("Yedekten geri yüklendi", ""); };

  const delFirm = (f) => {
    if (f.active) setConfirm({ msg: `"${f.name}" PASİFE alınacak. (İkinci silmede kalıcı olur.)`, onYes: () => { setFirms((fs) => fs.map((x) => (x.id === f.id ? { ...x, active: false } : x))); pushAudit("Firma pasife alındı", f.name); } });
    else setConfirm({ msg: `"${f.name}" KALICI silinecek. Tüm kayıtları da silinir!`, onYes: () => { const ids = [...tx.filter((t) => t.firmId === f.id), ...wd.filter((w) => w.firmId === f.id)].map((t) => t.id); setTx((t) => t.filter((x) => x.firmId !== f.id)); setWd((w) => w.filter((x) => x.firmId !== f.id)); setShareTx((st) => st.filter((p) => !ids.includes(p.sourceId))); setTransfers((t) => t.filter((x) => x.fromFirmId !== f.id && x.toFirmId !== f.id)); setAdjusts((a) => a.filter((x) => x.firmId !== f.id)); setFirms((fs) => fs.filter((x) => x.id !== f.id)); pushAudit("Firma kalıcı silindi", f.name); } });
  };
  const loadUsers = async (who) => { const role = (who || auth)?.role; if (!["patron", "yonetici"].includes(role)) return; try { const r = await api("/api/users"); setUsers(r.users); } catch (e) {} };
  const addUser = async (d) => { await api("/api/users", { method: "POST", body: JSON.stringify({ username: d.username, password: d.password, role: d.role, firmIds: d.firmIds, active: d.active }) }); await loadUsers(); pushAudit("Kullanıcı oluşturuldu", d.username); };
  const updateUser = async (id, d) => { const body = { username: d.username, role: d.role, firmIds: d.firmIds, active: d.active }; if (d.password) body.password = d.password; await api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }); await loadUsers(); pushAudit("Kullanıcı düzenlendi", d.username); };
  const removeUser = async (id, username) => { await api(`/api/users/${id}`, { method: "DELETE" }); await loadUsers(); pushAudit("Kullanıcı silindi", username || ""); };
  const setUserActive = async (id, active, username) => { await api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ active }) }); await loadUsers(); pushAudit(active ? "Kullanıcı aktif edildi" : "Kullanıcı pasife alındı", username || ""); };
  const delUser = (u) => {
    if (u.role === "patron" || u.id === auth?.id) return;
    if (u.active) setConfirm({ msg: `"${u.username}" kullanıcısı PASİFE alınacak (giriş yapamaz).`, onYes: () => setUserActive(u.id, false, u.username).catch((e) => pushError("Kullanıcı pasife alınamadı", e.message)) });
    else setConfirm({ msg: `"${u.username}" kullanıcısı KALICI silinecek.`, onYes: () => removeUser(u.id, u.username).catch((e) => pushError("Kullanıcı silinemedi", e.message)) });
  };

  if (!booted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Yükleniyor…</div>;
  if (!auth) return <Login apiLogin={apiLogin} />;

  const ALL = [
    { id: "dashboard", label: "Dashboard", icon: Home, roles: FULL },
    { id: "islem", label: "İşlem Ekleme", icon: TrendingUp, roles: [...FULL, "employee"] },
    { id: "komisyon", label: "Komisyon", icon: PieChart, roles: FULL },
    { id: "gider", label: "Giderler", icon: Receipt, roles: FULL },
    { id: "virman", label: "Virman", icon: Repeat, roles: FULL },
    { id: "cekim", label: "Çekimler", icon: TrendingDown, roles: FULL },
    { id: "takip", label: "Firma Takip", icon: Eye, roles: [...FULL, "owner"] },
    { id: "bildirim", label: "Bildirim", icon: Bell, roles: FULL },
    { id: "rapor", label: "Raporlar", icon: BarChart3, roles: FULL },
    { id: "it", label: "IT", icon: Terminal, roles: FULL },
    { id: "yonetim", label: "Yönetim", icon: Settings, roles: FULL },
  ];
  const tabs = ALL.filter((t) => t.roles.includes(auth.role));

  return (
    <Shell auth={auth} tabs={tabs} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} onSecurity={() => setSecurity(true)}>
      {(tab) => (
        <ErrorBoundary onError={pushError}>
          {security && <Security2FA auth={auth} setAuth={setAuth} onClose={() => setSecurity(false)} />}
          {conflict && <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-3 text-sm flex items-center justify-between"><span>Veriler başka bir kullanıcı tarafından güncellendi ve ekran yenilendi. Son işleminizi kontrol edip gerekirse tekrar yapın.</span><button className="text-amber-300 hover:text-amber-100" onClick={() => setConflict(false)}><X size={16} /></button></div>}
          {tab === "dashboard" && <Dashboard firms={firms} tx={tx} wd={wd} shares={shares} expenses={expenses} firmBalance={firmBalance} shareBalance={shareBalance} />}
          {tab === "islem" && <Islem auth={auth} firms={firms} tx={tx} addDeposit={addDeposit} editDeposit={editDeposit} delDeposit={delDeposit} setConfirm={setConfirm} />}
          {tab === "komisyon" && <Komisyon shares={shares} setShares={setShares} shareTx={shareTx} tx={tx} wd={wd} shareBalance={shareBalance} addShareTx={addShareTx} editShareTx={editShareTx} delShareTx={delShareTx} setConfirm={setConfirm} />}
          {tab === "gider" && <Giderler expenses={expenses} tx={tx} wd={wd} addExpense={addExpense} editExpense={editExpense} delExpense={delExpense} setConfirm={setConfirm} />}
          {tab === "virman" && <Virman firms={firms} transfers={transfers} addTransfer={addTransfer} delTransfer={delTransfer} firmBalance={firmBalance} setConfirm={setConfirm} />}
          {tab === "cekim" && <Cekim firms={firms} wd={wd} firmBalance={firmBalance} addWithdrawal={addWithdrawal} editWithdrawal={editWithdrawal} delWithdrawal={delWithdrawal} setConfirm={setConfirm} />}
          {tab === "takip" && <Takip auth={auth} firms={firms} tx={tx} wd={wd} transfers={transfers} firmBalance={firmBalance} />}
          {tab === "bildirim" && <Bildirim firms={firms} shares={shares} tx={tx} wd={wd} firmBalance={firmBalance} shareTx={shareTx} botToken={botToken} setBotToken={setBotToken} notify={notify} setNotify={setNotify} contacts={contacts} setContacts={setContacts} schedule={schedule} setSchedule={setSchedule} templates={templates} setTemplates={setTemplates} />}
          {tab === "rapor" && <Rapor firms={firms} tx={tx} wd={wd} shares={shares} shareTx={shareTx} expenses={expenses} firmBalance={firmBalance} />}
          {tab === "it" && <IT auditLog={auditLog} loginLog={loginLog} errorLog={errorLog} setAuditLog={setAuditLog} setLoginLog={setLoginLog} setErrorLog={setErrorLog} pushError={pushError} trash={trash} restoreTrash={restoreTrash} purgeTrash={purgeTrash} sessions={sessions} closeSession={closeSession} ipAllow={ipAllow} setIpAllow={setIpAllow} sIp={sIp} autoBackup={autoBackup} setAutoBackup={setAutoBackup} snapshot={snapshot} applySnapshot={applySnapshot} bannedIps={bannedIps} setBannedIps={setBannedIps} />}
          {tab === "yonetim" && <Yonetim users={users} addUser={addUser} updateUser={updateUser} currentUserId={auth?.id} firms={firms} setFirms={setFirms} delFirm={delFirm} delUser={delUser} addAdjust={addAdjust} firmBalance={firmBalance} pushAudit={pushAudit} diffDetail={diffDetail} />}
          {confirm && (<Modal title="Onay" onClose={() => setConfirm(null)} footer={<><button className={btnG} onClick={() => setConfirm(null)}>Vazgeç</button><button className={btnD} onClick={() => { confirm.onYes(); setConfirm(null); }}>Evet, Onayla</button></>}><p className="text-slate-300 leading-relaxed">{confirm.msg}</p></Modal>)}
        </ErrorBoundary>
      )}
    </Shell>
  );
}

/* ============ Login ============ */
function Login({ apiLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const [stage, setStage] = useState("cred"); const [code, setCode] = useState(""); const [remember, setRemember] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return; setErr(""); setBusy(true);
    try { const r = await apiLogin({ username: u, password: p, code: stage === "2fa" ? code : undefined, remember }); if (r.need2fa) setStage("2fa"); }
    catch (e) { setErr(stage === "2fa" ? (e.message || "Kod hatalı") : "Kullanıcı adı veya şifre hatalı."); }
    setBusy(false);
  };
  return (
    <div className="gc-authbg min-h-screen flex items-center justify-center text-slate-100 p-4">
      <div className={card + " p-8 w-full shadow-2xl"} style={{ maxWidth: 380 }}>
        <div className="text-center mb-6"><div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 mb-3 text-slate-300"><Lock size={24} /></div><div className="text-sm font-semibold text-slate-300">Güvenli Giriş</div></div>
        {stage === "cred" ? (<>
          <Field label="Kullanıcı Adı"><input className={inputCls} value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus /></Field>
          <Field label="Şifre"><input className={inputCls} type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
          {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
          <button className={btnP + " w-full justify-center mt-2"} onClick={submit} disabled={busy}>{busy ? "..." : "Giriş Yap"}</button>
        </>) : (<>
          <div className="text-sm text-slate-300 mb-3 flex items-center gap-2"><Shield size={16} className="text-blue-400" /> İki adımlı doğrulama</div>
          <Field label="6 haneli kod"><input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus /></Field>
          <label className="flex items-center gap-2 text-xs text-slate-400 mb-3 cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Bu tarayıcıda hatırla (30 gün tekrar kod sorma)</label>
          {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
          <button className={btnP + " w-full justify-center"} onClick={submit} disabled={busy}>{busy ? "..." : "Doğrula"}</button>
        </>)}
      </div>
    </div>
  );
}

/* ============ Shell ============ */
function Shell({ auth, tabs, onLogout, theme, onToggleTheme, onSecurity, children }) {
  const [tab, setTab] = useState(tabs[0].id);
  const [open, setOpen] = useState(false);
  const roleLabel = { patron: "Patron", yonetici: "Yönetici", owner: "Firma Sahibi", employee: "Çalışan" }[auth.role];
  const SideInner = (
    <div className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 p-3 flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-3"><div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white">GC</div><div><div className="font-bold leading-none">GC Sistem</div><Badge tone="green">v1.0</Badge></div></div>
      <nav className="mt-3 space-y-1 overflow-y-auto">{tabs.map((n) => { const Icon = n.icon; const on = tab === n.id; return (<button key={n.id} onClick={() => { setTab(n.id); setOpen(false); }} className={"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition " + (on ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100")}><Icon size={16} /> {n.label}</button>); })}</nav>
      <div className="mt-auto border-t border-slate-800 pt-3">
        <button onClick={onToggleTheme} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 mb-1 transition">{theme === "light" ? <Moon size={16} /> : <Sun size={16} />} {theme === "light" ? "Koyu Tema" : "Açık Tema"}</button>
        <button onClick={onSecurity} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 mb-1 transition"><Shield size={16} /> Güvenlik (2FA)</button>
        <div className="px-2 mb-1"><div className="font-semibold text-slate-200">{auth.username}</div><Badge tone="purple">{roleLabel}</Badge></div>
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 mt-1 transition"><LogOut size={16} /> Çıkış</button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-sm">
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-30"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm text-white">GC</div><span className="font-bold">GC Sistem</span></div><button onClick={() => setOpen(true)} className="p-2 text-slate-300"><Menu size={22} /></button></div>
      <div className="flex">
        <div className="hidden md:block"><div className="sticky top-0 h-screen">{SideInner}</div></div>
        {open && (<div className="md:hidden fixed inset-0 z-40 flex"><div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} /><div className="relative z-50 h-full">{SideInner}</div></div>)}
        <main className="flex-1 p-4 md:p-8 min-w-0">{children(tab)}</main>
      </div>
    </div>
  );
}

/* ============ Dashboard ============ */
function Dashboard({ firms, tx, wd, shares, expenses, firmBalance, shareBalance }) {
  const [st, setSt] = useState({ mode: "bugun", day: todayIso() });
  const rg = computeRg(st);
  const dep = tx.filter((t) => inRange(t.date, rg)), wdr = wd.filter((w) => inRange(w.date, rg)), exp = expenses.filter((e) => inRange(e.date, rg));
  const totDep = dep.reduce((a, t) => a + t.gross, 0), totWd = wdr.reduce((a, w) => a + w.gross, 0);
  const totKom = dep.reduce((a, t) => a + t.commission, 0) + wdr.reduce((a, w) => a + w.commission, 0);
  const totExp = exp.reduce((a, e) => a + e.amount, 0);
  const totFirmCash = firms.reduce((a, f) => a + firmBalance(f.id), 0);
  const belowLimit = firms.filter((f) => f.active && firmBalance(f.id) < (f.limit ?? 0));
  const kFmt = (v) => { const n = Math.abs(v); if (n >= 1000000) return (v / 1000000).toFixed(1) + "M"; if (n >= 1000) return (v / 1000).toFixed(0) + "k"; return String(v); };
  const dayMap = {};
  dep.forEach((t) => { (dayMap[t.date] || (dayMap[t.date] = { date: t.date, yatirim: 0, cekim: 0 })).yatirim += t.gross; });
  wdr.forEach((w) => { (dayMap[w.date] || (dayMap[w.date] = { date: w.date, yatirim: 0, cekim: 0 })).cekim += w.gross; });
  const series = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, gun: d.date.slice(8, 10) + "." + d.date.slice(5, 7) }));
  const firmDist = firms.filter((f) => f.active).map((f) => ({ name: f.name, yatirim: dep.filter((t) => t.firmId === f.id).reduce((a, t) => a + t.gross, 0) })).filter((x) => x.yatirim > 0);
  return (
    <div>
      <Header title="Dashboard" sub={`Aralık: ${rg.label} · ${trDate(rg.from)} – ${trDate(rg.to)}`} />
      <div className="mb-5"><DateFilter st={st} setSt={setSt} /></div>
      {belowLimit.length > 0 && (<div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 mb-5 text-sm text-red-300 flex items-start gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5" /><div><b>Bakiye uyarısı:</b> {belowLimit.map((f) => `${f.name} (${fmt(firmBalance(f.id))})`).join(", ")} — uyarı eşiğinin altında. Gerçek sürümde otomatik Telegram uyarısı gider.</div></div>)}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <Stat label="Toplam Yatırım" value={fmt(totDep)} color="text-emerald-400" icon={TrendingUp} />
        <Stat label="Toplam Çekim" value={fmt(totWd)} color="text-red-400" icon={TrendingDown} />
        <Stat label="Yatırım Adedi" value={dep.length} icon={Layers} />
        <Stat label="Toplam Komisyon" value={fmt(totKom)} color="text-amber-400" icon={PieChart} />
        <Stat label="Net Kâr (Kom−Gider)" value={fmt(totKom - totExp)} color={totKom - totExp >= 0 ? "text-emerald-400" : "text-red-400"} icon={Receipt} />
        <Stat label="Toplam Firma Kasaları" value={fmt(totFirmCash)} color={totFirmCash >= 0 ? "text-blue-400" : "text-red-400"} icon={Building2} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className={card + " p-4"}>
          <div className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400" /> Yatırım / Çekim Trendi</div>
          {series.length === 0 ? <div className="text-slate-500 text-sm h-[240px] flex items-center justify-center">Bu aralıkta veri yok.</div> : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ left: -12, right: 8, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradY" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="gun" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={kFmt} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="yatirim" name="Yatırım" stroke="#10b981" strokeWidth={2.5} fill="url(#gradY)" />
              <Area type="monotone" dataKey="cekim" name="Çekim" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradC)" />
            </AreaChart>
          </ResponsiveContainer>)}
        </div>
        <div className={card + " p-4"}>
          <div className="font-bold mb-4 flex items-center gap-2"><Building2 size={16} className="text-blue-400" /> Firma Bazında Yatırım</div>
          {firmDist.length === 0 ? <div className="text-slate-500 text-sm h-[240px] flex items-center justify-center">Bu aralıkta veri yok.</div> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={firmDist} margin={{ left: -12, right: 8, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={kFmt} />
              <Tooltip formatter={(v) => fmt(v)} cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 12 }} />
              <Bar dataKey="yatirim" name="Yatırım" radius={[6, 6, 0, 0]}>{firmDist.map((e, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold flex items-center gap-2"><Building2 size={16} className="text-blue-400" /> Firma Kasaları</div><div className="p-3 space-y-2">{firms.map((f) => { const bal = firmBalance(f.id); const warn = f.active && bal < (f.limit ?? 0); return (<div key={f.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2.5"><span className={f.active ? "" : "text-slate-500"}>{f.name}{!f.active && " (pasif)"}{warn && <AlertCircle size={13} className="inline ml-1.5 text-red-400" />}</span><span className={"font-bold " + (bal >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(bal)}</span></div>); })}<div className="flex items-center justify-between px-3 pt-1 text-sm text-slate-400"><span>Toplam</span><span className="font-bold text-blue-400">{fmt(totFirmCash)}</span></div></div></div>
        <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold flex items-center gap-2"><Wallet size={16} className="text-purple-400" /> Kar Payı Kasaları</div><div className="p-3 space-y-2">{shares.map((s) => (<div key={s.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2.5"><span>{s.name} <span className="text-slate-500 text-xs">%{s.pct}</span></span><span className="font-bold text-emerald-400">{fmt(shareBalance(s.id))}</span></div>))}<div className="flex items-center justify-between px-3 pt-1 text-sm text-slate-400"><span>Toplam</span><span className="font-bold text-purple-400">{fmt(shares.reduce((a, s) => a + shareBalance(s.id), 0))}</span></div></div></div>
      </div>
    </div>
  );
}

/* ============ ortak islem modali ============ */
function TxEditModal({ title, firms, init, isWd, masked, onClose, onSave }) {
  const [firmId, setFirmId] = useState(init.firmId || firms.filter((f) => f.active)[0]?.id || "");
  const [amount, setAmount] = useState(init.amount ?? "");
  const [date, setDate] = useState(init.date || todayIso());
  const [note, setNote] = useState(init.note || "");
  const [noComm, setNoComm] = useState(init.noComm || false);
  const firm = firms.find((f) => f.id === Number(firmId));
  const baseRate = firm ? (isWd ? firm.wrate : firm.rate) : 0;
  const rate = (isWd && noComm) ? 0 : baseRate;
  const v = Number(amount) || 0, commission = r2(v * rate / 100), other = isWd ? r2(v + commission) : r2(v - commission);
  return (
    <Modal title={title} onClose={onClose} footer={<><button className={btnG} onClick={onClose}>İptal</button><button className={btnP} onClick={() => { if (!firmId || !v) return; onSave({ firmId: Number(firmId), amount: v, date, note, noComm: isWd ? noComm : undefined }); }}>Kaydet</button></>}>
      <Field label="Firma"><select className={inputCls} value={firmId} onChange={(e) => setFirmId(e.target.value)}>{firms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}{masked ? "" : ` (%${isWd ? f.wrate : f.rate})`}</option>)}</select></Field>
      <Field label={isWd ? "Müşteriye Giden Net" : "Yatırım Tutarı (Brüt)"}><input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
      <Field label="Tarih"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {isWd && !masked && (<label className="flex items-center gap-2.5 mb-3 cursor-pointer select-none bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5"><input type="checkbox" checked={noComm} onChange={(e) => setNoComm(e.target.checked)} /><span className="text-sm"><span className="font-semibold">Komisyonsuz çekim</span> <span className="text-xs text-slate-500">(seçiliyse firma komisyonu uygulanmaz)</span></span></label>)}
      {v > 0 && firm && !masked && (<div className="bg-slate-950 rounded-lg p-3 text-sm leading-relaxed mb-3 border border-slate-800">Komisyon (%{rate}){isWd && noComm ? <span className="text-emerald-400"> · komisyonsuz</span> : ""}: <b className="text-amber-400">{fmt(commission)}</b><br />{isWd ? <>Kasadan çıkacak brüt: <b className="text-red-400">{fmt(other)}</b></> : <>Kasaya net girecek: <b className="text-emerald-400">{fmt(other)}</b></>}</div>)}
      <Field label="Not"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}

/* ============ Islem Ekleme ============ */
function Islem({ auth, firms, tx, addDeposit, editDeposit, delDeposit, setConfirm }) {
  const masked = auth.role === "employee";
  const [firmFilter, setFirmFilter] = useState("");
  const [st, setSt] = useState({ mode: "bugun", day: todayIso() });
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const PS = 10;
  const rg = computeRg(st);
  const seqMap = useMemo(() => { const m = {}, byFirmDay = {}; [...tx].sort((a, b) => a.ord - b.ord).forEach((t) => { const k = t.firmId + "|" + t.date; byFirmDay[k] = (byFirmDay[k] || 0) + 1; m[t.id] = byFirmDay[k]; }); return m; }, [tx]);
  const all = tx.filter((t) => (!firmFilter || t.firmId === Number(firmFilter)) && inRange(t.date, rg)).filter((t) => { if (!q) return true; const f = firms.find((x) => x.id === t.firmId); return (f?.name + " " + t.gross + " " + t.note + " " + trDate(t.date)).toLowerCase().includes(q.toLowerCase()); }).sort((a, b) => b.ord - a.ord);
  const total = all.reduce((a, t) => a + t.gross, 0);
  const pages = Math.max(1, Math.ceil(all.length / PS));
  const list = all.slice((page - 1) * PS, page * PS);
  const exportCSV = () => downloadFile("islemler.csv", toCSV(["#", "Firma", "Tarih", "Brut", "Komisyon", "Net", "Not"], all.map((t) => [seqMap[t.id], firms.find((f) => f.id === t.firmId)?.name, trDate(t.date), t.gross, masked ? "" : t.commission, masked ? "" : t.net, t.note])), "text/csv");
  return (
    <div>
      <Header title="İşlem Ekleme" sub={masked ? "Çalışan paneli · komisyonlar gizli" : `Aralık: ${rg.label}`}>
        {!masked && <button className={btnG} onClick={exportCSV}><Download size={14} /> Excel</button>}
        <select className={inputCls} style={{ width: 150 }} value={firmFilter} onChange={(e) => { setFirmFilter(e.target.value); setPage(1); }}><option value="">Tüm firmalar</option>{firms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <button className={btnP} onClick={() => setModal("new")}><Plus size={15} /> Ekle</button>
      </Header>
      <div className="flex items-center gap-3 mb-4 flex-wrap"><DateFilter st={st} setSt={setSt} /><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-500" /><input className={inputCls + " pl-8"} style={{ width: 200 }} placeholder="Ara..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
      <div className="grid grid-cols-2 gap-3 mb-4"><Stat label="Görünen Adet" value={all.length} /><Stat label="Toplam Yatırım (Brüt)" value={fmt(total)} color="text-emerald-400" /></div>
      <Table cols={[{ t: "#", w: 56 }, { t: "Firma" }, { t: "Tarih" }, { t: "Brüt", r: true }, { t: "Komisyon", r: true }, { t: "Net", r: true }, { t: "", c: true, w: 90 }]}>
        {list.map((t) => { const f = firms.find((x) => x.id === t.firmId); return (
          <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3"><Badge tone="blue">{seqMap[t.id]}</Badge></td><td className="px-4 py-3 font-semibold">{f?.name}</td><td className="px-4 py-3 text-slate-400">{trDate(t.date)}</td><td className="px-4 py-3 text-right font-bold">{fmt(t.gross)}</td><td className="px-4 py-3 text-right text-amber-400">{masked ? MASK : fmt(t.commission)}</td><td className="px-4 py-3 text-right text-emerald-400">{masked ? MASK : fmt(t.net)}</td><td className="px-4 py-3 text-center whitespace-nowrap"><button className="text-blue-400 hover:text-blue-300 mr-2" onClick={() => setModal(t)}><Edit2 size={15} /></button><button className="text-red-400 hover:text-red-300" onClick={() => setConfirm({ msg: "Bu yatırım çöp kutusuna taşınacak (geri alınabilir).", onYes: () => delDeposit(t.id) })}><Trash2 size={15} /></button></td></tr>); })}
        {list.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Kayıt yok</td></tr>}
      </Table>
      <Pager page={page} pages={pages} setPage={setPage} />
      {modal === "new" && <TxEditModal title="Yatırım Ekle" firms={firms} masked={masked} init={{ firmId: firmFilter ? Number(firmFilter) : undefined, date: st.mode === "gun" ? st.day : todayIso() }} isWd={false} onClose={() => setModal(null)} onSave={(d) => { addDeposit(d); setModal(null); }} />}
      {modal && modal !== "new" && <TxEditModal title="Yatırım Düzenle" firms={firms} masked={masked} init={{ firmId: modal.firmId, amount: modal.gross, date: modal.date, note: modal.note }} isWd={false} onClose={() => setModal(null)} onSave={(d) => { editDeposit(modal.id, d); setModal(null); }} />}
    </div>
  );
}

/* ============ Virman ============ */
function Virman({ firms, transfers, addTransfer, delTransfer, firmBalance, setConfirm }) {
  const [st, setSt] = useState({ mode: "bugun", day: todayIso() });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fromFirmId: "", toFirmId: "", amount: "", date: todayIso(), note: "" });
  const rg = computeRg(st);
  const list = transfers.filter((t) => inRange(t.date, rg)).sort((a, b) => b.ord - a.ord);
  const save = () => { if (!form.fromFirmId || !form.toFirmId || !form.amount || form.fromFirmId === form.toFirmId) return; addTransfer({ fromFirmId: Number(form.fromFirmId), toFirmId: Number(form.toFirmId), amount: Number(form.amount), date: form.date, note: form.note }); setForm({ fromFirmId: "", toFirmId: "", amount: "", date: todayIso(), note: "" }); setModal(false); };
  return (
    <div>
      <Header title="Virman" sub="Firmalar arası komisyonsuz para aktarımı"><button className={btnP} onClick={() => setModal(true)}><Plus size={15} /> Virman Yap</button></Header>
      <div className="mb-4"><DateFilter st={st} setSt={setSt} /></div>
      <Table cols={[{ t: "Tarih" }, { t: "Kimden" }, { t: "Kime" }, { t: "Tutar", r: true }, { t: "Açıklama" }, { t: "", c: true, w: 60 }]}>
        {list.map((t) => (<tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 text-slate-400">{trDate(t.date)}</td><td className="px-4 py-3 font-semibold text-red-300">{firms.find((f) => f.id === t.fromFirmId)?.name}</td><td className="px-4 py-3 font-semibold text-emerald-300">{firms.find((f) => f.id === t.toFirmId)?.name}</td><td className="px-4 py-3 text-right font-bold">{fmt(t.amount)}</td><td className="px-4 py-3 text-slate-400">{t.note}</td><td className="px-4 py-3 text-center"><button className="text-red-400 hover:text-red-300" onClick={() => setConfirm({ msg: "Virman çöp kutusuna taşınacak (geri alınabilir).", onYes: () => delTransfer(t.id) })}><Trash2 size={15} /></button></td></tr>))}
        {list.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Virman yok</td></tr>}
      </Table>
      {modal && (
        <Modal title="Virman Yap" onClose={() => setModal(false)} footer={<><button className={btnG} onClick={() => setModal(false)}>İptal</button><button className={btnP} onClick={save}>Aktar</button></>}>
          <Field label="Kaynak Firma (öder)"><select className={inputCls} value={form.fromFirmId} onChange={(e) => setForm({ ...form, fromFirmId: e.target.value })}><option value="">Seçin</option>{firms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name} · {fmt(firmBalance(f.id))}</option>)}</select></Field>
          <Field label="Hedef Firma (alır)"><select className={inputCls} value={form.toFirmId} onChange={(e) => setForm({ ...form, toFirmId: e.target.value })}><option value="">Seçin</option>{firms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
          <Field label="Tutar (komisyonsuz)"><input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></Field>
          <Field label="Tarih"><input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Açıklama"><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

/* ============ Cekimler ============ */
function Cekim({ firms, wd, firmBalance, addWithdrawal, editWithdrawal, delWithdrawal, setConfirm }) {
  const [firmFilter, setFirmFilter] = useState("");
  const [st, setSt] = useState({ mode: "bugun", day: todayIso() });
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const PS = 10;
  const rg = computeRg(st);
  const all = wd.filter((w) => (!firmFilter || w.firmId === Number(firmFilter)) && inRange(w.date, rg)).filter((w) => { if (!q) return true; const f = firms.find((x) => x.id === w.firmId); return (f?.name + " " + w.net + " " + w.note + " " + trDate(w.date)).toLowerCase().includes(q.toLowerCase()); }).sort((a, b) => b.ord - a.ord);
  const tNet = all.reduce((a, w) => a + w.net, 0), tBrut = all.reduce((a, w) => a + w.gross, 0);
  const pages = Math.max(1, Math.ceil(all.length / PS)); const list = all.slice((page - 1) * PS, page * PS);
  const exportCSV = () => downloadFile("cekimler.csv", toCSV(["Firma", "Tarih", "Net", "Komisyon", "Brut", "Not"], all.map((w) => [firms.find((f) => f.id === w.firmId)?.name, trDate(w.date), w.net, w.commission, w.gross, w.note])), "text/csv");
  return (
    <div>
      <Header title="Çekimler" sub="Komisyon oranı firmanın çekim oranıdır">
        <button className={btnG} onClick={exportCSV}><Download size={14} /> Excel</button>
        <select className={inputCls} style={{ width: 150 }} value={firmFilter} onChange={(e) => { setFirmFilter(e.target.value); setPage(1); }}><option value="">Tüm firmalar</option>{firms.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <button className={btnP} onClick={() => setModal("new")}><Plus size={15} /> Ekle</button>
      </Header>
      <div className="flex items-center gap-3 mb-4 flex-wrap"><DateFilter st={st} setSt={setSt} /><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-500" /><input className={inputCls + " pl-8"} style={{ width: 200 }} placeholder="Ara..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4"><Stat label="Adet" value={all.length} /><Stat label="Net (Müşteriye)" value={fmt(tNet)} /><Stat label="Brüt (Kasadan)" value={fmt(tBrut)} color="text-red-400" /></div>
      <Table cols={[{ t: "Firma" }, { t: "Tarih" }, { t: "Net", r: true }, { t: "Komisyon", r: true }, { t: "Brüt", r: true }, { t: "Kasa Sonrası", r: true }, { t: "", c: true, w: 90 }]}>
        {list.map((w) => { const f = firms.find((x) => x.id === w.firmId); const bal = firmBalance(w.firmId); return (<tr key={w.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 font-semibold">{f?.name}</td><td className="px-4 py-3 text-slate-400">{trDate(w.date)}</td><td className="px-4 py-3 text-right font-bold">{fmt(w.net)}</td><td className="px-4 py-3 text-right text-amber-400">{w.noComm ? <Badge tone="green">komisyonsuz</Badge> : fmt(w.commission)}</td><td className="px-4 py-3 text-right text-red-400">{fmt(w.gross)}</td><td className={"px-4 py-3 text-right " + (bal >= 0 ? "text-slate-400" : "text-red-400 font-semibold")}>{fmt(bal)}</td><td className="px-4 py-3 text-center whitespace-nowrap"><button className="text-blue-400 hover:text-blue-300 mr-2" onClick={() => setModal(w)}><Edit2 size={15} /></button><button className="text-red-400 hover:text-red-300" onClick={() => setConfirm({ msg: "Bu çekim çöp kutusuna taşınacak (geri alınabilir).", onYes: () => delWithdrawal(w.id) })}><Trash2 size={15} /></button></td></tr>); })}
        {list.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Kayıt yok</td></tr>}
      </Table>
      <Pager page={page} pages={pages} setPage={setPage} />
      <div className="text-xs text-slate-500 mt-2">Not: Çekimler kasayı eksiye düşürebilir.</div>
      {modal === "new" && <TxEditModal title="Çekim Ekle" firms={firms} init={{ firmId: firmFilter ? Number(firmFilter) : undefined, date: st.mode === "gun" ? st.day : todayIso() }} isWd onClose={() => setModal(null)} onSave={(d) => { addWithdrawal(d); setModal(null); }} />}
      {modal && modal !== "new" && <TxEditModal title="Çekim Düzenle" firms={firms} init={{ firmId: modal.firmId, amount: modal.net, date: modal.date, note: modal.note, noComm: modal.noComm }} isWd onClose={() => setModal(null)} onSave={(d) => { editWithdrawal(modal.id, d); setModal(null); }} />}
    </div>
  );
}

/* ============ Komisyon ============ */
function Komisyon({ shares, setShares, shareTx, tx, wd, shareBalance, addShareTx, editShareTx, delShareTx, setConfirm }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", pct: "", gider: true });
  const [wallet, setWallet] = useState(null);
  const [op, setOp] = useState({ kind: "add", amount: "", date: todayIso(), desc: "" });
  const [edit, setEdit] = useState(null);
  const totalKom = tx.reduce((a, t) => a + t.commission, 0) + wd.reduce((a, w) => a + w.commission, 0);
  const distributed = shareTx.filter((p) => p.type === "commission").reduce((a, p) => a + p.amount, 0);
  const totalPct = shares.filter((s) => s.active).reduce((a, s) => a + s.pct, 0);
  const okPct = Math.abs(totalPct - 100) < 0.001;
  const ledger = wallet ? shareTx.filter((p) => p.shareId === wallet).sort((a, b) => b.ord - a.ord) : [];
  const wShare = wallet ? shares.find((s) => s.id === wallet) : null;
  const PT = { commission: ["Komisyon", "blue"], add: ["Ekleme", "green"], withdraw: ["Çekim", "red"] };
  return (
    <div>
      <Header title="Komisyon & Kar Payı" sub="Tüm komisyon %100 kabul edilir ve %100 dağıtılır"><button className={btnP} onClick={() => setModal(true)}><Plus size={15} /> Kar Payı Alıcak Ekle</button></Header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><Stat label="Toplam Biriken Komisyon" value={fmt(totalKom)} color="text-amber-400" icon={PieChart} /><Stat label="Dağıtılan" value={fmt(distributed)} color="text-purple-400" /><Stat label="Dağıtılmamış" value={fmt(totalKom - distributed)} color={Math.abs(totalKom - distributed) < 0.01 ? "text-emerald-400" : "text-red-400"} /><Stat label="Toplam Pay Oranı" value={"%" + totalPct.toFixed(2)} color={okPct ? "text-emerald-400" : "text-red-400"} /></div>
      {!okPct && <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 mb-4 text-sm text-red-300">⚠ Pay oranları toplamı <b>%{totalPct.toFixed(2)}</b>. Komisyonun tamamı için toplam <b>%100</b> olmalı.</div>}
      <Table cols={[{ t: "İsim" }, { t: "Pay Oranı", r: true }, { t: "Kasa", r: true }, { t: "İşlem", c: true, w: 110 }]}>
        {shares.map((s) => (<tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 font-semibold">{s.name}{s.gider === false && <span className="text-slate-500 text-xs font-normal ml-2">· giderden muaf</span>}</td><td className="px-4 py-3 text-right"><Badge tone="blue">%{s.pct}</Badge></td><td className="px-4 py-3 text-right font-bold text-emerald-400">{fmt(shareBalance(s.id))}</td><td className="px-4 py-3 text-center whitespace-nowrap"><button className="text-slate-300 hover:text-white mr-3" onClick={() => { setWallet(s.id); setOp({ kind: "add", amount: "", date: todayIso(), desc: "" }); }}><BookOpen size={16} /></button><button className="text-blue-400 hover:text-blue-300 mr-3" onClick={() => { setForm({ id: s.id, name: s.name, pct: s.pct, gider: s.gider !== false }); setModal(true); }}><Edit2 size={15} /></button><button className="text-red-400 hover:text-red-300" onClick={() => setConfirm({ msg: `"${s.name}" silinsin mi?`, onYes: () => { shareTx.filter((p) => p.shareId === s.id).forEach((p) => delShareTx(p.id)); setShares((ss) => ss.filter((x) => x.id !== s.id)); } })}><Trash2 size={15} /></button></td></tr>))}
      </Table>
      {modal && (<Modal title={form.id ? "Pay Sahibi Düzenle" : "Kar Payı Alıcak Ekle"} onClose={() => { setModal(false); setForm({ name: "", pct: "", gider: true }); }} footer={<><button className={btnG} onClick={() => { setModal(false); setForm({ name: "", pct: "", gider: true }); }}>İptal</button><button className={btnP} onClick={() => { if (!form.name) return; if (form.id) setShares((ss) => ss.map((x) => x.id === form.id ? { ...x, name: form.name, pct: Number(form.pct) || 0, gider: form.gider } : x)); else setShares((ss) => [...ss, { id: nid(), name: form.name, pct: Number(form.pct) || 0, active: true, gider: form.gider }]); setForm({ name: "", pct: "", gider: true }); setModal(false); }}>Kaydet</button></>}><Field label="İsim"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field><Field label="Pay Oranı (%) — komisyonun yüzdesi"><input className={inputCls} type="number" value={form.pct} onChange={(e) => setForm({ ...form, pct: e.target.value })} placeholder="örn. 50" /></Field><label className="flex items-start gap-2.5 mt-1 mb-2 cursor-pointer select-none"><input type="checkbox" className="mt-0.5" checked={form.gider !== false} onChange={(e) => setForm({ ...form, gider: e.target.checked })} /><span className="text-sm"><span className="font-semibold">Giderlerden pay alır</span><br /><span className="text-xs text-slate-500">İşaretliyse, eklenen giderler bu ortağın kar payından (yüzdesine göre) düşülür. İşaretli değilse bu ortaktan gider kesilmez.</span></span></label><div className="text-xs text-slate-500">Toplam %100 olmalı. Örn. 50+30+20.</div></Modal>)}
      {wShare && (
        <Modal title={wShare.name + " — Kasa & Defter"} onClose={() => setWallet(null)} wide footer={<button className={btnG} onClick={() => setWallet(null)}>Kapat</button>}>
          <div className="grid grid-cols-2 gap-3 mb-4"><Stat label="Güncel Bakiye" value={fmt(shareBalance(wallet))} color="text-emerald-400" /><Stat label="Pay Oranı" value={"%" + wShare.pct} /></div>
          <div className="flex gap-2 mb-2"><Chip on={op.kind === "add"} onClick={() => setOp({ ...op, kind: "add" })}><PlusCircle size={14} className="inline mr-1" /> Kasaya Ekle</Chip><Chip on={op.kind === "withdraw"} onClick={() => setOp({ ...op, kind: "withdraw" })}><MinusCircle size={14} className="inline mr-1" /> Çekim</Chip></div>
          <div className="flex gap-2 mb-4 flex-wrap"><input className={inputCls} style={{ flex: 1, minWidth: 90 }} type="number" placeholder="Tutar" value={op.amount} onChange={(e) => setOp({ ...op, amount: e.target.value })} /><input className={inputCls} style={{ width: 150 }} type="date" value={op.date} onChange={(e) => setOp({ ...op, date: e.target.value })} /><input className={inputCls} style={{ flex: 1, minWidth: 90 }} placeholder="Açıklama" value={op.desc} onChange={(e) => setOp({ ...op, desc: e.target.value })} /><button className={btnP} onClick={() => { const a = Number(op.amount); if (!a) return; addShareTx({ shareId: wallet, kind: op.kind, amount: a, date: op.date, desc: op.desc }); setOp({ ...op, amount: "", desc: "" }); }}>Uygula</button></div>
          <div className="border border-slate-800 rounded-lg overflow-hidden overflow-y-auto" style={{ maxHeight: 300 }}><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/60"><th className="text-left px-3 py-2">Tarih</th><th className="text-left px-3 py-2">Tür</th><th className="text-left px-3 py-2">Açıklama</th><th className="text-right px-3 py-2">Tutar</th><th className="px-3 py-2"></th></tr></thead><tbody>{ledger.map((p) => { const [lab, tone] = PT[p.type] || [p.type, "slate"]; return (<tr key={p.id} className="border-t border-slate-800"><td className="px-3 py-2 text-slate-400 text-xs">{trDate(p.date)}</td><td className="px-3 py-2"><Badge tone={tone}>{lab}</Badge></td><td className="px-3 py-2 text-slate-400 text-xs">{p.firmName ? p.firmName + " / " : ""}{p.desc}</td><td className={"px-3 py-2 text-right font-semibold " + (p.amount >= 0 ? "text-emerald-400" : "text-red-400")}>{p.amount >= 0 ? "+" : ""}{fmt(p.amount)}</td><td className="px-3 py-2 text-center whitespace-nowrap">{p.type !== "commission" && <button className="text-blue-400 hover:text-blue-300 mr-2" onClick={() => setEdit({ id: p.id, amount: Math.abs(p.amount), date: p.date, desc: p.desc })}><Edit2 size={13} /></button>}<button className="text-red-400 hover:text-red-300" onClick={() => delShareTx(p.id)}><Trash2 size={13} /></button></td></tr>); })}{ledger.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Hareket yok</td></tr>}</tbody></table></div>
        </Modal>
      )}
      {edit && (<Modal title="Hareketi Düzenle" onClose={() => setEdit(null)} footer={<><button className={btnG} onClick={() => setEdit(null)}>İptal</button><button className={btnP} onClick={() => { editShareTx(edit.id, { amount: Number(edit.amount), date: edit.date, desc: edit.desc }); setEdit(null); }}>Kaydet</button></>}><Field label="Tutar"><input className={inputCls} type="number" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} autoFocus /></Field><Field label="Tarih"><input className={inputCls} type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field><Field label="Açıklama"><input className={inputCls} value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></Field></Modal>)}
    </div>
  );
}

/* ============ Giderler ============ */
function Giderler({ expenses, tx, wd, addExpense, editExpense, delExpense, setConfirm }) {
  const [st, setSt] = useState({ mode: "buay", day: todayIso() });
  const [modal, setModal] = useState(null);
  const rg = computeRg(st);
  const list = expenses.filter((e) => inRange(e.date, rg)).sort((a, b) => b.ord - a.ord);
  const totExp = list.reduce((a, e) => a + e.amount, 0);
  const totKom = tx.filter((t) => inRange(t.date, rg)).reduce((a, t) => a + t.commission, 0) + wd.filter((w) => inRange(w.date, rg)).reduce((a, w) => a + w.commission, 0);
  const exportCSV = () => downloadFile("giderler.csv", toCSV(["Tarih", "Baslik", "Kategori", "Tutar", "Not"], list.map((e) => [trDate(e.date), e.title, e.category, e.amount, e.note])), "text/csv");
  return (
    <div>
      <Header title="Giderler" sub="Masraf takibi ve net kâr">
        <button className={btnG} onClick={exportCSV}><Download size={14} /> Excel</button>
        <button className={btnP} onClick={() => setModal("new")}><Plus size={15} /> Gider Ekle</button>
      </Header>
      <div className="mb-4"><DateFilter st={st} setSt={setSt} /></div>
      <div className="grid grid-cols-3 gap-3 mb-4"><Stat label="Toplam Komisyon (Gelir)" value={fmt(totKom)} color="text-amber-400" /><Stat label="Toplam Gider" value={fmt(totExp)} color="text-red-400" /><Stat label="Net Kâr" value={fmt(totKom - totExp)} color={totKom - totExp >= 0 ? "text-emerald-400" : "text-red-400"} /></div>
      <Table cols={[{ t: "Tarih" }, { t: "Başlık" }, { t: "Kategori" }, { t: "Tutar", r: true }, { t: "", c: true, w: 90 }]}>
        {list.map((e) => (<tr key={e.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 text-slate-400">{trDate(e.date)}</td><td className="px-4 py-3 font-semibold">{e.title}{e.note && <span className="text-slate-500 text-xs"> · {e.note}</span>}</td><td className="px-4 py-3"><Badge tone="purple">{e.category}</Badge></td><td className="px-4 py-3 text-right font-bold text-red-400">{fmt(e.amount)}</td><td className="px-4 py-3 text-center whitespace-nowrap"><button className="text-blue-400 hover:text-blue-300 mr-2" onClick={() => setModal(e)}><Edit2 size={15} /></button><button className="text-red-400 hover:text-red-300" onClick={() => setConfirm({ msg: "Gider silinsin mi?", onYes: () => delExpense(e.id) })}><Trash2 size={15} /></button></td></tr>))}
        {list.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Gider yok</td></tr>}
      </Table>
      {modal && <ExpenseModal exp={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={(d) => { if (modal === "new") addExpense(d); else editExpense(modal.id, d); setModal(null); }} />}
    </div>
  );
}
function ExpenseModal({ exp, onClose, onSave }) {
  const [title, setTitle] = useState(exp?.title || ""); const [amount, setAmount] = useState(exp?.amount ?? ""); const [category, setCategory] = useState(exp?.category || EXP_CATS[0]); const [date, setDate] = useState(exp?.date || todayIso()); const [note, setNote] = useState(exp?.note || "");
  return (
    <Modal title={exp ? "Gider Düzenle" : "Gider Ekle"} onClose={onClose} footer={<><button className={btnG} onClick={onClose}>İptal</button><button className={btnP} onClick={() => { if (!title || !Number(amount)) return; onSave({ title, amount, category, date, note }); }}>Kaydet</button></>}>
      <Field label="Başlık"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="Tutar"><input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Kategori"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Tarih"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Not"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}

/* ============ Firma Takip ============ */
function Takip({ auth, firms, tx, wd, transfers, firmBalance }) {
  const allowed = auth.role === "owner" ? firms.filter((f) => auth.firmIds.includes(f.id)) : firms;
  const [firmId, setFirmId] = useState(allowed[0]?.id || "");
  const [date, setDate] = useState(todayIso());
  const firm = firms.find((f) => f.id === Number(firmId));
  if (!firm) return <div className="text-slate-500">Bu panele atanmış firma yok.</div>;
  const dayDep = tx.filter((t) => t.firmId === firm.id && t.date === date).sort((a, b) => a.ord - b.ord);
  const allWd = wd.filter((w) => w.firmId === firm.id).sort((a, b) => (b.date + String(b.ord)).localeCompare(a.date + String(a.ord)));
  const myTransfers = transfers.filter((t) => t.fromFirmId === firm.id || t.toFirmId === firm.id).sort((a, b) => b.ord - a.ord);
  const sumDep = dayDep.reduce((a, t) => a + t.gross, 0), sumNet = dayDep.reduce((a, t) => a + t.net, 0);
  return (
    <div>
      <Header title="Firma Takip" sub="Günlük yatırımlar seçili güne göre; çekim ve virmanlar her zaman görünür">
        <select className={inputCls} style={{ width: 180 }} value={firmId} onChange={(e) => setFirmId(e.target.value)}>{allowed.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <input type="date" className={inputCls} style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} />
      </Header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"><Stat label="Günlük Yatırım" value={fmt(sumDep)} /><Stat label="Net Kasaya" value={fmt(sumNet)} color="text-emerald-400" /><Stat label="Günlük Adet" value={dayDep.length} /><Stat label="Anlık Kasa" value={fmt(firmBalance(firm.id))} color={firmBalance(firm.id) >= 0 ? "text-emerald-400" : "text-red-400"} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold">Günlük Yatırımlar · {trDate(date)}</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-2.5" style={{ width: 56 }}>#</th><th className="text-right px-4 py-2.5">Brüt</th><th className="text-right px-4 py-2.5">Net</th></tr></thead><tbody>{dayDep.map((t, i) => (<tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5"><Badge tone="blue">{i + 1}</Badge></td><td className="px-4 py-2.5 text-right font-semibold">{fmt(t.gross)}</td><td className="px-4 py-2.5 text-right text-emerald-400">{fmt(t.net)}</td></tr>))}{dayDep.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500">İşlem yok</td></tr>}</tbody>{dayDep.length > 0 && <tfoot><tr className="border-t border-slate-700 bg-slate-950/40"><td className="px-4 py-2.5 font-bold">Toplam</td><td className="px-4 py-2.5 text-right font-bold">{fmt(sumDep)}</td><td className="px-4 py-2.5 text-right font-bold text-emerald-400">{fmt(sumNet)}</td></tr></tfoot>}</table></div>
        <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold">Tüm Çekimler</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-2.5" style={{ width: 56 }}>#</th><th className="text-left px-4 py-2.5">Tarih</th><th className="text-right px-4 py-2.5">Brüt</th></tr></thead><tbody>{allWd.map((w, i) => (<tr key={w.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5"><Badge tone="slate">{i + 1}</Badge></td><td className="px-4 py-2.5 text-slate-400">{trDate(w.date)}</td><td className="px-4 py-2.5 text-right text-red-400">{fmt(w.gross)}</td></tr>))}{allWd.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500">Çekim yok</td></tr>}</tbody></table></div>
      </div>
      <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold flex items-center gap-2"><Repeat size={15} className="text-purple-400" /> Virman Hareketleri</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-2.5">Tarih</th><th className="text-left px-4 py-2.5">Açıklama</th><th className="text-right px-4 py-2.5">Tutar</th></tr></thead><tbody>{myTransfers.map((t) => { const out = t.fromFirmId === firm.id; const other = firms.find((f) => f.id === (out ? t.toFirmId : t.fromFirmId))?.name; return (<tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400">{trDate(t.date)}</td><td className="px-4 py-2.5">{out ? <span className="text-red-300">{firm.name} → {other}</span> : <span className="text-emerald-300">{other} → {firm.name}</span>}{t.note && <span className="text-slate-500"> · {t.note}</span>}</td><td className={"px-4 py-2.5 text-right font-semibold " + (out ? "text-red-400" : "text-emerald-400")}>{out ? "-" : "+"}{fmt(t.amount)}</td></tr>); })}{myTransfers.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Virman yok</td></tr>}</tbody></table></div>
    </div>
  );
}

/* ============ Bildirim ============ */
function Bildirim({ firms, shares, tx, wd, firmBalance, shareTx, botToken, setBotToken, notify, setNotify, contacts, setContacts, schedule, setSchedule, templates, setTemplates }) {
  const [tokenInput, setTokenInput] = useState(botToken);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [date, setDate] = useState(todayIso());
  const [preview, setPreview] = useState(null);
  const [add, setAdd] = useState({ scope: "firma", targetId: firms[0]?.id || "", chatId: "", label: "" });
  const [custom, setCustom] = useState({ text: "", firmaAll: true, ortakAll: true });
  const [showTpl, setShowTpl] = useState(false);
  const fill = (tpl, map) => { let s = tpl; Object.entries(map).forEach(([k, v]) => { s = s.split(`{${k}}`).join(v); }); if (templates.extra && templates.extra.trim()) s += `\n\n${templates.extra.trim()}`; return s; };
  const sis = () => { const d = tx.filter((t) => t.date === date), w = wd.filter((x) => x.date === date); return { sis_yat: fmt(d.reduce((a, t) => a + t.gross, 0)), sis_cek: fmt(w.reduce((a, x) => a + x.gross, 0)), sis_kom: fmt(d.reduce((a, t) => a + t.commission, 0) + w.reduce((a, x) => a + x.commission, 0)), firma_kasalari: fmt(firms.reduce((a, f) => a + firmBalance(f.id), 0)) }; };
  const firmMsg = (f) => { const d = tx.filter((t) => t.firmId === f.id && t.date === date), w = wd.filter((x) => x.firmId === f.id && x.date === date); return fill(templates.firm, { firma: f.name, tarih: trDate(date), kasa: fmt(firmBalance(f.id)), yat_adet: d.length, yat_toplam: fmt(d.reduce((a, t) => a + t.gross, 0)), yat_komisyon: fmt(d.reduce((a, t) => a + t.commission, 0)), yat_net: fmt(d.reduce((a, t) => a + t.net, 0)), cek_adet: w.length, cek_brut: fmt(w.reduce((a, x) => a + x.gross, 0)) }); };
  const shareMsg = (s) => { const today = shareTx.filter((p) => p.shareId === s.id && p.date === date && p.type === "commission"); return fill(templates.share, { ortak: s.name, tarih: trDate(date), bugun_pay: fmt(today.reduce((a, p) => a + p.amount, 0)), toplam_kasa: fmt(shareTx.filter((p) => p.shareId === s.id).reduce((a, p) => a + p.amount, 0)), ...sis() }); };
  const chatsFor = (scope, targetId) => contacts.filter((c) => c.scope === scope && String(c.targetId) === String(targetId));
  const open = (title, items) => setPreview({ title, items });
  const doSend = async (items) => {
    const msgs = (items || []).map((it) => ({ chatIds: (it.to || []).map((c) => c.chatId), text: it.msg })).filter((m) => m.chatIds.length && m.text);
    if (!msgs.length) { setResult({ error: "Gönderilecek alıcı (TG ID) tanımlı değil." }); return; }
    setSending(true);
    try { const r = await api("/api/notify/send", { method: "POST", body: JSON.stringify({ items: msgs }) }); setResult({ sent: r.sent, failed: r.failed }); setPreview(null); }
    catch (e) { setResult({ error: e.message || "Gönderilemedi." }); }
    setSending(false);
  };
  const toggleId = (grp, id) => setSchedule((s) => ({ ...s, [grp]: { ...s[grp], ids: s[grp].ids.includes(id) ? s[grp].ids.filter((x) => x !== id) : [...s[grp].ids, id] } }));
  const scheduledItems = () => { const items = []; if (schedule.firms.mode !== "none") (schedule.firms.mode === "all" ? firms.filter((f) => f.active) : firms.filter((f) => schedule.firms.ids.includes(f.id))).forEach((f) => items.push({ name: "Firma: " + f.name, to: chatsFor("firma", f.id), msg: firmMsg(f) })); if (schedule.shares.mode !== "none") (schedule.shares.mode === "all" ? shares : shares.filter((s) => schedule.shares.ids.includes(s.id))).forEach((s) => items.push({ name: "Ortak: " + s.name, to: chatsFor("karpayi", s.id), msg: shareMsg(s) })); return items; };
  const sendCustom = () => { const items = []; if (custom.firmaAll) firms.filter((f) => f.active).forEach((f) => items.push({ name: "Firma: " + f.name, to: chatsFor("firma", f.id), msg: custom.text })); if (custom.ortakAll) shares.forEach((s) => items.push({ name: "Ortak: " + s.name, to: chatsFor("karpayi", s.id), msg: custom.text })); open("Özel Mesaj Önizleme", items); };
  const TOKENS_FIRM = "{firma} {tarih} {kasa} {yat_adet} {yat_toplam} {yat_komisyon} {yat_net} {cek_adet} {cek_brut}";
  const TOKENS_SHARE = "{ortak} {tarih} {bugun_pay} {toplam_kasa} {sis_yat} {sis_cek} {sis_kom} {firma_kasalari}";
  return (
    <div>
      <Header title="Bildirim" sub="Telegram raporları, şablonlar ve zamanlama"><input type="date" className={inputCls} style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} /></Header>

      <div className={card + " p-4 mb-4"}>
        <div className="font-bold mb-2 flex items-center gap-2"><Bell size={16} className="text-blue-400" /> Telegram Bildirimleri</div>
        <div className="text-sm text-slate-400 mb-3 leading-relaxed">Bildirim almak isteyen kişi botu Telegram'da açıp <b>/start</b> yazsın; bot ona <b>Telegram ID</b>'sini verir. O ID'yi aşağıdaki <b>"TG ID Tanımla"</b> bölümünden ilgili firmaya/ortağa ekleyin. Raporlar ve bakiye uyarıları otomatik olarak o kişilere gider — ayrıca bir liste tutmanıza gerek yok.</div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setNotify((n) => ({ ...n, alert: !(n.alert !== false) }))} className={"px-3 py-1.5 rounded-lg text-sm font-semibold " + (notify.alert !== false ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300")}>{notify.alert !== false ? "Bakiye Uyarısı: Açık" : "Bakiye Uyarısı: Kapalı"}</button>
          <span className="text-xs text-slate-500">Bir firma kasası eşiğin altına düşünce o firmanın TG kişilerine otomatik uyarı gider.</span>
        </div>
      </div>

      <div className={card + " p-4 mb-4"}>
        <div className="flex items-center justify-between mb-2"><div className="font-bold flex items-center gap-2"><MessageSquare size={16} className="text-amber-400" /> Mesaj Şablonları</div><button className={btnG} onClick={() => setShowTpl((v) => !v)}>{showTpl ? "Gizle" : "Düzenle"}</button></div>
        {showTpl && (<div className="space-y-3">
          <div><div className="text-xs uppercase text-slate-500 mb-1">Firma Mesajı</div><textarea className={inputCls} rows={6} value={templates.firm} onChange={(e) => setTemplates((t) => ({ ...t, firm: e.target.value }))} /><div className="text-xs text-slate-500 mt-1">Kullanılabilir alanlar: <span className="font-mono">{TOKENS_FIRM}</span></div></div>
          <div><div className="text-xs uppercase text-slate-500 mb-1">Ortak Mesajı (patron bilgisi de burada — firma kasaları toplamı dahil)</div><textarea className={inputCls} rows={7} value={templates.share} onChange={(e) => setTemplates((t) => ({ ...t, share: e.target.value }))} /><div className="text-xs text-slate-500 mt-1">Kullanılabilir alanlar: <span className="font-mono">{TOKENS_SHARE}</span></div></div>
          <div><div className="text-xs uppercase text-slate-500 mb-1">Ek Not (tüm bildirimlerin sonuna eklenir — opsiyonel)</div><input className={inputCls} value={templates.extra} onChange={(e) => setTemplates((t) => ({ ...t, extra: e.target.value }))} placeholder="örn. İyi çalışmalar 🙌" /></div>
        </div>)}
        {!showTpl && <div className="text-xs text-slate-500">Emoji, sıralama ve hangi alanların görüneceğini düzenleyebilirsin. Alanları silersen mesajda görünmez.</div>}
      </div>

      <div className={card + " p-4 mb-4"}>
        <div className="font-bold mb-3 flex items-center gap-2"><Clock size={16} className="text-emerald-400" /> Zamanlanmış Bildirim</div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <button onClick={() => setSchedule((s) => ({ ...s, enabled: !s.enabled }))} className={"px-3 py-1.5 rounded-lg text-sm font-semibold " + (schedule.enabled ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300")}>{schedule.enabled ? "Açık" : "Kapalı"}</button>
          <span className="text-sm text-slate-400">Her gün saat</span>
          <input type="time" className={inputCls} style={{ width: 120 }} value={schedule.time} onChange={(e) => setSchedule((s) => ({ ...s, time: e.target.value }))} />
          <button className={btnG} onClick={() => open("Zamanlanmış Bildirim Önizleme", scheduledItems())}>Şimdi Çalıştır (Önizleme)</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-950 rounded-lg p-3"><div className="text-xs uppercase text-slate-500 mb-2">Firmalar</div><div className="flex gap-1 mb-2 flex-wrap">{[["all", "Hepsi"], ["selected", "Seçili"], ["none", "Hiçbiri"]].map(([k, l]) => <Chip key={k} on={schedule.firms.mode === k} onClick={() => setSchedule((s) => ({ ...s, firms: { ...s.firms, mode: k } }))}>{l}</Chip>)}</div>{schedule.firms.mode === "selected" && <div className="space-y-1">{firms.map((f) => <label key={f.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={schedule.firms.ids.includes(f.id)} onChange={() => toggleId("firms", f.id)} /> {f.name}</label>)}</div>}</div>
          <div className="bg-slate-950 rounded-lg p-3"><div className="text-xs uppercase text-slate-500 mb-2">Ortaklar (patron dahil)</div><div className="flex gap-1 mb-2 flex-wrap">{[["all", "Hepsi"], ["selected", "Seçili"], ["none", "Hiçbiri"]].map(([k, l]) => <Chip key={k} on={schedule.shares.mode === k} onClick={() => setSchedule((s) => ({ ...s, shares: { ...s.shares, mode: k } }))}>{l}</Chip>)}</div>{schedule.shares.mode === "selected" && <div className="space-y-1">{shares.map((s2) => <label key={s2.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={schedule.shares.ids.includes(s2.id)} onChange={() => toggleId("shares", s2.id)} /> {s2.name}</label>)}</div>}</div>
        </div>
        <div className="text-xs text-slate-500 mt-2">İstediğin kombinasyonu seç: sadece firma, sadece ortak, hepsi, ya da seçili kişiler. {schedule.enabled ? <span className="text-emerald-400">Aktif — gerçek sürümde her gün {schedule.time}'da otomatik gönderilir.</span> : "Kapalı."}</div>
      </div>

      <div className={card + " p-4 mb-4"}>
        <div className="font-bold mb-3 flex items-center gap-2"><Send size={16} className="text-purple-400" /> Özel Mesaj Gönder</div>
        <textarea className={inputCls} rows={3} placeholder="Göndermek istediğin mesajı yaz..." value={custom.text} onChange={(e) => setCustom({ ...custom, text: e.target.value })} />
        <div className="flex items-center gap-4 mt-2 flex-wrap"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={custom.firmaAll} onChange={(e) => setCustom({ ...custom, firmaAll: e.target.checked })} /> Tüm Firmalara</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={custom.ortakAll} onChange={(e) => setCustom({ ...custom, ortakAll: e.target.checked })} /> Tüm Ortaklara</label><button className={btnP} disabled={!custom.text.trim()} onClick={sendCustom}><Send size={13} /> Önizle / Gönder</button></div>
      </div>

      <div className={card + " p-4 mb-4"}>
        <div className="font-bold mb-3 flex items-center gap-2"><Users size={16} className="text-blue-400" /> TG ID Tanımla</div>
        <div className="flex gap-2 flex-wrap mb-3">
          <select className={inputCls} style={{ width: 140 }} value={add.scope} onChange={(e) => setAdd({ ...add, scope: e.target.value, targetId: e.target.value === "firma" ? (firms[0]?.id || "") : (shares[0]?.id || "") })}><option value="firma">Firma Sahibi</option><option value="karpayi">Ortak / Kar Payı</option></select>
          <select className={inputCls} style={{ width: 160 }} value={add.targetId} onChange={(e) => setAdd({ ...add, targetId: e.target.value })}>{(add.scope === "firma" ? firms : shares).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input className={inputCls} style={{ width: 140 }} placeholder="TG Chat ID" value={add.chatId} onChange={(e) => setAdd({ ...add, chatId: e.target.value })} />
          <input className={inputCls} style={{ flex: 1, minWidth: 110 }} placeholder="Etiket" value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} />
          <button className={btnP} onClick={() => { if (!add.chatId) return; setContacts((c) => [...c, { id: nid(), scope: add.scope, targetId: Number(add.targetId), chatId: add.chatId, label: add.label }]); setAdd({ ...add, chatId: "", label: "" }); }}><Plus size={14} /></button>
        </div>
        {contacts.length === 0 ? <div className="text-slate-500 text-sm">Henüz ID tanımlanmadı.</div> : <div className="space-y-1">{contacts.map((c) => { const name = (c.scope === "firma" ? firms : shares).find((x) => x.id === c.targetId)?.name; return (<div key={c.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 text-sm"><span><Badge tone="slate">{c.scope === "firma" ? "firma" : "ortak"}</Badge> <b className="ml-1">{name}</b> · <span className="font-mono text-slate-400">{c.chatId}</span>{c.label && <span className="text-slate-500"> ({c.label})</span>}</span><button className="text-red-400 hover:text-red-300" onClick={() => setContacts((arr) => arr.filter((x) => x.id !== c.id))}><Trash2 size={13} /></button></div>); })}</div>}
      </div>

      <div className={card + " p-4"}>
        <div className="font-bold mb-3 flex items-center gap-2"><Send size={16} className="text-emerald-400" /> Manuel Gönder (günlük rapor)</div>
        <div className="flex gap-2 flex-wrap mb-4"><button className={btnP} onClick={() => open("Tüm Firmalara", firms.filter((f) => f.active).map((f) => ({ to: chatsFor("firma", f.id), msg: firmMsg(f), name: f.name })))}>Tüm Firmalara</button><button className={btnG} onClick={() => open("Tüm Ortaklara", shares.map((s) => ({ to: chatsFor("karpayi", s.id), msg: shareMsg(s), name: s.name })))}>Tüm Ortaklara</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><div className="text-xs uppercase text-slate-500 mb-2">Firmalar</div>{firms.filter((f) => f.active).map((f) => (<div key={f.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 mb-1"><span>{f.name} <span className="text-slate-500 text-xs">({chatsFor("firma", f.id).length} ID)</span></span><button className={btnG} onClick={() => open(`${f.name}`, [{ to: chatsFor("firma", f.id), msg: firmMsg(f) }])}><Send size={13} /> Gönder</button></div>))}</div>
          <div><div className="text-xs uppercase text-slate-500 mb-2">Ortaklar</div>{shares.map((s) => (<div key={s.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 mb-1"><span>{s.name} <span className="text-slate-500 text-xs">({chatsFor("karpayi", s.id).length} ID)</span></span><button className={btnG} onClick={() => open(`${s.name}`, [{ to: chatsFor("karpayi", s.id), msg: shareMsg(s) }])}><Send size={13} /> Gönder</button></div>))}</div>
        </div>
      </div>

      {preview && (<Modal title={preview.title} onClose={() => setPreview(null)} wide footer={<><button className={btnG} onClick={() => setPreview(null)}>Kapat</button>{preview.items.some((it) => it.to && it.to.length) && <button className={btnP} onClick={() => doSend(preview.items)} disabled={sending}>{sending ? "Gönderiliyor..." : <><Send size={13} /> Telegram'a Gönder</>}</button>}</>}><div className="text-xs text-slate-500 mb-3">Aşağıdaki mesajlar, tanımlı TG kişilerine gönderilecek. Önce kontrol edin, sonra "Telegram'a Gönder"e basın.</div>{preview.items.length === 0 && <div className="text-slate-500">Bu seçimle gönderilecek kimse yok.</div>}{preview.items.map((it, i) => (<div key={i} className="mb-4">{it.name && <div className="font-bold mb-1">{it.name}</div>}<div className="text-xs text-slate-500 mb-1">Alıcı: {it.to.length ? it.to.map((c) => c.chatId).join(", ") : <span className="text-amber-400">ID tanımlı değil!</span>}</div><pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>{it.msg}</pre></div>))}</Modal>)}
      {result && (<Modal title="Gönderim Sonucu" onClose={() => setResult(null)} footer={<button className={btnP} onClick={() => setResult(null)}>Tamam</button>}>{result.error ? <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-300">{result.error}</div> : <div className="text-sm"><div className="flex items-center gap-2 mb-2"><Check size={18} className="text-emerald-400" /> <b>Gönderildi:</b> {result.sent} mesaj</div>{result.failed > 0 && <div className="text-amber-400">{result.failed} mesaj gönderilemedi (chat ID hatalı olabilir veya kişi botu hiç başlatmamış olabilir).</div>}</div>}</Modal>)}
    </div>
  );
}
/* ============ Raporlar ============ */
function Rapor({ firms, tx, wd, shares, shareTx, expenses, firmBalance }) {
  const [gran, setGran] = useState("gunluk");
  const [st, setSt] = useState({ mode: "son7", day: todayIso() });
  const [firmSel, setFirmSel] = useState("");
  const rg = computeRg(st);
  const fFilter = (arr) => arr.filter((x) => !firmSel || x.firmId === Number(firmSel));
  const dep = fFilter(tx.filter((t) => inRange(t.date, rg))), wdr = fFilter(wd.filter((w) => inRange(w.date, rg)));
  const keyFor = (date) => { if (gran === "aylik") return date.slice(0, 7); if (gran === "haftalik") { const d = new Date(date); const oj = new Date(d.getFullYear(), 0, 1); const wk = Math.ceil((((d - oj) / 86400000) + oj.getDay() + 1) / 7); return `${d.getFullYear()}-H${wk}`; } return date; };
  const chart = useMemo(() => { const m = {}; dep.forEach((t) => { const k = keyFor(t.date); (m[k] = m[k] || { k, yat: 0, cek: 0 }).yat += t.gross; }); wdr.forEach((w) => { const k = keyFor(w.date); (m[k] = m[k] || { k, yat: 0, cek: 0 }).cek += w.gross; }); return Object.values(m).sort((a, b) => a.k.localeCompare(b.k)); }, [dep, wdr, gran]);
  const perFirm = firms.map((f) => { const d = dep.filter((t) => t.firmId === f.id), w = wdr.filter((x) => x.firmId === f.id); return { f, yat: d.reduce((a, t) => a + t.gross, 0), adet: d.length, cek: w.reduce((a, x) => a + x.gross, 0), kom: d.reduce((a, t) => a + t.commission, 0) + w.reduce((a, x) => a + x.commission, 0), bal: firmBalance(f.id) }; }).filter((r) => !firmSel || r.f.id === Number(firmSel));
  const perShare = shares.map((s) => ({ s, pay: shareTx.filter((p) => p.shareId === s.id && p.type === "commission" && inRange(p.date, rg)).reduce((a, p) => a + p.amount, 0) }));
  const tYat = dep.reduce((a, t) => a + t.gross, 0), tCek = wdr.reduce((a, w) => a + w.gross, 0), tNet = wdr.reduce((a, w) => a + w.net, 0), tKom = dep.reduce((a, t) => a + t.commission, 0) + wdr.reduce((a, w) => a + w.commission, 0);
  const tExp = expenses.filter((e) => inRange(e.date, rg)).reduce((a, e) => a + e.amount, 0);
  const selFirm = firmSel ? firms.find((f) => f.id === Number(firmSel)) : null;
  const exportCSV = () => downloadFile("rapor_firma.csv", toCSV(["Firma", "Yatirim", "Adet", "Cekim", "Komisyon", "Kasa"], perFirm.map((r) => [r.f.name, r.yat, r.adet, r.cek, r.kom, r.bal])), "text/csv");
  return (
    <div>
      <Header title="Raporlar" sub={`Aralık: ${rg.label}${selFirm ? " · " + selFirm.name : ""}`}>
        <button className={btnG} onClick={exportCSV}><Download size={14} /> Excel</button>
        <button className={btnG} onClick={() => window.print()}><Download size={14} /> PDF (Yazdır)</button>
        <select className={inputCls} style={{ width: 170 }} value={firmSel} onChange={(e) => setFirmSel(e.target.value)}><option value="">Tüm Firmalar</option>{firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </Header>
      <div className="flex gap-2 flex-wrap mb-3 items-center"><span className="text-xs uppercase text-slate-500 mr-1">Periyot:</span>{[["gunluk", "Günlük"], ["haftalik", "Haftalık"], ["aylik", "Aylık"]].map(([k, l]) => <Chip key={k} on={gran === k} onClick={() => setGran(k)}>{l}</Chip>)}</div>
      <div className="mb-5"><DateFilter st={st} setSt={setSt} /></div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5"><Stat label="Yatırım" value={fmt(tYat)} color="text-emerald-400" /><Stat label="Adet" value={dep.length} /><Stat label="Çekim Brüt" value={fmt(tCek)} color="text-red-400" /><Stat label="Komisyon" value={fmt(tKom)} color="text-amber-400" /><Stat label="Gider" value={fmt(tExp)} color="text-red-400" /><Stat label="Net Kâr" value={fmt(tKom - tExp)} color={tKom - tExp >= 0 ? "text-emerald-400" : "text-red-400"} /></div>
      <div className={card + " p-4 mb-5"} style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="k" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} formatter={(v) => fmt(v)} /><Legend /><Bar dataKey="yat" name="Yatırım" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="cek" name="Çekim" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      {selFirm ? (
        <div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold">{selFirm.name} · Yatırım Detayı ({dep.length})</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Tarih</th><th className="text-right px-4 py-3">Brüt</th><th className="text-right px-4 py-3">Komisyon</th><th className="text-right px-4 py-3">Net</th></tr></thead><tbody>{dep.sort((a, b) => b.ord - a.ord).map((t) => (<tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400">{trDate(t.date)}</td><td className="px-4 py-2.5 text-right font-semibold">{fmt(t.gross)}</td><td className="px-4 py-2.5 text-right text-amber-400">{fmt(t.commission)}</td><td className="px-4 py-2.5 text-right text-emerald-400">{fmt(t.net)}</td></tr>))}{dep.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Kayıt yok</td></tr>}</tbody><tfoot><tr className="border-t border-slate-700 bg-slate-950/40"><td className="px-4 py-3 font-bold">Toplam · Kasa: {fmt(firmBalance(selFirm.id))}</td><td className="px-4 py-3 text-right font-bold">{fmt(tYat)}</td><td className="px-4 py-3 text-right font-bold text-amber-400">{fmt(dep.reduce((a, t) => a + t.commission, 0))}</td><td className="px-4 py-3 text-right font-bold text-emerald-400">{fmt(dep.reduce((a, t) => a + t.net, 0))}</td></tr></tfoot></table></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Table cols={[{ t: "Firma" }, { t: "Yatırım", r: true }, { t: "Adet", r: true }, { t: "Çekim", r: true }, { t: "Komisyon", r: true }, { t: "Kasa", r: true }]}>{perFirm.map((r) => (<tr key={r.f.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 font-semibold">{r.f.name}</td><td className="px-4 py-3 text-right text-emerald-400">{fmt(r.yat)}</td><td className="px-4 py-3 text-right">{r.adet}</td><td className="px-4 py-3 text-right text-red-400">{fmt(r.cek)}</td><td className="px-4 py-3 text-right text-amber-400">{fmt(r.kom)}</td><td className={"px-4 py-3 text-right font-semibold " + (r.bal >= 0 ? "text-slate-200" : "text-red-400")}>{fmt(r.bal)}</td></tr>))}</Table>
          <Table cols={[{ t: "Ortak" }, { t: "Pay Oranı", r: true }, { t: "Dönem Hakedişi", r: true }]}>{perShare.map((r) => (<tr key={r.s.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-3 font-semibold">{r.s.name}</td><td className="px-4 py-3 text-right"><Badge tone="blue">%{r.s.pct}</Badge></td><td className="px-4 py-3 text-right text-purple-400 font-semibold">{fmt(r.pay)}</td></tr>))}</Table>
        </div>
      )}
    </div>
  );
}

/* ============ IT ============ */
function IT({ auditLog, loginLog, errorLog, setAuditLog, setLoginLog, setErrorLog, pushError, trash, restoreTrash, purgeTrash, sessions, closeSession, ipAllow, setIpAllow, sIp, autoBackup, setAutoBackup, snapshot, applySnapshot, bannedIps, setBannedIps }) {
  const [sub, setSub] = useState("islem");
  const [ipInput, setIpInput] = useState("");
  const fileRef = useRef(null);
  const subs = [["islem", "İşlem Logları", Activity], ["giris", "Giriş / IP", MapPin], ["hata", "Hatalar", AlertTriangle], ["oturum", "Oturumlar", Wifi], ["cop", "Çöp Kutusu", RotateCcw], ["yedek", "Yedekleme", Archive], ["guvenlik", "Güvenlik", Lock]];
  const onFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { applySnapshot(JSON.parse(r.result)); alert("Yedek geri yüklendi."); } catch (er) { alert("Geçersiz yedek dosyası: " + er.message); } }; r.readAsText(f); e.target.value = ""; };
  return (
    <div>
      <Header title="IT" sub="Loglar, oturumlar, çöp kutusu, yedek ve güvenlik" />
      <div className="flex gap-2 flex-wrap mb-4">{subs.map(([k, l, Icon]) => <button key={k} onClick={() => setSub(k)} className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition " + (sub === k ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}><Icon size={14} /> {l}</button>)}</div>

      {sub === "islem" && (<div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"><span className="font-bold">İşlem Logları</span><button className={btnG} onClick={() => setAuditLog([])}>Temizle</button></div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Zaman</th><th className="text-left px-4 py-3">Kullanıcı</th><th className="text-left px-4 py-3">İşlem</th><th className="text-left px-4 py-3">Detay</th></tr></thead><tbody>{auditLog.map((a) => (<tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400 text-xs">{trDT(a.at)}</td><td className="px-4 py-2.5 font-semibold">{a.user}</td><td className="px-4 py-2.5"><Badge tone="blue">{a.action}</Badge></td><td className="px-4 py-2.5 text-slate-400">{a.detail}</td></tr>))}{auditLog.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Log yok. Bir işlem yapın.</td></tr>}</tbody></table></div>)}
      {sub === "giris" && (<div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"><span className="font-bold">Giriş ve IP Logları</span><button className={btnG} onClick={() => setLoginLog([])}>Temizle</button></div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Zaman</th><th className="text-left px-4 py-3">Kullanıcı</th><th className="text-left px-4 py-3">Rol</th><th className="text-left px-4 py-3">IP</th></tr></thead><tbody>{loginLog.map((a) => (<tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400 text-xs">{trDT(a.at)}</td><td className="px-4 py-2.5 font-semibold">{a.user}</td><td className="px-4 py-2.5"><Badge tone="purple">{a.role}</Badge></td><td className="px-4 py-2.5 font-mono text-slate-400">{a.ip}</td></tr>))}{loginLog.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Giriş logu yok</td></tr>}</tbody></table></div>)}
      {sub === "hata" && (<div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"><span className="font-bold">Hata Logları</span><div className="flex gap-2"><button className={btnG} onClick={() => pushError("Örnek: ödeme servisi zaman aşımı", "at PaymentService.charge (server.js:142)")}>Örnek Hata</button><button className={btnG} onClick={() => setErrorLog([])}>Temizle</button></div></div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Zaman</th><th className="text-left px-4 py-3">Mesaj</th><th className="text-left px-4 py-3">Konum</th></tr></thead><tbody>{errorLog.map((a) => (<tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400 text-xs">{trDT(a.at)}</td><td className="px-4 py-2.5 text-red-300">{a.message}</td><td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{(a.stack || "").split("\n")[0]}</td></tr>))}{errorLog.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500">Hata yok 🎉</td></tr>}</tbody></table></div>)}
      {sub === "oturum" && (<div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold">Aktif Oturumlar</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Kullanıcı</th><th className="text-left px-4 py-3">Rol</th><th className="text-left px-4 py-3">IP</th><th className="text-left px-4 py-3">Giriş</th><th className="text-right px-4 py-3"></th></tr></thead><tbody>{sessions.map((s) => (<tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 font-semibold">{s.user} {s.current && <Badge tone="green">bu oturum</Badge>}</td><td className="px-4 py-2.5"><Badge tone="purple">{s.role}</Badge></td><td className="px-4 py-2.5 font-mono text-slate-400">{s.ip}</td><td className="px-4 py-2.5 text-slate-400 text-xs">{trDT(s.at)}</td><td className="px-4 py-2.5 text-right"><button className={btnD} onClick={() => closeSession(s.id)}>Oturumu Kapat</button></td></tr>))}{sessions.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Oturum yok</td></tr>}</tbody></table></div>)}
      {sub === "cop" && (<div className={card + " overflow-hidden"}><div className="px-4 py-3 border-b border-slate-800 font-bold">Çöp Kutusu (silinen kayıtlar geri alınabilir)</div><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Silinme</th><th className="text-left px-4 py-3">Kayıt</th><th className="text-left px-4 py-3">Silen</th><th className="text-right px-4 py-3"></th></tr></thead><tbody>{trash.map((t) => (<tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="px-4 py-2.5 text-slate-400 text-xs">{trDT(t.at)}</td><td className="px-4 py-2.5">{t.label}</td><td className="px-4 py-2.5 text-slate-400">{t.by}</td><td className="px-4 py-2.5 text-right whitespace-nowrap"><button className={btnG + " mr-2"} onClick={() => restoreTrash(t.id)}><RotateCcw size={13} /> Geri Al</button><button className="text-red-400 hover:text-red-300" onClick={() => purgeTrash(t.id)}><Trash2 size={15} /></button></td></tr>))}{trash.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Çöp kutusu boş</td></tr>}</tbody></table></div>)}
      {sub === "yedek" && (
        <div className={card + " p-4"}>
          <div className="font-bold mb-3 flex items-center gap-2"><Archive size={16} className="text-blue-400" /> Veri Yedekleme</div>
          <div className="flex gap-2 flex-wrap mb-4"><button className={btnP} onClick={() => downloadFile(`gc-yedek-${todayIso()}.json`, JSON.stringify(snapshot(), null, 2), "application/json")}><Download size={14} /> Yedek Al (indir)</button><button className={btnG} onClick={() => fileRef.current?.click()}><RotateCcw size={14} /> Yedekten Geri Yükle</button><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} /></div>
          <div className="bg-slate-950 rounded-lg p-3 flex items-center gap-3"><button onClick={() => setAutoBackup((b) => ({ ...b, enabled: !b.enabled }))} className={"px-3 py-1.5 rounded-lg text-sm font-semibold " + (autoBackup.enabled ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300")}>{autoBackup.enabled ? "Açık" : "Kapalı"}</button><span className="text-sm text-slate-400">Otomatik günlük yedek · saat</span><input type="time" className={inputCls} style={{ width: 110 }} value={autoBackup.time} onChange={(e) => setAutoBackup((b) => ({ ...b, time: e.target.value }))} /></div>
          <div className="text-xs text-slate-500 mt-2">Gerçek sürümde sunucuda her gün {autoBackup.time}'da otomatik veritabanı yedeği alınır (cron) ve sunucu dışına kopyalanır.</div>
        </div>
      )}
      {sub === "guvenlik" && (
        <div className={card + " p-4"}>
          <div className="font-bold mb-1 flex items-center gap-2"><Lock size={16} className="text-blue-400" /> Güvenlik</div>
          <div className="text-xs text-slate-500 mb-3">Mevcut IP'niz: <span className="font-mono text-slate-300">{sIp}</span> · 5 hatalı girişte 60 sn kilit aktif.</div>
          <div className="flex items-center gap-3 mb-3"><button onClick={() => setIpAllow((s) => ({ ...s, enabled: !s.enabled }))} className={"px-3 py-1.5 rounded-lg text-sm font-semibold " + (ipAllow.enabled ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300")}>{ipAllow.enabled ? "Açık" : "Kapalı"}</button><span className="text-sm text-slate-400">Yönetici IP Allowlist (sadece izinli IP'lerden admin girişi)</span></div>
          <div className="flex gap-2 mb-3"><input className={inputCls} style={{ width: 180 }} placeholder="IP ekle (örn. 88.x.x.x)" value={ipInput} onChange={(e) => setIpInput(e.target.value)} /><button className={btnG} onClick={() => { if (ipInput) { setIpAllow((s) => ({ ...s, ips: [...new Set([...s.ips, ipInput])] })); setIpInput(""); } }}>Ekle</button><button className={btnG} onClick={() => setIpAllow((s) => ({ ...s, ips: [...new Set([...s.ips, sIp])] }))}>Bu IP'yi Ekle</button></div>
          <div className="space-y-1">{ipAllow.ips.map((ip) => (<div key={ip} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 text-sm"><span className="font-mono">{ip}</span><button className="text-red-400 hover:text-red-300" onClick={() => setIpAllow((s) => ({ ...s, ips: s.ips.filter((x) => x !== ip) }))}><Trash2 size={13} /></button></div>))}{ipAllow.ips.length === 0 && <div className="text-slate-500 text-sm">İzinli IP yok. (Açıkken liste boşsa admin girişi engellenir; önce bu IP'yi ekleyin.)</div>}</div>
          <div className="border-t border-slate-800 mt-4 pt-4">
            <div className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={15} className="text-red-400" /> Banlanan IP'ler</div>
            <div className="text-xs text-slate-500 mb-2">5 hatalı girişte IP otomatik banlanır. Hangi hesapta denendiği görünür; istediğini kaldırabilirsin.</div>
            {bannedIps.length === 0 ? <div className="text-slate-500 text-sm">Banlı IP yok.</div> : (
              <div className="border border-slate-800 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-3 py-2">IP</th><th className="text-left px-3 py-2">Denenen Hesap</th><th className="text-left px-3 py-2">Zaman</th><th className="text-right px-3 py-2">Kaldır</th></tr></thead><tbody>{bannedIps.map((b) => (<tr key={b.id} className="border-t border-slate-800"><td className="px-3 py-2 font-mono text-red-300">{b.ip}</td><td className="px-3 py-2 font-semibold">{b.username}</td><td className="px-3 py-2 text-slate-400 text-xs">{trDT(b.at)}</td><td className="px-3 py-2 text-right"><button className={btnG} onClick={() => setBannedIps((arr) => arr.filter((x) => x.id !== b.id))}>Banı Kaldır</button></td></tr>))}</tbody></table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Yonetim ============ */
function Yonetim({ users, addUser, updateUser, currentUserId, firms, setFirms, delFirm, delUser, addAdjust, firmBalance, pushAudit, diffDetail }) {
  const [userModal, setUserModal] = useState(null);
  const [firmModal, setFirmModal] = useState(null);
  const [adj, setAdj] = useState(null);
  const roleLabel = { patron: "Patron", yonetici: "Yönetici", owner: "Firma Sahibi", employee: "Çalışan" };
  return (
    <div>
      <Header title="Yönetim Paneli" sub="Firma, panel, yetki ve güvenlik" />
      <div className={card + " overflow-hidden mb-5"}>
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"><span className="font-bold flex items-center gap-2"><Building2 size={16} className="text-blue-400" /> Firma Panelleri</span><button className={btnP} onClick={() => setFirmModal("new")}><Plus size={14} /> Firma Oluştur</button></div>
        <table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Firma</th><th className="text-right px-4 py-3">Yat. Kom.</th><th className="text-right px-4 py-3">Çek. Kom.</th><th className="text-right px-4 py-3">Kasa</th><th className="text-center px-4 py-3">Kasa İşlem</th><th className="text-right px-4 py-3">Yönet</th></tr></thead>
          <tbody>{firms.map((f) => (<tr key={f.id} className="border-t border-slate-800 hover:bg-slate-800/40" style={{ opacity: f.active ? 1 : 0.5 }}><td className="px-4 py-3 font-semibold">{f.name} {!f.active && <Badge tone="amber">Pasif</Badge>}</td><td className="px-4 py-3 text-right">%{f.rate}</td><td className="px-4 py-3 text-right">%{f.wrate}</td><td className={"px-4 py-3 text-right font-semibold " + (firmBalance(f.id) >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(firmBalance(f.id))}</td><td className="px-4 py-3 text-center whitespace-nowrap"><button className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 mr-1" title="Komisyonsuz para ekle" onClick={() => setAdj({ firm: f, sign: 1 })}><Plus size={15} /></button><button className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25" title="Komisyonsuz para çıkar" onClick={() => setAdj({ firm: f, sign: -1 })}><MinusCircle size={15} /></button></td><td className="px-4 py-3 text-right whitespace-nowrap"><button className="text-blue-400 hover:text-blue-300 mr-3" onClick={() => setFirmModal(f)}><Edit2 size={15} /></button><button className="text-red-400 hover:text-red-300" onClick={() => delFirm(f)}><Trash2 size={15} /></button></td></tr>))}</tbody>
        </table>
      </div>
      <div className={card + " overflow-hidden"}>
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"><span className="font-bold flex items-center gap-2"><Users size={16} className="text-purple-400" /> Kullanıcı Panelleri</span><button className={btnP} onClick={() => setUserModal("new")}><Plus size={14} /> Panel Oluştur</button></div>
        <table className="w-full text-sm"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-950/40"><th className="text-left px-4 py-3">Kullanıcı</th><th className="text-left px-4 py-3">Rol</th><th className="text-left px-4 py-3">Firmalar</th><th className="text-center px-4 py-3">2FA</th><th className="text-center px-4 py-3">Durum</th><th className="text-right px-4 py-3">Yönet</th></tr></thead>
          <tbody>{users.map((u) => (<tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/40" style={{ opacity: u.active ? 1 : 0.5 }}><td className="px-4 py-3 font-semibold">{u.username}</td><td className="px-4 py-3"><Badge tone="blue">{roleLabel[u.role]}</Badge></td><td className="px-4 py-3 text-slate-400">{u.role === "owner" ? (u.firmIds.map((id) => firms.find((f) => f.id === id)?.name).filter(Boolean).join(", ") || "—") : "—"}</td><td className="px-4 py-3 text-center">{u.twofa ? <Badge tone="green">Açık</Badge> : <Badge tone="slate">Kapalı</Badge>}</td><td className="px-4 py-3 text-center">{u.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="amber">Pasif</Badge>}</td><td className="px-4 py-3 text-right whitespace-nowrap"><button className="text-blue-400 hover:text-blue-300 mr-3" onClick={() => setUserModal(u)}><Edit2 size={15} /></button>{u.role !== "patron" && u.id !== currentUserId && <button className="text-red-400 hover:text-red-300" onClick={() => delUser(u)}><Trash2 size={15} /></button>}</td></tr>))}</tbody>
        </table>
        <div className="text-xs text-slate-500 px-4 py-2.5 border-t border-slate-800">Düzenle: kullanıcı adı/şifre, 2FA (QR), pasife alma, firma ekleme/çıkarma. Çalışan komisyonları göremez.</div>
      </div>
      {firmModal && <FirmModal firm={firmModal === "new" ? null : firmModal} onClose={() => setFirmModal(null)} onSave={(d) => { if (firmModal === "new") { setFirms((fs) => [...fs, { id: nid(), name: d.name, rate: Number(d.rate) || 0, wrate: Number(d.wrate) || 0, limit: Number(d.limit) || 0, active: true }]); pushAudit("Firma oluşturuldu", d.name); } else { const o = firmModal; setFirms((fs) => fs.map((x) => x.id === firmModal.id ? { ...x, name: d.name, rate: Number(d.rate) || 0, wrate: Number(d.wrate) || 0, limit: Number(d.limit) || 0 } : x)); pushAudit("Firma düzenlendi", diffDetail([["Ad", o.name, d.name], ["Yat.Kom", "%" + o.rate, "%" + (Number(d.rate) || 0)], ["Çek.Kom", "%" + o.wrate, "%" + (Number(d.wrate) || 0)], ["Eşik", o.limit ?? 0, Number(d.limit) || 0]])); } setFirmModal(null); }} />}
      {userModal && <UserModal user={userModal === "new" ? null : userModal} firms={firms} onClose={() => setUserModal(null)} onSave={async (d) => { if (userModal === "new") await addUser(d); else await updateUser(userModal.id, d); }} />}
      {adj && <AdjustModal firm={adj.firm} sign={adj.sign} onClose={() => setAdj(null)} onSave={(d) => { addAdjust({ firmId: adj.firm.id, amount: adj.sign * Math.abs(Number(d.amount)), date: d.date, note: d.note }); setAdj(null); }} />}
    </div>
  );
}
function AdjustModal({ firm, sign, onClose, onSave }) {
  const [amount, setAmount] = useState(""); const [date, setDate] = useState(todayIso()); const [note, setNote] = useState("");
  return (<Modal title={`${firm.name} — Kasa ${sign > 0 ? "Para Ekle (+)" : "Para Çıkar (−)"}`} onClose={onClose} footer={<><button className={btnG} onClick={onClose}>İptal</button><button className={btnP} onClick={() => { if (!Number(amount)) return; onSave({ amount, date, note }); }}>Uygula</button></>}><div className="text-xs text-slate-500 mb-3">Komisyonsuz; doğrudan kasaya işlenir.</div><Field label="Tutar"><input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field><Field label="Tarih"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Açıklama"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field></Modal>);
}
function FirmModal({ firm, onClose, onSave }) {
  const [name, setName] = useState(firm?.name || ""); const [rate, setRate] = useState(firm?.rate ?? ""); const [wrate, setWrate] = useState(firm?.wrate ?? ""); const [limit, setLimit] = useState(firm?.limit ?? 0);
  return (<Modal title={firm ? "Firma Düzenle" : "Firma Oluştur"} onClose={onClose} footer={<><button className={btnG} onClick={onClose}>İptal</button><button className={btnP} onClick={() => { if (!name) return; onSave({ name, rate, wrate, limit }); }}>Kaydet</button></>}><Field label="Firma Adı"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field><Field label="Yatırım Komisyon Oranı (%)"><input className={inputCls} type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="örn. 10" /></Field><Field label="Çekim Komisyon Oranı (%)"><input className={inputCls} type="number" value={wrate} onChange={(e) => setWrate(e.target.value)} placeholder="örn. 5" /></Field><Field label="Bakiye Uyarı Eşiği (kasa bu tutarın altına inerse uyarı)"><input className={inputCls} type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="örn. -5000 (eksi 5.000₺ altı)" /></Field></Modal>);
}
function UserModal({ user, firms, onClose, onSave }) {
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "owner");
  const [firmIds, setFirmIds] = useState(user?.firmIds || []);
  const [active, setActive] = useState(user?.active ?? true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setFirmIds((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const isPatron = user?.role === "patron";
  const save = async () => {
    setErr("");
    if (!username) { setErr("Kullanıcı adı gerekli."); return; }
    if (!user && !password) { setErr("Yeni kullanıcı için şifre gerekli."); return; }
    setBusy(true);
    try { await onSave({ username, password, role: isPatron ? "patron" : role, firmIds: role === "owner" ? firmIds : [], active }); onClose(); }
    catch (e) { setErr(e.message || "Kaydedilemedi."); }
    setBusy(false);
  };
  return (
    <Modal title={user ? "Kullanıcı Düzenle" : "Kullanıcı Oluştur"} onClose={onClose} wide footer={<><button className={btnG} onClick={onClose}>İptal</button><button className={btnP} onClick={save} disabled={busy}>{busy ? "..." : "Kaydet"}</button></>}>
      {err && <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 text-sm text-red-300 mb-3">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div>
          <Field label="Kullanıcı Adı"><input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></Field>
          <Field label={user ? "Şifre (boş = değişmez)" : "Şifre"}><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user ? "değiştirmek için yaz" : "şifre belirle"} /></Field>
          {!isPatron && <Field label="Rol"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}><option value="owner">Firma Sahibi</option><option value="employee">Çalışan (komisyon gizli)</option><option value="yonetici">Yönetici (tüm yetkiler)</option></select></Field>}
          <div className="flex items-center gap-3 mb-3"><button onClick={() => setActive((v) => !v)} className={"px-3 py-1.5 rounded-lg text-sm font-semibold " + (active ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300")}>{active ? "Aktif" : "Pasif"}</button><span className="text-xs text-slate-500">Pasif kullanıcı giriş yapamaz</span></div>
          {role === "owner" && (<Field label="Görebileceği Firmalar (çoklu)"><div className="space-y-1">{firms.map((f) => (<button key={f.id} onClick={() => toggle(f.id)} className={"w-full flex items-center justify-between px-3 py-2 rounded-lg border transition " + (firmIds.includes(f.id) ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-600")}><span>{f.name}</span>{firmIds.includes(f.id) && <Check size={15} className="text-blue-400" />}</button>))}</div></Field>)}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1.5">İki Adımlı Doğrulama (2FA)</div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><Shield size={16} className={user?.twofa ? "text-emerald-400" : "text-slate-400"} />{user?.twofa ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Kapalı</Badge>}</div>
            <p className="text-xs text-slate-500 leading-relaxed">2FA'yı her kullanıcı kendi hesabıyla giriş yaptıktan sonra sol alttaki <b>"Güvenlik (2FA)"</b> menüsünden açar. Güvenlik gereği yöneticiler başka kullanıcı adına 2FA kuramaz; buradan yalnızca durumu görüntülenir.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
