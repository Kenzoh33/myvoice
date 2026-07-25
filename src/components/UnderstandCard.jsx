function UnderstandCard({ result, onBack, onPractice }) {
  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col gap-6">
      <h1 className="font-display text-3xl text-ink">Here's what that means</h1>

      <p className="text-ink text-lg leading-relaxed">{result.plainExplanation}</p>

      <div>
        <span className="text-xs uppercase tracking-wide text-ink/50">Formal term</span>
        <div className="mt-1 inline-block font-mono text-sm bg-sage/20 text-ink px-3 py-1 rounded-full">
          {result.formalTerm}
        </div>
      </div>

      <p className="text-ink/70 italic">{result.whyItHelps}</p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPractice}
          className="bg-marigold text-ink px-6 py-3 rounded-lg font-medium"
        >
          Practice asking for this
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-harbor underline underline-offset-4"
        >
          Try a different need
        </button>
      </div>
    </div>
  )
}

export default UnderstandCard
