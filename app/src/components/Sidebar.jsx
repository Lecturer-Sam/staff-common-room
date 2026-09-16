import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const links = [
  {
    to: '/portal',
    label: 'Feed',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/portal/articles',
    label: 'Articles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    to: '/portal/curriculum',
    label: 'Curriculum',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: '/portal/forecasts',
    label: 'Schemes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/portal/plans',
    label: 'Lesson Plans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/portal/materials',
    label: 'Generate',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    to: '/portal/wall',
    label: 'Study Notes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
      </svg>
    ),
  },
  {
    to: '/portal/questions',
    label: 'Questions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    to: '/portal/school',
    label: 'My School',
    requiresSchool: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    to: '/portal/classrooms',
    label: 'Classrooms',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/portal/deliveries',
    label: 'Deliveries',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/portal/subscription',
    label: 'Plans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    to: '/portal/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

const adminLinks = [
  {
    to: '/portal/members',
    label: 'Members',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/portal/billing',
    label: 'Subscriptions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    to: '/portal/schools',
    label: 'Schools',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="portal-nav__icon-svg">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
]

function Brand() {
  return (
    <Link to="/portal" className="portal-brand" aria-label="Beacon home">
      <span className="portal-brand__mark" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="portal-brand__name">
        <strong>Beacon</strong>
        <small>Educational Consult</small>
      </span>
    </Link>
  )
}

function NavItem({ to, label, icon, end, admin = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `portal-nav__item${isActive ? ' is-active' : ''}${admin ? ' is-admin' : ''}`
      }
    >
      <span className="portal-nav__icon">{icon}</span>
      <span className="portal-nav__label">{label}</span>
      {label === 'Generate' && <span className="portal-nav__badge">New</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  const { profile, user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const name = profile?.name || user?.displayName || 'Teacher'
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  const navContent = (
    <>
      <div className="portal-sidebar__head">
        <Brand />
        <button
          type="button"
          className="portal-sidebar__close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <nav className="portal-nav" aria-label="Teacher workspace">
        <p className="portal-nav__section">Workspace</p>
        {links
          .filter((link) => !link.requiresSchool || profile?.schoolId)
          .map(({ to, label, icon, end }) => (
            <NavItem key={to} to={to} label={label} icon={icon} end={end} />
          ))}
        {isAdmin && (
          <div className="portal-nav__admin">
            <p className="portal-nav__section">Administration</p>
            {adminLinks.map((link) => (
              <NavItem key={link.to} {...link} admin />
            ))}
          </div>
        )}
      </nav>

      <div className="portal-sidebar__assist">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2L12 3ZM5 14l-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7L5 14Z" /></svg></span>
        <strong>Make teaching lighter.</strong>
        <p>Generate your next classroom resource in seconds.</p>
        <Link to="/portal/materials">Explore tools <b>→</b></Link>
      </div>

      <div className="portal-user">
        <span className="portal-user__avatar">{initials}</span>
        <span className="portal-user__copy">
          <strong>{name}</strong>
          <Link to="/">Back to website</Link>
        </span>
        <button type="button" onClick={logout} className="portal-user__logout" aria-label="Log out" title="Log out">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="portal-sidebar">{navContent}</aside>

      <header className="portal-mobile-header">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          className="portal-mobile-header__menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>

      <div className={`portal-drawer${mobileOpen ? ' is-open' : ''}`} aria-hidden={!mobileOpen}>
        <button type="button" className="portal-drawer__backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
        <aside className="portal-drawer__panel">{navContent}</aside>
      </div>
    </>
  )
}
