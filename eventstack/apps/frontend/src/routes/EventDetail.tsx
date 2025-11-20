// React hooks for managing state and side effects
import { useEffect, useMemo, useState } from 'react'
// Router hook to get the event ID from the URL
import { useParams } from 'react-router-dom'
// Component for going back to the previous page
import BackLink from '../components/BackLink'
// API functions for talking to the backend
import { api } from '../lib/api'
// Functions for saving bookmarks locally when the server is down
import { addLocalBookmark, getLocalBookmarks, removeLocalBookmark } from '../lib/storage'

// What an event looks like when we get it from the server
type EventDetailData = {
  id: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  categories?: string[]
  venue?: { name?: string; lat?: number; lng?: number }
  images?: Array<{ url: string }>
}

// Makes dates look nice (like "Monday, January 15")
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, options)
}

// Makes times look nice (like "7:30 PM")
const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Makes category names look nice (turns "rock_music" into "Rock Music")
const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function EventDetail() {
  // Get the event ID from the URL
  const { id = '' } = useParams()
  
  // Keep track of the event data we loaded
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load the event when the page first loads
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    api
      .getEvent(id)
      .then(data => {
        setEvent(data)
        // Check if this event is already bookmarked locally
        const local = getLocalBookmarks().some(b => b.id === id)
        setBookmarked(local)
      })
      .catch(() => {
        setEvent(null)
        setError('Unable to load this event right now.')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Format the date and time nicely for display
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

  // Handle bookmarking/unbookmarking the event
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
      // If the server is down, save the bookmark locally instead
      if (bookmarked) {
        removeLocalBookmark(event.id)
        setBookmarked(false)
      } else {
        addLocalBookmark(event.id)
        setBookmarked(true)
      }
    }
  }


  // Handle sharing the event
  const handleShare = async () => {
    if (!event) return
    const shareData = {
      title: event.title,
      text: event.summary ?? 'Check out this event on EventStack',
      url: window.location.href,
    }
    if (navigator.share) {
      // Use the native share dialog if available
      await navigator.share(shareData)
    } else if (navigator.clipboard) {
      // Otherwise just copy the link to clipboard
      await navigator.clipboard.writeText(shareData.url)
      alert('Link copied to clipboard')
    }
  }

  // Handle adding the event to Google Calendar
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


  const handleDirections = () => {
    if (!event?.venue?.name) return
    
   
    const encodedVenue = encodeURIComponent(event.venue.name)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedVenue}`
    window.open(mapsUrl, '_blank', 'noopener')
  }


  // Helper function to make sure image URLs work properly
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'
  const API_HOST = API_BASE.replace(/\/api\/?$/, '')
  const resolveUrl = (u?: string) => {
    if (!u) return ''
    if (u.startsWith('http://') || u.startsWith('https://')) return u
    if (u.startsWith('/')) return `${API_HOST}${u}`
    return u
  }



  // Show error message if we couldn't load the event
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

      {/* Show the main event image */}
      <div className="cover-wrapper" role="img" aria-label={event.title}>
        {((event.coverUrl && resolveUrl(event.coverUrl)) || (event.images && event.images[0]?.url)) ? (
          <img src={resolveUrl(event.coverUrl || event.images?.[0]?.url)} alt={event.title} loading="lazy" />
        ) : (
          <div className="card-img shimmer" aria-hidden="true" />
        )}
      </div>

      {/* Main event information */}
      <section className="stack">
        <div className="stack">
          <span className="eyebrow">{dateMeta.main}</span>
          <h1 className="hero-title">{event.title}</h1>
          <div className="event-meta">
            <div className="event-meta-row">
              <svg className="icon--white" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14zm-6-7h-3v4H8V9h5z" />
              </svg>
              <span>{dateMeta.time}</span>
            </div>
            {event.venue?.name ? (
              <div className="event-meta-row">
                <svg className="icon--white" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z" />
                </svg>
                <span>{event.venue.name}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Show category tags if available */}
        {event.categories?.length ? (
          <div className="tag-row" role="list">
            {event.categories.map(category => (
              <span key={category} className="tag" role="listitem">
                {normalizeCategory(category)}
              </span>
            ))}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={handleBookmark}>
            {bookmarked ? 'Remove bookmark' : 'Bookmark'}
          </button>
          
          <button type="button" className="btn btn-outline" onClick={handleShare}>
            Share
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCalendar}>
            Add to calendar
          </button>
        </div>
      </section>

      {/* Event description section */}
      {event.summary ? (
        <section className="surface">
          <div className="stack">
            <h2>About this experience</h2>
            <p>{event.summary}</p>
          </div>
        </section>
      ) : null}

      {/* Schedule and venue information */}
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

      {/* Event gallery images */}
      {event.images?.length ? (
        <section className="grid">
          {event.images.map((image, index) => (
            <div key={image.url ?? index} className="cover-wrapper">
              <img src={resolveUrl(image.url)} alt={`${event.title} gallery ${index + 1}`} loading="lazy" />
            </div>
          ))}
        </section>
      ) : null}
    </main>
  )
}

