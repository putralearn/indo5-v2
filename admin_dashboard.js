
// ── STATUS MAPPING (New/Pending/Done/Reject) ──
window.__statusLabel = function(s) {
    const map = {
        'New': { label: 'New', bg: '#dbeafe', color: '#1d4ed8' },
        'Pending': { label: 'Pending', bg: '#fef9c3', color: '#a16207' },
        'Done': { label: 'Done', bg: '#dcfce7', color: '#15803d' },
        'Reject': { label: 'Reject', bg: '#fee2e2', color: '#b91c1c' },
        // Legacy support
        'Baru': { label: 'New', bg: '#dbeafe', color: '#1d4ed8' },
        'Review': { label: 'Pending', bg: '#fef9c3', color: '#a16207' },
        'Lengkap': { label: 'Done', bg: '#dcfce7', color: '#15803d' },
        'Disetujui': { label: 'Done', bg: '#dcfce7', color: '#15803d' },
        'Ditolak': { label: 'Reject', bg: '#fee2e2', color: '#b91c1c' },
        'Fresh Graduate': { label: 'New', bg: '#dbeafe', color: '#1d4ed8' },
    };
    return map[s] || { label: s || 'New', bg: '#f3f4f6', color: '#6b7280' };
};
﻿// ============================================================
//  admin_dashboard.js — Indo5 Admin Dashboard V3 (FIXED)
//  Perbaikan: Custom confirm modal, hapus data, kredensial, 2FA
// ============================================================

const SETTINGS_KEY = 'indolima_admin_settings';
const DATA_KEY = 'dashboardData';

function usePostgresApi() {
    const a = window.__INDO5_API__;
    return !!(a && a.usePostgres && String(a.baseUrl || '').trim());
}

function apiBase() {
    return String(window.__INDO5_API__.baseUrl || '').replace(/\/$/, '');
}

function adminApiHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Admin-Key': window.__INDO5_API__.adminKey || '',
    };
}

// ── SESSION GUARD ──
(function checkAdminSession() {
    const loggedIn = localStorage.getItem('admin_logged_in');
    const token = localStorage.getItem('admin_session_token');
    const expiry = parseInt(localStorage.getItem('admin_session_expiry') || '0');
    if (!loggedIn || !token || Date.now() > expiry) {
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_session_token');
        localStorage.removeItem('admin_session_expiry');
        window.location.replace('login admin/admin.html');
    }
    document.addEventListener('click', () => {
        const e = parseInt(localStorage.getItem('admin_session_expiry') || '0');
        if (Date.now() < e) {
            localStorage.setItem('admin_session_expiry', Date.now() + 8 * 3600 * 1000);
        }
    }, { passive: true });
})();

// ─────────────────────────────────────────────
//  CUSTOM CONFIRM MODAL (ganti browser confirm)
// ─────────────────────────────────────────────
function showCustomConfirm({ title, body, icon = 'warning', confirmText = 'Ya', cancelText = 'Batal', onConfirm, onCancel }) {
    // Hapus existing
    const existing = document.getElementById('customConfirmOverlay');
    if (existing) existing.remove();

    const iconMap = {
        warning: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
        danger:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>` },
        success: { bg: 'rgba(30,142,107,0.15)', color: '#34d399', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
        info:    { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>` },
    };
    const ic = iconMap[icon] || iconMap.warning;

    const overlay = document.createElement('div');
    overlay.id = 'customConfirmOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);
        z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;
        opacity:0;transition:opacity 0.25s ease;
    `;

    overlay.innerHTML = `
        <div id="customConfirmBox" style="
            background:var(--card-bg,#17261f);border:1px solid var(--border-color,rgba(255,255,255,0.1));
            border-radius:24px;width:100%;max-width:400px;padding:32px;
            box-shadow:0 40px 80px rgba(0,0,0,0.5);
            transform:translateY(24px) scale(0.96);
            transition:transform 0.3s cubic-bezier(.34,1.56,.64,1),opacity 0.25s ease;
            font-family:inherit;
        ">
            <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;">
                <div style="
                    width:48px;height:48px;border-radius:14px;flex-shrink:0;
                    background:${ic.bg};color:${ic.color};
                    display:flex;align-items:center;justify-content:center;
                ">${ic.svg}</div>
                <div>
                    <h3 style="font-size:1rem;font-weight:700;color:var(--text-main,#edf7f1);margin-bottom:6px;">${title}</h3>
                    <p style="font-size:0.85rem;color:var(--text-sub,#9bb2a5);line-height:1.6;">${body}</p>
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="confirmCancelBtn" style="
                    padding:11px 22px;border-radius:12px;border:1px solid var(--border-color,rgba(255,255,255,0.1));
                    background:transparent;color:var(--text-sub,#9bb2a5);font-size:0.88rem;font-weight:600;
                    cursor:pointer;font-family:inherit;transition:all 0.2s;
                ">${cancelText}</button>
                <button id="confirmOkBtn" style="
                    padding:11px 22px;border-radius:12px;border:none;
                    background:${ic.color};color:#fff;font-size:0.88rem;font-weight:700;
                    cursor:pointer;font-family:inherit;transition:all 0.2s;
                    box-shadow:0 4px 16px ${ic.bg};
                ">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('#customConfirmBox').style.transform = 'translateY(0) scale(1)';
    });

    const close = () => {
        overlay.style.opacity = '0';
        overlay.querySelector('#customConfirmBox').style.transform = 'translateY(16px) scale(0.97)';
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#confirmOkBtn').onclick = () => { close(); if (onConfirm) onConfirm(); };
    overlay.querySelector('#confirmCancelBtn').onclick = () => { close(); if (onCancel) onCancel(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });

    // Hover effects
    const okBtn = overlay.querySelector('#confirmOkBtn');
    const cancelBtn = overlay.querySelector('#confirmCancelBtn');
    okBtn.onmouseenter = () => { okBtn.style.opacity = '0.85'; okBtn.style.transform = 'translateY(-1px)'; };
    okBtn.onmouseleave = () => { okBtn.style.opacity = '1'; okBtn.style.transform = 'none'; };
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = 'rgba(255,255,255,0.05)'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = 'transparent'; };
}

// ─────────────────────────────────────────────
//  CUSTOM ALERT MODAL
// ─────────────────────────────────────────────
function showCustomAlert({ title, body, icon = 'info', btnText = 'Oke', onClose }) {
    const existing = document.getElementById('customAlertOverlay');
    if (existing) existing.remove();

    const iconMap = {
        warning: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
        danger:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>` },
        success: { bg: 'rgba(30,142,107,0.15)', color: '#34d399', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
        info:    { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>` },
    };
    const ic = iconMap[icon] || iconMap.info;

    const overlay = document.createElement('div');
    overlay.id = 'customAlertOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);
        z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;
        opacity:0;transition:opacity 0.25s ease;
    `;
    overlay.innerHTML = `
        <div id="customAlertBox" style="
            background:var(--card-bg,#17261f);border:1px solid var(--border-color,rgba(255,255,255,0.1));
            border-radius:24px;width:100%;max-width:380px;padding:32px;
            box-shadow:0 40px 80px rgba(0,0,0,0.5);
            transform:translateY(24px) scale(0.96);
            transition:transform 0.3s cubic-bezier(.34,1.56,.64,1);
            font-family:inherit;text-align:center;
        ">
            <div style="
                width:60px;height:60px;border-radius:18px;margin:0 auto 20px;
                background:${ic.bg};color:${ic.color};
                display:flex;align-items:center;justify-content:center;
            ">${ic.svg.replace('width="24" height="24"','width="28" height="28"')}</div>
            <h3 style="font-size:1.05rem;font-weight:700;color:var(--text-main,#edf7f1);margin-bottom:8px;">${title}</h3>
            <p style="font-size:0.85rem;color:var(--text-sub,#9bb2a5);line-height:1.6;margin-bottom:24px;">${body}</p>
            <button id="alertOkBtn" style="
                width:100%;padding:13px;border-radius:12px;border:none;
                background:${ic.color};color:#fff;font-size:0.9rem;font-weight:700;
                cursor:pointer;font-family:inherit;transition:all 0.2s;
            ">${btnText}</button>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('#customAlertBox').style.transform = 'translateY(0) scale(1)';
    });
    const close = () => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 250);
    };
    overlay.querySelector('#alertOkBtn').onclick = close;
}

// Override Indo5Modal jika ada, atau buat fallback
window.Indo5Modal = window.Indo5Modal || {};
Indo5Modal.confirm = ({ title, body, icon, confirmText, cancelText, onConfirm }) =>
    showCustomConfirm({ title, body, icon, confirmText, cancelText, onConfirm });
Indo5Modal.alert = ({ title, body, icon, btnText, onClose }) =>
    showCustomAlert({ title, body, icon, btnText, onClose });

// ─────────────────────────────────────────────
//  DATA MANAGEMENT
// ─────────────────────────────────────────────
/** Seed hanya dipakai jika belum pernah ada kunci `dashboardData` di localStorage. */
const DEFAULT_DATA = [];

let dashboardData = [];
let currentFilter = 'all';
let currentDetailIdx = null;

function sanitizeDashboardRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const hasName = String(row.name || '').trim() !== '';
        const hasNik = String(row.nik || '').trim() !== '';
        return hasName || hasNik;
    });
}

function loadData() {
    if (usePostgresApi()) {
        return (async () => {
            try {
                const r = await fetch(`${apiBase()}/api/submissions`, { headers: adminApiHeaders() });
                if (!r.ok) {
                    const t = await r.text();
                    throw new Error(t || r.statusText);
                }
                const arr = await r.json();
                dashboardData = sanitizeDashboardRows(Array.isArray(arr) ? arr : []);
                saveData();
            } catch (err) {
                console.warn('[dashboard] Gagal muat dari PostgreSQL API, fallback localStorage:', err);
                const raw = localStorage.getItem(DATA_KEY);
                if (raw !== null && raw !== '') {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            dashboardData = sanitizeDashboardRows(parsed);
                        }
                    } catch (_) { /* */ }
                }
                if (!dashboardData.length) {
                    dashboardData = sanitizeDashboardRows([...DEFAULT_DATA]);
                    saveData();
                }
            }
        })();
    }

    const raw = localStorage.getItem(DATA_KEY);
    if (raw !== null && raw !== '') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                dashboardData = sanitizeDashboardRows(parsed);
                saveData();
                return Promise.resolve();
            }
        } catch (_) { /* lanjut ke seed */ }
    }
    dashboardData = sanitizeDashboardRows([...DEFAULT_DATA]);
    saveData();
    return Promise.resolve();
}

function saveData() { /* disabled - always fetch from API */ }

window.saveData = saveData;
window.renderTable = renderTable;

// ─────────────────────────────────────────────
//  SETTINGS
// ─────────────────────────────────────────────
function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : { theme: 'dark', notify: false };
    } catch (_) { return { theme: 'dark', notify: false }; }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────
const themeOptionButtons = document.querySelectorAll('.theme-option');
function setTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    themeOptionButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    const s = loadSettings();
    s.theme = theme;
    saveSettings(s);
}

// ─────────────────────────────────────────────
//  STATUS HELPERS
// ─────────────────────────────────────────────
function statusClass(status) {
    if (!status) return 'status-review';
    const s = status.toLowerCase();
    if (s === 'lengkap' || s === 'disetujui') return 'status-lengkap';
    if (s === 'baru') return 'status-baru';
    if (s === 'ditolak' || s === 'blacklist') return 'status-ditolak';
    return 'status-review';
}

// ─────────────────────────────────────────────
//  RENDER TABLE
// ─────────────────────────────────────────────
function getTypeColor(type) {
    const map = {
        'Data Diri Karyawan': { bg: 'rgba(30,142,107,0.15)', color: '#1E8E6B' },
        'Surat Referensi':    { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
        'Pelamar Indo5':      { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        'Blacklist Indolima': { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
    };
    return map[type] || { bg: 'rgba(139,147,168,0.15)', color: '#8b93a8' };
}
window.getTypeColor = getTypeColor;

function renderTable(query = '') {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;

    const lowerQuery = query.toLowerCase();
    const filtered = dashboardData.filter(item => {
        const matchesType = currentFilter === 'all' || item.type === currentFilter;
        const matchesSearch = !query ||
            (item.name || '').toLowerCase().includes(lowerQuery) ||
            (item.nik || '').includes(query) ||
            (item.status || '').toLowerCase().includes(lowerQuery) ||
            (item.type || '').toLowerCase().includes(lowerQuery);
        return matchesType && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-sub);">Tidak ada data ditemukan</td></tr>`;
        updateCounters();
        return;
    }

    tbody.innerHTML = filtered.map((item) => {
        const realIdx = dashboardData.indexOf(item);
        return `
        <tr class="table-row-anim">
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="avatar-mini" style="background:${getTypeColor(item.type).bg};color:${getTypeColor(item.type).color};">${(item.name || '?')[0]}</div>
                    <div>
                        <strong>${item.name || '-'}</strong><br>
                        <small style="color:var(--text-sub)">${item.nik || '-'}</small>
                    </div>
                </div>
            </td>
            <td><span class="type-badge" style="background:${getTypeColor(item.type).bg};color:${getTypeColor(item.type).color};">${item.type || '-'}</span></td>
            <td style="color:var(--text-sub);font-size:0.9rem">${item.time || '-'}</td>
            <td><span class="status ${statusClass(item.status)}">${item.status || '-'}</span></td>
            <td>
                <div style="display:flex;gap:8px;">
                    <button class="action-btn btn-detail" onclick="openDetailModal(${realIdx})">
                        <i class="fa-solid fa-eye"></i> Detail
                    </button>
                    <button class="action-btn btn-status" onclick="openStatusModal(${realIdx})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteEntry(${realIdx})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
    updateCounters();
}

function updateCounters() {
    const counts = dashboardData.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {});
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('badge-karyawan', counts['Data Diri Karyawan'] || 0);
    setEl('card-count-karyawan', counts['Data Diri Karyawan'] || 0);
    setEl('badge-referensi', counts['Surat Referensi'] || 0);
    setEl('card-count-referensi', counts['Surat Referensi'] || 0);
    setEl('badge-pelamar', counts['Pelamar Indo5'] || 0);
    setEl('card-count-pelamar', counts['Pelamar Indo5'] || 0);
    setEl('badge-blacklist', counts['Blacklist Indolima'] || 0);
    setEl('card-count-blacklist', counts['Blacklist Indolima'] || 0);
}

// ─────────────────────────────────────────────
//  MODAL DETAIL FORMULIR
// ─────────────────────────────────────────────
window.openDetailModal = (idx) => {
    const item = dashboardData[idx];
    if (!item) return;
    currentDetailIdx = idx;

    document.getElementById('modalTitle').innerText = item.type || 'Detail Formulir';
    document.getElementById('modalName').innerText = item.name || '-';
    document.getElementById('modalNik').innerText = item.nik || '-';
    document.getElementById('modalTime').innerText = item.time || '-';
    const __tc = getTypeColor(item.type);
    const __modalAvatarEl = document.getElementById('modalAvatar');
    __modalAvatarEl.innerText = (item.name || '?')[0].toUpperCase();
    __modalAvatarEl.style.background = __tc.bg;
    __modalAvatarEl.style.color = __tc.color;

    const statusEl = document.getElementById('modalStatus');
    statusEl.innerText = item.status || '-';
    statusEl.className = `modal-status-badge ${statusClass(item.status)}`;

    const fieldsContainer = document.getElementById('modalFields');
    if (item.fields && Object.keys(item.fields).length > 0) {
        let html = Object.entries(item.fields).map(([key, val]) => `
            <div class="modal-field-row">
                <span class="modal-field-key">${key}</span>
                <span class="modal-field-val">${val || '-'}</span>
            </div>
        `).join('');

        if (item.photos && Object.keys(item.photos).length > 0) {
            html += `<div class="modal-photos-section"><div class="modal-fields-title" style="margin-top:18px;margin-bottom:12px;"> DOKUMEN & FOTO UPLOAD</div><div class="modal-photos-grid">`;
            for (const [key, photo] of Object.entries(item.photos)) {
                if (!photo || !photo.data) continue;
                if (photo.data.startsWith('[IMG]')) {
                    const __imgUrl = photo.data.replace('[IMG]', '');
                    html += `<div class="modal-photo-card"><div class="modal-photo-label">${photo.label || key}</div><img src="${__imgUrl}" alt="${photo.label || key}" class="modal-photo-img" style="width:100%;border-radius:8px;cursor:pointer;" onclick="openPhotoLightbox(this.src,this.alt)"></div>`;
                } else if (photo.data.startsWith('[PDF]') || photo.data.startsWith('[DOC]')) {
                    const __cvUrl = photo.data.replace('[PDF]', '').replace('[DOC]', '');
                    const __cvName = photo.filename || 'File';
                    const __isWord = /\.docx?$/i.test(__cvName);
                    const __cvIcon = __isWord ? 'fa-solid fa-file-word' : 'fa-solid fa-file-pdf';
                    const __cvColor = __isWord ? '#2b579a' : '#ef4444';
                    html += `<div class="modal-photo-card" style="cursor:pointer;" onclick="window.open('${__cvUrl}','_blank')" title="Klik untuk membuka/mengunduh"><div class="modal-photo-label">${photo.label || key}</div><div class="modal-photo-pdf"><i class="${__cvIcon}" style="font-size:2.5rem;color:${__cvColor};"></i><p style="margin-top:8px;font-size:0.78rem;color:var(--text-sub)">${__cvName}</p><p style="margin-top:4px;font-size:0.68rem;color:#1E8E6B;">⬇ Klik untuk unduh</p></div></div>`;
                }
            }
            html += `</div></div>`;
        }
        fieldsContainer.innerHTML = html;
    } else {
        fieldsContainer.innerHTML = `
            <div class="modal-field-row"><span class="modal-field-key">Nama</span><span class="modal-field-val">${item.name || '-'}</span></div>
            <div class="modal-field-row"><span class="modal-field-key">NIK / ID</span><span class="modal-field-val">${item.nik || '-'}</span></div>
            <div class="modal-field-row"><span class="modal-field-key">Tipe Formulir</span><span class="modal-field-val">${item.type || '-'}</span></div>
            <div class="modal-field-row"><span class="modal-field-key">Status</span><span class="modal-field-val">${item.status || '-'}</span></div>
            <div class="modal-field-row"><span class="modal-field-key">Waktu</span><span class="modal-field-val">${item.time || '-'}</span></div>
        `;
    }

    document.getElementById('detailModal').classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeDetailModal = () => {
    document.getElementById('detailModal').classList.remove('show');
    document.body.style.overflow = '';
    currentDetailIdx = null;
};

// ─────────────────────────────────────────────
//  MODAL STATUS
// ─────────────────────────────────────────────
window.openStatusModal = (idx) => {
    const item = dashboardData[idx];
    if (!item) return;
    currentDetailIdx = idx;
    document.getElementById('statusModalName').innerText = item.name;
    document.getElementById('statusSelect').value = item.status || 'Review';
    document.getElementById('statusModal').classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeStatusModal = () => {
    document.getElementById('statusModal').classList.remove('show');
    document.body.style.overflow = '';
};

window.saveStatus = async () => {
    if (currentDetailIdx === null) return;
    const newStatus = document.getElementById('statusSelect').value;
    const item = dashboardData[currentDetailIdx];
    if (usePostgresApi() && item && item.id) {
        try {
            const r = await fetch(`${apiBase()}/api/submissions/${item.id}`, {
                method: 'PATCH',
                headers: adminApiHeaders(),
                body: JSON.stringify({ status: newStatus }),
            });
            if (!r.ok) {
                showAdminToast('❌ Gagal menyimpan status ke server.');
                return;
            }
        } catch (e) {
            console.error(e);
            showAdminToast('❌ Gagal menyimpan status ke server.');
            return;
        }
    }
    item.status = newStatus;
    saveData();
    renderTable(document.getElementById('searchInput').value);
    closeStatusModal();
    if (typeof addNotification === 'function') addNotification(`Status ${item.name || 'data'} diubah menjadi ${newStatus}.`, 'success');
    showAdminToast(`✅ Status diubah ke "${newStatus}"!`);
};

// ─────────────────────────────────────────────
//  DELETE ENTRY (pakai custom confirm)
// ─────────────────────────────────────────────
window.deleteEntry = (idx) => {
    const name = dashboardData[idx]?.name || 'data ini';
    const item = dashboardData[idx];
    showCustomConfirm({
        title: 'Hapus Data?',
        body: `Data <strong>${name}</strong> akan dihapus permanen dan tidak bisa dikembalikan.`,
        icon: 'danger',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        onConfirm: async () => {
            if (usePostgresApi() && item && item.id) {
                try {
                    const r = await fetch(`${apiBase()}/api/submissions/${item.id}`, {
                        method: 'DELETE',
                        headers: adminApiHeaders(),
                    });
                    if (!r.ok) {
                        showAdminToast('❌ Gagal menghapus di server.');
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showAdminToast('❌ Gagal menghapus di server.');
                    return;
                }
            }
            dashboardData.splice(idx, 1);
            saveData();
            renderTable(document.getElementById('searchInput').value);
            if (typeof addNotification === 'function') addNotification(`Data ${name} berhasil dihapus.`, 'danger');
            showAdminToast('️ Data berhasil dihapus.');
        }
    });
};

// ─────────────────────────────────────────────
//  HAPUS SEMUA DATA (FIXED - sekarang benar-benar berfungsi)
// ─────────────────────────────────────────────
window.clearAllData = () => {
    showCustomConfirm({
        title: 'Hapus Semua Data Formulir?',
        body: 'Seluruh data formulir akan <strong>dihapus permanen</strong> dari sistem dan tidak bisa dikembalikan.',
        icon: 'danger',
        confirmText: 'Ya, Hapus Semua',
        cancelText: 'Batal',
        onConfirm: async () => {
            if (usePostgresApi()) {
                try {
                    const r = await fetch(`${apiBase()}/api/submissions`, {
                        method: 'DELETE',
                        headers: adminApiHeaders(),
                    });
                    if (!r.ok) {
                        showAdminToast('❌ Gagal menghapus semua data di server.');
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showAdminToast('❌ Gagal menghapus semua data di server.');
                    return;
                }
            } else {
                localStorage.removeItem(DATA_KEY);
            }
            dashboardData = [];
            saveData();
            renderTable();
            updateCounters();
            if (typeof addNotification === 'function') addNotification('Semua data formulir telah dihapus.', 'danger');
            showAdminToast('️ Semua data formulir berhasil dihapus.');
        }
    });
};

// ─────────────────────────────────────────────
//  EXPORT EXCEL
// ─────────────────────────────────────────────
window.exportExcel = () => {
    if (typeof XLSX === 'undefined') { showAdminToast('❌ Library XLSX tidak tersedia'); return; }
    const exportData = dashboardData.map(item => ({
        Nama: item.name, NIK: item.nik, Tipe: item.type,
        Status: item.status, Waktu: item.time,
        ...((item.fields) || {})
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Formulir');
    XLSX.writeFile(wb, `indo5_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAdminToast(' Data berhasil diekspor!');
};

// ─────────────────────────────────────────────
//  LOGOUT (custom confirm, bukan browser confirm)
// ─────────────────────────────────────────────
window.doLogout = () => {
    showCustomConfirm({
        title: 'Keluar dari Panel Admin?',
        body: 'Sesi aktifmu akan diakhiri dan kamu diarahkan ke halaman login.',
        icon: 'warning',
        confirmText: 'Ya, Keluar',
        cancelText: 'Tetap di sini',
        onConfirm: () => {
            if (typeof addNotification === 'function') addNotification('Logout berhasil. Sampai jumpa lagi!', 'warning');
            localStorage.removeItem('admin_logged_in');
            localStorage.removeItem('admin_session_token');
            localStorage.removeItem('admin_session_expiry');
            window.location.replace('login admin/admin.html');
        }
    });
};

// ─────────────────────────────────────────────
//  APPROVE FROM MODAL
// ─────────────────────────────────────────────
window.approveFromModal = async () => {
    if (currentDetailIdx === null || currentDetailIdx === undefined) return;
    const item = dashboardData[currentDetailIdx];
    if (!item) return;
    const newStatus = 'Lengkap';
    if (usePostgresApi() && item.id) {
        try {
            const r = await fetch(`${apiBase()}/api/submissions/${item.id}`, {
                method: 'PATCH',
                headers: adminApiHeaders(),
                body: JSON.stringify({ status: newStatus }),
            });
            if (!r.ok) {
                showAdminToast('❌ Gagal menyimpan ke server.');
                return;
            }
        } catch (e) {
            console.error(e);
            showAdminToast('❌ Gagal menyimpan ke server.');
            return;
        }
    }
    dashboardData[currentDetailIdx].status = newStatus;
    saveData();
    renderTable(document.getElementById('searchInput')?.value || '');
    closeDetailModal();
    if (typeof addNotification === 'function') addNotification(`Formulir ${item.name || 'tanpa nama'} ditandai Lengkap.`, 'success');
    showAdminToast('✅ Formulir ditandai Lengkap!');
};

// ─────────────────────────────────────────────
//  ADMIN TOAST (improved)
// ─────────────────────────────────────────────
function getToastGradient(msg) {
    if (msg.includes('✅')) return 'linear-gradient(135deg,#1B5E20,#2E7D32)';
    if (msg.includes('❌')) return 'linear-gradient(135deg,#7f1d1d,#b91c1c)';
    if (msg.includes('⚠️')) return 'linear-gradient(135deg,#78350f,#d97706)';
    if (msg.includes('') || msg.includes('') || msg.includes('') || msg.includes('')) return 'linear-gradient(135deg,#1e3a5f,#1d4ed8)';
    if (msg.includes('️') || msg.includes('')) return 'linear-gradient(135deg,#374151,#6b7280)';
    if (msg.includes('') || msg.includes('')) return 'linear-gradient(135deg,#4c1d95,#7c3aed)';
    return 'linear-gradient(135deg,#1e293b,#334155)';
}

// ── EXPORT EXCEL PER KATEGORI ──────────────────────────────────
async function exportExcelPerCategory(category) {
    if (typeof XLSX === 'undefined') { showAdminToast('❌ Library XLSX tidak tersedia'); return; }
    const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000' : window.location.origin;
    const token = localStorage.getItem('indo5_token') || localStorage.getItem('admin_session_token') || '';
    const labelMap = { datadiri: 'Data Diri', referensi: 'Referensi', pelamar: 'Pelamar', blacklist: 'Blacklist' };
    try {
        const res = await fetch(`${apiBase}/api/admin/export/${category}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Gagal fetch data');
        const rows = await res.json();
        if (!rows.length) { showAdminToast('⚠️ Tidak ada data untuk diekspor.'); return; }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, labelMap[category] || category);
        const colWidths = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
        ws['!cols'] = colWidths;
        const now = new Date();
        const tgl = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        XLSX.writeFile(wb, `Indo5_${labelMap[category] || category}_${tgl}.xlsx`);
        showAdminToast(` Export ${labelMap[category] || category} berhasil!`);
    } catch(e) {
        showAdminToast('❌ Gagal export: ' + e.message);
    }
}
window.exportExcelPerCategory = exportExcelPerCategory;
// ── PASSWORD STRENGTH CHECKER ───────────────────────────────────
function checkPasswordStrength(val) {
    let score = 0;
    if (val.length >= 8)  score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score; // 0-5
}

function renderPasswordStrength(inputId, barId, labelId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
        const score = checkPasswordStrength(input.value);
        const bar   = document.getElementById(barId);
        const lbl   = document.getElementById(labelId);
        if (!bar || !lbl) return;
        const levels = [
            { w: '0%',   color: '#e5e7eb', text: '' },
            { w: '20%',  color: '#ef4444', text: ' Sangat Lemah' },
            { w: '40%',  color: '#f97316', text: ' Lemah' },
            { w: '60%',  color: '#eab308', text: ' Cukup' },
            { w: '80%',  color: '#22c55e', text: ' Kuat' },
            { w: '100%', color: '#15803d', text: ' Sangat Kuat' },
        ];
        const lv = levels[score] || levels[0];
        bar.style.width = lv.w;
        bar.style.background = lv.color;
        lbl.textContent = lv.text;
        lbl.style.color = lv.color;
    });
}
window.renderPasswordStrength = renderPasswordStrength;

// showAdminToast handled by dashboard_fix.js

// ─────────────────────────────────────────────
//  SYNC DARI LOCALSTORAGE
// ─────────────────────────────────────────────
function syncFromStorage() {
    if (usePostgresApi()) {
        void loadData().then(() => renderTable(document.getElementById('searchInput')?.value || ''));
        return;
    }
    try {
        const stored = sanitizeDashboardRows(JSON.parse(localStorage.getItem(DATA_KEY) || '[]'));
        if (JSON.stringify(stored) !== JSON.stringify(dashboardData)) {
            dashboardData = stored;
            renderTable(document.getElementById('searchInput')?.value || '');
        }
    } catch (_) { }
}


// ─────────────────────────────────────────────
//  SWITCH TAB
// ─────────────────────────────────────────────
const navDashboard = document.getElementById('navDashboard');
const navSettings = document.getElementById('navSettings');
const dashboardSection = document.getElementById('dashboardSection');
const settingsSection = document.getElementById('settingsSection');
const searchInput = document.getElementById('searchInput');
const navFilters = document.querySelectorAll('.nav-filter');

function switchTab(tab) {
    dashboardSection.classList.toggle('hidden', tab !== 'dashboard');
    settingsSection.classList.toggle('hidden', tab !== 'settings');
    navDashboard.classList.toggle('active', tab === 'dashboard');
    navSettings.classList.toggle('active', tab === 'settings');
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.innerText = tab === 'dashboard'
        ? (currentFilter === 'all' ? 'Dashboard' : currentFilter)
        : 'Pengaturan';
}

navDashboard.onclick = () => { currentFilter = 'all'; switchTab('dashboard'); renderTable(); };
navSettings.onclick = () => switchTab('settings');

navFilters.forEach(btn => {
    btn.onclick = () => {
        currentFilter = btn.dataset.filter;
        switchTab('dashboard');
        renderTable();
    };
});

themeOptionButtons.forEach(btn => {
    btn.onclick = () => setTheme(btn.dataset.theme);
});

searchInput.oninput = (e) => renderTable(e.target.value);

document.getElementById('detailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetailModal();
});
document.getElementById('statusModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'statusModal') closeStatusModal();
});

const notifyToggle = document.getElementById('notifyToggle');
if (notifyToggle) {
    const s = loadSettings();
    notifyToggle.checked = s.notify || false;
    notifyToggle.onchange = () => {
        const ns = loadSettings();
        ns.notify = notifyToggle.checked;
        saveSettings(ns);
        showAdminToast(ns.notify ? ' Notifikasi form diaktifkan' : ' Notifikasi form dinonaktifkan');
    };
}

// ─────────────────────────────────────────────
//  PHOTO LIGHTBOX
// ─────────────────────────────────────────────
window.openPhotoLightbox = (src, title) => {
    let lb = document.getElementById('photoLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'photoLightbox';
        lb.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.94);z-index:99999;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            cursor:zoom-out;padding:20px;
        `;
        lb.innerHTML = `
            <div style="max-width:90vw;max-height:90vh;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span id="lbTitle" style="color:#fff;font-weight:600;font-size:0.95rem;"></span>
                    <button onclick="document.getElementById('photoLightbox').style.display='none'"
                        style="background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;
                        padding:6px 14px;border-radius:8px;font-size:0.85rem;">✕ Tutup</button>
                </div>
                <img id="lbImg" style="max-width:85vw;max-height:80vh;border-radius:12px;object-fit:contain;">
                <a id="lbDownload" download style="display:block;margin-top:12px;text-align:center;
                    color:#34d399;font-size:0.82rem;text-decoration:none;">
                    ⬇ Download foto</a>
            </div>
        `;
        lb.addEventListener('click', e => { if (e.target === lb) lb.style.display = 'none'; });
        document.body.appendChild(lb);
    }
    document.getElementById('lbImg').src = src;
    document.getElementById('lbTitle').textContent = title;
    document.getElementById('lbDownload').href = src;
    lb.style.display = 'flex';
};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
localStorage.removeItem('dashboardData');
void loadData().then(() => {
    const initialSettings = loadSettings();
    setTheme(initialSettings.theme);
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    renderTable();
});
// ============================================================
//  settings_fixed.js — Indo5 Settings Panel (ALL FEATURES FIXED)
//  Dipasang sebagai <script> terakhir di admin_dashboard.html
//  Menggantikan inline <script> yang lama
// ============================================================

const ADMIN_ACCOUNTS_KEY = 'admin_accounts';
const NOTIFICATION_KEY   = 'admin_notifications';
const TFA_ENABLED_PREFIX = 'admin_2fa_enabled_';
const TFA_PENDING_CODE   = 'admin_2fa_pending_code_';
const TFA_PENDING_EXPIRY = 'admin_2fa_pending_expiry_';

// ─────────────────────────────────────────────
//  AKUN HELPERS
// ─────────────────────────────────────────────
function getStoredAdminAccounts() {
    try {
        const d = JSON.parse(localStorage.getItem(ADMIN_ACCOUNTS_KEY) || '[]');
        return Array.isArray(d) ? d : [];
    } catch (_) { return []; }
}

function saveAdminAccounts(accounts) {
    localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getAdminCredentialsStore() {
    try {
        return JSON.parse(localStorage.getItem('admin_credentials') || '{}');
    } catch (_) { return {}; }
}

function getActiveAdminUsername() {
    return (localStorage.getItem('admin_username') ||
            getAdminCredentialsStore().username || 'admin').toString().toLowerCase();
}

function getActiveAdminEmail() {
    return (localStorage.getItem('admin_email') ||
            getAdminCredentialsStore().email || '—').toString();
}

// ─────────────────────────────────────────────
//  LOAD ACCOUNT INFO KE UI
// ─────────────────────────────────────────────
function loadAccountInfo() {
    const username = getActiveAdminUsername();
    const email    = getActiveAdminEmail();
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('dispActiveUsername', username);
    setTxt('dispActiveEmail',    email);
    setTxt('dispProfileName',    username);
    const avLetter = (username && username[0]) ? username[0].toUpperCase() : 'A';
    const avFallback = document.querySelector('#userAvatar .avatar-fallback-text');
    if (avFallback) avFallback.textContent = avLetter;
    // Update 2FA email display
    const tfaEmailEl = document.getElementById('twoFAEmailDisplay');
    if (tfaEmailEl) tfaEmailEl.textContent = email !== '—' ? email : 'Belum diisi';
    const tfaUsernameEl = document.getElementById('twoFAUsername');
    if (tfaUsernameEl) tfaUsernameEl.textContent = username;
}

// ─────────────────────────────────────────────
//  NOTIFIKASI
// ─────────────────────────────────────────────
function getNotifStorage() {
    try {
        const d = JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]');
        return Array.isArray(d) ? d : [];
    } catch (_) { return []; }
}

function saveNotifications(notifs) {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifs.slice(0, 50)));
    renderNotifications();
}

function addNotification(message, type = 'info') {
    const notifs = getNotifStorage();
    notifs.unshift({
        id: Date.now(), message, type,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        read: false
    });
    saveNotifications(notifs);
}
window.addNotification = addNotification;

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) renderNotifications();
}
window.toggleNotificationPanel = toggleNotificationPanel;

function renderNotifications() {
    const list  = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    if (!list || !badge) return;

    const notifs = getNotifStorage();
    const unread = notifs.filter(n => !n.read).length;
    badge.textContent = unread > 0 ? (unread > 99 ? '99+' : unread) : '0';
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';

    if (notifs.length === 0) {
        list.innerHTML = '<div class="notification-empty">Tidak ada notifikasi baru.</div>';
        return;
    }

    const typeIcon = { success: '✅', danger: '️', warning: '⚠️', info: 'ℹ️', error: '❌' };
    list.innerHTML = notifs.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" style="cursor:pointer;" onclick="markOneNotifRead(${n.id})">
            <div class="notification-item-dot" style="${n.type === 'danger' ? 'background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,0.12)' : n.type === 'success' ? 'background:#34d399;box-shadow:0 0 0 4px rgba(30,142,107,0.12)' : ''}"></div>
            <div class="notification-item-content">
                <strong>${typeIcon[n.type] || 'ℹ️'} ${n.message}</strong>
                <small>${n.time}</small>
            </div>
        </div>
    `).join('');
}

window.markOneNotifRead = (id) => {
    const notifs = getNotifStorage().map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(notifs);
};

function clearNotifications() {
    localStorage.removeItem(NOTIFICATION_KEY);
    renderNotifications();
    showAdminToast(' Notifikasi dibersihkan');
}
window.clearNotifications = clearNotifications;

function markNotificationsRead() {
    const notifs = getNotifStorage().map(n => ({ ...n, read: true }));
    saveNotifications(notifs);
    showAdminToast('✅ Semua notifikasi ditandai terbaca');
}
window.markNotificationsRead = markNotificationsRead;

// ─────────────────────────────────────────────
//  TAMBAH AKUN ADMIN (FIXED)
// ─────────────────────────────────────────────
function addAdminAccount() {
    const email    = (document.getElementById('addEmail')?.value || '').trim();
    const username = (document.getElementById('addUsername')?.value || '').trim().toLowerCase();
    const password = document.getElementById('addPassword')?.value || '';
    const confirm  = document.getElementById('addConfirmPassword')?.value || '';

    if (!email || !username || !password || !confirm) {
        Indo5Modal.alert({ title: 'Form Tidak Lengkap', body: 'Semua field wajib diisi sebelum menambahkan akun.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Indo5Modal.alert({ title: 'Email Tidak Valid', body: 'Masukkan alamat email yang benar, contoh: nama@gmail.com', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (username.length < 4 || /\s/.test(username)) {
        Indo5Modal.alert({ title: 'Username Tidak Valid', body: 'Username minimal 4 karakter tanpa spasi.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (password.length < 8) {
        Indo5Modal.alert({ title: 'Password Terlalu Pendek', body: 'Gunakan minimal 8 karakter.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (password !== confirm) {
        Indo5Modal.alert({ title: 'Password Tidak Cocok', body: 'Konfirmasi password tidak sesuai dengan password baru.', icon: 'danger', btnText: 'Coba Lagi' });
        return;
    }

    const accounts = getStoredAdminAccounts();
    const creds    = getAdminCredentialsStore();

    const usernameTaken = accounts.some(a => a.username?.toLowerCase() === username) || creds.username?.toLowerCase() === username;
    const emailTaken    = accounts.some(a => a.email?.toLowerCase() === email.toLowerCase()) || creds.email?.toLowerCase() === email.toLowerCase();

    if (usernameTaken) {
        Indo5Modal.alert({ title: 'Username Sudah Ada', body: 'Gunakan username lain karena akun ini sudah terdaftar.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (emailTaken) {
        Indo5Modal.alert({ title: 'Email Sudah Terdaftar', body: 'Gunakan alamat email lain untuk akun baru.', icon: 'warning', btnText: 'Oke' });
        return;
    }

    accounts.push({ email: email.toLowerCase(), username, password, role: 'Administrator' });
    saveAdminAccounts(accounts);
    addNotification(`Akun admin baru "${username}" berhasil ditambahkan.`, 'success');
    showAdminToast('✅ Akun admin baru berhasil dibuat!');

    // Reset form
    ['addEmail','addUsername','addPassword','addConfirmPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}
window.addAdminAccount = addAdminAccount;

// ─────────────────────────────────────────────
//  UBAH KREDENSIAL (FIXED - sekarang benar-benar menyimpan)
// ─────────────────────────────────────────────
function saveCredentials() {
    const email    = (document.getElementById('newEmail')?.value || '').trim();
    const username = (document.getElementById('newUsername')?.value || '').trim().toLowerCase();
    const password = document.getElementById('newPassword')?.value || '';
    const confirm  = document.getElementById('confirmPassword')?.value || '';

    if (!email || !username || !password || !confirm) {
        Indo5Modal.alert({ title: 'Form Tidak Lengkap', body: 'Semua field wajib diisi sebelum menyimpan.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Indo5Modal.alert({ title: 'Email Tidak Valid', body: 'Masukkan alamat email yang benar, contoh: nama@gmail.com', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (username.length < 4 || /\s/.test(username)) {
        Indo5Modal.alert({ title: 'Username Tidak Valid', body: 'Username minimal 4 karakter tanpa spasi.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (password.length < 8) {
        Indo5Modal.alert({ title: 'Password Terlalu Pendek', body: 'Password minimal 8 karakter, gunakan huruf besar, angka, dan simbol.', icon: 'warning', btnText: 'Oke' });
        return;
    }
    if (password !== confirm) {
        Indo5Modal.alert({ title: 'Password Tidak Cocok', body: 'Konfirmasi password tidak sesuai dengan password baru.', icon: 'danger', btnText: 'Coba Lagi' });
        return;
    }

    Indo5Modal.confirm ? Indo5Modal.confirm({
        title: 'Simpan Kredensial Baru?',
        body: `Akun akan diperbarui dengan username <strong>${username}</strong>.<br>Kamu perlu <strong>login ulang</strong> setelah ini.`,
        icon: 'warning',
        confirmText: 'Ya, Simpan',
        cancelText: 'Batal',
        onConfirm: _doSaveCredentials.bind(null, email, username, password)
    }) : _doSaveCredentials(email, username, password);
}

function _doSaveCredentials(email, username, password) {
    // Simpan ke admin_credentials (akun utama)
    localStorage.setItem('admin_credentials', JSON.stringify({
        email: email.toLowerCase(),
        username,
        password
    }));
    // Update juga di admin_accounts jika username aktif ada di sana
    const oldUsername = getActiveAdminUsername();
    const accounts = getStoredAdminAccounts();
    const accIdx = accounts.findIndex(a => a.username?.toLowerCase() === oldUsername);
    if (accIdx >= 0) {
        accounts[accIdx] = { ...accounts[accIdx], email: email.toLowerCase(), username, password };
        saveAdminAccounts(accounts);
    }
    // Hapus session agar login ulang
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_session_token');
    localStorage.removeItem('admin_session_expiry');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_email');

    addNotification(`Kredensial admin "${username}" telah diperbarui.`, 'success');
    Indo5Modal.alert({
        title: 'Berhasil Disimpan!',
        body: 'Kredensial baru telah tersimpan. Silakan login ulang dengan akun baru.',
        icon: 'success',
        btnText: 'Login Ulang',
        onClose: () => { window.location.replace('login admin/admin.html'); }
    });
}
window.saveCredentials = saveCredentials;

// ─────────────────────────────────────────────
//  PASSWORD STRENGTH
// ─────────────────────────────────────────────
function initPasswordStrength() {
    const pwInput = document.getElementById('newPassword');
    if (!pwInput) return;
    pwInput.addEventListener('input', () => {
        const v = pwInput.value;
        const fill  = document.getElementById('pwStrengthFill');
        const label = document.getElementById('pwStrengthLabel');
        if (!fill || !label) return;
        let score = 0;
        if (v.length >= 8) score++;
        if (/[A-Z]/.test(v)) score++;
        if (/[0-9]/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;
        const map = [
            { w: '0%',   bg: 'transparent', txt: '',              color: 'transparent' },
            { w: '25%',  bg: '#ef4444',     txt: 'Lemah',         color: '#f87171' },
            { w: '50%',  bg: '#f59e0b',     txt: 'Cukup',         color: '#fbbf24' },
            { w: '75%',  bg: '#3b82f6',     txt: 'Kuat',          color: '#60a5fa' },
            { w: '100%', bg: '#1E8E6B',     txt: 'Sangat Kuat ✓', color: '#34d399' },
        ];
        fill.style.width      = map[score].w;
        fill.style.background = map[score].bg;
        label.textContent     = v ? map[score].txt : '';
        label.style.color     = map[score].color;
    });
}

// ─────────────────────────────────────────────
//  OTP INPUT AUTO-ADVANCE
// ─────────────────────────────────────────────
function initOtpInputs() {
    document.querySelectorAll('.tfa-otp').forEach((inp, i, arr) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/\D/g, '').slice(-1);
            if (inp.value && i < arr.length - 1) arr[i + 1].focus();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !inp.value && i > 0) arr[i - 1].focus();
        });
        inp.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            arr.forEach((input, j) => { if (text[j]) input.value = text[j]; });
            const lastFilled = Math.min(text.length - 1, arr.length - 1);
            if (lastFilled >= 0) arr[lastFilled].focus();
        });
    });
}

// ─────────────────────────────────────────────
//  2FA (FIXED - semua fungsi berjalan)
// ─────────────────────────────────────────────
function isTwoFAEnabled(username) {
    return localStorage.getItem(`${TFA_ENABLED_PREFIX}${username.toLowerCase()}`) === 'true';
}

function setTwoFAEnabled(username, enabled) {
    if (enabled) {
        localStorage.setItem(`${TFA_ENABLED_PREFIX}${username.toLowerCase()}`, 'true');
    } else {
        localStorage.removeItem(`${TFA_ENABLED_PREFIX}${username.toLowerCase()}`);
    }
}

function load2FAStatus() {
    const username    = getActiveAdminUsername();
    const email       = getActiveAdminEmail();
    const enabled     = isTwoFAEnabled(username);
    const statusEl    = document.getElementById('twoFAStatus');
    const setupSec    = document.getElementById('twoFASetupSection');
    const disableSec  = document.getElementById('twoFADisableSection');
    const emailEl     = document.getElementById('twoFAEmailDisplay');
    const usernameEl  = document.getElementById('twoFAUsername');

    if (!statusEl) return;
    if (emailEl) emailEl.textContent = email !== '—' ? email : 'Belum ada email terdaftar';
    if (usernameEl) usernameEl.textContent = username;

    if (enabled) {
        statusEl.className   = 'security-status-on';
        statusEl.innerHTML   = '<i class="fa-solid fa-circle-check"></i> Aktif';
        if (setupSec)   setupSec.style.display   = 'none';
        if (disableSec) disableSec.style.display  = 'block';
    } else {
        statusEl.className   = 'security-status-off';
        statusEl.innerHTML   = '<i class="fa-solid fa-circle-xmark"></i> Nonaktif';
        if (setupSec)   setupSec.style.display   = 'block';
        if (disableSec) disableSec.style.display  = 'none';
        // Reset OTP UI
        const sendBtn   = document.getElementById('btnSend2FAEmail');
        const verifyBtn = document.getElementById('btn2FAVerify');
        const infoEl    = document.getElementById('twoFAStatusInfo');
        if (sendBtn)   sendBtn.disabled = false;
        if (verifyBtn) verifyBtn.style.display = 'inline-flex';
        if (infoEl)    infoEl.textContent = 'Klik tombol kirim kode untuk menerima kode di email terdaftar.';
        document.querySelectorAll('.tfa-otp').forEach(i => i.value = '');
    }
}

async function sendTwoFAEmailCode() {
    const username = getActiveAdminUsername();
    const email    = getActiveAdminEmail();

    if (!email || email === '—') {
        Indo5Modal.alert({
            title: 'Email Tidak Tersedia',
            body: 'Pastikan email akun sudah diisi di bagian "Ubah Kredensial Login" terlebih dahulu.',
            icon: 'warning', btnText: 'Oke'
        });
        return;
    }

    if (usePostgresApi()) {
        try {
            const res = await fetch(`${apiBase()}/api/admin/2fa-setup/start`, {
                method: 'POST',
                headers: adminApiHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                showAdminToast('❌ ' + (data.error || 'Gagal mengirim email OTP.'));
                return;
            }
            // Simpan challenge_id untuk verifikasi nanti
            sessionStorage.setItem('pending_2fa_setup_challenge', data.challenge_id);
        } catch (err) {
            console.error(err);
            showAdminToast('❌ Gagal menghubungi server.');
            return;
        }
    } else {
        const code   = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 5 * 60 * 1000;
        localStorage.setItem(`${TFA_PENDING_CODE}${username}`,   code);
        localStorage.setItem(`${TFA_PENDING_EXPIRY}${username}`, expiry.toString());
        showAdminToast(` Kode 2FA: ${code} (cek konsol untuk dev)`);
        console.log(`%c[2FA] Kode untuk ${email}: ${code}`, 'color:#34d399;font-size:1.2rem;font-weight:bold;');
    }

    const infoEl    = document.getElementById('twoFAStatusInfo');
    const verifyBtn = document.getElementById('btn2FAVerify');
    const sendBtn   = document.getElementById('btnSend2FAEmail');

    if (infoEl)    infoEl.textContent = `✅ Kode 2FA dikirim ke ${email}. Berlaku 5 menit.`;
    if (verifyBtn) verifyBtn.style.display = 'inline-flex';
    if (sendBtn) {
        sendBtn.disabled  = true;
        sendBtn.textContent = ' Kode Terkirim';
        setTimeout(() => {
            sendBtn.disabled    = false;
            sendBtn.innerHTML   = '<i class="fa-solid fa-envelope"></i> Kirim Ulang Kode';
        }, 60000);
    }
}

window.sendTwoFAEmailCode = sendTwoFAEmailCode;

async function verifyAndEnable2FA() {
    const code = [...document.querySelectorAll('.tfa-otp')].map(i => i.value).join('');
    if (code.length < 6) {
        Indo5Modal.alert({ title: 'Kode Kurang', body: 'Masukkan 6 digit kode yang dikirim ke email.', icon: 'warning', btnText: 'Oke' });
        return;
    }

    const username = getActiveAdminUsername();

    if (usePostgresApi()) {
        const challengeId = sessionStorage.getItem('pending_2fa_setup_challenge');
        if (!challengeId) {
            Indo5Modal.alert({ title: 'Sesi Kedaluwarsa', body: 'Silakan klik "Kirim Kode Email" kembali.', icon: 'warning', btnText: 'Oke' });
            return;
        }

        try {
            const res = await fetch(`${apiBase()}/api/admin/2fa-setup/verify`, {
                method: 'POST',
                headers: adminApiHeaders(),
                body: JSON.stringify({ challenge_id: challengeId, otp: code })
            });
            const data = await res.json();
            if (!res.ok) {
                Indo5Modal.alert({ title: 'Verifikasi Gagal', body: data.error || 'Kode OTP salah.', icon: 'danger', btnText: 'Coba Lagi' });
                return;
            }
            sessionStorage.removeItem('pending_2fa_setup_challenge');
        } catch (err) {
            console.error(err);
            showAdminToast('❌ Gagal verifikasi ke server.');
            return;
        }
    } else {
        const stored   = localStorage.getItem(`${TFA_PENDING_CODE}${username}`);
        const expiry   = parseInt(localStorage.getItem(`${TFA_PENDING_EXPIRY}${username}`) || '0');

        if (!stored) {
            Indo5Modal.alert({ title: 'Belum Ada Kode', body: 'Silakan klik "Kirim Kode Email" terlebih dahulu.', icon: 'warning', btnText: 'Oke' });
            return;
        }
        if (Date.now() > expiry) {
            Indo5Modal.alert({ title: 'Kode Kedaluwarsa', body: 'Kode sudah tidak berlaku. Silakan kirim ulang kode.', icon: 'warning', btnText: 'Oke' });
            localStorage.removeItem(`${TFA_PENDING_CODE}${username}`);
            localStorage.removeItem(`${TFA_PENDING_EXPIRY}${username}`);
            return;
        }
        if (code !== stored) {
            Indo5Modal.alert({ title: 'Kode Salah', body: 'Kode 2FA tidak cocok. Periksa kembali kode di email atau konsol.', icon: 'danger', btnText: 'Coba Lagi' });
            document.querySelectorAll('.tfa-otp').forEach(i => { i.value = ''; });
            document.querySelector('.tfa-otp')?.focus();
            return;
        }
        localStorage.removeItem(`${TFA_PENDING_CODE}${username}`);
        localStorage.removeItem(`${TFA_PENDING_EXPIRY}${username}`);
    }

    // Kode benar
    setTwoFAEnabled(username, true);
    document.querySelectorAll('.tfa-otp').forEach(i => i.value = '');
    load2FAStatus();
    addNotification(`2FA berhasil diaktifkan untuk akun "${username}".`, 'success');
    showAdminToast(' 2FA berhasil diaktifkan!');
}

window.verifyAndEnable2FA = verifyAndEnable2FA;

function disableTwoFA() {
    Indo5Modal.confirm({
        title: 'Nonaktifkan 2FA?',
        body: 'Akun akan kehilangan lapisan keamanan ekstra. Kamu bisa mengaktifkannya kembali kapan saja.',
        icon: 'warning',
        confirmText: 'Ya, Nonaktifkan',
        cancelText: 'Batal',
        onConfirm: () => {
            const username = getActiveAdminUsername();
            setTwoFAEnabled(username, false);
            load2FAStatus();
            addNotification(`2FA dinonaktifkan untuk akun "${username}".`, 'warning');
            showAdminToast('⚠️ 2FA telah dinonaktifkan.');
        }
    });
}
window.disableTwoFA = disableTwoFA;

// ─────────────────────────────────────────────
//  GENERATE / SIMPAN 2FA (QR Code TOTP)
// ─────────────────────────────────────────────
async function saveOrGenerate2FA() {
    const username  = getActiveAdminUsername();
    const qrBox      = document.getElementById('twoFAQrCode');
    const secretEl   = document.getElementById('twoFASecret');
    const otpInputs  = [...document.querySelectorAll('.tfa-otp')];
    const btn        = document.getElementById('btn2FAVerify');
    const apiBase    = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000' : window.location.origin;
    const token      = localStorage.getItem('indo5_token') || localStorage.getItem('admin_session_token') || '';

    const alreadyGenerated = qrBox && qrBox.querySelector('img') !== null;

    if (!alreadyGenerated) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
        try {
            const res = await fetch(apiBase + '/api/admin/generate-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            if (data.success) {
                qrBox.innerHTML = `<img src="${data.qrCode}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" alt="QR 2FA">`;
                if (secretEl) secretEl.textContent = data.secret;
                showAdminToast('QR Code berhasil dibuat. Scan dengan Authenticator, lalu masukkan 6 digit dan klik Simpan Kode.');
            } else {
                showAdminToast('❌ ' + (data.message || 'Gagal membuat QR Code.'));
            }
        } catch(e) {
            showAdminToast('❌ Gagal menghubungi server: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Kode'; }
        }
        return;
    }

    const code = otpInputs.map(i => i.value).join('');
    if (code.length < 6) {
        if (window.Indo5Modal) {
            Indo5Modal.alert({ title: 'Kode Kurang', body: 'Masukkan 6 digit kode dari aplikasi authenticator.', icon: 'warning', btnText: 'Oke' });
        } else {
            showAdminToast('⚠️ Masukkan 6 digit kode dari aplikasi.');
        }
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...'; }
    try {
        const res = await fetch(apiBase + '/api/admin/verify-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ username, code })
        });
        const data = await res.json();
        if (data.success) {
            showAdminToast('✅ 2FA berhasil diaktifkan!');
            if (typeof addNotification === 'function') addNotification(`2FA berhasil diaktifkan untuk akun "${username}".`, 'success');
            otpInputs.forEach(i => i.value = '');
            load2FAStatus();
        } else {
            showAdminToast('❌ ' + (data.message || 'Kode OTP salah!'));
        }
    } catch(e) {
        showAdminToast('❌ Gagal menghubungi server: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Kode'; }
    }
}
window.saveOrGenerate2FA = saveOrGenerate2FA;

// ─────────────────────────────────────────────
//  TOGGLE PASSWORD EYE
// ─────────────────────────────────────────────
function togglePwEye(id, btn) {
    const inp  = document.getElementById(id);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type   = show ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
}
window.togglePwEye = togglePwEye;

// ─────────────────────────────────────────────
//  CLOSE NOTIFICATION PANEL ON OUTSIDE CLICK
// ─────────────────────────────────────────────
function initNotifPanelClose() {
    document.addEventListener('click', (e) => {
        const panel  = document.getElementById('notificationPanel');
        const button = document.getElementById('notificationToggle');
        if (!panel || !button) return;
        if (!panel.classList.contains('hidden') &&
            !panel.contains(e.target) &&
            !button.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
}

// ─────────────────────────────────────────────
//  INIT ON DOM READY
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadAccountInfo();
    initPasswordStrength();
    initOtpInputs();
    load2FAStatus();
    renderNotifications();
    initNotifPanelClose();
});
document.addEventListener("DOMContentLoaded", function () {

    function bindPasswordStrength() {
        if (typeof initPasswordStrength === "function") {
            initPasswordStrength();
        }

        const pw = document.getElementById("newPassword");
        if (!pw) return;

        pw.removeEventListener("input", window.__pwStrengthHandler);

        window.__pwStrengthHandler = function () {

            const fill = document.getElementById("passwordStrengthFill") || document.getElementById("pwStrengthFill");
            const label = document.getElementById("passwordStrengthLabel") || document.getElementById("pwStrengthLabel");

            if (!fill || !label) return;

            let s = 0;

            if (pw.value.length >= 8) s++;
            if (/[A-Z]/.test(pw.value)) s++;
            if (/[a-z]/.test(pw.value)) s++;
            if (/[0-9]/.test(pw.value)) s++;
            if (/[^A-Za-z0-9]/.test(pw.value)) s++;

            const width = [0,20,40,60,80,100][s];

            fill.style.width = width + "%";

            if (s <= 1) {
                fill.style.background="#e53935";
                label.textContent="Password Sangat Lemah";
            }
            else if (s==2){
                fill.style.background="#fb8c00";
                label.textContent="Password Lemah";
            }
            else if (s==3){
                fill.style.background="#fdd835";
                label.textContent="Password Sedang";
            }
            else if (s==4){
                fill.style.background="#43a047";
                label.textContent="Password Kuat";
            }
            else{
                fill.style.background="#00897b";
                label.textContent="Password Sangat Kuat";
            }

        };

        pw.addEventListener("input", window.__pwStrengthHandler);

    }

    bindPasswordStrength();

    setTimeout(bindPasswordStrength,500);

    setTimeout(bindPasswordStrength,1500);

});



