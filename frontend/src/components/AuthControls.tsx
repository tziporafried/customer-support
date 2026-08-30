import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function LoginIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function AuthControls() {
  const { user, signOut } = useAuth()

  return (
    <nav className="auth-nav" aria-label="Account">
      {user ? (
        <>
          <span className="admin-identity">
            <span className="admin-identity__dot" aria-hidden="true" />
            <span className="admin-identity__name">{user.name}</span>
            <span className="admin-identity__role">{user.role}</span>
          </span>
          <button
            className="button button--secondary button--icon"
            type="button"
            onClick={signOut}
            aria-label="Logout"
            title="Logout"
          >
            <LogoutIcon />
          </button>
        </>
      ) : (
        <Link
          className="button button--secondary button--icon"
          to="/login"
          aria-label="Login"
          title="Login"
        >
          <LoginIcon />
        </Link>
      )}
    </nav>
  )
}
