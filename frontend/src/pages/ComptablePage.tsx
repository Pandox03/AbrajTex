import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, FileText } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Invoice, Payment } from '../types'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'

interface ComptableDashboard {
  stats: {
    invoices: number
    payments: number
    total_invoiced: number
    total_paid: number
    balance_due: number
    unpaid_invoices: number
  }
  recent_invoices: Invoice[]
  recent_payments: Payment[]
}

function formatMad(value: number) {
  return `${value.toLocaleString('fr-FR')} MAD`
}

export default function ComptablePage() {
  const { t, formatDateShort } = useI18n()
  const [data, setData] = useState<ComptableDashboard | null>(null)

  useEffect(() => {
    api.get<ComptableDashboard>('/comptable/dashboard').then((res) => setData(res.data))
  }, [])

  if (!data) {
    return <div className="text-muted">{t.common.loading}</div>
  }

  const { stats } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.comptable.title}
        description={t.comptable.description}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.nav.invoices} value={stats.invoices} icon={FileText} accent="navy" />
        <StatCard label={t.nav.payments} value={stats.payments} icon={Banknote} accent="teal" />
        <StatCard
          label={t.dashboard.totalInvoiced}
          value={formatMad(stats.total_invoiced)}
          variant="compact"
        />
        <StatCard
          label={t.dashboard.balanceDue}
          value={formatMad(stats.balance_due)}
          variant="alert"
          subtitle={`${stats.unpaid_invoices} ${t.comptable.unpaidCount}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/invoices"
          className="group cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-teal-500/40"
        >
          <FileText className="mb-3 text-teal-600" size={28} />
          <h3 className="text-lg font-semibold text-navy-900 group-hover:text-teal-600">{t.nav.invoices}</h3>
          <p className="mt-1 text-sm text-muted">{t.comptable.invoicesDesc}</p>
        </Link>
        <Link
          to="/payments"
          className="group cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-teal-500/40"
        >
          <Banknote className="mb-3 text-teal-600" size={28} />
          <h3 className="text-lg font-semibold text-navy-900 group-hover:text-teal-600">{t.nav.payments}</h3>
          <p className="mt-1 text-sm text-muted">{t.comptable.paymentsDesc}</p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.comptable.recentInvoices}</h2>
            <Link to="/invoices" className="text-sm text-teal-600 hover:underline">{t.dashboard.viewAll}</Link>
          </div>
          <div className="space-y-3">
            {data.recent_invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{inv.reference}</p>
                  <p className="text-sm text-muted">{inv.client?.name}</p>
                </div>
                <p className="font-semibold">{formatMad(Number(inv.total))}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.comptable.recentPayments}</h2>
            <Link to="/payments" className="text-sm text-teal-600 hover:underline">{t.dashboard.viewAll}</Link>
          </div>
          <div className="space-y-3">
            {data.recent_payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{payment.reference}</p>
                  <p className="text-sm text-muted">
                    {payment.client?.name} · {formatDateShort(payment.payment_date)}
                  </p>
                </div>
                <p className="font-semibold text-teal-600">{formatMad(Number(payment.amount))}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
