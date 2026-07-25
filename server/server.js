import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { understandPrompt, practicePrompt } from './prompts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 3001

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'paste_your_key_here') {
  console.warn('⚠️  ANTHROPIC_API_KEY is not set in server/.env — API calls will fail.')
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'paste_your_key_here') {
  console.warn('⚠️  ELEVENLABS_API_KEY is not set in server/.env — voice playback will fail.')
}

// Curated set of ElevenLabs preset voices, keyed by a short id the client picks from.
const ELEVENLABS_VOICES = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  bella: 'hpp4J3VqNfWAUOO0d1Us',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  adam: 'pNInz6obpgDQGcFmaJgB'
}
const DEFAULT_VOICE_KEY = 'sarah'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.use(cors())
app.use(express.json())

function extractJson(content) {
  const textBlock = content.find((block) => block.type === 'text')
  const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Stage 1 — Understand
app.post('/api/understand', async (req, res) => {
  const { needText } = req.body
  if (!needText || !needText.trim()) {
    return res.status(400).json({ error: 'needText is required' })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: understandPrompt,
      messages: [{ role: 'user', content: needText }]
    })

    const parsed = extractJson(message.content)
    res.json(parsed)
  } catch (err) {
    console.error('understand error:', err)
    res.status(500).json({ error: 'Failed to generate explanation. Please try again.' })
  }
})

// Stage 2 — Practice
app.post('/api/practice', async (req, res) => {
  const { need, history, studentMessage } = req.body
  if (!need || !studentMessage || !studentMessage.trim()) {
    return res.status(400).json({ error: 'need and studentMessage are required' })
  }

  try {
    const priorTurns = Array.isArray(history)
      ? history.map((turn) => ({
          role: turn.role === 'teacher' ? 'assistant' : 'user',
          content: turn.content
        }))
      : []

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: practicePrompt(need),
      messages: [...priorTurns, { role: 'user', content: studentMessage }]
    })

    const parsed = extractJson(message.content)
    res.json(parsed)
  } catch (err) {
    console.error('practice error:', err)
    res.status(500).json({ error: 'Failed to get a reply. Please try again.' })
  }
})

// Text-to-speech — proxies ElevenLabs so the API key never reaches the browser
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES[DEFAULT_VOICE_KEY]

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    })

    if (!elevenRes.ok) {
      const errBody = await elevenRes.text()
      console.error('ElevenLabs error:', elevenRes.status, errBody)
      return res.status(502).json({ error: 'Failed to generate speech. Please try again.' })
    }

    const audioBuffer = Buffer.from(await elevenRes.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg')
    res.send(audioBuffer)
  } catch (err) {
    console.error('tts error:', err)
    res.status(500).json({ error: 'Failed to generate speech. Please try again.' })
  }
})

// Stage 3 — Reflect
app.post('/api/reflect', async (req, res) => {
  res.status(501).json({ error: 'not implemented yet' })
})

// Stage 4 — Share
app.post('/api/share', async (req, res) => {
  res.status(501).json({ error: 'not implemented yet' })
})

app.listen(PORT, () => {
  console.log(`MyVoice server running on http://localhost:${PORT}`)
})

export { anthropic }
