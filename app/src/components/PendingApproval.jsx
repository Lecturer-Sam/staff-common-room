import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PendingApproval({ suspended = false }) {
  const { logout } = useAuth()

  return (
    <div className="auth-shell approval-shell">
      <div className="approval-card">
        <h1 className="approval-card__title">
          {suspended ? 'Account suspended' : 'Application received'}
        </h1>
        <p className="approval-card__copy">
          {suspended
            ? 'Your membership has been suspended. If you believe this is a mistake, please contact the consortium administrators.'
            : 'Thanks for applying to join the consortium. An administrator will review your application — you will get access to the portal once you are approved.'}
        </p>
        <div className="approval-card__actions">
          <Link
            to="/"
            className="approval-card__button approval-card__button--secondary"
          >
            Back to website
          </Link>
          <button
            type="button"
            onClick={logout}
            className="approval-card__button approval-card__button--primary"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
