import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import { api } from '../lib/api'
import { addLocalBookmark, getLocalBookmarks, removeLocalBookmark } from '../lib/storage'

type EventDetailData = {
  id: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  categories?: string[]
  venue?: { name?: string }
  images?: Array<{ url: string }>
}

const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, options)
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function EventDetail() {
  const { id = '' } = useParams()
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    api
      .getEvent(id)
      .then(data => {
        setEvent(data)
        const local = getLocalBookmarks().some(b => b.id === id)
        setBookmarked(local)
      })
      .catch(() => {
        setEvent(null)
        setError('Unable to load this event right now.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const dateMeta = useMemo(() => {
    if (!event) return { main: 'Date to be announced', time: 'Time to be announced' }
    const startDate = formatDate(event.startsAt, { weekday: 'long', month: 'long', day: 'numeric' })
    const startTime = formatTime(event.startsAt)
    const endTime = event.endsAt ? formatTime(event.endsAt) : null
    return {
      main: startDate ?? 'Date to be announced',
      time: startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : 'Time to be announced',
    }
  }, [event])

  const handleBookmark = async () => {
    if (!event) return
    try {
      if (bookmarked) {
        await api.removeBookmark(event.id)
        setBookmarked(false)
      } else {
        await api.addBookmark(event.id)
        setBookmarked(true)
      }
    } catch {
      if (bookmarked) {
        removeLocalBookmark(event.id)
        setBookmarked(false)
      } else {
        addLocalBookmark(event.id)
        setBookmarked(true)
      }
    }
  }

  const handleDirections = () => {
    if (!event?.venue?.name) return
    const query = encodeURIComponent([event.venue.name].filter(Boolean).join(' · '))
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener')
  }

  const handleShare = async () => {
    if (!event) return
    const shareData = {
      title: event.title,
      text: event.summary ?? 'Check out this event on EventStack',
      url: window.location.href,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url)
      alert('Link copied to clipboard')
    }
  }

  const handleCalendar = () => {
    if (!event) return
    const start = new Date(event.startsAt).toISOString().replace(/[-:]/g, '').split('.')[0]
    const end = event.endsAt
      ? new Date(event.endsAt).toISOString().replace(/[-:]/g, '').split('.')[0]
      : start
    const text = encodeURIComponent(event.title)
    const details = encodeURIComponent(event.summary ?? '')
    const location = encodeURIComponent(event.venue?.name ?? '')
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
    window.open(calendarUrl, '_blank', 'noopener')
  }

  if (loading) {
    return (
      <main className="page">
        <div className="skeleton-card">
          <div className="skeleton-card__media shimmer" />
          <div className="skeleton-card__line shimmer" />
          <div className="skeleton-card__line shimmer" />
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="page">
        <BackLink className="mb-4" />
        <div className="empty">
          <h3>Event not found</h3>
          <p>{error || 'This event may have been removed or is unavailable.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page stack">
      <BackLink className="mb-4" />

      <div className="cover-wrapper" role="img" aria-label={event.title}>
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={event.title} loading="lazy" />
        ) : (
          <div className="card-img shimmer" aria-hidden="true" />
        )}
      </div>

      <section className="stack">
        <div className="stack">
          <span className="eyebrow">{dateMeta.main}</span>
          <h1 className="hero-title">{event.title}</h1>
          <div className="event-meta">
            <div className="event-meta-row">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14zm-6-7h-3v4H8V9h5z" />
              </svg>
              <span>{dateMeta.time}</span>
            </div>
            {event.venue?.name ? (
              <div className="event-meta-row">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z" />
                </svg>
                <span>{event.venue.name}</span>
              </div>
            ) : null}
          </div>
        </div>

        {event.categories?.length ? (
          <div className="tag-row" role="list">
            {event.categories.map(category => (
              <span key={category} className="tag" role="listitem">
                {normalizeCategory(category)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={handleBookmark}>
            {bookmarked ? 'Remove bookmark' : 'Bookmark'}
          </button>
          <button type="button" className="btn btn-tonal" onClick={handleDirections}>
            Directions
          </button>
          <button type="button" className="btn btn-outline" onClick={handleShare}>
            Share
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCalendar}>
            Add to calendar
          </button>
        </div>
      </section>

      {event.summary ? (
        <section className="surface">
          <div className="stack">
            <h2>About this experience</h2>
            <p>{event.summary}</p>
          </div>
        </section>
      ) : null}

      <section className="grid">
        <div className="surface">
          <div className="stack">
            <h3>Schedule</h3>
            <div className="meta">
              <span>Starts: {formatDate(event.startsAt) ?? 'TBA'}</span>
              <span>Doors open: {formatTime(event.startsAt) ?? 'TBA'}</span>
              <span>Ends: {event.endsAt ? formatTime(event.endsAt) ?? 'TBA' : 'To be announced'}</span>
            </div>
          </div>
        </div>
        <div className="surface">
          <div className="stack">
            <h3>Venue</h3>
            <div className="meta">
              <span>{event.venue?.name ?? 'To be announced'}</span>
              {/* zone/subzone removed */}
            </div>
          </div>
        </div>
      </section>

      {event.images?.length ? (
        <section className="grid">
          {event.images.map((image, index) => (
            <div key={image.url ?? index} className="cover-wrapper">
              <img src={image.url} alt={`${event.title} gallery ${index + 1}`} loading="lazy" />
            </div>
          ))}
        </section>
      ) : null}
    </main>
  )
}

