import { useAuth } from '../contexts/AuthContext'

export default function More() {
  const { user, signOut } = useAuth()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">More</h1>

      <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
            {user?.email?.[0]?.toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-900">{user?.email}</span>
          <span className="text-xs text-slate-400">Signed in</span>
        </span>
      </section>

      <button onClick={signOut}
        className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 font-semibold text-red-600 transition hover:bg-red-100">
        Sign out
      </button>
    </div>
  )
}