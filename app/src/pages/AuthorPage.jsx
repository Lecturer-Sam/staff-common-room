import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAllSubjects } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Grid } from '../components/ui'

export default function AuthorPage() {
  const { authorId } = useParams()
  const subjects = useAllSubjects()
  const [author, setAuthor] = useState(undefined)
  const [notes, setNotes] = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'users', authorId)).then((snap) =>
      setAuthor(snap.exists() ? snap.data() : null),
    )
  }, [authorId])

  useEffect(() => {
    let active = true
    getDocs(
      query(
        collection(db, 'notes'),
        where('authorId', '==', authorId),
        where('status', '==', 'published'),
        limit(100),
      ),
    )
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        list.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        )
        setNotes(list)
      })
      .catch(() => active && setNotes([]))
    return () => {
      active = false
    }
  }, [authorId])

  if (author === undefined)
    return <p className="text-slate-400">Loading page…</p>
  if (author === null)
    return <p className="text-slate-500">Member not found.</p>

  const subjectName = (id) =>
    subjects.find((s) => s.id === id)?.name ?? 'General'

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
            {(author.name ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{author.name}</h1>
            <p className="text-sm text-slate-500">
              {author.school}
              {author.subjects?.length > 0 &&
                ` · ${author.subjects.map(subjectName).join(', ')}`}
            </p>
          </div>
        </div>
        {author.bio && (
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
            {author.bio}
          </p>
        )}
      </div>

      {/* Advertised study notes */}
      <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Study notes by {author.name}
      </h2>
      {!notes ? (
        <SkeletonGrid count={2} cols="sm:grid-cols-2" />
      ) : notes.length === 0 ? (
        <EmptyState
          icon="notes"
          title="No advertised notes yet"
          body={`${author.name} hasn't advertised any study notes yet.`}
        />
      ) : (
        <Grid>
          {notes.map((n) => (
            <Link
              key={n.id}
              to={`/portal/notes/${n.id}`}
              className="card p-4 transition-shadow hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">{n.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {subjectName(n.subjectId)} · {n.sections?.length ?? 0} section
                {(n.sections?.length ?? 0) === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                👍 {n.likes?.length ?? 0}
              </p>
            </Link>
          ))}
        </Grid>
      )}
    </div>
  )
}
