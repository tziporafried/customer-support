import { Link } from 'react-router-dom'
import { AuthControls } from './AuthControls'

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link className="brand" to="/" aria-label="Support Desk home">
          <span className="brand__mark" aria-hidden="true">S</span>
          <span className="brand__text">
            <strong>Support Desk</strong>
            <span>Customer Support</span>
          </span>
        </Link>
        <AuthControls />
      </div>
    </header>
  )
}
