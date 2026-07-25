import { useState } from 'react'
import Onboarding from './components/Onboarding.jsx'
import UnderstandCard from './components/UnderstandCard.jsx'
import PracticeChat from './components/PracticeChat.jsx'
import { postUnderstand } from './lib/api.js'

function App() {
  const [stage, setStage] = useState('input') // 'input' | 'understand' | 'practice'
  const [needText, setNeedText] = useState('')
  const [result, setResult] = useState(null)
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

  return (
    <div className="min-h-screen bg-mist text-ink font-sans">
      {error && (
        <div className="max-w-xl mx-auto mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {stage === 'input' && <Onboarding onSubmit={handleSubmit} loading={loading} />}

      {stage === 'understand' && (
        <UnderstandCard
          result={result}
          onBack={() => setStage('input')}
          onPractice={() => setStage('practice')}
        />
      )}

      {stage === 'practice' && (
        <PracticeChat need={needText} onDone={() => setStage('understand')} />
      )}
    </div>
  )
}

export default App
