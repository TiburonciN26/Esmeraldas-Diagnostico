import { useState } from 'react'
import { Trash2, Pencil, ArrowLeft, Cake, History, Plus, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useConfirm, useAlert } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { deleteCliente } from '../services'
import Button from '../components/ui/Button'
import { fmtFecha, fmtDiaMes } from '../utils/format'
import { esCumpleanosHoy } from '../utils/date'
import { GROSOR_CABELLO, SI_NO } from '../data/constants'

// Botón "← Clientes" para volver a la lista (antes era un botón flotante).
function BotonVolver({ onClick }) {
  return (
    <Button variant="ghost" onClick={onClick} aria-label="Volver a Clientes">
      <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
      <span className="btn__texto">Clientes</span>
    </Button>
  )
}

// Opciones como casillas tildadas (lectura), igual que en la hoja en papel.
function Marcas({ opciones, valor, etiqueta }) {
  return (
    <div className="marcas" role="group" aria-label={etiqueta}>
      {opciones.map((op) => (
        <span key={op} className={`marca ${valor === op ? 'marca--on' : ''}`}>
          {op}
          {valor === op && <span className="sr-only"> (marcado)</span>}
        </span>
      ))}
    </div>
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
  // visitas ya viene ordenada por fecha descendente, así que visitas[0] es
  // la última — se la pasamos de precarga sin ir a buscarla al servidor.
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
      <div className="ficha">
        <div>
          <BotonVolver onClick={goHome} />
        </div>
        <div className="loading">Cargando…</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="ficha">
        <div>
          <BotonVolver onClick={goHome} />
        </div>
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>{loadError}</p>
          <Button variant="ghost" onClick={reloadClienteDetalle}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="ficha">
        <div>
          <BotonVolver onClick={goHome} />
        </div>
        <div className="empty">
          <div className="empty__emoji">🤔</div>
          <p>No se encontró el cliente.</p>
        </div>
      </div>
    )
  }

  const esCumple = esCumpleanosHoy(cliente.fechaCumpleanos)
  const cantVisitas = visitas.length

  return (
    <div className="ficha">
      <div className="ficha__cabecera">
        <div className="ficha__titulo-wrap">
          <BotonVolver onClick={goHome} />
          <div className="ficha__titulos">
            <span className="ficha__kicker">Ficha del cliente</span>
            <h2 className="ficha__nombre">{cliente.nombreCompleto}</h2>
          </div>
        </div>
        <div className="ficha__acciones">
          <Button
            variant="danger"
            onClick={handleDeleteCliente}
            disabled={deleting}
            aria-label={deleting ? 'Eliminando…' : 'Eliminar cliente'}
          >
            <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
            <span className="btn__texto">{deleting ? 'Eliminando…' : 'Eliminar'}</span>
          </Button>
          <Button variant="ghost" onClick={handleEditCliente} aria-label="Editar cliente">
            <Pencil size={16} strokeWidth={2.25} aria-hidden="true" />
            <span className="btn__texto">Editar</span>
          </Button>
          <Button variant="primary" onClick={handleNuevaVisita}>
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            Nueva visita
          </Button>
        </div>
      </div>

      <div className="ficha__grid">
        <section className="seccion" aria-labelledby="sec-datos">
          <h3 className="seccion__titulo" id="sec-datos">
            1. Datos del cliente
          </h3>
          <div className="celdas" style={{ '--celdas': 3 }}>
            <div className="celda">
              <span className="celda__k">Nombre completo</span>
              <span className="celda__v">{cliente.nombreCompleto}</span>
            </div>
            <div className="celda">
              <span className="celda__k">Teléfono</span>
              <span className="celda__v tabular">{cliente.telefono || <span className="muted">—</span>}</span>
            </div>
            <div className={`celda ${esCumple ? 'celda--cumple' : ''}`}>
              <span className="celda__k">Cumpleaños</span>
              <span className="celda__v">
                <Cake size={16} strokeWidth={2.25} className="icono-cumple" aria-hidden="true" />
                {fmtDiaMes(cliente.fechaCumpleanos) || <span className="muted">—</span>}
              </span>
              {esCumple && <span className="celda__nota">¡Cumple hoy!</span>}
            </div>
          </div>
        </section>

        <section className="seccion" aria-labelledby="sec-diag">
          <h3 className="seccion__titulo" id="sec-diag">
            2. Diagnóstico
          </h3>
          {diagnostico ? (
            <div className="celdas" style={{ '--celdas': 2 }}>
              <div className="celda">
                <span className="celda__k">Canas resistentes</span>
                <Marcas opciones={SI_NO} valor={diagnostico.canasResistentes} etiqueta="Canas resistentes" />
              </div>
              <div className="celda">
                <span className="celda__k">Grosor del cabello</span>
                <Marcas opciones={GROSOR_CABELLO} valor={diagnostico.grosorCabello} etiqueta="Grosor del cabello" />
              </div>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, padding: 14 }}>
              Sin diagnóstico cargado.
            </p>
          )}
        </section>
      </div>

      <section className="seccion" aria-labelledby="sec-visitas">
        <h3 className="seccion__titulo" id="sec-visitas">
          <span className="seccion__titulo-texto">
            <History size={15} strokeWidth={2.5} aria-hidden="true" />
            3. Historial de visitas
          </span>
          <span className="seccion__titulo-extra">
            {cantVisitas} {cantVisitas === 1 ? 'visita' : 'visitas'}
          </span>
        </h3>

        {cantVisitas === 0 ? (
          <p className="muted" style={{ margin: 0, padding: 14 }}>
            Este cliente todavía no tiene visitas registradas.
          </p>
        ) : (
          <div className="planilla planilla--visitas">
            <div className="planilla__fila planilla__fila--cabecera" aria-hidden="true">
              <span className="planilla__celda col-num">N°</span>
              <span className="planilla__celda">Fecha</span>
              <span className="planilla__celda">Tipo de aplicación</span>
              <span className="planilla__celda col-color">Color obtenido</span>
              <span className="planilla__celda col-nota">Nota</span>
              <span className="planilla__celda" />
            </div>
            {/* Solo lo esencial para escanear el historial — el resto
                (fórmulas, oxidante, tiempo, precio, foto…) se ve al abrir
                la visita. */}
            {visitas.map((v, i) => (
              <div
                key={v.id}
                className="planilla__fila planilla__fila--link"
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
                <span className="planilla__celda planilla__celda--num col-num">{i + 1})</span>
                <span className="planilla__celda celda-fecha">
                  <span className="planilla__fecha tabular">{fmtFecha(v.fecha)}</span>
                  {i === 0 && <span className="badge-ultima">Última</span>}
                </span>
                <span className="planilla__celda">
                  <span className="planilla__texto planilla__tipo">{v.tipoAplicacion}</span>
                </span>
                <span className="planilla__celda col-color">
                  <span className="planilla__texto">{v.colorObtenido}</span>
                </span>
                <span className="planilla__celda col-nota">
                  <span className={`planilla__texto ${v.nota ? '' : 'muted'}`}>{v.nota || 'Sin nota'}</span>
                </span>
                <span className="planilla__celda planilla__celda--centro">
                  <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" />
                </span>
              </div>
            ))}
            <div className="planilla__pie">
              <strong>De la más reciente a la más antigua</strong>
              <span>Tocá una fila para ver la visita completa</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
