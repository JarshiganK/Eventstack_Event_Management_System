import React, { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { setToken } from '../lib/auth'
import BackLink from '../components/BackLink'

type AccountRole = 'USER' | 'ORGANIZER'
type KnownRole = AccountRole | 'ADMIN'

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

function destinationForRole(role: KnownRole) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'ORGANIZER') return '/organizer/dashboard'
  return '/'
}

const AttendeeIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.75 0-7 2-7 4.5V20h14v-1.5c0-2.5-3.25-4.5-7-4.5Z" />
  </svg>
)

const OrganizerIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2Zm12 8H5v8h14Zm-6 2h4v4h-4Z" />
  </svg>
)

const CheckIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m9.27 16.27-3.78-3.78 1.41-1.41 2.37 2.37 7.07-7.07 1.41 1.41-8.48 8.48Z" />
  </svg>
)

const ROLE_OPTIONS: Array<{
  value: AccountRole
  label: string
  description: string
  icon: React.ReactElement
  className: string
}> = [
  {
    value: 'USER',
    label: 'Attendee',
    description: 'Discover events, bookmark favourites and get timely alerts.',
    icon: AttendeeIcon,
    className: 'role-option--user',
  },
  {
    value: 'ORGANIZER',
    label: 'Organizer',
    description: 'Create listings, manage schedules and access organizer dashboards.',
    icon: OrganizerIcon,
    className: 'role-option--organizer',
  },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupMode, setSignupMode] = useState(false)
  const [role, setRole] = useState<AccountRole>('USER')
  const navigate = useNavigate()

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (signupMode) {
        const { token, user } = await api.register(email, password, role)
        setToken(token)
        navigate(destinationForRole(user.role as KnownRole))
      } else {
        const { token, user } = await api.login(email, password)
        setToken(token)
        navigate(destinationForRole(user.role as KnownRole))
      }
    } catch (err) {
      const fallback = signupMode
        ? 'We could not create your account right now. Please try again.'
        : 'Login failed. Double-check your details and try again.'
      setError(resolveErrorMessage(err, fallback))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <BackLink className="mb-4" />
      <section className="auth-hero">
        <h1>{signupMode ? 'Create your EventStack account' : 'Sign in'}</h1>
        <p>
          {signupMode
            ? 'Pick the role that matches how you plan to use EventStack and get started in minutes.'
            : 'Access your personalised feed, bookings and alerts in one place.'}
        </p>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <h2>{signupMode ? "Let's get you set up" : 'Welcome back'}</h2>
          <p>
            {signupMode
              ? 'Use a work or personal email. You can switch to organizer tools anytime.'
              : 'Use the email associated with your EventStack account to log in.'}
          </p>
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
              autoComplete={signupMode ? 'new-password' : 'current-password'}
            />
          </label>
          {signupMode ? (
            <fieldset className="form-field role-toggle">
              <legend>Account role</legend>
              <div className="role-toggle__options">
                {ROLE_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`role-option ${option.className}${role === option.value ? ' role-option--active' : ''}`}
                  >
                    <input
                      className="role-option__input"
                      type="radio"
                      name="account-role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                    />
                    <span className="role-option__icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="role-option__body">
                      <span className="role-option__label">{option.label}</span>
                      <span className="role-option__hint">{option.description}</span>
                    </span>
                    <span className="role-option__check" aria-hidden="true">
                      {CheckIcon}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? (signupMode ? 'Creating account...' : 'Signing in...') : signupMode ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => {
                setSignupMode(current => !current)
                setError('')
              }}
            >
              {signupMode ? 'Have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
