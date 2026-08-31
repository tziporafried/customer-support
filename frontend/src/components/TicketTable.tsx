import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Ticket } from '../types/Ticket'

type TicketTableProps = {
  tickets: Ticket[]
  onDelete: (ticket: Ticket) => void
}

export function TicketTable({ tickets, onDelete }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="results-state">
        <strong>No tickets found</strong>
        <span>Try adjusting your search or status filter.</span>
      </div>
    )
  }

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <caption className="visually-hidden">Customer support tickets</caption>
          <thead>
            <tr>
              <th scope="col">Full Name</th>
              <th scope="col">Email</th>
              <th scope="col">Description</th>
              <th scope="col">AI Summary</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="customer-cell">
                  <Link to={`/tickets/${ticket.id}`}>{ticket.fullName}</Link>
                </td>
                <td className="email-cell">{ticket.email}</td>
                <td className="description-cell">
                  <span title={ticket.description}>{ticket.description}</span>
                </td>
                <td className="ai-summary-cell">
                  {ticket.aiSummary ? (
                    <span title={ticket.aiSummary}>{ticket.aiSummary}</span>
                  ) : (
                    <span className="ai-summary-cell--empty">—</span>
                  )}
                </td>
                <td><StatusBadge status={ticket.status} /></td>
                <td className="actions-cell">
                  <button
                    type="button"
                    className="delete-ticket-button"
                    onClick={() => onDelete(ticket)}
                    aria-label={`Delete ticket for ${ticket.fullName}`}
                    title="Delete ticket"
                  >
                    <span aria-hidden="true">🗑</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
