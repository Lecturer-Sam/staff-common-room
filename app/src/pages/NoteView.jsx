import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { Button, Input } from '../components/ui'

const statusBadge = {
  published: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  private: 'bg-slate-100 text-slate-500',
}

export default function NoteView() {
  const { noteId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const [note, setNote] = useState(undefined)
  const { subjects } = useCurriculum(note?.grade ?? 'B1')
  const [comments, setComments] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const toast = useToast()

  // Live document (reactions update in real time)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'notes', noteId), (snap) =>
      setNote(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    )
    return unsub
  }, [noteId])

  // Comments stream
  useEffect(() => {
    const q = query(
      collection(db, 'notes', noteId, 'comments'),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setComments([]),
    )
    return unsub
  }, [noteId])

  if (note === undefined)
    return <p className="text-slate-400">Loading note…</p>
  if (note === null) return <p className="text-slate-500">Note not found.</p>

  const own = note.authorId === user?.uid
  const liked = note.likes?.includes(user?.uid)
  const disliked = note.dislikes?.includes(user?.uid)
  const advertised = note.status === 'published' || note.status === 'pending'
  const subjectName =
    subjects.find((s) => s.id === note.subjectId)?.name ?? 'General'

  async function react(kind) {
    const ref = doc(db, 'notes', noteId)
    if (kind === 'like') {
      await updateDoc(ref, {
        likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        dislikes: arrayRemove(user.uid),
      })
    } else {
      await updateDoc(ref, {
        dislikes: disliked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likes: arrayRemove(user.uid),
      })
    }
  }

  async function setStatus(status) {
    try {
      await updateDoc(doc(db, 'notes', noteId), { status })
      toast.success(
        status === 'published'
          ? 'Note published to the network.'
          : status === 'private'
            ? 'Note is now private.'
            : status === 'pending'
              ? 'Note submitted for approval.'
              : 'Status updated.',
      )
    } catch {
      toast.error('Failed to update note.')
    }
  }

  async function addComment(e) {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return
    setBusy(true)
    try {
      await addDoc(collection(db, 'notes', noteId, 'comments'), {
        authorId: user.uid,
        authorName: profile?.name || user.displayName || 'Teacher',
        text,
        createdAt: serverTimestamp(),
      })
      setCommentText('')
    } finally {
      setBusy(false)
    }
  }

  function handleDelete() {
    setConfirm({
      title: 'Delete this note?',
      body: 'The note and all its comments will be permanently removed.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'notes', noteId))
          toast.success('Note deleted.')
          navigate('/portal/wall')
        } catch {
          toast.error('Failed to delete note.')
        }
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
      <nav className="mb-2 text-sm text-slate-500">
        <Link
          to={own ? '/portal/wall' : '/portal/notes'}
          className="text-indigo-600 hover:underline"
        >
          {own ? 'My Wall' : 'Notes'}
        </Link>{' '}
        / {note.title}
      </nav>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">{note.title}</h1>
          <p className="page-subtitle">
            {subjectName}
            {note.className && ` · ${note.className}`} · by{' '}
            <Link
              to={`/portal/authors/${note.authorId}`}
              className="font-medium text-indigo-600 hover:underline"
            >
              {note.authorName}
            </Link>
            {(own || isAdmin) && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge[note.status] ?? statusBadge.private}`}
              >
                {note.status}
              </span>
            )}
          </p>
        </div>
        <span className="flex flex-wrap justify-end gap-2">
          {isAdmin && note.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Approve &amp; publish
              </button>
              <button
                type="button"
                onClick={() => setStatus('private')}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Send back
              </button>
            </>
          )}
          {own && !advertised && (
            <button
              type="button"
              onClick={() => setStatus(isAdmin ? 'published' : 'pending')}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {isAdmin ? 'Advertise' : 'Advertise (submit)'}
            </button>
          )}
          {own && advertised && (
            <button
              type="button"
              onClick={() => setStatus('private')}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Make private
            </button>
          )}
          {(own || isAdmin) && (
            <>
              <Link
                to={`/portal/notes/${noteId}/edit`}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </span>
      </div>

      {/* Note body */}
      <article className="card p-5 sm:p-7">
        {note.summary && (
          <p className="mb-5 border-l-2 border-indigo-200 pl-3 text-sm italic text-slate-500">
            {note.summary}
          </p>
        )}
        <div className="space-y-5">
          {(note.sections ?? []).map((s, i) => (
            <section key={i}>
              {s.heading && (
                <h2 className="text-base font-semibold text-slate-900">
                  {s.heading}
                </h2>
              )}
              {s.body && (
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
                  {s.body}
                </p>
              )}
            </section>
          ))}
        </div>
      </article>

      {/* Reactions — only meaningful once advertised */}
      {advertised && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => react('like')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              liked
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            👍 {note.likes?.length ?? 0}
          </button>
          <button
            type="button"
            onClick={() => react('dislike')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              disliked
                ? 'bg-red-600 text-white'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            👎 {note.dislikes?.length ?? 0}
          </button>
        </div>
      )}

      {/* Comments — only on advertised notes */}
      {advertised ? (
        <div className="card mt-6 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Comments ({comments?.length ?? 0})
          </h2>
          <form onSubmit={addComment} className="mb-4 flex flex-wrap gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="min-w-0 flex-1"
            />
            <Button type="submit" disabled={busy || !commentText.trim()}>Post</Button>
          </form>
          {!comments || comments.length === 0 ? (
            <p className="text-sm text-slate-400">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-semibold text-slate-800">
                    {c.authorName}
                  </span>{' '}
                  <span className="text-xs text-slate-400">
                    {c.createdAt?.toDate
                      ? c.createdAt.toDate().toLocaleString()
                      : ''}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap text-slate-600">
                    {c.text}
                  </p>
                  {(c.authorId === user?.uid || isAdmin) && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteDoc(doc(db, 'notes', noteId, 'comments', c.id))
                      }
                      className="text-xs text-slate-400 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        own && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-400">
            This note is private. Advertise it to let other teachers react and
            comment.
          </p>
        )
      )}
    </div>
  )
}
