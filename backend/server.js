require('dotenv').config();
﻿const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'indo5_secret_key_2024';
const ROOT = 'C:\\laragon\\www\\indo5';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new Pool({ user: process.env.DB_USER || 'postgres', host: process.env.DB_HOST || 'localhost', database: process.env.DB_NAME || 'indo5_admin', password: process.env.DB_PASSWORD || 'postgres', port: parseInt(process.env.DB_PORT || '5432') });

app.use(express.static(ROOT));
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

const uploadFoto = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(ROOT, 'uploads', 'foto')),
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
        }
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('File harus berupa gambar'));
    }
});

const uploadCV = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dest = file.fieldname === 'cv'
                ? path.join(ROOT, 'uploads', 'cv')
                : path.join(ROOT, 'uploads', 'foto');
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
        }
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'cv') {
            if (['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) cb(null, true);
            else cb(new Error('CV harus berformat PDF atau Word (.doc/.docx)'));
        } else if (file.fieldname === 'foto_full' || file.fieldname.startsWith('foto')) {
            if (file.mimetype.startsWith('image/')) cb(null, true);
            else cb(new Error('File harus berupa gambar'));
        } else {
            cb(null, true);
        }
    }
});
app.use('/login-admin', express.static(path.join(ROOT, 'login admin')));
app.use('/loginadmin', express.static(path.join(ROOT, 'login admin')));

// ── MIDDLEWARE: VERIFY TOKEN ──
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch(e) {
        return res.status(403).json({ success: false, message: 'Token tidak valid atau kedaluwarsa' });
    }
}

// ── AUTH ──
const pending2FAChallenges = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [id, c] of pending2FAChallenges) {
        if (now > c.expires) pending2FAChallenges.delete(id);
    }
}, 5 * 60 * 1000);

app.post('/api/auth/admin/otp/verify', async (req, res) => {
    const { challenge_id, otp } = req.body;
    if (!challenge_id || !otp) {
        return res.status(400).json({ error: 'challenge_id dan otp wajib diisi' });
    }
    const challenge = pending2FAChallenges.get(challenge_id);
    if (!challenge) {
        return res.status(400).json({ error: 'Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa. Silakan login ulang.' });
    }
    if (Date.now() > challenge.expires) {
        pending2FAChallenges.delete(challenge_id);
        return res.status(400).json({ error: 'Kode OTP kedaluwarsa. Silakan login ulang.' });
    }
    try {
        const userResult = await pool.query('SELECT id, username, email, role, totp_secret FROM admin_users WHERE id = $1', [challenge.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        const user = userResult.rows[0];
        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: otp,
            window: 1
        });
        if (!verified) {
            return res.status(401).json({ error: 'Kode OTP salah' });
        }
        pending2FAChallenges.delete(challenge_id);
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token, username: user.username, email: user.email, role: user.role });
    } catch (e) {
        console.error('[OTP VERIFY ERROR]', e);
        res.status(500).json({ error: 'Server error: ' + e.message });
    }
});

// ── USER REGISTER ──
app.post('/api/user/register', async (req, res) => {
    const { username, email, phone, password } = req.body;
    if (!username || !password) return res.status(400).json({ success:false, message:'Username dan password wajib diisi' });
    if (!email && !phone) return res.status(400).json({ success:false, message:'Email atau nomor telepon wajib diisi' });
    try {
        const cek = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (cek.rows.length > 0) return res.status(409).json({ success:false, message:'Username sudah terdaftar' });
        if (email) {
            const cekEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (cekEmail.rows.length > 0) return res.status(409).json({ success:false, message:'Email sudah terdaftar' });
        }
        if (phone) {
            const cekPhone = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (cekPhone.rows.length > 0) return res.status(409).json({ success:false, message:'Nomor telepon sudah terdaftar' });
        }
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, email, phone, password_hash) VALUES ($1, $2, $3, $4)', [username, email || null, phone || null, hash]);
        res.json({ success:true, message:'Registrasi berhasil!' });
    } catch(e) {
        console.error('[USER REGISTER ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

// ── USER LOGIN ──
app.post('/api/user/login', async (req, res) => {
    const { username, email, phone, password } = req.body;
    try {
        let result;
        if (username) {
            result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        } else if (email) {
            result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        } else if (phone) {
            result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        } else {
            return res.status(400).json({ success:false, message:'Username, email, atau nomor telepon wajib diisi' });
        }
        if (result.rows.length === 0) return res.status(401).json({ success:false, message:'Akun tidak ditemukan' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success:false, message:'Password salah' });
        const token = jwt.sign({ id:user.id, username:user.username, role:'user' }, JWT_SECRET, { expiresIn:'8h' });
        res.json({ success:true, token, username:user.username, email:user.email, phone:user.phone });
    } catch(e) {
        console.error('[USER LOGIN ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success:false, message:'Username dan password wajib diisi' });
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ success:false, message:'Username atau password salah' });
        const user = result.rows[0];
        if (user.is_blocked) return res.status(403).json({ success:false, message:'Akun ini telah diblokir oleh administrator.' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success:false, message:'Username atau password salah' });
        // Cek 2FA dulu sebelum kasih token
            if (user.totp_enabled && user.totp_secret) {
                const { otp_code } = req.body;
                if (!otp_code) {
                    const challengeId = require('crypto').randomUUID();
                    pending2FAChallenges.set(challengeId, { userId: user.id, expires: Date.now() + 5 * 60 * 1000 });
                    return res.json({ success:false, require2fa:true, challenge_id: challengeId, message:'Masukkan kode 2FA' });
                }
                // Verifikasi TOTP manual (window 30 detik)
                const speakeasy = require('speakeasy');
                const verified = speakeasy.totp.verify({
                    secret: user.totp_secret,
                    encoding: 'base32',
                    token: otp_code,
                    window: 1
                });
                if (!verified) {
                    return res.status(401).json({ success:false, message:'Kode 2FA salah atau kedaluwarsa' });
                }
            }
            const token = jwt.sign({ id:user.id, username:user.username, role:user.role }, JWT_SECRET, { expiresIn:'8h' });
        // Catat login history
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS admin_login_history (id SERIAL PRIMARY KEY, username TEXT, email TEXT, login_method TEXT DEFAULT 'password', login_at TIMESTAMPTZ DEFAULT NOW(), ip_address TEXT)`);
            await pool.query('INSERT INTO admin_login_history (username, email, login_method, ip_address) VALUES ($1,$2,$3,$4)',
                [user.username, user.email || '', user.google_id ? 'google' : 'password', req.ip || '']);
        } catch(histErr) { console.error('Login history error:', histErr.message); }
        res.json({ success:true, token, username:user.username, email:user.email, role:user.role, totpEnabled:user.totp_enabled });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

app.get('/api/admin/verify', (req, res) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ message:'Token tidak ada' });
    try { res.json({ success:true, user:jwt.verify(token, JWT_SECRET) }); }
    catch { res.status(403).json({ message:'Token tidak valid' }); }
});

app.post('/api/admin/register', async (req, res) => {
    const { username, email, password, enable2fa } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success:false, message:'Semua field wajib diisi' });
    try {
        const cek = await pool.query('SELECT id FROM admin_users WHERE username = $1 OR email = $2', [username, email]);
        if (cek.rows.length > 0) return res.status(409).json({ success:false, message:'Username atau email sudah terdaftar' });
        const hash = await bcrypt.hash(password, 10);
        let totpSecret = null;
        if (enable2fa) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const arr = new Uint8Array(20);
            for (let i = 0; i < 20; i++) arr[i] = Math.floor(Math.random() * 256);
            totpSecret = Array.from(arr).map(b => chars[b % 32]).join('');
        }
        await pool.query('INSERT INTO admin_users (username,email,password_hash,role,totp_secret,totp_enabled) VALUES ($1,$2,$3,$4,$5,$6)',
            [username, email, hash, 'Administrator', totpSecret, enable2fa ? true : false]);
        res.json({ success:true, message:'Akun berhasil dibuat', totpSecret });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

app.post('/api/admin/change-password', async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ success:false, message:'Semua field wajib diisi' });
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(404).json({ success:false, message:'User tidak ditemukan' });
        const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!valid) return res.status(401).json({ success:false, message:'Password saat ini tidak cocok!' });
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE admin_users SET password_hash = $1 WHERE username = $2', [hash, username]);
        res.json({ success:true, message:'Password berhasil diubah!' });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

// ── ADMIN USERS LIST ──
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, role, totp_enabled, is_blocked, created_at FROM admin_users ORDER BY id');
        res.json({ success:true, users: result.rows });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── BLOKIR AKUN ADMIN ──
app.post('/api/admin/block', async (req, res) => {
    const { targetUsername } = req.body;
    if (!targetUsername) return res.status(400).json({ success:false, message:'Username target wajib diisi' });
    try {
        const r = await pool.query('SELECT id, username FROM admin_users WHERE username = $1', [targetUsername]);
        if (r.rows.length === 0) return res.status(404).json({ success:false, message:'Akun tidak ditemukan' });
        await pool.query('UPDATE admin_users SET is_blocked = true WHERE username = $1', [targetUsername]);
        res.json({ success:true, message:'Akun ' + targetUsername + ' berhasil diblokir.' });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── UNBLOKIR AKUN ADMIN ──
app.post('/api/admin/unblock', async (req, res) => {
    const { targetUsername } = req.body;
    if (!targetUsername) return res.status(400).json({ success:false, message:'Username target wajib diisi' });
    try {
        await pool.query('UPDATE admin_users SET is_blocked = false WHERE username = $1', [targetUsername]);
        res.json({ success:true, message:'Akun ' + targetUsername + ' berhasil dibuka blokirnya.' });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── HAPUS AKUN ADMIN ──
app.delete('/api/admin/users/:username', async (req, res) => {
    const { username } = req.params;
    if (username === 'admin') return res.status(403).json({ success:false, message:'Akun admin utama tidak bisa dihapus.' });
    try {
        const r = await pool.query('DELETE FROM admin_users WHERE username = $1 RETURNING id', [username]);
        if (r.rowCount === 0) return res.status(404).json({ success:false, message:'Akun tidak ditemukan.' });
        res.json({ success:true, message:'Akun ' + username + ' berhasil dihapus.' });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── TAMBAH KOLOM is_blocked JIKA BELUM ADA ──
(async () => {
    try {
        await pool.query("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false");
        console.log('[DB] Kolom is_blocked siap.');
    } catch(e) { console.log('[DB] is_blocked:', e.message); }
})();

// ── FORM PELAMAR ──
app.post('/api/pelamar', uploadCV.fields([{ name: 'cv', maxCount: 1 }, { name: 'foto_full', maxCount: 1 }]), async (req, res) => {
    const { nama, email, usia, telepon, nik, tinggi, berat, penempatan, jk, status, pendidikan, posisi, pengalaman } = req.body;
    if (!nama || !email) return res.status(400).json({ success:false, message:'Nama dan email wajib diisi' });
    try {
        const cek = await pool.query('SELECT id FROM form_pelamar WHERE email = $1', [email]);
        if (cek.rows.length > 0) return res.status(409).json({ success:false, message:'Email sudah pernah mendaftar!' });
        const cvFilename = req.files?.cv?.[0] ? req.files.cv[0].filename : null;
        const fotoFilename = req.files?.foto_full?.[0] ? '/uploads/foto/' + req.files.foto_full[0].filename : null;
        await pool.query('INSERT INTO form_pelamar (nama,email,usia,telepon,nik,tinggi,berat,penempatan,jk,status,pendidikan,posisi,pengalaman,cv_filename,foto_full) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
            [nama,email,usia||null,telepon||null,nik||null,tinggi||null,berat||null,penempatan||null,jk||null,status||null,pendidikan||null,posisi||null,pengalaman||null,cvFilename,fotoFilename]);
        res.json({ success:true, message:'Lamaran berhasil dikirim!' });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

app.get('/api/pelamar', async (req, res) => {
    try { res.json({ success:true, data: (await pool.query('SELECT * FROM form_pelamar ORDER BY created_at DESC')).rows }); }
    catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── FORM REFERENSI ──
app.post('/api/referensi', uploadFoto.fields([{ name: 'foto_ktp', maxCount: 1 }]), async (req, res) => {
    const { nama_ktp, nik, email, telepon, alamat_ktp, tempat_lahir, tanggal_lahir, jk, project, jabatan, join_date, end_date, alasan } = req.body;
    if (!nama_ktp || !email) return res.status(400).json({ success:false, message:'Nama dan email wajib diisi' });
    try {
        const cek = await pool.query('SELECT id FROM form_referensi WHERE email = $1', [email]);
        if (cek.rows.length > 0) return res.status(409).json({ success:false, message:'Email sudah pernah mengajukan referensi!' });
        const foto_ktp = req.files?.foto_ktp?.[0] ? '/uploads/foto/' + req.files.foto_ktp[0].filename : null;
        await pool.query('INSERT INTO form_referensi (nama,nik,email,telepon,alamat_ktp,tempat_lahir,tanggal_lahir,jk,project,jabatan,join_date,end_date,alasan,foto_ktp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
            [nama_ktp,nik||null,email,telepon||null,alamat_ktp||null,tempat_lahir||null,tanggal_lahir||null,jk||null,project||null,jabatan||null,join_date||null,end_date||null,alasan||null,foto_ktp]);
        res.json({ success:true, message:'Formulir referensi berhasil dikirim!' });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

app.get('/api/referensi', async (req, res) => {
    try { res.json({ success:true, data: (await pool.query('SELECT * FROM form_referensi ORDER BY created_at DESC')).rows }); }
    catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── FORM DATA DIRI ──
app.post('/api/datadiri', uploadFoto.fields([{ name: 'foto_ktp', maxCount: 1 }, { name: 'foto_sim', maxCount: 1 }, { name: 'foto_kk', maxCount: 1 }, { name: 'foto_skck', maxCount: 1 }]), async (req, res) => {
    const { nama, nik, email, telepon, area, jabatan, project, join_date, alamat_ktp, alamat_domisili, tempat_lahir, tanggal_lahir, agama, jk, status, jumlah_anak, pendidikan, npwp, alamat_npwp, rekening, bpjs_tk, bpjs_kes, bank, ibu_kandung, nama_keluarga, telepon_keluarga, hubungan, nomor_kk } = req.body;
    if (!nama || !email) return res.status(400).json({ success:false, message:'Nama dan email wajib diisi' });
    try {
        const cek = await pool.query('SELECT id FROM form_datadiri WHERE email = $1', [email]);
        if (cek.rows.length > 0) return res.status(409).json({ success:false, message:'Email sudah pernah mendaftar!' });
        const foto_ktp = req.files?.foto_ktp?.[0] ? '/uploads/foto/' + req.files.foto_ktp[0].filename : null;
        const foto_sim = req.files?.foto_sim?.[0] ? '/uploads/foto/' + req.files.foto_sim[0].filename : null;
        const foto_kk = req.files?.foto_kk?.[0] ? '/uploads/foto/' + req.files.foto_kk[0].filename : null;
        const foto_skck = req.files?.foto_skck?.[0] ? '/uploads/foto/' + req.files.foto_skck[0].filename : null;
        await pool.query('INSERT INTO form_datadiri (nama,nik,email,telepon,area,jabatan,project,join_date,alamat_ktp,alamat_domisili,tempat_lahir,tanggal_lahir,agama,jk,status,jumlah_anak,pendidikan,npwp,alamat_npwp,rekening,bpjs_tk,bpjs_kes,bank,ibu_kandung,nama_keluarga,telepon_keluarga,hubungan,nomor_kk,foto_ktp,foto_sim,foto_kk,foto_skck) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)',
            [nama,nik||null,email,telepon||null,area||null,jabatan||null,project||null,join_date||null,alamat_ktp||null,alamat_domisili||null,tempat_lahir||null,tanggal_lahir||null,agama||null,jk||null,status||null,jumlah_anak||null,pendidikan||null,npwp||null,alamat_npwp||null,rekening||null,bpjs_tk||null,bpjs_kes||null,bank||null,ibu_kandung||null,nama_keluarga||null,telepon_keluarga||null,hubungan||null,nomor_kk||null,foto_ktp,foto_sim,foto_kk,foto_skck]);
        res.json({ success:true, message:'Data diri berhasil dikirim!' });
    } catch(e) { res.status(500).json({ success:false, message:'Server error: ' + e.message }); }
});

app.get('/api/datadiri', async (req, res) => {
    try { res.json({ success:true, data: (await pool.query('SELECT * FROM form_datadiri ORDER BY created_at DESC')).rows }); }
    catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── BLACKLIST ──
app.post('/api/blacklist', uploadFoto.fields([{ name: 'foto_ktp', maxCount: 1 }]), async (req, res) => {
    const { nama, nik, alasan } = req.body;
    if (!nama) return res.status(400).json({ success:false, message:'Nama wajib diisi' });
    try {
        const foto_ktp = req.files?.foto_ktp?.[0] ? '/uploads/foto/' + req.files.foto_ktp[0].filename : null;
        await pool.query('INSERT INTO blacklist (nama,nik,alasan,foto_ktp) VALUES ($1,$2,$3,$4)', [nama,nik||null,alasan||null,foto_ktp]);
        res.json({ success:true, message:'Data blacklist berhasil dikirim!' });
    } catch(e) {
        console.error('[BLACKLIST ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

app.get('/api/blacklist', async (req, res) => {
    try { res.json({ success:true, data: (await pool.query('SELECT * FROM blacklist ORDER BY created_at DESC')).rows }); }
    catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── SUBMISSIONS (INCLUDE FOTO & DOKUMEN) ──
// ── API LOGIN HISTORY ──
app.post('/api/admin/record-login', async (req, res) => {
    try {
        await pool.query("CREATE TABLE IF NOT EXISTS login_history (id SERIAL PRIMARY KEY, username VARCHAR(100), email VARCHAR(255), ip_address VARCHAR(100), login_at TIMESTAMPTZ DEFAULT NOW())");
        const { username, email } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        await pool.query('INSERT INTO login_history (username, email, ip_address) VALUES ($1, $2, $3)',
            [username || 'unknown', email || '-', ip]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/admin/login-history', async (req, res) => {
    try {
        await pool.query("CREATE TABLE IF NOT EXISTS login_history (id SERIAL PRIMARY KEY, username VARCHAR(100), email VARCHAR(255), ip_address VARCHAR(100), login_at TIMESTAMPTZ DEFAULT NOW())");
        const result = await pool.query('SELECT * FROM login_history ORDER BY login_at DESC LIMIT 100');
        res.json({ success: true, history: result.rows });
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── API GENERATE 2FA ──
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

app.post('/api/admin/generate-2fa', async (req, res) => {
    const username = req.body.username || req.query.username;
    if (!username) return res.status(400).json({ success:false, message:'Username wajib dikirim' });
    try {
        const userResult = await pool.query('SELECT id, username FROM admin_users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(404).json({ success:false, message:'User tidak ditemukan' });
        const user = userResult.rows[0];
        const secret = speakeasy.generateSecret({ name: 'Indo5Admin:' + user.username, length: 20 });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        await pool.query('UPDATE admin_users SET totp_secret_pending = $1 WHERE id = $2', [secret.base32, user.id]);
        res.json({ success:true, qrCode, secret: secret.base32 });
    } catch(e) {
        console.error('[2FA GENERATE ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

app.post('/api/admin/verify-2fa', async (req, res) => {
    const { username, code } = req.body;
    if (!username || !code) return res.status(400).json({ success:false, message:'Username dan kode wajib diisi' });
    try {
        const userResult = await pool.query('SELECT id, totp_secret_pending FROM admin_users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(404).json({ success:false, message:'User tidak ditemukan' });
        const user = userResult.rows[0];
        const pendingSecret = user.totp_secret_pending;
        if (!pendingSecret) return res.status(400).json({ success:false, message:'Belum ada QR yang digenerate' });
        const verified = speakeasy.totp.verify({ secret: pendingSecret, encoding: 'base32', token: code, window: 1 });
        if (!verified) return res.status(400).json({ success:false, message:'Kode OTP salah!' });
        await pool.query('UPDATE admin_users SET totp_secret = $1, totp_enabled = true, totp_secret_pending = NULL WHERE id = $2', [pendingSecret, user.id]);
        res.json({ success:true, message:'2FA berhasil diaktifkan!' });
    } catch(e) {
        console.error('[2FA VERIFY ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

app.post('/api/admin/disable-2fa', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success:false, message:'Username wajib dikirim' });
    try {
        await pool.query('UPDATE admin_users SET totp_secret = NULL, totp_enabled = false WHERE username = $1', [username]);
        res.json({ success:true, message:'2FA dinonaktifkan' });
    } catch(e) {
        console.error('[2FA DISABLE ERROR]', e);
        res.status(500).json({ success:false, message:'Server error: ' + e.message });
    }
});

app.get('/api/submissions', async (req, res) => {
    try {
        const results = await Promise.allSettled([
            pool.query("SELECT *, 'Pelamar Indo5' as type FROM form_pelamar ORDER BY created_at DESC"),
            pool.query("SELECT *, 'Data Diri Karyawan' as type FROM form_datadiri ORDER BY created_at DESC"),
            pool.query("SELECT *, 'Surat Referensi' as type FROM form_referensi ORDER BY created_at DESC"),
            pool.query("SELECT *, 'Blacklist Indolima' as type, 'Blacklist' as submission_status FROM blacklist ORDER BY created_at DESC")
        ]);

        // Label mapping per tipe
        const labelMap = {
            'Pelamar Indo5': { nama:'Nama', email:'Email', nik:'NIK', telepon:'Telepon', usia:'Usia', tinggi:'Tinggi (cm)', berat:'Berat (kg)', penempatan:'Penempatan', jk:'Jenis Kelamin', pendidikan:'Pendidikan', posisi:'Posisi', pengalaman:'Pengalaman', status:'Status Pernikahan' },
            'Data Diri Karyawan': { nama:'Nama', nik:'NIK', email:'Email', telepon:'Telepon', area:'Area', jabatan:'Jabatan', project:'Project', join_date:'Tanggal Masuk', alamat_ktp:'Alamat KTP', alamat_domisili:'Alamat Domisili', tempat_lahir:'Tempat Lahir', tanggal_lahir:'Tanggal Lahir', agama:'Agama', jk:'Jenis Kelamin', status_nikah:'Status Nikah', jumlah_anak:'Jumlah Anak', pendidikan:'Pendidikan', npwp:'NPWP', alamat_npwp:'Alamat NPWP', rekening:'No. Rekening', bpjs_tk:'BPJS TK', bpjs_kes:'BPJS Kesehatan', bank:'Bank', ibu_kandung:'Nama Ibu Kandung', nama_keluarga:'Nama Keluarga Darurat', telepon_keluarga:'Telepon Keluarga', hubungan:'Hubungan', nomor_kk:'Nomor KK' },
            'Surat Referensi': { nama:'Nama', nik:'NIK', email:'Email', telepon:'Telepon', alamat_ktp:'Alamat KTP', tempat_lahir:'Tempat Lahir', tanggal_lahir:'Tanggal Lahir', jk:'Jenis Kelamin', project:'Project', jabatan:'Jabatan', join_date:'Tanggal Masuk', end_date:'Tanggal Keluar', alasan:'Alasan Keluar' },
            'Blacklist Indolima': { nama:'Nama', nik:'NIK', alasan:'Alasan Blacklist' }
        };

        // Kolom foto per tipe
        const fotoMap = {
            'Data Diri Karyawan': [
                { key:'foto_ktp',  label:'KTP' },
                { key:'foto_sim',  label:'SIM' },
                { key:'foto_kk',   label:'Kartu Keluarga' },
                { key:'foto_skck', label:'SKCK' },
            ],
            'Surat Referensi': [
                { key:'foto_ktp', label:'Foto KTP' },
            ],
            'Pelamar Indo5': [
                { key:'foto_full', label:'Foto Full Badan' },
            ],
            'Blacklist Indolima': [
                { key:'foto_ktp', label:'Foto KTP' },
            ],
        };

        let all = [];
        results.forEach(r => {
            if (r.status !== 'fulfilled' || !r.value?.rows) return;
            r.value.rows.forEach(row => {
                const type = row.type;
                const labels = labelMap[type] || {};
                const fotoKeys = fotoMap[type] || [];

                // Build fields (exclude foto, id, created_at, type)
                const skipKeys = new Set(['id','created_at','type','submission_status','foto_ktp','foto_sim','foto_kk','foto_skck','foto_full','cv_filename','phone','posisi','status']);
                const fields = {};
                Object.entries(row).forEach(([k,v]) => {
                    if (skipKeys.has(k) || v === null || v === undefined || v === '') return;
                    const label = labels[k] || k;
                    fields[label] = String(v);
                });

                // Build photos
                const photos = {};
                fotoKeys.forEach(({ key, label }) => {
                    const val = row[key];
                    if (!val) return;
                    if (val.startsWith('data:image')) {
                        photos[key] = { label, data: val };
                    } else if (val.startsWith('data:application/pdf') || val.toLowerCase().endsWith('.pdf')) {
                        photos[key] = { label, data: '[PDF]' + val, filename: label + '.pdf' };
                    } else if (val.startsWith('http') || val.startsWith('/')) {
                            if (/\.(pdf|doc|docx)$/i.test(val)) return;
                        photos[key] = { label, data: '[IMG]' + val };
                    } else if (val.length > 100) {
                        // Assume base64 image
                        photos[key] = { label, data: 'data:image/jpeg;base64,' + val };
                    }
                });

                // CV (PDF) untuk Pelamar Indo5
                if (row.cv_filename && type === 'Pelamar Indo5') {
                    photos['cv_filename'] = { label: 'CV Pelamar', data: '[DOC]/uploads/cv/' + row.cv_filename, filename: row.cv_filename };
                }

                all.push({
                    id: row.id,
                    name: row.nama || '-',
                    nik: row.nik || '-',
                    type,
                    status: row.submission_status || row.status || 'Baru',
                    time: row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-',
                    fields,
                    photos: Object.keys(photos).length > 0 ? photos : undefined
                });
            });
        });

        all.sort((a,b) => new Date(b.time) - new Date(a.time));
        res.json(all);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SUBMISSIONS PATCH/DELETE ──
app.patch('/api/submissions/:id', async (req, res) => { res.json({ success:true }); });
app.delete('/api/submissions/:id', async (req, res) => {
    const { id } = req.params;
    const type = req.query.type || (req.body && req.body.type);
    const tableMap = {
        'Pelamar Indo5':      'form_pelamar',
        'Data Diri Karyawan': 'form_datadiri',
        'Surat Referensi':    'form_referensi',
        'Blacklist Indolima': 'blacklist'
    };
    const table = tableMap[type];
    if (!table) return res.status(400).json({ success:false, message:'Tipe formulir tidak dikenali: ' + type });
    try {
        const r = await pool.query('DELETE FROM ' + table + ' WHERE id = $1 RETURNING id', [id]);
        if (r.rowCount === 0) return res.status(404).json({ success:false, message:'Data tidak ditemukan di database.' });
        res.json({ success:true });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});
app.delete('/api/submissions', async (req, res) => {
    const type = req.query.type || (req.body && req.body.type);
    const tableMap = {
        'Pelamar Indo5':      'form_pelamar',
        'Data Diri Karyawan': 'form_datadiri',
        'Surat Referensi':    'form_referensi',
        'Blacklist Indolima': 'blacklist'
    };
    try {
        if (type && tableMap[type]) {
            await pool.query('DELETE FROM ' + tableMap[type]);
        } else {
            for (const tbl of Object.values(tableMap)) {
                await pool.query('DELETE FROM ' + tbl);
            }
        }
        res.json({ success:true });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── EXPORT EXCEL PER TIPE ──
app.get('/api/export/:type', async (req, res) => {
    const typeMap = {
        'pelamar':   { table:'form_pelamar',   label:'Pelamar Indo5' },
        'datadiri':  { table:'form_datadiri',   label:'Data Diri Karyawan' },
        'referensi': { table:'form_referensi',  label:'Surat Referensi' },
        'blacklist': { table:'blacklist',        label:'Blacklist Indolima' },
    };
    const info = typeMap[req.params.type];
    if (!info) return res.status(404).json({ success:false, message:'Tipe tidak ditemukan' });
    try {
        const r = await pool.query('SELECT * FROM ' + info.table + ' ORDER BY created_at DESC');
        res.json({ success:true, data: r.rows, label: info.label });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── EXPORT PER KATEGORI ─────────────────────────────────────────
app.get('/api/admin/export/:category', async (req, res) => {
    const { category } = req.params;
    const tableMap = { datadiri: 'form_datadiri', referensi: 'form_referensi', pelamar: 'form_pelamar', blacklist: 'blacklist' };
    const table = tableMap[category];
    if (!table) return res.status(400).json({ error: 'Kategori tidak valid' });
    try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
        res.json(result.rows);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ── LOGIN HISTORY ────────────────────────────────────────────────
app.get('/api/admin/login-history', async (req, res) => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS admin_login_history (
            id SERIAL PRIMARY KEY,
            username TEXT,
            email TEXT,
            login_method TEXT DEFAULT 'password',
            login_at TIMESTAMPTZ DEFAULT NOW(),
            ip_address TEXT
        )`);
        const result = await pool.query('SELECT * FROM admin_login_history ORDER BY login_at DESC LIMIT 100');
        res.json({ success: true, data: result.rows });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete('/api/admin/users/:username', async (req, res) => {
    const { username } = req.params;
    try {
        await pool.query('DELETE FROM admin_users WHERE username = $1', [username]);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.patch('/api/admin/users/:username/block', verifyToken, async (req, res) => {
    const { username } = req.params;
    const { blocked } = req.body;
    try {
        await pool.query('UPDATE admin_users SET is_blocked = $1 WHERE username = $2', [blocked, username]);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── STATIC FILE FALLBACK ──
app.use((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.path));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return res.sendFile(f);
    const fhtml = f + '.html';
    if (fs.existsSync(fhtml)) return res.sendFile(fhtml);
    res.status(404).send('Not found: ' + req.path);
});

process.on('uncaughtException', e => console.log('UNCAUGHT:', e.message));
process.on('unhandledRejection', e => console.log('UNHANDLED:', e));
app.listen(PORT, '0.0.0.0', () => console.log('✅ Server Indo5 jalan di port ' + PORT));













