# Panduan Checklist & SQL Supabase untuk Administrator

Dokumen ini berisi panduan teknis bagi administrator basis data Bawaslu untuk mengelola dan mempublikasikan data ke situs publik **BIPAL Publik**.

> [!CAUTION]
> **PERHATIAN ADMINISTRATOR:**
> Jangan menjalankan perintah SQL pembaruan massal (*bulk update*) di bawah ini tanpa konfirmasi dan verifikasi terhadap data yang berhak dipublikasikan ke ranah umum.

---

## Checklist Pengaturan Data Publik

- [ ] **Langkah 1: Menandai Data yang Boleh Dipublikasikan**
- [ ] **Langkah 2: Sinkronisasi Berkas Foto ke Bucket Publik**
- [ ] **Langkah 3: Pengerasan Hak Akses Anon Key (Rekomendasi Keamanan)**
- [ ] **Langkah 4 (Opsional): Pembuatan View Agregat Tambahan**

---

### Langkah 1: Publikasi Data Personel

Hanya personel yang memiliki flag `is_published = true` yang akan muncul pada view publik `api.personnel_public`.

#### Opsi A: Publikasikan Seluruh Personel Aktif Sekaligus (Bulk)
```sql
UPDATE api.personnel
   SET is_published = true,
       photo_is_public = true
 WHERE deleted_at IS NULL;
```

#### Opsi B: Publikasikan Secara Selektif per Kabupaten / Kota (Disarankan)
Jika ingin mempublikasikan bertahap berdasarkan wilayah yang telah terverifikasi:
```sql
-- Contoh hanya mempublikasikan untuk Kota Makassar dan Kabupaten Gowa:
UPDATE api.personnel
   SET is_published = true,
       photo_is_public = true
 WHERE district IN ('Kota Makassar', 'Gowa')
   AND deleted_at IS NULL;
```

---

### Langkah 2: Sinkronisasi Foto ke Bucket Publik

Agar foto personel dapat diakses oleh publik melalui URL Supabase Storage:
1. Buka terminal di direktori proyek utama BIPAL admin.
2. Jalankan skrip sinkronisasi foto publik:
   ```bash
   node scripts/sync-public-photos.mjs
   ```
3. Skrip ini akan mengunggah berkas foto ke bucket `public-photos` dengan format path `personnel/<uuid>/profile.webp` dan memperbarui kolom `photo_object_path` pada tabel `api.personnel`.

---

### Langkah 3: Pengerasan Hak Akses Anon Key (Hardening)

Untuk memastikan pengguna publik sama sekali tidak dapat mengakses tabel dasar secara langsung (bahkan jika mencoba query via REST API postgREST), cabut akses SELECT dari tabel dasar dan batasi secara eksklusif hanya ke view proyeksi publik:

```sql
-- 1. Cabut akses SELECT ke tabel dasar
REVOKE SELECT ON api.personnel, api.awards FROM anon;

-- 2. Pastikan akses SELECT hanya diberikan ke view publik
GRANT SELECT ON api.personnel_public, api.awards_public TO anon;

-- 3. Verifikasi skema API tetap dapat digunakan
GRANT USAGE ON SCHEMA api TO anon;
```

*Catatan: Aplikasi manajemen admin menggunakan `service_role`, sehingga operasi tulis, edit, dan akses data lengkap internal di dashboard admin tetap berjalan normal tanpa terpengaruh oleh pembatasan hak akses `anon` di atas.*

---

### Langkah 4 (Opsional): View Agregat Tanpa Baris Individual

Jika di masa mendatang ingin menampilkan statistik tertentu (seperti komposisi agama atau jenjang pendidikan) di situs publik tanpa pernah mengekspos baris data pribadi individual, buat view agregasi terpisah:

```sql
CREATE OR REPLACE VIEW api.personnel_stats_public WITH (security_invoker = false) AS
  SELECT 'education' AS dimension, education AS bucket, COUNT(*)::int AS total
    FROM api.personnel
   WHERE is_published = true AND deleted_at IS NULL AND education IS NOT NULL
   GROUP BY education
  UNION ALL
  SELECT 'religion' AS dimension, religion AS bucket, COUNT(*)::int AS total
    FROM api.personnel
   WHERE is_published = true AND deleted_at IS NULL AND religion IS NOT NULL
   GROUP BY religion;

-- Berikan izin akses baca ke role anon
GRANT SELECT ON api.personnel_stats_public TO anon;
```
