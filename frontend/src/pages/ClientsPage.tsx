import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Client, Paginated } from '../types'
import Card from '../components/ui/Card'
import FilterBar from '../components/ui/FilterBar'
import PageHeader from '../components/ui/PageHeader'

export default function ClientsPage() {
  const { t } = useI18n()
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', city: '', category: '', ice_number: '', credit_limit: '', payment_terms_days: '30',
  })

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get<Paginated<Client>>('/clients', { params }).then((res) => setClients(res.data.data))
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await api.post('/clients', {
      ...form,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
      payment_terms_days: Number(form.payment_terms_days),
    })
    setShowForm(false)
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', city: '', category: '', ice_number: '', credit_limit: '', payment_terms_days: '30' })
    load()
  }

  const cities = [...new Set(clients.map((c) => c.city).filter(Boolean))] as string[]

  return (
    <div>
      <PageHeader
        title={t.clients.title}
        description={t.clients.description}
        action={
          <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} />
            {t.clients.new}
          </button>
        }
      />

      <FilterBar
        fields={[
          { key: 'search', label: t.filters.search, type: 'text', placeholder: 'Nom, téléphone, ICE...' },
          { key: 'city', label: t.common.city, type: 'select', placeholder: t.common.all, options: cities.map((c) => ({ value: c, label: c })) },
          { key: 'category', label: t.common.category, type: 'text', placeholder: t.common.category },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <input placeholder={t.common.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border px-4 py-3" required />
            <input placeholder={t.clients.contact} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.common.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.auth.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.clients.ice} value={form.ice_number} onChange={(e) => setForm({ ...form, ice_number: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.common.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.common.category} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.clients.creditLimit} type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.clients.paymentTerms} type="number" value={form.payment_terms_days} onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })} className="rounded-xl border border-border px-4 py-3" />
            <input placeholder={t.common.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl border border-border px-4 py-3 md:col-span-3" />
            <button type="submit" className="cursor-pointer rounded-xl bg-navy-900 px-4 py-3 font-semibold text-white md:col-span-3">{t.clients.save}</button>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-3">{t.common.name}</th>
                <th className="px-3 py-3">{t.common.city}</th>
                <th className="px-3 py-3">{t.common.category}</th>
                <th className="px-3 py-3">{t.clients.ordersCount}</th>
                <th className="px-3 py-3">{t.clients.totalSales}</th>
                <th className="px-3 py-3">{t.clients.balanceDue}</th>
                <th className="px-3 py-3">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    <p className="font-medium text-navy-900">{client.name}</p>
                    {client.contact_person && <p className="text-xs text-muted">{client.contact_person}</p>}
                  </td>
                  <td className="px-3 py-3">{client.city ?? t.common.dash}</td>
                  <td className="px-3 py-3">{client.category ?? t.common.dash}</td>
                  <td className="px-3 py-3">{client.orders_count ?? 0}</td>
                  <td className="px-3 py-3">{client.total_sales?.toLocaleString('fr-FR') ?? 0} MAD</td>
                  <td className="px-3 py-3 font-medium text-red-600">{client.balance_due?.toLocaleString('fr-FR') ?? 0} MAD</td>
                  <td className="px-3 py-3">
                    <Link to={`/clients/${client.id}`} className="inline-flex cursor-pointer items-center gap-1 text-teal-600 hover:underline">
                      <Eye size={14} />
                      {t.common.view}
                    </Link>
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
