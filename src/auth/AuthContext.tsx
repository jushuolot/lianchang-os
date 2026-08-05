import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  loadSession,
  saveSession,
  type OsSession,
} from './accounts'

type Api = {
  user: OsSession | null
  setUser: (u: OsSession | null) => void
  logout: () => void
}

const Ctx = createContext<Api | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<OsSession | null>(() => loadSession())

  const setUser = useCallback((u: OsSession | null) => {
    if (u) saveSession(u)
    else clearSession()
    setUserState(u)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUserState(null)
  }, [])

  const value = useMemo(() => ({ user, setUser, logout }), [user, setUser, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth within AuthProvider')
  return ctx
}
