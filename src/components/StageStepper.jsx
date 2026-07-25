const STAGES = [
  { key: 'understand', label: 'Understand', matches: ['input', 'understand'] },
  { key: 'practice', label: 'Practice', matches: ['practice'] },
  { key: 'reflect', label: 'Reflect', matches: ['reflect'] },
  { key: 'share', label: 'Share', matches: ['share'] }
]

const BAR_HEIGHTS = [16, 26, 38, 52]

function StageStepper({ stage }) {
  const currentIndex = STAGES.findIndex((s) => s.matches.includes(stage))

  return (
    <div className="flex items-end justify-center gap-3 pt-8 pb-2" aria-label="Progress through the 4 stages">
      {STAGES.map((s, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={s.key} className="flex flex-col items-center gap-2">
            <div
              className={`w-2.5 rounded-full transition-all duration-500 ${
                isComplete
                  ? 'bg-marigold'
                  : isCurrent
                    ? 'bg-harbor/20 border-2 border-harbor animate-pulse'
                    : 'bg-ink/10'
              }`}
              style={{ height: `${BAR_HEIGHTS[i]}px` }}
            />
            <span
              className={`text-[11px] tracking-wide ${
                isCurrent ? 'text-harbor font-medium' : isComplete ? 'text-ink/60' : 'text-ink/30'
              }`}
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default StageStepper
