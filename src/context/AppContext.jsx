import { createContext, useContext, useState, useCallback } from 'react'

// Contexto global de la app: maneja la navegación entre pantallas
// (Home <-> Detalle de cliente) sin librería de routing, y un contador
// de "refresh" para que las pantallas recarguen datos tras un cambio.

const AppContext = createContext(null)

// Vistas disponibles. Se navega cambiando 'view'.
export const VIEWS = {
  HOME: 'home',
  DETALLE: 'detalle',
}

export function AppProvider({ children }) {
  const [view, setView] = useState(VIEWS.HOME)
  const [selectedClienteId, setSelectedClienteId] = useState(null)

  // Se incrementa tras crear/editar/eliminar para forzar recarga de datos
  // en las pantallas que dependen de la capa de servicios.
  const [refreshTick, setRefreshTick] = useState(0)
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), [])

  // Modal Nuevo/Editar cliente. clienteId = null -> alta; con id -> edición.
  const [clienteModal, setClienteModal] = useState({ open: false, clienteId: null })
  const openNuevoCliente = useCallback(() => setClienteModal({ open: true, clienteId: null }), [])
  const openEditarCliente = useCallback(
    (clienteId) => setClienteModal({ open: true, clienteId }),
    []
  )
  const closeClienteModal = useCallback(() => setClienteModal({ open: false, clienteId: null }), [])

  // Modal Nueva/Editar visita. visitaId = null -> alta (con posible precarga
  // desde la última visita); con id -> edición de esa visita puntual.
  const [visitaModal, setVisitaModal] = useState({ open: false, clienteId: null, visitaId: null })
  const openNuevaVisita = useCallback(
    (clienteId) => setVisitaModal({ open: true, clienteId, visitaId: null }),
    []
  )
  const openEditarVisita = useCallback(
    (clienteId, visitaId) => setVisitaModal({ open: true, clienteId, visitaId }),
    []
  )
  const closeVisitaModal = useCallback(
    () => setVisitaModal({ open: false, clienteId: null, visitaId: null }),
    []
  )

  // Vista de solo lectura de una visita (todos los campos).
  const [visitaView, setVisitaView] = useState({ open: false, visitaId: null })
  const openVerVisita = useCallback((visitaId) => setVisitaView({ open: true, visitaId }), [])
  const closeVerVisita = useCallback(() => setVisitaView({ open: false, visitaId: null }), [])

  const goHome = useCallback(() => {
    setSelectedClienteId(null)
    setView(VIEWS.HOME)
  }, [])

  const goDetalleCliente = useCallback((clienteId) => {
    setSelectedClienteId(clienteId)
    setView(VIEWS.DETALLE)
  }, [])

  const value = {
    view,
    selectedClienteId,
    refreshTick,
    refresh,
    goHome,
    goDetalleCliente,
    clienteModal,
    openNuevoCliente,
    openEditarCliente,
    closeClienteModal,
    visitaModal,
    openNuevaVisita,
    openEditarVisita,
    closeVisitaModal,
    visitaView,
    openVerVisita,
    closeVerVisita,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Hook de acceso al contexto.
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
