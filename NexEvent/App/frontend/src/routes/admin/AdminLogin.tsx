import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackLink from '../../components/BackLink'
import { api } from '../../lib/api'
import { setToken } from '../../lib/auth'

function resolveErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    try {
      const parsed = JSON.parse(err.message)
      if (parsed?.error) return String(parsed.error)
      if (parsed?.message) return String(parsed.message)
    } catch {
      if (err.message.trim().length) return err.message
    }
  }
  if (typeof err === 'string' && err.trim().length) return err
  return fallback
}

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token, user } = await api.login(email, password)
      if (user.role !== 'ADMIN') throw new Error('Admin access required')
      setToken(token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(resolveErrorMessage(err, 'Unable to sign in with those credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <BackLink className="mb-4" />

      <section className="auth-hero">
        <span className="page-eyebrow">Admin console</span>
        <h1>Secure admin access</h1>
        <p>Manage venues, moderate listings and configure EventStack experiences for your city.</p>
      </section>

      <section className="auth-card surface-card">
        <div className="auth-card__header">
          <h2>Sign in to the admin console</h2>
          <p>Only approved administrators can access these controls.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            <span>Email</span>
            <input
              className="form-input"
              type="email"
              placeholder="admin@eventstack.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => {
                window.location.href = 'mailto:support@eventstack.app?subject=Requesting%20admin%20access'
              }}
            >
              Request admin access
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
