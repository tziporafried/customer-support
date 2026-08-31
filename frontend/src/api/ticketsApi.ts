import type { Ticket } from '../types/Ticket'
import type { CreateTicketRequest } from '../types/CreateTicketRequest'
import type { UpdateTicketRequest } from '../types/UpdateTicketRequest'
import { getStoredToken } from '../auth/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5285'
const API_URL = `${API_BASE}/api/tickets`

export type TicketFilters = {
  search?: string
  status?: string
}

export class TicketNotFoundError extends Error {}
export class UnauthorizedError extends Error {}

export async function getTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const queryParams = new URLSearchParams()

  if (filters.search?.trim()) {
    queryParams.set('search', filters.search.trim())
  }

  if (filters.status) {
    queryParams.set('status', filters.status)
  }

  const queryString = queryParams.toString()
  const response = await fetch(queryString ? `${API_URL}?${queryString}` : API_URL)

  if (!response.ok) {
    throw new Error('Failed to load tickets.')
  }

  return response.json() as Promise<Ticket[]>
}

export async function createTicket(request: CreateTicketRequest): Promise<Ticket> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Failed to create ticket.')
  }

  return response.json() as Promise<Ticket>
}

export async function deleteTicket(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (response.status === 404) {
    throw new TicketNotFoundError('Ticket not found.')
  }

  if (!response.ok) {
    throw new Error('Failed to delete ticket.')
  }
}

export async function getTicketById(id: string): Promise<Ticket> {
  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`)

  if (response.status === 404) {
    throw new TicketNotFoundError('Ticket not found.')
  }

  if (!response.ok) {
    throw new Error('Failed to load ticket.')
  }

  return response.json() as Promise<Ticket>
}

export async function updateTicket(
  id: string,
  data: UpdateTicketRequest,
): Promise<Ticket> {
  const token = getStoredToken()
  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    throw new UnauthorizedError('Your admin session has expired.')
  }

  if (!response.ok) {
    throw new Error('Failed to update ticket.')
  }

  return response.json() as Promise<Ticket>
}
