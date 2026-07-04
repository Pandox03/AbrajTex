import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../context/LocaleContext'
import type { ActivityLog, Paginated, User } from '../types'
import Card from '../components/ui/Card'
import FilterBar from '../components/ui/FilterBar'
import PageHeader from '../components/ui/PageHeader'

const actionOptions = ['created', 'updated', 'deleted', 'login', 'logout'] as const

const subjectOptions = [
  'auth',
  'container',
  'container_item',
  'client',
  'sale',
  'invoice',
  'payment',
  'user',
  'fabric_type',
] as const

export default function LogsPage() {
  const { t, formatDateTime } = useI18n()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get<Paginated<ActivityLog>>('/activity-logs', { params }).then((res) => setLogs(res.data.data))
  }, [filters])

  useEffect(() => {
    api.get<Paginated<User>>('/users', { params: { per_page: 100 } }).then((res) => setUsers(res.data.data))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function actionLabel(action: string) {
    const labels = t.logs.actions as Record<string, string>
    return labels[action] ?? action
  }

  function subjectLabel(subject: string | null) {
    if (!subject) return t.common.dash
    const labels = t.logs.subjects as Record<string, string>
    return labels[subject] ?? subject
  }

  function actionBadgeClass(action: string) {
    switch (action) {
      case 'created':
        return 'bg-emerald-100 text-emerald-800'
      case 'updated':
        return 'bg-blue-100 text-blue-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      case 'login':
        return 'bg-teal-100 text-teal-800'
      case 'logout':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-surface text-navy-900'
    }
  }

  return (
    <div>
      <PageHeader title={t.logs.title} description={t.logs.description} />

      <FilterBar
        fields={[
          { key: 'search', label: t.filters.search, type: 'text', placeholder: 'Description ou utilisateur...' },
          {
            key: 'action',
            label: t.logs.action,
            type: 'select',
            placeholder: t.common.all,
            options: actionOptions.map((a) => ({ value: a, label: actionLabel(a) })),
          },
          {
            key: 'subject_type',
            label: t.logs.subject,
            type: 'select',
            placeholder: t.common.all,
            options: subjectOptions.map((s) => ({ value: s, label: subjectLabel(s) })),
          },
          {
            key: 'user_id',
            label: t.logs.user,
            type: 'select',
            placeholder: t.common.all,
            options: users.map((u) => ({ value: String(u.id), label: u.name })),
          },
          { key: 'date_from', label: t.common.from, type: 'date' },
          { key: 'date_to', label: t.common.to, type: 'date' },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-3">{t.common.date}</th>
                <th className="px-3 py-3">{t.logs.user}</th>
                <th className="px-3 py-3">{t.logs.action}</th>
                <th className="px-3 py-3">{t.logs.subject}</th>
                <th className="px-3 py-3">{t.logs.description_col}</th>
                <th className="px-3 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    {t.logs.noLogs}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/70">
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{log.user?.name ?? t.logs.system}</p>
                    {log.user?.email && <p className="text-xs text-muted">{log.user.email}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${actionBadgeClass(log.action)}`}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{subjectLabel(log.subject_type)}</td>
                  <td className="px-3 py-3">{log.description}</td>
                  <td className="px-3 py-3 text-muted">{log.ip_address ?? t.common.dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
