import { Link } from 'react-router-dom'

type EventCardProps = {
  event: {
    id?: string
    title: string
    summary?: string
    startsAt: string
    endsAt?: string
    coverUrl?: string
    images?: Array<{ url: string }>
    categories?: string[]
  venue?: { name?: string }
  }
}

const formatDateRange = (startsAt: string, endsAt?: string) => {
  const startDate = new Date(startsAt)
  if (Number.isNaN(startDate.getTime())) return 'Date to be announced'

  const startDay = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (!endsAt) return `${startDay} · ${startTime}`

  const endDate = new Date(endsAt)
  if (Number.isNaN(endDate.getTime())) return `${startDay} · ${startTime}`
  const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${startDay} · ${startTime} – ${endTime}`
}

const formatCategoryLabel = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const EventCardInner = ({ event }: EventCardProps) => {
  const artwork = event.coverUrl || event.images?.[0]?.url || ''
  // Resolve backend-hosted uploads (paths like '/uploads/xxx') to full URLs
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'
  const API_HOST = API_BASE.replace(/\/api\/?$/, '')
  const resolveUrl = (u?: string) => {
    if (!u) return ''
    if (u.startsWith('http://') || u.startsWith('https://')) return u
    if (u.startsWith('/')) return `${API_HOST}${u}`
    return u
  }
  const artworkSrc = resolveUrl(artwork)
  const primaryCategory = event.categories?.[0]
  const schedule = formatDateRange(event.startsAt, event.endsAt)
  const venueLabel = [event.venue?.name].filter(Boolean).join(' · ')

  return (
    <>
      <div className="event-card__cover">
        {artworkSrc ? (
          <img src={artworkSrc} alt={event.title} className="card-img" loading="lazy" />
        ) : (
          <div className="card-img shimmer" aria-hidden="true" />
        )}
        <div className="event-card__fade" aria-hidden="true" />
        {primaryCategory ? (
          <span className="event-card__category">{formatCategoryLabel(primaryCategory)}</span>
        ) : null}
        <span className="event-card__date">{schedule}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{event.title}</h3>
        <div className="meta">
          {venueLabel ? (
            <span className="meta-row">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z" />
              </svg>
              {venueLabel}
            </span>
          ) : null}
        </div>
        {event.summary ? <p className="event-card__summary">{event.summary}</p> : null}
      </div>
    </>
  )
}

export default function EventCard({ event }: EventCardProps) {
  if (!event.id) {
    return (
      <article className="card event-card event-card--disabled" aria-disabled="true">
        <EventCardInner event={event} />
      </article>
    )
  }

  return (
    <Link to={`/event/${event.id}`} className="event-card-link" aria-label={event.title}>
      <article className="card event-card">
        <EventCardInner event={event} />
      </article>
    </Link>
  )
}

