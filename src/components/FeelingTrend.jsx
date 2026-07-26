import { feelingSeries } from '../lib/storage.js'

// Stage 3 is called "Track your growth" but previously only listed reflections in reverse
// order — it collected a 1-5 score and then did nothing with it. This makes the stage earn
// its name: the student can see their own confidence moving.

const RANGE_LABEL = ['', 'Really hard', 'Hard', 'Okay', 'Good', 'Great']

function FeelingTrend({ entries }) {
  const series = feelingSeries(entries)

  // One point is not a trend, and pretending otherwise is the kind of fake-progress
  // dashboard this project exists to avoid.
  if (series.length < 2) return null

  const width = 280
  const height = 64
  const padX = 8
  const padY = 10
  const stepX = (width - padX * 2) / (series.length - 1)
  const scaleY = (value) => height - padY - ((value - 1) / 4) * (height - padY * 2)

  const points = series.map((point, i) => ({
    x: padX + i * stepX,
    y: scaleY(point.value),
    ...point
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const first = series[0].value
  const last = series[series.length - 1].value
  const delta = last - first

  const summary =
    delta > 0
      ? `Asking for this has felt easier over time — from "${RANGE_LABEL[first]}" to "${RANGE_LABEL[last]}" across ${series.length} times.`
      : delta < 0
        ? `This one has felt harder lately — from "${RANGE_LABEL[first]}" to "${RANGE_LABEL[last]}". Hard days are part of it, and you still showed up ${series.length} times.`
        : `You've logged this ${series.length} times, and it's felt about the same each time — steady counts too.`

  return (
    <section className="border border-sage/30 bg-sage/10 rounded-lg p-4 flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-wide text-muted">How it's felt over time</h2>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-16"
        role="img"
        aria-label={summary}
      >
        <line
          x1={padX}
          y1={scaleY(3)}
          x2={width - padX}
          y2={scaleY(3)}
          stroke="currentColor"
          className="text-ink/10"
          strokeDasharray="3 3"
        />
        <path d={path} fill="none" stroke="currentColor" className="text-harbor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4.5 : 3}
            className={i === points.length - 1 ? 'fill-marigold' : 'fill-harbor'}
          />
        ))}
      </svg>

      <p className="text-sm text-ink/80">{summary}</p>
    </section>
  )
}

export default FeelingTrend
