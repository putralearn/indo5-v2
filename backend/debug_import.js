const { Pool } = require('pg');
const fs = require('fs');

const neonPool = new Pool({ 
    connectionString: 'postgresql://neondb_owner:npg_ZKS23UTDkQGW@ep-long-feather-ao2u397z.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    const sql = fs.readFileSync('C:\\laragon\\www\\indo5\\backend\\data_export.sql', 'utf8');
    const statements = sql.split('\n').filter(line => line.startsWith('INSERT'));
    
    // Coba 3 statement pertama aja buat lihat errornya
    for (let i = 0; i < Math.min(3, statements.length); i++) {
        try {
            await neonPool.query(statements[i]);
            console.log('OK:', statements[i].substring(0, 80));
        } catch(e) {
            console.log('ERROR:', e.message);
            console.log('SQL:', statements[i].substring(0, 120));
        }
    }
    await neonPool.end();
})();
