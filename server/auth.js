const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "degistir";

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Oturum yok" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş" });
  }
}

// Sadece patron/yönetici erişebilsin
function adminOnly(req, res, next) {
  if (!req.user || !["patron", "yonetici"].includes(req.user.role)) {
    return res.status(403).json({ error: "Yetki yok" });
  }
  next();
}

module.exports = { sign, auth, adminOnly, SECRET };
