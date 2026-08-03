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
export function Dato({ label, children, style }) {
  return (
    <div className="dato" style={style}>
      <div className="dato__k">{label}</div>
      <div className="dato__v">{children || <span className="muted">—</span>}</div>
    </div>
  )
}
