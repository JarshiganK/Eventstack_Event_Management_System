import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useNavigate, useParams } from 'react-router-dom'

export default function EventEdit() {
  const { id = '' } = useParams()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venueName, setVenueName] = useState('')
  const [categoriesCsv, setCategoriesCsv] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // no longer loading venues list; events store venueName directly
    if (id) {
      api.getEvent(id).then(e => {
        setTitle(e.title || '')
        setSummary(e.summary || '')
        setStartsAt(e.startsAt?.slice(0,16) || '')
        setEndsAt(e.endsAt?.slice(0,16) || '')
        setVenueName(e.venue?.name || '')
        setCategoriesCsv((e.categories || []).join(','))
      })
    }
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.updateEvent(id, { title, summary, startsAt, endsAt, venueName, categoriesCsv })
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
        <input placeholder="Venue name" value={venueName} onChange={e => setVenueName(e.target.value)} required />
      </div>
      <div><input placeholder="Categories CSV" value={categoriesCsv} onChange={e => setCategoriesCsv(e.target.value)} /></div>
      <button type="submit">Save</button>
    </form>
  )
}


