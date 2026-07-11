import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Client, FabricType } from '../types'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

interface CreditLine {
  fabric_type_id: string
  quantity_m2: string
  line_total: string
}

const emptyLine = (): CreditLine => ({
  fabric_type_id: '',
  quantity_m2: '',
  line_total: '',
})

export default function NewCreditPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [credit, setCredit] = useState({
    reference: `CRD-${Date.now()}`,
    client_id: '',
    sale_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [lines, setLines] = useState<CreditLine[]>([emptyLine()])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<{ clients: Client[]; fabric_types: FabricType[] }>('/sales/form-options')
      .then((res) => {
        setClients(res.data.clients)
        setFabricTypes(res.data.fabric_types)
      })
      .catch(() => setError(t.credit.loadError))
      .finally(() => setLoadingOptions(false))
  }, [t.credit.loadError])

  const grandTotal = lines.reduce((sum, line) => sum + (Number(line.line_total) || 0), 0)

  function updateLine(index: number, field: keyof CreditLine, value: string) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)))
  }

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
        notes: credit.notes || null,
        lines: lines.map((line) => ({
          fabric_type_id: Number(line.fabric_type_id),
          quantity_m2: Number(line.quantity_m2),
          line_total: Number(line.line_total),
        })),
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
    <div className="max-w-4xl">
      <PageHeader title={t.credit.title} description={t.credit.description} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-navy-900">{t.credit.info}</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">{t.credit.lines}</h2>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              <Plus size={16} />
              {t.credit.addLine}
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">{t.credit.lineLabel} {index + 1}</p>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="cursor-pointer rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      title={t.users.delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={line.fabric_type_id}
                    onChange={(e) => updateLine(index, 'fabric_type_id', e.target.value)}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm md:col-span-3"
                    required
                  >
                    <option value="">{t.newSale.fabricType}</option>
                    {fabricTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={t.credit.quantityM2}
                    value={line.quantity_m2}
                    onChange={(e) => updateLine(index, 'quantity_m2', e.target.value)}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={t.credit.amountDue}
                    value={line.line_total}
                    onChange={(e) => updateLine(index, 'line_total', e.target.value)}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm md:col-span-2"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t.credit.noStockHint}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted">{t.credit.invoiceHint}</p>
            <p className="text-lg font-bold text-navy-900">
              {t.credit.totalDue}: {grandTotal.toLocaleString('fr-FR')} MAD
            </p>
          </div>
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
