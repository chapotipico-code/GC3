# GC Sistem — Çok Kullanıcılı (Sunucu + Veritabanı) Sürüm

Bu sürümde veriler **sunucudaki PostgreSQL veritabanında** tutulur. Kim nereden
girerse girsin **aynı veriyi** görür. Giriş gerçektir (şifreler bcrypt ile saklanır,
oturum JWT ile yürür). 2FA isteğe bağlıdır (varsayılan kapalı) ve "bu tarayıcıda
hatırla" desteği vardır.

## Yapı
- `server/` — Node/Express API + PostgreSQL (PM2 ile çalışır, port 3001)
- `app/` — React arayüz (Vite ile derlenir, `app/dist` oluşur; backend bu klasörü servis eder)

Akış: nginx (port 80) → Node backend (port 3001). Backend hem `/api/*` uçlarını
karşılar hem de derlenmiş arayüzü (`app/dist`) servis eder.

---

## Sunucu Kurulumu (216.126.227.113)

> Aşağıdaki adımlar Claude ile birlikte tek tek uygulanacaktır. Özet olarak:

### 1) PostgreSQL kur
```bash
apt update && apt install -y postgresql
```

### 2) Veritabanı ve kullanıcı oluştur
```bash
sudo -u postgres psql -c "CREATE USER gc_user WITH PASSWORD 'BURAYA_GUCLU_SIFRE';"
sudo -u postgres psql -c "CREATE DATABASE gc_db OWNER gc_user;"
```

### 3) Kodu çek
```bash
cd /var/www
git clone https://github.com/KULLANICI/REPO.git GC2
cd GC2
```

### 4) Arayüzü derle
```bash
cd app
npm install
npm run build
cd ..
```

### 5) Backend'i hazırla
```bash
cd server
npm install
cp .env.example .env
nano .env     # DATABASE_URL içindeki şifreyi ve JWT_SECRET'i ayarla
node seed.js  # tabloları kurar + patron hesabını oluşturur
```

`.env` örneği:
```
DATABASE_URL=postgres://gc_user:BURAYA_GUCLU_SIFRE@localhost:5432/gc_db
JWT_SECRET=cok-uzun-rastgele-bir-metin
PORT=3001
PATRON_USER=patron
PATRON_PASS=Mahmut48
```

### 6) PM2 ile sürekli çalıştır
```bash
npm install -g pm2
pm2 start index.js --name gc
pm2 save
pm2 startup    # çıkan komutu kopyalayıp çalıştır (yeniden başlatmada otomatik açılır)
```

### 7) nginx'i backend'e yönlendir
`/etc/nginx/sites-available/gc` içeriğini şu şekilde değiştir:
```nginx
server {
    listen 80;
    server_name 216.126.227.113;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Sonra:
```bash
nginx -t && systemctl restart nginx
```

Tarayıcı: **http://216.126.227.113** → **patron / Mahmut48**

---

## Güncelleme (yeni özellik geldiğinde)
```bash
cd /var/www/GC2
git pull
cd app && npm install && npm run build && cd ..
cd server && npm install && pm2 restart gc
```

## Yedekleme (veritabanı)
```bash
sudo -u postgres pg_dump gc_db > /root/gc_yedek_$(date +%F).sql
```

---

## API uçları (özet)
- `POST /api/login` `{username,password,code?,remember?,deviceToken?}` → `{token,user}` veya `{twofaRequired:true}`
- `GET  /api/me` → oturum sahibi
- `GET  /api/state` → `{data,version}` (tüm iş verisi)
- `PUT  /api/state` `{data,baseVersion}` → `{version}` ya da 409 (çakışma → en güncel veri döner)
- `POST /api/2fa/setup` · `POST /api/2fa/enable {code}` · `POST /api/2fa/disable`

## Notlar
- Şu an giriş sadece **patron** hesabı içindir (sen). Çalışan/alt kullanıcı girişleri
  bir sonraki aşamada eklenecektir.
- Aynı saniyede iki kişi aynı veriyi değiştirirse, ikinci kişi "veri güncellendi"
  uyarısı alır ve ekranı en güncel haliyle yenilenir (sessiz veri kaybı olmaz).
