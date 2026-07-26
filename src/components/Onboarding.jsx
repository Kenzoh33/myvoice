import { useState } from 'react'
import { FEATURED_CATEGORIES } from '../../shared/taxonomy.js'
import { useSpeaker } from '../lib/speech.js'
import SpeakButton from './SpeakButton.jsx'
import PrivacyNote from './PrivacyNote.jsx'
import Spinner from './Spinner.jsx'

const INTRO = 'Name what you need. Pick something below, or describe it in your own words.'

function Onboarding({ onSubmit, loading }) {
  const [selected, setSelected] = useState(null)
  const [customText, setCustomText] = useState('')
  const speaker = useSpeaker()

  const needText = selected === 'custom' ? customText : selected

  const handleSubmit = (e) => {
    e.preventDefault()
    if (needText && needText.trim()) {
      onSubmit(needText.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl text-ink">Name what you need</h1>
          <p className="text-muted mt-1">Pick something below, or describe it in your own words.</p>
        </div>
        <SpeakButton id="intro" text={INTRO} speaker={speaker} className="mt-1" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Common learning needs</legend>
        {FEATURED_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.key}
            onClick={() => setSelected(category.label)}
            aria-pressed={selected === category.label}
            className={`text-left px-4 py-3 rounded-lg border transition active:scale-[0.99]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
              selected === category.label
                ? 'border-harbor bg-harbor/10 text-ink'
                : 'border-ink/15 hover:border-harbor/50 text-ink/80'
            }`}
          >
            {category.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected('custom')}
          aria-pressed={selected === 'custom'}
          className={`text-left px-4 py-3 rounded-lg border transition active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
            selected === 'custom'
              ? 'border-harbor bg-harbor/10 text-ink'
              : 'border-ink/15 hover:border-harbor/50 text-ink/80'
          }`}
        >
          Something else…
        </button>
      </fieldset>

      {selected === 'custom' && (
        <div className="flex flex-col gap-2 animate-fadeIn">
          <label htmlFor="custom-need" className="sr-only">
            Describe what would help you
          </label>
          <textarea
            id="custom-need"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tell us what would help you"
            className="input-field"
            maxLength={500}
            rows={3}
            autoFocus
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!needText || !needText.trim() || loading}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading && <Spinner />}
        {loading ? 'Thinking…' : 'Continue'}
      </button>

      <PrivacyNote />
    </form>
  )
}

export default Onboarding
