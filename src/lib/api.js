async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Request failed')
  }

  return res.json()
}

export function postUnderstand(needText) {
  return postJson('/api/understand', { needText })
}

export function postPractice(need, history, studentMessage, mode) {
  return postJson('/api/practice', { need, history, studentMessage, mode })
}

export function postReflect(need, whatHappened, feeling, notes, attemptType) {
  return postJson('/api/reflect', { need, whatHappened, feeling, notes, attemptType })
}

export function postShare(need, formalTerm, practicedPhrase, reflections) {
  return postJson('/api/share', { need, formalTerm, practicedPhrase, reflections })
}

export async function fetchConfig() {
  try {
    const res = await fetch('/api/config')
    if (!res.ok) throw new Error('config unavailable')
    return res.json()
  } catch {
    return { mock: false, elevenLabsAvailable: false }
  }
}

// Keep these keys in sync with ELEVENLABS_VOICES in server/server.js
export const VOICE_OPTIONS = [
  { key: 'sarah', label: 'Sarah — calm & reassuring' },
  { key: 'bella', label: 'Bella — bright & warm' },
  { key: 'george', label: 'George — warm storyteller' },
  { key: 'adam', label: 'Adam — firm & confident' }
]

export async function fetchSpeechAudioUrl(text, voice) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice })
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to generate speech')
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
