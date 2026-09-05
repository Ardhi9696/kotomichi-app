# Setup — Kotomichi App

Project web bahasa Jepang berbasis Next.js 16 + React 19 + TypeScript, dengan
Drizzle ORM (Postgres), Supabase Auth, dan next-intl.

## 1. Prasyarat

- Node.js **18.18+** (disarankan 20+)
- npm (bundle manager utama; tersedia `package-lock.json`)
- Akun [Supabase](https://supabase.com) (untuk auth prod — opsional)
- Penyedia Postgres (Supabase / Neon / RDS / RDS lokal) — opsional

## 2. Install dependency

```bash
npm install
```

## 3. Konfigurasi environment

Salin contoh env lalu isi. Semua var opsional kecuali dicatat:

```bash
cp .env.example .env.local   # (sekali .env.example dibuat, lihat di bawah)
```

### Variabel yang dibutuhkan

| Variabel | Wajib? | Fungsi |
|---|---|---|
| `DATABASE_URL` | Opsional | Koneksi Postgres (Drizzle). Jika kosong → in-memory adapter |
| `SUPABASE_URL` | Opsional | URL project Supabase (Auth) |
| `SUPABASE_ANON_KEY` | Opsional | Anon key Supabase (Auth) |

### Mode

- **Tanpa env apa pun** → berjalan dengan adapter **in-memory** + **auth demo**
  (cocok untuk dev cepat / demo).
- `DATABASE_URL` terisi → pakai Postgres (Drizzle).
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` terisi → pakai Supabase Auth.

Catatan: file `.env.example` belum ada di repo. Buat sendiri:

```bash
cat > .env.local <<'EOF'
# Postgres (opsional; kosongkan untuk mode in-memory)
DATABASE_URL=

# Supabase Auth (opsional; kosongkan untuk auth demo)
SUPABASE_URL=
SUPABASE_ANON_KEY=
EOF
```

## 4. Database

### Supabase Postgres (opsional)

1. Buat project di Supabase.
2. Buka **SQL Editor** → jalankan isi `kotomichi_schema.sql` untuk membuat skema.
3. Salin connection string ke `DATABASE_URL`. Gunakan mis. format
   `postgresql://...:...@db.<ref>.supabase.co:5432/postgres?sslmode=require`
   (Supabase 2025+ biasanya butuh `?sslmode=require`).

### Mode in-memory (tanpa DB)

Tidak perlu setup. Data disimpan di memori dan ter-seed otomatis, tapi **hilang
saat server restart** — hanya untuk dev/demo.

## 5. Akun demo (mode in-memory)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kotomichi.app` | `demo-admin` |
| Learner | `demo@kotomichi.app` | `demo` |

(Definisi ada di `src/lib/adapters/inmemory/auth.ts`.)

## 6. Menjalankan app

```bash
npm run dev          # development server → http://localhost:3000
npm run build        # production build
npm run start        # jalankan hasil build
npm run lint         # lint (eslint)
```

## 7. Testing

Menggunakan Vitest:

```bash
npx vitest            # jalankan semua test (watch)
npx vitest run        # jalankan sekali tanpa watch
```

## 8. i18n

Menggunakan `next-intl` dengan locale `en` dan `id` (default). Pesan ada di
`src/i18n/messages/*.json`. Routing via `src/i18n/routing.ts`.

## 9. Catatan

- Dukungan S3/R2 untuk penyimpanan audio disebut di `src/lib/ports/storage-port.ts`,
  namun adapter penyimpanannya belum dipasang — belum perlu konfigurasi ekstra.
- Projekt terindex Next.js versi khusus (`next@16.3.4`); baca panduan di
  `node_modules/next/dist/docs/` sebelum menulis kode Next.js.
