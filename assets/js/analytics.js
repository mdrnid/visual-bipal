/**
 * Analisis & agregasi data publik (murni tanpa DOM).
 * Hanya memproses data publik yang aman (nama, jabatan, kabkota).
 */

export function countBy(records, key, { limit = 0, sort = 'desc' } = {}) {
    const map = new Map();
    for (const r of records) {
        const v = r[key];
        if (!v) continue;
        map.set(v, (map.get(v) || 0) + 1);
    }
    let entries = [...map.entries()];
    entries.sort(
        sort === 'label'
            ? (a, b) => a[0].localeCompare(b[0], 'id')
            : (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id')
    );
    if (limit > 0 && entries.length > limit) {
        const head = entries.slice(0, limit);
        const rest = entries.slice(limit).reduce((s, e) => s + e[1], 0);
        if (rest) head.push(['Lainnya', rest]);
        entries = head;
    }
    return {
        labels: entries.map((e) => e[0]),
        values: entries.map((e) => e[1]),
    };
}

/**
 * KPI untuk Tingkat Provinsi
 */
export function kpiProvinsi(provRows, allRows) {
    const total = provRows.length;
    const ketua = provRows.filter((r) => (r.jabatan || '').toLowerCase().includes('ketua')).length;
    const anggota = Math.max(0, total - ketua);

    return [
        { label: 'Total Personel', value: total, hint: 'dari ' + allRows.length + ' personel aktif' },
        { label: 'Ketua Bawaslu', value: ketua, hint: 'pimpinan provinsi' },
        { label: 'Anggota Bawaslu', value: anggota, hint: 'komisioner provinsi' },
    ];
}

/**
 * KPI untuk Tingkat Kabupaten / Kota
 */
export function kpiKabkota(kabRows, allRows) {
    const total = kabRows.length;
    const kabKotaCount = new Set(kabRows.map((r) => r.kabkota).filter(Boolean)).size;
    const ketua = kabRows.filter((r) => (r.jabatan || '').toLowerCase().includes('ketua')).length;
    const anggota = kabRows.filter((r) => (r.jabatan || '').toLowerCase().includes('anggota')).length;

    return [
        { label: 'Total Personel', value: total, hint: 'dari ' + allRows.length + ' personel aktif' },
        { label: 'Cakupan Wilayah', value: kabKotaCount, hint: 'kabupaten / kota unik' },
        { label: 'Ketua Bawaslu', value: ketua, hint: 'pimpinan kab/kota' },
        { label: 'Anggota Bawaslu', value: anggota, hint: 'anggota kab/kota' },
    ];
}
