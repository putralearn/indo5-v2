function showToast(msg, duration = 2800) {
    const t = document.getElementById('toast');
    if (!t) { alert(msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

function register() {
    const username = document.getElementById("regUsername")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const phone = document.getElementById("regPhone")?.value.trim();
    const pass = document.getElementById("regPassword")?.value;
    const confirm = document.getElementById("regPasswordConfirm")?.value;

    // Validasi
    if (!username) { showToast("⚠️ Username wajib diisi"); return; }

    // Cek apakah email atau phone yang aktif
    const emailWrapVisible = document.getElementById("emailWrap")?.style.display !== "none";
    const contact = emailWrapVisible ? email : phone;
    if (!contact) {
        showToast("⚠️ Email atau nomor telepon wajib diisi");
        return;
    }

    if (!pass || pass.length < 6) { showToast("⚠️ Password minimal 6 karakter"); return; }
    if (pass !== confirm) { showToast("⚠️ Password tidak cocok"); return; }

    // Simpan ke localStorage
    localStorage.setItem("userUsername", username);
    localStorage.setItem("userEmail", emailWrapVisible ? email : "");
    localStorage.setItem("userPhone", emailWrapVisible ? "" : phone);
    localStorage.setItem("userPass", pass);

    showToast("✅ Register berhasil! Silakan login.");
    setTimeout(() => { window.location.href = "loginuser.html"; }, 1800);
}

function login() {
    const username = document.getElementById("username")?.value.trim();
    const pass = document.getElementById("password")?.value;
    const remember = document.getElementById("rememberMe")?.checked;

    if (!username || !pass) { showToast("⚠️ Username dan password wajib diisi"); return; }

    const savedUsername = localStorage.getItem("userUsername");
    const savedEmail = localStorage.getItem("userEmail");
    const savedPass = localStorage.getItem("userPass");

    // Bisa login dengan username atau email
    const isMatch = (username === savedUsername || username === savedEmail) && pass === savedPass;

    if (isMatch) {
        if (remember) {
            localStorage.setItem("rememberUser", username);
        } else {
            localStorage.removeItem("rememberUser");
        }
        localStorage.setItem("userName", savedUsername || username); showToast("✅ Login berhasil! Mengalihkan...");
        setTimeout(() => { window.location.href = "/dashboard.html"; }, 1200);
    } else {
        showToast("❌ Username atau password salah");
    }
}

// Auto-fill jika remember me aktif
window.addEventListener("DOMContentLoaded", () => {
    const remembered = localStorage.getItem("rememberUser");
    const usernameField = document.getElementById("username");
    const rememberBox = document.getElementById("rememberMe");
    if (remembered && usernameField) {
        usernameField.value = remembered;
        if (rememberBox) rememberBox.checked = true;
    }
});


