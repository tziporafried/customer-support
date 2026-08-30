import type { AuthUser } from './LoginRequest'

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type RegisterResponse = AuthUser & {
  createdAt: string
}
