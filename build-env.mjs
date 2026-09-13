/**
 * Skrip Generator Konfigurasi dari Environment Variables (.env / Cloudflare Pages)
 * Pure Node.js tanpa dependensi npm eksternal.
 * 
 * Cara kerja:
 * 1. Membaca variabel dari process.env (diinjeksi oleh Cloudflare Pages / CI/CD)
 * 2. Jika tidak ada, membaca berkas .env lokal
 * 3. Menghasilkan assets/js/config.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Hapus tanda kutip pembungkus jika ada
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        result[key] = val;
    }
    return result;
}

const localEnv = parseEnvFile(path.join(__dirname, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || localEnv.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[build-env] ERROR: SUPABASE_URL atau SUPABASE_ANON_KEY tidak ditemukan!');
    console.error('[build-env] Pastikan variabel sudah diisi di:');
    console.error('[build-env] 1. File .env (untuk lokal)');
    console.error('[build-env] 2. Dashboard Cloudflare Pages -> Settings -> Environment variables (untuk hosting)');
    process.exit(1);
}

const targetFile = path.join(__dirname, 'assets', 'js', 'config.js');

const fileContent = `/**
 * Konfigurasi Publik BIPAL
 * Berkas ini dihasilkan secara otomatis oleh build-env.mjs dari Environment Variables.
 * AMAN untuk publik karena menggunakan SUPABASE_ANON_KEY (Read-Only via RLS).
 */
export const SUPABASE_URL = '${supabaseUrl}';
export const SUPABASE_ANON_KEY = '${supabaseAnonKey}';

export const APP_CONFIG = {
    appName: 'BIPAL Publik',
    subtitle: 'Biodata Pengawas Pemilu — Direktori Publik',
    orgName: 'Bawaslu Provinsi Sulawesi Selatan',
    cacheKey: 'bipal_publik_cache_v1',
    cacheTtlMinutes: 5,
};
`;

fs.writeFileSync(targetFile, fileContent, 'utf-8');
console.log('[build-env] Sukses memperbarui assets/js/config.js');
console.log(`[build-env] SUPABASE_URL: ${supabaseUrl}`);
console.log(`[build-env] SUPABASE_ANON_KEY: ${supabaseAnonKey ? '*** (Tersedia)' : '(Kosong!)'}`);

// Siapkan folder distribusi dist/ untuk Cloudflare Workers / Pages
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Salin file HTML, CSS, Headers, dan Redirects ke dist
const filesToCopy = ['index.html', 'landing.html', 'landing.css', '_headers', '_redirects'];
for (const file of filesToCopy) {
    const src = path.join(__dirname, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, file));
    }
}

// Salin direktori assets (termasuk config.js yang baru dihasilkan)
const assetsSrc = path.join(__dirname, 'assets');
const assetsDest = path.join(distDir, 'assets');
if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, assetsDest, { recursive: true });
}

console.log('[build-env] Sukses menyiapkan folder distribusi dist/');
