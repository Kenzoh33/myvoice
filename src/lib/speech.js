import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSpeechAudioUrl } from './api.js'

// Read-aloud for the whole app, not just teacher replies.
//
// The original build could speak the roleplay teacher but not the instructions, the
// explanation card, or the one-pager — so a student who needs text read to them couldn't
// read the app that teaches them to ask for text to be read to them. Every screen now
// gets a speak button, and every one of them routes through here.
//
// Two tiers, deliberately: ElevenLabs when a key is configured (it sounds like a person,
// which matters for a roleplay), the browser's own speechSynthesis when it isn't. The
// fallback means read-aloud degrades in quality instead of vanishing — including in mock
// mode, where /api/tts intentionally 503s.

export const browserSpeechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

let currentAudio = null
let currentObjectUrl = null

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
  if (browserSpeechSupported) {
    window.speechSynthesis.cancel()
  }
}

function speakWithBrowser(text, onEnd) {
  if (!browserSpeechSupported) {
    onEnd()
    throw new Error("Read-aloud isn't available in this browser.")
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.95
  utterance.onend = onEnd
  utterance.onerror = onEnd
  window.speechSynthesis.speak(utterance)
  return 'browser'
}

// Resolves once playback has *started*; onEnd fires when it finishes.
export async function speak(text, voiceKey, onEnd = () => {}) {
  stopSpeaking()

  let url
  try {
    url = await fetchSpeechAudioUrl(text, voiceKey)
  } catch {
    return speakWithBrowser(text, onEnd)
  }

  try {
    const audio = new Audio(url)
    currentAudio = audio
    currentObjectUrl = url

    const finish = () => {
      if (currentObjectUrl === url) {
        URL.revokeObjectURL(url)
        currentObjectUrl = null
      }
      if (currentAudio === audio) currentAudio = null
      onEnd()
    }
    audio.onended = finish
    audio.onerror = finish

    await audio.play()
    return 'elevenlabs'
  } catch {
    URL.revokeObjectURL(url)
    currentAudio = null
    currentObjectUrl = null
    return speakWithBrowser(text, onEnd)
  }
}

// Tracks which item is currently speaking so buttons can render a stop state.
// Clicking the same item again stops it — a student who triggered read-aloud by
// accident needs a way out that isn't "wait 40 seconds".
export function useSpeaker(voiceKey) {
  const [speakingId, setSpeakingId] = useState(null)
  const [speechError, setSpeechError] = useState(null)
  const activeId = useRef(null)

  useEffect(() => {
    return () => {
      stopSpeaking()
      activeId.current = null
    }
  }, [])

  const stop = useCallback(() => {
    stopSpeaking()
    activeId.current = null
    setSpeakingId(null)
  }, [])

  const toggle = useCallback(
    async (id, text) => {
      if (activeId.current === id) {
        stop()
        return
      }
      setSpeechError(null)
      activeId.current = id
      setSpeakingId(id)
      try {
        await speak(text, voiceKey, () => {
          if (activeId.current === id) {
            activeId.current = null
            setSpeakingId(null)
          }
        })
      } catch (err) {
        activeId.current = null
        setSpeakingId(null)
        setSpeechError(err.message)
      }
    },
    [voiceKey, stop]
  )

  return { speakingId, toggle, stop, speechError }
}
