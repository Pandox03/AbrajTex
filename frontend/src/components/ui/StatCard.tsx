import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  accent?: 'navy' | 'teal' | 'mint' | 'gold'
  variant?: 'default' | 'alert' | 'compact'
  subtitle?: string
  footer?: ReactNode
}

const accents = {
  navy: 'bg-navy-900 text-white',
  teal: 'bg-teal-500 text-white',
  mint: 'bg-mint-400 text-white',
  gold: 'bg-gold-500 text-white',
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'navy',
  variant = 'default',
  subtitle,
  footer,
}: StatCardProps) {
  const isAlert = variant === 'alert'
  const isCompact = variant === 'compact'

  return (
    <div
      className={`rounded-2xl border bg-card shadow-sm ${
        isAlert
          ? 'border-amber-300/80 border-s-4 border-s-gold-500 bg-amber-50/40'
          : 'border-border'
      } ${isCompact ? 'p-3' : 'p-5'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-muted ${isCompact ? 'text-xs' : 'text-sm'}`}>{label}</p>
          <p className={`font-bold text-navy-900 ${isCompact ? 'mt-1 text-xl' : 'mt-2 text-3xl'}`}>
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          {footer}
        </div>
        {Icon && !isCompact && (
          <div className={`shrink-0 rounded-xl p-3 ${isAlert ? 'bg-gold-500 text-navy-900' : accents[accent]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}
