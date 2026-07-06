import { Banknote, Calculator, FileText, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../context/LocaleContext'
import SidebarShell from './SidebarShell'

type ComptableSidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export default function ComptableSidebar({ mobileOpen, onClose }: ComptableSidebarProps) {
  const { user } = useAuth()
  const { t } = useI18n()

  const links = [
    { to: '/', label: t.comptable.home, icon: LayoutDashboard, end: true },
    { to: '/invoices', label: t.nav.invoices, icon: FileText },
    { to: '/payments', label: t.nav.payments, icon: Banknote },
  ]

  return (
    <SidebarShell
      mobileOpen={mobileOpen}
      onClose={onClose}
      bgClass="bg-slate-800"
      activeClass="bg-teal-500 text-white"
      accentClass="text-teal-400"
      subtitle={t.comptable.workspace}
      links={links}
      footerIcon={Calculator}
      footerRole={t.comptable.roleLabel}
      userName={user?.name}
    />
  )
}
