import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAllSubjects } from '../hooks/useCurriculum'
import { useToast } from '../context/ToastContext'
import { Button, Card, Field, Input, Textarea } from '../components/ui'

export default function Profile() {
  const { user, profile } = useAuth()
  if (!profile) return <p className="text-slate-400">Loading profile…</p>
  return <ProfileForm key={user.uid} user={user} profile={profile} />
}

function ProfileForm({ user, profile }) {
  const subjects = useAllSubjects()
  const toast = useToast()
  const [form, setForm] = useState({
    name: profile.name ?? '',
    school: profile.school ?? '',
    bio: profile.bio ?? '',
  })
  const [mySubjects, setMySubjects] = useState(profile.subjects ?? [])
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function toggleSubject(id) {
    setMySubjects((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  // Initials avatar
  const initials = (profile.name ?? user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email,
          name: form.name,
          school: form.school,
          bio: form.bio,
          subjects: mySubjects,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      if (form.name !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: form.name })
      }
      toast.success('Profile saved.')
    } catch {
      toast.error('Failed to save profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Avatar header card */}
      <Card className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">
            {profile.name || '(no name yet)'}
          </p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          {profile.school && (
            <p className="truncate text-xs text-slate-400">{profile.school}</p>
          )}
        </div>
      </Card>

      {/* Form card */}
      <Card as="form" onSubmit={handleSubmit} padding="p-5 sm:p-6" className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Edit profile</h2>

        <Field label="Full name" htmlFor="name">
          <Input id="name" required value={form.name} onChange={set('name')} className="py-2.5" />
        </Field>

        <Field label="School" htmlFor="school">
          <Input id="school" value={form.school} onChange={set('school')} className="py-2.5" />
        </Field>

        <Field label="Bio" htmlFor="bio">
          <Textarea
            id="bio"
            rows={4}
            value={form.bio}
            onChange={set('bio')}
            placeholder="Tell other teachers about yourself…"
            className="py-2.5"
          />
        </Field>

        {subjects.length > 0 && (
          <fieldset>
            <legend className="label-caps mb-2">Subjects I teach</legend>
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

        {/* Save row — wraps cleanly on mobile */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
