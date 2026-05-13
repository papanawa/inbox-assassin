import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Rules from './pages/Rules'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // Safety net — never hang longer than 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 6000)
    return () => clearTimeout(t)
  }, [])

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CrosshairSpinner />
          <p className="text-ink-muted text-sm font-body">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function CrosshairSpinner() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="animate-spin">
      <circle cx="16" cy="16" r="12" fill="none" stroke="#E5E5E5" strokeWidth="2" />
      <circle cx="16" cy="16" r="12" fill="none" stroke="#0D0D0D" strokeWidth="2"
        strokeDasharray="20 56" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="#B91C1C" />
    </svg>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="rules" element={<Rules />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
