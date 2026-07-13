import { Phone, Cake } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
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
  const waLink = buildWhatsappLink(cliente.telefono)
  const esCumple = esCumpleanosHoy(cliente.fechaCumpleanos)

  const handleWhatsapp = (e) => {
    e.stopPropagation()
    if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card
      className={`cliente-card ${esCumple ? 'cliente-card--cumple' : ''}`}
      onClick={() => onOpen(cliente.id)}
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
          💬
        </Button>
      </div>
    </Card>
  )
}
