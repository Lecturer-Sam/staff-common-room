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
    `student-nav__link${isActive ? ' is-active' : ''}`

  return (
    <div className="student-shell">
      <header className="student-header">
        <div className="student-header__inner">
          <Link to="/portal/learn" className="student-brand">
            <img src="/beaconlogo.png" alt="Beacon" className="student-brand__logo" />
            <div className="student-brand__copy">
              <p className="student-brand__name">
                {profile?.name || user?.displayName || 'Student'}
              </p>
              {classroomName && (
                <p className="student-brand__classroom">{classroomName}</p>
              )}
            </div>
          </Link>
          <nav className="student-nav">
            <NavLink to="/portal/learn" end className={navCls}>
              My quizzes
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="student-nav__logout"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="student-main">{children}</main>
    </div>
  )
}
