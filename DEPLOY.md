# Panduan Deployment: BIPAL Publik

BIPAL Publik adalah situs web statis murni (pure static site) tanpa server Node.js dan tanpa tahap kompilasi/build. Proyek ini membaca data langsung dari Supabase REST API menggunakan `SUPABASE_ANON_KEY`.

---

## 1. Cloudflare Pages (Rekomendasi Utama)

Cloudflare Pages menyediakan hosting statis global berkecepatan tinggi dengan edge caching gratis.

### Langkah Deploy:
1. Masuk ke dashboard [Cloudflare](https://dash.cloudflare.com/) → navigasi ke **Workers & Pages** → **Create application** → pilih tab **Pages**.
2. Pilih **Connect to Git** dan hubungkan ke repository `bipal-publik`.
3. Pada halaman **Set up builds and deployments**:
   - **Project name:** `visual-bipal` (atau `bipal-publik`)
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Tambahkan variabel lingkungan di bagian **Environment variables** / **Build variables**:
   - `SUPABASE_URL`: `https://<id-proyek-supabase-anda>.supabase.co`
   - `SUPABASE_ANON_KEY`: `<kunci-anon-supabase-anda>`
5. Skrip `build-env.mjs` akan membaca Environment Variables tersebut, memperbarui `assets/js/config.js`, dan menyiapkan folder bersih `dist/` untuk dideploy oleh Cloudflare.

---

## 2. Netlify (Opsi Alternatif)

1. Masuk ke [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Pilih repository `bipal-publik`.
3. Konfigurasi build:
   - **Build command:** *(Kosong)*
   - **Publish directory:** `.`
4. Klik **Deploy site**.
5. File `netlify.toml` sudah tersedia di repositori untuk mengonfigurasi header CSP secara otomatis.

---

## 3. GitHub Pages (Opsi Fallback)

1. Buka repository di GitHub → **Settings** → **Pages**.
2. Pada **Build and deployment** > **Source**, pilih **Deploy from a branch**.
3. Pilih branch `main` dan folder `/ (root)`.
4. Klik **Save**.

---

## 4. Catatan Teknis & Optimasi Supabase Free Tier

> [!IMPORTANT]
> **SPA Hash Routing:**
> Navigasi aplikasi menggunakan URL hash (misalnya `#/ringkasan`, `#/direktori`, `#/kabkota/Gowa`). Oleh karena itu, hosting statis tidak memerlukan konfigurasi URL rewrite atau fallback 404 khusus.

> [!TIP]
> **Batas Kuota Supabase Free Tier:**
> - **Egress:** 5 GB / bulan.
> - **Database Storage:** 500 MB.
> - **File Storage (Bucket):** 1 GB.
> - **Inactivity Pause:** Proyek Supabase pada free tier akan di-pause jika tidak ada aktivitas selama 7 hari berturut-turut. Lakukan akses berkala atau integrasikan ping mingguan bila diperlukan.
>
> **Rekomendasi Optimasi Foto:**
> - Pastikan foto profil yang diunggah ke bucket `public-photos` sudah dikompresi ke format WebP dengan ukuran file **≤ 100 KB** per foto.
> - Ini memastikan kuota egress 5 GB dapat melayani hingga lebih dari 50.000 tampilan halaman per bulan secara gratis dan cepat.
