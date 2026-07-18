import { useMemo, useState } from 'react'
import { Search, LogOut, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { useConfirm } from '../context/ConfirmContext'
import { normalizarTexto } from '../utils/format'
import TopBar from '../components/layout/TopBar'
import ClienteCard from '../components/clientes/ClienteCard'
import Button from '../components/ui/Button'

export default function Home() {
  const { goDetalleCliente, clientes, clientesLoaded, clientesError, refresh, openNuevoCliente } =
    useApp()
  const { session, logout } = useSession()
  const confirmar = useConfirm()
  const [busqueda, setBusqueda] = useState('')

  // La lista vive en AppContext (no acá) precisamente para que, al volver a
  // Home, ya esté disponible al instante en vez de repetir el "Cargando…".
  const loading = !clientesLoaded && !clientesError
  const loadError = clientesLoaded ? null : clientesError

  const handleNuevo = () => openNuevoCliente()

  // Confirmación para evitar cierres accidentales — el botón está en la
  // esquina, justo donde caen los taps sin querer en un celular.
  const handleLogout = async () => {
    const ok = await confirmar('¿Cerrar sesión?')
    if (ok) logout()
  }

  const clientesFiltrados = useMemo(() => {
    const q = normalizarTexto(busqueda.trim())
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        normalizarTexto(c.nombreCompleto).includes(q) ||
        normalizarTexto(c.telefono).includes(q)
    )
  }, [clientes, busqueda])

  return (
    <>
      <TopBar
        title="Clientes"
        bigTitle
        showLogo
        right={
          <Button
            variant="ghost"
            size="sm"
            icon
            title={session?.nombre ? `Salir (${session.nombre})` : 'Salir'}
            aria-label="Cerrar sesión"
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={2.25} />
          </Button>
        }
      />

      {!loading && clientes.length > 0 && (
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
          <Button variant="ghost" onClick={refresh}>
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
          <p>No se encontraron clientes para "{busqueda}".</p>
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
