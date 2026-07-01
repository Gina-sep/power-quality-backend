// dummySender.js (versi https, tanpa node-fetch)
const https = require('https');

const BACKEND_URL = 'power-quality-backend-production.up.railway.app';
const BACKEND_PATH = '/api/data';

const rand = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

setInterval(() => {
  const data = JSON.stringify({
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

  const options = {
    hostname: BACKEND_URL,
    path: BACKEND_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        console.log(`[${new Date().toLocaleTimeString()}] V=${JSON.parse(data).voltage_v}V → ${result.success ? '✓ BERHASIL' : '✗ GAGAL'}`);
      } catch (e) {
        console.log(`[${new Date().toLocaleTimeString()}] Error parsing response`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
  });

  req.write(data);
  req.end();
}, 3000); // ← Ubah angka ini untuk atur kecepatan (1000 = 1 detik)

console.log('🚀 Script dummy sender berjalan! Data akan dikirim setiap 3 detik.');
console.log('Tekan Ctrl+C untuk berhenti.');