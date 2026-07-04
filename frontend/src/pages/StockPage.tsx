import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { FabricRoll, FabricType, Paginated, StockLine, StockResponse } from '../types'
import Card from '../components/ui/Card'
import FilterBar from '../components/ui/FilterBar'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { Layers, Package, Ruler, ScrollText } from 'lucide-react'

type Tab = 'summary' | 'rolls'

export default function StockPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('summary')
  const [stock, setStock] = useState<StockResponse | null>(null)
  const [rolls, setRolls] = useState<FabricRoll[]>([])
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  const loadMeta = useCallback(() => {
    api.get<FabricType[]>('/fabric-types').then((res) => setFabricTypes(res.data))
  }, [])

  const loadStock = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get<StockResponse>('/stock', { params }).then((res) => setStock(res.data))
  }, [filters])

  const loadRolls = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get<Paginated<FabricRoll>>('/stock/rolls', { params }).then((res) => setRolls(res.data.data))
  }, [filters])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (tab === 'summary') loadStock()
    else loadRolls()
  }, [tab, loadStock, loadRolls])

  const items = stock?.items.data ?? []

  return (
    <div>
      <PageHeader title={t.stock.title} description={t.stock.description} />

      <FilterBar
        fields={[
          { key: 'search', label: t.filters.search, type: 'text', placeholder: t.filters.search },
          {
            key: 'fabric_type_id',
            label: t.containers.type,
            type: 'select',
            placeholder: t.newSale.fabricType,
            options: fabricTypes.map((type) => ({ value: String(type.id), label: type.name })),
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
      />

      {stock && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t.stock.totalM2} value={stock.summary.total_m2.toLocaleString('fr-FR')} icon={Layers} accent="navy" />
          <StatCard label={t.stock.availableM2} value={stock.summary.available_m2.toLocaleString('fr-FR')} icon={Ruler} accent="mint" />
          <StatCard label={t.stock.soldM2} value={stock.summary.sold_m2.toLocaleString('fr-FR')} icon={Package} accent="teal" />
          <StatCard label={t.stock.availableRolls} value={stock.summary.available_rolls} icon={ScrollText} accent="gold" />
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('summary')}
          className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium ${tab === 'summary' ? 'bg-teal-500 text-white' : 'border border-border'}`}
        >
          {t.stock.summaryTab}
        </button>
        <button
          type="button"
          onClick={() => setTab('rolls')}
          className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium ${tab === 'rolls' ? 'bg-teal-500 text-white' : 'border border-border'}`}
        >
          {t.stock.rollsTab}
        </button>
      </div>

      {tab === 'summary' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-3">{t.containers.type}</th>
                  <th className="px-3 py-3">{t.stock.totalRolls}</th>
                  <th className="px-3 py-3">{t.stock.availableRollsCol}</th>
                  <th className="px-3 py-3">{t.containers.totalM2}</th>
                  <th className="px-3 py-3">{t.containers.availableM2}</th>
                  <th className="px-3 py-3">{t.containers.soldM2}</th>
                  <th className="px-3 py-3">{t.stock.soldRolls}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((line: StockLine) => (
                  <tr key={line.fabric_type_id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-medium">{line.fabric_type?.name}</td>
                    <td className="px-3 py-3">{line.total_rolls}</td>
                    <td className="px-3 py-3 font-semibold text-teal-600">{line.available_rolls}</td>
                    <td className="px-3 py-3">{line.quantity_m2.toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-3 font-semibold text-teal-600">{line.available_m2.toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-3">{line.sold_m2.toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-3">{line.sold_rolls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-3">{t.stock.rollNo}</th>
                  <th className="px-3 py-3">{t.containers.type}</th>
                  <th className="px-3 py-3">m²</th>
                  <th className="px-3 py-3">{t.fabricTypes.width}</th>
                  <th className="px-3 py-3">{t.stock.lengthM}</th>
                  <th className="px-3 py-3">{t.stock.rollStatus}</th>
                  <th className="px-3 py-3">{t.sales.client}</th>
                </tr>
              </thead>
              <tbody>
                {rolls.map((roll) => (
                  <tr key={roll.id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-medium">{roll.roll_number}</td>
                    <td className="px-3 py-3">{roll.fabric_type?.name}</td>
                    <td className="px-3 py-3">{Number(roll.quantity_m2).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-3">{roll.width_cm} cm</td>
                    <td className="px-3 py-3">{roll.length_m} m</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roll.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                        {roll.status === 'available' ? t.stock.available : t.stock.sold}
                      </span>
                    </td>
                    <td className="px-3 py-3">{roll.sale?.client?.name ?? t.common.dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
