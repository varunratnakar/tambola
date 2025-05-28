const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

// Middleware to ensure JSON body parsing (if parent app forgot)
router.use(express.json());

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
// Default voice (Rachel). Override via env var ELEVENLABS_VOICE_ID
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

// Simple on-disk cache folder
const CACHE_DIR = path.join(__dirname, 'tts-cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

function cachePathFor(text) {
  const hash = crypto.createHash('sha1').update(text).digest('hex');
  return path.join(CACHE_DIR, `${hash}.mp3`);
}

if (!ELEVEN_API_KEY) {
  console.warn('[ttsRouter] ELEVENLABS_API_KEY not set – TTS endpoint will return 501');
}

// POST /api/tts/speech { text: "..." }
router.post('/speech', async (req, res) => {
  if (!ELEVEN_API_KEY) return res.status(501).json({ error: 'TTS not configured' });
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text missing' });

  try {
    const filePath = cachePathFor(text);

    // Serve from cache if exists
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath).pipe(res.set('Content-Type', 'audio/mpeg'));
    }

    // Otherwise fetch from ElevenLabs
    const { data } = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        model_id: 'eleven_monolingual_v1',
        text,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.85
        }
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });

    // Save to cache (best-effort)
    try {
      fs.writeFileSync(filePath, data);
    } catch (e) {
      console.warn('[ttsRouter] Failed to write cache', e.message);
    }

    res.set('Content-Type', 'audio/mpeg').send(data);
  } catch (err) {
    console.error('[ttsRouter] ElevenLabs error', err?.response?.data || err.message);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

module.exports = router; 