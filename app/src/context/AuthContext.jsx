import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // undefined = profile still loading, null = no user doc exists
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      setProfile(u ? undefined : null)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null)
    })
    return unsub
  }, [user])

  const logout = () => signOut(auth)

  // Role helpers for the channel model: the platform owner (admin) gates
  // deliveries; every other approved member acts as a selling agent.
  const isOwner = profile?.role === 'admin'
  const isAgent = !isOwner && profile?.status === 'approved'
  // Phase 2 multi-tenancy: school admins manage their own school's
  // membership (see firestore.rules — they can only touch schoolId).
  const isSchoolAdmin = profile?.role === 'school_admin'

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, logout, isOwner, isAgent, isSchoolAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
