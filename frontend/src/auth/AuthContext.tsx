import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types/LoginRequest'

const TOKEN_KEY = 'adminToken'
const USER_KEY = 'authUser'

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  signIn: (token: string, user: AuthUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function getStoredToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const storedUser = sessionStorage.getItem(USER_KEY)
  return token && storedUser ? token : null
}

function getStoredUser(): AuthUser | null {
  const storedUser = sessionStorage.getItem(USER_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  function signIn(newToken: string, authenticatedUser: AuthUser) {
    sessionStorage.setItem(TOKEN_KEY, newToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser))
    setToken(newToken)
    setUser(authenticatedUser)
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
