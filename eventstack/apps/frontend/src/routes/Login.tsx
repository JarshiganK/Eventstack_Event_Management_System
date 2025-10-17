import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { setToken } from '../lib/auth'
import BackLink from '../components/BackLink'

export default function Login() {
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
      const { token } = await api.login(email, password)
      setToken(token)
      navigate('/')
    } catch {
      setError('Login failed. Double-check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <BackLink className="mb-4" />
      <section className="auth-hero">
        <h1>Sign in</h1>
        <p>Access your personalised feed, bookings and alerts in one place.</p>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <h2>Welcome back</h2>
          <p>Use the email associated with your EventStack account to log in.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            <span>Email</span>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
