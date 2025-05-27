const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// Middleware to ensure JSON body parsing (if parent app forgot)
router.use(express.json());

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
// Default voice (Rachel). Override via env var ELEVENLABS_VOICE_ID
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'eC4FlI1x70vgHUajEjH8';

if (!ELEVEN_API_KEY) {
  console.warn('[ttsRouter] ELEVENLABS_API_KEY not set – TTS endpoint will return 501');
}

// POST /api/tts/speech { text: "..." }
router.post('/speech', async (req, res) => {
  if (!ELEVEN_API_KEY) return res.status(501).json({ error: 'TTS not configured' });
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text missing' });

  try {
    const { data } = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        model_id: 'eleven_flash_v2_5',
        text,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.85
        }
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });
    res.set('Content-Type', 'audio/mpeg');
    res.send(data);
  } catch (err) {
    console.error('[ttsRouter] ElevenLabs error', err?.response?.data || err.message);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

module.exports = router; 