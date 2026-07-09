const ADMIN_ACCOUNTS_KEY = 'admin_accounts';
const ADMIN_CREDENTIALS = {
    admin: {
        password: 'Indo5@2026!',
        email: 'admin@indo5.com',
        role: 'Administrator'
    },
    indo5admin: {
        password: 'Indolima@2026!',
        email: 'indo5admin@indo5.com',
        role: 'Administrator'
    },
};

function usePostgresApi() {
    const a = window.__INDO5_API__;
    return !!(a && a.usePostgres && String(a.baseUrl || '').trim());
}

function apiBase() {
    return String(window.__INDO5_API__.baseUrl || '').replace(/\/$/, '');
}

function getDeviceId() {
    let id = localStorage.getItem('indo5_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('indo5_device_id', id);
    }
    return id;
}


const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_HOURS = 8;
const OTP_TTL = 5 * 60 * 1000;

let attemptCount = parseInt(sessionStorage.getItem('loginAttempts') || '0');
let lockedUntil = parseInt(sessionStorage.getItem('lockedUntil') || '0');
let otpTimer = null;
let otpSeconds = 60;
let pendingUser = null;

function getStoredAdminAccounts() {
    try {
        const stored = JSON.parse(localStorage.getItem(ADMIN_ACCOUNTS_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (_) {
        return [];
    }
}

function getBuiltInAdminAccounts() {
    return Object.entries(ADMIN_CREDENTIALS).map(([username, account]) => ({
        username,
        email: account.email,
        password: account.password,
        role: account.role
    }));
}

function getAdminCredentialsStore() {
    try {
        return JSON.parse(localStorage.getItem('admin_credentials') || '{}');
    } catch (_) {
        return {};
    }
}

function getCurrentStoredCredentialAccount() {
    const creds = getAdminCredentialsStore();
    if (creds.username && creds.email && creds.password) {
        return [creds];
    }
    return [];
}

function getAllAdminAccounts() {
    return [...getStoredAdminAccounts(), ...getCurrentStoredCredentialAccount(), ...getBuiltInAdminAccounts()];
}

function findAdminAccount(username, email) {
    return getAllAdminAccounts().find(acc => acc.username?.toLowerCase() === username.toLowerCase() && acc.email?.toLowerCase() === email.toLowerCase());
}

function isTwoFAEnabled(username) {
    // Cek dari key yang sama dengan dashboard settings
    return localStorage.getItem('admin_2fa_enabled') === 'true';
}

function getTwoFASecret(username) {
    return localStorage.getItem('admin_2fa_secret') || '';
}

// â”€â”€ TOTP RFC 6238 â”€â”€
function base32ToBytes(b32) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, val = 0; const out = [];
    for (const c of b32.toUpperCase().replace(/=+$/,'')) {
        const i = alpha.indexOf(c); if (i<0) continue;
        val = (val<<5)|i; bits+=5;
        if (bits>=8) { out.push((val>>>(bits-8))&255); bits-=8; }
    }
    return new Uint8Array(out);
}

async function getTOTPCode(secret, step) {
    step = step !== undefined ? step : Math.floor(Date.now()/1000/30);
    const key = await crypto.subtle.importKey(
        'raw', base32ToBytes(secret),
        {name:'HMAC', hash:'SHA-1'}, false, ['sign']
    );
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint32(4, step, false);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const off = sig[19] & 0xf;
    return (((sig[off]&0x7f)<<24|sig[off+1]<<16|sig[off+2]<<8|sig[off+3])%1000000)
        .toString().padStart(6,'0');
}

async function verifyTOTPCode(secret, input) {
    if (!secret) return false;
    const now = Math.floor(Date.now()/1000/30);
    for (let d = -1; d <= 1; d++) {
        if (await getTOTPCode(secret, now+d) === input) return true;
    }
    return false;
}

function showAlert(msg, type = 'error') {
    const box = document.getElementById('alertBox');
    const msgEl = document.getElementById('alertMsg');
    box.className = `alert-box alert-${type} show`;
    msgEl.textContent = msg;
}

function hideAlert() {
    document.getElementById('alertBox').classList.remove('show');
}

function toggleEye(id, btn) {
    const inp = document.getElementById(id);
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    btn.querySelector('i').className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
}

function isLocked() {
    return Date.now() < lockedUntil;
}

function clearExpiredLockout() {
    lockedUntil = parseInt(sessionStorage.getItem('lockedUntil') || '0');
    if (lockedUntil && Date.now() >= lockedUntil) {
        sessionStorage.removeItem('lockedUntil');
        sessionStorage.removeItem('loginAttempts');
        attemptCount = 0;
        lockedUntil = 0;
    }
}

function updateLockoutTimerDisplay() {
    const timer = document.getElementById('lockoutTimer');
    if (!timer) return;

    if (isLocked()) {
        const remaining = Math.max(0, lockedUntil - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
        timer.textContent = `Akun terkunci sementara. Coba lagi setelah ${minutes}:${seconds} menit.`;
        timer.style.display = 'block';
        return;
    }

    timer.style.display = 'none';
}

function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleStep1() {
    hideAlert();

    clearExpiredLockout();
    updateLockoutTimerDisplay();

    if (isLocked()) {
        showAlert('Akun terkunci sementara. Coba lagi nanti.');
        return;
    }

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !username || !password) {
        showAlert('Email, username, dan password wajib diisi.');
        return;
    }

    if (usePostgresApi()) {
        try {
            const res = await fetch(`${apiBase()}/api/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, device_id: getDeviceId() })
            });

            const data = await res.json();
            if (!res.ok) {
                showAlert(data.error || 'Login gagal.');
                return;
            }

            pendingUser = { username, email, challenge_id: data.challenge_id };
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            startOtpTimer();
            showAlert(`Kode 2FA telah dikirim ke ${email}.`, 'success');
            return;
        } catch (err) {
            console.error(err);
            showAlert('Gagal menghubungi server.');
            return;
        }
    }

    const account = findAdminAccount(username, email);
    if (!account || account.password !== password) {
        attemptCount++;
        sessionStorage.setItem('loginAttempts', attemptCount);
        showAlert('Email, username, atau password salah.');
        if (attemptCount >= MAX_ATTEMPTS) {
            lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
            sessionStorage.setItem('lockedUntil', lockedUntil);
            showAlert(`Terlalu banyak percobaan. Coba lagi setelah ${LOCKOUT_MINUTES} menit.`);
        }
        return;
    }

    pendingUser = { username, email, role: account.role || 'Administrator' };
    if (isTwoFAEnabled(username)) {
        // Pakai TOTP dari HP - langsung tampil step 2 tanpa kirim email
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        startOtpTimer();
        // Update teks step 2
        const step2desc = document.querySelector('#step2 p');
        if (step2desc) step2desc.textContent = 'Masukkan kode 6 digit dari Google Authenticator / Authy di HP kamu';
        document.querySelectorAll('.otp-inp')[0]?.focus();
        return;
    }

    completeLogin(username, email, account.role || 'Administrator');
}


function startOtpTimer() {
    otpSeconds = 60;
    clearInterval(otpTimer);
    otpTimer = setInterval(() => {
        otpSeconds--;
        document.getElementById('otpCountdown').textContent = otpSeconds;
        if (otpSeconds <= 0) {
            clearInterval(otpTimer);
            showAlert('Kode OTP kedaluwarsa. Silakan kirim ulang kode jika perlu.');
        }
    }, 1000);
}

async function handleStep2() {
    hideAlert();

    const code = [...document.querySelectorAll('.otp-inp')].map(i => i.value).join('');

    if (code.length < 6) {
        showAlert('Masukkan 6 digit kode OTP.');
        return;
    }
    if (!pendingUser) {
        showAlert('Silakan login kembali terlebih dahulu.');
        return;
    }

    if (usePostgresApi()) {
        try {
            const res = await fetch(`${apiBase()}/api/auth/admin/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    challenge_id: pendingUser.challenge_id, 
                    otp: code,
                    device_id: getDeviceId()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                showAlert(data.error || 'OTP salah atau kedaluwarsa.');
                return;
            }

            clearInterval(otpTimer);
            completeLogin(pendingUser.username, pendingUser.email, 'Administrator');
            return;
        } catch (err) {
            console.error(err);
            showAlert('Gagal verifikasi ke server.');
            return;
        }
    }

    // Verifikasi TOTP dari HP
    const secret = getTwoFASecret(pendingUser.username);
    if (!secret) {
        showAlert('Secret 2FA tidak ditemukan. Nonaktifkan & aktifkan ulang 2FA.');
        return;
    }

    const btn2 = document.getElementById('btnStep2');
    btn2.disabled = true;
    btn2.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';

    verifyTOTPCode(secret, code).then(valid => {
        if (!valid) {
            showAlert('Kode 2FA salah! Pastikan waktu HP sinkron dan coba lagi.');
            btn2.disabled = false;
            btn2.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verifikasi & Masuk';
            document.querySelectorAll('.otp-inp').forEach(i => i.value = '');
            document.querySelectorAll('.otp-inp')[0]?.focus();
            return;
        }
        clearInterval(otpTimer);
        completeLogin(pendingUser.username, pendingUser.email, pendingUser.role);
    });
}


function completeLogin(username, email, role) {
    localStorage.setItem('admin_logged_in', 'true');
    localStorage.setItem('admin_session_token', generateToken());
    localStorage.setItem('admin_session_expiry', Date.now() + SESSION_HOURS * 3600 * 1000);
    localStorage.setItem('admin_username', username);
    localStorage.setItem('admin_email', email);
    localStorage.setItem('admin_role', role);
    sessionStorage.removeItem(`pending_otp_${username}`);
    sessionStorage.removeItem(`pending_otp_expiry_${username}`);
    sessionStorage.removeItem('loginAttempts');
    sessionStorage.removeItem('lockedUntil');
    attemptCount = 0;
    lockedUntil = 0;

    showAlert('Login berhasil!', 'success');
    setTimeout(() => {
        window.location.href = '/indo5/admin_dashboard_indo5.html';
    }, 800);
}


function sendEmailOtp(username, email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + OTP_TTL;
    sessionStorage.setItem(`pending_otp_${username}`, code);
    sessionStorage.setItem(`pending_otp_expiry_${username}`, expiry);
    console.log(`Kode 2FA untuk ${email}: ${code}`);
    showAlert(`Kode 2FA telah dikirim ke ${email}. Kode: ${code}`, 'success');
}

function goBack() {
    clearInterval(otpTimer);
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step1').classList.add('active');
    hideAlert();
}

// Cek session â€” kalau sudah login langsung ke dashboard
(function checkExistingSession() {
    clearExpiredLockout();
    updateLockoutTimerDisplay();

    const loggedIn = localStorage.getItem('admin_logged_in');
    const expiry = parseInt(localStorage.getItem('admin_session_expiry') || '0');
    if (loggedIn && Date.now() < expiry) {
        window.location.href = '/indo5/admin_dashboard_indo5.html';
    }
})();


// Navigasi antar kotak OTP + Enter di password
document.addEventListener('DOMContentLoaded', () => {
    const otpInputs = document.querySelectorAll('.otp-inp');
    otpInputs.forEach((inp, i) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/\D/g, '').slice(-1);
            if (inp.value && i < otpInputs.length - 1)
                otpInputs[i + 1].focus();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !inp.value && i > 0)
                otpInputs[i - 1].focus();
        });
    });

    document.getElementById('loginPassword')
        ?.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleStep1();
        });

    if (isLocked()) {
        updateLockoutTimerDisplay();
        setInterval(updateLockoutTimerDisplay, 1000);
    }
});
