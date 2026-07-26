// Read-aloud control. Appears on every screen that shows text the student has to read —
// not just the roleplay teacher's replies.
function SpeakButton({ id, text, speaker, label = 'Read this out loud', className = '' }) {
  const isSpeaking = speaker.speakingId === id

  if (!text || !text.trim()) return null

  return (
    <button
      type="button"
      onClick={() => speaker.toggle(id, text)}
      aria-label={isSpeaking ? 'Stop reading out loud' : label}
      title={isSpeaking ? 'Stop reading' : label}
      className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 text-sm transition
        border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor/40 ${
        isSpeaking
          ? 'border-harbor bg-harbor/10 text-harbor'
          : 'border-transparent text-muted hover:text-harbor hover:border-harbor/30'
      } ${className}`}
    >
      <span aria-hidden="true">{isSpeaking ? '⏸' : '🔊'}</span>
      <span className="sr-only">{isSpeaking ? 'Stop reading out loud' : label}</span>
    </button>
  )
}

export default SpeakButton
