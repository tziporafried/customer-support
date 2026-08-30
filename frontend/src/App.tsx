import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AppHeader } from './components/AppHeader'
import { TicketDetails } from './pages/TicketDetails'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { TicketsList } from './pages/TicketsList'

export default function App() {
  return (
    <AuthProvider>
      <AppHeader />
      <Routes>
        <Route path="/" element={<TicketsList />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>
    </AuthProvider>
  )
}
