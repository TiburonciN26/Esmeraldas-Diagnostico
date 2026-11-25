import { Cake, MessageCircle, History } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { buildWhatsappLink } from '../../utils/whatsapp'
import { esCumpleanosHoy } from '../../utils/date'
import { fmtFecha } from '../../utils/format'

// Fila de un cliente en la planilla del Home (estilo cuaderno).
// - Clic en la fila -> onOpen (navega a la ficha, donde viven Editar/Eliminar)
// - Botón WhatsApp -> acción propia (con stopPropagation)
export default function ClienteCard({ cliente, numero, onOpen }) {
  const { prefetchClienteDetalle } = useApp()
  const waLink = buildWhatsappLink(cliente.telefono)
  const esCumple = esCumpleanosHoy(cliente.fechaCumpleanos)
  // cantidadVisitas/ultimaVisitaFecha: agregados que ya vienen calculados
  // del backend (ver recalcularAgregadosDeCliente_ en Code.gs).
  const cantidadVisitas = Number(cliente.cantidadVisitas) || 0
  const ultima = cliente.ultimaVisitaFecha ? fmtFecha(cliente.ultimaVisitaFecha) : 'Sin visitas'

  const handleWhatsapp = (e) => {
    e.stopPropagation()
    if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  const abrir = () => onOpen(cliente.id)

  // pointerdown llega bastante antes que el click que navega — adelantar
  // acá el pedido de la ficha le gana ese tiempo a la request.
  const prefetch = () => prefetchClienteDetalle(cliente.id)

  // La fila entera es el disparador, así que se expone como un botón real
  // para teclado/lector de pantalla.
  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      abrir()
    }
  }

  return (
    <div
      className={`planilla__fila planilla__fila--link ${esCumple ? 'planilla__fila--cumple' : ''}`}
      onClick={abrir}
      onPointerDown={prefetch}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ficha de ${cliente.nombreCompleto}${esCumple ? ' (cumple años hoy)' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <span className="planilla__celda planilla__celda--num col-num">{numero})</span>

      <span className="planilla__celda celda-nombre">
        <span className="planilla__texto planilla__nombre">{cliente.nombreCompleto}</span>
        {esCumple && (
          <span className="badge-cumple">
            <Cake size={13} strokeWidth={2.25} aria-hidden="true" />
            Cumple hoy
          </span>
        )}
        <span className="celda-nombre__sub solo-movil">{ultima}</span>
      </span>

      <span className="planilla__celda col-tel tabular" style={{ color: 'var(--ink-2)' }}>
        <span className="planilla__texto">{cliente.telefono}</span>
      </span>

      <span
        className="planilla__celda planilla__celda--centro"
        title={`${cantidadVisitas} ${cantidadVisitas === 1 ? 'visita' : 'visitas'}`}
      >
        <History size={13} strokeWidth={2.5} className="icono-tenue" aria-hidden="true" />
        <span className="visitas-num">{cantidadVisitas}</span>
      </span>

      <span
        className="planilla__celda col-ultima tabular"
        style={{ color: cliente.ultimaVisitaFecha ? 'var(--ink-2)' : 'var(--ink-3)' }}
      >
        {ultima}
      </span>

      <span className="planilla__celda planilla__celda--centro">
        <button
          type="button"
          className="wa"
          aria-label={`Abrir WhatsApp de ${cliente.nombreCompleto}`}
          title="Abrir chat de WhatsApp"
          disabled={!waLink}
          onClick={handleWhatsapp}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <MessageCircle size={18} strokeWidth={2.25} />
        </button>
      </span>
    </div>
  )
}
