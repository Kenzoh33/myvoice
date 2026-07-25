import { useState } from 'react'

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
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-8 flex flex-col gap-6">
      <h1 className="font-display text-3xl text-ink">Name what you need</h1>
      <p className="text-ink/70">Pick something below, or describe it in your own words.</p>

      <div className="flex flex-col gap-2">
        {COMMON_NEEDS.map((need) => (
          <button
            type="button"
            key={need}
            onClick={() => setSelected(need)}
            className={`text-left px-4 py-3 rounded-lg border transition ${
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
          className={`text-left px-4 py-3 rounded-lg border transition ${
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
          className="w-full px-4 py-3 rounded-lg border border-ink/15 focus:border-harbor outline-none"
          rows={3}
        />
      )}

      <button
        type="submit"
        disabled={!needText || !needText.trim() || loading}
        className="bg-harbor text-mist px-6 py-3 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Thinking…' : 'Continue'}
      </button>
    </form>
  )
}

export default Onboarding
