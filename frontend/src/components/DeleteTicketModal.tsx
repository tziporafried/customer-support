import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { deleteTicket } from '../api/ticketsApi'
import type { Ticket } from '../types/Ticket'

type DeleteTicketModalProps = {
  ticket: Ticket
  onCancel: () => void
  onDeleted: () => void
}

export function DeleteTicketModal({ ticket, onCancel, onDeleted }: DeleteTicketModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      returnFocusRef.current?.focus()
    }
  }, [onCancel])

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

  async function handleConfirm() {
    setError(null)
    setIsDeleting(true)

    try {
      await deleteTicket(ticket.id)
      onDeleted()
    } catch {
      setError('Unable to delete ticket.')
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-ticket-title"
        aria-describedby="delete-ticket-description"
        onKeyDown={handleDialogKeyDown}
      >
        <header className="modal__header">
          <div>
            <h2 id="delete-ticket-title">Delete ticket</h2>
            <p id="delete-ticket-description">
              Are you sure you want to delete the ticket from {ticket.fullName}? This cannot be
              undone.
            </p>
          </div>
          <button
            className="modal__close"
            type="button"
            onClick={onCancel}
            aria-label="Close delete ticket modal"
            disabled={isDeleting}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="modal__body">
          {error && (
            <div className="feedback-message feedback-message--error" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="modal__footer">
          <button
            ref={cancelButtonRef}
            className="button button--secondary"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Ticket'}
          </button>
        </footer>
      </div>
    </div>
  )
}
