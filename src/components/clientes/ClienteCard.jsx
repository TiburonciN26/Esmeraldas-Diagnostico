import { Phone, Cake, MessageCircle } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { buildWhatsappLink } from '../../utils/whatsapp'
import { esCumpleanosHoy } from '../../utils/date'

// Devuelve las iniciales para el avatar.
function iniciales(nombre = '') {
  const parts = nombre.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Card de cliente en el Home.
// - Clic en el cuerpo -> onOpen (navega al detalle, donde viven Editar/Eliminar)
// - Botón WhatsApp -> acción propia (con stopPropagation)
export default function ClienteCard({ cliente, onOpen }) {
  const { prefetchClienteDetalle } = useApp()
  const waLink = buildWhatsappLink(cliente.telefono)
  const esCumple = esCumpleanosHoy(cliente.fechaCumpleanos)

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
      <div className="cliente-card__avatar">{iniciales(cliente.nombreCompleto)}</div>

      <div className="cliente-card__info">
        <div className="cliente-card__nombre">{cliente.nombreCompleto}</div>
        <div className="cliente-card__tel">
          <Phone size={13} strokeWidth={2.25} />
          <span>{cliente.telefono || 'Sin teléfono'}</span>
        </div>
      </div>

      <div className="cliente-card__acciones">
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
