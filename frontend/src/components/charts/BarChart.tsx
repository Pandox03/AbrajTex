import { useI18n } from '../../context/LocaleContext'

interface BarChartProps {
  data: { label: string; value: number; empty?: boolean }[]
  valueSuffix?: string
  color?: string
  referenceLine?: number
  referenceLabel?: string
}

export default function BarChart({
  data,
  valueSuffix = '',
  color = '#2a9d8f',
  referenceLine,
  referenceLabel,
}: BarChartProps) {
  const { t, formatNumber } = useI18n()
  const max = Math.max(...data.map((d) => d.value), referenceLine ?? 0, 1)
  const hasAnyData = data.some((d) => d.value > 0)

  return (
    <div>
      {referenceLine != null && referenceLine > 0 && (
        <p className="mb-2 text-xs text-muted">
          {referenceLabel ?? t.charts.reference} :{' '}
          <span className="font-medium text-navy-900">
            {formatNumber(referenceLine)}
            {valueSuffix}
          </span>
        </p>
      )}
      {!hasAnyData && (
        <p className="mb-3 rounded-lg bg-surface px-3 py-2 text-center text-sm text-muted">
          {t.charts.noDataPeriod}
        </p>
      )}
      <div className="relative flex h-52 items-end justify-between gap-2 pt-4">
        {referenceLine != null && referenceLine > 0 && (
          <div
            className="pointer-events-none absolute start-0 end-0 border-t border-dashed border-gold-500/60"
            style={{ bottom: `${Math.max((referenceLine / max) * 100, 4)}%` }}
          />
        )}
        {data.map((item) => {
          const isEmpty = item.value <= 0
          const height = isEmpty ? 6 : Math.max((item.value / max) * 100, 8)

          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <span className={`text-xs font-medium ${isEmpty ? 'text-muted' : 'text-navy-900'}`}>
                {isEmpty ? '0' : `${formatNumber(item.value)}${valueSuffix}`}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${isEmpty ? 'border border-dashed border-border bg-surface' : ''}`}
                  style={{
                    height: `${height}%`,
                    backgroundColor: isEmpty ? undefined : color,
                    minHeight: isEmpty ? 6 : 8,
                  }}
                  title={isEmpty ? t.charts.emptyMonth : undefined}
                />
              </div>
              <span className="text-center text-[10px] leading-tight text-muted">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
