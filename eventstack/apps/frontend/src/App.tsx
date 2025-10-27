import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './routes/Home'
import EventDetail from './routes/EventDetail'
import Bookmarks from './routes/Bookmarks'
import Login from './routes/Login'
import Profile from './routes/Profile'
import AdminLogin from './routes/admin/AdminLogin'
import Dashboard from './routes/admin/Dashboard'
import EventNew from './routes/admin/EventNew'
import EventEdit from './routes/admin/EventEdit'
import OrganizerLogin from './routes/organizer/OrganizerLogin'
import OrganizerDashboard from './routes/organizer/OrganizerDashboard'
import EventExpenses from './routes/organizer/EventExpenses'
import NavBar from './components/NavBar'

export default function App() {
  return (
    <div className="app">
      <main className="content" role="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/events/new" element={<EventNew />} />
          <Route path="/admin/events/:id/edit" element={<EventEdit />} />
          <Route path="/organizer/login" element={<OrganizerLogin />} />
          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          <Route path="/organizer/events/:id/expenses" element={<EventExpenses />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  )
}
