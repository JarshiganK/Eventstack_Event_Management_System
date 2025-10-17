import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useNavigate } from 'react-router-dom'

export default function EventNew() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venueId, setVenueId] = useState('')
  const [venues, setVenues] = useState<any[]>([])
  const [categoriesCsv, setCategoriesCsv] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const navigate = useNavigate()

  useEffect(() => { api.listVenues().then(setVenues) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { id } = await api.createEvent({ title, summary, startsAt, endsAt, venueId, categoriesCsv })
    if (file) {
      await api.uploadFile(file)
    }
    navigate(`/event/${id}`)
  }

  return (
    <form className="section" onSubmit={submit}>
      <h3>New Event</h3>
      <div><input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required /></div>
      <div><textarea placeholder="Summary" value={summary} onChange={e => setSummary(e.target.value)} /></div>
      <div><input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></div>
      <div><input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required /></div>
      <div>
        <select value={venueId} onChange={e => setVenueId(e.target.value)} required>
          <option value="">Select venue</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div><input placeholder="Categories CSV" value={categoriesCsv} onChange={e => setCategoriesCsv(e.target.value)} /></div>
      <div><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
      <button type="submit">Create</button>
    </form>
  )
}


