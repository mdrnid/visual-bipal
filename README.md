# BIPAL Publik — Biodata Pengawas Pemilu (Read-Only)

Situs web statis murni (*pure static site*) untuk publikasi profil personel pengawas pemilu di lingkungan Badan Pengawas Pemilihan Umum (Bawaslu) Provinsi Sulawesi Selatan.

Proyek ini merupakan turunan *read-only* dari sistem manajemen internal BIPAL yang dirancang khusus untuk keterbukaan informasi publik dengan jaminan perlindungan data pribadi (Zero PII Leakage).

---

## Fitur Utama

1. **Sinkronisasi Langsung (Live Data):** Membaca data langsung dari Supabase REST API schema `api` (`personnel_public`) menggunakan `SUPABASE_ANON_KEY`.
2. **Navigasi 2 Tingkat (Direktori):**
   - **Level 1:** Kartu Kabupaten / Kota menampilkan total pengawas di masing-masing wilayah.
   - **Level 2:** Daftar personel lengkap per Kabupaten / Kota hanya dengan 4 data publik resmi: **Foto Profil**, **Nama Lengkap**, **Jabatan**, dan **Asal Wilayah**.
3. **URL Hash Routing:** URL dapat dibagikan dan tahan terhadap reload halaman (misal `#/kabkota/Makassar`, `#/kabkota/Gowa`).
4. **Visualisasi Data Ringkas:** Statistik agregasi sebaran personel per wilayah dan komposisi jabatan.
5. **Kemandirian Penuh & Zero Build:** Tanpa Node.js runtime, tanpa build step (Webpack/Vite), dan Chart.js di-host secara lokal.
6. **Keamanan Maksimal:**
   - Content Security Policy (CSP) ketat tanpa `unsafe-inline` untuk skrip.
   - Tanpa secret key (`SERVICE_ROLE_KEY`), login, endpoint tulis, atau formulir edit.

---

## Struktur Berkas

```
bipal-publik/
├── index.html                  # Halaman utama aplikasi (Ringkasan & Direktori 2 Level)
├── landing.html                # Halaman depan pengenalan BIPAL Publik
├── landing.css                 # Gaya visual landing page
├── config.js                   # Konfigurasi Supabase URL & Anon Key publik
├── _headers                    # Konfigurasi keamanan Cloudflare Pages (CSP & security headers)
├── netlify.toml                # Konfigurasi keamanan alternatif Netlify
├── DEPLOY.md                   # Panduan deployment (Cloudflare Pages, Netlify, GitHub Pages)
├── README.md                   # Dokumentasi proyek
├── .gitignore                  # Blokir aset lokal & data rahasia
├── assets/
│   ├── css/
│   │   └── styles.css          # Desain sistem dan styling komponen antarmuka
│   ├── image/
│   │   ├── bawaslu.png         # Logo Bawaslu
│   │   ├── logo-bawaslu.webp   # Logo Bawaslu teroptimasi WebP
│   │   └── magang.jpeg         # Foto tim pengembang magang
│   ├── vendor/
│   │   └── chart.umd.min.js    # Pustaka Chart.js lokal (bebas dependensi CDN)
│   └── js/
│       ├── config.js           # Konfigurasi modul JS
│       ├── text-utils.js       # Sanitasi teks, pembersihan gelar, inisial avatar
│       ├── supabase-public.js  # Lapisan komunikasi data Supabase REST API & caching
│       ├── analytics.js        # Fungsi agregasi statistik publik
│       ├── charts.js           # Pembungkus visualisasi grafik lokal
│       ├── ui.js               # Render komponen DOM (Level 1, Level 2, Drawer)
│       ├── app.js              # Logika aplikasi dan hash routing
│       └── landing.js          # Inisialisasi statistik live landing page
└── docs/
    └── SUPABASE_SETUP.md       # Panduan checklist & SQL bagi administrator database
```

---

## Menjalankan Secara Lokal

Karena proyek ini merupakan situs statis murni berbasis ES Modules, Anda cukup menjalankan server web statis lokal apa pun tanpa perlu menginstal dependensi npm:

### Menggunakan Python (Tersedia secara bawaan):
```bash
# Jalankan di dalam folder bipal-publik
python -m http.server 8081
```
Buka peramban di `http://localhost:8081`.

### Menggunakan VS Code Live Server:
Cukup klik kanan pada `index.html` atau `landing.html` → **Open with Live Server**.

---

## Privasi & Keamanan (Zero PII)

Situs ini secara tegas **TIDAK PERNAH** memuat, memproses, atau menampilkan kolom sensitif, termasuk:
- Nomor telepon / WhatsApp
- Alamat email pribadi / kantor
- Agama
- Pendidikan
- Alamat rumah / kantor
- Akhir masa jabatan (AMJ)
- Dokumen penghargaan & sertifikat
- Seluruh data internal lainnya

Semua query dibatasi secara ketat pada:
`select=id,name,position,district,photo_path`

---

## Pengembang & Lisensi

Dikembangkan oleh **Tim Magang Bawaslu Sulsel 2026**
- Muh. Daryadnan Yurisky Musakkar (Kontak: 082187671753)
- Bawaslu Provinsi Sulawesi Selatan
