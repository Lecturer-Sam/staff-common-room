import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import {
  FREE_EXPORT_LIMIT,
  exportsUsedThisMonth,
  isPaidSub,
  planIdFor,
  recordExport,
} from '../lib/subscriptions'

const SubscriptionContext = createContext(null)

/**
 * Live view of the member's `subscriptions/{uid}` doc plus the helpers the
 * rest of the app needs to gate features:
 *
 *   sub         raw Firestore doc data (null = no doc yet → free tier)
 *   planId      'free' | 'pro' | 'school' — the plan currently granted
 *   isPro       true for any active paid plan
 *   exportsUsed free-tier exports used this calendar month
 *   exportsLeft Infinity on paid plans, else remaining free exports
 *   canExport   convenience boolean used by download buttons
 *   countExport call AFTER a successful download (no-op on paid plans)
 */
export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  // `sub` is only meaningful when `subUid` matches the signed-in user —
  // that pairing also derives `loading` without any synchronous setState.
  const [sub, setSub] = useState(null)
  const [subUid, setSubUid] = useState(null)

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

  const loading = !!user && subUid !== user.uid
  const liveSub = user && subUid === user.uid ? sub : null
  const planId = user ? planIdFor(liveSub) : 'free'
  const isPro = user ? isPaidSub(liveSub) : false
  const exportsUsed = user ? exportsUsedThisMonth(liveSub) : 0
  const exportsLeft = isPro ? Infinity : Math.max(0, FREE_EXPORT_LIMIT - exportsUsed)
  const canExport = isPro || exportsLeft > 0

  const countExport = useCallback(async () => {
    if (!user) return { ok: false, reason: 'signed-out' }
    return recordExport(user, sub)
  }, [user, sub])

  const value = useMemo(
    () => ({ sub: liveSub, loading, planId, isPro, exportsUsed, exportsLeft, canExport, countExport }),
    [liveSub, loading, planId, isPro, exportsUsed, exportsLeft, canExport, countExport],
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used inside <SubscriptionProvider>')
  return ctx
}
