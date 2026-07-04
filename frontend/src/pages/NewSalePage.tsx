import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { Client, FabricType } from '../types'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

interface SaleLine {
  fabric_type_id: string
  roll_count: string
  quantity_m2: string
  unit_price: string
  m2Manual: boolean
}

interface StockAvailability {
  found: boolean
  fabric_type_id?: number
  fabric_type_name?: string
  available_m2: number
  total_m2: number
  sold_m2: number
  total_rolls: number
  sold_rolls: number
  available_rolls: number
  avg_m2_per_roll: number
}

const emptyLine = (): SaleLine => ({
  fabric_type_id: '',
  roll_count: '1',
  quantity_m2: '',
  unit_price: '',
  m2Manual: false,
})

function suggestedM2(rollCount: string, stock?: StockAvailability): string {
  const rolls = Number(rollCount)
  if (!stock || !Number.isFinite(rolls) || rolls <= 0) return ''
  return String(Math.round(rolls * stock.avg_m2_per_roll * 100) / 100)
}

export default function NewSalePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [sale, setSale] = useState({
    reference: `VTE-${Date.now()}`,
    client_id: '',
    sale_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [lines, setLines] = useState<SaleLine[]>([emptyLine()])
  const [stockByType, setStockByType] = useState<Record<string, StockAvailability>>({})
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    api
      .get<{ clients: Client[]; fabric_types: FabricType[] }>(
        '/sales/form-options',
        { signal: controller.signal },
      )
      .then((res) => {
        setClients(res.data.clients)
        setFabricTypes(res.data.fabric_types)
      })
      .catch((err: { code?: string }) => {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return
        setError(t.newSale.loadError)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingOptions(false)
        }
      })

    return () => controller.abort()
  }, [t.newSale.loadError])

  const fabricTypeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const line of lines) {
      if (line.fabric_type_id) ids.add(line.fabric_type_id)
    }
    return [...ids]
  }, [lines])

  const loadStock = useCallback(async () => {
    if (fabricTypeIds.length === 0) {
      setStockByType({})
      return
    }

    const entries = await Promise.all(
      fabricTypeIds.map(async (fabricTypeId) => {
        const { data } = await api.get<StockAvailability>('/sales/stock-availability', {
          params: { fabric_type_id: fabricTypeId },
        })
        return [fabricTypeId, data] as const
      }),
    )

    setStockByType(Object.fromEntries(entries))
  }, [fabricTypeIds])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  useEffect(() => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.m2Manual || !line.fabric_type_id) return line
        const stock = stockByType[line.fabric_type_id]
        if (!stock) return line
        const nextM2 = suggestedM2(line.roll_count, stock)
        if (nextM2 === line.quantity_m2) return line
        return { ...line, quantity_m2: nextM2 }
      }),
    )
  }, [stockByType])

  const requestedByType = useMemo(() => {
    const totals: Record<string, { rolls: number; m2: number }> = {}

    for (const line of lines) {
      if (!line.fabric_type_id) continue

      const rolls = Number(line.roll_count)
      const m2 = Number(line.quantity_m2)
      if (!Number.isFinite(rolls) || rolls <= 0) continue

      if (!totals[line.fabric_type_id]) {
        totals[line.fabric_type_id] = { rolls: 0, m2: 0 }
      }

      totals[line.fabric_type_id].rolls += rolls
      if (Number.isFinite(m2) && m2 > 0) {
        totals[line.fabric_type_id].m2 += m2
      }
    }

    return totals
  }, [lines])

  function updateLine(index: number, field: keyof SaleLine, value: string | boolean) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line

        const updated: SaleLine = { ...line, [field]: value } as SaleLine

        if (field === 'quantity_m2') {
          updated.m2Manual = true
        }

        if (field === 'fabric_type_id') {
          updated.m2Manual = false
          const stock = stockByType[String(value)]
          updated.quantity_m2 = suggestedM2(updated.roll_count, stock)
        }

        if (field === 'roll_count' && !line.m2Manual) {
          const stock = stockByType[updated.fabric_type_id]
          updated.quantity_m2 = suggestedM2(String(value), stock)
        }

        return updated
      }),
    )
  }

  function fabricLabel(fabricTypeId: string, stock?: StockAvailability): string {
    if (stock?.fabric_type_name) return stock.fabric_type_name
    return fabricTypes.find((type) => String(type.id) === fabricTypeId)?.name ?? t.newSale.fabricType
  }

  const stockWarnings = Object.entries(requestedByType).flatMap(([fabricTypeId, requested]) => {
    const stock = stockByType[fabricTypeId]
    if (!stock) return []

    const fabric = fabricLabel(fabricTypeId, stock)
    const messages: string[] = []

    if (!stock.found) {
      messages.push(t.newSale.stockNotFound.replace('{fabric}', fabric))
      return messages
    }

    if (requested.rolls > stock.available_rolls) {
      messages.push(
        t.newSale.stockExceededRolls
          .replace('{fabric}', fabric)
          .replace('{available}', String(stock.available_rolls))
          .replace('{requested}', String(requested.rolls)),
      )
    }

    if (requested.m2 > stock.available_m2 + 0.01) {
      messages.push(
        t.newSale.stockExceededM2
          .replace('{fabric}', fabric)
          .replace('{available}', stock.available_m2.toLocaleString('fr-FR'))
          .replace('{requested}', requested.m2.toLocaleString('fr-FR')),
      )
    }

    return messages
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.post('/sales', {
        reference: sale.reference,
        client_id: Number(sale.client_id),
        sale_date: sale.sale_date,
        notes: sale.notes || null,
        lines: lines.map((line) => ({
          fabric_type_id: Number(line.fabric_type_id),
          roll_count: Number(line.roll_count),
          quantity_m2: Number(line.quantity_m2),
          unit_price: Number(line.unit_price),
        })),
      })

      navigate('/sales')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? t.newSale.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title={t.newSale.title} description={t.newSale.description} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t.newSale.saleInfo}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder={t.newSale.saleRef}
              value={sale.reference}
              onChange={(e) => setSale({ ...sale, reference: e.target.value })}
              className="rounded-xl border border-border px-4 py-3"
              required
            />
            <input
              type="date"
              value={sale.sale_date}
              onChange={(e) => setSale({ ...sale, sale_date: e.target.value })}
              className="rounded-xl border border-border px-4 py-3"
              required
            />
            <select
              value={sale.client_id}
              onChange={(e) => setSale({ ...sale, client_id: e.target.value })}
              className="rounded-xl border border-border px-4 py-3 md:col-span-2"
              required
              disabled={loadingOptions}
            >
              <option value="">{loadingOptions ? t.common.loading : t.newSale.selectClient}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <textarea
              placeholder={t.common.notes}
              value={sale.notes}
              onChange={(e) => setSale({ ...sale, notes: e.target.value })}
              className="rounded-xl border border-border px-4 py-3 md:col-span-2"
              rows={2}
            />
          </div>
        </Card>

        {lines.map((line, index) => {
          const stock = line.fabric_type_id ? stockByType[line.fabric_type_id] : undefined
          const lineM2 = Number(line.quantity_m2) || 0
          const lineTotal = lineM2 > 0 && line.unit_price ? lineM2 * Number(line.unit_price) : 0
          const selectedType = fabricTypes.find((type) => String(type.id) === line.fabric_type_id)

          return (
            <Card key={index}>
              <h2 className="mb-4 text-lg font-semibold">
                {t.newSale.lineLabel} {index + 1}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={line.fabric_type_id}
                  onChange={(e) => updateLine(index, 'fabric_type_id', e.target.value)}
                  className="rounded-xl border border-border px-4 py-3 md:col-span-2"
                  required
                >
                  <option value="">{t.newSale.fabricType}</option>
                  {fabricTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={t.newSale.rollCount}
                  value={line.roll_count}
                  onChange={(e) => updateLine(index, 'roll_count', e.target.value)}
                  className="rounded-xl border border-border px-4 py-3"
                  required
                />
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder={t.newSale.quantityM2}
                  value={line.quantity_m2}
                  onChange={(e) => updateLine(index, 'quantity_m2', e.target.value)}
                  className="rounded-xl border border-border px-4 py-3"
                  required
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={t.newSale.unitPrice}
                  value={line.unit_price}
                  onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                  className="rounded-xl border border-border px-4 py-3 md:col-span-2"
                  required
                />
              </div>
              {line.fabric_type_id && (
                <div className="mt-3 rounded-xl bg-surface px-4 py-2 text-sm">
                  <span className="font-medium text-navy-900">
                    {fabricLabel(line.fabric_type_id, stock)}
                  </span>
                  {stock && (
                    <span className={stock.found ? 'ms-3 text-teal-700' : 'ms-3 text-amber-700'}>
                      · {t.newSale.stockAvailable} :{' '}
                      {stock.found ? (
                        <>
                          <strong>{stock.available_rolls} {t.newSale.rollsUnit}</strong>
                          {' · '}
                          <strong>{stock.available_m2.toLocaleString('fr-FR')} m²</strong>
                        </>
                      ) : (
                        t.newSale.stockNotFound.replace('{fabric}', fabricLabel(line.fabric_type_id, stock))
                      )}
                    </span>
                  )}
                  {lineM2 > 0 && (
                    <span className="ms-3 text-muted">
                      · {t.newSale.saleTotalM2} : <strong>{lineM2.toLocaleString('fr-FR')} m²</strong>
                      {lineTotal > 0 && (
                        <> · {t.newSale.lineTotal} : <strong>{lineTotal.toLocaleString('fr-FR')} MAD</strong></>
                      )}
                    </span>
                  )}
                </div>
              )}
              {selectedType && (
                <p className="mt-3 text-sm text-muted">
                  {t.newSale.defaultsFromType} : {selectedType.default_width_cm} cm · {selectedType.default_gsm} g/m² · {selectedType.composition}
                </p>
              )}
            </Card>
          )
        })}

        {stockWarnings.length > 0 && (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
            {stockWarnings.map((message, index) => (
              <p key={index}>{message}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-medium"
          >
            {t.newSale.addLine}
          </button>
          <button
            type="submit"
            disabled={submitting || stockWarnings.length > 0}
            className="cursor-pointer rounded-xl bg-teal-500 px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t.newSale.saving : t.newSale.complete}
          </button>
        </div>

        {error && <p className="whitespace-pre-line text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
