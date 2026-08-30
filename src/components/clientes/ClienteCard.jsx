import { Cake, MessageCircle, History } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { buildWhatsappLink } from '../../utils/whatsapp'
import { esCumpleanosHoy } from '../../utils/date'
import { fmtFecha } from '../../utils/format'

// Card de cliente en el Home.
// - Clic en el cuerpo -> onOpen (navega al detalle, donde viven Editar/Eliminar)
// - Botón WhatsApp -> acción propia (con stopPropagation)
export default function ClienteCard({ cliente, onOpen }) {
  const { prefetchClienteDetalle } = useApp()
  const waLink = buildWhatsappLink(cliente.telefono)
  const esCumple = esCumpleanosHoy(cliente.fechaCumpleanos)
  // cantidadVisitas/ultimaVisitaFecha: agregados recalculados en el
  // backend cada vez que se crea/edita/borra una visita (ver
  // recalcularAgregadosDeCliente_ en Code.gs) — no hay que leer el
  // historial completo acá.
  const cantidadVisitas = Number(cliente.cantidadVisitas) || 0

  const handleWhatsapp = (e) => {
    e.stopPropagation()
    if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  const abrir = () => onOpen(cliente.id)

  // pointerdown (dedo apoyado / botón apretado) llega bastante antes que el
  // click que efectivamente navega — adelantar acá el pedido del detalle le
  // gana ese tiempo a una request que tarda varios segundos.
  const prefetch = () => prefetchClienteDetalle(cliente.id)

  // La tarjeta entera es el disparador (no solo el texto), así que se
  // expone como un botón real para teclado/lector de pantalla: sin esto,
  // un div con onClick es completamente inoperable sin mouse.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      abrir()
    }
  }

  return (
    <Card
      className={`cliente-card ${esCumple ? 'cliente-card--cumple' : ''}`}
      onClick={abrir}
      onPointerDown={prefetch}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ficha de ${cliente.nombreCompleto}`}
      onKeyDown={handleKeyDown}
    >
      <div className="cliente-card__nombre-fila">
        <span className="cliente-card__nombre">{cliente.nombreCompleto}</span>
        <span
          className="cliente-card__contador"
          title={`${cantidadVisitas} ${cantidadVisitas === 1 ? 'visita' : 'visitas'}`}
        >
          <History size={11} strokeWidth={2.5} />
          {cantidadVisitas}
        </span>
      </div>

      <div className="cliente-card__acciones">
        <div className="cliente-card__fecha">
          <span>{cliente.ultimaVisitaFecha ? fmtFecha(cliente.ultimaVisitaFecha) : 'Sin visitas'}</span>
        </div>
        {esCumple && (
          <span className="cumple-badge" title="¡Hoy es su cumpleaños! 🎉">
            <Cake size={16} strokeWidth={2.25} />
          </span>
        )}
        <Button
          variant="whatsapp"
          size="sm"
          icon
          aria-label="Abrir chat de WhatsApp"
          title="Abrir chat de WhatsApp"
          disabled={!waLink}
          onClick={handleWhatsapp}
        >
          <MessageCircle size={16} strokeWidth={2.25} />
        </Button>
      </div>
    </Card>
  )
}
