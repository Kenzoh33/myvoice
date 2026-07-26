import { useState } from 'react'
import Landing from './components/Landing.jsx'
import StageStepper from './components/StageStepper.jsx'
import Onboarding from './components/Onboarding.jsx'
import UnderstandCard from './components/UnderstandCard.jsx'
import PracticeChat from './components/PracticeChat.jsx'
import ReflectJournal from './components/ReflectJournal.jsx'
import ShareSummary from './components/ShareSummary.jsx'
import { postUnderstand } from './lib/api.js'
// Embedding classifier (src/lib/classifier.js) is built but not wired in yet — a Vite/onnxruntime-web
// bundling issue needs a real browser stack trace to debug. Parked, not deleted; see conversation.

function lastStudentPhrase(messages) {
  const studentMessages = messages.filter((m) => m.role === 'student')
  return studentMessages.length ? studentMessages[studentMessages.length - 1].content : ''
}

function App() {
  const [stage, setStage] = useState('landing') // 'landing' | 'input' | 'understand' | 'practice' | 'reflect' | 'share'
  const [needText, setNeedText] = useState('')
  const [result, setResult] = useState(null)
  const [practicedPhrase, setPracticedPhrase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
        <Landing onStart={() => setStage('input')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist text-ink font-sans">
      <div className="max-w-xl mx-auto px-6 sm:px-8 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="font-display text-lg text-ink hover:text-harbor transition
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 rounded"
        >
          MyVoice
        </button>
      </div>

      <StageStepper stage={stage} />

      {error && (
        <div className="max-w-xl mx-auto mt-4 px-6 sm:px-8">
          <div className="alert-error">⚠️ {error}</div>
        </div>
      )}

      <div key={stage} className="animate-fadeIn">
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
            onDone={(messages) => {
              setPracticedPhrase(lastStudentPhrase(messages))
              setStage('reflect')
            }}
          />
        )}

        {stage === 'reflect' && (
          <ReflectJournal need={needText} onDone={() => setStage('share')} />
        )}

        {stage === 'share' && (
          <ShareSummary
            need={needText}
            formalTerm={result?.formalTerm}
            practicedPhrase={practicedPhrase}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  )
}

export default App
