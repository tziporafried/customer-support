import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createTicket } from '../api/ticketsApi'
import type { CreateTicketRequest } from '../types/CreateTicketRequest'

type NewTicketModalProps = {
  onClose: () => void
  onCreated: () => void
}

const emptyForm: CreateTicketRequest = {
  fullName: '',
  email: '',
  description: '',
}

export function NewTicketModal({ onClose, onCreated }: NewTicketModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const fullNameRef = useRef<HTMLInputElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [form, setForm] = useState<CreateTicketRequest>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    fullNameRef.current?.focus()

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      returnFocusRef.current?.focus()
    }
  }, [onClose])

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') {
      return
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )

    if (!focusableElements?.length) {
      event.preventDefault()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function updateField(field: keyof CreateTicketRequest, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!form.fullName.trim() || !form.email.trim() || !form.description.trim()) {
      setError('All fields are required.')
      return
    }

    setIsSubmitting(true)

    try {
      await createTicket({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        description: form.description.trim(),
      })
      setForm(emptyForm)
      onCreated()
    } catch {
      setError('Unable to create ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-ticket-title"
        aria-describedby="new-ticket-description"
        onKeyDown={handleDialogKeyDown}
      >
        <form onSubmit={handleSubmit}>
          <header className="modal__header">
            <div>
              <h2 id="new-ticket-title">Create new ticket</h2>
              <p id="new-ticket-description">
                Share the customer details and a description of the issue.
              </p>
            </div>
            <button
              className="modal__close"
              type="button"
              onClick={onClose}
              aria-label="Close new ticket modal"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="modal__body">
            <div className="form-field">
              <label htmlFor="full-name">Full Name</label>
              <input
                ref={fullNameRef}
                id="full-name"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Issue Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                required
              />
            </div>

            {error && (
              <div className="feedback-message feedback-message--error" role="alert">
                {error}
              </div>
            )}
          </div>

          <footer className="modal__footer">
            <button
              className="button button--secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
