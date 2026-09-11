import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAllSubjects } from '../hooks/useCurriculum'
import { Button, Card, Input } from '../components/ui'

export default function SignUp() {
  const subjects = useAllSubjects()
  const [form, setForm] = useState({ name: '', email: '', password: '', school: '' })
  const [mySubjects, setMySubjects] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function toggleSubject(id) {
    setMySubjects((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(cred.user, { displayName: form.name })
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        school: form.school,
        bio: '',
        subjects: mySubjects,
        photoURL: null,
        role: 'member',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      navigate('/portal')
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <Card padding="p-6 sm:p-8" className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/beaconlogo.png" alt="Beacon Educational Consult" className="h-14 w-14 object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-bold">
              <span className="text-slate-900">Beacon</span>{' '}
              <span className="text-slate-500">Consult</span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Apply for consortium membership — an administrator will review your
              application before you get portal access.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input required placeholder="Full name" value={form.name} onChange={set('name')} className="py-2.5" />
          <Input type="email" required placeholder="Email address" value={form.email} onChange={set('email')} className="py-2.5" />
          <Input type="password" required minLength={6} placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} className="py-2.5" />
          <Input placeholder="School" value={form.school} onChange={set('school')} className="py-2.5" />

          {subjects.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-600">
                Subjects you teach
              </legend>
              {/* 1 col on mobile, 2 on sm+ */}
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={mySubjects.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                      className="accent-brand"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <Button type="submit" disabled={busy} className="w-full py-2.5">
            {busy ? 'Submitting…' : 'Submit application'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already a member?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-slate-400 hover:text-brand hover:underline">
            ← Back to website
          </Link>
        </p>
      </Card>
    </div>
  )
}
