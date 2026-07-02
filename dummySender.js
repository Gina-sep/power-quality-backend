// dummySender.js (versi https, tanpa node-fetch)
const https = require('https');

const BACKEND_URL = 'power-quality-backend-production.up.railway.app';
const BACKEND_PATH = '/api/data';

const rand = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

setInterval(() => {
  // ====================================================
  // BAGIAN 1 – KIRIM DATA LAMA (tetap seperti asli)
  // ====================================================
  const dataLama = JSON.stringify({
    device_id: 1,
    voltage_v: rand(215, 230),
    current_a: rand(3, 8.5),
    frequency_hz: rand(49.8, 50.2),
    power_w: rand(600, 1500),
    power_va: rand(650, 1600),
    power_var: rand(0, 500),
    power_factor: rand(0.85, 0.99),
    thd_voltage: rand(1.5, 5.0),
    thd_current: rand(4, 12),
    energy_kwh: rand(0, 5)
  });

  const optionsLama = {
    hostname: BACKEND_URL,
    path: BACKEND_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataLama)
    }
  };

  const reqLama = https.request(optionsLama, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        console.log(`[${new Date().toLocaleTimeString()}] V=${JSON.parse(dataLama).voltage_v}V → ${result.success ? '✓ BERHASIL' : '✗ GAGAL'}`);
      } catch (e) {
        console.log(`[${new Date().toLocaleTimeString()}] Error parsing response`);
      }
    });
  });

  reqLama.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
  });

  reqLama.write(dataLama);
  reqLama.end();

  // ====================================================
  // BAGIAN 2 – TAMBAHAN KIRIM DATA 3 FASA (BARU)
  // ====================================================
  const rand3 = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

  const data3Fasa = JSON.stringify({
    device_code: 'LAB-ELEKT-01',
    koneksi: 'Online',
    VRS: rand3(375, 385),
    VST: rand3(375, 385),
    VTR: rand3(375, 385),
    VRN: rand3(217, 223),
    VSN: rand3(217, 223),
    VTN: rand3(217, 223),
    UNBALANCE_V: rand3(0, 2),
    IR: rand3(5, 10),
    IS: rand3(5, 10),
    IT: rand3(5, 10),
    IN: rand3(0.1, 0.6),
    UNBALANCE_I: rand3(0, 3),
    PF_R: rand3(0.80, 0.95),
    PF_S: rand3(0.80, 0.95),
    PF_T: rand3(0.80, 0.95),
    DAYA_AKTIF_TOTAL: rand3(1200, 1600),
    DAYA_SEMU_TOTAL: rand3(1400, 1800),
    FREKWENSI: rand3(49.8, 50.2),
    ENERGY: rand3(0.5, 2.5),
    IN_TERHADAP_BEBAN: 0,
    SIGNAL_WIFI_DEVICE: rand3(-50, -20),
    suhu_transformator: rand3(30, 45),
    status: ['Normal', 'Normal', 'Normal', 'Normal', 'Warning'][Math.floor(Math.random() * 5)],
    THD_VR: rand3(1.5, 4.5),
    THD_VS: rand3(1.5, 4.5),
    THD_VT: rand3(1.5, 4.5),
    THD_IR: rand3(3, 9),
    THD_IS: rand3(3, 9),
    THD_IT: rand3(3, 9)
  });

  const options3Fasa = {
    hostname: BACKEND_URL,
    path: '/api/readings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data3Fasa)
    }
  };

  const req3Fasa = https.request(options3Fasa, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        const parsed = JSON.parse(data3Fasa);
        console.log(`[3FASA] VRS=${parsed.VRS}V → ${result.status === 'success' ? '✓' : '✗'}`);
      } catch (e) {
        console.log(`[3FASA] Error parsing response`);
      }
    });
  });

  req3Fasa.on('error', (err) => {
    console.error(`[3FASA] Error: ${err.message}`);
  });

  req3Fasa.write(data3Fasa);
  req3Fasa.end();

}, 3000); // ← Ubah angka ini untuk atur kecepatan (1000 = 1 detik)

console.log('🚀 Script dummy sender berjalan! Data akan dikirim setiap 3 detik.');
console.log('📡 Data lama ke /api/data + Data 3 fasa ke /api/readings');
console.log('Tekan Ctrl+C untuk berhenti.');