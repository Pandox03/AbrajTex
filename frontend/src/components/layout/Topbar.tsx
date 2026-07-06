import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/LocaleContext'

import LanguageSwitcher from '../ui/LanguageSwitcher'

type TopbarProps = {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border p-2 text-navy-800 transition hover:bg-surface lg:hidden"
          aria-label={t.nav.menu}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-muted sm:text-sm">{t.auth.welcomeBack}</p>
          <Link to="/profile" className="cursor-pointer truncate font-semibold text-navy-900 hover:text-teal-600">
            {user?.name}
          </Link>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <Link
          to="/profile"
          className="hidden cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-navy-800 transition hover:bg-surface sm:inline-flex sm:px-4"
        >
          <UserCircle size={16} />
          <span className="hidden md:inline">{t.auth.myProfile}</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-navy-800 transition hover:bg-surface sm:px-4"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">{t.auth.logout}</span>
        </button>
      </div>
    </header>
  )
}
