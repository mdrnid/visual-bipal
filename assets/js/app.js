/**
 * Inisialisasi & Logika Utama BIPAL Publik (Read-Only)
 * Tampilan & Visualisasi identik dengan Project Utama, Zero Sensitive Data.
 */
import { fetchPersonnel } from './supabase-public.js?v=5';
import { countBy, kpiProvinsi, kpiKabkota } from './analytics.js?v=5';
import { ensureChartLib, applyDefaults, barChart, donutChart, PALETTE } from './charts.js?v=5';
import {
    $,
    $$,
    toast,
    showState,
    renderKpis,
    fillFacet,
    renderDistrictGrid,
    renderPersonnelGrid,
    openPublicDrawer,
    closeDrawer,
} from './ui.js?v=5';

// State Aplikasi
let allRecords = [];
let currentView = 'overview'; // 'overview' | 'directory'
let selectedDistrict = null; // null: Level 1 (Kab/Kota), string: Level 2 (Personel Kab/Kota)
let activeSort = 'nama';

const filters = {
    search: '',
    kabkota: '',
    jabatan: '',
};

/* ==================== FILTERING & SORTING ==================== */

function getFilteredRecords() {
    const q = filters.search.trim().toLowerCase();
    const targetDistrict = selectedDistrict || filters.kabkota;

    return allRecords.filter((r) => {
        if (targetDistrict && r.kabkota.toLowerCase() !== targetDistrict.toLowerCase()) {
            return false;
        }
        if (filters.jabatan && r.jabatan.toLowerCase() !== filters.jabatan.toLowerCase()) {
            return false;
        }
        if (q) {
            const matchName = r.nama.toLowerCase().includes(q);
            const matchJab = r.jabatan.toLowerCase().includes(q);
            const matchKab = r.kabkota.toLowerCase().includes(q);
            if (!matchName && !matchJab && !matchKab) return false;
        }
        return true;
    });
}

function sortRecords(records, sortType) {
    const sorted = [...records];
    if (sortType === 'nama') {
        sorted.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    } else if (sortType === 'kabkota') {
        sorted.sort((a, b) => a.kabkota.localeCompare(b.kabkota, 'id') || a.nama.localeCompare(b.nama, 'id'));
    } else if (sortType === 'jabatan') {
        sorted.sort((a, b) => a.jabatan.localeCompare(b.jabatan, 'id') || a.nama.localeCompare(b.nama, 'id'));
    }
    return sorted;
}

/* ==================== RENDERING RINGKASAN ==================== */

function renderOverview() {
    const records = allRecords;
    if (!records.length) return;

    // Split data Provinsi vs Kab/Kota (Persis Project Utama)
    const provRows = records.filter((r) => (r.kabkota || '').toLowerCase().includes('provinsi'));
    const kabRows = records.filter((r) => !(r.kabkota || '').toLowerCase().includes('provinsi'));

    // Render KPI Cards (Tanpa card foto terverifikasi, tanpa data sensitif)
    renderKpis('#kpiGridProv', kpiProvinsi(provRows, records));
    renderKpis('#kpiGridKab', kpiKabkota(kabRows, records));

    // Render Visualisasi Charts
    ensureChartLib()
        .then(() => {
            applyDefaults();

            // 1. Komposisi Jabatan (Provinsi)
            const jabatanProv = countBy(provRows, 'jabatan', { limit: 12 });
            donutChart('chJabatanProv', jabatanProv);

            // 2. Komposisi Jenis Kelamin (Provinsi)
            const genderProv = countBy(provRows, 'gender');
            donutChart('chGenderProv', genderProv);

            // 3. Sebaran Personel per Kab/Kota (Tingkat Kabupaten/Kota)
            const kabkotaAgg = countBy(kabRows, 'kabkota', { sort: 'desc' });
            const hintKabkota = $('#hintKabkota');
            if (hintKabkota) hintKabkota.textContent = kabkotaAgg.labels.length + ' kab/kota';
            barChart('chKabkota', kabkotaAgg, { horizontal: true, suffix: ' orang' });

            // 4. Komposisi Jenis Kelamin (Kabupaten / Kota)
            const genderKab = countBy(kabRows, 'gender');
            donutChart('chGender', genderKab);

            // 5. Distribusi Jabatan (Kabupaten / Kota)
            const jabatanKab = countBy(kabRows, 'jabatan', { limit: 12, sort: 'desc' });
            barChart('chJabatanKab', jabatanKab, { horizontal: true, color: PALETTE[0], suffix: ' orang' });

            // 6. Distribusi Divisi / Bidang Kerja Pengawasan (Kabupaten / Kota)
            const divisiKab = countBy(kabRows, 'divisiKlaster', { sort: 'desc' });
            barChart('chDivisi', divisiKab, { horizontal: true, colors: PALETTE, suffix: ' orang' });
        })
        .catch((err) => {
            console.warn('[app] Grafik tidak dapat dimuat:', err);
        });
}

/* ==================== RENDERING DIREKTORI ==================== */

function renderDirectoryView() {
    const districtsView = $('#dirDistrictsView');
    const personnelView = $('#dirPersonnelView');
    const dirCount = $('#dirCount');

    // Jika sedang dalam mode Level 2 (Kab/Kota dipilih)
    if (selectedDistrict) {
        if (districtsView) districtsView.hidden = true;
        if (personnelView) personnelView.hidden = false;

        const breadcrumbTitle = $('#breadcrumbTitle');
        const breadcrumbCount = $('#breadcrumbCount');
        const breadcrumbSub = $('#breadcrumbSub');

        const filtered = getFilteredRecords();
        const sorted = sortRecords(filtered, activeSort);

        if (breadcrumbTitle) {
            breadcrumbTitle.innerHTML = `Direktori ${selectedDistrict} <span class="muted" id="breadcrumbCount">(${sorted.length} orang)</span>`;
        }
        if (breadcrumbSub) {
            breadcrumbSub.textContent = `Provinsi Sulawesi Selatan · Daftar personel khusus ${selectedDistrict}`;
        }

        if (dirCount) dirCount.textContent = `(${sorted.length} orang)`;

        const gridEl = $('#dirPersonnelGrid');
        renderPersonnelGrid(gridEl, sorted, (person) => {
            openPublicDrawer(person);
        });
    } else {
        // Mode Level 1: Grid Kartu Kab/Kota (Persis Main Project)
        if (districtsView) districtsView.hidden = false;
        if (personnelView) personnelView.hidden = true;

        const currentFiltered = getFilteredRecords();
        const districtMap = new Map();

        // Kumpulkan semua kab/kota unik dari allRecords
        const allDistricts = [...new Set(allRecords.map((r) => r.kabkota).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'id')
        );

        allDistricts.forEach((d) => districtMap.set(d, 0));

        currentFiltered.forEach((r) => {
            if (districtMap.has(r.kabkota)) {
                districtMap.set(r.kabkota, districtMap.get(r.kabkota) + 1);
            }
        });

        const districtCounts = allDistricts
            .map((district) => ({
                district,
                count: districtMap.get(district) || 0,
            }))
            .filter((d) => {
                if (filters.search || filters.jabatan) return d.count > 0;
                return true;
            });

        if (dirCount) dirCount.textContent = `(${allRecords.length} orang)`;

        const gridEl = $('#dirDistrictsGrid');
        renderDistrictGrid(gridEl, districtCounts, (district) => {
            window.location.hash = `#/kabkota/${encodeURIComponent(district)}`;
        });
    }
}

function updateView() {
    $$('.tab').forEach((t) => {
        const isSelected = t.getAttribute('data-view') === currentView;
        t.classList.toggle('is-active', isSelected);
        t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    const overviewSection = $('#view-overview');
    const directorySection = $('#view-directory');

    if (currentView === 'overview') {
        if (overviewSection) overviewSection.hidden = false;
        if (directorySection) directorySection.hidden = true;
        renderOverview();
    } else {
        if (overviewSection) overviewSection.hidden = true;
        if (directorySection) directorySection.hidden = false;
        renderDirectoryView();
    }
}

/* ==================== HASH ROUTING ==================== */

function handleHashChange() {
    const hash = window.location.hash || '#/ringkasan';

    if (hash.startsWith('#/kabkota/')) {
        currentView = 'directory';
        const rawDistrict = hash.replace('#/kabkota/', '').trim();
        selectedDistrict = decodeURIComponent(rawDistrict);
        const fKabkota = $('#fKabkota');
        if (fKabkota) fKabkota.value = selectedDistrict;
    } else if (hash === '#/direktori') {
        currentView = 'directory';
        selectedDistrict = null;
        const fKabkota = $('#fKabkota');
        if (fKabkota) fKabkota.value = '';
    } else {
        currentView = 'overview';
        selectedDistrict = null;
    }

    updateView();
}

/* ==================== DATA LOADING ==================== */

async function loadData(force = false) {
    showState('loading', 'Memuat data publik dari Supabase…');
    $('#filterBar').hidden = true;

    try {
        allRecords = await fetchPersonnel({ force });

        if (!allRecords || allRecords.length === 0) {
            showState('empty', 'Data publik belum tersedia', 'Belum ada personel yang dipublikasikan.');
            return;
        }

        showState('hidden');
        $('#filterBar').hidden = false;

        const kabkotaList = [...new Set(allRecords.map((r) => r.kabkota).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'id')
        );
        const jabatanList = [...new Set(allRecords.map((r) => r.jabatan).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'id')
        );

        fillFacet($('#fKabkota'), kabkotaList, selectedDistrict || '', 'Semua Kab/Kota');
        fillFacet($('#fJabatan'), jabatanList, filters.jabatan, 'Semua Jabatan');

        handleHashChange();

        if (force) {
            toast('Data berhasil diperbarui dari server!', 'good');
        }
    } catch (err) {
        console.error('[app] Gagal memuat data:', err);
        showState('error', 'Gagal memuat data personel publik', err.message || 'Periksa koneksi internet Anda.');
    }
}

/* ==================== EVENT LISTENERS ==================== */

function setupEventListeners() {
    $('#tab-overview')?.addEventListener('click', () => {
        window.location.hash = '#/ringkasan';
    });

    $('#tab-directory')?.addEventListener('click', () => {
        window.location.hash = '#/direktori';
    });

    window.addEventListener('hashchange', handleHashChange);

    // Tombol Back di Head Detail
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btnBackToDistricts')) {
            window.location.hash = '#/direktori';
        }
    });

    $('#fSearch')?.addEventListener('input', (e) => {
        filters.search = e.target.value;
        if (currentView === 'directory') renderDirectoryView();
    });

    $('#fKabkota')?.addEventListener('change', (e) => {
        const val = e.target.value;
        filters.kabkota = val;
        if (val) {
            window.location.hash = `#/kabkota/${encodeURIComponent(val)}`;
        } else {
            window.location.hash = '#/direktori';
        }
    });

    $('#fJabatan')?.addEventListener('change', (e) => {
        filters.jabatan = e.target.value;
        if (currentView === 'directory') renderDirectoryView();
    });

    $('#dirSort')?.addEventListener('change', (e) => {
        activeSort = e.target.value;
        if (currentView === 'directory') renderDirectoryView();
    });

    $('#btnReset')?.addEventListener('click', () => {
        filters.search = '';
        filters.kabkota = '';
        filters.jabatan = '';
        activeSort = 'nama';

        const fSearch = $('#fSearch');
        const fKabkota = $('#fKabkota');
        const fJabatan = $('#fJabatan');
        const dirSort = $('#dirSort');

        if (fSearch) fSearch.value = '';
        if (fKabkota) fKabkota.value = '';
        if (fJabatan) fJabatan.value = '';
        if (dirSort) dirSort.value = 'nama';

        if (selectedDistrict) {
            window.location.hash = '#/direktori';
        } else {
            renderDirectoryView();
        }
    });

    $('#btnRefresh')?.addEventListener('click', () => {
        loadData(true);
    });

    $('#drawer')?.addEventListener('click', (e) => {
        if (e.target.matches('[data-close]')) {
            closeDrawer();
        }
    });

    const btnCredit = $('#btnCredit');
    const modalCredit = $('#modalCredit');
    if (btnCredit && modalCredit) {
        const openCredit = () => {
            modalCredit.hidden = false;
            document.body.style.overflow = 'hidden';
        };
        const closeCredit = () => {
            modalCredit.hidden = true;
            document.body.style.overflow = '';
        };

        btnCredit.addEventListener('click', openCredit);
        modalCredit.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-credit]')) {
                closeCredit();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDrawer();
            const modalCredit = $('#modalCredit');
            if (modalCredit && !modalCredit.hidden) {
                modalCredit.hidden = true;
                document.body.style.overflow = '';
            }
        }
    });
}

/* ==================== INITIALIZATION ==================== */

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData(false);
});
