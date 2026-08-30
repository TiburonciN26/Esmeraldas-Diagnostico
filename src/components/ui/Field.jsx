// Componentes de formulario reutilizables (se usan aquí y en el modal de visita).

import { useLayoutEffect, useRef, useState } from 'react'

// Envoltura etiqueta + control + error/hint.
// required no pinta nada en el label (se sacó el asterisco a pedido: "estorbaba"
// en la interfaz) — el campo sigue siendo obligatorio igual, la validación de
// cada modal no depende de esto en absoluto. Se deja el prop porque los
// componentes que llaman a Field siguen pasándolo (documenta intención en el
// código de cada modal) aunque ya no tenga efecto visual.
// labelExtra pinta algo (ej. un toggle de íconos) al otro extremo de la
// fila de la etiqueta, sin tocar el resto del campo — ver "Tipo de
// aplicación" en VisitaModal.jsx.
// icon: ícono decorativo (lucide-react) antes del texto de la etiqueta —
// puramente visual, no cambia el nombre/texto del campo.
export function Field({ label, error, hint, children, htmlFor, required, labelExtra, icon }) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
  return (
    <div className="field">
      {label && (
        <div className={`field__label-row ${labelExtra ? 'field__label-row--extra' : ''}`}>
          <label className="field__label" htmlFor={htmlFor}>
            {icon && (
              <span className="field__icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {label}
          </label>
          {labelExtra}
        </div>
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
// cortos (fórmula, tiempo) que en 100% width dejan espacio vacío y no
// entran 3 juntos en una fila. Mide el texto con un <span> espejo (mismo
// padding/fuente que .input, position:absolute así no afecta el layout)
// en vez de depender de field-sizing: content, que todavía no anda parejo
// en todos los navegadores — clave acá porque esta app se usa sobre todo
// desde el celular.
//
// anchoResponsivo: en vez del "minChars" fijo de siempre (inline, no se
// puede pisar por CSS), pasa el valor como variable CSS y deja que
// .input--ancho-responsivo (ver index.css) le sume unos caracteres extra
// en tablet/desktop — para campos donde interesa que arranquen más anchos
// en pantallas grandes, sin tocar el mínimo en celular.
//
// crecer: en tablet/desktop (ver .autogrow--crece en index.css), en vez de
// medirse por el contenido, ocupa TODO el espacio libre de la fila — para
// el campo Fórmula, que si no queda angosto y fijo aunque el modal sea
// ancho, mientras el resto de la fila (Oxígeno, Tiempo, que sí son cortos
// a propósito) se ve bien compacta. En celular no cambia nada: sigue
// midiéndose por contenido, que es lo que hace falta cuando el espacio
// escasea.
export function AutoGrowInput({
  minChars = 10,
  error,
  id,
  className = '',
  value,
  anchoResponsivo,
  crecer,
  ...props
}) {
  const mirrorRef = useRef(null)
  const [width, setWidth] = useState(null)

  useLayoutEffect(() => {
    if (mirrorRef.current) setWidth(mirrorRef.current.offsetWidth)
  }, [value])

  const estiloAncho = anchoResponsivo
    ? { '--autogrow-min-chars': minChars }
    : { minWidth: `${minChars}ch` }

  return (
    <span className={`autogrow ${crecer ? 'autogrow--crece' : ''}`}>
      <span ref={mirrorRef} className="autogrow__mirror" aria-hidden="true">
        {value || ''}
      </span>
      <input
        id={id}
        className={`input ${anchoResponsivo ? 'input--ancho-responsivo' : ''} ${crecer ? 'input--crece' : ''} ${error ? 'input--error' : ''} ${className}`}
        style={{ width: width ? `${width}px` : undefined, ...estiloAncho }}
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
//
// Antes difuminaba el fondo (clase "select-activo" en <body>) mientras la
// lista nativa estaba desplegada. Se sacó: cerrar la lista con Escape o con
// un clic afuera no siempre disparaba "blur"/"change" de forma confiable
// (dependía del navegador), así que el difuminado a veces quedaba pegado en
// pantalla después de que la lista ya se había cerrado. Más simple no
// tener el efecto que perseguir cada caso borde de cuándo se cierra un
// <select> nativo, algo que ningún navegador expone de forma confiable.
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
