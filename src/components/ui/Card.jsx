// Contenedor tipo tarjeta reutilizable.
export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}

// Muestra un par etiqueta / valor en modo lectura (usado en el detalle).
// style: para ubicaciones puntuales dentro de un grid (ver "Amonio" en
// VisitaDetalleModal.jsx, que ocupa el ancho completo de la fila).
// icon: ícono decorativo (lucide-react) antes de la etiqueta — opcional,
// sin efecto en los usos que no lo pasan.
export function Dato({ label, children, style, icon }) {
  return (
    <div className="dato" style={style}>
      <div className="dato__k">
        {icon && (
          <span className="dato__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </div>
      <div className="dato__v">{children || <span className="muted">—</span>}</div>
    </div>
  )
}
