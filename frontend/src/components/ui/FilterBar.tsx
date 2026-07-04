import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { useI18n } from '../../context/LocaleContext'

interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'date'
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface FilterBarProps {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
  extra?: ReactNode
}

export default function FilterBar({ fields, values, onChange, onReset, extra }: FilterBarProps) {
  const { t } = useI18n()

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 min-w-0 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-900">{t.filters.title}</p>
        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer text-sm text-teal-600 hover:underline"
        >
          {t.filters.reset}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) =>
          field.type === 'select' ? (
            <select
              key={field.key}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm"
            >
              <option value="">{field.placeholder ?? field.label}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <div key={field.key} className="relative">
              {field.type === 'text' && (
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              )}
              <input
                type={field.type}
                placeholder={field.placeholder ?? field.label}
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`w-full rounded-xl border border-border py-2.5 text-sm ${field.type === 'text' ? 'pl-9 pr-4' : 'px-4'}`}
              />
            </div>
          ),
        )}
        {extra}
      </div>
    </div>
  )
}
