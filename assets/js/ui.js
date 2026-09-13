/**
 * Lapisan antarmuka pengguna (UI) BIPAL Publik (Read-Only)
 * Mengelola rendering kartu Kab/Kota (Level 1), daftar personel (Level 2),
 * filter bar, KPI, drawer 4 field, dan banner status.
 */
import { esc, initials } from './text-utils.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Menampilkan pesan toast ringan
 */
export function toast(message, tone = 'info') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast toast--' + tone;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.hidden = true;
    }, 4000);
}

/**
 * Menampilkan status banner (loading, error, empty)
 */
export function showState(kind, title, detail = '') {
    const box = $('#stateBox');
    if (!box) return;
    if (kind === 'hidden') {
        box.hidden = true;
        return;
    }
    box.hidden = false;
    box.className = 'state state--' + kind;
    box.innerHTML =
        kind === 'loading'
            ? '<div class="spinner"></div><p>' + esc(title) + '</p>'
            : '<div class="state__icon">' +
              (kind === 'error' ? '⚠️' : '📄') +
              '</div>' +
              '<h2>' +
              esc(title) +
              '</h2>' +
              (detail ? '<p>' + esc(detail) + '</p>' : '');
}

/**
 * Render kartu avatar (foto atau inisial)
 */
export function avatarHtml(person, { size = 'md', className = '' } = {}) {
    const initialsText = esc(initials(person?.nama || ''));
    const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');
    
    if (person?.fotoUrl) {
        return `
            <div class="${classes} has-photo" role="img" aria-label="Foto ${esc(person.nama)}">
                <span class="avatar__initials" aria-hidden="true">${initialsText}</span>
                <img class="avatar__img" src="${esc(person.fotoUrl)}" alt="" loading="lazy" decoding="async">
            </div>
        `;
    }
    return `
        <div class="${classes}" role="img" aria-label="Foto ${esc(person?.nama || 'personel')}">
            <span class="avatar__initials" aria-hidden="true">${initialsText}</span>
        </div>
    `;
}

/**
 * Hydrate avatar agar jika gambar gagal termuat, fallback ke inisial dengan mulus (aman CSP).
 */
export function hydrateAvatars(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const images = root.querySelectorAll('.avatar__img');
    images.forEach((img) => {
        img.addEventListener('error', () => {
            const parent = img.closest('.avatar');
            if (parent) {
                parent.classList.remove('has-photo');
            }
            img.remove();
        });
    });
}

/**
 * Render kartu KPI
 */
export function renderKpis(selector, items) {
    const el = $(selector);
    if (!el) return;
    el.innerHTML = items
        .map(
            (k) =>
                '<article class="kpi">' +
                '<p class="kpi__label">' + esc(k.label) + '</p>' +
                '<p class="kpi__value">' + esc(k.value) + '</p>' +
                '<p class="kpi__hint">' + esc(k.hint) + '</p>' +
                '</article>'
        )
        .join('');
}

/**
 * Mengisi pilihan dropdown filter
 */
export function fillFacet(selectEl, values, current, allLabel) {
    if (!selectEl) return;
    selectEl.innerHTML =
        '<option value="">' +
        esc(allLabel) +
        '</option>' +
        values
            .map(
                (v) =>
                    '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>'
            )
            .join('');
}

/**
 * LEVEL 1: Render grid kartu Kabupaten / Kota (Persis gaya dir-location-card project utama)
 */
export function renderDistrictGrid(containerEl, districtCounts, onSelectDistrict) {
    if (!containerEl) return;
    if (!districtCounts || districtCounts.length === 0) {
        containerEl.className = 'dir-grid dir-location-grid';
        containerEl.innerHTML = '<div class="dir-empty">Tidak ada Kabupaten/Kota pada data yang sedang dipilih.</div>';
        return;
    }

    containerEl.className = 'dir-grid dir-location-grid';
    containerEl.innerHTML = districtCounts
        .map(({ district, count }) => {
            return `
                <a class="dir-location-card" role="button" tabindex="0" data-district="${esc(district)}" aria-label="Buka direktori ${esc(district)}">
                    <div class="dir-location-kicker">Kabupaten / Kota</div>
                    <h3 class="dir-location-name">${esc(district)}</h3>
                    <div class="dir-location-meta">Provinsi Sulawesi Selatan</div>
                    <div class="dir-location-count">${count} Personel</div>
                    <span class="dir-location-arrow" aria-hidden="true">→</span>
                </a>
            `;
        })
        .join('');

    // Pasang keyboard & click accessibility
    const cards = containerEl.querySelectorAll('.dir-location-card');
    cards.forEach((card) => {
        const district = card.getAttribute('data-district');
        const trigger = (e) => {
            e.preventDefault();
            if (typeof onSelectDistrict === 'function') onSelectDistrict(district);
        };

        card.addEventListener('click', trigger);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                trigger(e);
            }
        });
    });
}

/**
 * LEVEL 2: Render grid daftar personel (Persis gaya dir-person-card project utama, zero PII)
 */
export function renderPersonnelGrid(containerEl, records, onSelectPerson) {
    if (!containerEl) return;
    if (!records || records.length === 0) {
        containerEl.className = 'dir-grid dir-person-grid';
        containerEl.innerHTML = '<div class="dir-empty">Tidak ada personel pada Kabupaten/Kota ini.</div>';
        return;
    }

    containerEl.className = 'dir-grid dir-person-grid';
    containerEl.innerHTML = records
        .map((r) => {
            return `
                <article class="dir-person-card" data-id="${esc(r.id)}" role="button" tabindex="0" aria-label="Buka detail ${esc(r.nama)}">
                    <div class="dir-person-top">
                        ${avatarHtml(r, { size: 'lg' })}
                        <div class="dir-person-main">
                            <h3 class="dir-person-name">${esc(r.nama)}</h3>
                            <p class="dir-person-role">${esc(r.jabatan)}</p>
                        </div>
                    </div>
                    <div class="dir-person-tags">
                        <span class="dir-person-tag">${esc(r.kabkota)}</span>
                    </div>
                    <div class="dir-person-hint">Lihat detail personel →</div>
                </article>
            `;
        })
        .join('');

    hydrateAvatars(containerEl);

    if (typeof onSelectPerson === 'function') {
        const personCards = containerEl.querySelectorAll('.dir-person-card');
        personCards.forEach((card) => {
            const id = card.getAttribute('data-id');
            const person = records.find((p) => String(p.id) === String(id));
            if (!person) return;

            const trigger = (e) => {
                e.preventDefault();
                onSelectPerson(person);
            };
            card.addEventListener('click', trigger);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    trigger(e);
                }
            });
        });
    }
}

/**
 * Drawer Detail Personel Minimalis (Hanya 4 field)
 */
let lastFocusedTrigger = null;

export function openPublicDrawer(person) {
    const drawer = $('#drawer');
    if (!drawer || !person) return;

    lastFocusedTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const titleEl = $('#drawerTitle');
    if (titleEl) titleEl.textContent = person.nama || '(Tanpa nama)';

    const bodyEl = $('#drawerBody');
    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="public-drawer-profile">
                <div style="display: flex; justify-content: center; margin-bottom: 16px;">
                    ${avatarHtml(person, { size: 'xl' })}
                </div>
                <h3 class="public-drawer-name">${esc(person.nama)}</h3>
                <span class="public-drawer-badge">${esc(person.jabatan)}</span>
            </div>

            <dl class="public-dl">
                <div class="public-dl__row">
                    <dt>Nama Lengkap</dt>
                    <dd>${esc(person.nama)}</dd>
                </div>
                <div class="public-dl__row">
                    <dt>Jabatan</dt>
                    <dd>${esc(person.jabatan)}</dd>
                </div>
                <div class="public-dl__row">
                    <dt>Kabupaten / Kota</dt>
                    <dd>${esc(person.kabkota)}</dd>
                </div>
            </dl>
        `;
        hydrateAvatars(bodyEl);
    }

    drawer.hidden = false;
    document.body.style.overflow = 'hidden';

    const closeBtn = drawer.querySelector('[data-close]');
    if (closeBtn) closeBtn.focus();
}

export function closeDrawer() {
    const drawer = $('#drawer');
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
        lastFocusedTrigger.focus();
    }
}
