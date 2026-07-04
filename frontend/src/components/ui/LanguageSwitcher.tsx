import { useI18n } from '../../context/LocaleContext'
import type { LocaleCode } from '../../locales'

const options: { code: LocaleCode; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark'
}

export default function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n()

  const base =
    variant === 'dark'
      ? 'border-white/20 bg-white/10'
      : 'border-border bg-card'

  return (
    <div
      className={`flex rounded-xl border p-0.5 ${base}`}
      role="group"
      aria-label={t.locale.label}
    >
      {options.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            locale === code
              ? variant === 'dark'
                ? 'bg-white text-navy-900'
                : 'bg-teal-500 text-white'
              : variant === 'dark'
                ? 'text-white/75 hover:text-white'
                : 'text-muted hover:text-navy-900'
          }`}
          title={code === 'fr' ? t.locale.fr : t.locale.ar}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
