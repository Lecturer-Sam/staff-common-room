import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

/**
 * Subscribe to deliveries. The owner sees every request; an agent sees only
 * their own. Returns null while loading, then an array sorted newest-first.
 */
export function useDeliveries() {
  const { user, isOwner } = useAuth()
  const [deliveries, setDeliveries] = useState(null)

  useEffect(() => {
    if (!user) return
    const base = collection(db, 'deliveries')
    const q = isOwner ? base : query(base, where('agentId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      setDeliveries(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.requestedAt?.toMillis?.() ?? 0) -
              (a.requestedAt?.toMillis?.() ?? 0),
          ),
      )
    })
    return unsub
  }, [user, isOwner])

  return deliveries
}
