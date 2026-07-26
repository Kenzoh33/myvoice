import { useState } from 'react'
import { postReflect } from '../lib/api.js'
import { addReflection, getReflectionsFor } from '../lib/storage.js'
import { useSpeaker } from '../lib/speech.js'
import SpeakButton from './SpeakButton.jsx'
import FeelingTrend from './FeelingTrend.jsx'
import Spinner from './Spinner.jsx'

const FEELINGS = [
  { value: 1, emoji: '😟', label: 'Really hard' },
  { value: 2, emoji: '😕', label: 'Hard' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' }
]

const ATTEMPT_TYPES = [
  { key: 'practice', label: 'I practiced it here', blurb: 'Just the roleplay so far' },
  { key: 'real', label: 'I asked a real teacher', blurb: 'It actually happened' }
]

function ReflectJournal({ need, categoryKey, onDone }) {
  const [whatHappened, setWhatHappened] = useState('')
  const [feeling, setFeeling] = useState(0)
  const [notes, setNotes] = useState('')
  // Defaults to 'practice' because at this point in the flow the student has just come out
  // of the roleplay. Praising them for real-world courage they haven't shown yet manufactures
  // confidence that won't survive contact with an actual classroom.
  const [attemptType, setAttemptType] = useState('practice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState(() => getReflectionsFor({ categoryKey, need }))
  const speaker = useSpeaker()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!whatHappened.trim() || !feeling || loading) return

    setLoading(true)
    setError(null)
    try {
      const { reflectionText } = await postReflect(
        need,
        whatHappened.trim(),
        feeling,
        notes.trim(),
        attemptType
      )
      const entry = {
        id: Date.now(),
        need,
        categoryKey,
        attemptType,
        whatHappened: whatHappened.trim(),
        feeling,
        notes: notes.trim(),
        reflectionText,
        createdAt: new Date().toISOString()
      }
      const updated = addReflection(entry)
      setEntries(updated.filter((e2) => (categoryKey && e2.categoryKey ? e2.categoryKey === categoryKey : e2.need === need)))
      setWhatHappened('')
      setFeeling(0)
      setNotes('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Track your growth</h1>
        <p className="text-muted mt-1">
          How did it go asking for <span className="font-medium text-ink">{need}</span>?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink/80 mb-2">Was this real, or practice?</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {ATTEMPT_TYPES.map((t) => (
              <label
                key={t.key}
                className={`flex flex-col gap-0.5 px-4 py-3 rounded-lg border cursor-pointer transition ${
                  attemptType === t.key ? 'border-harbor bg-harbor/10' : 'border-ink/15 hover:border-harbor/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="attemptType"
                    checked={attemptType === t.key}
                    onChange={() => setAttemptType(t.key)}
                    className="accent-harbor w-4 h-4"
                  />
                  <span className="font-medium text-ink">{t.label}</span>
                </span>
                <span className="text-sm text-muted pl-6">{t.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="what-happened" className="text-sm font-medium text-ink/80">
            What happened?
          </label>
          <textarea
            id="what-happened"
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            placeholder="I asked my teacher during class and…"
            className="input-field"
            maxLength={2000}
            rows={3}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink/80 mb-2">How did it feel?</legend>
          <div className="flex gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                aria-label={f.label}
                aria-pressed={feeling === f.value}
                className={`flex-1 py-3 rounded-lg border text-2xl transition active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
                  feeling === f.value
                    ? 'border-harbor bg-harbor/10'
                    : 'border-ink/15 hover:border-harbor/50'
                }`}
              >
                <span aria-hidden="true">{f.emoji}</span>
              </button>
            ))}
          </div>
          {feeling > 0 && (
            <p className="text-sm text-muted" role="status">
              You picked: {FEELINGS.find((f) => f.value === feeling)?.label}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="reflect-notes" className="text-sm font-medium text-ink/80">
            Anything else? (optional)
          </label>
          <textarea
            id="reflect-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you want to remember for next time"
            className="input-field"
            maxLength={1000}
            rows={2}
          />
        </div>

        {error && (
          <div className="alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!whatHappened.trim() || !feeling || loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? 'Saving…' : 'Save reflection'}
        </button>
      </form>

      {entries.length > 0 && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <FeelingTrend entries={entries} />

          <h2 className="text-sm uppercase tracking-wide text-muted">Your reflections</h2>
          {[...entries].reverse().map((entry) => (
            <div
              key={entry.id}
              className="border border-sage/30 bg-sage/10 rounded-lg p-4 flex flex-col gap-1 animate-fadeIn"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {entry.attemptType === 'practice' && ' · practice'}
                  {entry.attemptType === 'real' && ' · for real'}
                </span>
                <div className="flex items-center gap-1">
                  <span aria-label={FEELINGS.find((f) => f.value === entry.feeling)?.label} className="text-lg">
                    {FEELINGS.find((f) => f.value === entry.feeling)?.emoji}
                  </span>
                  <SpeakButton
                    id={`reflection-${entry.id}`}
                    text={entry.reflectionText}
                    speaker={speaker}
                    label="Read this reflection out loud"
                  />
                </div>
              </div>
              <p className="text-ink/90 text-sm italic">{entry.reflectionText}</p>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onDone} className="btn-link self-start">
        Share your voice
      </button>
    </div>
  )
}

export default ReflectJournal
