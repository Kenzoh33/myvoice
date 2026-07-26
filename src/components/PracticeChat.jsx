import { useEffect, useRef, useState } from 'react'
import { postPractice, VOICE_OPTIONS } from '../lib/api.js'
import { useSpeaker } from '../lib/speech.js'
import SpeakButton from './SpeakButton.jsx'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const speechInputSupported = !!SpeechRecognitionAPI

const MODES = {
  warm: {
    key: 'warm',
    label: 'Supportive teacher',
    blurb: 'A teacher with time for you. Good for your first few tries.'
  },
  busy: {
    key: 'busy',
    label: 'Busy teacher',
    blurb: 'Mid-class, distracted, might say "not right now." Closer to the real thing.'
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2 text-muted text-sm">
      <span>The teacher is thinking</span>
      <span className="flex gap-1" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink/40 animate-bounce" />
      </span>
    </div>
  )
}

function PracticeChat({ need, onDone }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voice, setVoice] = useState(VOICE_OPTIONS[0].key)
  const [mode, setMode] = useState('warm')
  // Which student turn goes on the one-pager. Defaults to their first real attempt, but
  // the student picks — see chooseAttempt below.
  const [chosenAttempt, setChosenAttempt] = useState(null)
  const [choosing, setChoosing] = useState(false)
  const recognitionRef = useRef(null)
  const speaker = useSpeaker(voice)

  const studentTurns = messages.filter((m) => m.role === 'student')

  useEffect(() => {
    return () => recognitionRef.current?.stop()
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
      const { teacherReply, coachTip } = await postPractice(need, history, studentMessage, mode)
      const teacherTurn = { role: 'teacher', content: teacherReply, coachTip, id: `t${nextMessages.length}` }
      setMessages([...nextMessages, teacherTurn])
      if (voiceMode) speaker.toggle(teacherTurn.id, teacherReply)
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
      speaker.stop()
      setIsListening(false)
    }
    setError(null)
    setVoiceMode(!voiceMode)
  }

  const startListening = () => {
    if (!speechInputSupported) {
      setError("Voice input isn't supported in this browser — try Chrome, or just type instead.")
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

  const stopListening = () => recognitionRef.current?.stop()

  // The old build silently shipped the student's LAST message to the one-pager. Conversations
  // end after the teacher responds, so that was usually a fragment — "for math class", "yeah
  // ok" — quoting the student at their weakest moment on a document they hand to an adult.
  // Now they choose, and the default is their first full attempt rather than their last word.
  const finish = () => {
    if (studentTurns.length <= 1) {
      onDone(studentTurns[0]?.content || '')
      return
    }
    setChoosing(true)
    setChosenAttempt(chosenAttempt ?? studentTurns[0].content)
  }

  if (choosing) {
    return (
      <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl text-ink">Which try felt best?</h1>
          <p className="text-muted mt-1">
            This is the one that goes on your one-pager, so pick the version that sounds most like
            you at your best.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {studentTurns.map((turn, i) => (
            <label
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                chosenAttempt === turn.content
                  ? 'border-harbor bg-harbor/10'
                  : 'border-ink/15 hover:border-harbor/50'
              }`}
            >
              <input
                type="radio"
                name="attempt"
                checked={chosenAttempt === turn.content}
                onChange={() => setChosenAttempt(turn.content)}
                className="accent-harbor mt-1 w-4 h-4"
              />
              <span className="text-ink">"{turn.content}"</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onDone(chosenAttempt)} className="btn-primary">
            Use this one
          </button>
          <button type="button" onClick={() => setChoosing(false)} className="btn-link">
            Keep practicing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Find your words</h1>
          <p className="text-muted mt-1">
            Practice asking for <span className="font-medium text-ink">{need}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVoiceMode}
          aria-pressed={voiceMode}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition active:scale-[0.98]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
            voiceMode
              ? 'bg-harbor text-mist border-harbor'
              : 'bg-transparent text-harbor border-harbor/40 hover:border-harbor'
          }`}
        >
          <span aria-hidden="true">🎙️</span> Voice: {voiceMode ? 'On' : 'Off'}
        </button>
      </div>

      {/* Practising only ever against unconditional warmth leaves a student miscalibrated
          for a real classroom. The busy teacher is the point of the product. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink/80 mb-2">Who are you practicing with?</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.values(MODES).map((m) => (
            <label
              key={m.key}
              className={`flex flex-col gap-1 px-4 py-3 rounded-lg border cursor-pointer transition ${
                mode === m.key ? 'border-harbor bg-harbor/10' : 'border-ink/15 hover:border-harbor/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m.key}
                  onChange={() => setMode(m.key)}
                  className="accent-harbor w-4 h-4"
                />
                <span className="font-medium text-ink">{m.label}</span>
              </span>
              <span className="text-sm text-muted pl-6">{m.blurb}</span>
            </label>
          ))}
        </div>
        {mode === 'busy' && messages.length === 0 && (
          <p className="alert-note">
            <span aria-hidden="true">💪</span>
            <span>
              Heads up: this teacher is distracted and might not say yes right away. That's on
              purpose — and it isn't you doing it wrong.
            </span>
          </p>
        )}
      </fieldset>

      {/* Screen readers got no announcement when the teacher replied — the conversation
          updated silently for exactly the users most likely to be using one. */}
      <div className="flex flex-col gap-3 min-h-[200px]" aria-live="polite" aria-atomic="false">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col animate-fadeIn ${m.role === 'student' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2 rounded-2xl flex items-start gap-1 ${
                m.role === 'student' ? 'bg-ink text-mist' : 'bg-harbor/10 text-ink border border-harbor/30'
              }`}
            >
              <span className="sr-only">{m.role === 'student' ? 'You said: ' : 'Teacher said: '}</span>
              <span>{m.content}</span>
              {m.role === 'teacher' && (
                <SpeakButton
                  id={m.id || `t${i}`}
                  text={m.content}
                  speaker={speaker}
                  label="Hear the teacher say this"
                />
              )}
            </div>
            {m.coachTip && (
              <div className="mt-1 text-sm text-harbor italic px-2 flex items-start gap-1">
                <span aria-hidden="true">💬</span>
                <span className="sr-only">Coaching tip: </span>
                <span>{m.coachTip}</span>
              </div>
            )}
          </div>
        ))}
        {loading && <TypingDots />}
      </div>

      {error && (
        <div className="alert-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {speaker.speechError && (
        <div className="alert-note" role="status">
          <span aria-hidden="true">🔈</span>
          <span>{speaker.speechError}</span>
        </div>
      )}

      {voiceMode && (
        <div className="flex flex-col items-center gap-2 py-2 animate-fadeIn">
          {!speechInputSupported && (
            <p className="alert-note w-full">
              <span aria-hidden="true">ℹ️</span>
              <span>
                Talking out loud needs Chrome. You can still type your answers here, and the
                teacher will still read theirs out loud to you.
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={loading || !speechInputSupported}
            className={`w-20 h-20 rounded-full text-3xl flex items-center justify-center transition
              disabled:opacity-40 active:scale-95 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-harbor/40 focus-visible:ring-offset-2 focus-visible:ring-offset-mist ${
              isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-marigold text-ink'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
          >
            <span aria-hidden="true">🎤</span>
          </button>
          <span className="text-sm text-muted" role="status">
            {isListening ? 'Listening… tap to stop' : 'Tap to speak'}
          </span>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span>Teacher's voice</span>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="text-sm border border-ink/15 rounded-lg px-2 py-1 text-ink bg-white max-w-[220px]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/30"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <label htmlFor="student-message" className="sr-only">
          What do you want to say to the teacher?
        </label>
        <input
          id="student-message"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={voiceMode ? 'Or type instead…' : 'Can I get instructions written down too?'}
          maxLength={1000}
          className="input-field"
        />
        <button type="submit" disabled={!input.trim() || loading} className="btn-primary shrink-0">
          Send
        </button>
      </form>

      <button
        type="button"
        onClick={finish}
        disabled={studentTurns.length === 0}
        className="btn-link self-start disabled:opacity-40 disabled:no-underline"
      >
        {studentTurns.length === 0 ? 'Try one line first, then reflect' : 'Done practicing — reflect on it'}
      </button>
    </div>
  )
}

export default PracticeChat
