import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Container, FabricType } from '../types'
import Card from '../components/ui/Card'

export default function ContainerDetailPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fabric_type_id: '',
    quantity_m2: '',
    estimated_rolls: '',
  })

  async function load() {
    const [containerRes, typesRes] = await Promise.all([
      api.get<Container>(`/containers/${id}`),
      api.get<FabricType[]>('/fabric-types'),
    ])
    setContainer(containerRes.data)
    setFabricTypes(typesRes.data)
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleAddItem(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      await api.post(`/containers/${id}/items`, {
        fabric_type_id: Number(form.fabric_type_id),
        quantity_m2: Number(form.quantity_m2),
        estimated_rolls: form.estimated_rolls ? Number(form.estimated_rolls) : null,
      })
      setShowForm(false)
      setForm({ fabric_type_id: '', quantity_m2: '', estimated_rolls: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Impossible d\'ajouter la ligne stock.')
    }
  }

  if (!container) return <p className="text-muted">{t.common.loading}</p>

  const summary = container.stock_summary

  return (
    <div>
      <Link to="/containers" className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-teal-600 hover:underline">
        <ArrowLeft size={16} />
        {t.containers.back}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">{container.reference}</h1>
        <p className="text-muted">
          {t.containers.arrivedOn} {container.arrival_date} · {container.origin}
        </p>
      </div>

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-sm text-muted">{t.containers.linesCount}</p>
            <p className="text-2xl font-bold text-navy-900">{summary.lines_count}</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">{t.containers.arrivedM2}</p>
            <p className="text-2xl font-bold text-teal-600">{summary.total_m2.toLocaleString('fr-FR')}</p>
          </Card>
        </div>
      )}

      <p className="mb-4 text-sm text-muted">
        Les quantités ci-dessous alimentent le stock global par type de tissu.
      </p>

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          {t.containers.addStockLine}
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleAddItem} className="grid gap-4 md:grid-cols-2">
            <select
              value={form.fabric_type_id}
              onChange={(e) => setForm({ ...form, fabric_type_id: e.target.value })}
              className="rounded-xl border border-border px-4 py-3 md:col-span-2"
              required
            >
              <option value="">{t.containers.selectType}</option>
              {fabricTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              placeholder={t.containers.quantityM2}
              type="number"
              step="0.01"
              min="0.01"
              value={form.quantity_m2}
              onChange={(e) => setForm({ ...form, quantity_m2: e.target.value })}
              className="rounded-xl border border-border px-4 py-3"
              required
            />
            <input
              placeholder={t.containers.estimatedRolls}
              type="number"
              min="0"
              value={form.estimated_rolls}
              onChange={(e) => setForm({ ...form, estimated_rolls: e.target.value })}
              className="rounded-xl border border-border px-4 py-3"
            />
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <button type="submit" className="cursor-pointer rounded-xl bg-navy-900 px-4 py-3 font-semibold text-white md:col-span-2">
              {t.containers.addToContainer}
            </button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t.containers.containerStock}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-3">{t.containers.type}</th>
                <th className="px-3 py-3">{t.containers.arrivedM2}</th>
                <th className="px-3 py-3">{t.containers.estRolls}</th>
              </tr>
            </thead>
            <tbody>
              {(!container.items || container.items.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted">{t.containers.noStockLines}</td>
                </tr>
              )}
              {container.items?.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td className="px-3 py-3 font-medium">{item.fabric_type?.name}</td>
                  <td className="px-3 py-3">{Number(item.quantity_m2).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3">{item.estimated_rolls ?? t.common.dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
