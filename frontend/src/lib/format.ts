import type { LocaleCode } from '../locales'

function resolveLocale(locale?: LocaleCode): string {
  return locale === 'ar' ? 'ar-MA' : 'fr-FR'
}

export function formatDate(value: string | null | undefined, locale?: LocaleCode): string {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString(resolveLocale(locale))
}

export function formatDateShort(value: string | null | undefined, locale?: LocaleCode): string {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString(resolveLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string, locale?: LocaleCode): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(resolveLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
