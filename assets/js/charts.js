/**
 * Lapisan visualisasi grafik Chart.js (Read-Only)
 * Menggunakan berkas vendor lokal ./assets/vendor/chart.umd.min.js
 * Mematuhi CSP ketat tanpa dependensi CDN.
 */

const registry = new Map();
let chartLibLoading = null;
let chartLibLoaded = false;

export const PALETTE = [
    '#F58220',
    '#FFB366',
    '#D96A00',
    '#C62828',
    '#F8A145',
    '#FDBA74',
    '#8D6E63',
    '#E65100',
    '#BF360C',
    '#FB8C00',
    '#FFA726',
    '#FFCC80',
];

/**
 * Lazy load Chart.js dari vendor lokal.
 */
export async function ensureChartLib() {
    if (chartLibLoaded && window.Chart) return true;
    if (chartLibLoading) return chartLibLoading;

    chartLibLoading = new Promise((resolve, reject) => {
        if (window.Chart) {
            chartLibLoaded = true;
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = './assets/vendor/chart.umd.min.js';
        script.async = true;

        script.onload = () => {
            chartLibLoaded = true;
            resolve(true);
        };

        script.onerror = () => {
            console.error('[charts] Gagal memuat Chart.js dari vendor lokal');
            reject(new Error('Gagal memuat Chart.js lokal'));
        };

        document.head.appendChild(script);
    });

    return chartLibLoading;
}

export function applyDefaults() {
    if (typeof window === 'undefined' || !window.Chart) {
        return false;
    }
    const { Chart } = window;
    Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748B';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.animation.duration = 400;
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.maintainAspectRatio = false;
    return true;
}

function upsert(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return null;

    const existing = registry.get(canvasId);
    if (existing) {
        if (existing.canvas !== canvas || !existing.canvas.isConnected) {
            existing.destroy();
            registry.delete(canvasId);
        } else {
            existing.data = config.data;
            existing.options = config.options;
            existing.update();
            return existing;
        }
    }

    const chart = new window.Chart(canvas, config);
    registry.set(canvasId, chart);
    return chart;
}

export function destroyChart(canvasId) {
    const chart = registry.get(canvasId);
    if (!chart) return;
    chart.destroy();
    registry.delete(canvasId);
}

export function destroyAll() {
    for (const [id, chart] of registry) {
        chart.destroy();
        registry.delete(id);
    }
}

const gridX = { grid: { color: '#FFE6CC' }, ticks: { precision: 0 } };
const noLegend = { legend: { display: false } };

export function barChart(id, { labels, values }, { horizontal = false, color = PALETTE[0], colors = null, suffix = '' } = {}) {
    const bg = colors
        ? colors.slice(0, values.length)
        : Array.isArray(color)
        ? color.slice(0, values.length)
        : color;

    return upsert(id, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: bg,
                    borderRadius: 8,
                    maxBarThickness: 44,
                },
            ],
        },
        options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                ...noLegend,
                tooltip: {
                    callbacks: {
                        label: (c) => ' ' + (horizontal ? c.parsed.x : c.parsed.y) + suffix,
                    },
                },
            },
            scales: horizontal
                ? { x: { beginAtZero: true, ...gridX }, y: { grid: { display: false } } }
                : { y: { beginAtZero: true, ...gridX }, x: { grid: { display: false } } },
        },
    });
}

export function donutChart(id, { labels, values }, { colors = PALETTE } = {}) {
    return upsert(id, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#FFF8F1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16,
                        font: { size: 12, weight: '600' },
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (c) => {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
                            return ` ${c.label}: ${c.parsed} (${Math.round((c.parsed / total) * 100)}%)`;
                        },
                    },
                },
            },
        },
    });
}
