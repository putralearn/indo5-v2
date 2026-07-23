const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://avid-widget-revoke.ngrok-free.dev';
	
// ── THEME ──
function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
}
applyTheme(localStorage.getItem('theme') || 'light');
function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

// ── EYE TOGGLE ──
function togglePassword(id, btn) {
    const el = document.getElementById(id), hide = el.type === 'password';
    el.type = hide ? 'text' : 'password';
}

// ── TOAST ──
function showToast(msg, type = 'info') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── REGISTER ──
async function register() {
    const username = document.getElementById('regUsername')?.value.trim();
    const pass = document.getElementById('regPassword')?.value;
    const confirm = document.getElementById('regPasswordConfirm')?.value;
    const emailWrapVisible = document.getElementById('emailWrap')?.style.display !== 'none';
    const email = emailWrapVisible ? document.getElementById('regEmail')?.value.trim() : '';
    const phone = !emailWrapVisible ? document.getElementById('regPhone')?.value.trim() : '';

    if (!username) { showToast('Username wajib diisi', 'error'); return; }
    if (!email && !phone) { showToast('Email atau nomor telepon wajib diisi', 'error'); return; }
    if (!pass || pass.length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }
    if (pass !== confirm) { showToast('Password tidak cocok', 'error'); return; }

    try {
        const res = await fetch(API_BASE + '/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email: email || null, phone: phone || null, password: pass })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Registrasi berhasil! Silakan login.', 'success');
            setTimeout(() => { window.location.href = 'loginuser.html'; }, 1800);
        } else {
            showToast(data.message || 'Registrasi gagal', 'error');
        }
    } catch(e) {
        showToast('Gagal menghubungi server', 'error');
    }
}

// ── LOGIN ──
async function login() {
    const emailWrap = document.getElementById('loginEmailWrap');
    const isEmailMode = !emailWrap || emailWrap.style.display !== 'none';
    const emailVal = document.getElementById('username')?.value.trim();
    const phoneVal = document.getElementById('loginPhone')?.value.trim();
    const identifier = isEmailMode ? emailVal : phoneVal;
    const pass = document.getElementById('password')?.value;
    const remember = document.getElementById('rememberMe')?.checked;

    if (!identifier) { showToast(isEmailMode ? 'Email wajib diisi' : 'Nomor telepon wajib diisi', 'error'); return; }
    if (!pass) { showToast('Password wajib diisi', 'error'); return; }

    const body = isEmailMode
        ? { email: identifier, password: pass }
        : { phone: identifier, password: pass };

    try {
        const res = await fetch(API_BASE + '/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userName', data.username);
            localStorage.setItem('userEmail', data.email || '');
            localStorage.setItem('userPhone', data.phone || '');
            localStorage.setItem('userToken', data.token);
            if (remember) localStorage.setItem('rememberUser', identifier);
            else localStorage.removeItem('rememberUser');
            showToast('Login berhasil!', 'success');
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1200);
        } else {
            showToast(data.message || 'Email/nomor atau password salah', 'error');
        }
    } catch(e) {
        showToast('Gagal menghubungi server', 'error');
    }
}

// ── AUTO-FILL REMEMBER ME ──
window.addEventListener('DOMContentLoaded', () => {
    const remembered = localStorage.getItem('rememberUser');
    const usernameField = document.getElementById('username');
    const rememberBox = document.getElementById('rememberMe');
    if (remembered && usernameField) {
        usernameField.value = remembered;
        if (rememberBox) rememberBox.checked = true;
    }
});

// ── LOGIN MODE TOGGLE ──
function switchLoginMode(mode) {
    const emailWrap = document.getElementById('loginEmailWrap');
    const phoneWrap = document.getElementById('loginPhoneWrap');
    const emailBtn = document.getElementById('loginToggleEmail');
    const phoneBtn = document.getElementById('loginTogglePhone');
    if (mode === 'email') {
        if (emailWrap) emailWrap.style.display = '';
        if (phoneWrap) phoneWrap.style.display = 'none';
        if (emailBtn) { emailBtn.style.background = 'var(--primary,#b71c1c)'; emailBtn.style.color = '#fff'; emailBtn.style.borderColor = 'var(--primary,#b71c1c)'; }
        if (phoneBtn) { phoneBtn.style.background = 'transparent'; phoneBtn.style.color = 'inherit'; phoneBtn.style.borderColor = '#ccc'; }
    } else {
        if (emailWrap) emailWrap.style.display = 'none';
        if (phoneWrap) phoneWrap.style.display = '';
        if (phoneBtn) { phoneBtn.style.background = 'var(--primary,#b71c1c)'; phoneBtn.style.color = '#fff'; phoneBtn.style.borderColor = 'var(--primary,#b71c1c)'; }
        if (emailBtn) { emailBtn.style.background = 'transparent'; emailBtn.style.color = 'inherit'; emailBtn.style.borderColor = '#ccc'; }
    }
}
