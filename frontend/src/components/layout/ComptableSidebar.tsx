import { NavLink, Link } from 'react-router-dom'
import { Banknote, Calculator, FileText, LayoutDashboard, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/LocaleContext'

export default function ComptableSidebar() {
  const { user } = useAuth()
  const { t } = useI18n()

  const links = [
    { to: '/', label: t.comptable.home, icon: LayoutDashboard, end: true },
    { to: '/invoices', label: t.nav.invoices, icon: FileText },
    { to: '/payments', label: t.nav.payments, icon: Banknote },
  ]

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-slate-800 text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Abrajetex"
            className="h-10 w-10 rounded-lg bg-white object-contain p-1"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <p className="text-lg font-bold leading-tight">
              <span>Abraje</span>
              <span className="text-teal-400">tex</span>
            </p>
            <p className="text-xs text-white/60">{t.comptable.workspace}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500 text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs text-white/50">
        <Link to="/profile" className="mb-2 flex cursor-pointer items-center gap-2 text-white/75 hover:text-white">
          <UserCircle size={14} />
          {t.auth.myProfile}
        </Link>
        <div className="flex items-center gap-2">
          <Calculator size={14} />
          {user?.name} · {t.comptable.roleLabel}
        </div>
      </div>
    </aside>
  )
}
