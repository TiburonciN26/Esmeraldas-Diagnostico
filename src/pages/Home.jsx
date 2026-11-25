import { useMemo, useState } from 'react'
import { Search, X, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { normalizarTexto } from '../utils/format'
import { TIPOS_APLICACION } from '../data/constants'
import ClienteCard from '../components/clientes/ClienteCard'
import Button from '../components/ui/Button'

// Criterios de orden de la lista de clientes. dirDefault es la dirección
// con la que arranca cada criterio al elegirlo; el botón de flecha al lado
// del selector invierte la dirección.
const OPCIONES_ORDEN = [
  { criterio: 'nombre', label: 'Nombre (A–Z)', labelDesc: 'Nombre (Z–A)', dirDefault: 'asc' },
  { criterio: 'visitas', label: 'Cantidad de visitas', dirDefault: 'desc' },
  { criterio: 'ultimaVisita', label: 'Última visita', dirDefault: 'desc' },
  { criterio: 'fechaCreacion', label: 'Último agregado', dirDefault: 'desc' },
]

// Por defecto, la lista se ve con el último cliente agregado arriba.
const ORDEN_POR_DEFECTO = { criterio: 'fechaCreacion', direccion: 'desc' }

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

// Texto del pie de la planilla: "ordenado por …".
function describirOrden(orden) {
  const op = OPCIONES_ORDEN.find((o) => o.criterio === orden.criterio)
  if (!op) return ''
  if (op.criterio === 'nombre') return orden.direccion === 'asc' ? 'nombre (A–Z)' : 'nombre (Z–A)'
  const sentido = orden.direccion === 'asc' ? 'de menor a mayor' : 'de mayor a menor'
  if (op.criterio === 'ultimaVisita' || op.criterio === 'fechaCreacion') {
    return `${op.label.toLowerCase()} (${orden.direccion === 'asc' ? 'más antiguo primero' : 'más reciente primero'})`
  }
  return `${op.label.toLowerCase()} (${sentido})`
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
  // "tiposAplicados" viene ya calculado en la fila del cliente (ver
  // recalcularAgregadosDeCliente_ en Code.gs). '' = sin filtro (todos).
  const [filtroTipo, setFiltroTipo] = useState('')
  const [orden, setOrden] = useState(ORDEN_POR_DEFECTO)

  // La lista vive en AppContext (no acá) para que al volver a Home ya esté
  // disponible al instante en vez de repetir el "Cargando…".
  const loading = !clientesLoaded && !clientesError
  const loadError = clientesLoaded ? null : clientesError

  const handleNuevo = () => openNuevoCliente()

  const handleCriterio = (criterio) => {
    const opcion = OPCIONES_ORDEN.find((o) => o.criterio === criterio)
    setOrden({ criterio, direccion: opcion.dirDefault })
  }

  const invertirDireccion = () =>
    setOrden((actual) => ({ ...actual, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }))

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

  const opcionOrden = OPCIONES_ORDEN.find((o) => o.criterio === orden.criterio)

  return (
    <>
      {/* Barra: Buscar · Tipo · Ordenar · Nuevo cliente, en una sola fila
          (se parte en 2-3 renglones recién en celular, ver .barra). */}
      <div className="barra">
        <label className="barra__celda barra__celda--buscar">
          <Search size={17} strokeWidth={2.25} aria-hidden="true" />
          <span className="barra__rotulo">Buscar:</span>
          <input
            type="search"
            className="barra__campo"
            placeholder="Buscar cliente"
            aria-label="Buscar clientes por nombre o teléfono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={loading}
          />
          {busqueda && (
            <button
              type="button"
              className="barra__limpiar"
              aria-label="Limpiar búsqueda"
              onClick={() => setBusqueda('')}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </label>

        <label className="barra__celda barra__celda--tipo">
          <span className="barra__rotulo">Tipo:</span>
          <select
            className="barra__campo"
            aria-label="Filtrar por tipo de aplicación"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            disabled={loading}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_APLICACION.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>

        <div className="barra__celda barra__celda--orden">
          <label className="barra__rotulo" htmlFor="home-orden">
            Ordenar:
          </label>
          <select
            id="home-orden"
            className="barra__campo"
            aria-label="Ordenar clientes"
            value={orden.criterio}
            onChange={(e) => handleCriterio(e.target.value)}
            disabled={loading}
          >
            {OPCIONES_ORDEN.map((op) => (
              <option key={op.criterio} value={op.criterio}>
                {op.criterio === orden.criterio && orden.direccion === 'desc' && op.labelDesc
                  ? op.labelDesc
                  : op.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="barra__dir"
            onClick={invertirDireccion}
            disabled={loading}
            aria-label={`Invertir orden (${orden.direccion === 'asc' ? 'ascendente' : 'descendente'})`}
            title={`${opcionOrden?.label}: invertir el orden`}
          >
            {orden.direccion === 'asc' ? (
              <ArrowUp size={17} strokeWidth={2.25} />
            ) : (
              <ArrowDown size={17} strokeWidth={2.25} />
            )}
          </button>
        </div>

        <Button variant="primary" className="barra__nuevo" onClick={handleNuevo}>
          <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
          Nuevo cliente
        </Button>
      </div>

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Cargando clientes…
          </span>
          <div className="planilla planilla--clientes" aria-hidden="true">
            <CabeceraClientes />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="planilla__fila">
                <span className="planilla__celda col-num" />
                <span className="planilla__celda">
                  <span className="skeleton skeleton--line skeleton--line-lg" />
                </span>
                <span className="planilla__celda col-tel">
                  <span className="skeleton skeleton--line" />
                </span>
                <span className="planilla__celda">
                  <span className="skeleton skeleton--line skeleton--line-sm" />
                </span>
                <span className="planilla__celda col-ultima">
                  <span className="skeleton skeleton--line" />
                </span>
                <span className="planilla__celda" />
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
            <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
            Agregar el primero
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
        <div className="planilla planilla--clientes">
          <CabeceraClientes />
          {clientesFiltrados.map((cliente, i) => (
            <ClienteCard key={cliente.id} cliente={cliente} numero={i + 1} onOpen={goDetalleCliente} />
          ))}
          <div className="planilla__pie">
            <strong>
              {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
              {clientesFiltrados.length !== clientes.length && ` de ${clientes.length}`} · ordenado por{' '}
              {describirOrden(orden)}
            </strong>
            <span>Tocá un nombre para abrir su ficha</span>
          </div>
        </div>
      )}
    </>
  )
}

function CabeceraClientes() {
  return (
    <div className="planilla__fila planilla__fila--cabecera" aria-hidden="true">
      <span className="planilla__celda col-num">N°</span>
      <span className="planilla__celda">Nombre y apellido</span>
      <span className="planilla__celda col-tel">Teléfono</span>
      <span className="planilla__celda planilla__celda--centro">Visitas</span>
      <span className="planilla__celda col-ultima">Última visita</span>
      <span className="planilla__celda planilla__celda--centro">Chat</span>
    </div>
  )
}
