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
import { Button, controlClass } from '../components/ui'

const TYPES = ['Full-time', 'Part-time', 'Contract', 'National Service', 'Volunteer']

const inputCls = controlClass
const labelCls =
  'mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase'

function Field({ label, children }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  )
}

export default function VacancyForm() {
  const { vacancyId } = useParams() // present in edit mode
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const [form, setForm] = useState({
    title: '',
    schoolName: profile?.school ?? '',
    location: '',
    level: '',
    employmentType: 'Full-time',
    subjectsText: '',
    description: '',
    applyContact: '',
    deadline: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!vacancyId) return
    getDoc(doc(db, 'vacancies', vacancyId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const v = snap.data()
      setForm({
        title: v.title ?? '',
        schoolName: v.schoolName ?? '',
        location: v.location ?? '',
        level: v.level ?? '',
        employmentType: v.employmentType ?? 'Full-time',
        subjectsText: v.subjectsText ?? '',
        description: v.description ?? '',
        applyContact: v.applyContact ?? '',
        deadline: v.deadline ?? '',
      })
    })
  }, [vacancyId])

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (vacancyId) {
        await updateDoc(doc(db, 'vacancies', vacancyId), {
          ...form,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'vacancies'), {
          ...form,
          // Admin posts go live immediately; member posts await approval.
          status: isAdmin ? 'published' : 'pending',
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      navigate('/portal/vacancies')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Vacancy not found.</p>

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/vacancies" className="text-brand hover:underline">
          Vacancies
        </Link>{' '}
        / {vacancyId ? 'Edit' : 'New'}
      </nav>
      <h1 className="page-title">
        {vacancyId ? 'Edit vacancy' : 'Post a vacancy'}
      </h1>
      {!vacancyId && !isAdmin && (
        <p className="mb-6 text-sm text-slate-500">
          Your advert will appear on the public website once an administrator
          approves it.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Position / title">
          <input
            required
            value={form.title}
            onChange={(e) => setF({ title: e.target.value })}
            placeholder="e.g. Basic 1 Class Teacher"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School">
            <input
              required
              value={form.schoolName}
              onChange={(e) => setF({ schoolName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Location">
            <input
              required
              value={form.location}
              onChange={(e) => setF({ location: e.target.value })}
              placeholder="Town / region"
              className={inputCls}
            />
          </Field>
          <Field label="Level / class">
            <input
              value={form.level}
              onChange={(e) => setF({ level: e.target.value })}
              placeholder="e.g. Lower Primary (B1–B3)"
              className={inputCls}
            />
          </Field>
          <Field label="Employment type">
            <select
              value={form.employmentType}
              onChange={(e) => setF({ employmentType: e.target.value })}
              className={inputCls}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject(s)">
            <input
              value={form.subjectsText}
              onChange={(e) => setF({ subjectsText: e.target.value })}
              placeholder="e.g. Mathematics, Science"
              className={inputCls}
            />
          </Field>
          <Field label="Application deadline">
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setF({ deadline: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={(e) => setF({ description: e.target.value })}
            placeholder="Duties, requirements, salary range (optional)…"
            className={inputCls}
          />
        </Field>
        <Field label="How to apply">
          <textarea
            required
            rows={2}
            value={form.applyContact}
            onChange={(e) => setF({ applyContact: e.target.value })}
            placeholder="e.g. Send CV to head@school.edu.gh or call 024 000 0000"
            className={inputCls}
          />
        </Field>

        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : vacancyId ? 'Save changes' : 'Submit vacancy'}
          </Button>
          <Button to="/portal/vacancies" variant="secondary">Cancel</Button>
        </div>
      </form>
    </div>
  )
}
