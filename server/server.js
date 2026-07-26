import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { understandPrompt, practicePrompt, reflectPrompt, sharePrompt } from './prompts.js'
import { understandTool, practiceTool, extractToolInput, extractText } from './tools.js'
import { MOCK_MODE, mockUnderstand, mockPractice, mockReflect, mockShare } from './mock.js'
import { getCategory } from '../shared/taxonomy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 3001

const hasKey = (key) => !!key && key !== 'paste_your_key_here'

if (MOCK_MODE) {
  console.log('🎭 MOCK=1 — serving fixture responses. No API keys used, no network calls made.')
} else {
  if (!hasKey(process.env.ANTHROPIC_API_KEY)) {
    console.warn('⚠️  ANTHROPIC_API_KEY is not set in server/.env — API calls will fail.')
    console.warn('    Tip: run `MOCK=1 npm run dev` to demo the full flow with no keys.')
  }
  if (!hasKey(process.env.ELEVENLABS_API_KEY)) {
    console.warn('⚠️  ELEVENLABS_API_KEY is not set — falling back to the browser voice for read-aloud.')
  }
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Curated set of ElevenLabs preset voices, keyed by a short id the client picks from.
const ELEVENLABS_VOICES = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  bella: 'hpp4J3VqNfWAUOO0d1Us',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  adam: 'pNInz6obpgDQGcFmaJgB'
}
const DEFAULT_VOICE_KEY = 'sarah'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// --- Guardrails -------------------------------------------------------------
// This is a local demo, but /api/tts proxies a paid ElevenLabs account and the Claude
// routes bill a real key. Unbounded input + no rate limit on an open CORS origin means
// anyone who finds the port can spend your money.

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173' // vite preview
]

app.use(
  cors({
    origin(origin, callback) {
      // No origin = curl, same-origin, or a health check. Allowed.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      callback(new Error('Origin not allowed'))
    }
  })
)

app.use(express.json({ limit: '64kb' }))

// Simple in-memory sliding window. Not distributed, not persistent — proportional to a
// single-node demo, and enough to stop a runaway loop or a curious port-scanner.
const RATE_LIMITS = {
  default: { windowMs: 60_000, max: 30 },
  '/api/tts': { windowMs: 60_000, max: 20 }
}
const hits = new Map()

function rateLimit(req, res, next) {
  const rule = RATE_LIMITS[req.path] || RATE_LIMITS.default
  const bucket = `${req.ip}:${req.path}`
  const now = Date.now()
  const recent = (hits.get(bucket) || []).filter((t) => now - t < rule.windowMs)

  if (recent.length >= rule.max) {
    const retryAfter = Math.ceil((rule.windowMs - (now - recent[0])) / 1000)
    res.set('Retry-After', String(retryAfter))
    return res.status(429).json({ error: `Slow down a moment — try again in ${retryAfter}s.` })
  }

  recent.push(now)
  hits.set(bucket, recent)
  next()
}

// Keep the map from growing without bound across a long-running session.
setInterval(() => {
  const now = Date.now()
  for (const [bucket, times] of hits) {
    const live = times.filter((t) => now - t < 60_000)
    if (live.length) hits.set(bucket, live)
    else hits.delete(bucket)
  }
}, 60_000).unref()

app.use('/api', rateLimit)

const LIMITS = {
  needText: 500,
  studentMessage: 1000,
  whatHappened: 2000,
  notes: 1000,
  ttsText: 1200,
  historyTurns: 40
}

// Returns a trimmed string, or throws a message safe to show a student.
function requireText(value, field, max) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new HttpError(400, `That's a bit long — please keep it under ${max} characters.`)
  }
  return trimmed
}

function optionalText(value, max) {
  if (typeof value !== 'string' || !value.trim()) return ''
  return value.trim().slice(0, max)
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Wraps a route so thrown HttpErrors become clean responses and everything else
// becomes a logged 500 with a student-friendly message.
function route(handler, fallbackMessage) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message })
      }
      console.error(`${req.path} error:`, err)
      res.status(500).json({ error: fallbackMessage })
    }
  }
}

// --- Routes -----------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mock: MOCK_MODE })
})

// Lets the client show an honest banner instead of discovering the state via a failed call.
app.get('/api/config', (req, res) => {
  res.json({
    mock: MOCK_MODE,
    elevenLabsAvailable: MOCK_MODE ? false : hasKey(ELEVENLABS_API_KEY)
  })
})

// Stage 1 — Understand
app.post(
  '/api/understand',
  route(async (req, res) => {
    const needText = requireText(req.body.needText, 'needText', LIMITS.needText)

    const raw = MOCK_MODE
      ? mockUnderstand(needText)
      : extractToolInput(
          await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: understandPrompt,
            tools: [understandTool],
            tool_choice: { type: 'tool', name: understandTool.name },
            messages: [{ role: 'user', content: needText }]
          }),
          understandTool.name
        )

    // The canonical term wins over whatever the model wrote. This is the whole point of the
    // taxonomy: two students who phrase the same need differently must get the same term,
    // or their growth history fragments and the document they hand a teacher is inconsistent.
    const category = getCategory(raw.categoryKey)
    res.json({
      categoryKey: raw.categoryKey,
      canonicalLabel: category ? category.label : needText,
      formalTerm: category ? category.formalTerm : raw.formalTerm,
      plainExplanation: raw.plainExplanation,
      whyItHelps: raw.whyItHelps
    })
  }, 'Failed to generate explanation. Please try again.')
)

// Stage 2 — Practice
app.post(
  '/api/practice',
  route(async (req, res) => {
    const need = requireText(req.body.need, 'need', LIMITS.needText)
    const studentMessage = requireText(req.body.studentMessage, 'studentMessage', LIMITS.studentMessage)
    const mode = req.body.mode === 'busy' ? 'busy' : 'warm'

    if (MOCK_MODE) {
      return res.json(mockPractice(studentMessage, mode))
    }

    const priorTurns = (Array.isArray(req.body.history) ? req.body.history : [])
      .slice(-LIMITS.historyTurns)
      .filter((turn) => turn && typeof turn.content === 'string' && turn.content.trim())
      .map((turn) => ({
        role: turn.role === 'teacher' ? 'assistant' : 'user',
        content: turn.content.slice(0, LIMITS.studentMessage)
      }))

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: practicePrompt(need, mode),
      tools: [practiceTool],
      tool_choice: { type: 'tool', name: practiceTool.name },
      messages: [...priorTurns, { role: 'user', content: studentMessage }]
    })

    res.json(extractToolInput(message, practiceTool.name))
  }, 'Failed to get a reply. Please try again.')
)

// Text-to-speech — proxies ElevenLabs so the API key never reaches the browser.
// The client falls back to the browser's own voice when this fails, so read-aloud
// degrades instead of disappearing.
app.post(
  '/api/tts',
  route(async (req, res) => {
    const text = requireText(req.body.text, 'text', LIMITS.ttsText)

    if (MOCK_MODE || !hasKey(ELEVENLABS_API_KEY)) {
      throw new HttpError(503, 'Premium voice is unavailable — using your browser voice instead.')
    }

    const voiceId = ELEVENLABS_VOICES[req.body.voice] || ELEVENLABS_VOICES[DEFAULT_VOICE_KEY]

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
      throw new HttpError(502, 'Premium voice failed — using your browser voice instead.')
    }

    const audioBuffer = Buffer.from(await elevenRes.arrayBuffer())
    res.set('Content-Type', 'audio/mpeg')
    res.send(audioBuffer)
  }, 'Failed to generate speech.')
)

// Stage 3 — Reflect
app.post(
  '/api/reflect',
  route(async (req, res) => {
    const need = requireText(req.body.need, 'need', LIMITS.needText)
    const whatHappened = requireText(req.body.whatHappened, 'whatHappened', LIMITS.whatHappened)
    const notes = optionalText(req.body.notes, LIMITS.notes)
    const feeling = Number(req.body.feeling)
    const attemptType = req.body.attemptType === 'practice' ? 'practice' : 'real'

    if (MOCK_MODE) {
      return res.json(mockReflect(attemptType))
    }

    const userMessage = [
      `Need they were practicing: ${need}`,
      `What happened: ${whatHappened}`,
      Number.isFinite(feeling) && feeling > 0 ? `They rated how it felt as ${feeling}/5.` : null,
      notes ? `Additional notes: ${notes}` : null
    ]
      .filter(Boolean)
      .join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: reflectPrompt(attemptType),
      messages: [{ role: 'user', content: userMessage }]
    })

    res.json({ reflectionText: extractText(message) })
  }, 'Failed to generate a reflection. Please try again.')
)

// Stage 4 — Share
app.post(
  '/api/share',
  route(async (req, res) => {
    const need = requireText(req.body.need, 'need', LIMITS.needText)
    const formalTerm = optionalText(req.body.formalTerm, 200)
    const practicedPhrase = optionalText(req.body.practicedPhrase, LIMITS.studentMessage)
    const reflections = (Array.isArray(req.body.reflections) ? req.body.reflections : [])
      .filter((r) => typeof r === 'string' && r.trim())
      .slice(0, 10)
      .map((r) => r.trim().slice(0, 600))

    if (MOCK_MODE) {
      return res.json({ summaryText: mockShare(need, formalTerm, practicedPhrase) })
    }

    const userMessage = [
      `Need: ${need}`,
      formalTerm ? `Formal term: ${formalTerm}` : null,
      practicedPhrase ? `Example of how they've practiced asking for it: "${practicedPhrase}"` : null,
      reflections.length
        ? `Past reflections on how it's gone:\n${reflections.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : null
    ]
      .filter(Boolean)
      .join('\n\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: sharePrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    res.json({ summaryText: extractText(message) })
  }, 'Failed to generate your one-pager. Please try again.')
)

app.listen(PORT, () => {
  console.log(`MyVoice server running on http://localhost:${PORT}${MOCK_MODE ? ' (mock mode)' : ''}`)
})

export { anthropic }
