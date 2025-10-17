import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useNavigate, useParams } from 'react-router-dom'

export default function EventEdit() {
  const { id = '' } = useParams()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venueId, setVenueId] = useState('')
  const [venues, setVenues] = useState<any[]>([])
  const [categoriesCsv, setCategoriesCsv] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listVenues().then(setVenues)
    if (id) {
      api.getEvent(id).then(e => {
        setTitle(e.title || '')
        setSummary(e.summary || '')
        setStartsAt(e.startsAt?.slice(0,16) || '')
        setEndsAt(e.endsAt?.slice(0,16) || '')
        setVenueId(e.venue?.id || '')
        setCategoriesCsv((e.categories || []).join(','))
      })
    }
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.updateEvent(id, { title, summary, startsAt, endsAt, venueId, categoriesCsv })
    navigate(`/event/${id}`)
  }

  return (
    <form className="section" onSubmit={submit}>
      <h3>Edit Event</h3>
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
      <button type="submit">Save</button>
    </form>
  )
}


