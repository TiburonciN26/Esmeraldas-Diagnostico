import { useState } from 'react'
import { Trash2, Pencil, ArrowLeft, User, Phone, Cake, History } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useConfirm, useAlert } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { deleteCliente } from '../services'
import Card, { Dato } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { fmtFecha, fmtDiaMes } from '../utils/format'

// Botón flotante para volver a la lista — mismo lenguaje visual que el FAB
// "+ Nuevo cliente" de Home.jsx (posición fija, mismo tipo de sombra), pero
// del lado opuesto (izquierda) y circular en vez de pastilla con texto,
// para no competir con "+ Nueva visita" de más arriba en esta misma
// pantalla.
function BotonVolver({ onClick }) {
  return (
    <button type="button" className="fab-volver" onClick={onClick} aria-label="Volver a Clientes">
      <ArrowLeft size={22} strokeWidth={2.25} />
    </button>
  )
}

export default function ClienteDetalle() {
  const {
    selectedClienteId,
    goHome,
    clienteDetalle,
    reloadClienteDetalle,
    aplicarClienteEliminado,
    openEditarCliente,
    openNuevaVisita,
    openVerVisita,
  } = useApp()
  const confirmar = useConfirm()
  const alertar = useAlert()
  const toast = useToast()

  const { cliente, diagnostico, visitas, loading, error: loadError } = clienteDetalle
  const [deleting, setDeleting] = useState(false)

  const handleEditCliente = () => openEditarCliente(selectedClienteId)
  // visitas ya viene ordenada por fecha descendente (visitasDeCliente_ en el
  // backend), así que visitas[0] es la última — se la pasamos de precarga
  // sin ir a buscarla al servidor.
  const handleNuevaVisita = () => openNuevaVisita(selectedClienteId, visitas[0] ?? null)
  const handleVerVisita = (visita) => openVerVisita(visita)

  const handleDeleteCliente = async () => {
    const ok = await confirmar(
      `¿Eliminar a ${cliente.nombreCompleto}? (se puede recuperar, es un borrado suave)`,
      { danger: true, confirmLabel: 'Eliminar' }
    )
    if (!ok) return
    setDeleting(true)
    try {
      await deleteCliente(selectedClienteId)
      aplicarClienteEliminado(selectedClienteId)
      goHome()
      toast('Cliente eliminado')
    } catch (err) {
      console.error('Error eliminando el cliente:', err)
      await alertar('No se pudo eliminar. Revisá tu conexión e intentá de nuevo.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="loading">Cargando…</div>
        <BotonVolver onClick={goHome} />
      </>
    )
  }

  if (loadError) {
    return (
      <>
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>{loadError}</p>
          <Button variant="ghost" onClick={reloadClienteDetalle}>
            Reintentar
          </Button>
        </div>
        <BotonVolver onClick={goHome} />
      </>
    )
  }

  if (!cliente) {
    return (
      <>
        <div className="empty">
          <div className="empty__emoji">🤔</div>
          <p>No se encontró el cliente.</p>
        </div>
        <BotonVolver onClick={goHome} />
      </>
    )
  }

  return (
    <>
      {/* Tarjetas 1 y 2: cliente + diagnóstico (lado a lado en desktop) */}
      <div className="detalle-top-grid">
        <Card>
          <div className="card__header">
            <h2 className="card__label">Datos del cliente</h2>
            <div className="card__header-acciones">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteCliente}
                disabled={deleting}
                aria-label={deleting ? 'Eliminando…' : 'Eliminar'}
              >
                <Trash2 size={14} strokeWidth={2.25} />
                <span className="btn__texto">{deleting ? 'Eliminando…' : 'Eliminar'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleEditCliente} aria-label="Editar">
                <Pencil size={14} strokeWidth={2.25} />
                <span className="btn__texto">Editar</span>
              </Button>
            </div>
          </div>
          <div className="dato-grid dato-grid--3up">
            <Dato icon={<User size={14} strokeWidth={2.25} />} label="Nombre completo">
              {cliente.nombreCompleto}
            </Dato>
            <Dato icon={<Phone size={14} strokeWidth={2.25} />} label="Teléfono">
              {cliente.telefono}
            </Dato>
            <Dato
              icon={<Cake size={14} strokeWidth={2.25} color="var(--color-amarillo-brillante)" />}
              label="Cumpleaños"
            >
              {fmtDiaMes(cliente.fechaCumpleanos)}
            </Dato>
          </div>
        </Card>

        <Card>
          <h2 className="card__label">Diagnóstico</h2>
          {diagnostico ? (
            <div className="dato-grid dato-grid--3up">
              <Dato label="Canas resistentes">{diagnostico.canasResistentes}</Dato>
              <Dato label="Grosor del cabello">{diagnostico.grosorCabello}</Dato>
            </div>
          ) : (
            <p className="muted">Sin diagnóstico cargado.</p>
          )}
        </Card>
      </div>

      {/* Tarjeta 3: visitas */}
      <Card>
        <div className="card__header">
          <h2>
            <History size={18} strokeWidth={2.25} className="card__header-icono" />
            Historial de visitas
          </h2>
          <Button variant="primary" size="sm" className="btn--sin-borde-rosa" onClick={handleNuevaVisita}>
            + Nueva visita
          </Button>
        </div>

        {visitas.length === 0 ? (
          <p className="muted">Este cliente todavía no tiene visitas registradas.</p>
        ) : (
          <div className="visitas-wrap">
            {/* Solo lo esencial para escanear el historial de un vistazo —
                el resto (fórmulas, oxidante, tiempo, precio, foto…) se ve
                al abrir la visita (handleVerVisita). */}
            <table className="visitas-table">
              {/* Anchos fijos por columna (ver .visitas-table en index.css,
                  table-layout: fixed) — así "Nota" (texto libre, puede ser
                  larga) tiene un ancho de verdad para truncar con "…" en
                  vez de invadir la columna de al lado. Con table-layout:
                  auto (el default) esto no se puede controlar de forma
                  confiable, el ancho de cada columna depende de su
                  contenido más largo. */}
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Tipo de aplicación</th>
                  <th scope="col">Color obtenido</th>
                  <th scope="col" className="visitas-table__nota">
                    Nota
                  </th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v, i) => (
                  <tr
                    key={v.id}
                    onClick={() => handleVerVisita(v)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver visita del ${fmtFecha(v.fecha)}, ${v.tipoAplicacion}${i === 0 ? ' (última visita)' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleVerVisita(v)
                      }
                    }}
                  >
                    <td>
                      {v.tipoAplicacion}
                      {i === 0 && <span className="badge-ultima">Última</span>}
                    </td>
                    <td>{v.colorObtenido}</td>
                    <td className="visitas-table__nota">{v.nota}</td>
                    <td>{fmtFecha(v.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BotonVolver onClick={goHome} />
    </>
  )
}
