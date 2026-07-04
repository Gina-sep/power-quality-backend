const express = require('express');

const router = express.Router();

const getDB = require('../config/database');

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
  SELECT voltage_v, current_a, frequency_hz, power_factor, power_w, thd_voltage, recorded_at 
  FROM sensor_readings 
  WHERE device_id = 1 
  AND recorded_at >= NOW() - INTERVAL 30 DAY
  ORDER BY recorded_at DESC 
  LIMIT 500
`);

const [evts] = await conn.execute(`
  SELECT event_type, severity, started_at
  FROM power_quality_events
  WHERE device_id = 1
  AND started_at >= NOW() - INTERVAL 30 DAY
  ORDER BY started_at DESC
`);

    // Susun data MySQL jadi string teks buat konteks Gemini
    const dataKonteks = rows.map(r =>
  `${r.recorded_at} | V:${r.voltage_v} | A:${r.current_a} | Hz:${r.frequency_hz} | PF:${r.power_factor} | W:${r.power_w} | THD:${r.thd_voltage}%`
).join('\n');

const eventKonteks = evts.map(e =>
  `${e.started_at} | ${e.event_type} | ${e.severity}`
).join('\n');
    // Bikin prompt gabungan
    const promptKomplit = `Kamu adalah asisten ahli sistem kelistrikan untuk Lab Elektro UII.
Data sensor 30 hari terakhir:
${dataKonteks}

Gangguan terdeteksi:
${eventKonteks}

Pertanyaan: "${question}"

Jawab secara ringkas, solutif, berbasis data di atas. Jika ditanya prediksi, gunakan tren data yang ada.`;

    // Panggil Gemini menggunakan Axios (Pastikan library axios sudah terinstall, atau pakai fetch bawaan lu)
    const fetch = (await import('node-fetch')).default;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
router.get('/chat-ui', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111217;
      color: #d4d4d4;
      font-family: 'Segoe UI', sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 10px;
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg {
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 90%;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .user { background: #1f6feb; align-self: flex-end; color: white; }
    .bot  { background: #1e1e2e; align-self: flex-start; border: 1px solid #333; }
    #inputArea { display: flex; gap: 8px; }
    #inputBox {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #444;
      background: #1a1a2e;
      color: #fff;
      font-size: 13px;
      outline: none;
    }
    #sendBtn {
      padding: 8px 16px;
      background: #1f6feb;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    #sendBtn:disabled { background: #444; cursor: not-allowed; }
  </style>
</head>
<body>
  <div id="messages">
    <div class="msg bot">👋 Halo! Tanya apa saja soal data power quality.</div>
  </div>
  <div id="inputArea">
    <input id="inputBox" type="text" placeholder="Contoh: cek anomali tanggal 4 Juni..." />
    <button id="sendBtn">Kirim</button>
  </div>
  <script>
    const API_BASE = window.location.origin;
    document.getElementById('sendBtn').addEventListener('click', kirim);
    document.getElementById('inputBox').addEventListener('keydown', e => {
      if (e.key === 'Enter') kirim();
    });
    async function kirim() {
      const input = document.getElementById('inputBox');
      const pertanyaan = input.value.trim();
      if (!pertanyaan) return;
      tambahPesan(pertanyaan, 'user');
      input.value = '';
      const btn = document.getElementById('sendBtn');
      btn.disabled = true;
      const thinking = tambahPesan('Sedang menganalisis...', 'bot');
      try {
        const res = await fetch(API_BASE + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: pertanyaan })
        });
        const data = await res.json();
        thinking.remove();
        tambahPesan(data.reply || 'Tidak ada jawaban.', 'bot');
      } catch(err) {
        thinking.remove();
        tambahPesan('Gagal konek ke backend.', 'bot');
      } finally {
        btn.disabled = false;
        input.focus();
      }
    }
    function tambahPesan(teks, tipe) {
      const div = document.createElement('div');
      div.className = 'msg ' + tipe;
      div.textContent = teks;
      const box = document.getElementById('messages');
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      return div;
    }
  </script>
</body>
</html>`);
});
module.exports = router;
