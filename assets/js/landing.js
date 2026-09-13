/**
 * Logika Landing Page BIPAL Publik
 * Mengambil ringkasan langsung dari fetchPersonnel Supabase
 */
import { fetchPersonnel } from './supabase-public.js';

const setStat = (name, value) => {
    const el = document.querySelector(`[data-stat="${name}"]`);
    if (el) el.textContent = value;
};

fetchPersonnel()
    .then((records) => {
        const total = records.length;
        const kabkotaCount = new Set(records.map((r) => r.kabkota).filter(Boolean)).size;
        const jabatanCount = new Set(records.map((r) => r.jabatan).filter(Boolean)).size;

        setStat('personel', total);
        setStat('personel-hero', total);
        setStat('kabkota', kabkotaCount);
        setStat('jabatan', jabatanCount);
    })
    .catch((err) => {
        console.warn('[landing] Gagal memuat data statistik publik:', err);
        document.querySelector('.mini-badge')?.remove();
    });

// ---------- Modal Developed By (Tim Magang) ----------
const btnCredit = document.getElementById('btnCreditLanding');
const modalCredit = document.getElementById('modalCreditLanding');
const btnClose = document.getElementById('btnCloseModalCreditLanding');
const backdrop = document.getElementById('closeModalCreditLanding');

if (btnCredit && modalCredit) {
    const openModal = () => {
        modalCredit.hidden = false;
        modalCredit.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
        modalCredit.hidden = true;
        modalCredit.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    btnCredit.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalCredit.hidden) {
            closeModal();
        }
    });
}
