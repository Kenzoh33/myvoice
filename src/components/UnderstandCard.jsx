function UnderstandCard({ result, onBack, onPractice }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <h1 className="font-display text-3xl text-ink">Here's what that means</h1>

      <div className="card flex flex-col gap-5">
        <p className="text-ink text-lg leading-relaxed">{result.plainExplanation}</p>

        <div>
          <span className="text-xs uppercase tracking-wide text-ink/50">Formal term</span>
          <div className="mt-1 inline-block font-mono text-sm bg-sage/20 text-ink px-3 py-1 rounded-full">
            {result.formalTerm}
          </div>
        </div>

        <p className="text-ink/70 italic border-l-2 border-sage/50 pl-3">{result.whyItHelps}</p>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" onClick={onPractice} className="btn-accent">
          Practice asking for this
        </button>
        <button type="button" onClick={onBack} className="btn-link">
          Try a different need
        </button>
      </div>
    </div>
  )
}

export default UnderstandCard
