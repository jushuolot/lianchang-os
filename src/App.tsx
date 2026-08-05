import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { SceneProvider } from './context/SceneContext'
import { SceneApp } from './pages/SceneApp'
import { LoginPage } from './pages/LoginPage'
import { SsoPage } from './pages/SsoPage'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <SceneProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sso" element={<SsoPage />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <SceneApp />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </SceneProvider>
    </AuthProvider>
  )
}
