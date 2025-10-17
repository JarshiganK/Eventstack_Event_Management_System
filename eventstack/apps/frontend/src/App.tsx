import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './routes/Home'
import Search from './routes/Search'
import EventDetail from './routes/EventDetail'
import Bookmarks from './routes/Bookmarks'
import Notifications from './routes/Notifications'
import Login from './routes/Login'
import AdminLogin from './routes/admin/AdminLogin'
import Dashboard from './routes/admin/Dashboard'
import EventNew from './routes/admin/EventNew'
import EventEdit from './routes/admin/EventEdit'
import VenueList from './routes/admin/VenueList'
import OrganizerLogin from './routes/organizer/OrganizerLogin'
import OrganizerDashboard from './routes/organizer/OrganizerDashboard'
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
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/events/new" element={<EventNew />} />
          <Route path="/admin/events/:id/edit" element={<EventEdit />} />
          <Route path="/admin/venues" element={<VenueList />} />
          <Route path="/organizer/login" element={<OrganizerLogin />} />
          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  )
}
