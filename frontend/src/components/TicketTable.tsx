import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Ticket } from '../types/Ticket'

type TicketTableProps = {
  tickets: Ticket[]
}

export function TicketTable({ tickets }: TicketTableProps) {
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
              <th scope="col">Status</th>
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
                <td><StatusBadge status={ticket.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
