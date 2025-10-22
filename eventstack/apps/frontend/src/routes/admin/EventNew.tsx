import { useEffect, useState, FormEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BackLink from '../../components/BackLink'
import { api } from '../../lib/api'

type VenueSummary = { id: string; name: string }

function normalizeError(err: unknown, fallback: string) {
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

export default function EventNew() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venueId, setVenueId] = useState('')
  const [venues, setVenues] = useState<VenueSummary[]>([])
  const [categoriesCsv, setCategoriesCsv] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()
  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    void api
      .listVenues()
      .then(list => {
        if (active) setVenues(list)
      })
      .catch(() => {
        if (active) setVenues([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
    }
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = { title, summary, startsAt, endsAt, venueId, categoriesCsv }
      await api.createEvent(payload)
      if (file) {
        await api.uploadFile(file)
      }
      setShowConfirm(true)
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
      redirectTimerRef.current = window.setTimeout(() => {
        setShowConfirm(false)
        navigate('/organizer/dashboard')
      }, 1400)
    } catch (err) {
      setError(normalizeError(err, 'Failed to create event. Please review the details and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel() {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
    navigate('/organizer/dashboard')
  }

  return (
    <div className="page admin-create-page">
      <BackLink className="mb-4" fallback="/admin/dashboard" />

      <section className="surface-card admin-create-hero">
        <span className="page-eyebrow">Admin tools</span>
        <h1>Create a new event</h1>
        <p>Share the essentials so organizers and attendees get accurate, trustworthy information.</p>
      </section>

      <section className="surface-card admin-create-form">
        <header className="admin-create-form__header">
          <div>
            <h2>Event details</h2>
            <p>Craft a compelling listing by covering the who, what and when.</p>
          </div>
        </header>

        <form className="form-grid" onSubmit={submit}>
          <label className="form-field">
            <span>Title</span>
            <input
              className="form-input"
              placeholder="Eg. Downtown Jazz Night"
              value={title}
              onChange={event => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Summary</span>
            <textarea
              className="form-input form-input--textarea"
              placeholder="Highlight the experience, lineup or any must-know details."
              value={summary}
              onChange={event => setSummary(event.target.value)}
              rows={4}
            />
          </label>

          <div className="form-grid form-grid--split">
            <label className="form-field">
              <span>Starts at</span>
              <input
                className="form-input"
                type="datetime-local"
                value={startsAt}
                onChange={event => setStartsAt(event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Ends at</span>
              <input
                className="form-input"
                type="datetime-local"
                value={endsAt}
                onChange={event => setEndsAt(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span>Venue</span>
            <select
              className="form-input"
              value={venueId}
              onChange={event => setVenueId(event.target.value)}
              required
            >
              <option value="">Select a venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Categories</span>
            <input
              className="form-input"
              placeholder="Eg. music,jazz,nightlife"
              value={categoriesCsv}
              onChange={event => setCategoriesCsv(event.target.value)}
            />
            <small className="form-hint">Separate multiple categories with commas.</small>
          </label>

          <label className="form-field">
            <span>Cover image</span>
            <input
              className="form-input form-input--file"
              type="file"
              accept="image/*"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
            <small className="form-hint">Images help events stand out. JPG or PNG recommended.</small>
          </label>

          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? 'Creating event...' : 'Create event'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      {showConfirm ? (
        <div className="toast toast--success" role="status" aria-live="polite">
          <span className="toast__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M9.53 15.93 5.6 12l1.4-1.4 2.53 2.52 7.47-7.48 1.4 1.41-8.87 8.88Z" />
            </svg>
          </span>
          <div>
            <strong>Event created</strong>
            <p>We’ll take you back to the dashboard in a moment.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}


