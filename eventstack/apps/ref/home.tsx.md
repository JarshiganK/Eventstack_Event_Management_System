# Home.tsx Documentation

## File Location
`apps/frontend/src/routes/Home.tsx`

## Overview
The Home component is the main landing page of the EventStack application. It displays a list of events with filtering, searching, and browsing capabilities.

## Imports

```typescript
// React hooks for managing state and side effects
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Router components for navigation and URL handling
import { Link, useSearchParams } from 'react-router-dom'
// Component for displaying individual event cards
import EventCard from '../components/EventCard'
// API functions for talking to the backend
import { api } from '../lib/api'
// Custom hook to wait a bit before doing something (like search)
import { useDebounce } from '../lib/debounce'
// Functions for showing/hiding category filters
import { HOME_CATEGORY_FILTERS_VISIBILITY, getHomeCategoryFiltersVisible } from '../lib/homeFiltersVisibility'
```

## Type Definitions

### EventSummary
```typescript
type EventSummary = {
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
```
- Represents the structure of event data returned from the API
- All fields except `title` and `startsAt` are optional

## Constants

### HOME_SEARCH_ID
```typescript
const HOME_SEARCH_ID = 'home-search'
```
- DOM ID for the search section, used to scroll to it programmatically

### ALL
```typescript
const ALL = 'ALL'
```
- Special category value to show all events (no filtering)

### normalizeCategory
```typescript
const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
```
- Converts category names from snake_case or kebab-case to Title Case
- Example: "rock_music" → "Rock Music"

## State Variables

### events
```typescript
const [events, setEvents] = useState<EventSummary[]>([])
```
- Stores all events loaded from the server

### loading
```typescript
const [loading, setLoading] = useState(true)
```
- Indicates if events are being loaded from the server

### activeCategory
```typescript
const [activeCategory, setActiveCategory] = useState<string>(ALL)
```
- Currently selected category for filtering (ALL shows all events)

### showCategoryFilters
```typescript
const [showCategoryFilters, setShowCategoryFilters] = useState(() => getHomeCategoryFiltersVisible())
```
- Controls visibility of category filter chips

### searchParams
```typescript
const [searchParams, setSearchParams] = useSearchParams()
```
- Manages URL search parameters (e.g., ?search=1)

### searchValue
```typescript
const [searchValue, setSearchValue] = useState('')
```
- User's search input text

### searchResults
```typescript
const [searchResults, setSearchResults] = useState<EventSummary[]>([])
```
- Results returned from search API

### searchLoading
```typescript
const [searchLoading, setSearchLoading] = useState(false)
```
- Indicates if search is in progress

### searchError
```typescript
const [searchError, setSearchError] = useState('')
```
- Stores error message if search fails

### searchInputRef
```typescript
const searchInputRef = useRef<HTMLInputElement>(null)
```
- Reference to search input for programmatic focus

## useEffect Hooks

### Load Events on Mount
```typescript
useEffect(() => {
  setLoading(true)
  api
    .listEvents()
    .then(setEvents)
    .catch(() => setEvents([]))
    .finally(() => setLoading(false))
}, [])
```
- Loads all events when component first renders
- Gracefully handles errors by showing empty list

### Handle Search URL Parameter
```typescript
useEffect(() => {
  if (searchParams.has('search')) {
    searchInputRef.current?.focus({ preventScroll: true })
    document.getElementById(HOME_SEARCH_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, [searchParams])
```
- If URL has `?search=1`, focuses search box and scrolls to search section

### Listen for Category Filter Visibility Changes
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return
  const handleVisibilityEvent = (event: Event) => { /* ... */ }
  const handleStorage = (event: StorageEvent) => { /* ... */ }
  window.addEventListener(HOME_CATEGORY_FILTERS_VISIBILITY.EVENT, handleVisibilityEvent)
  window.addEventListener('storage', handleStorage)
  return () => { /* cleanup */ }
}, [])
```
- Listens for when other components want to show/hide category filters
- Also listens for localStorage changes (for multi-tab support)

### Reset Category When Filters Hidden
```typescript
useEffect(() => {
  if (!showCategoryFilters) {
    setActiveCategory(ALL)
  }
}, [showCategoryFilters])
```
- Automatically resets to "All vibes" when filters are hidden

## Computed Values (useMemo)

### categories
```typescript
const categories = useMemo(() => {
  const set = new Set<string>()
  events.forEach(event => {
    event.categories?.forEach(category => {
      if (category.trim()) set.add(category)
    })
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}, [events])
```
- Extracts unique categories from all events
- Returns them sorted alphabetically

### filteredEvents
```typescript
const filteredEvents = useMemo(() => {
  if (activeCategory === ALL) return events
  return events.filter(event => event.categories?.includes(activeCategory))
}, [activeCategory, events])
```
- Filters events based on selected category
- Returns all events if "ALL" is selected

### stats
```typescript
const stats = useMemo(() => {
  const now = Date.now()
  const total = filteredEvents.length
  const upcoming = filteredEvents.filter(event => {
    const start = new Date(event.startsAt).getTime()
    return !Number.isNaN(start) && start > now
  }).length
  return { total, upcoming }
}, [filteredEvents])
```
- Counts total events and upcoming events (events in the future)
- Used to display statistics in hero section

## Functions

### runSearch
```typescript
const runSearch = useCallback(async (query: string) => {
  const term = query.trim()
  if (!term) {
    setSearchResults([])
    setSearchError('')
    setSearchLoading(false)
    return
  }
  setSearchLoading(true)
  try {
    const res = await api.search(term)
    setSearchResults(res.results ?? [])
    setSearchError('')
  } catch {
    setSearchResults([])
    setSearchError("We couldn't search right now. Please try again.")
  } finally {
    setSearchLoading(false)
  }
}, [])
```
- Performs search API call
- Handles errors gracefully
- Clears search if query is empty

### handleSubmitSearch
```typescript
const handleSubmitSearch = useCallback((event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  runSearch(searchValue)
  setSearchParams(params => {
    const next = new URLSearchParams(params)
    if (searchValue.trim()) {
      next.set('search', '1')
    } else {
      next.delete('search')
    }
    return next
  })
}, [runSearch, searchValue, setSearchParams])
```
- Handles search form submission
- Updates URL with search parameter
- Prevents form default submission

## Search Debouncing
```typescript
useDebounce(searchValue, 320, runSearch)
```
- Waits 320ms after user stops typing before searching
- Prevents excessive API calls while typing

## UI Structure

### Hero Section
- Main headline and description
- Live statistics (total events, upcoming events)
- Call-to-action buttons (List your event, Admin access)

### Category Filters Section
- Browse by vibe heading
- Category filter chips (only shown if enabled)
- "All vibes" button to clear filter

### Search Section
- Search input field
- Search button
- Search results display
- Error messages if search fails
- Loading skeletons while searching

### Events List Section
- Grid of event cards
- Shows filtered events
- Loading skeletons while loading
- Empty state message if no events

## Key Features

1. **Category Filtering**: Users can filter events by category
2. **Real-time Search**: Search with debouncing to prevent excessive API calls
3. **Error Handling**: Graceful error handling for failed API calls
4. **Loading States**: Shows skeleton loaders while data is loading
5. **Empty States**: Helpful messages when no events match filters
6. **URL Integration**: Search state is reflected in URL parameters
7. **Accessibility**: Proper ARIA labels and live regions

## Best Practices

- Uses `useMemo` for expensive computations
- Uses `useCallback` for stable function references
- Implements debouncing for search to reduce API calls
- Handles loading and error states gracefully
- Provides accessible UI with ARIA labels
- Uses conditional rendering for better UX

