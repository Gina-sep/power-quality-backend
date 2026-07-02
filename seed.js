const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('Mulai generate data dummy 3 fasa...');

  for (let i = 0; i < 100; i++) {
    const baseV = 220 + (Math.random() - 0.5) * 10;
    const baseI = 2 + Math.random() * 8;

    await conn.execute(`
      INSERT INTO power_quality_3phase 
      (device_code, recorded_at,
       VRS, VST, VTR, VRN, VSN, VTN, UNBALANCE_V,
       IR, IS, IT, IN, UNBALANCE_I,
       PF_R, PF_S, PF_T, DAYA_AKTIF_TOTAL, DAYA_SEMU_TOTAL,
       FREKWENSI, ENERGY, IN_TERHADAP_BEBAN, SIGNAL_WIFI_DEVICE,
       suhu_transformator, status,
       THD_VR, THD_VS, THD_VT, THD_IR, THD_IS, THD_IT)
      VALUES (
        'LAB-ELEKT-01',
        NOW() - INTERVAL ${i} MINUTE,
        ${baseV + (Math.random()-0.5)*2},
        ${baseV + (Math.random()-0.5)*2},
        ${baseV + (Math.random()-0.5)*2},
        ${baseV/1.732 + (Math.random()-0.5)*2},
        ${baseV/1.732 + (Math.random()-0.5)*2},
        ${baseV/1.732 + (Math.random()-0.5)*2},
        ${Math.random() * 2},
        ${baseI + (Math.random()-0.5)*1},
        ${baseI + (Math.random()-0.5)*1},
        ${baseI + (Math.random()-0.5)*1},
        ${Math.random() * 0.5},
        ${Math.random() * 3},
        ${0.85 + Math.random() * 0.1},
        ${0.85 + Math.random() * 0.1},
        ${0.85 + Math.random() * 0.1},
        ${(220 * 5) + Math.random() * 500},
        ${(220 * 5.5) + Math.random() * 500},
        ${49.8 + Math.random() * 0.4},
        ${0.01 + Math.random() * 0.5},
        ${Math.random() * 5},
        ${-20 + Math.random() * 30},
        ${30 + Math.random() * 10},
        'Normal',
        ${1 + Math.random() * 4},
        ${1 + Math.random() * 4},
        ${1 + Math.random() * 4},
        ${3 + Math.random() * 10},
        ${3 + Math.random() * 10},
        ${3 + Math.random() * 10}
      )
    `);

    if (i % 10 === 0) console.log(`Progress: ${i+1}/100`);
  }

  await conn.end();
  console.log('✅ Selesai! 100 data dummy 3 fasa berhasil masuk.');
}

seed();