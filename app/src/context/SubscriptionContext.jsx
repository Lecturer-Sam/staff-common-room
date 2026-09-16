import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import {
  FREE_EXPORT_LIMIT,
  exportsUsedThisMonth,
  isPaidSub,
  planIdFor,
  recordExport,
} from '../lib/subscriptions'
import { isGrantActive } from '../lib/accessGrants'

const SubscriptionContext = createContext(null)

/**
 * Live view of member's subscription + access grants — PRD Phase 3
 *
 *   sub         raw Firestore doc (null = no doc → free)
 *   grants      active access_grants for user/school
 *   hasGrant    true if any active grant
 *   planId      'free' | 'pro' | 'school' | 'institutional'
 *   isPro       true for paid sub OR active grant
 *   exportsUsed, exportsLeft, canExport, countExport
 */
export function SubscriptionProvider({ children }) {
  const { user, profile } = useAuth()
  const [sub, setSub] = useState(null)
  const [subUid, setSubUid] = useState(null)
  const [grants, setGrants] = useState([])
  const [grantsUid, setGrantsUid] = useState(null)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      doc(db, 'subscriptions', user.uid),
      (snap) => {
        setSub(snap.exists() ? snap.data() : null)
        setSubUid(user.uid)
      },
      () => setSubUid(user.uid),
    )
    return unsub
  }, [user])

  // Fetch access grants — userId == uid OR schoolId == profile.schoolId
  useEffect(() => {
    if (!user) return
    let active = true
    const fetchGrants = async () => {
      try {
        const list = []
        // User grants
        const userSnap = await getDocs(query(collection(db, 'access_grants'), where('userId', '==', user.uid), limit(10)))
        userSnap.forEach((d) => list.push({ id: d.id, ...d.data() }))

        // School grants if member has school
        if (profile?.schoolId) {
          const schoolSnap = await getDocs(query(collection(db, 'access_grants'), where('schoolId', '==', profile.schoolId), limit(10)))
          schoolSnap.forEach((d) => {
            if (!list.find((g) => g.id === d.id)) list.push({ id: d.id, ...d.data() })
          })
          // Also try doc id = schoolId direct get (rules fast path)
          try {
            const { getDoc } = await import('firebase/firestore')
            const direct = await getDoc(doc(db, 'access_grants', profile.schoolId))
            if (direct.exists() && !list.find((g) => g.id === direct.id)) {
              list.push({ id: direct.id, ...direct.data() })
            }
          } catch {}
        }

        // Direct doc id = uid fast path
        try {
          const { getDoc } = await import('firebase/firestore')
          const directUser = await getDoc(doc(db, 'access_grants', user.uid))
          if (directUser.exists() && !list.find((g) => g.id === directUser.id)) {
            list.push({ id: directUser.id, ...directUser.data() })
          }
        } catch {}

        if (!active) return
        const activeGrants = list.filter(isGrantActive)
        setGrants(activeGrants)
        setGrantsUid(user.uid)
      } catch (e) {
        console.warn('Failed to fetch access grants:', e)
        if (active) {
          setGrants([])
          setGrantsUid(user.uid)
        }
      }
    }
    fetchGrants()
    return () => { active = false }
  }, [user, profile?.schoolId])

  const loading = !!user && (subUid !== user.uid || grantsUid !== user.uid)
  const liveSub = user && subUid === user.uid ? sub : null
  const liveGrants = user && grantsUid === user.uid ? grants : []
  const hasGrant = liveGrants.length > 0
  const grantPlan = hasGrant ? (liveGrants[0].planId || 'pro') : null

  // Plan resolution: grant overrides free, paid sub overrides grant if higher
  const planId = useMemo(() => {
    if (!user) return 'free'
    const subPlan = planIdFor(liveSub)
    if (subPlan !== 'free') return subPlan
    if (hasGrant) return grantPlan || 'pro'
    return 'free'
  }, [user, liveSub, hasGrant, grantPlan])

  const isPro = useMemo(() => {
    if (!user) return false
    return isPaidSub(liveSub) || hasGrant
  }, [user, liveSub, hasGrant])

  const exportsUsed = user ? exportsUsedThisMonth(liveSub) : 0
  const exportsLeft = isPro ? Infinity : Math.max(0, FREE_EXPORT_LIMIT - exportsUsed)
  const canExport = isPro || exportsLeft > 0

  const countExport = useCallback(async () => {
    if (!user) return { ok: false, reason: 'signed-out' }
    return recordExport(user, sub, hasGrant)
  }, [user, sub, hasGrant])

  const value = useMemo(
    () => ({
      sub: liveSub,
      grants: liveGrants,
      hasGrant,
      grantPlan,
      loading,
      planId,
      isPro,
      exportsUsed,
      exportsLeft,
      canExport,
      countExport,
    }),
    [liveSub, liveGrants, hasGrant, grantPlan, loading, planId, isPro, exportsUsed, exportsLeft, canExport, countExport],
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used inside <SubscriptionProvider>')
  return ctx
}
