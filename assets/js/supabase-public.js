/**
 * Lapisan Data Publik Supabase (Read-Only)
 * Menggunakan SUPABASE_ANON_KEY dengan schema 'api' (view personnel_public).
 * Zero PII, zero secret.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_CONFIG } from './config.js';

const CACHE_KEY = (APP_CONFIG.cacheKey || 'bipal_publik_cache') + '_v3';
const CACHE_TTL_MS = (APP_CONFIG.cacheTtlMinutes || 5) * 60 * 1000;

/**
 * Menghasilkan URL publik foto dari bucket storage public-photos
 * @param {string|null} photoPath 
 * @returns {string|null}
 */
export function photoUrl(photoPath) {
    if (!photoPath) return null;
    const clean = String(photoPath).trim().replace(/^\/+/, '');
    if (!clean) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/public-photos/${clean}`;
}

/**
 * Normalisasi klaster divisi teknis pengawasan Bawaslu.
 */
export function classifyDivision(raw) {
    const s = String(raw || '').toLowerCase();
    if (!s || s === '2') return 'Lainnya / Umum';
    if (s.includes('sdm') || s.includes('diklat') || s.includes('organisasi')) return 'SDMO, Diklat & Datin';
    if (s.includes('cegah') || s.includes('parmas') || s.includes('humas') || s.includes('hpph') || s.includes('hp2h') || s.includes('hubal')) return 'Pencegahan, Parmas & Humas';
    if (s.includes('langgar') || s.includes('ppps') || s.includes('penanganan')) return 'Penanganan Pelanggaran & Sengketa';
    if (s.includes('hukum') || s.includes('sengketa')) return 'Hukum & Penyelesaian Sengketa';
    if (s.includes('ketua')) return 'Pimpinan / Koordinator Wilayah';
    return 'Lainnya / Umum';
}

/**
 * Normalisasi baris Supabase menjadi objek minimal aman publik.
 */
function normalizeRecord(row) {
    const kabkota = row.district ? String(row.district).trim() : 'Provinsi Sulawesi Selatan';
    let jabatan = row.position ? String(row.position).trim() : '';
    if (!jabatan) {
        jabatan = kabkota.toLowerCase().includes('provinsi') ? 'Anggota' : 'Jabatan belum tercatat';
    }
    const rawGender = String(row.gender || '').trim().toUpperCase();
    const gender = rawGender === 'L' ? 'Laki-laki' : rawGender === 'P' ? 'Perempuan' : '';
    const rawDivision = row.division || row.wakordiv || '';
    const divisiKlaster = classifyDivision(rawDivision);

    return {
        id: row.id,
        nama: row.name ? String(row.name).trim() : '(Tanpa nama)',
        jabatan,
        kabkota,
        gender,
        divisi: rawDivision,
        divisiKlaster,
        fotoUrl: photoUrl(row.photo_path),
    };
}

/**
 * Membaca data personel dari cache sessionStorage jika masih valid.
 */
function getFromCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.timestamp || !Array.isArray(parsed.records)) return null;
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed.records;
    } catch {
        return null;
    }
}

/**
 * Menyimpan data ke sessionStorage.
 */
function saveToCache(records) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            records,
        }));
    } catch (e) {
        console.warn('[bipal-publik] Gagal menyimpan ke sessionStorage:', e);
    }
}

/**
 * Menghapus cache sessionStorage.
 */
export function clearCache() {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        // Abaikan kegagalan storage
    }
}

/**
 * Mengambil data personel publik langsung dari Supabase REST API.
 * Mendukung paginasi Range header otomatis jika baris > 1000.
 * @param {{ force?: boolean }} options 
 * @returns {Promise<Array<{ id: string, nama: string, jabatan: string, kabkota: string, fotoUrl: string|null }>>}
 */
export async function fetchPersonnel({ force = false } = {}) {
    if (!force) {
        const cached = getFromCache();
        if (cached && cached.length > 0) {
            return cached;
        }
    }

    const pageSize = 1000;
    let offset = 0;
    let allRows = [];
    let hasMore = true;

    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'api',
        'Accept': 'application/json',
    };

    while (hasMore) {
        const url = `${SUPABASE_URL}/rest/v1/personnel_public?select=id,name,position,district,photo_path,gender,division,wakordiv&order=district.asc,name.asc`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Range': `${offset}-${offset + pageSize - 1}`,
                'Range-Unit': 'items',
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Gagal memuat data dari Supabase (${response.status}): ${errorText || response.statusText}`);
        }

        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) {
            hasMore = false;
            break;
        }

        allRows.push(...rows);

        if (rows.length < pageSize) {
            hasMore = false;
        } else {
            offset += pageSize;
        }
    }

    const normalized = allRows.map(normalizeRecord);
    saveToCache(normalized);
    return normalized;
}
