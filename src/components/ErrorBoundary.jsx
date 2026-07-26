import { Component } from 'react'

// Without this, a single render exception blanks the entire app — mid-demo, mid-sentence,
// with a student watching. A crash should cost you one screen, not the session.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('MyVoice crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-mist text-ink font-sans flex items-center justify-center px-6">
        <div className="card max-w-md flex flex-col gap-4 text-center">
          <h1 className="font-display text-2xl">Something went wrong on our end</h1>
          <p className="text-muted">
            That's not your fault, and nothing you wrote was lost — your saved reflections are
            still here.
          </p>
          <button type="button" onClick={() => this.setState({ error: null })} className="btn-primary">
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className="btn-link">
            Start over
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
