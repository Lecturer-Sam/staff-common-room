import { NavLink } from 'react-router-dom'
import { Compass, PlayCircle, BarChart3, Database, Smartphone } from 'lucide-react'

const TABS = [
  { num: '01', label: 'Learner Path',    icon: Compass,    to: '/' },
  { num: '02', label: 'Quiz Player',     icon: PlayCircle, to: '/quiz-player' },
  { num: '03', label: 'Results & Insights', icon: BarChart3, to: '/results-insights' },
  { num: '04', label: 'Data Manager',    icon: Database,   to: '/data-manager' },
  { num: '05', label: 'PWA Shell',       icon: Smartphone, to: '/pwa-shell' },
]

/**
 * Desktop-only numbered tab bar (01–05) that lives directly below the
 * logo/header. Matches the mockup tab row (desktop-top.png).
 */
export default function DesktopTabs() {
  return (
    <nav className="hidden lg:flex items-stretch gap-1 px-6 py-3
                    border-b border-slate-200 bg-white/60 backdrop-blur-md">
      {TABS.map(({ num, label, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 px-5 py-2.5
             rounded-[12px] text-[12px] font-semibold transition-all
             ${isActive
               ? 'bg-navy text-white shadow-[var(--shadow-soft)]'
               : 'text-slate-600 hover:bg-slate-100 hover:text-navy'}`
          }
        >
          <span className="font-mono text-[10px] tracking-wider opacity-70
                           group-[:not([aria-current=page])]:opacity-50">
            {num}
          </span>
          <Icon size={15} className={({ isActive }) => (isActive ? 'text-accent' : '')} />
          <span className="tracking-tight">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
