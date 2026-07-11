import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Client } from '../types'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function NewCreditPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [credit, setCredit] = useState({
    reference: `CRD-${Date.now()}`,
    client_id: '',
    sale_date: new Date().toISOString().slice(0, 10),
    total_amount: '',
    notes: '',
  })
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Client[]>('/clients', { params: { lite: 1 } })
      .then((res) => setClients(res.data))
      .catch(() => setError(t.credit.loadError))
      .finally(() => setLoadingOptions(false))
  }, [t.credit.loadError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await api.post('/sales', {
        sale_type: 'legacy_credit',
        reference: credit.reference,
        client_id: Number(credit.client_id),
        sale_date: credit.sale_date,
        total_amount: Number(credit.total_amount),
        notes: credit.notes || null,
      })
      navigate('/sales')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? t.credit.error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) {
    return <p className="text-muted">{t.common.loading}</p>
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={t.credit.title} description={t.credit.description} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t.common.reference}</label>
              <input
                value={credit.reference}
                onChange={(e) => setCredit({ ...credit, reference: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t.common.date}</label>
              <input
                type="date"
                value={credit.sale_date}
                onChange={(e) => setCredit({ ...credit, sale_date: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t.sales.client}</label>
              <select
                value={credit.client_id}
                onChange={(e) => setCredit({ ...credit, client_id: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                required
              >
                <option value="">{t.credit.selectClient}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t.credit.totalAmount}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={credit.total_amount}
                onChange={(e) => setCredit({ ...credit, total_amount: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3 text-lg font-semibold"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t.common.notes}</label>
              <textarea
                value={credit.notes}
                onChange={(e) => setCredit({ ...credit, notes: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                rows={2}
                placeholder={t.credit.notesPlaceholder}
              />
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t.credit.noStockHint}
          </p>
          <p className="mt-2 text-sm text-muted">{t.credit.invoiceHint}</p>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? t.credit.saving : t.credit.submit}
        </button>
      </form>
    </div>
  )
}
