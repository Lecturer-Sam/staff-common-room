import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { studentEmail } from '../lib/classrooms'
import { Button, Card, Input } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState('teacher') // 'teacher' | 'student'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [classCode, setClassCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'student') {
        // Pupils log in with class code + access code (synthetic account).
        const cc = classCode.trim().toUpperCase()
        const ac = accessCode.trim().toUpperCase()
        if (cc.length < 4 || ac.length < 6) {
          throw new Error('Enter the class code and your 6-character access code.')
        }
        await signInWithEmailAndPassword(auth, studentEmail(cc, ac), ac)
        navigate('/portal/learn')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        navigate('/portal')
      }
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential'
          ? mode === 'student'
            ? 'Those codes do not match — check with your teacher.'
            : 'Invalid email or password.'
          : err.message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <Card padding="p-6 sm:p-8" className="w-full max-w-sm">

        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <img
            src="/beaconlogo.png"
            alt="Beacon Educational Consult"
            className="h-14 w-14 object-contain"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold">
              <span className="text-slate-900">Beacon</span>{' '}
              <span className="text-slate-500">Consult</span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Members-only portal — log in to continue
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

        {/* Mode toggle */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          {[
            ['teacher', 'Teacher'],
            ['student', 'Student'],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError('')
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'student' ? (
            <>
              <Input
                required
                placeholder="Class code (from your teacher)"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="py-2.5 font-mono tracking-widest"
                maxLength={8}
              />
              <Input
                required
                placeholder="Your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="py-2.5 font-mono tracking-widest"
                maxLength={8}
              />
            </>
          ) : (
            <>
              <Input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-2.5"
              />
              <Input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-2.5"
              />
            </>
          )}
          <Button type="submit" disabled={busy} className="w-full py-2.5">
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === 'student' ? (
            <>
              A teacher?{' '}
              <button
                type="button"
                onClick={() => setMode('teacher')}
                className="font-medium text-brand hover:underline"
              >
                Log in with email
              </button>
            </>
          ) : (
            <>
              Not a member yet?{' '}
              <Link to="/signup" className="font-medium text-brand hover:underline">
                Apply to join
              </Link>
            </>
          )}
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
