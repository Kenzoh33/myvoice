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

export function postPractice(need, history, studentMessage) {
  return postJson('/api/practice', { need, history, studentMessage })
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
