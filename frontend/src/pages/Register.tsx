import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { register } from '../api/authApi'

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register({ name, email, password })
      setIsRegistered(true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create your account.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <Link className="back-link login-back-link" to="/">
          <span aria-hidden="true">←</span> Back to tickets
        </Link>

        <section className="login-card" aria-labelledby="register-heading">
          <header className="login-card__header">
            <span className="login-card__eyebrow">Create account</span>
            <h1 id="register-heading">Register</h1>
            <p>Create an account to access the customer support workspace.</p>
          </header>

          {isRegistered ? (
            <div className="registration-success">
              <div className="feedback-message feedback-message--success" role="status">
                Your account was created successfully.
              </div>
              <Link className="button button--primary" to="/login">Continue to Login</Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="register-name">Name</label>
                <input
                  id="register-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <span className="form-hint">Use at least 8 characters.</span>
              </div>

              {error && (
                <div className="feedback-message feedback-message--error" role="alert">
                  {error}
                </div>
              )}

              <button
                className="button button--primary login-form__submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="auth-switch">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
