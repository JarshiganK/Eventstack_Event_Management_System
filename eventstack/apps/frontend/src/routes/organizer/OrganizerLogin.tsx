import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { fetchRole, setToken, type KnownRole } from '../../lib/auth'
import BackLink from '../../components/BackLink'

export default function OrganizerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupMode, setSignupMode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const role = await fetchRole()
      if (!mounted) return
      if (role === 'ADMIN' || role === 'ORGANIZER') navigate('/organizer/dashboard')
    })()
    return () => {
      mounted = false
    }
  }, [navigate])

  function resolveErrorMessage(err: unknown, fallback: string) {
    if (err instanceof Error && err.message) {
      try {
        const parsed = JSON.parse(err.message)
        if (parsed?.message) return parsed.message as string
        if (parsed?.error) return String(parsed.error)
      } catch {
        if (err.message.trim().length) return err.message
      }
    }
    if (typeof err === 'string' && err.trim().length) return err
    return fallback
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let userRole: KnownRole
      if (signupMode) {
        const { token, user } = await api.register(email, password, 'ORGANIZER')
        userRole = user.role as KnownRole
        if (userRole !== 'ORGANIZER') throw new Error('Organizer account could not be created')
        setToken(token)
      } else {
        const { token, user } = await api.login(email, password)
        userRole = user.role as KnownRole
        if (userRole !== 'ADMIN' && userRole !== 'ORGANIZER') throw new Error('Not organizer')
        setToken(token)
      }
      navigate('/organizer/dashboard')
    } catch (err) {
      const fallback = signupMode
        ? 'Organizer signup failed. Please try again.'
        : 'Organizer login failed. Check your details.'
      setError(resolveErrorMessage(err, fallback))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <BackLink className="mb-4" />
      <section className="auth-hero">
        <h1>Organizer access</h1>
        <p>
          Manage your event listings, track performance and go live in minutes. Sign in or create your organizer
          workspace.
        </p>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <h2>{signupMode ? 'Create an organizer account' : 'Welcome back'}</h2>
          <p>{signupMode ? 'We just need your work email and a password to get started.' : 'Sign in to access the organizer dashboard.'}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            <span>Email</span>
            <input
              className="form-input"
              type="email"
              placeholder="name@company.com"
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
              placeholder="Enter a secure password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={signupMode ? 'new-password' : 'current-password'}
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Please wait...' : signupMode ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => {
                setSignupMode(current => !current)
                setError('')
              }}
            >
              {signupMode ? 'Already have access? Log in' : 'Need access? Create account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
