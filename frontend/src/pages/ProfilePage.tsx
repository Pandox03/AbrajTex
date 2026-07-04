import { FormEvent, useEffect, useState } from 'react'
import { UserCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LocaleContext'
import type { User } from '../types'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function ProfilePage() {
  const { user, isAdmin, updateUser } = useAuth()
  const { t } = useI18n()
  const [form, setForm] = useState({
    name: '',
    email: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
      }))
    }
  }, [user])

  function roleLabel(role: User['role']) {
    if (role === 'admin') return t.users.roleAdmin
    if (role === 'comptable') return t.users.roleComptable
    return t.users.roleSecretaire
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    const payload: Record<string, string> = {
      name: form.name.trim(),
      email: form.email.trim(),
    }

    if (form.password) {
      payload.current_password = form.current_password
      payload.password = form.password
      payload.password_confirmation = form.password_confirmation
    }

    try {
      const { data } = await api.put<User>('/me', payload)
      updateUser(data)
      setForm((prev) => ({
        ...prev,
        current_password: '',
        password: '',
        password_confirmation: '',
      }))
      setSuccess(t.profile.success)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const fieldError = response?.errors?.current_password?.[0]
      setError(fieldError ?? response?.message ?? t.profile.error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return <p className="text-muted">{t.common.loading}</p>

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.profile.title} description={t.profile.description} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <UserCircle size={36} />
            </div>
            <div>
              <p className="text-lg font-semibold text-navy-900">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-medium text-white">
                {roleLabel(user.role)}
              </span>
            </div>
          </div>

          <h2 className="mb-4 text-lg font-semibold">{t.profile.accountInfo}</h2>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.common.name}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.auth.email}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.profile.role}</label>
              <input
                value={roleLabel(user.role)}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-border bg-surface px-4 py-3 text-muted"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t.profile.changePassword}</h2>
          <p className="mb-4 text-sm text-muted">{t.profile.passwordHint}</p>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.profile.currentPassword}</label>
              <input
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.profile.newPassword}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-800">{t.profile.confirmPassword}</label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                className="w-full rounded-xl border border-border px-4 py-3"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-teal-700">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? t.profile.saving : t.profile.save}
        </button>
      </form>

      {isAdmin && (
        <p className="mt-6 text-sm text-muted">
          Gestion des autres comptes : page {t.nav.users}.
        </p>
      )}
    </div>
  )
}
