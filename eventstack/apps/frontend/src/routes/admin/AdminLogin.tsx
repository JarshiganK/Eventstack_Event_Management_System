import { useState } from 'react'
import { api } from '../../lib/api'
import { setToken } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { token, user } = await api.login(email, password)
      if (user.role !== 'ADMIN') throw new Error('Not admin')
      setToken(token)
      navigate('/admin/dashboard')
    } catch {
      setError('Admin login failed')
    }
  }

  return (
    <form className="section" onSubmit={submit}>
      <h3>Admin Login</h3>
      <div><input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error ? <div style={{color:'red'}}>{error}</div> : null}
      <button type="submit">Login</button>
    </form>
  )
}


