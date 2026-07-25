import { useEffect, useRef, useState } from 'react'
import { postPractice, fetchSpeechAudioUrl, VOICE_OPTIONS } from '../lib/api.js'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const speechInputSupported = !!SpeechRecognitionAPI
const speechOutputSupported = true

function PracticeChat({ need, onDone }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voice, setVoice] = useState(VOICE_OPTIONS[0].key)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  const stopSpeaking = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setIsSpeaking(false)
  }

  const speak = async (text, voiceKey) => {
    stopSpeaking()
    try {
      const url = await fetchSpeechAudioUrl(text, voiceKey)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsSpeaking(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setIsSpeaking(false)
      }
      setIsSpeaking(true)
      await audio.play()
    } catch (err) {
      setIsSpeaking(false)
      setError(err.message)
    }
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  const send = async (studentMessage) => {
    if (!studentMessage.trim() || loading) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    const nextMessages = [...messages, { role: 'student', content: studentMessage }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const { teacherReply, coachTip } = await postPractice(need, history, studentMessage)
      setMessages([...nextMessages, { role: 'teacher', content: teacherReply, coachTip }])
      if (voiceMode) speak(teacherReply, voice)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    send(input.trim())
  }

  const toggleVoiceMode = () => {
    if (voiceMode) {
      recognitionRef.current?.stop()
      stopSpeaking()
      setIsListening(false)
    }
    setError(null)
    setVoiceMode(!voiceMode)
  }

  const startListening = () => {
    if (!speechInputSupported) {
      setError('Voice input isn\'t supported in this browser — try Chrome, or just type instead.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }
      setInput(finalTranscript + interim)
    }

    recognition.onerror = (event) => {
      setError(`Voice input error: ${event.error}. Try tapping the mic again, or type instead.`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) send(finalTranscript.trim())
    }

    recognitionRef.current = recognition
    setError(null)
    setIsListening(true)
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Find your words</h1>
          <p className="text-ink/70 mt-1">
            Practice asking for <span className="font-medium">{need}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVoiceMode}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition ${
            voiceMode
              ? 'bg-harbor text-mist border-harbor'
              : 'bg-transparent text-harbor border-harbor/40 hover:border-harbor'
          }`}
        >
          {voiceMode ? '🎙️ Voice: On' : '🎙️ Voice: Off'}
        </button>
      </div>

      <div className="flex flex-col gap-3 min-h-[200px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'student' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                m.role === 'student' ? 'bg-ink text-mist' : 'bg-harbor/10 text-ink border border-harbor/30'
              }`}
            >
              {m.content}
              {m.role === 'teacher' && speechOutputSupported && (
                <button
                  type="button"
                  onClick={() => speak(m.content, voice)}
                  disabled={isSpeaking}
                  className="ml-2 align-middle text-ink/50 hover:text-ink disabled:opacity-40"
                  aria-label="Replay out loud"
                >
                  🔊
                </button>
              )}
            </div>
            {m.coachTip && (
              <div className="mt-1 text-sm text-sage italic px-2">💬 {m.coachTip}</div>
            )}
          </div>
        ))}
        {loading && <div className="text-ink/40 text-sm">The teacher is thinking…</div>}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>
      )}

      {voiceMode && (
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            className={`w-20 h-20 rounded-full text-3xl flex items-center justify-center transition disabled:opacity-40 ${
              isListening ? 'bg-red-400 animate-pulse text-white' : 'bg-marigold text-ink'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
          >
            🎤
          </button>
          <span className="text-sm text-ink/60">
            {isListening ? 'Listening… tap to stop' : 'Tap to speak'}
          </span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="text-sm border border-ink/15 rounded-lg px-2 py-1 text-ink/70 bg-white max-w-[240px]"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={voiceMode ? 'Or type instead…' : 'Can I get instructions written down too?'}
          className="flex-1 px-4 py-3 rounded-lg border border-ink/15 focus:border-harbor outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-harbor text-mist px-6 py-3 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>

      <button type="button" onClick={onDone} className="self-start text-harbor underline underline-offset-4">
        Done practicing for now
      </button>
    </div>
  )
}

export default PracticeChat
