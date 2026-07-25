import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { understandPrompt, practicePrompt, reflectPrompt, sharePrompt } from './prompts.js'

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
  const { need, whatHappened, feeling, notes } = req.body
  if (!need || !whatHappened || !whatHappened.trim()) {
    return res.status(400).json({ error: 'need and whatHappened are required' })
  }

  const userMessage = [
    `Need they were practicing: ${need}`,
    `What happened: ${whatHappened.trim()}`,
    feeling ? `They rated how it felt as ${feeling}/5.` : null,
    notes && notes.trim() ? `Additional notes: ${notes.trim()}` : null
  ].filter(Boolean).join('\n')

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 250,
      system: reflectPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    res.json({ reflectionText: textBlock.text.trim() })
  } catch (err) {
    console.error('reflect error:', err)
    res.status(500).json({ error: 'Failed to generate a reflection. Please try again.' })
  }
})

// Stage 4 — Share
app.post('/api/share', async (req, res) => {
  const { need, formalTerm, practicedPhrase, reflections } = req.body
  if (!need || !need.trim()) {
    return res.status(400).json({ error: 'need is required' })
  }

  const userMessage = [
    `Need: ${need}`,
    formalTerm ? `Formal term: ${formalTerm}` : null,
    practicedPhrase ? `Example of how they've practiced asking for it: "${practicedPhrase}"` : null,
    Array.isArray(reflections) && reflections.length
      ? `Past reflections on how it's gone:\n${reflections.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : null
  ].filter(Boolean).join('\n\n')

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: sharePrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    res.json({ summaryText: textBlock.text.trim() })
  } catch (err) {
    console.error('share error:', err)
    res.status(500).json({ error: 'Failed to generate your one-pager. Please try again.' })
  }
})

app.listen(PORT, () => {
  console.log(`MyVoice server running on http://localhost:${PORT}`)
})

export { anthropic }
