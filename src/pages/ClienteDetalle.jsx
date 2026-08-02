import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useSession } from '../context/SessionContext'
import { useConfirm, useAlert } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { deleteCliente } from '../services'
import TopBar from '../components/layout/TopBar'
import Card, { Dato } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { fmtPrecio, fmtFecha, fmtDiaMes, fotoThumbUrl } from '../utils/format'

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
  const { session } = useSession()
  const esAdmin = session?.rol === 'administrador'
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
        <TopBar title="Cliente" onBack={goHome} />
        <div className="loading">Cargando…</div>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        <TopBar title="Cliente" onBack={goHome} />
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>{loadError}</p>
          <Button variant="ghost" onClick={reloadClienteDetalle}>
            Reintentar
          </Button>
        </div>
      </>
    )
  }

  if (!cliente) {
    return (
      <>
        <TopBar title="Cliente" onBack={goHome} />
        <div className="empty">
          <div className="empty__emoji">🤔</div>
          <p>No se encontró el cliente.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={cliente.nombreCompleto}
        subtitle="Detalle de cliente"
        onBack={goHome}
        right={
          <>
            <Button variant="danger" size="sm" onClick={handleDeleteCliente} disabled={deleting}>
              <Trash2 size={14} strokeWidth={2.25} />
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleEditCliente}>
              <Pencil size={14} strokeWidth={2.25} />
              Editar
            </Button>
          </>
        }
      />

      {/* Tarjetas 1 y 2: cliente + diagnóstico (lado a lado en desktop) */}
      <div className="detalle-top-grid">
        <Card>
          <h2 className="card__label">Datos del cliente</h2>
          <div className="dato-grid dato-grid--split dato-grid--3up">
            <Dato label="Nombre completo">{cliente.nombreCompleto}</Dato>
            <Dato label="Teléfono">{cliente.telefono}</Dato>
            <Dato label="Cumpleaños">{fmtDiaMes(cliente.fechaCumpleanos)}</Dato>
          </div>
        </Card>

        <Card>
          <h2 className="card__label">Diagnóstico</h2>
          {diagnostico ? (
            <div className="dato-grid dato-grid--split dato-grid--3up">
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
          <h2>Visitas</h2>
          <Button variant="primary" size="sm" onClick={handleNuevaVisita}>
            + Nueva visita
          </Button>
        </div>

        {visitas.length === 0 ? (
          <p className="muted">Este cliente todavía no tiene visitas registradas.</p>
        ) : (
          <div className="visitas-wrap">
            <table className="visitas-table">
              <thead>
                <tr>
                  <th scope="col">Tipo de aplicación</th>
                  {esAdmin && <th scope="col">Precio</th>}
                  <th scope="col">Fecha</th>
                  <th scope="col" className="col-desktop">Decoloración — etapa</th>
                  <th scope="col" className="col-desktop">Fórmula raíz</th>
                  <th scope="col" className="col-desktop">Oxidante raíz</th>
                  <th scope="col" className="col-desktop">Tiempo raíz</th>
                  <th scope="col" className="col-desktop">Fórmula medios a puntas</th>
                  <th scope="col" className="col-desktop">Oxidante medios a puntas</th>
                  <th scope="col" className="col-desktop">Tiempo medios a puntas</th>
                  <th scope="col" className="col-desktop">Color obtenido</th>
                  <th scope="col" className="col-desktop">% Canas</th>
                  <th scope="col" className="col-desktop">Largo</th>
                  <th scope="col" className="col-desktop">Nota</th>
                  <th scope="col" className="col-desktop">Foto</th>
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
                    {esAdmin && <td>{fmtPrecio(v.precio)}</td>}
                    <td>{fmtFecha(v.fecha)}</td>
                    <td className="col-desktop">{v.decoloracionEtapa}</td>
                    <td className="col-desktop">{v.formulaRaiz}</td>
                    <td className="col-desktop">{v.oxidanteRaiz}</td>
                    <td className="col-desktop">{v.tiempoRaiz}</td>
                    <td className="col-desktop">{v.formulaMediosAPuntas}</td>
                    <td className="col-desktop">{v.oxidanteMediosAPuntas}</td>
                    <td className="col-desktop">{v.tiempoMediosAPuntas}</td>
                    <td className="col-desktop">{v.colorObtenido}</td>
                    <td className="col-desktop">{v.porcentajeCanas ? `${v.porcentajeCanas}%` : ''}</td>
                    <td className="col-desktop">{v.largoCabello}</td>
                    <td className="col-desktop col-nota" title={v.nota}>
                      {v.nota}
                    </td>
                    <td className="col-desktop col-foto">
                      {v.fotoResultado ? (
                        <img
                          className="col-foto__thumb"
                          src={fotoThumbUrl(v.fotoResultado, 128)}
                          alt="Resultado"
                          loading="lazy"
                        />
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
