import { NavLink } from 'react-router-dom'

/**
 * NotesTabs — shared tab bar for the Study Notes section.
 * `active` is 'wall' | 'discover' (used only for the default styling; NavLink
 * also reflects the current route).
 */
const tabs = [
  { to: '/portal/wall', label: 'My Wall', end: true },
  { to: '/portal/notes', label: 'Discover', end: true },
]

export default function NotesTabs() {
  return (
    <div className="hearth-tabs">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `hearth-tabs__item${isActive ? ' is-active' : ''}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
