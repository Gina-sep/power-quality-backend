const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const router = express.Router();

async function getDB() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
}

router.get('/analyze', async (req, res) => {
  console.log("Cek API Key di env:", process.env.GEMINI_API_KEY); // <-- Tambahkan ini untuk tes

  // ... kode lu yang lain ...
  try {
    const conn = await getDB();

    const [stats] = await conn.execute(`
      SELECT
        ROUND(AVG(voltage_v), 2)    AS avg_voltage,
        ROUND(MIN(voltage_v), 2)    AS min_voltage,
        ROUND(MAX(voltage_v), 2)    AS max_voltage,
        ROUND(AVG(current_a), 2)    AS avg_current,
        ROUND(AVG(frequency_hz), 2) AS avg_frequency,
        ROUND(MIN(frequency_hz), 2) AS min_frequency,
        ROUND(MAX(frequency_hz), 2) AS max_frequency,
        ROUND(AVG(power_factor), 3) AS avg_pf,
        ROUND(MIN(power_factor), 3) AS min_pf,
        ROUND(AVG(power_w), 1)      AS avg_power,
        ROUND(MAX(power_w), 1)      AS max_power,
        ROUND(AVG(thd_voltage), 2)  AS avg_thd,
        ROUND(MAX(thd_voltage), 2)  AS max_thd,
        COUNT(*)                    AS total_readings
      FROM sensor_readings
      WHERE device_id = 1
  AND recorded_at >= NOW() - INTERVAL 15 DAY
    `);

    const [events] = await conn.execute(`
      SELECT event_type, severity, COUNT(*) as jumlah
      FROM power_quality_events
     WHERE device_id = 1
  AND started_at >= NOW() - INTERVAL 15 DAY
      GROUP BY event_type, severity
    `);

    const [weekly] = await conn.execute(`
      SELECT
        DATE(recorded_at)           AS tanggal,
        ROUND(AVG(voltage_v), 2)    AS avg_voltage,
        ROUND(AVG(power_factor), 3) AS avg_pf,
        ROUND(AVG(thd_voltage), 2)  AS avg_thd,
        ROUND(AVG(power_w), 1)      AS avg_power
      FROM sensor_readings
     WHERE device_id = 1
  AND recorded_at >= NOW() - INTERVAL 30 DAY
      GROUP BY DATE(recorded_at)
      ORDER BY tanggal ASC
    `);

    await conn.end();

    const d = stats[0];
    const eventSummary = events.length > 0
      ? events.map(e => `${e.event_type} (${e.severity}): ${e.jumlah}x`).join(', ')
      : 'Tidak ada gangguan';
    const weeklyTrend = weekly.map(w =>
      `${w.tanggal}: V=${w.avg_voltage}V, PF=${w.avg_pf}, THD=${w.avg_thd}%, P=${w.avg_power}W`
    ).join('\n');

    const prompt = `
Kamu adalah AI analis power quality listrik profesional.
Analisis data power quality berikut dari Lab Elektro UII:

DATA 24 JAM TERAKHIR:
- Tegangan rata-rata  : ${d.avg_voltage} V (normal PLN: 207-253V)
- Tegangan minimum   : ${d.min_voltage} V
- Tegangan maksimum  : ${d.max_voltage} V
- Arus rata-rata     : ${d.avg_current} A
- Frekuensi rata-rata: ${d.avg_frequency} Hz (normal: 49.5-50.5Hz)
- Frekuensi min/max  : ${d.min_frequency}/${d.max_frequency} Hz
- Power Factor rata-rata: ${d.avg_pf} (standar PLN: >= 0.85)
- Power Factor minimum  : ${d.min_pf}
- Daya rata-rata     : ${d.avg_power} W
- Daya maksimum      : ${d.max_power} W
- THD rata-rata      : ${d.avg_thd}% (standar IEEE 519: <= 5%)
- THD maksimum       : ${d.max_thd}%
- Total data         : ${d.total_readings} pembacaan

GANGGUAN TERDETEKSI (24 jam):
${eventSummary}

TREN 7 HARI:
${weeklyTrend}

Berikan analisis Bahasa Indonesia mencakup:
1. Kondisi umum power quality saat ini
2. Parameter yang perlu diwaspadai
3. Analisis tren 7 hari
4. Prediksi 24 jam ke depan
5. Rekomendasi tindakan
Format: singkat, jelas, profesional.
    `;

    const fetch = (await import('node-fetch')).default;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    console.log(`Respon asli Google: ${JSON.stringify(geminiData)}`);
    const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      ?? 'Gemini tidak memberikan respons.';

    const conn2 = await getDB();
    await conn2.execute(
      `INSERT INTO ai_analysis (device_id, analysis, generated_at) VALUES (?, ?, NOW())`,
      [1, analysis]
    );
    await conn2.end();

    res.json({ success: true, analysis, data: stats[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/analysis-history', async (req, res) => {
  try {
    const conn = await getDB();
    const [rows] = await conn.execute(`
      SELECT analysis, generated_at
      FROM ai_analysis
      WHERE device_id = 1
      ORDER BY generated_at DESC
      LIMIT 10
    `);
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ========================================================
// ENDPOINT CHAT INTERAKTIF BARU (TARUH DI ATAS MODULE.EXPORTS)
// ========================================================
router.post('/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong' });
    }

    // Pakai fungsi getDB() bawaan file gemini.js lu buat koneksi database
    const conn = await getDB();

    // Ambil data terbaru dari sensor_readings (menyesuaikan skema tabel asli lu)
    const [rows] = await conn.execute(`
            SELECT voltage_v, current_a, recorded_at 
            FROM sensor_readings 
            WHERE device_id = 1 
            ORDER BY recorded_at DESC 
            LIMIT 50
        `);

    // Susun data MySQL jadi string teks buat konteks Gemini
    const dataKonteks = rows.map(r => `Waktu: ${r.recorded_at}, Tegangan: ${r.voltage_v}V, Arus: ${r.current_a}A`).join('\n');

    // Bikin prompt gabungan
    const promptKomplit = `Kamu adalah asisten ahli sistem kelistrikan. Berikut adalah data metrik terbaru dari database MySQL:\n\n${dataKonteks}\n\nPertanyaan User: "${question}"\n\nJawablah pertanyaan tersebut secara ringkas, solutif, dan berbasis data di atas.`;

    // Panggil Gemini menggunakan Axios (Pastikan library axios sudah terinstall, atau pakai fetch bawaan lu)
    const fetch = (await import('node-fetch')).default;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptKomplit }] }]
        })
      }
    );

    const responseData = await geminiRes.json();

    if (responseData.error) {
      console.error("Error dari Google:", responseData.error);
      return res.status(500).json({ reply: "Sori bro, Google Gemini menolak request karena: " + responseData.error.message });
    }

    const jawabanGemini = responseData.candidates[0].content.parts[0].text;
    res.json({ reply: jawabanGemini });

  } catch (error) {
    console.error("Error di /api/chat:", error.message);
    res.status(500).json({ reply: "Sori bro, backend gagal memproses chat interaktif." });
  }
});
module.exports = router;