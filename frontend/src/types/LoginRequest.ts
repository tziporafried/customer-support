export type LoginRequest = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
}

export type LoginResponse = {
  token: string
  expiresAt: string
  user: AuthUser
}
