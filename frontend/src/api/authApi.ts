import type { LoginRequest, LoginResponse } from '../types/LoginRequest'
import type { RegisterRequest, RegisterResponse } from '../types/RegisterRequest'

const AUTH_URL = 'http://localhost:5285/api/auth'

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (response.status === 401) {
    throw new Error('Invalid email or password.')
  }

  if (!response.ok) {
    throw new Error('Unable to log in.')
  }

  return response.json() as Promise<LoginResponse>
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (response.status === 409) {
    throw new Error('An account with this email already exists.')
  }

  if (response.status === 400) {
    const validation = await response.json() as { errors?: Record<string, string[]> }
    const messages = Object.values(validation.errors ?? {}).flat()
    throw new Error(messages.join(' ') || 'Please check the information you entered.')
  }

  if (!response.ok) {
    throw new Error('Unable to create your account.')
  }

  return response.json() as Promise<RegisterResponse>
}
