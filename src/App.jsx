import { useEffect, useState } from 'react'
import Landing from './components/Landing.jsx'
import StageStepper from './components/StageStepper.jsx'
import Onboarding from './components/Onboarding.jsx'
import UnderstandCard from './components/UnderstandCard.jsx'
import PracticeChat from './components/PracticeChat.jsx'
import ReflectJournal from './components/ReflectJournal.jsx'
import ShareSummary from './components/ShareSummary.jsx'
import { postUnderstand, fetchConfig } from './lib/api.js'
// Embedding classifier (src/lib/classifier.js) is still parked on a Vite/onnxruntime-web
// bundling issue — but its taxonomy is now live via shared/taxonomy.js, constraining the
// server's tool-use enum. Same-need-same-bucket without the bundling problem.

function App() {
  const [stage, setStage] = useState('landing') // 'landing' | 'input' | 'understand' | 'practice' | 'reflect' | 'share'
  const [needText, setNeedText] = useState('')
  const [result, setResult] = useState(null)
  const [practicedPhrase, setPracticedPhrase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState({ mock: false, elevenLabsAvailable: false })

  useEffect(() => {
    fetchConfig().then(setConfig)
  }, [])

  const handleSubmit = async (text) => {
    setLoading(true)
    setError(null)
    try {
      const data = await postUnderstand(text)
      setNeedText(text)
      setResult(data)
      setStage('understand')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const restart = () => {
    setNeedText('')
    setResult(null)
    setPracticedPhrase('')
    setStage('input')
  }

  const goHome = () => {
    setNeedText('')
    setResult(null)
    setPracticedPhrase('')
    setError(null)
    setStage('landing')
  }

  if (stage === 'landing') {
    return (
      <div className="min-h-screen bg-mist text-ink font-sans">
        <main id="main">
          <Landing onStart={() => setStage('input')} mock={config.mock} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist text-ink font-sans">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="max-w-xl mx-auto px-6 sm:px-8 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="font-display text-lg text-ink hover:text-harbor transition
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 rounded"
        >
          MyVoice
        </button>
      </header>

      <nav aria-label="Progress">
        <StageStepper stage={stage} />
      </nav>

      {config.mock && (
        <div className="max-w-xl mx-auto mt-4 px-6 sm:px-8">
          <div className="alert-note" role="status">
            <span aria-hidden="true">🎭</span>
            <span>
              Demo mode — responses are fixtures, not live AI, and no API keys are in use.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto mt-4 px-6 sm:px-8">
          <div className="alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <main id="main" key={stage} className="animate-fadeIn">
        {stage === 'input' && <Onboarding onSubmit={handleSubmit} loading={loading} />}

        {stage === 'understand' && (
          <UnderstandCard
            result={result}
            onBack={() => setStage('input')}
            onPractice={() => setStage('practice')}
          />
        )}

        {stage === 'practice' && (
          <PracticeChat
            need={needText}
            onDone={(chosenPhrase) => {
              setPracticedPhrase(chosenPhrase || '')
              setStage('reflect')
            }}
          />
        )}

        {stage === 'reflect' && (
          <ReflectJournal
            need={needText}
            categoryKey={result?.categoryKey}
            onDone={() => setStage('share')}
          />
        )}

        {stage === 'share' && (
          <ShareSummary
            need={needText}
            categoryKey={result?.categoryKey}
            formalTerm={result?.formalTerm}
            practicedPhrase={practicedPhrase}
            onRestart={restart}
          />
        )}
      </main>
    </div>
  )
}

export default App
