import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getTicketById,
  TicketNotFoundError,
  UnauthorizedError,
  updateTicket,
} from '../api/ticketsApi'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import type { Ticket } from '../types/Ticket'
import type { UpdateTicketRequest } from '../types/UpdateTicketRequest'

export function TicketDetails() {
  const { user, signOut } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<UpdateTicketRequest['status']>('Open')
  const [resolution, setResolution] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Ticket not found.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    getTicketById(id)
      .then((loadedTicket) => {
        setTicket(loadedTicket)
        setStatus(loadedTicket.status as UpdateTicketRequest['status'])
        setResolution(loadedTicket.resolution ?? '')
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof TicketNotFoundError
            ? 'Ticket not found.'
            : 'Unable to load ticket.',
        )
      })
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleSave() {
    if (!id) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSuccessMessage(null)

    try {
      const updatedTicket = await updateTicket(id, {
        status,
        resolution: resolution.trim() || null,
      })

      setTicket(updatedTicket)
      setStatus(updatedTicket.status as UpdateTicketRequest['status'])
      setResolution(updatedTicket.resolution ?? '')
      setSuccessMessage('Changes saved successfully.')
    } catch (requestError) {
      if (requestError instanceof UnauthorizedError) {
        signOut()
        setSaveError('Your admin session has expired. Please log in again.')
      } else {
        setSaveError('Unable to save changes.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page-shell ticket-details-page">
      <Link className="back-link" to="/">
        <span aria-hidden="true">←</span> Back to tickets
      </Link>

      {isLoading ? (
        <section className="detail-state" role="status" aria-busy="true">
          <h1>Ticket details</h1>
          <p>Loading ticket...</p>
        </section>
      ) : error ? (
        <section className="detail-state detail-state--error" role="alert">
          <h1>{error === 'Ticket not found.' ? 'Ticket not found' : 'Unable to load ticket'}</h1>
          <p>{error}</p>
        </section>
      ) : ticket ? (
        <>
          <header className="detail-heading">
            <div>
              <span className="detail-heading__eyebrow">Support ticket</span>
              <h1>{ticket.fullName}</h1>
              <p>{ticket.email}</p>
            </div>
          </header>

          <div className="ticket-card">
            <div className="ticket-card__main">
              <section className="detail-section" aria-labelledby="description-heading">
                <h2 id="description-heading">Issue description</h2>
                <p className="detail-copy">{ticket.description}</p>
              </section>

              {ticket.aiSummary && (
                <section className="ai-summary" aria-labelledby="ai-summary-heading">
                  <span className="ai-summary__label" id="ai-summary-heading">AI summary</span>
                  <p>{ticket.aiSummary}</p>
                </section>
              )}

              <section className="detail-section" aria-labelledby="resolution-heading">
                <h2 id="resolution-heading">Resolution</h2>
                {isAdmin ? (
                  <div className="form-field">
                    <label className="visually-hidden" htmlFor="ticket-resolution">
                      Resolution
                    </label>
                    <textarea
                      id="ticket-resolution"
                      className="resolution-textarea"
                      value={resolution}
                      onChange={(event) => {
                        setResolution(event.target.value)
                        setSuccessMessage(null)
                      }}
                      placeholder="Add resolution details"
                    />
                  </div>
                ) : ticket.resolution ? (
                  <p className="detail-copy">{ticket.resolution}</p>
                ) : (
                  <p className="detail-copy detail-copy--muted">No resolution provided.</p>
                )}
              </section>
            </div>

            <aside className="ticket-card__sidebar" aria-label="Ticket metadata and management">
              {isAdmin ? (
                <section className="manage-ticket" aria-labelledby="manage-ticket-heading">
                  <h2 id="manage-ticket-heading">Manage ticket</h2>
                  <div className="form-field">
                    <label htmlFor="ticket-status">Status</label>
                    <select
                      id="ticket-status"
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value as UpdateTicketRequest['status'])
                        setSuccessMessage(null)
                      }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <button
                    className="button button--primary manage-ticket__save"
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {successMessage && (
                    <div className="feedback-message feedback-message--success" role="status">
                      {successMessage}
                    </div>
                  )}
                  {saveError && (
                    <div className="feedback-message feedback-message--error" role="alert">
                      {saveError}
                    </div>
                  )}
                </section>
              ) : (
                <section className="metadata-status" aria-labelledby="status-heading">
                  <h2 id="status-heading">Status</h2>
                  <StatusBadge status={ticket.status} />
                </section>
              )}

              <section className="ticket-metadata" aria-labelledby="metadata-heading">
                <h2 id="metadata-heading">Ticket information</h2>
                <dl>
                  <div>
                    <dt>Customer Name</dt>
                    <dd>{ticket.fullName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{ticket.email}</dd>
                  </div>
                  <div>
                    <dt>Created At</dt>
                    <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Updated At</dt>
                    <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Ticket ID</dt>
                    <dd className="ticket-id">{ticket.id}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </main>
  )
}
