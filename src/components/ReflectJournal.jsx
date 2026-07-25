import { useState } from 'react'
import { postReflect } from '../lib/api.js'
import { addReflection, getReflectionsForNeed } from '../lib/storage.js'
import Spinner from './Spinner.jsx'

const FEELINGS = [
  { value: 1, emoji: '😟', label: 'Really hard' },
  { value: 2, emoji: '😕', label: 'Hard' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' }
]

function ReflectJournal({ need, onDone }) {
  const [whatHappened, setWhatHappened] = useState('')
  const [feeling, setFeeling] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState(() => getReflectionsForNeed(need))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!whatHappened.trim() || !feeling || loading) return

    setLoading(true)
    setError(null)
    try {
      const { reflectionText } = await postReflect(need, whatHappened.trim(), feeling, notes.trim())
      const entry = {
        id: Date.now(),
        need,
        whatHappened: whatHappened.trim(),
        feeling,
        notes: notes.trim(),
        reflectionText,
        createdAt: new Date().toISOString()
      }
      const updated = addReflection(entry)
      setEntries(updated.filter((e) => e.need === need))
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
        <p className="text-ink/70 mt-1">
          How did it go asking for <span className="font-medium">{need}</span>?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink/80">What happened?</label>
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            placeholder="I asked my teacher during class and…"
            className="input-field"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink/80">How did it feel?</label>
          <div className="flex gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                aria-label={f.label}
                className={`flex-1 py-3 rounded-lg border text-2xl transition active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
                  feeling === f.value
                    ? 'border-harbor bg-harbor/10'
                    : 'border-ink/15 hover:border-harbor/50'
                }`}
              >
                {f.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink/80">Anything else? (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you want to remember for next time"
            className="input-field"
            rows={2}
          />
        </div>

        {error && <div className="alert-error">⚠️ {error}</div>}

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
        <div className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-wide text-ink/50">Your reflections</h2>
          {[...entries].reverse().map((entry) => (
            <div
              key={entry.id}
              className="border border-sage/30 bg-sage/10 rounded-lg p-4 flex flex-col gap-1 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/50">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-lg">{FEELINGS.find((f) => f.value === entry.feeling)?.emoji}</span>
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
