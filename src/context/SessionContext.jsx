import { createContext, useContext, useState, useCallback } from 'react'
import { login as apiLogin } from '../services/api'
import { getSession, setSession, clearSession } from '../services/session'

// Sesión del usuario logueado (correo, código, rol, nombre). Se persiste en
// localStorage para no pedir login en cada visita.

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(getSession)

  const login = useCallback(async (correo, codigo) => {
    const usuario = await apiLogin(correo, codigo)
    const nueva = { correo: usuario.correo, codigo, rol: usuario.rol, nombre: usuario.nombre }
    setSession(nueva)
    setSessionState(nueva)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
