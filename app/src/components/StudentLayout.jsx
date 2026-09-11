import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

/**
 * Minimal chrome for pupil accounts (Phase 3). Students never see the
 * teacher sidebar — just their quizzes, results, and a log-out button.
 */
export default function StudentLayout({ children }) {
  const { user, profile, logout } = useAuth()
  const [classroomName, setClassroomName] = useState('')

  useEffect(() => {
    if (!profile?.classroomId) return
    let active = true
    getDoc(doc(db, 'classrooms', profile.classroomId))
      .then((snap) => active && setClassroomName(snap.exists() ? snap.data().name : ''))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [profile?.classroomId])

  const navCls = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand/15 text-brand-ring' : 'text-slate-500 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/portal/learn" className="flex items-center gap-2">
            <img src="/beaconlogo.png" alt="Beacon" className="h-9 w-9 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {profile?.name || user?.displayName || 'Student'}
              </p>
              {classroomName && (
                <p className="truncate text-xs text-slate-400">{classroomName}</p>
              )}
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/portal/learn" end className={navCls}>
              My quizzes
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
