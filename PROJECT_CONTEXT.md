# PROJECT CONTEXT - POST App (POS System for Lumé)

## 📌 Informasi Dasar
- **Nama Proyek**: Sayq Pos App
- **Bisnis**: Lumé (minuman) & DURAL (galon air)
- **Owner**: Hamdallah
- **Tujuan**: Web-based POS multi-branch dengan role-based access

## 🛠 Teknologi
- **Frontend**: React + TypeScript + Tailwind + Shadcn/UI
- **Backend**: Node.js + Express + Drizzle ORM
- **Database**: PostgreSQL (Neon.tech)
- **Auth**: Passport.js (session cookie)
- **Monorepo**: pnpm workspaces

## 📁 Struktur Folder
- `artifacts/pos-app/src/pages/` → Halaman React (cashier, products, inventory)
- `artifacts/api-server/src/routes/` → Endpoint API
- `lib/db/src/schema/` → Definisi tabel database

## 🔄 Alur Bisnis Utama
1. Produksi setengah jadi → input hasil timbangan (gram/ml) → kurangi bahan baku → tambah stok setengah jadi
2. Produk → punya varian harga, BOM dari setengah jadi
3. Kasir → mulai shift (modal awal) → transaksi kurangi stok setengah jadi & bahan baku → tutup shift
4. Stok disimpan di `current_inventory`

## 🤖 Rules for AI Agent
- Berikan analisis singkat, padat, jelas.
- Jika akan mengubah file, minta persetujuan dulu.
- Gunakan tool `github_read_file` untuk membaca file.
