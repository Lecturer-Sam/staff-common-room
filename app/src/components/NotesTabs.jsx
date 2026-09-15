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
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
