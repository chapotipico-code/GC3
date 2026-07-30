// İlk kurulum: tabloları oluştur, patron hesabını ve boş veri belgesini hazırla.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const db = require("./db");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(schema);
  console.log("Tablolar hazır.");

  const user = process.env.PATRON_USER || "patron";
  const pass = process.env.PATRON_PASS || "Mahmut48";

  const exists = await db.query("SELECT id FROM users WHERE username=$1", [user]);
  if (exists.rows.length === 0) {
    const hash = await bcrypt.hash(pass, 10);
    await db.query(
      "INSERT INTO users(username, password_hash, role) VALUES ($1,$2,'patron')",
      [user, hash]
    );
    console.log(`Patron hesabı oluşturuldu: ${user}`);
  } else {
    console.log("Patron hesabı zaten var, atlandı.");
  }

  await db.query("INSERT INTO app_state(id, data, version) VALUES (1, '{}', 0) ON CONFLICT (id) DO NOTHING");
  console.log("Veri belgesi hazır.");

  console.log("Seed tamamlandı.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed hatası:", e);
  process.exit(1);
});
