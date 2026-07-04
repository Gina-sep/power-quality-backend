const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const geminiRoutes = require('./routes/gemini');
const chatRoutes = require('./routes/chat');
const sensorRoutes = require('./routes/sensor');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', geminiRoutes);
app.use('/api', chatRoutes);
app.use('/api', sensorRoutes);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
    console.log(`Backend jalan di port ${PORT}`);
});

// Jalur Chat Gemini Interaktif nempel langsung di port ini
app.post('/api/chat', geminiRoutes);

// Fungsi Auto Analisis bawaan lu tetep aman di bawah sini
setInterval(async () => {
    try {
        const fetch = (await import('node-fetch')).default;
        await fetch(`http://localhost:4000/api/analyze`);
        console.log('Auto analisis Gemini:', new Date().toLocaleString());
    } catch (e) {
        console.error('Auto analisis gagal:', e.message);
    }
}, 60 * 60 * 1000);
