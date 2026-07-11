import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Client, Paginated, Payment } from '../types'
import Card from '../components/ui/Card'
import FilterBar from '../components/ui/FilterBar'
import PageHeader from '../components/ui/PageHeader'

export default function PaymentsPage() {
  const { t, formatDateShort } = useI18n()
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get<Paginated<Payment>>('/payments', { params }).then((res) => setPayments(res.data.data))
  }, [filters])

  useEffect(() => {
    api.get<Client[]>('/clients', { params: { lite: 1 } }).then((res) => setClients(res.data))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const recordStatusLabels: Record<Payment['status'], string> = {
    pending: t.payments.statusPending,
    confirmed: t.payments.statusConfirmed,
    cancelled: t.payments.statusCancelled,
  }

  async function downloadProof(payment: Payment) {
    const res = await api.get(`/payments/${payment.id}/proof`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-w-0">
      <PageHeader title={t.payments.title} description={t.payments.description} />

      <FilterBar
        fields={[
          { key: 'search', label: t.filters.search, type: 'text', placeholder: 'Réf., client, facture...' },
          {
            key: 'status',
            label: t.containers.status,
            type: 'select',
            placeholder: t.common.all,
            options: (['confirmed', 'pending', 'cancelled'] as const).map((s) => ({
              value: s,
              label: recordStatusLabels[s],
            })),
          },
          {
            key: 'method',
            label: t.payments.method,
            type: 'select',
            placeholder: t.common.all,
            options: (['especes', 'cheque', 'virement', 'effet', 'autre'] as const).map((m) => ({
              value: m,
              label: t.paymentMethod[m],
            })),
          },
          {
            key: 'client_id',
            label: t.sales.client,
            type: 'select',
            placeholder: t.common.all,
            options: clients.map((c) => ({ value: String(c.id), label: c.name })),
          },
          { key: 'date_from', label: t.common.from, type: 'date' },
          { key: 'date_to', label: t.common.to, type: 'date' },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">{t.common.reference}</th>
                <th className="whitespace-nowrap px-4 py-3">{t.sales.client}</th>
                <th className="whitespace-nowrap px-4 py-3">{t.payments.invoice}</th>
                <th className="whitespace-nowrap px-4 py-3">{t.payments.date}</th>
                <th className="whitespace-nowrap px-4 py-3">{t.payments.method}</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">{t.payments.amount}</th>
                <th className="whitespace-nowrap px-4 py-3">{t.containers.status}</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">{t.clients.noPayments}</td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border/70">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{payment.reference}</td>
                  <td className="max-w-[180px] px-4 py-3">
                    <Link
                      to={`/clients/${payment.client_id}`}
                      className="text-teal-600 hover:underline"
                      title={payment.client?.name}
                    >
                      {payment.client?.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {payment.invoice?.reference ?? (payment.auto_allocated ? t.payments.autoAllocation : t.common.dash)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateShort(payment.payment_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{t.paymentMethod[payment.method]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    {Number(payment.amount).toLocaleString('fr-FR')} MAD
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        payment.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payment.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {recordStatusLabels[payment.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {payment.proof_document_url && (
                      <button
                        type="button"
                        onClick={() => downloadProof(payment)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                      >
                        <Download size={14} />
                        {t.payments.proof}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
