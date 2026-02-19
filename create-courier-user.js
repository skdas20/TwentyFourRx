const bcrypt = require('bcrypt');

async function createHash() {
    const hash = await bcrypt.hash('courier123', 10);
    console.log('Bcrypt hash:', hash);
    console.log('\nSQL to create courier user:');
    console.log(`
INSERT INTO users (email, name, password, role_code, status, is_active)
VALUES ('courier@24rx.in', 'Courier Partner', '${hash}', 'COURIER', 'APPROVED', true)
ON CONFLICT (email) DO UPDATE 
SET password = '${hash}', role_code = 'COURIER', status = 'APPROVED', is_active = true;
    `);
}

createHash();
