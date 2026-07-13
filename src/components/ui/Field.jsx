// Componentes de formulario reutilizables (se usan aquí y en el modal de visita).

// Envoltura etiqueta + control + error/hint.
// required agrega un asterisco (convención visual para todos los formularios
// de la app: todo campo obligatorio debe marcarse así en su label).
export function Field({ label, error, hint, children, htmlFor, required }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error && <div className="field__error">{error}</div>}
      {hint && !error && <div className="field__hint">{hint}</div>}
    </div>
  )
}

// Input de texto / fecha / número.
export function TextInput({ error, className = '', ...props }) {
  return <input className={`input ${error ? 'input--error' : ''} ${className}`} {...props} />
}

// Área de texto.
export function TextArea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`} {...props} />
}

// Select con opciones. options: array de strings o {value,label}.
export function Select({ options = [], placeholder, error, className = '', ...props }) {
  return (
    <select className={`select ${error ? 'select--error' : ''} ${className}`} {...props}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const value = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

// Grupo segmentado tipo Sí / No (o cualquier lista corta de opciones).
export function Segmented({ options = [], value, onChange, name }) {
  return (
    <div className="segmented" role="group" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`segmented__btn ${value === opt ? 'segmented__btn--active' : ''}`}
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
