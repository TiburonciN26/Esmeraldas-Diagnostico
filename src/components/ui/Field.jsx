// Componentes de formulario reutilizables (se usan aquí y en el modal de visita).

import { useLayoutEffect, useRef, useState } from 'react'

// Envoltura etiqueta + control + error/hint.
// required agrega un asterisco (convención visual para todos los formularios
// de la app: todo campo obligatorio debe marcarse así en su label).
export function Field({ label, error, hint, children, htmlFor, required }) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
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
      {error && (
        <div className="field__error" id={errorId} role="alert">
          {error}
        </div>
      )}
      {hint && !error && <div className="field__hint">{hint}</div>}
    </div>
  )
}

// Input de texto / fecha / número. Cuando hay error y el campo tiene id,
// se conecta aria-invalid + aria-describedby al mensaje que pinta Field
// (mismo id: `${id}-error`) — sin esto, el error se ve pero un lector de
// pantalla no lo asocia con el campo ni lo anuncia.
export function TextInput({ error, id, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`input ${error ? 'input--error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...props}
    />
  )
}

// Input que arranca angosto (ancho de "minChars" caracteres) y crece con
// el contenido en vez de ocupar todo el ancho disponible — para campos
// cortos (fórmula, oxígeno, tiempo) que en 100% width dejan espacio vacío
// y no entran 3 juntos en una fila. Mide el texto con un <span> espejo
// (mismo padding/fuente que .input, position:absolute así no afecta el
// layout) en vez de depender de field-sizing: content, que todavía no
// anda parejo en todos los navegadores — clave acá porque esta app se usa
// sobre todo desde el celular.
export function AutoGrowInput({ minChars = 10, error, id, className = '', value, ...props }) {
  const mirrorRef = useRef(null)
  const [width, setWidth] = useState(null)

  useLayoutEffect(() => {
    if (mirrorRef.current) setWidth(mirrorRef.current.offsetWidth)
  }, [value])

  return (
    <span className="autogrow">
      <span ref={mirrorRef} className="autogrow__mirror" aria-hidden="true">
        {value || ''}
      </span>
      <input
        id={id}
        className={`input ${error ? 'input--error' : ''} ${className}`}
        style={{ width: width ? `${width}px` : undefined, minWidth: `${minChars}ch` }}
        value={value}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      />
    </span>
  )
}

// Área de texto.
export function TextArea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`} {...props} />
}

// Select con opciones. options: array de strings o {value,label}.
export function Select({ options = [], placeholder, error, id, className = '', ...props }) {
  return (
    <select
      id={id}
      className={`select ${error ? 'select--error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...props}
    >
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
