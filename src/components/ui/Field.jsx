// Componentes de formulario reutilizables (se usan aquí y en el modal de visita).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Envoltura etiqueta + control + error/hint.
// required agrega un asterisco (convención visual para todos los formularios
// de la app: todo campo obligatorio debe marcarse así en su label).
// labelExtra pinta algo (ej. un toggle de íconos) al otro extremo de la
// fila de la etiqueta, sin tocar el resto del campo — ver "Tipo de
// aplicación" en VisitaModal.jsx.
export function Field({ label, error, hint, children, htmlFor, required, labelExtra }) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
  return (
    <div className="field">
      {label && (
        <div className={`field__label-row ${labelExtra ? 'field__label-row--extra' : ''}`}>
          <label className="field__label" htmlFor={htmlFor}>
            {label}
            {required && (
              <span className="field__required" aria-hidden="true">
                {' '}
                *
              </span>
            )}
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
// Mientras la lista nativa está desplegada, agrega "select-activo" a <body>
// (ver index.css: oscurece y difumina el fondo para que la lista resalte).
// No usa "focus" para abrir el difuminado (versión anterior) porque el foco
// se queda en el <select> aunque la lista esté cerrada — un Tab hasta el
// campo, o pasar a otra opción con las flechas (que en la mayoría de los
// navegadores de escritorio cambia el valor SIN desplegar nada), prendía el
// difuminado sin que hubiera ninguna lista visible.
//
// Abre con "mousedown" (clic/touch, dispara siempre, antes de que el
// navegador muestre la lista) y con las teclas que realmente despliegan un
// <select> nativo (Enter/Espacio, F4, Alt+Flecha — las flechas SOLAS no
// entran a propósito, ver arriba).
//
// Cierra con "change" (cambió el valor) y "blur" (se fue el foco). Se
// evaluó también cerrar con "click" (en teoría se dispara recién cuando la
// lista nativa termina de cerrarse, cambie o no el valor — cubriría el caso
// de reelegir la MISMA opción, que con solo "change" deja el difuminado
// pegado hasta que el foco se vaya por otro lado) pero se descartó: no hay
// forma confiable de comprobar que el navegador lo dispare recién al
// cerrarse el desplegable nativo (que bloquea la página mientras está
// abierto) en vez de al abrirlo, y arriesgar que el difuminado se apague
// solo un instante después de abrirse es peor que dejar este caso puntual
// sin resolver.
//
// abiertoRef + el efecto de limpieza al desmontar arreglan el bug más serio:
// si el <select> desaparece del DOM con la lista "abierta" según nuestro
// propio registro (p.ej. Escape cierra el modal entero y no solo la lista),
// nunca llega a disparar blur -> sin este cleanup, el difuminado quedaba
// pegado en <body> para siempre, cubriendo TODA la app, sin ningún modal ni
// lista realmente abiertos, sin forma de recuperarse salvo recargar.
function esTeclaDeApertura(e) {
  if (e.key === 'Enter' || e.key === ' ') return true
  if (e.key === 'F4') return true
  if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) return true
  return false
}

export function Select({
  options = [],
  placeholder,
  error,
  id,
  className = '',
  onFocus,
  onBlur,
  onChange,
  onMouseDown,
  onKeyDown,
  ...props
}) {
  // Ref (no state): solo lo leen los handlers de esta misma instancia, no
  // hace falta re-render. Guarda si ESTE select fue quien prendió el
  // difuminado, para que su cleanup al desmontarse no le apague el
  // difuminado a otro select que lo tenga activo por su cuenta.
  const abiertoRef = useRef(false)

  const abrir = () => {
    abiertoRef.current = true
    document.body.classList.add('select-activo')
  }
  const cerrar = () => {
    abiertoRef.current = false
    document.body.classList.remove('select-activo')
  }

  useEffect(() => {
    return () => {
      if (abiertoRef.current) document.body.classList.remove('select-activo')
    }
  }, [])

  return (
    <select
      id={id}
      className={`select ${error ? 'select--error' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      onMouseDown={(e) => {
        abrir()
        onMouseDown?.(e)
      }}
      onKeyDown={(e) => {
        if (esTeclaDeApertura(e)) abrir()
        onKeyDown?.(e)
      }}
      onFocus={onFocus}
      onBlur={(e) => {
        cerrar()
        onBlur?.(e)
      }}
      onChange={(e) => {
        cerrar()
        onChange?.(e)
      }}
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
