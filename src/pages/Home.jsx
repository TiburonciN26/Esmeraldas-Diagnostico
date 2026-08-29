import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { normalizarTexto } from '../utils/format'
import { TIPOS_APLICACION } from '../data/constants'
import TopBar from '../components/layout/TopBar'
import ClienteCard from '../components/clientes/ClienteCard'
import Button from '../components/ui/Button'

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
  // se crea/edita/borra una visita (ver actualizarTiposDeCliente_ en
  // Code.gs) — así el filtro no tiene que leer el historial completo de
  // visitas en cada carga de Home, solo lo que ya viene en la fila del
  // cliente. '' = sin filtro (todos).
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const filtroRef = useRef(null)

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

  const clientesFiltrados = useMemo(() => {
    const q = normalizarTexto(busqueda.trim())
    return clientes.filter((c) => {
      const coincideTexto =
        !q || normalizarTexto(c.nombreCompleto).includes(q) || normalizarTexto(c.telefono).includes(q)
      const coincideTipo = !filtroTipo || (c.tiposAplicados || '').split(',').includes(filtroTipo)
      return coincideTexto && coincideTipo
    })
  }, [clientes, busqueda, filtroTipo])

  return (
    <>
      <TopBar title="Clientes" bigTitle showLogo menu />

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

      <Button variant="primary" className="fab" onClick={handleNuevo}>
        + Nuevo cliente
      </Button>
    </>
  )
}
