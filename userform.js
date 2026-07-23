
// ── VALIDASI DUPLIKAT EMAIL & TELEPON ──
function cekDuplikat(email, telepon) {
    const submissions = JSON.parse(localStorage.getItem('dashboardData') || '[]');
    
    if (email) {
        const dupEmail = submissions.find(s => 
            s.fields && Object.values(s.fields).some(v => 
                v && v.toString().toLowerCase() === email.toLowerCase()
            )
        );
        if (dupEmail) return { tolak: true, pesan: `❌ Email "${email}" sudah terdaftar! Harap gunakan email yang belum didaftarkan.` };
    }
    
    if (telepon) {
        const dupTelp = submissions.find(s => 
            s.fields && Object.values(s.fields).some(v => 
                v && v.toString().replace(/\D/g,'') === telepon.replace(/\D/g,'')
            )
        );
        if (dupTelp) return { tolak: true, pesan: `❌ Nomor telepon "${telepon}" sudah terdaftar! Harap gunakan nomor yang belum didaftarkan.` };
    }
    
    return { tolak: false };
}// ============================================================
//  userform.js — Indo5 User Forms V2
//  Fitur: Dark/Light Mode, Tombol Kembali, Submit Lengkap ke Dashboard
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    injectTopbarControls();
    applyTheme(localStorage.getItem("theme") || "light");

    // ── NIK VALIDATION ──
    const nikInput = document.querySelector("input[placeholder='16 digit NIK']");
    if (nikInput) {
        nikInput.setAttribute("maxlength", "16");
        nikInput.setAttribute("pattern", "[0-9]{16}");
        nikInput.setAttribute("inputmode", "numeric");
        nikInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            const len = this.value.length;
            if (len === 0) {
                this.style.boxShadow = "";
                this.style.borderColor = "";
                removeNikHint(this);
            } else if (len < 16) {
                this.style.boxShadow = "0 0 8px orange";
                this.style.borderColor = "orange";
                showNikHint(this, `Kurang ${16 - len} digit lagi`);
            } else {
                this.style.boxShadow = "0 0 8px lime";
                this.style.borderColor = "lime";
                removeNikHint(this);
            }
        });
    }

    // ── FILE UPLOAD PREVIEW ──
    document.querySelectorAll(".file-upload input[type='file']").forEach(inp => {
        inp.addEventListener("change", function () {
            const fn = this.closest(".file-upload").querySelector(".file-name");
            if (fn) {
                fn.textContent = this.files[0] ? this.files[0].name : "";
                fn.style.display = this.files[0] ? "block" : "none";
            }
        });
    });
});

// ── TOPBAR CONTROLS ──
function injectTopbarControls() {
    const topbar = document.querySelector(".dash-topbar");
    if (!topbar) return;

    const backBtn = document.createElement("button");
    backBtn.className = "btn-back-dashboard";
    backBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Kembali ke Dashboard
    `;
    backBtn.style.cssText = `
        padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600;
        background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);
        cursor:pointer;display:flex;align-items:center;gap:6px;font-family:inherit;transition:background 0.2s;
    `;
    backBtn.onmouseenter = () => backBtn.style.background = "rgba(255,255,255,0.28)";
    backBtn.onmouseleave = () => backBtn.style.background = "rgba(255,255,255,0.15)";
    backBtn.onclick = () => { window.location.href = "dashboard.html"; };

    const themeBtn = document.createElement("button");
    themeBtn.id = "themeSwitcher";
    themeBtn.title = "Ganti Tema";
    themeBtn.style.cssText = `
        width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);
        background:rgba(255,255,255,0.15);color:#fff;cursor:pointer;display:flex;
        align-items:center;justify-content:center;font-size:16px;transition:background 0.2s;
    `;
    themeBtn.onmouseenter = () => themeBtn.style.background = "rgba(255,255,255,0.28)";
    themeBtn.onmouseleave = () => themeBtn.style.background = "rgba(255,255,255,0.15)";
    themeBtn.onclick = toggleTheme;
    updateThemeIcon(themeBtn);

    const actionsDiv = topbar.querySelector("div");
    if (actionsDiv) {
        topbar.insertBefore(backBtn, topbar.firstChild);
        const oldThemeBtn = actionsDiv.querySelector(".theme-btn");
        if (oldThemeBtn) { oldThemeBtn.replaceWith(themeBtn); }
        else { actionsDiv.insertBefore(themeBtn, actionsDiv.firstChild); }
    }
}

// ── THEME ──
function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    const btn = document.getElementById("themeSwitcher");
    if (btn) updateThemeIcon(btn);
}
function updateThemeIcon(btn) {
    const isDark = localStorage.getItem("theme") === "dark" ||
        document.documentElement.getAttribute("data-theme") === "dark";
    btn.innerHTML = isDark
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}
function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
}

// ── NIK HINT ──
function showNikHint(input, msg) {
    let hint = input.parentElement.querySelector(".nik-hint");
    if (!hint) {
        hint = document.createElement("div");
        hint.className = "nik-hint";
        hint.style.cssText = "font-size:12px;color:orange;margin-top:4px;";
        input.parentElement.appendChild(hint);
    }
    hint.textContent = msg;
}
function removeNikHint(input) {
    const hint = input.parentElement.querySelector(".nik-hint");
    if (hint) hint.remove();
}

// ── DETEKSI TIPE FORM ──
function detectFormType(form) {
    const id = (form.id || "").toLowerCase();
    if (id.includes("referensi") || id.includes("refr")) return "Surat Referensi";
    if (id.includes("datadiri")) return "Data Diri Karyawan";
    if (id.includes("pelamar")) return "Pelamar Indo5";
    if (id.includes("blacklist") || id.includes("blaclits")) return "Blacklist Indolima";
    const url = window.location.href.toLowerCase();
    if (url.includes("refr") || url.includes("referensi")) return "Surat Referensi";
    if (url.includes("datadiri")) return "Data Diri Karyawan";
    if (url.includes("pelamar")) return "Pelamar Indo5";
    if (url.includes("blacklist") || url.includes("blaclits")) return "Blacklist Indolima";
    return "Data Diri Karyawan";
}

// ── MAPPING NAMA FIELD AGAR LEBIH READABLE ──
const FIELD_LABELS = {
    // Data Diri Karyawan
    'nama_ktp': 'Nama (KTP)',
    'nama': 'Nama Lengkap',
    'nik': 'NIK',
    'tempat_lahir': 'Tempat Lahir',
    'tanggal_lahir': 'Tanggal Lahir',
    'jenis_kelamin': 'Jenis Kelamin',
    'agama': 'Agama',
    'alamat': 'Alamat',
    'rt': 'RT',
    'rw': 'RW',
    'kelurahan': 'Kelurahan',
    'kecamatan': 'Kecamatan',
    'kota': 'Kota',
    'kode_pos': 'Kode Pos',
    'telepon': 'No. Telepon',
    'email': 'Email',
    'jabatan': 'Jabatan',
    'divisi': 'Divisi',
    'departemen': 'Departemen',
    'tanggal_masuk': 'Tanggal Masuk',
    'status_karyawan': 'Status Karyawan',
    'pendidikan': 'Pendidikan Terakhir',
    'jurusan': 'Jurusan',
    'nama_sekolah': 'Nama Sekolah/Universitas',
    'no_rekening': 'No. Rekening',
    'bank': 'Bank',
    // Surat Referensi
    'tujuan': 'Tujuan Surat',
    'tujuan_surat': 'Tujuan Surat',
    'instansi_tujuan': 'Instansi Tujuan',
    'jabatan_terakhir': 'Jabatan Terakhir',
    'masa_kerja': 'Masa Kerja',
    'alasan': 'Alasan',
    'catatan': 'Catatan',
    // Pelamar Indo5
    'posisi': 'Posisi Dilamar',
    'posisi_dilamar': 'Posisi Dilamar',
    'pengalaman': 'Pengalaman Kerja',
    'domisili': 'Domisili',
    'gaji_harapan': 'Gaji Harapan',
    'link_portofolio': 'Portfolio',
    // Blacklist
    'alasan_blacklist': 'Alasan Blacklist',
    'tanggal_kejadian': 'Tanggal Kejadian',
    'pelapor': 'Nama Pelapor',
    'kronologi': 'Kronologi',
};

function formatFieldLabel(key) {
    return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}


// ── KONVERSI FILE KE BASE64 ──
function fileToBase64(file) {
    return new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = () => {
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                    else { w = Math.round(w * MAX / h); h = MAX; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
        } else {
            // Simpan sebagai base64
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve("[FILE] " + file.name);
            reader.readAsDataURL(file);
        }
    });
}

}

// ── KUMPULKAN SEMUA FILE UPLOAD ──
async function collectFileUploads(form) {
    const photos = {};
    const fileInputs = form.querySelectorAll('input[type="file"]');
    for (const inp of fileInputs) {
        if (!inp.files || !inp.files[0]) continue;
        const b64 = await fileToBase64(inp.files[0]);
        if (b64) {
            photos[inp.name] = {
                label: formatFieldLabel(inp.name),
                data: b64,
                filename: inp.files[0].name,
                fileType: inp.files[0].type
            };
        }
    }
    return photos;
}

// ── KUMPULKAN SEMUA FIELD FORM ──
function collectFormFields(form, formData) {
    const fields = {};
    const skipTypes = ['file', 'submit', 'button', 'reset', 'image'];
    const skipNames = ['_method'];

    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (!el.name || skipTypes.includes(el.type) || skipNames.includes(el.name)) return;
        if (el.type === 'radio') {
            if (el.checked) fields[formatFieldLabel(el.name)] = el.value;
            return;
        }
        if (el.type === 'checkbox') {
            fields[formatFieldLabel(el.name)] = el.checked ? 'Ya' : 'Tidak';
            return;
        }
        const val = (formData.get(el.name) || '').toString().trim();
        if (val) fields[formatFieldLabel(el.name)] = val;
    });
    return fields;
}

// ── SUBMIT FORM ──
async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    let valid = true;

    // Validasi NIK
    const nikInput = form.querySelector("input[placeholder='16 digit NIK']");
    if (nikInput) {
        const nik = nikInput.value.trim();
        if (!/^\d{16}$/.test(nik)) {
            nikInput.style.boxShadow = "0 0 8px red";
            showToast("❌ NIK harus tepat 16 digit angka!");
            return;
        }
    }

    // Validasi field wajib
    form.querySelectorAll("input[required], textarea[required], select[required]").forEach(field => {
        if (field.type === "radio" || field.type === "file") return;
        if (field.value.trim() === "") {
            valid = false;
            field.style.boxShadow = "0 0 8px red";
        } else {
            field.style.boxShadow = "0 0 8px lime";
        }
    });

    // Validasi file wajib
    form.querySelectorAll("input[type='file'][required]").forEach(field => {
        if (!field.files || field.files.length === 0) {
            valid = false;
            field.closest(".file-upload").style.borderColor = "red";
        }
    });

    // Validasi radio wajib
    const radioGroups = new Set();
    form.querySelectorAll("input[type='radio'][required]").forEach(r => radioGroups.add(r.name));
    radioGroups.forEach(name => {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
            valid = false;
            form.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                if (r.closest(".radio-item")) r.closest(".radio-item").style.outline = "2px solid red";
            });
        } else {
            form.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                if (r.closest(".radio-item")) r.closest(".radio-item").style.outline = "";
            });
        }
    });

    if (!valid) {
        showToast("⚠️ Isi semua data yang wajib dulu!");
        return;
    }

    const formData = new FormData(form);
    const formType = detectFormType(form);

        // Cek duplikat email & telepon
    const emailVal = formData.get("email") || "";
    const telponVal = formData.get("telepon") || "";
    const cekDup = cekDuplikat(emailVal, telponVal);
    if (cekDup.tolak) {
        // Tampilkan error di bawah field
        const emailField = form.querySelector("input[name=email]");
        const telponField = form.querySelector("input[name=telepon]");
        if (emailVal && cekDup.pesan.includes("Email")) {
            emailField.style.borderColor = "red";
            emailField.style.boxShadow = "0 0 8px red";
            let hint = emailField.parentElement.querySelector(".dup-hint");
            if (!hint) { hint = document.createElement("div"); hint.className = "dup-hint"; hint.style.cssText = "color:red;font-size:12px;margin-top:4px;"; emailField.parentElement.appendChild(hint); }
            hint.textContent = "❌ Email sudah terdaftar! Gunakan email lain.";
            emailField.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (telponVal && cekDup.pesan.includes("telepon")) {
            telponField.style.borderColor = "red";
            telponField.style.boxShadow = "0 0 8px red";
            let hint = telponField.parentElement.querySelector(".dup-hint");
            if (!hint) { hint = document.createElement("div"); hint.className = "dup-hint"; hint.style.cssText = "color:red;font-size:12px;margin-top:4px;"; telponField.parentElement.appendChild(hint); }
            hint.textContent = "❌ Nomor telepon sudah terdaftar! Gunakan nomor lain.";
            telponField.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        showToast(cekDup.pesan, 5000);
        return;
    }
    
    showToast("📡 Mengirim data...");

    try {
        // Ambil nama & NIK
        let name = "Tanpa Nama";
        let nik = "-";

        if (formType === "Surat Referensi" || formType === "Data Diri Karyawan") {
            name = formData.get("nama_ktp") || formData.get("nama") || "Tanpa Nama";
            nik = formData.get("nik") || "-";
        } else if (formType === "Pelamar Indo5") {
            name = formData.get("nama") || "Tanpa Nama";
            nik = formData.get("telepon") || "-";
        } else if (formType === "Blacklist Indolima") {
            name = formData.get("nama") || formData.get("nama_ktp") || "Tanpa Nama";
            nik = formData.get("nik") || "-";
        }

        // Kumpulkan SEMUA field
        const fields = collectFormFields(form, formData);

        // Kumpulkan foto/file upload sebagai base64
        const photos = await collectFileUploads(form);

        const newData = {
            name: name.trim() || "Tanpa Nama",
            nik: nik.trim() || "-",
            type: formType,
            status: "Review",
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            submittedAt: new Date().toISOString(),
            fields: fields,
            photos: photos
        };

        // Simpan ke localStorage
        try {
            const existing = JSON.parse(localStorage.getItem('dashboardData') || '[]');
            existing.unshift(newData);
            localStorage.setItem('dashboardData', JSON.stringify(existing));
        } catch(apiErr) { console.error('localStorage error', apiErr); }

        // Cek notifikasi admin aktif
        try {
            const adminSettings = JSON.parse(localStorage.getItem('indolima_admin_settings') || '{}');
            if (adminSettings.notify && 'Notification' in window) {
                Notification.requestPermission().then(p => {
                    if (p === 'granted') {
                        new Notification('Indo5 Admin', {
                            body: `Formulir baru dari ${newData.name} (${formType})`,
                            icon: '../foto logo/copy.png'
                        });
                    }
                });
            }
        } catch (_) { }

        showToast("✅ Data berhasil dikirim ke dashboard!", 3500);

        setTimeout(() => {
            form.reset();
            form.querySelectorAll("input, textarea, select").forEach(f => f.style.boxShadow = "");
            form.querySelectorAll(".radio-item").forEach(r => r.style.outline = "");
            form.querySelectorAll(".file-name").forEach(fn => {
                fn.textContent = "";
                fn.style.display = "none";
            });
            form.querySelectorAll(".file-upload").forEach(fu => fu.style.borderColor = "");
        }, 1400);

    } catch (error) {
        showToast(`❌ Gagal kirim: ${error.message}`, 5000);
        console.error(error);
    }
}

// ── TOAST ──
function showToast(msg, duration = 3000) {
    let toast = document.getElementById("toast");
    if (!toast) {
        const toasts = document.querySelectorAll(".toast");
        toast = toasts[0] || null;
    }
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
}

// ── UPLOAD FILE KE GOOGLE DRIVE ──
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzSeAhbCncGNs5EQMw0SdV1qtFMZbAcBiw2m9GkldNN6ZghjZhGInFPXP0awlcbwIqC7A/exec';

async function uploadToDrive(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result.split(',')[1];
                const formData = new FormData();
                formData.append('fileData', base64);
                formData.append('fileName', file.name);
                formData.append('mimeType', file.type);
                
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    resolve({ url: result.viewUrl, name: file.name });
                } else {
                    resolve(null);
                }
            } catch(err) {
                console.error('Upload error:', err);
                resolve(null);
            }
        };
        reader.readAsDataURL(file);
    });
}
// ── VALIDASI REALTIME EMAIL & TELEPON ──
function setupRealtimeValidation() {
    const emailField = document.querySelector('input[name="email"], input[type="email"]');
    const teleponField = document.querySelector('input[name="telepon"], input[placeholder*="08"]');

    function showFieldError(field, msg) {
        let hint = field.parentElement.querySelector('.dup-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'dup-hint';
            hint.style.cssText = 'color:#e53935;font-size:12px;margin-top:4px;font-weight:500;';
            field.parentElement.appendChild(hint);
        }
        hint.textContent = msg;
        field.style.borderColor = '#e53935';
        field.style.boxShadow = '0 0 0 2px rgba(229,57,53,0.2)';
    }

    function clearFieldError(field) {
        const hint = field.parentElement.querySelector('.dup-hint');
        if (hint) hint.textContent = '';
        field.style.borderColor = '';
        field.style.boxShadow = '';
    }

    if (emailField) {
        emailField.addEventListener('input', () => {
            const val = emailField.value.trim();
            if (!val) { clearFieldError(emailField); return; }
            const dup = cekDuplikat(val, '');
            if (dup.tolak && dup.pesan.includes('Email')) {
                showFieldError(emailField, '❌ Email sudah terdaftar! Gunakan email lain.');
            } else {
                clearFieldError(emailField);
            }
        });
    }

    if (teleponField) {
        teleponField.addEventListener('input', () => {
            const val = teleponField.value.trim();
            if (!val) { clearFieldError(teleponField); return; }
            const dup = cekDuplikat('', val);
            if (dup.tolak && dup.pesan.includes('telepon')) {
                showFieldError(teleponField, '❌ Nomor telepon sudah terdaftar! Gunakan nomor lain.');
            } else {
                clearFieldError(teleponField);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupRealtimeValidation);

