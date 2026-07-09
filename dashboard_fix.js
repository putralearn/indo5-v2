// 
// DASHBOARD FIX - Tambah di akhir admin_dashboard.js
// 

// "" OVERRIDE: GANTI PASSWORD ""
async function handleChangePassword() {
    const current = document.getElementById('currentPassword')?.value || '';
    const newPw = document.getElementById('newPassword')?.value || '';
    const confirm = document.getElementById('confirmPassword')?.value || '';

    if (!current) { showAdminToast('Field wajib diisi.'); return; }
    if (!newPw) { showAdminToast('Field wajib diisi.'); return; }
    if (newPw.length < 8) { showAdminToast('Password minimal 8 karakter.'); return; }
    if (newPw !== confirm) { showAdminToast('Konfirmasi password tidak cocok.'); return; }

    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000' : window.location.origin;
    const token = localStorage.getItem('indo5_token') || localStorage.getItem('admin_session_token') || '';
    const username = localStorage.getItem('admin_username') || localStorage.getItem('adminUsername') || 'admin';

    try {
        const res = await fetch(apiBase + '/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ username, currentPassword: current, newPassword: newPw })
        });
        const data = await res.json();
        if (data.success) {
            showAdminToast('œ Password berhasil diperbarui!');
            ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } else {
            showAdminToast('Œ ' + (data.message || 'Gagal mengubah password!'));
        }
    } catch(e) {
        showAdminToast('Œ Gagal menghubungi server!');
    }
}
window.handleChangePassword = handleChangePassword;

// "" OVERRIDE: TAMBAH AKUN ADMIN ""
async function addAdminAccount() {
    const email    = (document.getElementById('addEmail')?.value || '').trim();
    const username = (document.getElementById('addUsername')?.value || '').trim().toLowerCase();
    const password = document.getElementById('addPassword')?.value || '';
    const confirm  = document.getElementById('addConfirmPassword')?.value || '';
    const enable2fa = document.getElementById('newAdminEnable2FA')?.checked || false;

    if (!username) { showAdminToast('Username wajib diisi.'); return; }
    if (!email) { showAdminToast('Email wajib diisi.'); return; }
    if (!password) { showAdminToast('Password wajib diisi.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAdminToast('Format email tidak valid.'); return; }
    if (username.length < 4) { showAdminToast('Username minimal 4 karakter.'); return; }
    if (password.length < 8) { showAdminToast(' Password minimal 8 karakter!'); return; }
    if (password !== confirm) { showAdminToast('Œ Konfirmasi password tidak cocok!'); return; }

    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000' : window.location.origin;
    const token = localStorage.getItem('indo5_token') || localStorage.getItem('admin_session_token') || '';

    const btn = document.querySelector('[onclick="submitTambahAdmin()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }

    try {
        const res = await fetch(apiBase + '/api/admin/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ email, username, password, enable2fa })
        });
        const data = await res.json();

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Daftarkan Akun Admin'; }

        if (!data.success) {
            showAdminToast('Œ ' + (data.message || 'Gagal membuat akun!'));
            return;
        }

        if (enable2fa && data.totpSecret) {
            const issuer = 'Indo5Admin';
            const otpUri = 'otpauth://totp/' + issuer + ':' + username + '?secret=' + data.totpSecret + '&issuer=' + issuer + '&algorithm=SHA1&digits=6&period=30';
            const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(otpUri);

            const qrModal = document.createElement('div');
            qrModal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);z-index:99999;align-items:center;justify-content:center;';
            qrModal.innerHTML = `
                <div style="background:#fff;border-radius:24px;padding:32px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:zoomIn 0.3s ease;">
                    <style>@keyframes zoomIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}</style>
                    <div style="font-size:2.5rem;margin-bottom:8px;"></div>
                    <h3 style="font-size:1.1rem;font-weight:800;color:#111;margin-bottom:4px;">Akun <span style="color:#e53935;">${username}</span> Berhasil Dibuat!</h3>
                    <p style="font-size:0.82rem;color:#666;margin-bottom:16px;">Scan QR code ini dengan <strong>Google Authenticator</strong> atau <strong>Authy</strong> untuk aktifkan 2FA.</p>
                    <div style="background:#f9f9f9;border-radius:16px;padding:16px;margin-bottom:14px;display:inline-block;">
                        <img src="${qrUrl}" style="width:200px;height:200px;border-radius:8px;" alt="QR Code 2FA">
                    </div>
                    <p style="font-size:0.75rem;color:#888;margin-bottom:6px;">Atau masukkan kode manual:</p>
                    <code style="font-size:0.82rem;font-weight:700;background:#f5f5f5;padding:8px 16px;border-radius:8px;letter-spacing:2px;display:block;margin-bottom:16px;word-break:break-all;">${data.totpSecret}</code>
                    <div style="background:#fff3cd;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:0.78rem;color:#856404;text-align:left;">
                        ⚠ <strong>Simpan kode manual ini!</strong> Tidak bisa dilihat lagi setelah ditutup.
                    </div>
                    <p style="font-size:0.8rem;color:#555;margin-bottom:20px;">
                        <strong>Login dengan:</strong><br>
                        Email: <strong>${email}</strong><br>
                        Username: <strong>${username}</strong>
                    </p>
                    <button onclick="this.closest('div[style*=fixed]').remove()"
                        style="background:#e53935;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-weight:700;font-size:0.95rem;cursor:pointer;width:100%;transition:opacity 0.2s;"
                        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        Sudah Scan, Tutup
                    </button>
                </div>`;
            document.body.appendChild(qrModal);
        } else {
            showAdminToast('œ Akun ' + username + ' berhasil dibuat!');
        }

        ['addEmail','addUsername','addPassword','addConfirmPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        addNotification('Akun admin baru "' + username + '" berhasil ditambahkan.', 'success');

    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Daftarkan Akun Admin'; }
        showAdminToast('Œ Gagal menghubungi server: ' + e.message);
    }
}
window.addAdminAccount = addAdminAccount;
window.submitTambahAdmin = function() { addAdminAccount(); };

// "" OVERRIDE: ANIMASI ZOOM MODAL ""
const _origShowConfirm = window.Indo5Modal?.confirm;
if (window.Indo5Modal) {
    const origConfirm = Indo5Modal.confirm.bind(Indo5Modal);
    Indo5Modal.confirm = function(opts) {
        origConfirm(opts);
        setTimeout(() => {
            const box = document.getElementById('customConfirmBox');
            if (box) {
                box.style.animation = 'zoomInModal 0.25s cubic-bezier(.34,1.56,.64,1)';
                if (!document.getElementById('zoomModalStyle')) {
                    const s = document.createElement('style');
                    s.id = 'zoomModalStyle';
                    s.textContent = '@keyframes zoomInModal{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}';
                    document.head.appendChild(s);
                }
            }
        }, 10);
    };
}

// "" FIX: EMOJI NOTIFIKASI ""
const _origShowAdminToast = window.showAdminToast;
function _getApiBase() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000' : window.location.origin;
}
function _getToken() {
    return localStorage.getItem('indo5_token') || localStorage.getItem('admin_session_token') || '';
}

window.showAdminToast = function(msg, duration) {
    duration = duration || 3200;
    var toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;padding:13px 22px;border-radius:14px;color:#fff;font-size:0.9rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.22);transform:translateY(90px);opacity:0;transition:transform 0.4s cubic-bezier(.34,1.56,.64,1),opacity 0.3s;max-width:340px;line-height:1.5;pointer-events:none;display:flex;align-items:center;gap:12px;letter-spacing:0.01em;';
        document.body.appendChild(toast);
    }
    // Bersihkan karakter non-latin
    var clean = '';
    for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        if (c < 128) clean += msg[i];
    }
    clean = clean.replace(/\s+/g, ' ').trim();
    var ml = clean.toLowerCase();

    // Icon unicode (aman, tidak kena encoding)
    var iconMap = {
        ok:     '\u2714',  // 
        err:    '\u2718',  // 
        warn:   '\u25B2',  // 
        info:   '\u25CF',  // 
        trash:  '\u25A0',  // 
        shield: '\u25C6',  // 
    };
    var icon = iconMap.info;
    var bg = 'linear-gradient(135deg,#0f2044,#1a3a6b)';

    if (ml.includes('berhasil') || ml.includes('aktif') || ml.includes('dibuat') || ml.includes('diperbarui') || ml.includes('diaktifkan')) {
        icon = iconMap.ok; bg = 'linear-gradient(135deg,#0a3d1f,#166534)';
        if (ml.includes('referensi')) bg = 'linear-gradient(135deg,#0f2044,#1a3a6b)';
        else if (ml.includes('pelamar')) bg = 'linear-gradient(135deg,#7c2d12,#ea580c)';
        else if (ml.includes('blacklist')) bg = 'linear-gradient(135deg,#450a0a,#991b1b)';
        else if (ml.includes('export') || ml.includes('data diri')) bg = 'linear-gradient(135deg,#0a3d1f,#166534)';
    } else if (ml.includes('gagal') || ml.includes('error') || ml.includes('salah') || ml.includes('tidak cocok') || ml.includes('invalid')) {
        icon = iconMap.err; bg = 'linear-gradient(135deg,#450a0a,#991b1b)';
    } else if (ml.includes('wajib') || ml.includes('masukkan') || ml.includes('kurang') || ml.includes('diisi') || ml.includes('terdaftar') || ml.includes('sudah ada')) {
        icon = iconMap.warn; bg = 'linear-gradient(135deg,#431407,#c2410c)';
    } else if (ml.includes('hapus') || ml.includes('dihapus') || ml.includes('bersih')) {
        icon = iconMap.trash; bg = 'linear-gradient(135deg,#1c1917,#44403c)';
    } else if (ml.includes('2fa') || ml.includes('blokir') || ml.includes('qr') || ml.includes('nonaktif')) {
        icon = iconMap.shield; bg = 'linear-gradient(135deg,#2e1065,#6d28d9)';
    }

    toast.innerHTML = '<span style="font-size:1rem;opacity:0.9">' + icon + '</span><span>' + clean + '</span>';
    toast.style.background = bg;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
        toast.style.transform = 'translateY(90px)';
        toast.style.opacity = '0';
    }, duration);
};

//  LOAD DAFTAR ADMIN 
async function loadAdminUserList() {
    const tbody = document.getElementById('adminUserListBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="padding:0;">' + '<div style="padding:20px;text-align:center;"><p style="color:#888;font-size:0.85rem;margin-bottom:10px;">Memuat data...</p><div style="width:200px;height:4px;background:#f3f4f6;border-radius:999px;overflow:hidden;margin:0 auto;"><div style="height:100%;background:linear-gradient(90deg,#b71c1c,#ef4444);border-radius:999px;animation:loadbar 1s ease-in-out infinite alternate;width:40%;"></div></div></div>' + '</td></tr>';
    await new Promise(function(r){setTimeout(r,1500)});
    const myUsername = (typeof getActiveAdminUsername === 'function') ? getActiveAdminUsername() : localStorage.getItem('admin_username') || '';
    try {
        const res = await fetch(_getApiBase() + '/api/admin/users', {
            headers: { 'Authorization': 'Bearer ' + _getToken() }
        });
        const data = await res.json();
        if (!data.success) { tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;text-align:center;color:red;">Gagal: ' + (data.message||'error') + '</td></tr>'; return; }
        if (!data.users || data.users.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;text-align:center;">Tidak ada akun.</td></tr>'; return; }
        const userList = data.data || data.users || data || [];
        if (!userList.length) { tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-sub)">Tidak ada akun admin.</td></tr>'; return; }
        tbody.innerHTML = userList.map(function(u) {
            var isMe = u.username === myUsername;
            var statusBadge = u.is_blocked
                ? '<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Diblokir</span>'
                : '<span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Aktif</span>';
            var twoFaBadge = u.totp_enabled
                ? '<span style="color:#16a34a;font-size:0.8rem;"> Aktif</span>'
                : '<span style="color:#9ca3af;font-size:0.8rem;"></span>';
            var created = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-';
            var meLabel = isMe ? ' <span style="font-size:0.7rem;color:#9ca3af;">(Anda)</span>' : '';
            var blockBtn = '';
            var delBtn = '';
            if (!isMe) {
                var btnBase = 'display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;border-radius:9px;cursor:pointer;font-size:0.9rem;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 2px 6px rgba(0,0,0,0.08);';
                if (u.is_blocked) {
                    blockBtn = '<button onclick="blockAdminUser(\'' + u.username + '\',false)" title="Buka Blokir" style="' + btnBase + 'background:#dcfce7;color:#16a34a;margin-right:6px;" onmouseover="this.style.transform=\'scale(1.13)\';this.style.boxShadow=\'0 4px 12px rgba(22,163,74,0.3)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.08)\'"><i class="fa-solid fa-lock-open"></i></button>';
                } else {
                    blockBtn = '<button onclick="blockAdminUser(\'' + u.username + '\',true)" title="Blokir Akun" style="' + btnBase + 'background:#fef9ec;color:#d97706;margin-right:6px;" onmouseover="this.style.transform=\'scale(1.13)\';this.style.boxShadow=\'0 4px 12px rgba(217,119,6,0.3)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.08)\'"><i class="fa-solid fa-ban"></i></button>';
                }
                delBtn = '<button onclick="deleteAdminUser(\'' + u.username + '\')" title="Hapus Akun" style="' + btnBase + 'background:#fee2e2;color:#dc2626;" onmouseover="this.style.transform=\'scale(1.13)\';this.style.boxShadow=\'0 4px 12px rgba(220,38,38,0.3)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.08)\'"><i class="fa-solid fa-trash"></i></button>';
            }
            return '<tr style="border-bottom:1px solid #f3f4f6;">' +
                '<td style="padding:10px 12px;font-weight:600;">' + u.username + meLabel + '</td>' +
                '<td style="padding:10px 12px;color:#6b7280;">' + (u.email||'-') + '</td>' +
                '<td style="padding:10px 12px;color:#6b7280;">' + created + '</td>' +
                '<td style="padding:10px 12px;">' + twoFaBadge + '</td>' +
                '<td style="padding:10px 12px;">' + statusBadge + '</td>' +
                '<td style="padding:10px 12px;">' + blockBtn + delBtn + '</td>' +
                '</tr>';
        }).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;text-align:center;color:red;">Error: ' + e.message + '</td></tr>';
    }
}
window.loadAdminUserList = loadAdminUserList;

//  BLOKIR / BUKA BLOKIR ADMIN 
async function blockAdminUser(username, block) {
    var endpoint = block ? '/api/admin/block' : '/api/admin/unblock';
    try {
        const res = await fetch(_getApiBase() + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getToken() },
            body: JSON.stringify({ targetUsername: username })
        });
        const data = await res.json();
        if (data.success) {
            showAdminToast(block ? ' Akun ' + username + ' diblokir.' : ' Akun ' + username + ' dibuka blokirnya.');
            loadAdminUserList();
        } else {
            showAdminToast(' ' + (data.message||'Gagal.'));
        }
    } catch(e) { showAdminToast(' Error: ' + e.message); }
}
window.blockAdminUser = blockAdminUser;

//  HAPUS AKUN ADMIN 
async function deleteAdminUser(username) {
    if (!window.Indo5Modal) { if (!confirm('Yakin hapus akun ' + username + '? Tindakan ini tidak bisa dibatalkan.')) return; }
    else {
        Indo5Modal.confirm({
            title: 'Hapus Akun Admin?',
            body: 'Akun <strong>' + username + '</strong> akan dihapus permanen dan tidak bisa dipulihkan.',
            icon: 'danger', confirmText: 'Ya, Hapus', cancelText: 'Batal',
            onConfirm: function() { _doDeleteAdmin(username); }
        });
        return;
    }
    _doDeleteAdmin(username);
}
async function _doDeleteAdmin(username) {
    try {
        const res = await fetch(_getApiBase() + '/api/admin/users/' + encodeURIComponent(username), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getToken() }
        });
        const data = await res.json();
        if (data.success) {
            showAdminToast(' Akun ' + username + ' berhasil dihapus.');
            loadAdminUserList();
        } else {
            showAdminToast(' ' + (data.message||'Gagal menghapus.'));
        }
    } catch(e) { showAdminToast(' Error: ' + e.message); }
}
window.deleteAdminUser = deleteAdminUser;

//  LOAD RIWAYAT LOGIN 
async function loadLoginHistory() {
    var tbody = document.getElementById('loginHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="padding:0;">' + '<div style="padding:20px;text-align:center;"><p style="color:#888;font-size:0.85rem;margin-bottom:10px;">Memuat data...</p><div style="width:200px;height:4px;background:#f3f4f6;border-radius:999px;overflow:hidden;margin:0 auto;"><div style="height:100%;background:linear-gradient(90deg,#b71c1c,#ef4444);border-radius:999px;animation:loadbar 1s ease-in-out infinite alternate;width:40%;"></div></div></div>' + '</td></tr>';
    await new Promise(function(r){setTimeout(r,1500)});
    try {
        const res = await fetch(_getApiBase() + '/api/admin/login-history', {
            headers: { 'Authorization': 'Bearer ' + _getToken() }
        });
        const data = await res.json();
        if (!data.success) { tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;color:red;">Gagal: ' + (data.message||'error') + '</td></tr>'; return; }
        if (!data.history || data.history.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;">Belum ada riwayat login.</td></tr>'; return; }
        const histList = data.data || data.history || data || [];
        if (!histList.length) { tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-sub)">Belum ada riwayat login.</td></tr>'; return; }
        tbody.innerHTML = histList.map(function(h) {
            var dt = h.login_at ? new Date(h.login_at).toLocaleString('id-ID') : '-';
            return '<tr style="border-bottom:1px solid #f3f4f6;">' +
                '<td style="padding:9px 12px;font-weight:600;">' + (h.username||'-') + '</td>' +
                '<td style="padding:9px 12px;color:#6b7280;">' + (h.email||'-') + '</td>' +
                '<td style="padding:9px 12px;"><span style="background:#f3f4f6;padding:2px 8px;border-radius:6px;font-size:0.78rem;">Password</span></td>' +
                '<td style="padding:9px 12px;color:#6b7280;">' + dt + '</td>' +
                '<td style="padding:9px 12px;color:#9ca3af;font-size:0.8rem;">' + (h.ip_address||'-') + '</td>' +
                '</tr>';
        }).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;color:red;">Error: ' + e.message + '</td></tr>';
    }
}
window.loadLoginHistory = loadLoginHistory;

//  PASSWORD STRENGTH UNTUK FORM TAMBAH ADMIN 
function updatePwStrength(e) {
    var pw = e.target.value;
    var bar = document.getElementById('pwStrengthBar');
    var lbl = document.getElementById('pwStrengthLabel');
    if (!bar || !lbl) return;
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    var map = [
        { w:'0%',   bg:'transparent', txt:'',              color:'#9ca3af' },
        { w:'25%',  bg:'#ef4444',     txt:'Lemah',         color:'#ef4444' },
        { w:'50%',  bg:'#f59e0b',     txt:'Cukup',         color:'#f59e0b' },
        { w:'75%',  bg:'#3b82f6',     txt:'Kuat',          color:'#3b82f6' },
        { w:'100%', bg:'#16a34a',     txt:'Sangat Kuat ', color:'#16a34a' }
    ];
    bar.style.width = map[score].w;
    bar.style.background = map[score].bg;
    lbl.textContent = map[score].txt;
    lbl.style.color = map[score].color;
}

//  REKAM LOGIN & AUTO-LOAD SAAT BUKA PENGATURAN 
(function() {
    var recorded = sessionStorage.getItem('_login_rec');
    if (!recorded) {
        sessionStorage.setItem('_login_rec', '1');
        setTimeout(function() {
            var uname = localStorage.getItem('admin_username') || localStorage.getItem('adminUsername') || '';
            var email = localStorage.getItem('admin_email') || '-';
            if (!uname) return;
            fetch(_getApiBase() + '/api/admin/record-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getToken() },
                body: JSON.stringify({ username: uname, email: email })
            }).catch(function(){});
        }, 2000);
    }

    document.addEventListener('DOMContentLoaded', function() {
        var pwInput = document.getElementById('addPassword');
        if (pwInput) pwInput.addEventListener('input', updatePwStrength);

        setTimeout(function() {
            loadAdminUserList();
            loadLoginHistory();
        }, 2500);
    });
})();
//  OVERRIDE deleteEntry  call API beneran ke database 

//  GENERATE QR CODE 2FA 
async function generateQRCode2FA() {
    const username = (typeof getActiveAdminUsername === 'function') ? getActiveAdminUsername() : localStorage.getItem('admin_username') || 'admin';
    const qrBox    = document.getElementById('twoFAQrCode');
    const secretEl = document.getElementById('twoFASecret');
    const btn      = document.getElementById('btn2FAGenerate');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuat QR...'; }
    try {
        const res  = await fetch(_getApiBase() + '/api/admin/generate-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getToken() },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (data.success) {
            if (qrBox) qrBox.innerHTML = '<img src="' + data.qrCode + '" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" alt="QR 2FA">';
            if (secretEl) secretEl.textContent = data.secret;
            showAdminToast('QR berhasil dibuat. Scan dengan Authenticator, lalu masukkan 6 digit.');
        } else {
            showAdminToast('Gagal membuat QR Code. Coba lagi.');
        }
    } catch(e) {
        showAdminToast('Koneksi ke server gagal. Periksa backend.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Generate QR'; }
    }
}
window.generateQRCode2FA = generateQRCode2FA;

//  SIMPAN KODE 2FA 
window.saveOrGenerate2FA = async function() {
    const username  = (typeof getActiveAdminUsername === 'function') ? getActiveAdminUsername() : localStorage.getItem('admin_username') || 'admin';
    const otpInputs = [...document.querySelectorAll('.tfa-otp')];
    const btn       = document.getElementById('btn2FAVerify');
    const qrBox     = document.getElementById('twoFAQrCode');
    if (!qrBox || !qrBox.querySelector('img')) {
        showAdminToast('Klik Generate QR terlebih dahulu sebelum menyimpan.');
        return;
    }
    const code = otpInputs.map(function(i) { return i.value; }).join('');
    if (code.length < 6) { showAdminToast('Masukkan 6 digit kode dari aplikasi Authenticator.'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...'; }
    try {
        const res  = await fetch(_getApiBase() + '/api/admin/verify-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getToken() },
            body: JSON.stringify({ username, code })
        });
        const data = await res.json();
        if (data.success) {
            showAdminToast('2FA berhasil diaktifkan untuk akun ini.');
            otpInputs.forEach(function(i) { i.value = ''; });
            if (typeof load2FAStatus === 'function') load2FAStatus();
        } else {
            showAdminToast('Kode OTP tidak valid atau sudah kedaluwarsa.');
        }
    } catch(e) {
        showAdminToast('Koneksi ke server gagal. Periksa backend.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Kode'; }
    }
};

window.deleteEntry = function(idx) {
    var item = (typeof dashboardData !== 'undefined') ? dashboardData[idx] : null;
    if (!item) { showAdminToast(' Data tidak ditemukan.'); return; }
    var name = item.name || 'data ini';
    if (window.Indo5Modal) {
        Indo5Modal.confirm({
            title: 'Hapus Data?',
            body: 'Data <strong>' + name + '</strong> akan dihapus permanen dari database.',
            icon: 'danger', confirmText: 'Ya, Hapus', cancelText: 'Batal',
            onConfirm: function() { _doDeleteSubmission(idx, item, name); }
        });
    } else {
        if (confirm('Hapus data ' + name + '? Tindakan ini permanen!')) {
            _doDeleteSubmission(idx, item, name);
        }
    }
};

async function _doDeleteSubmission(idx, item, name) {
    try {
        var url = _getApiBase() + '/api/submissions/' + encodeURIComponent(item.id) + '?type=' + encodeURIComponent(item.type || '');
        var res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + _getToken() }
        });
        var data = await res.json();
        if (data.success) {
            if (typeof dashboardData !== 'undefined') {
                dashboardData.splice(idx, 1);
            }
            if (typeof renderTable === 'function') {
                renderTable(document.getElementById('searchInput')?.value || '');
            }
            if (typeof updateCounters === 'function') updateCounters();
            showAdminToast('\uD83D\uDDD1\uFE0F Data ' + name + ' berhasil dihapus.');
            if (typeof addNotification === 'function') addNotification('Data ' + name + ' berhasil dihapus.', 'danger');
        } else {
            showAdminToast('\u274C Gagal hapus: ' + (data.message || 'Server error'));
        }
    } catch(e) {
        showAdminToast('\u274C Error: ' + e.message);
    }
}
window._doDeleteSubmission = _doDeleteSubmission;

//  OVERRIDE clearAllData  call API delete all 
window.clearAllData = function() {
    var filterType = (typeof currentFilter !== 'undefined' && currentFilter !== 'all') ? currentFilter : null;
    var confirmMsg = filterType
        ? 'Hapus SEMUA data kategori "' + filterType + '"? Tidak bisa dipulihkan!'
        : 'Hapus SEMUA data dari SEMUA kategori? Tidak bisa dipulihkan!';
    if (window.Indo5Modal) {
        Indo5Modal.confirm({
            title: 'Hapus Semua Data?',
            body: confirmMsg,
            icon: 'danger', confirmText: 'Ya, Hapus Semua', cancelText: 'Batal',
            onConfirm: function() { _doDeleteAll(filterType); }
        });
    } else {
        if (confirm(confirmMsg)) _doDeleteAll(filterType);
    }
};

async function _doDeleteAll(filterType) {
    try {
        var url = _getApiBase() + '/api/submissions' + (filterType ? '?type=' + encodeURIComponent(filterType) : '');
        var res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + _getToken() }
        });
        var data = await res.json();
        if (data.success) {
            if (typeof dashboardData !== 'undefined') {
                if (filterType) {
                    for (var i = dashboardData.length - 1; i >= 0; i--) {
                        if (dashboardData[i].type === filterType) dashboardData.splice(i, 1);
                    }
                } else {
                    dashboardData.length = 0;
                }
            }
            if (typeof renderTable === 'function') renderTable('');
            if (typeof updateCounters === 'function') updateCounters();
            showAdminToast('\uD83D\uDDD1\uFE0F Semua data formulir berhasil dihapus.');
            if (typeof addNotification === 'function') addNotification('Semua data formulir telah dihapus.', 'danger');
        } else {
            showAdminToast('\u274C Gagal: ' + (data.message || 'Server error'));
        }
    } catch(e) {
        showAdminToast('\u274C Error: ' + e.message);
    }
}
    window._doDeleteAll = _doDeleteAll;
