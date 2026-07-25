function Landing({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="max-w-2xl flex flex-col items-center gap-8">
        <div className="flex items-end gap-1.5" aria-hidden="true">
          {[14, 22, 32, 44].map((h, i) => (
            <span
              key={i}
              className="w-2.5 rounded-full bg-marigold"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="font-display text-5xl sm:text-6xl text-ink leading-[1.05]">
            Practice your voice
            <br />
            before you need it.
          </h1>
          <p className="text-ink/70 text-lg max-w-lg mx-auto">
            MyVoice helps students understand their own learning needs, practice asking for
            them out loud, and track their growth — built for the student, not the adult in
            the room.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-harbor/20 bg-harbor/[0.04] px-6 py-5 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-harbor font-medium">
            Why this matters
          </span>
          <p className="text-ink/80 text-sm leading-relaxed">
            IDEA requires a self-advocacy plan for every student with an IEP or 504 — almost
            no software teaches the skill itself.
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="bg-marigold text-ink px-8 py-4 rounded-lg font-medium text-lg transition
            hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-marigold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mist"
        >
          Get started
        </button>

        <p className="text-ink/40 text-sm tracking-wide">
          Empowerment. Agency. Belonging.
        </p>
      </div>
    </div>
  )
}

export default Landing
