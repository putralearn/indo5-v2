const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
    console.log('=== form_datadiri ===');
    const r1 = await pool.query(`SELECT id, nik, project, nomor_kk, email, created_at FROM form_datadiri ORDER BY created_at DESC LIMIT 10`);
    r1.rows.forEach(row => console.log(JSON.stringify(row)));

    console.log('=== form_referensi ===');
    const r2 = await pool.query(`SELECT id, nik, project, email, created_at FROM form_referensi ORDER BY created_at DESC LIMIT 10`);
    r2.rows.forEach(row => console.log(JSON.stringify(row)));

    await pool.end();
})();
