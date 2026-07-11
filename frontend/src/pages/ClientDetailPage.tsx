import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LocaleContext'
import type { ClientProfile, Invoice, InvoiceStatus, Payment, Sale } from '../types'
import Card from '../components/ui/Card'
import { InvoiceStatusSelect } from '../components/ui/InvoiceStatusSelect'
import { InvoiceBadge, PaymentBadge } from '../components/ui/StatusBadge'

type Tab = 'orders' | 'payments' | 'invoices'

export default function ClientDetailPage() {
  const { id } = useParams()
  const { isAdmin, isSecretaire } = useAuth()
  const canRecordPayment = isAdmin || isSecretaire
  const { t } = useI18n()
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [tab, setTab] = useState<Tab>('orders')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<number | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    reference: `PAY-${Date.now()}`,
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'virement',
    bank_reference: '',
    notes: '',
  })
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const load = useCallback(() => {
    api.get<ClientProfile>(`/clients/${id}`).then((res) => setProfile(res.data))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handlePayment(e: FormEvent) {
    e.preventDefault()
    if (!profile) return

    const requiresProof = paymentForm.method === 'virement' || paymentForm.method === 'cheque'
    if (requiresProof && !proofFile) {
      setPaymentError(t.clients.proofRequired)
      return
    }

    setPaymentError('')
    setSubmittingPayment(true)

    try {
      const formData = new FormData()
      formData.append('client_id', String(profile.client.id))
      formData.append('reference', paymentForm.reference)
      formData.append('amount', paymentForm.amount)
      formData.append('payment_date', paymentForm.payment_date)
      formData.append('method', paymentForm.method)
      if (paymentForm.bank_reference) formData.append('bank_reference', paymentForm.bank_reference)
      if (paymentForm.notes) formData.append('notes', paymentForm.notes)
      if (proofFile) formData.append('proof_document', proofFile)

      await api.post('/payments', formData)

      setShowPaymentForm(false)
      setProofFile(null)
      setPaymentForm({
        reference: `PAY-${Date.now()}`,
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        method: 'virement',
        bank_reference: '',
        notes: '',
      })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPaymentError(msg ?? 'Erreur lors de l\'enregistrement du paiement.')
    } finally {
      setSubmittingPayment(false)
    }
  }

  async function downloadProof(payment: Payment) {
    if (!payment.id) return
    const res = await api.get(`/payments/${payment.id}/proof`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank')
  }

  async function updateInvoiceStatus(invoice: Invoice, status: InvoiceStatus) {
    if (status === invoice.status) return
    setUpdatingInvoiceId(invoice.id)
    try {
      const { data } = await api.put<Invoice>(`/invoices/${invoice.id}`, { status })
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              invoices: prev.invoices.map((inv) => (inv.id === invoice.id ? { ...inv, ...data } : inv)),
            }
          : prev,
      )
    } finally {
      setUpdatingInvoiceId(null)
    }
  }

  if (!profile) return <p className="text-muted">{t.common.loading}</p>

  const { client, balance, sales, payments, invoices } = profile

  const requiresProof = paymentForm.method === 'virement' || paymentForm.method === 'cheque'
  const canPay = balance.balance_due > 0.01

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'orders', label: t.clients.orders, count: sales.length },
    { key: 'payments', label: t.clients.payments, count: payments.length },
    { key: 'invoices', label: t.clients.invoices, count: invoices.length },
  ]

  return (
    <div>
      <Link to="/clients" className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-teal-600 hover:underline">
        <ArrowLeft size={16} />
        {t.clients.title}
      </Link>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-navy-900">{client.name}</h1>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {client.contact_person && <p><span className="text-muted">{t.clients.contact} :</span> {client.contact_person}</p>}
            {client.phone && <p><span className="text-muted">{t.common.phone} :</span> {client.phone}</p>}
            {client.email && <p><span className="text-muted">{t.auth.email} :</span> {client.email}</p>}
            {client.ice_number && <p><span className="text-muted">{t.clients.ice} :</span> {client.ice_number}</p>}
            {client.city && <p><span className="text-muted">{t.common.city} :</span> {client.city}</p>}
            {client.category && <p><span className="text-muted">{t.common.category} :</span> {client.category}</p>}
            {client.address && <p className="sm:col-span-2"><span className="text-muted">{t.common.address} :</span> {client.address}</p>}
            {client.credit_limit && <p><span className="text-muted">{t.clients.creditLimit} :</span> {Number(client.credit_limit).toLocaleString('fr-FR')} MAD</p>}
            <p><span className="text-muted">{t.clients.paymentTerms} :</span> {client.payment_terms_days ?? 30} {t.clients.days}</p>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <p className="text-sm text-muted">{t.clients.totalInvoiced}</p>
            <p className="text-2xl font-bold text-navy-900">{(balance.total_invoiced ?? balance.total_sales).toLocaleString('fr-FR')} MAD</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">{t.clients.balanceDue}</p>
            <p className="text-2xl font-bold text-red-600">{balance.balance_due.toLocaleString('fr-FR')} MAD</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">{t.clients.totalPaid}</p>
            <p className="text-2xl font-bold text-teal-600">{balance.total_paid.toLocaleString('fr-FR')} MAD</p>
          </Card>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium ${tab === tabItem.key ? 'bg-teal-500 text-white' : 'border border-border'}`}
            >
              {tabItem.label} ({tabItem.count})
            </button>
          ))}
        </div>
        {canRecordPayment && canPay && (
          <button
            type="button"
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            {t.clients.addPayment}
          </button>
        )}
      </div>

      {canRecordPayment && showPaymentForm && canPay && (
        <Card className="mb-6">
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm">
              <p className="font-medium text-navy-900">{t.clients.paymentFifoHint}</p>
              <p className="mt-1 text-muted">
                {t.clients.balanceDue}: <strong className="text-red-600">{balance.balance_due.toLocaleString('fr-FR')} MAD</strong>
              </p>
            </div>

            <div className="grid items-start gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.clients.paymentRef}</label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.common.amount}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={balance.balance_due}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.common.date}</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.common.method}</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => {
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                    if (e.target.value !== 'virement' && e.target.value !== 'cheque') setProofFile(null)
                  }}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {Object.entries(t.paymentMethod).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.clients.bankRef}</label>
                <input
                  value={paymentForm.bank_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bank_reference: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </div>
              {requiresProof && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    {t.clients.proofDocument} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="h-10 w-full rounded-xl border border-border px-3 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                    required
                  />
                  <p className="mt-1 text-xs text-muted">{t.clients.proofRequired}</p>
                </div>
              )}
            </div>
            {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
            <button
              type="submit"
              disabled={submittingPayment}
              className="cursor-pointer rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {submittingPayment ? t.common.loading : t.clients.addPayment}
            </button>
          </form>
        </Card>
      )}

      {tab === 'orders' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-3">{t.common.reference}</th>
                  <th className="px-3 py-3">{t.common.date}</th>
                  <th className="px-3 py-3">{t.common.total}</th>
                  <th className="px-3 py-3">{t.sales.payment}</th>
                  <th className="px-3 py-3">{t.sales.balance}</th>
                  <th className="px-3 py-3">Rouleaux</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">{t.clients.noOrders}</td></tr>}
                {sales.map((sale: Sale) => (
                  <tr key={sale.id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-medium">{sale.reference}</td>
                    <td className="px-3 py-3">{sale.sale_date}</td>
                    <td className="px-3 py-3">{Number(sale.total_amount).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-3 py-3">{sale.payment_status && <PaymentBadge status={sale.payment_status} />}</td>
                    <td className="px-3 py-3">{(Number(sale.total_amount) - Number(sale.paid_amount ?? 0)).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-3 py-3">{sale.items?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-3">{t.common.reference}</th>
                  <th className="px-3 py-3">{t.common.date}</th>
                  <th className="px-3 py-3">{t.common.amount}</th>
                  <th className="px-3 py-3">{t.common.method}</th>
                  <th className="px-3 py-3">{t.clients.bankRef}</th>
                  <th className="px-3 py-3">{t.clients.proofDocument}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">{t.clients.noPayments}</td></tr>}
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-medium">{p.reference}</td>
                    <td className="px-3 py-3">{p.payment_date}</td>
                    <td className="px-3 py-3 font-semibold text-teal-600">{Number(p.amount).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-3 py-3">{t.paymentMethod[p.method]}</td>
                    <td className="px-3 py-3">{p.bank_reference ?? t.common.dash}</td>
                    <td className="px-3 py-3">
                      {p.proof_document_url ? (
                        <button type="button" onClick={() => downloadProof(p)} className="cursor-pointer text-sm text-teal-600 hover:underline">
                          {t.clients.viewProof}
                        </button>
                      ) : t.common.dash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-3">{t.common.reference}</th>
                  <th className="px-3 py-3">{t.common.date}</th>
                  <th className="px-3 py-3">{t.invoices.totalTtc}</th>
                  <th className="px-3 py-3">{t.sales.balance}</th>
                  <th className="px-3 py-3">{t.invoices.dueDate}</th>
                  <th className="px-3 py-3">{t.containers.status}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">{t.clients.noInvoices}</td></tr>}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-medium">{inv.reference}</td>
                    <td className="px-3 py-3">{inv.invoice_date}</td>
                    <td className="px-3 py-3">{Number(inv.total).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-3 py-3">{(inv.remaining_to_pay ?? Number(inv.total)).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-3 py-3">{inv.due_date ?? t.common.dash}</td>
                    <td className="px-3 py-3">
                      {isAdmin ? (
                        <InvoiceStatusSelect
                          value={inv.status}
                          disabled={updatingInvoiceId === inv.id}
                          onChange={(status) => updateInvoiceStatus(inv, status)}
                        />
                      ) : (
                        <InvoiceBadge status={inv.status} />
                      )}
                    </td>
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
