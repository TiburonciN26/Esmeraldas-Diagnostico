import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Aviso breve de éxito (ej. "Cliente guardado"). role="status" +
// aria-live="polite" (no "alert") porque no es un error que interrumpa:
// el lector de pantalla lo anuncia sin cortar lo que esté leyendo.
const ToastContext = createContext(null)

const DURACION_MS = 2600

export function ToastProvider({ children }) {
  const [mensaje, setMensaje] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((texto) => {
    clearTimeout(timeoutRef.current)
    setMensaje(texto)
    timeoutRef.current = setTimeout(() => setMensaje(null), DURACION_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {mensaje && (
        <div className="toast" role="status" aria-live="polite">
          {mensaje}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
