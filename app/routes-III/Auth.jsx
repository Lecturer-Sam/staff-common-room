import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { signInSchema, signUpSchema } from '../lib/validators'
import { authErrorMessage } from '../lib/authErrors'

export default function Auth() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/'

  const [tab, setTab] = useState('signin')
  const [values, setValues] = useState({ email: '', password: '', passwordConfirm: '' })
  const [fieldError, setFieldError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Auth state drives the redirect — never navigate manually on success
  if (!loading && user) return <Navigate to={from} replace />

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const switchTab = (t) => { setTab(t); setFieldError(null); setSubmitError(null) }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFieldError(null)
    setSubmitError(null)
    const parsed = (tab === 'signin' ? signInSchema : signUpSchema).safeParse(values)
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message)
      return
    }
    setBusy(true)
    try {
      if (tab === 'signin') await signInWithEmail(values.email, values.password)
      else await signUpWithEmail(values.email, values.password)
      // success → onAuthStateChanged fires → the <Navigate> above takes over
    } catch (err) {
      setSubmitError(authErrorMessage(err))
      setBusy(false)
    }
  }

  const onGoogle = async () => {
    setFieldError(null)
    setSubmitError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setSubmitError(authErrorMessage(err))
      setBusy(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand'

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-2xl font-extrabold tracking-tight">
            <span className="text-brand">Extra Classes</span> <span className="text-slate-400">GH</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue your learning</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
            {[['signin', 'Sign in'], ['signup', 'Create account']].map(([t, label]) => (
              <button key={t} onClick={() => switchTab(t)}
                className={`rounded-lg py-2 ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {(fieldError || submitError) && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {fieldError ?? submitError}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input type="email" required autoComplete="email" placeholder="Email"
              className={inputCls} value={values.email} onChange={set('email')} />
            <input type="password" required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Password" className={inputCls}
              value={values.password} onChange={set('password')} />
            {tab === 'signup' && (
              <input type="password" required autoComplete="new-password" placeholder="Confirm password"
                className={inputCls} value={values.passwordConfirm} onChange={set('passwordConfirm')} />
            )}
            <button type="submit" disabled={busy}
              className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button onClick={onGoogle} disabled={busy}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}