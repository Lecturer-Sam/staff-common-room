import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import { useToast } from '../context/ToastContext'
import Stepper from '../components/Stepper'

const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'

const STEPS = [{ label: 'Details' }, { label: 'Sections' }, { label: 'Review' }]

const emptySection = () => ({ heading: '', body: '' })

export default function NoteForm() {
  const { noteId } = useParams() // present in edit mode
  const { user, profile } = useAuth()
  const grades = useGrades()
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState('B1')
  const { subjects } = useCurriculum(grade)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [className, setClassName] = useState('')
  const [summary, setSummary] = useState('')
  const [sections, setSections] = useState([emptySection()])

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [notAllowed, setNotAllowed] = useState(false)

  // Load existing note in edit mode
  useEffect(() => {
    if (!noteId) return
    getDoc(doc(db, 'notes', noteId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const n = snap.data()
      if (n.authorId !== user?.uid && !isAdmin) return setNotAllowed(true)
      setGrade(n.grade ?? 'B1')
      setTitle(n.title ?? '')
      setSubjectId(n.subjectId ?? '')
      setClassName(n.className ?? '')
      setSummary(n.summary ?? '')
      setSections(n.sections?.length ? n.sections : [emptySection()])
    })
  }, [noteId, user, isAdmin])

  function updateSection(i, patch) {
    setSections((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }
  function move(i, dir) {
    setSections((ss) => {
      const j = i + dir
      if (j < 0 || j >= ss.length) return ss
      const next = [...ss]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const cleanSections = sections.filter((s) => s.heading.trim() || s.body.trim())

  function goNext() {
    setError('')
    if (step === 0 && !title.trim())
      return setError('Give your study note a title.')
    if (step === 1 && cleanSections.length === 0)
      return setError('Add at least one section with some content.')
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  async function save(nextStatus) {
    setError('')
    if (!title.trim()) {
      setStep(0)
      return setError('Give your study note a title.')
    }
    if (cleanSections.length === 0) {
      setStep(1)
      return setError('Add at least one section with some content.')
    }
    // Members advertising submit for approval; admins publish directly.
    // 'school' shares with the author's school without admin approval.
    const resolved =
      nextStatus === 'advertise'
        ? isAdmin
          ? 'published'
          : 'pending'
        : nextStatus === 'school'
          ? 'school'
          : 'private'
    setBusy(true)
    const payload = {
      kind: 'note-v1',
      title: title.trim(),
      grade,
      subjectId: subjectId || null,
      className: className.trim(),
      summary: summary.trim(),
      sections: cleanSections,
      status: resolved,
      // School-shared notes carry the author's school for rules + queries.
      ...(resolved === 'school' && profile?.schoolId
        ? { schoolId: profile.schoolId }
        : {}),
      updatedAt: serverTimestamp(),
    }
    try {
      if (noteId) {
        await updateDoc(doc(db, 'notes', noteId), payload)
        toast.success(
          resolved === 'private' ? 'Note saved to your wall.' : 'Note saved.',
        )
        navigate(`/portal/notes/${noteId}`)
      } else {
        const ref = await addDoc(collection(db, 'notes'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          likes: [],
          dislikes: [],
          createdAt: serverTimestamp(),
        })
        toast.success(
          resolved === 'private'
            ? 'Note saved to your wall.'
            : resolved === 'school'
              ? 'Note shared with your school.'
              : isAdmin
                ? 'Note advertised to the network.'
                : 'Note submitted for approval.',
        )
        navigate(`/portal/notes/${ref.id}`)
      }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save note.')
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Note not found.</p>
  if (notAllowed)
    return <p className="text-slate-500">Only the author can edit this note.</p>

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? 'General'

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/wall" className="text-indigo-600 hover:underline">
          My Wall
        </Link>{' '}
        / {noteId ? 'Edit note' : 'New note'}
      </nav>
      <h1 className="page-title">
        {noteId ? 'Edit study note' : 'New study note'}
      </h1>
      <p className="page-subtitle mb-6">
        Study notes stay private on your wall until you choose to advertise them.
      </p>

      <Stepper steps={STEPS} current={step} onStepClick={setStep} />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Step 1: Details ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <span className="label-caps">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Photosynthesis — key points for revision"
              className={inputCls}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label-caps">Class / grade</span>
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  setSubjectId('')
                }}
                className={inputCls}
              >
                {(grades.length ? grades : [{ id: 'B1', name: 'Basic 1' }]).map(
                  (g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <span className="label-caps">Subject (optional)</span>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={inputCls}
              >
                <option value="">— general —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="label-caps">Class label (optional)</span>
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Basic 6 Gold"
              className={inputCls}
            />
          </div>
          <div>
            <span className="label-caps">Short description (optional)</span>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One or two lines on what this note covers…"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Sections ── */}
      {step === 1 && (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Section {i + 1} of {sections.length}
                </p>
                <span className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↑ Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === sections.length - 1}
                    className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↓ Down
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSections((ss) => ss.filter((_, j) => j !== i))
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </span>
              </div>
              <input
                value={s.heading}
                onChange={(e) => updateSection(i, { heading: e.target.value })}
                placeholder="Section heading…"
                className={`${inputCls} mb-2 font-semibold`}
              />
              <textarea
                rows={5}
                value={s.body}
                onChange={(e) => updateSection(i, { body: e.target.value })}
                placeholder="Write the study notes for this section…"
                className={inputCls}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSections((ss) => [...ss, emptySection()])}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            + Add section
          </button>
        </div>
      )}

      {/* ── Step 3: Review & publish ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {title || 'Untitled note'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {subjectName}
              {className && ` · ${className}`} · {cleanSections.length} section
              {cleanSections.length === 1 ? '' : 's'}
            </p>
            {summary && (
              <p className="mt-3 text-sm text-slate-600">{summary}</p>
            )}
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {cleanSections.map((s, i) => (
                <div key={i}>
                  {s.heading && (
                    <p className="text-sm font-semibold text-slate-800">
                      {s.heading}
                    </p>
                  )}
                  {s.body && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                      {s.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Publish this note</p>
            <p className="mt-1">
              <strong>Keep private</strong> — only you can see it, on your wall.
              <br />
              <strong>Advertise to the network</strong> —{' '}
              {isAdmin
                ? 'it becomes visible to all members immediately.'
                : 'it is submitted for admin approval, then shown to all members.'}
              {profile?.schoolId && (
                <>
                  <br />
                  <strong>Share with my school</strong> — visible to your school's
                  members right away, no approval needed.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => save('advertise')}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy
                ? 'Saving…'
                : isAdmin
                  ? 'Advertise to network'
                  : 'Submit to advertise'}
            </button>
            {profile?.schoolId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => save('school')}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                Share with my school
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => save('private')}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Keep private
            </button>
          </div>
        </div>
      )}

      {/* ── Step navigation ── */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Next →
          </button>
        ) : (
          <Link
            to="/portal/wall"
            className="rounded-md px-5 py-2 text-sm text-slate-500 hover:text-slate-800"
          >
            Cancel
          </Link>
        )}
      </div>
    </div>
  )
}
