-- GC Sistem veritabanı şeması

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'patron',
  firm_ids      JSONB NOT NULL DEFAULT '[]',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  twofa_secret  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tüm iş verisi tek JSONB belge + sürüm (eşzamanlı düzenleme koruması)
CREATE TABLE IF NOT EXISTS app_state (
  id         INT PRIMARY KEY DEFAULT 1,
  data       JSONB NOT NULL DEFAULT '{}',
  version    INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Bu tarayıcıda hatırla" için güvenilir cihaz jetonları
CREATE TABLE IF NOT EXISTS trusted_devices (
  token_hash TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
