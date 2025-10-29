# EventDetail.tsx Documentation

## File Location
`apps/frontend/src/routes/EventDetail.tsx`

## Overview
The EventDetail component displays full information about a single event, including images, description, venue details, and action buttons for bookmarking, sharing, and adding to calendar.

## Imports

```typescript
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
```

## Type Definitions

### EventDetailData
```typescript
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
```
- Complete structure of event data from API
- Includes optional fields for flexibility
- venue object includes coordinates for mapping

## Utility Functions

### formatDate
```typescript
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, options)
}
```
- **Purpose**: Formats date strings for display
- **Input**: ISO date string, optional format options
- **Output**: Formatted date string or null if invalid
- **Example**: "2024-01-15T19:30:00Z" → "Monday, January 15"

### formatTime
```typescript
const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
```
- **Purpose**: Formats time for display
- **Output**: Time string like "7:30 PM"
- **Format**: 12-hour format with AM/PM

### normalizeCategory
```typescript
const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
```
- **Purpose**: Converts category names to Title Case
- **Example**: "rock_music" → "Rock Music"
- **Used for**: Displaying category tags

## State Variables

### event
```typescript
const [event, setEvent] = useState<EventDetailData | null>(null)
```
- Stores the event data loaded from API
- null when no event is loaded or failed to load

### bookmarked
```typescript
const [bookmarked, setBookmarked] = useState(false)
```
- Tracks if current event is bookmarked
- Affects button text and behavior

### loading
```typescript
const [loading, setLoading] = useState(true)
```
- Indicates loading state while fetching event

### error
```typescript
const [error, setError] = useState('')
```
- Stores error message if event fails to load

## useEffect Hook

### Load Event on Mount
```typescript
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
```
- **Runs when**: Component mounts or id changes
- **What it does**: 
  - Fetches event data from API
  - Checks if event is bookmarked locally
  - Handles errors gracefully
  - Updates loading state

## Computed Values (useMemo)

### dateMeta
```typescript
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
```
- **Purpose**: Formats date and time for display
- **Output**: 
  - `main`: Full date (e.g., "Monday, January 15")
  - `time`: Time range or single time
- **Optimization**: Only recomputes when event changes

## Event Handlers

### handleBookmark
```typescript
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
```
- **Purpose**: Toggle bookmark status
- **Flow**:
  1. Try server API call
  2. If fails, use localStorage as fallback
- **Error handling**: Gracefully falls back to local storage

### handleShare
```typescript
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
```
- **Purpose**: Share event with others
- **Methods**:
  - Native share dialog (mobile/web)
  - Clipboard copy (fallback)
- **Data**: Title, description, and URL

### handleCalendar
```typescript
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
```
- **Purpose**: Add event to Google Calendar
- **URL Format**: Google Calendar template URL
- **Parameters**:
  - `action=TEMPLATE`: Open event creation
  - `text`: Event title
  - `dates`: Start/end dates
  - `details`: Event description
  - `location`: Venue name

### handleDirections
```typescript
const handleDirections = () => {
  if (!event?.venue?.name) return
  
  // Search by venue name in Google Maps
  const encodedVenue = encodeURIComponent(event.venue.name)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedVenue}`
  window.open(mapsUrl, '_blank', 'noopener')
}
```
- **Purpose**: Open Google Maps with venue directions
- **URL Format**: Google Maps search URL
- **Parameters**:
  - `api=1`: Use Maps API
  - `query`: Search term (venue name)
- **Security**: Uses noopener to prevent tabnabbing

## Image URL Resolution

```typescript
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'
const API_HOST = API_BASE.replace(/\/api\/?$/, '')
const resolveUrl = (u?: string) => {
  if (!u) return ''
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) return `${API_HOST}${u}`
  return u
}
```
- **Purpose**: Resolve relative image URLs to absolute URLs
- **Behavior**:
  - Already absolute: returns as-is
  - Starts with `/`: prepends API host
  - Empty/null: returns empty string

## Render Logic

### Loading State
```typescript
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
```
- **Shows**: Skeleton loading UI
- **Prevents**: Layout shift during load

### Error State
```typescript
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
```
- **Shows**: Error message and back button
- **User experience**: Can navigate back

## UI Sections

### Main Event Image
- Shows cover image or first gallery image
- Fallback to shimmer loading
- Lazy loading for performance

### Event Information
- Title and category badges
- Date and time display
- Venue location with icon
- Category tags (formatted)

### Action Buttons
- Bookmark/Remove bookmark
- Directions (if venue exists)
- Share event
- Add to calendar

### Event Description
- Optional summary section
- Full event details

### Schedule and Venue
- Two-column grid layout
- Schedule: start time, end time
- Venue: venue name display

### Gallery
- Optional image gallery
- Grid layout for multiple images
- Lazy loading for all images

## Key Features

1. **Progressive Enhancement**: Graceful degradation when data missing
2. **Error Handling**: User-friendly error messages
3. **Offline Support**: Local bookmark fallback
4. **Image Loading**: Lazy loading and URL resolution
5. **Social Sharing**: Native share + clipboard fallback
6. **Calendar Integration**: Direct Google Calendar links
7. **Navigation**: Google Maps directions integration
8. **Responsive Design**: Works on all screen sizes

## Best Practices

1. **Loading States**: Shows skeletons during load
2. **Error States**: Provides helpful error messages
3. **Empty States**: Handles missing data gracefully
4. **Accessibility**: Proper ARIA labels
5. **Performance**: Lazy loading for images
6. **Security**: noopener for external links
7. **Fallbacks**: Multiple fallback mechanisms for features

## URL Format Examples

### Google Calendar
```
https://www.google.com/calendar/render?
  action=TEMPLATE&
  text=Event+Title&
  dates=20240115T193000/20240115T210000&
  details=Event+description&
  location=Venue+Name
```

### Google Maps
```
https://www.google.com/maps/search/?api=1&query=Venue+Name
```

