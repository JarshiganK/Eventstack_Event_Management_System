import { NavLink } from 'react-router-dom'

const HomeIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 3 10.5V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-10.5Z" />
  </svg>
)

const SearchIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.5 13.5h-.8l-.27-.26a6.5 6.5 0 1 0-.94.94l.26.27v.8l5 5L20.5 18l-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
  </svg>
)

const BookmarkIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-3-6 3Z" />
  </svg>
)

const ProfileIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5c0-2.5-3.58-4.5-8-4.5Z" />
  </svg>
)

export default function NavBar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Primary">
      <NavLink
        to="/"
        aria-label="Home"
        className={({ isActive }) => `navbtn${isActive ? ' navbtn--active' : ''}`}
        end
      >
        {HomeIcon}
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/search"
        aria-label="Search events"
        className={({ isActive }) => `navbtn${isActive ? ' navbtn--active' : ''}`}
      >
        {SearchIcon}
        <span>Search</span>
      </NavLink>

      <NavLink
        to="/bookmarks"
        aria-label="Bookmarks"
        className={({ isActive }) => `navbtn${isActive ? ' navbtn--active' : ''}`}
      >
        {BookmarkIcon}
        <span>Saved</span>
      </NavLink>

      <NavLink
        to="/login"
        aria-label="Profile"
        className={({ isActive }) => `navbtn${isActive ? ' navbtn--active' : ''}`}
      >
        {ProfileIcon}
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}

