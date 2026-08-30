import { useEffect, useState } from 'react'
import { getTickets } from '../api/ticketsApi'
import { NewTicketModal } from '../components/NewTicketModal'
import { TicketTable } from '../components/TicketTable'
import type { Ticket } from '../types/Ticket'

export function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    getTickets({ search, status })
      .then(setTickets)
      .catch(() => setError('Unable to load tickets.'))
      .finally(() => setIsLoading(false))
  }, [search, status, refreshCount])

  function handleTicketCreated() {
    setIsModalOpen(false)
    setRefreshCount((count) => count + 1)
  }

  return (
    <main className="page-shell">
      <section className="page-heading" aria-labelledby="tickets-heading">
        <div>
          <h1 id="tickets-heading">Support Tickets</h1>
          <p>Review and manage customer requests.</p>
        </div>
        <button
          className="button button--primary new-ticket-button"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          New Ticket
        </button>
      </section>

      <section className="filters-toolbar" aria-label="Ticket filters">
        <div className="filter-field filter-field--search">
          <label htmlFor="ticket-search">Search tickets</label>
          <input
            id="ticket-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or description"
          />
        </div>
        <div className="filter-field filter-field--status">
          <label htmlFor="ticket-status">Status</label>
          <select
            id="ticket-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </section>

      <section aria-label="Ticket results" aria-busy={isLoading}>
        {isLoading ? (
          <div className="results-state" role="status">Loading tickets...</div>
        ) : error ? (
          <div className="results-state results-state--error" role="alert">{error}</div>
        ) : (
          <TicketTable tickets={tickets} />
        )}
      </section>

      {isModalOpen && (
        <NewTicketModal
          onClose={() => setIsModalOpen(false)}
          onCreated={handleTicketCreated}
        />
      )}
    </main>
  )
}
