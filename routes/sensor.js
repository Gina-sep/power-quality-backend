const express = require('express');

const router = express.Router();

const getDB = require('../config/database');

router.post('/data', async (req, res) => {
  try {
    const { 
      device_id, 
      voltage_v, 
      current_a, 
      frequency_hz, 
      power_w, 
      power_va, 
      power_var, 
      power_factor, 
      thd_voltage, 
      thd_current, 
      energy_kwh 
    } = req.body;

    // Validasi minimal: device_id dan voltage_v wajib ada
    if (!device_id || voltage_v === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'device_id dan voltage_v wajib diisi' 
      });
    }

    const conn = await getDB();
    
    await conn.execute(
      `INSERT INTO sensor_readings 
       (device_id, voltage_v, current_a, frequency_hz, power_w, power_va, power_var, power_factor, thd_voltage, thd_current, energy_kwh, recorded_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        device_id, 
        voltage_v, 
        current_a || 0, 
        frequency_hz || 0, 
        power_w || 0, 
        power_va || 0, 
        power_var || 0, 
        power_factor || 0, 
        thd_voltage || 0, 
        thd_current || 0, 
        energy_kwh || 0
      ]
    );
    
    await conn.end();
    
    res.json({ success: true, message: 'Data berhasil disimpan' });
  } catch (error) {
    console.error('Error di /api/data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.post('/readings', async (req, res) => {
  try {
    const {
      device_code,
      koneksi, VRS, VST, VTR, VRN, VSN, VTN, UNBALANCE_V,
      IR, IS, IT, IN, UNBALANCE_I,
      PF_R, PF_S, PF_T, DAYA_AKTIF_TOTAL, DAYA_SEMU_TOTAL,
      FREKWENSI, ENERGY, IN_TERHADAP_BEBAN, SIGNAL_WIFI_DEVICE,
      suhu_transformator, status,
      THD_VR, THD_VS, THD_VT, THD_IR, THD_IS, THD_IT
    } = req.body;

    // Validasi wajib
    if (!device_code) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'device_code wajib dikirim!' 
      });
    }

    const conn = await getDB();

    // Cari device_id dari device_code
    const [device] = await conn.execute(
      'SELECT id FROM devices WHERE device_code = ?', 
      [device_code]
    );

    if (device.length === 0) {
      await conn.end();
      return res.status(404).json({ 
        status: 'error', 
        message: `Device ${device_code} tidak ditemukan!` 
      });
    }

    const device_id = device[0].id;

    // Simpan ke tabel power_quality_3phase
    await conn.execute(`
  INSERT INTO \`power_quality_3phase\` (
    \`device_code\`, \`recorded_at\`,
    \`VRS\`, \`VST\`, \`VTR\`, \`VRN\`, \`VSN\`, \`VTN\`, \`UNBALANCE_V\`,
    \`IR\`, \`IS\`, \`IT\`, \`IN\`, \`UNBALANCE_I\`,
    \`PF_R\`, \`PF_S\`, \`PF_T\`, \`DAYA_AKTIF_TOTAL\`, \`DAYA_SEMU_TOTAL\`,
    \`FREKWENSI\`, \`ENERGY\`, \`IN_TERHADAP_BEBAN\`, \`SIGNAL_WIFI_DEVICE\`,
    \`suhu_transformator\`, \`status\`,
    \`THD_VR\`, \`THD_VS\`, \`THD_VT\`, \`THD_IR\`, \`THD_IS\`, \`THD_IT\`
  )
  VALUES (?, NOW(),
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?,
    ?, ?, ?, ?, ?, ?)
`, [
  device_code,
  VRS, VST, VTR, VRN, VSN, VTN, UNBALANCE_V,
  IR, IS, IT, IN, UNBALANCE_I,
  PF_R, PF_S, PF_T, DAYA_AKTIF_TOTAL, DAYA_SEMU_TOTAL,
  FREKWENSI, ENERGY, IN_TERHADAP_BEBAN, SIGNAL_WIFI_DEVICE,
  suhu_transformator, status,
  THD_VR, THD_VS, THD_VT, THD_IR, THD_IS, THD_IT
]);

    await conn.end();

    res.json({ 
      status: 'success', 
      message: 'Data 3 fasa berhasil disimpan!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error di /api/readings:", error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Gagal menyimpan data: ' + error.message 
    });
  }
});
module.exports = router;