import { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import BackLink from "../../components/BackLink"
import { api } from "../../lib/api"

type EventDetail = {
  id: string
  title: string
  summary?: string
  startsAt: string
  endsAt: string
  categories?: string[]
  venue?: { name?: string }
  images?: Array<{ url: string }>
}

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
  if (typeof err === "string" && err.trim().length) return err
  return fallback
}

function toInputDateValue(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const tzOffset = date.getTimezoneOffset() * 60000
  const local = new Date(date.getTime() - tzOffset)
  return local.toISOString().slice(0, 16)
}

export default function EventEdit() {
  const { id = "" } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [event, setEvent] = useState<EventDetail | null>(null)

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [venueName, setVenueName] = useState("")
  const [categoriesCsv, setCategoriesCsv] = useState("")
  const [currentCoverUrl, setCurrentCoverUrl] = useState("")
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    setError("")

    async function load() {
      try {
        const eventDetail = await api.getEvent(id)
        if (!active) return
        setEvent(eventDetail)
        setTitle(eventDetail.title ?? "")
        setSummary(eventDetail.summary ?? "")
        setStartsAt(toInputDateValue(eventDetail.startsAt))
        setEndsAt(toInputDateValue(eventDetail.endsAt))
        setVenueName(eventDetail.venue?.name ?? "")
        setCategoriesCsv((eventDetail.categories ?? []).join(","))
        setCurrentCoverUrl(eventDetail.images?.[0]?.url ?? "")
      } catch (err) {
        if (!active) return
        setLoadError(normalizeError(err, "We could not load this event. It may have been removed."))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(next: File | null) {
    setNewCoverFile(next)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(next ? URL.createObjectURL(next) : "")
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    if (!venueName.trim()) {
      setError("Please add a venue name before saving.")
      return
    }

    setError("")
    setSubmitting(true)
    try {
      await api.updateEvent(id, {
        title,
        summary,
        startsAt,
        endsAt,
        venueName: venueName.trim(),
        categoriesCsv,
      })

      if (newCoverFile) {
        try {
          const { url } = await api.uploadFile(newCoverFile)
          if (url) {
            await api.addEventImage(id, { url })
            setCurrentCoverUrl(url)
          }
        } catch (uploadErr) {
          setError(
            normalizeError(
              uploadErr,
              "Changes saved, but we could not upload the new image. You can retry from the edit screen."
            )
          )
        } finally {
          handleFileChange(null)
        }
      }

      setShowConfirm(true)
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
      redirectTimerRef.current = window.setTimeout(() => {
        setShowConfirm(false)
        navigate(`/event/${id}`)
      }, 1400)
    } catch (err) {
      setError(normalizeError(err, "We could not save the changes. Please review the details and try again."))
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel() {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
    navigate(-1)
  }

  if (loading) {
    return (
      <div className="page admin-create-page">
        <BackLink className="mb-4" fallback="/admin/dashboard" />
        <div className="loading" role="status" aria-live="polite">
          Loading event...
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page admin-create-page">
        <BackLink className="mb-4" fallback="/admin/dashboard" />
        <section className="surface-card">
          <h2>Unable to load event</h2>
          <p>{loadError}</p>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/dashboard')}>
              Back to dashboard
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page admin-create-page">
        <BackLink className="mb-4" fallback="/admin/dashboard" />
        <section className="surface-card">
          <h2>Event not found</h2>
          <p>We could not locate the event you are trying to edit.</p>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/dashboard')}>
              Back to dashboard
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page admin-create-page">
      <BackLink className="mb-4" fallback="/admin/dashboard" />

      <section className="surface-card admin-create-hero">
        <span className="page-eyebrow">Admin tools</span>
        <h1>Edit event</h1>
        <p>Update the event details, adjust scheduling and keep visuals fresh to drive attendance.</p>
      </section>

      <section className="surface-card admin-create-form">
        <header className="admin-create-form__header">
          <div>
            <h2>Event details</h2>
            <p>All changes are applied immediately after you save.</p>
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
            <input
              className="form-input"
              placeholder="Eg. Grand Hall"
              value={venueName}
              onChange={event => setVenueName(event.target.value)}
              required
            />
            <small className="form-hint">This appears on listings and search.</small>
          </label>

          <label className="form-field">
            <span>Categories</span>
            <input
              className="form-input"
              placeholder="Eg. music,jazz,nightlife"
              value={categoriesCsv}
              onChange={event => setCategoriesCsv(event.target.value)}
            />
            <small className="form-hint">Separate categories with commas to keep filters tidy.</small>
          </label>

          <div className="media-upload">
            <div className="media-upload__preview" aria-label="Current cover image">
              {previewUrl ? (
                <img src={previewUrl} alt="New cover preview" />
              ) : currentCoverUrl ? (
                <img src={currentCoverUrl} alt={`${title} cover`} />
              ) : (
                <div className="media-upload__placeholder">No cover image yet</div>
              )}
            </div>
            <div className="media-upload__meta">
              <label className="form-field">
                <span>Replace cover image</span>
                <input
                  className="form-input form-input--file"
                  type="file"
                  accept="image/*"
                  onChange={event => handleFileChange(event.target.files?.[0] ?? null)}
                />
                <small className="form-hint">High resolution JPG or PNG recommended.</small>
              </label>
              {previewUrl ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleFileChange(null)}>
                  Remove selected image
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="error-banner" role="alert">
              {error}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? 'Saving changes...' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </section>

      {showConfirm ? (
        <div className="toast toast--success" role="status" aria-live="polite">
          <span className="toast__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="m9.27 16.27-3.78-3.78 1.41-1.41 2.37 2.37 7.07-7.07 1.41 1.41-8.48 8.48Z" />
            </svg>
          </span>
          <div>
            <strong>Changes saved</strong>
            <p>We'll take you back to the event view in a moment.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
