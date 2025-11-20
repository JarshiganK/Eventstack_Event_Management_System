# api.ts Documentation

## File Location
`apps/frontend/src/lib/api.ts`

## Overview
The api.ts file provides a centralized API client for making HTTP requests to the EventStack backend. It includes all necessary functions for interacting with the backend API, including authentication, event management, bookmarks, searches, and more.

## Key Responsibilities
- Centralized API configuration
- JWT token management
- HTTP request handling
- Error handling for network requests
- Type-safe API responses

## Base URL Configuration

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
```
- **Environment Variable**: `VITE_API_BASE`
- **Default**: `http://localhost:4000/api` (for development)
- **Usage**: All API calls use this base URL

## Base URL Utility Function

```typescript
const baseUrl = (path: string) => {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  return url
}
```
- **Purpose**: Constructs full API URLs
- **Parameters**: 
  - `path`: API endpoint path
- **Behavior**:
  - Adds leading slash if missing
  - Prepends base URL
- **Example**: `baseUrl('events')` → `'http://localhost:4000/api/events'`

## JWT Token Storage

### Storing Token
```typescript
export function setToken(token: string) {
  localStorage.setItem('token', token)
}
```
- **Purpose**: Saves authentication token to localStorage
- **Storage Key**: `'token'`
- **Persistence**: Token persists across browser sessions

### Retrieving Token
```typescript
export function getToken() {
  return localStorage.getItem('token') ?? ''
}
```
- **Purpose**: Gets authentication token from localStorage
- **Return**: Token string or empty string if not found
- **Fallback**: Returns empty string instead of null

### Removing Token
```typescript
export function removeToken() {
  localStorage.removeItem('token')
}
```
- **Purpose**: Removes authentication token (logout)
- **Usage**: Called when user logs out

## HTTP Request Functions

### makeRequest (Generic HTTP Handler)
```typescript
async function makeRequest<T>(
  url: string,
  options?: RequestInit,
  signal?: AbortSignal
): Promise<T>
```
- **Purpose**: Generic function for all API requests
- **Features**:
  - Adds JWT token to headers
  - Handles JSON parsing
  - Error handling
  - Response validation

### Implementation Details
```typescript
async function makeRequest<T>(
  url: string,
  options?: RequestInit,
  signal?: AbortSignal
): Promise<T> {
  // Get token
  const token = getToken()
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }
  
  // Add authorization if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
    signal,
  })
  
  // Check if response is ok
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  // Parse and return JSON
  return response.json()
}
```

## API Endpoints

### Authentication

#### login
```typescript
export async function login(email: string, password: string) {
  return makeRequest<LoginResponse>(baseUrl('login'), {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
```
- **Method**: POST
- **Endpoint**: `/api/login`
- **Request Body**: `{ email, password }`
- **Response**: Login credentials and token
- **Usage**: User authentication

#### register
```typescript
export async function register(email: string, password: string, role: 'USER' | 'ORGANIZER') {
  return makeRequest<RegisterResponse>(baseUrl('register'), {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  })
}
```
- **Method**: POST
- **Endpoint**: `/api/register`
- **Request Body**: `{ email, password, role }`
- **Response**: Registration success
- **Usage**: New user registration

### Events

#### listEvents
```typescript
export async function listEvents(filters?: EventFilters) {
  const params = new URLSearchParams()
  if (filters?.from) params.append('from', filters.from)
  if (filters?.to) params.append('to', filters.to)
  if (filters?.category) params.append('category', filters.category)
  
  const queryString = params.toString()
  return makeRequest<EventSummary[]>(baseUrl(`events?${queryString}`))
}
```
- **Method**: GET
- **Endpoint**: `/api/events`
- **Query Parameters**:
  - `from`: Start date filter
  - `to`: End date filter
  - `category`: Category filter
- **Response**: Array of event summaries
- **Usage**: List/filter events

#### getEvent
```typescript
export async function getEvent(id: string) {
  return makeRequest<EventDetail>(baseUrl(`events/${id}`))
}
```
- **Method**: GET
- **Endpoint**: `/api/events/:id`
- **Response**: Full event details
- **Usage**: Get single event details

#### createEvent
```typescript
export async function createEvent(eventData: CreateEventData) {
  return makeRequest<Event>(baseUrl('events'), {
    method: 'POST',
    body: JSON.stringify(eventData),
  })
}
```
- **Method**: POST
- **Endpoint**: `/api/events`
- **Request Body**: Event data object
- **Response**: Created event
- **Usage**: Create new event

#### updateEvent
```typescript
export async function updateEvent(id: string, eventData: UpdateEventData) {
  return makeRequest<Event>(baseUrl(`events/${id}`), {
    method: 'PUT',
    body: JSON.stringify(eventData),
  })
}
```
- **Method**: PUT
- **Endpoint**: `/api/events/:id`
- **Request Body**: Updated event data
- **Response**: Updated event
- **Usage**: Update existing event

#### deleteEvent
```typescript
export async function deleteEvent(id: string) {
  return makeRequest<void>(baseUrl(`events/${id}`), {
    method: 'DELETE',
  })
}
```
- **Method**: DELETE
- **Endpoint**: `/api/events/:id`
- **Response**: void
- **Usage**: Delete event

### Bookmarks

#### addBookmark
```typescript
export async function addBookmark(eventId: string) {
  return makeRequest<{ success: boolean }>(baseUrl(`bookmarks/${eventId}`), {
    method: 'POST',
  })
}
```
- **Method**: POST
- **Endpoint**: `/api/bookmarks/:eventId`
- **Response**: Success status
- **Usage**: Bookmark an event

#### removeBookmark
```typescript
export async function removeBookmark(eventId: string) {
  return makeRequest<{ success: boolean }>(baseUrl(`bookmarks/${eventId}`), {
    method: 'DELETE',
  })
}
```
- **Method**: DELETE
- **Endpoint**: `/api/bookmarks/:eventId`
- **Response**: Success status
- **Usage**: Remove bookmark

#### getBookmarks
```typescript
export async function getBookmarks() {
  return makeRequest<EventSummary[]>(baseUrl('bookmarks'))
}
```
- **Method**: GET
- **Endpoint**: `/api/bookmarks`
- **Response**: Array of bookmarked events
- **Usage**: Get user's bookmarks

### Search

#### search
```typescript
export async function search(query: string, filters?: SearchFilters) {
  const params = new URLSearchParams()
  params.append('query', query)
  if (filters?.category) params.append('category', filters.category)
  
  const queryString = params.toString()
  return makeRequest<SearchResults>(baseUrl(`search?${queryString}`))
}
```
- **Method**: GET
- **Endpoint**: `/api/search`
- **Query Parameters**:
  - `query`: Search term (required)
  - `category`: Optional category filter
- **Response**: Search results
- **Usage**: Search events

### Uploads

#### uploadFile
```typescript
export async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData()
  formData.append('file', file)
  
  const xhr = new XMLHttpRequest()
  return new Promise<string>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).url)
      } else {
        reject(new Error('Upload failed'))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    
    const token = getToken()
    xhr.open('POST', baseUrl('uploads'))
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}
```
- **Method**: POST (multipart/form-data)
- **Endpoint**: `/api/uploads`
- **Request**: FormData with file
- **Response**: File URL
- **Features**:
  - Progress tracking callback
  - XHR for upload progress
  - Automatic token inclusion
- **Usage**: Upload event images

## API Object Export

```typescript
export const api = {
  // Authentication
  login,
  register,
  
  // Events
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  
  // Bookmarks
  addBookmark,
  removeBookmark,
  getBookmarks,
  
  // Search
  search,
  
  // Uploads
  uploadFile,
  
  // Token management
  getToken,
  setToken,
  removeToken,
}
```
- **Purpose**: Provides centralized API access
- **Usage**: `import { api } from '../lib/api'`
- **Benefits**: Single import, consistent interface

## Error Handling

All API functions use `makeRequest` which:
1. Catches network errors
2. Handles HTTP error status codes
3. Provides error messages
4. Throws errors for component handling

## Type Definitions

```typescript
type LoginResponse = { token: string; user: User }
type RegisterResponse = { success: boolean; token: string; user: User }
type EventSummary = { id: string; title: string; startsAt: string; /* ... */ }
type EventDetail = EventSummary & { summary?: string; /* ... */ }
type CreateEventData = { /* ... */ }
type UpdateEventData = Partial<CreateEventData>
type SearchResults = { results: EventSummary[] }
type EventFilters = { from?: string; to?: string; category?: string }
type SearchFilters = { category?: string }
```

## Usage Examples

### Basic API Call
```typescript
import { api } from '../lib/api'

const events = await api.listEvents()
```

### With Authentication
```typescript
await api.login('user@example.com', 'password')
const events = await api.listEvents() // Token automatically included
```

### With Filters
```typescript
const events = await api.listEvents({
  category: 'music',
  from: '2024-01-01',
})
```

### Search
```typescript
const results = await api.search('jazz concert')
```

### Upload File
```typescript
const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
const url = await api.uploadFile(file, (progress) => {
  console.log(`Upload: ${progress}%`)
})
```

## Best Practices

1. **Centralized API**: All API calls go through this file
2. **Type Safety**: TypeScript types for all responses
3. **Error Handling**: Centralized error handling
4. **Token Management**: Automatic JWT inclusion
5. **Base URL**: Configurable via environment variables
6. **Consistency**: Uniform API calling pattern

