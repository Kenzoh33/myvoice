import { useState } from 'react'
import Spinner from './Spinner.jsx'

const COMMON_NEEDS = [
  'Extra time on tests or assignments',
  'Instructions repeated or written down',
  'A quiet space to work',
  'Movement breaks',
  'Reading passages read aloud',
  'Instructions translated'
]

function Onboarding({ onSubmit, loading }) {
  const [selected, setSelected] = useState(null)
  const [customText, setCustomText] = useState('')

  const needText = selected === 'custom' ? customText : selected

  const handleSubmit = (e) => {
    e.preventDefault()
    if (needText && needText.trim()) {
      onSubmit(needText.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <h1 className="font-display text-3xl text-ink">Name what you need</h1>
      <p className="text-ink/70">Pick something below, or describe it in your own words.</p>

      <div className="flex flex-col gap-2">
        {COMMON_NEEDS.map((need) => (
          <button
            type="button"
            key={need}
            onClick={() => setSelected(need)}
            className={`text-left px-4 py-3 rounded-lg border transition active:scale-[0.99]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
              selected === need
                ? 'border-harbor bg-harbor/10 text-ink'
                : 'border-ink/15 hover:border-harbor/50 text-ink/80'
            }`}
          >
            {need}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected('custom')}
          className={`text-left px-4 py-3 rounded-lg border transition active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
            selected === 'custom'
              ? 'border-harbor bg-harbor/10 text-ink'
              : 'border-ink/15 hover:border-harbor/50 text-ink/80'
          }`}
        >
          Something else…
        </button>
      </div>

      {selected === 'custom' && (
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Tell us what would help you"
          className="input-field animate-fadeIn"
          rows={3}
          autoFocus
        />
      )}

      <button
        type="submit"
        disabled={!needText || !needText.trim() || loading}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading && <Spinner />}
        {loading ? 'Thinking…' : 'Continue'}
      </button>
    </form>
  )
}

export default Onboarding
