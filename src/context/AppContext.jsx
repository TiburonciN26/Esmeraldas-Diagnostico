import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getClientes, getClienteCompleto } from '../services'
import { CLIENTES_CACHE_KEY } from '../services/session'

// Contexto global de la app: maneja la navegación entre pantallas
// (Home <-> Detalle de cliente) sin librería de routing, y el estado de
// clientes/detalle de cliente que los guardados aplican directo en memoria
// (ver aplicarClienteGuardado y compañía) en vez de refetchear tras cada
// cambio.

const AppContext = createContext(null)

// Vistas disponibles. Se navega cambiando 'view'.
export const VIEWS = {
  HOME: 'home',
  DETALLE: 'detalle',
}

export function AppProvider({ children }) {
  const [view, setView] = useState(VIEWS.HOME)
  const [selectedClienteId, setSelectedClienteId] = useState(null)

  // Se incrementa solo para forzar un refetch manual (botón "Reintentar"
  // tras un error de carga) — los guardados/borrados YA NO pasan por acá:
  // aplican su resultado directo al estado local (ver aplicarClienteGuardado,
  // aplicarClienteEliminado, aplicarVisitaGuardada, aplicarVisitaEliminada
  // más abajo), así que guardar no dispara un refetch completo de la lista.
  const [clientesRetryTick, setClientesRetryTick] = useState(0)
  const reloadClientes = useCallback(() => setClientesRetryTick((t) => t + 1), [])

  // Lista de clientes cacheada acá (y no en Home) porque Home se
  // desmonta/remonta en cada navegación a Detalle y viceversa. Viviendo en
  // el Provider (que nunca se desmonta), volver a Home muestra la lista al
  // instante en vez de repetir el "Cargando…".
  //
  // También se persiste en localStorage (mismo criterio de confianza que
  // session.js: son datos de un equipo chico, ya se guarda correo+contraseña
  // en texto plano ahí mismo) para pintar algo al instante en el arranque
  // en frío de la PWA (instalada, sin pestaña previa) en vez del skeleton —
  // se revalida contra el backend igual, esto es solo la primera pintada.
  const [clientes, setClientes] = useState(() => leerClientesCache_() ?? [])
  const [clientesLoaded, setClientesLoaded] = useState(() => leerClientesCache_() !== null)
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
        // Si ya había algo cacheado (mostrado desde el arranque) lo dejamos
        // como está en vez de tapar la lista con un error de revalidación.
        if (!clientesLoaded) setClientesError('No se pudo cargar la lista de clientes.')
      })
    return () => {
      vivo = false
    }
  }, [clientesRetryTick])

  // Persiste cada cambio real a la lista (carga inicial, o los ajustes en
  // memoria de aplicarClienteGuardado/aplicarClienteEliminado más abajo) —
  // así el próximo arranque en frío parte de acá, no de una lista vacía.
  // "clientesLoaded" evita pisar el caché con el [] inicial antes de la
  // primera carga real.
  useEffect(() => {
    if (!clientesLoaded) return
    guardarClientesCache_(clientes)
  }, [clientes, clientesLoaded])

  // ---- Detalle de cliente (cliente + diagnóstico + visitas) ----
  // Vive acá (y no en ClienteDetalle) por dos razones: para que VisitaModal,
  // VisitaDetalleModal y ClienteModal —componentes hermanos, montados
  // aparte— puedan aplicarle el resultado de un guardado/borrado sin pasar
  // por un refetch; y para cachear por clienteId (stale-while-revalidate):
  // volver a un cliente ya visitado en esta sesión muestra al instante lo
  // último que se vio, mientras revalida en segundo plano, en vez de tapar
  // todo con "Cargando…" de nuevo.
  const [clienteDetalleCache, setClienteDetalleCache] = useState({}) // { [clienteId]: { cliente, diagnostico, visitas } }
  const [clienteDetalleLoadingId, setClienteDetalleLoadingId] = useState(null) // id sin caché todavía, cargando por primera vez
  const [clienteDetalleError, setClienteDetalleError] = useState(null) // { id, message } — solo aplica si ESE id no tiene caché
  const [clienteDetalleRetryTick, setClienteDetalleRetryTick] = useState(0)
  const reloadClienteDetalle = useCallback(() => setClienteDetalleRetryTick((t) => t + 1), [])

  // Promesas en vuelo por clienteId — evita pedir el mismo cliente dos veces
  // si el prefetch al apoyar el dedo (prefetchClienteDetalle, ver más abajo)
  // y la navegación real (click) se solapan: ambos terminan esperando la
  // MISMA request en vez de disparar una cada uno.
  const clienteDetallePromesasRef = useRef({})
  const fetchClienteDetalle_ = useCallback((id) => {
    if (!clienteDetallePromesasRef.current[id]) {
      clienteDetallePromesasRef.current[id] = getClienteCompleto(id)
        .then((resultado) => {
          setClienteDetalleCache((cache) => ({ ...cache, [id]: resultado }))
          return resultado
        })
        .finally(() => {
          delete clienteDetallePromesasRef.current[id]
        })
    }
    return clienteDetallePromesasRef.current[id]
  }, [])

  useEffect(() => {
    if (!selectedClienteId) return
    const id = selectedClienteId
    let vivo = true
    // Si ya hay algo cacheado para este cliente, esto es una revalidación en
    // segundo plano: no mostramos el spinner de carga ni tocamos el error.
    const teniaCache = Boolean(clienteDetalleCache[id])
    if (!teniaCache) {
      setClienteDetalleLoadingId(id)
      setClienteDetalleError(null)
    }
    fetchClienteDetalle_(id)
      .then(() => {
        if (!vivo) return
        setClienteDetalleLoadingId((cur) => (cur === id ? null : cur))
        setClienteDetalleError((err) => (err?.id === id ? null : err))
      })
      .catch((err) => {
        if (!vivo) return
        console.error('Error cargando el cliente:', err)
        setClienteDetalleLoadingId((cur) => (cur === id ? null : cur))
        // Si ya había datos (stale) para mostrar, los dejamos como están en
        // vez de tapar la pantalla con un error por una revalidación fallida.
        if (!teniaCache) {
          setClienteDetalleError({ id, message: 'No se pudo cargar la información del cliente.' })
        }
      })
    return () => {
      vivo = false
    }
  }, [selectedClienteId, clienteDetalleRetryTick, fetchClienteDetalle_])

  // Adelanta la carga del detalle al apoyar el dedo/mouse sobre una tarjeta
  // de cliente (pointerdown llega ~100-200ms antes que el click que
  // realmente navega) — ese es tiempo real ganado en una request que tarda
  // varios segundos. Si ese cliente ya tiene algo cacheado no hace nada (no
  // es una revalidación, solo un adelanto de la primera carga).
  const prefetchClienteDetalle = useCallback(
    (clienteId) => {
      if (!clienteId || clienteDetalleCache[clienteId]) return
      fetchClienteDetalle_(clienteId).catch(() => {
        // Best-effort: si falla, la navegación real (o su "Reintentar") lo
        // vuelve a intentar igual — no hace falta mostrar nada acá.
      })
    },
    [clienteDetalleCache, fetchClienteDetalle_]
  )

  // Mismo orden que visitasDeCliente_ en el backend (fecha descendente,
  // comparación de strings ISO "YYYY-MM-DD" = comparación cronológica).
  const ordenarVisitas = (visitas) =>
    [...visitas].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))

  // Actualiza SOLO la fila "cliente" (lista de Home + el propio "cliente"
  // dentro de la caché de detalle, si existe) sin tocar diagnostico ni
  // visitas — a diferencia de aplicarClienteGuardado (más abajo), que viene
  // de guardarClienteCompleto y sí trae ambos. Se usa después de crear/
  // editar/borrar una visita: el backend recalcula ahí "tiposAplicados"
  // (ver actualizarTiposDeCliente_ en Code.gs) y lo manda junto con la
  // visita, para que el filtro por tipo en Home se actualice al instante sin
  // recargar la lista entera.
  const aplicarClienteActualizado = useCallback((cliente) => {
    if (!cliente) return
    setClientes((cs) => {
      const idx = cs.findIndex((c) => c.id === cliente.id)
      if (idx === -1) return cs
      const copia = cs.slice()
      copia[idx] = cliente
      return copia
    })
    setClienteDetalleCache((cache) => {
      if (!cache[cliente.id]) return cache
      return { ...cache, [cliente.id]: { ...cache[cliente.id], cliente } }
    })
  }, [])

  // Resultado de crear/editar una visita: upsert directo en la entrada de
  // caché de ese cliente (sin refetch). Si ese cliente no tiene entrada
  // cacheada (no debería pasar — el modal solo se abre desde su Detalle) no
  // hace nada. "cliente" (opcional) es la fila de cliente ya recalculada que
  // devuelve el backend junto con la visita — ver aplicarClienteActualizado.
  const aplicarVisitaGuardada = useCallback(
    (visita, cliente) => {
      setClienteDetalleCache((cache) => {
        const entry = cache[visita.clienteId]
        if (!entry) return cache
        const sinEsa = entry.visitas.filter((v) => v.id !== visita.id)
        return {
          ...cache,
          [visita.clienteId]: { ...entry, visitas: ordenarVisitas([...sinEsa, visita]) },
        }
      })
      aplicarClienteActualizado(cliente)
    },
    [aplicarClienteActualizado]
  )

  const aplicarVisitaEliminada = useCallback(
    (visitaId, clienteId, cliente) => {
      setClienteDetalleCache((cache) => {
        const entry = cache[clienteId]
        if (!entry) return cache
        return { ...cache, [clienteId]: { ...entry, visitas: entry.visitas.filter((v) => v.id !== visitaId) } }
      })
      aplicarClienteActualizado(cliente)
    },
    [aplicarClienteActualizado]
  )

  // Resultado de guardarClienteCompleto: actualiza la fila en la lista de
  // Home (o la agrega, si es alta) y la entrada de caché de ese cliente, si
  // existe.
  const aplicarClienteGuardado = useCallback(({ cliente, diagnostico }) => {
    setClientes((cs) => {
      const idx = cs.findIndex((c) => c.id === cliente.id)
      if (idx === -1) return [...cs, cliente]
      const copia = cs.slice()
      copia[idx] = cliente
      return copia
    })
    setClienteDetalleCache((cache) => {
      if (!cache[cliente.id]) return cache
      return { ...cache, [cliente.id]: { ...cache[cliente.id], cliente, diagnostico } }
    })
  }, [])

  const aplicarClienteEliminado = useCallback((clienteId) => {
    setClientes((cs) => cs.filter((c) => c.id !== clienteId))
    setClienteDetalleCache((cache) => {
      if (!cache[clienteId]) return cache
      const copia = { ...cache }
      delete copia[clienteId]
      return copia
    })
  }, [])

  // Vista "aplanada" del cliente actualmente seleccionado, para que
  // ClienteDetalle no tenga que conocer la forma del caché por id.
  const clienteDetalleActual = clienteDetalleCache[selectedClienteId]
  const clienteDetalle = {
    cliente: clienteDetalleActual?.cliente ?? null,
    diagnostico: clienteDetalleActual?.diagnostico ?? null,
    visitas: clienteDetalleActual?.visitas ?? [],
    loading: clienteDetalleLoadingId === selectedClienteId,
    error: clienteDetalleError?.id === selectedClienteId ? clienteDetalleError.message : null,
  }

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
    goHome,
    goDetalleCliente,
    clientes,
    clientesLoaded,
    clientesError,
    reloadClientes,
    clienteDetalle,
    reloadClienteDetalle,
    prefetchClienteDetalle,
    aplicarVisitaGuardada,
    aplicarVisitaEliminada,
    aplicarClienteGuardado,
    aplicarClienteEliminado,
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

// ---- Caché local de la lista de clientes (localStorage) ----
// La clave vive en services/session.js (no acá) para que clearSession()
// pueda borrarla al cerrar sesión sin depender de este archivo.

function leerClientesCache_() {
  try {
    const raw = localStorage.getItem(CLIENTES_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function guardarClientesCache_(clientes) {
  try {
    localStorage.setItem(CLIENTES_CACHE_KEY, JSON.stringify(clientes))
  } catch {
    // localStorage lleno o no disponible (modo privado, cuota superada): no
    // es crítico, la app sigue funcionando sin esta caché de arranque.
  }
}
