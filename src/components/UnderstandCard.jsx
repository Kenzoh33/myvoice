import { useSpeaker } from '../lib/speech.js'
import SpeakButton from './SpeakButton.jsx'

function UnderstandCard({ result, onBack, onPractice }) {
  const speaker = useSpeaker()

  // A student who needs read-aloud must be able to hear this card — it's the densest text
  // in the app and it's the part explaining their own need back to them.
  const fullText = `${result.plainExplanation} The formal term is: ${result.formalTerm}. ${result.whyItHelps}`

  return (
    <div className="max-w-xl mx-auto px-6 py-10 sm:p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="font-display text-3xl text-ink">Here's what that means</h1>
        <SpeakButton id="understand" text={fullText} speaker={speaker} className="mt-1" />
      </div>

      <div className="card flex flex-col gap-5">
        <p className="text-ink text-lg leading-relaxed">{result.plainExplanation}</p>

        <div>
          <span className="text-xs uppercase tracking-wide text-muted">Formal term</span>
          <div className="mt-1 inline-block font-mono text-sm bg-sage/20 text-ink px-3 py-1 rounded-full">
            {result.formalTerm}
          </div>
          <p className="mt-2 text-sm text-muted">
            This is the wording a 504 or IEP usually uses. You don't have to say it this way —
            it's just useful to recognise it in a meeting.
          </p>
        </div>

        <p className="text-ink/80 italic border-l-2 border-sage/50 pl-3">{result.whyItHelps}</p>
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
