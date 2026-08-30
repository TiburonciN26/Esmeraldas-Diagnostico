import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { normalizarTexto } from '../utils/format'
import { TIPOS_APLICACION } from '../data/constants'
import ClienteCard from '../components/clientes/ClienteCard'
import Button from '../components/ui/Button'

// Criterios de orden de la lista de clientes (ver el botón "ordenar",
// separado del filtro por tipo: uno RECORTA qué se ve, el otro reordena lo
// que ya se ve — mezclarlos en un solo control confundiría). dirDefault es
// la dirección con la que arranca cada criterio la primera vez que se
// elige; volver a tocar el mismo criterio invierte la dirección en vez de
// tener que elegir "ascendente/descendente" aparte.
const OPCIONES_ORDEN = [
  { criterio: 'nombre', label: 'Nombre', dirDefault: 'asc' },
  { criterio: 'visitas', label: 'Cantidad de visitas', dirDefault: 'desc' },
  { criterio: 'ultimaVisita', label: 'Última visita', dirDefault: 'desc' },
  { criterio: 'fechaCreacion', label: 'Último cliente agregado', dirDefault: 'desc' },
]

// Por defecto, la lista se ve ordenada alfabéticamente (A-Z) — antes no
// tenía ningún orden explícito (el que viniera del backend).
const ORDEN_POR_DEFECTO = { criterio: 'nombre', direccion: 'asc' }

function compararClientes(a, b, orden) {
  const signo = orden.direccion === 'asc' ? 1 : -1
  switch (orden.criterio) {
    case 'nombre':
      return signo * normalizarTexto(a.nombreCompleto).localeCompare(normalizarTexto(b.nombreCompleto))
    case 'visitas':
      return signo * ((Number(a.cantidadVisitas) || 0) - (Number(b.cantidadVisitas) || 0))
    case 'ultimaVisita':
      return signo * String(a.ultimaVisitaFecha || '').localeCompare(String(b.ultimaVisitaFecha || ''))
    case 'fechaCreacion':
      return signo * String(a.fechaCreacion || '').localeCompare(String(b.fechaCreacion || ''))
    default:
      return 0
  }
}

export default function Home() {
  const {
    goDetalleCliente,
    clientes,
    clientesLoaded,
    clientesError,
    reloadClientes,
    openNuevoCliente,
  } = useApp()
  const [busqueda, setBusqueda] = useState('')
  // Filtra por si el cliente TUVO ALGUNA VEZ una visita de ese tipo —
  // "tiposAplicados" es un texto separado por comas con todos los tipos
  // distintos de su historial, recalculado solo en el backend cada vez que
  // se crea/edita/borra una visita (ver recalcularAgregadosDeCliente_ en
  // Code.gs) — así el filtro no tiene que leer el historial completo de
  // visitas en cada carga de Home, solo lo que ya viene en la fila del
  // cliente. '' = sin filtro (todos).
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const filtroRef = useRef(null)

  // Siempre hay un criterio activo (arranca en ORDEN_POR_DEFECTO, A-Z) —
  // ya no existe un estado "sin ordenar".
  const [orden, setOrden] = useState(ORDEN_POR_DEFECTO)
  const [ordenAbierto, setOrdenAbierto] = useState(false)
  const ordenRef = useRef(null)
  // El botón solo se ve "activo" (fondo oscuro) cuando el orden difiere
  // del de por defecto — evita que se vea permanentemente resaltado sin
  // que la usuaria haya tocado nada.
  const ordenEsPorDefecto = orden.criterio === ORDEN_POR_DEFECTO.criterio && orden.direccion === ORDEN_POR_DEFECTO.direccion

  // Cierra al hacer clic afuera o con Escape — mismo criterio que AppMenu.
  useEffect(() => {
    if (!filtroAbierto) return
    const onClickFuera = (e) => {
      if (filtroRef.current && !filtroRef.current.contains(e.target)) setFiltroAbierto(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltroAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickFuera)
      document.removeEventListener('keydown', onKey)
    }
  }, [filtroAbierto])

  useEffect(() => {
    if (!ordenAbierto) return
    const onClickFuera = (e) => {
      if (ordenRef.current && !ordenRef.current.contains(e.target)) setOrdenAbierto(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOrdenAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickFuera)
      document.removeEventListener('keydown', onKey)
    }
  }, [ordenAbierto])

  // La lista vive en AppContext (no acá) precisamente para que, al volver a
  // Home, ya esté disponible al instante en vez de repetir el "Cargando…".
  const loading = !clientesLoaded && !clientesError
  const loadError = clientesLoaded ? null : clientesError

  const handleNuevo = () => openNuevoCliente()

  // Clickear el tipo ya elegido lo desmarca (vuelve a "Todos") — mismo
  // criterio que el checkbox de Amonio en VisitaModal.jsx, para poder
  // corregir un tap sin tener que abrir de nuevo y elegir "Todos" aparte.
  const handleElegirTipo = (tipo) => {
    setFiltroTipo((actual) => (actual === tipo ? '' : tipo))
    setFiltroAbierto(false)
  }

  // Elegir un criterio no seleccionado arranca en su dirección por defecto;
  // volver a tocar el mismo criterio invierte la dirección (asc <-> desc)
  // en vez de tener que elegir "ascendente/descendente" por separado.
  const handleElegirOrden = (criterio) => {
    setOrden((actual) => {
      if (actual.criterio === criterio) {
        return { criterio, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
      }
      const opcion = OPCIONES_ORDEN.find((o) => o.criterio === criterio)
      return { criterio, direccion: opcion.dirDefault }
    })
    setOrdenAbierto(false)
  }

  const clientesFiltrados = useMemo(() => {
    const q = normalizarTexto(busqueda.trim())
    const filtrados = clientes.filter((c) => {
      const coincideTexto =
        !q || normalizarTexto(c.nombreCompleto).includes(q) || normalizarTexto(c.telefono).includes(q)
      const coincideTipo = !filtroTipo || (c.tiposAplicados || '').split(',').includes(filtroTipo)
      return coincideTexto && coincideTipo
    })
    return [...filtrados].sort((a, b) => compararClientes(a, b, orden))
  }, [clientes, busqueda, filtroTipo, orden])

  return (
    <>
      {!loading && clientes.length > 0 && (
        <div className="search-bar-row">
          <div className="search-bar">
            <Search size={16} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Buscar por nombre o teléfono…"
              aria-label="Buscar clientes por nombre o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="search-bar__clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setBusqueda('')}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="filtro-tipo" ref={filtroRef}>
            <button
              type="button"
              className={`filtro-tipo__trigger ${filtroTipo ? 'filtro-tipo__trigger--activo' : ''}`}
              aria-label={filtroTipo ? `Filtrando por ${filtroTipo}. Abrir filtro` : 'Filtrar por tipo de aplicación'}
              aria-haspopup="true"
              aria-expanded={filtroAbierto}
              onClick={() => setFiltroAbierto((v) => !v)}
            >
              <Filter size={17} strokeWidth={2.25} />
            </button>

            {filtroAbierto && (
              <div className="filtro-tipo__dropdown" role="menu">
                <button
                  type="button"
                  className={`filtro-tipo__item ${!filtroTipo ? 'filtro-tipo__item--activo' : ''}`}
                  role="menuitemradio"
                  aria-checked={!filtroTipo}
                  onClick={() => {
                    setFiltroTipo('')
                    setFiltroAbierto(false)
                  }}
                >
                  Todos
                </button>
                {TIPOS_APLICACION.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className={`filtro-tipo__item ${filtroTipo === tipo ? 'filtro-tipo__item--activo' : ''}`}
                    role="menuitemradio"
                    aria-checked={filtroTipo === tipo}
                    onClick={() => handleElegirTipo(tipo)}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ordenar — control aparte del filtro de arriba a propósito: uno
              recorta la lista, el otro solo la reordena. Mismo lenguaje
              visual (círculo + desplegable), clases de .filtro-tipo
              reusadas tal cual. */}
          <div className="orden-clientes" ref={ordenRef}>
            <button
              type="button"
              className={`filtro-tipo__trigger ${!ordenEsPorDefecto ? 'filtro-tipo__trigger--activo' : ''}`}
              aria-label={`Ordenado por ${OPCIONES_ORDEN.find((o) => o.criterio === orden.criterio)?.label}. Abrir orden`}
              aria-haspopup="true"
              aria-expanded={ordenAbierto}
              onClick={() => setOrdenAbierto((v) => !v)}
            >
              {ordenEsPorDefecto ? (
                <ArrowUpDown size={17} strokeWidth={2.25} />
              ) : orden.direccion === 'asc' ? (
                <ArrowUp size={17} strokeWidth={2.25} />
              ) : (
                <ArrowDown size={17} strokeWidth={2.25} />
              )}
            </button>

            {ordenAbierto && (
              <div className="filtro-tipo__dropdown" role="menu">
                {OPCIONES_ORDEN.map((op) => {
                  const activo = orden.criterio === op.criterio
                  return (
                    <button
                      key={op.criterio}
                      type="button"
                      className={`filtro-tipo__item ${activo ? 'filtro-tipo__item--activo' : ''}`}
                      role="menuitemradio"
                      aria-checked={activo}
                      onClick={() => handleElegirOrden(op.criterio)}
                    >
                      {op.label}
                      {activo && (
                        <span className="filtro-tipo__item-flecha" aria-hidden="true">
                          {orden.direccion === 'asc' ? (
                            <ArrowUp size={13} strokeWidth={2.5} />
                          ) : (
                            <ArrowDown size={13} strokeWidth={2.5} />
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Cargando clientes…
          </span>
          <div className="cliente-list" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton--avatar" />
                <div className="skeleton-card__lines">
                  <div className="skeleton skeleton--line skeleton--line-lg" />
                  <div className="skeleton skeleton--line skeleton--line-sm" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : loadError ? (
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>{loadError}</p>
          <Button variant="ghost" onClick={reloadClientes}>
            Reintentar
          </Button>
        </div>
      ) : clientes.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">💇‍♀️</div>
          <p>Todavía no hay clientes.</p>
          <Button variant="primary" onClick={handleNuevo}>
            + Agregar el primero
          </Button>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">🔍</div>
          {busqueda && filtroTipo ? (
            <p>
              No se encontraron clientes para "{busqueda}" que hayan tenido "{filtroTipo}".
            </p>
          ) : busqueda ? (
            <p>No se encontraron clientes para "{busqueda}".</p>
          ) : (
            <p>Ningún cliente tuvo todavía una visita de "{filtroTipo}".</p>
          )}
        </div>
      ) : (
        <div className="cliente-list">
          {clientesFiltrados.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} onOpen={goDetalleCliente} />
          ))}
        </div>
      )}

      <Button variant="primary" className="fab btn--borde-gris" onClick={handleNuevo}>
        + Nuevo cliente
      </Button>
    </>
  )
}
