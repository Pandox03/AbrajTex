import { Link } from 'react-router-dom'

interface DonutSegment {
  label: string
  value: number
  color: string
  to?: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  onSegmentClick?: (segment: DonutSegment) => void
}

function LegendRow({
  seg,
  pct,
  onSegmentClick,
}: {
  seg: DonutSegment
  pct: number
  onSegmentClick?: (segment: DonutSegment) => void
}) {
  const rowClass =
    'grid w-full grid-cols-[10px_1fr_auto] items-center gap-x-3 text-sm'

  const inner = (
    <>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: seg.color }}
      />
      <span className="min-w-0 text-muted">{seg.label}</span>
      <span className="whitespace-nowrap font-medium tabular-nums text-navy-900">
        {seg.value}
        <span className="ml-1 font-normal text-muted">({pct}%)</span>
      </span>
    </>
  )

  if (seg.to) {
    return (
      <Link
        to={seg.to}
        className={`${rowClass} cursor-pointer rounded-lg px-1 py-0.5 transition hover:bg-surface`}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div
      className={`${rowClass} ${onSegmentClick ? 'cursor-pointer rounded-lg px-1 py-0.5 transition hover:bg-surface' : ''}`}
      onClick={() => onSegmentClick?.(seg)}
    >
      {inner}
    </div>
  )
}

export default function DonutChart({ segments, size = 120, onSegmentClick }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let cumulative = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {segments.map((seg) => {
            const portion = seg.value / total
            const dash = portion * circumference
            const offset = cumulative * circumference
            cumulative += portion
            return (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className={onSegmentClick || seg.to ? 'cursor-pointer' : undefined}
                onClick={() => onSegmentClick?.(seg)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-navy-900">{total}</span>
        </div>
      </div>

      <div className="w-full space-y-1.5">
        {segments.map((seg) => (
          <LegendRow
            key={seg.label}
            seg={seg}
            pct={Math.round((seg.value / total) * 100)}
            onSegmentClick={onSegmentClick}
          />
        ))}
      </div>
    </div>
  )
}
