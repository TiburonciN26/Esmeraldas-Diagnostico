import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getClientes } from '../services'

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

  // Lista de clientes cacheada acá (y no en Home) porque Home se
  // desmonta/remonta en cada navegación a Detalle y viceversa. Viviendo en
  // el Provider (que nunca se desmonta), volver a Home muestra la lista al
  // instante en vez de repetir el "Cargando…" — solo se refetchea cuando
  // algo realmente cambió (refreshTick).
  const [clientes, setClientes] = useState([])
  const [clientesLoaded, setClientesLoaded] = useState(false)
  const [clientesError, setClientesError] = useState(null)

  useEffect(() => {
    let vivo = true
    getClientes()
      .then((data) => {
        if (!vivo) return
        setClientes(data)
        setClientesLoaded(true)
        setClientesError(null)
      })
      .catch((err) => {
        if (!vivo) return
        console.error('Error cargando clientes:', err)
        setClientesError('No se pudo cargar la lista de clientes.')
      })
    return () => {
      vivo = false
    }
  }, [refreshTick])

  // Modal Nuevo/Editar cliente. clienteId = null -> alta; con id -> edición.
  const [clienteModal, setClienteModal] = useState({ open: false, clienteId: null })
  const openNuevoCliente = useCallback(() => setClienteModal({ open: true, clienteId: null }), [])
  const openEditarCliente = useCallback(
    (clienteId) => setClienteModal({ open: true, clienteId }),
    []
  )
  const closeClienteModal = useCallback(() => setClienteModal({ open: false, clienteId: null }), [])

  // Modal Nueva/Editar visita. visitaId = null -> alta; con id -> edición de
  // esa visita puntual. "visita" trae el objeto ya cargado (la última visita
  // del cliente para precargar el alta, o la visita puntual en edición) —
  // siempre lo tiene quien abre el modal (viene de la lista de ClienteDetalle),
  // así que abrir el modal no dispara ningún request.
  const [visitaModal, setVisitaModal] = useState({
    open: false,
    clienteId: null,
    visitaId: null,
    visita: null,
  })
  const openNuevaVisita = useCallback(
    (clienteId, ultimaVisita = null) =>
      setVisitaModal({ open: true, clienteId, visitaId: null, visita: ultimaVisita }),
    []
  )
  const openEditarVisita = useCallback(
    (visita) =>
      setVisitaModal({ open: true, clienteId: visita.clienteId, visitaId: visita.id, visita }),
    []
  )
  const closeVisitaModal = useCallback(
    () => setVisitaModal({ open: false, clienteId: null, visitaId: null, visita: null }),
    []
  )

  // Vista de solo lectura de una visita (todos los campos). Recibe el objeto
  // completo por la misma razón que visitaModal.
  const [visitaView, setVisitaView] = useState({ open: false, visita: null })
  const openVerVisita = useCallback((visita) => setVisitaView({ open: true, visita }), [])
  const closeVerVisita = useCallback(() => setVisitaView({ open: false, visita: null }), [])

  const goHome = useCallback(() => {
    setSelectedClienteId(null)
    setView(VIEWS.HOME)
  }, [])

  const goDetalleCliente = useCallback((clienteId) => {
    setSelectedClienteId(clienteId)
    setView(VIEWS.DETALLE)
  }, [])

  // ---- Integración con el botón/gesto "atrás" del navegador (móvil) ----
  // La app no usa librería de routing: la navegación vive en el estado. Para
  // que "atrás" cierre la capa visible (un modal, o vuelva de Detalle a Home)
  // en vez de salir de la app, espejamos esas "capas" en el history del
  // navegador con pushState y reaccionamos a popstate.
  //
  // "Capas" apilables por atrás: estar en Detalle (1) + tener un modal
  // abierto (1). Como mucho hay una activa de cada tipo a la vez.
  const overlayLayers =
    (view === VIEWS.DETALLE ? 1 : 0) +
    (clienteModal.open || visitaModal.open || visitaView.open ? 1 : 0)

  const layersRef = useRef(0)
  const isPopping = useRef(false) // el cierre lo disparó un "atrás" real
  const syncingPops = useRef(0) // popstates provocados por nosotros (a ignorar)
  const stateRef = useRef(null)
  stateRef.current = { view, clienteModal, visitaModal, visitaView }

  // Cierra la capa superior visible. Devuelve true si cerró algo.
  const dismissTopLayer = useCallback(() => {
    const s = stateRef.current
    if (s.clienteModal.open) {
      closeClienteModal()
      return true
    }
    if (s.visitaModal.open) {
      closeVisitaModal()
      return true
    }
    if (s.visitaView.open) {
      closeVerVisita()
      return true
    }
    if (s.view === VIEWS.DETALLE) {
      goHome()
      return true
    }
    return false
  }, [closeClienteModal, closeVisitaModal, closeVerVisita, goHome])

  // Escucha el "atrás" del navegador.
  useEffect(() => {
    const onPop = () => {
      // Ignorar los popstate que generamos nosotros para sincronizar.
      if (syncingPops.current > 0) {
        syncingPops.current -= 1
        return
      }
      isPopping.current = true
      const cerro = dismissTopLayer()
      // Si no había nada que cerrar, dejamos que el navegador siga su curso.
      if (!cerro) isPopping.current = false
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dismissTopLayer])

  // Mantiene el history sincronizado con la cantidad de capas abiertas.
  useEffect(() => {
    const prev = layersRef.current
    if (overlayLayers > prev) {
      // Se abrió una capa (Detalle o modal): agregar entrada(s) al history.
      for (let i = prev; i < overlayLayers; i++) window.history.pushState({ ol: i + 1 }, '')
    } else if (overlayLayers < prev) {
      if (isPopping.current) {
        // El cierre vino de un "atrás" real: la entrada ya se consumió sola.
        isPopping.current = false
      } else {
        // El cierre vino de la UI (Cancelar/Guardar/volver): consumir las
        // entradas sobrantes del history para no dejarlas colgadas.
        syncingPops.current += prev - overlayLayers
        window.history.go(overlayLayers - prev)
      }
    }
    layersRef.current = overlayLayers
  }, [overlayLayers])

  const value = {
    view,
    selectedClienteId,
    refreshTick,
    refresh,
    goHome,
    goDetalleCliente,
    clientes,
    clientesLoaded,
    clientesError,
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
