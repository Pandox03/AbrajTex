import { Link, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/LocaleContext'

import LanguageSwitcher from '../ui/LanguageSwitcher'

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t } = useI18n()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <p className="text-sm text-muted">{t.auth.welcomeBack}</p>
        <Link to="/profile" className="cursor-pointer font-semibold text-navy-900 hover:text-teal-600">
          {user?.name}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Link
          to="/profile"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-surface"
        >
          <UserCircle size={16} />
          {t.auth.myProfile}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-surface"
        >
          <LogOut size={16} />
          {t.auth.logout}
        </button>
      </div>
    </header>
  )
}
