import { useEffect, useState } from 'react'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// "Quote of the Day" data — preinstalled static JSON served from /quotes/.
//   quotes.json   — famous education quotes + Ghanaian / Adinkra proverbs
//   theories.json — teaching theories with a definition and a Ghana-classroom use
// Both are cached at module level so each file is fetched at most once per session
// (and by the service worker for offline use).

const cache = new Map() // url -> parsed json
const pending = new Map()

function loadJson(url) {
  if (cache.has(url)) return Promise.resolve(cache.get(url))
  if (!pending.has(url)) {
    pending.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
        .then((data) => {
          cache.set(url, data)
          return data
        }),
    )
  }
  return pending.get(url)
}

function useJson(url) {
  const [data, setData] = useState(cache.get(url))
  useEffect(() => {
    let active = true
    loadJson(url).then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [url])
  return data
}

export function useQuotes() {
  return useJson('/quotes/quotes.json') ?? null
}

export function useTheories() {
  return useJson('/quotes/theories.json') ?? null
}

/** Whole days since the Unix epoch for the given LOCAL date — a stable per-day integer. */
function dayNumber(date = new Date()) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  )
}

/** Deterministic index into a list that advances once per local day. */
export function dailyIndex(length, date = new Date()) {
  if (!length) return 0
  return ((dayNumber(date) % length) + length) % length
}

/** The same quote for every teacher on a given day; changes at local midnight. */
export function quoteOfTheDay(quotes, date = new Date()) {
  if (!quotes || quotes.length === 0) return null
  return quotes[dailyIndex(quotes.length, date)]
}

/** A featured theory that advances once per week. */
export function theoryOfTheWeek(theories, date = new Date()) {
  if (!theories || theories.length === 0) return null
  const week = Math.floor(dayNumber(date) / 7)
  return theories[((week % theories.length) + theories.length) % theories.length]
}

/* ── Quote likes (shared, Firestore-backed) ─────────────────────────────────
   One doc per liked quote at quote_likes/{quoteId} = { count, likedBy[] },
   created on the first like. Shared by the Quotes page and the Feed. */

/** Live map of quote likes: quoteId -> { count, likedBy[] }. */
export function useQuoteLikes() {
  const [likes, setLikes] = useState({})
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'quote_likes'),
      (snap) => {
        const map = {}
        snap.forEach((d) => {
          map[d.id] = d.data()
        })
        setLikes(map)
      },
      () => {
        /* permission/offline errors — counts stay at their cached values */
      },
    )
    return unsub
  }, [])
  return likes
}

/** Toggle the signed-in member's like on a quote (create-on-first-like). */
export function toggleQuoteLike(quoteId, uid, likes) {
  if (!uid) return
  const isLiked = (likes[quoteId]?.likedBy ?? []).includes(uid)
  return setDoc(
    doc(db, 'quote_likes', quoteId),
    {
      count: increment(isLiked ? -1 : 1),
      likedBy: isLiked ? arrayRemove(uid) : arrayUnion(uid),
    },
    { merge: true },
  ).catch(() => {
    /* rules/offline — the optimistic snapshot will reconcile */
  })
}

/** Top-N quotes by like count (count > 0), joined with their quote objects. */
export function topLikedQuotes(quotes, likes, n = 3) {
  if (!quotes) return []
  return Object.entries(likes)
    .filter(([, v]) => (v?.count ?? 0) > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, n)
    .map(([id, v]) => ({ quote: quotes.find((q) => q.id === id), count: v.count }))
    .filter((x) => x.quote)
}
