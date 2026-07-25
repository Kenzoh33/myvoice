import { useState } from 'react'
import { postShare } from '../lib/api.js'
import { getReflectionsForNeed } from '../lib/storage.js'
import Spinner from './Spinner.jsx'

function ShareSummary({ need, formalTerm, practicedPhrase, onRestart }) {
  const reflections = getReflectionsForNeed(need)

  const [includeFormalTerm, setIncludeFormalTerm] = useState(true)
  const [includePracticedPhrase, setIncludePracticedPhrase] = useState(!!practicedPhrase)
  const [includeReflections, setIncludeReflections] = useState(reflections.length > 0)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { summaryText } = await postShare(
        need,
        includeFormalTerm ? formalTerm : null,
        includePracticedPhrase ? practicedPhrase : null,
        includeReflections ? reflections.map((r) => r.reflectionText) : null
      )
      setSummary(summaryText)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySummary = async () => {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Share your voice</h1>
        <p className="text-ink/70 mt-1">You choose what to share, and with who.</p>
      </div>

      {!summary && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <p className="text-ink/80">Pick what goes into your one-pager:</p>

          <div className="px-4 py-3 rounded-lg border border-ink/15 bg-ink/5">
            <span className="text-xs uppercase tracking-wide text-ink/40">Always included</span>
            <p className="mt-1">
              Your need: <span className="font-medium">{need}</span>
            </p>
          </div>

          {formalTerm && (
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-ink/15 cursor-pointer hover:border-harbor/40 transition">
              <input
                type="checkbox"
                checked={includeFormalTerm}
                onChange={(e) => setIncludeFormalTerm(e.target.checked)}
                className="accent-harbor w-4 h-4"
              />
              <span>
                The formal term:{' '}
                <span className="font-mono text-sm bg-sage/20 px-2 py-0.5 rounded-full">{formalTerm}</span>
              </span>
            </label>
          )}

          {practicedPhrase && (
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-ink/15 cursor-pointer hover:border-harbor/40 transition">
              <input
                type="checkbox"
                checked={includePracticedPhrase}
                onChange={(e) => setIncludePracticedPhrase(e.target.checked)}
                className="accent-harbor w-4 h-4"
              />
              <span>
                How you practiced asking: <span className="italic">"{practicedPhrase}"</span>
              </span>
            </label>
          )}

          {reflections.length > 0 && (
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-ink/15 cursor-pointer hover:border-harbor/40 transition">
              <input
                type="checkbox"
                checked={includeReflections}
                onChange={(e) => setIncludeReflections(e.target.checked)}
                className="accent-harbor w-4 h-4"
              />
              <span>
                {reflections.length} reflection{reflections.length > 1 ? 's' : ''} on how it went
              </span>
            </label>
          )}

          {error && <div className="alert-error">⚠️ {error}</div>}

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="btn-accent flex items-center justify-center gap-2"
          >
            {loading && <Spinner />}
            {loading ? 'Writing your one-pager…' : 'Generate my one-pager'}
          </button>
        </div>
      )}

      {summary && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="card print-area">
            <span className="text-xs uppercase tracking-wide text-ink/40">My one-pager</span>
            <p className="mt-3 text-ink text-lg leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={copySummary} className="btn-primary">
              {copied ? 'Copied!' : 'Copy to share'}
            </button>
            <button type="button" onClick={() => window.print()} className="btn-primary">
              Print
            </button>
            <button type="button" onClick={() => setSummary(null)} className="btn-link">
              Make changes
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={onRestart} className="btn-link self-start">
        Practice a different need
      </button>
    </div>
  )
}

export default ShareSummary
