// Contenedor tipo tarjeta reutilizable.
export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}

// Muestra un par etiqueta / valor en modo lectura (usado en el detalle).
export function Dato({ label, children }) {
  return (
    <div className="dato">
      <div className="dato__k">{label}</div>
      <div className="dato__v">{children || <span className="muted">—</span>}</div>
    </div>
  )
}
