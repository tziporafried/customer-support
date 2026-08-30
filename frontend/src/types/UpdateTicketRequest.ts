export type UpdateTicketRequest = {
  status: 'Open' | 'In Progress' | 'Closed'
  resolution: string | null
}
