import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

type Venue = { id: string; name: string; address?: string; lat: number; lng: number }

export default function VenueList() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState<Omit<Venue, 'id'> & { id?: string }>({ name: '', address: '', lat: 0, lng: 0 })

  async function load() { setVenues(await api.listVenues()) }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (form.id) await api.updateVenue(form.id, form as any)
    else await api.createVenue(form as any)
  setForm({ name: '', address: '', lat: 0, lng: 0 })
    await load()
  }

  async function edit(v: Venue) { setForm({ ...v }) }
  async function remove(id: string) { await api.deleteVenue(id); await load() }

  return (
    <div className="section">
      <h3>Venues</h3>
      <form onSubmit={save} style={{display:'grid',gap:8}}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
        <input placeholder="Address" value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} />
        <input placeholder="Lat" type="number" step="any" value={form.lat} onChange={e=>setForm({...form,lat:parseFloat(e.target.value)})} required />
        <input placeholder="Lng" type="number" step="any" value={form.lng} onChange={e=>setForm({...form,lng:parseFloat(e.target.value)})} required />
        {/* zone/subzone removed */}
        <button type="submit">{form.id ? 'Update' : 'Create'}</button>
      </form>
      <div style={{marginTop:16}}>
        {venues.map(v => (
          <div key={v.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
            <div>
              <div><strong>{v.name}</strong></div>
              <div style={{fontSize:12,color:'#666'}}>{/* zone/subzone removed */}</div>
            </div>
            <div>
              <button onClick={()=>edit(v)}>Edit</button>
              <button onClick={()=>remove(v.id)} style={{marginLeft:8}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


