/**
 * Utilitas teks murni (tanpa DOM, tanpa framework).
 */

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function safeHref(url) {
    const raw = String(url ?? '').trim();
    if (!raw) return '#';
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return esc(raw);
    if (/^(?:\.?\/)?assets\//i.test(raw)) return esc(raw);
    return '#';
}

/** Daftar gelar umum untuk pembersihan nama */
export const NAME_TITLES = Object.freeze(
    new Set([
        'prof', 'dr', 'drs', 'dra', 'ir', 'h', 'hj', 'st', 'se', 'sh', 'shi',
        'si', 'sos', 'sip', 'ssos', 'ssi', 'skom', 'spd', 'spdi', 'sag',
        'skm', 'sked', 'sfarm', 'sstp', 'stp', 'amd', 'ap', 'lc', 'phd',
        'mm', 'msi', 'mh', 'mpd', 'mkom', 'map', 'ma', 'mba', 'me', 'ms',
        'msc', 'msos', 'mstp', 'pd', 'kes', 'ag', 'sn', 'pt', 'th', 'hut',
        'hum', 'ti', 'kom', 'adm', 'psi',
    ])
);

const isTitleToken = (token) => NAME_TITLES.has(token) || token.length === 1;

export function slugify(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function stripNameTitles(name) {
    const beforeComma = String(name ?? '').split(',')[0];
    const tokens = slugify(beforeComma).split('-').filter(Boolean);
    while (tokens.length > 1 && isTitleToken(tokens[0])) tokens.shift();
    while (tokens.length > 1 && isTitleToken(tokens[tokens.length - 1])) tokens.pop();
    return tokens.join(' ');
}

export function initials(name) {
    const clean = stripNameTitles(name).split(' ').filter(Boolean);
    const tokens = clean.length ? clean : slugify(name).split('-').filter(Boolean);
    if (!tokens.length) return '?';
    if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
    return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
}
