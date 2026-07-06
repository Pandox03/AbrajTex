import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Container, FabricType, Paginated } from '../types'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import FilterBar from '../components/ui/FilterBar'

const statusColors: Record<Container['status'], string> = {
  in_transit: 'bg-amber-100 text-amber-800',
  arrived: 'bg-teal-100 text-teal-800',
  processing: 'bg-blue-100 text-blue-800',
  closed: 'bg-slate-100 text-slate-700',
}

interface StockLine {
  fabric_type_id: string
  quantity_m2: string
  estimated_rolls: string
}

const emptyStockLine = (): StockLine => ({
  fabric_type_id: '',
  quantity_m2: '',
  estimated_rolls: '',
})

export default function ContainersPage() {
  const { t, containerStatusLabel } = useI18n()
  const navigate = useNavigate()
  const [containers, setContainers] = useState<Container[]>([])
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    reference: '',
    arrival_date: new Date().toISOString().slice(0, 10),
    origin: 'Chine',
    notes: '',
  })
  const [stockLines, setStockLines] = useState<StockLine[]>([emptyStockLine()])

  async function load() {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    const { data } = await api.get<Paginated<Container>>('/containers', { params })
    setContainers(data.data)
  }

  useEffect(() => {
    load()
  }, [filters])

  useEffect(() => {
    if (showForm && fabricTypes.length === 0) {
      api.get<FabricType[]>('/fabric-types').then((res) => setFabricTypes(res.data))
    }
  }, [showForm, fabricTypes.length])

  function updateStockLine(index: number, field: keyof StockLine, value: string) {
    setStockLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { data } = await api.post<Container>('/containers', {
        ...form,
        status: 'arrived',
        items: stockLines.map((line) => ({
          fabric_type_id: Number(line.fabric_type_id),
          quantity_m2: Number(line.quantity_m2),
          estimated_rolls: line.estimated_rolls ? Number(line.estimated_rolls) : null,
        })),
      })

      setShowForm(false)
      setForm({ reference: '', arrival_date: new Date().toISOString().slice(0, 10), origin: 'Chine', notes: '' })
      setStockLines([emptyStockLine()])
      navigate(`/containers/${data.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Impossible d\'enregistrer le conteneur.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t.containers.title}
        description={t.containers.description}
        action={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Plus size={16} />
            {t.containers.new}
          </button>
        }
      />

      <FilterBar
        fields={[
          { key: 'search', label: t.filters.search, type: 'text', placeholder: t.containers.refPlaceholder },
          {
            key: 'status',
            label: t.containers.status,
            type: 'select',
            placeholder: t.common.all,
            options: (['in_transit', 'arrived', 'processing', 'closed'] as const).map((s) => ({
              value: s,
              label: containerStatusLabel(s),
            })),
          },
          { key: 'date_from', label: t.common.from, type: 'date' },
          { key: 'date_to', label: t.common.to, type: 'date' },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold">{t.containers.new}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  placeholder={t.containers.refPlaceholder}
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="rounded-xl border border-border px-4 py-3"
                  required
                />
                <input
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                  className="rounded-xl border border-border px-4 py-3"
                  required
                />
                <input
                  placeholder={t.common.origin}
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className="rounded-xl border border-border px-4 py-3"
                />
                <input
                  placeholder={t.common.notes}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-xl border border-border px-4 py-3"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{t.containers.stockLines}</h3>
                <button
                  type="button"
                  onClick={() => setStockLines((prev) => [...prev, emptyStockLine()])}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
                >
                  <Plus size={14} />
                  {t.containers.addStockLine}
                </button>
              </div>
              <p className="mb-4 text-sm text-muted">{t.containers.stockRequired}</p>

              {stockLines.map((line, index) => (
                <div key={index} className="mb-4 rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-900">
                      {t.containers.stockLine} {index + 1}
                    </span>
                    {stockLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStockLines((prev) => prev.filter((_, i) => i !== index))}
                        className="cursor-pointer text-red-600"
                        aria-label="Supprimer la ligne"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={line.fabric_type_id}
                      onChange={(e) => updateStockLine(index, 'fabric_type_id', e.target.value)}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm md:col-span-2"
                      required
                    >
                      <option value="">{t.containers.selectType}</option>
                      {fabricTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <input
                      placeholder={t.containers.quantityM2}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={line.quantity_m2}
                      onChange={(e) => updateStockLine(index, 'quantity_m2', e.target.value)}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm"
                      required
                    />
                    <input
                      placeholder={t.containers.estimatedRolls}
                      type="number"
                      min="0"
                      value={line.estimated_rolls}
                      onChange={(e) => updateStockLine(index, 'estimated_rolls', e.target.value)}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-xl bg-navy-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? t.common.loading : t.containers.save}
            </button>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">{t.common.reference}</th>
                <th className="px-3 py-3 font-medium">{t.containers.arrival}</th>
                <th className="px-3 py-3 font-medium">{t.common.origin}</th>
                <th className="px-3 py-3 font-medium">{t.containers.status}</th>
                <th className="px-3 py-3 font-medium">{t.containers.linesCount}</th>
                <th className="px-3 py-3 font-medium">{t.containers.arrivedM2}</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    <Link to={`/containers/${container.id}`} className="cursor-pointer font-medium text-teal-600 hover:underline">
                      {container.reference}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{container.arrival_date}</td>
                  <td className="px-3 py-3">{container.origin}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[container.status]}`}>
                      {containerStatusLabel(container.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{container.stock_summary?.lines_count ?? container.items_count ?? 0}</td>
                  <td className="px-3 py-3 font-semibold text-teal-600">
                    {(container.stock_summary?.total_m2 ?? 0).toLocaleString('fr-FR')}
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
