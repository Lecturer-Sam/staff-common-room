import { useNavigate, useLocation, Link } from 'react-router-dom'
import { House, Compass, PlayCircle, BarChart3, Ellipsis } from 'lucide-react'
import useQuizStore from '../../stores/quizStore'
import useDrilldownStore from '../../stores/drilldownStore'

/**
 * 5-tab floating bottom navigation (mobile / tablet only — hidden on xl desktop).
 * Matches the `mobile-bottom.png` mockup: rounded-3xl pill-shaped bar with
 * active tab icon inside a filled navy circle + vertical stacked label + icon.
 *
 * Tabs map to routes:
 *   Home     → /                  (dashboard root)
 *   Browse   → /                  (learner path drill-down — same route; shown as
 *                                  active only when drilldown store has a class)
 *   Practice → /quiz-player
 *   Results  → /results-insights
 *   More     → /data-manager
 */
const TABS = [
  { to: '/',                 label: 'Home',     Icon: House,      tabIndex: 0, kind: 'home'     },
  { to: '/',                 label: 'Browse',   Icon: Compass,    tabIndex: 1, kind: 'browse'   },
  { to: '/quiz-player',      label: 'Practice', Icon: PlayCircle, tabIndex: 2, kind: 'practice' },
  { to: '/results-insights', label: 'Results',  Icon: BarChart3,  tabIndex: 3, kind: 'results'  },
  { to: '/data-manager',     label: 'More',     Icon: Ellipsis,   tabIndex: 4, kind: 'more'     },
]

export default function BottomNav() {
  const navigate   = useNavigate()
  const loc        = useLocation()
  const pathname   = loc.pathname
  const quizStatus = useQuizStore((s) => s.status)
  const currentQ   = useQuizStore((s) => s.current)
  const totalQ     = useQuizStore((s) => s.questions.length)
  const classId    = useDrilldownStore((s) => s.classId)
  const setClass   = useDrilldownStore((s) => s.setClass)

  // Compute all 5 active states at the top (no hooks-inside-loops violation).
  const activeMap = {
    home:     pathname === '/' && !classId,
    browse:   pathname === '/' &&  !!classId,
    practice: pathname.startsWith('/quiz-player') || pathname.startsWith('/results'),
    results:  pathname.startsWith('/results-insights'),
    more:     pathname.startsWith('/data-manager') || pathname.startsWith('/pwa-shell'),
  }

  return (
    <nav className="shrink-0 xl:hidden bg-transparent safe-area-bottom px-3 pb-2 pt-1">
      <div
        className="grid grid-cols-5 items-stretch h-[72px]
                   rounded-[32px] bg-white shadow-[var(--shadow-heavy)]
                   ring-1 ring-slate-100"
      >
        {TABS.map(({ to, label, Icon, tabIndex, kind }) => {
          const isActive = activeMap[kind]

          const handleClick = () => {
            if (kind === 'home') {
              // Reset drilldown so "Home" shows the dashboard (not Browse state).
              setClass(null)
            }
            // browse / practice / results / more: default Link navigation is fine.
            if (kind === 'browse' && pathname !== '/') {
              navigate(to)
            }
          }

          return (
            <Link
              key={kind}
              to={to}
              onClick={handleClick}
              className={
                `relative flex flex-col items-center justify-center gap-1
                 text-[10px] font-semibold tracking-wide transition-colors
                 ${isActive ? 'text-navy' : 'text-slate-400 hover:text-slate-600'}
                 ${tabIndex === 0 ? 'rounded-l-[32px]' : ''}
                 ${tabIndex === TABS.length - 1 ? 'rounded-r-[32px]' : ''}`
              }
            >
              {/* Quiz progress badge — Practice tab only */}
              {label === 'Practice' && quizStatus === 'active' && (
                <span className="absolute top-2 right-[calc(50%-22px)] min-w-[20px] h-[20px] px-1
                                 bg-accent text-navy text-[9px] font-extrabold rounded-full
                                 flex items-center justify-center leading-none ring-2 ring-white">
                  {currentQ + 1}/{totalQ}
                </span>
              )}

              {/* Icon: when active, wrap in a filled navy circle */}
              {isActive ? (
                <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center
                                shadow-[var(--shadow-soft)]">
                  <Icon size={18} className="text-accent" strokeWidth={2.25} />
                </div>
              ) : (
                <Icon size={20} strokeWidth={1.75} />
              )}

              <span className={isActive ? 'font-bold text-navy' : ''}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
