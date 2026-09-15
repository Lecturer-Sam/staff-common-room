import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PendingApproval({ suspended = false }) {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">
          {suspended ? 'Account suspended' : 'Application received'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {suspended
            ? 'Your membership has been suspended. If you believe this is a mistake, please contact the consortium administrators.'
            : 'Thanks for applying to join the consortium. An administrator will review your application — you will get access to the portal once you are approved.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Back to website
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
