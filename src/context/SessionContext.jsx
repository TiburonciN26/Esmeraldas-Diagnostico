import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin, setOnSesionInvalida } from '../services/api'
import { getSession, setSession, clearSession } from '../services/session'

// Sesión del usuario logueado (correo, código, rol, nombre). Se persiste en
// localStorage para no pedir login en cada visita.

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(getSession)
  // Motivo por el que se volvió a la pantalla de login SIN que la usuaria
  // tocara "Cerrar sesión" — hoy solo lo dispara una sesión invalidada desde
  // afuera (ver el useEffect de abajo). null = no hay nada que avisar.
  const [motivoSalida, setMotivoSalida] = useState(null)

  const login = useCallback(async (correo, codigo) => {
    const usuario = await apiLogin(correo, codigo)
    const nueva = { correo: usuario.correo, codigo, rol: usuario.rol, nombre: usuario.nombre }
    setSession(nueva)
    setSessionState(nueva)
    setMotivoSalida(null)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  // Si una acción autenticada descubre que la contraseña guardada ya no es
  // válida (p.ej. un admin la cambió en la hoja "usuario" mientras había
  // sesión abierta en este dispositivo), desloguea automáticamente en vez de
  // dejar a la usuaria viendo el mismo error de "credenciales incorrectas"
  // en cada acción sin ninguna salida clara.
  useEffect(() => {
    setOnSesionInvalida(() => {
      clearSession()
      setSessionState(null)
      setMotivoSalida('Tu sesión ya no es válida. Volvé a ingresar.')
    })
    return () => setOnSesionInvalida(null)
  }, [])

  return (
    <SessionContext.Provider value={{ session, login, logout, motivoSalida }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
