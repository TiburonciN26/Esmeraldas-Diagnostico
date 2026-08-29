import { useEffect, useId, useRef, useState } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Duración de la animación de salida (modal-out en index.css) — el timer
// de acá y el keyframe de ahí tienen que coincidir para que el modal no
// desaparezca de golpe a mitad de la animación ni deje un salto al final.
const EXIT_MS = 180

// Modal reutilizable.
// - Cierra con la tecla Escape y con clic en el fondo (overlay).
// - Atrapa el Tab adentro (sin esto, Tab se escapa al contenido de fondo)
//   y al cerrarse devuelve el foco a quien lo abrió.
// - "open" controla el ciclo de vida completo: el propio Modal decide
//   cuándo desmontarse (después de la animación de salida), en vez de que
//   el padre lo desmonte de golpe apenas cambia su estado — por eso los
//   componentes que lo usan pasan open={open} y SIEMPRE renderizan
//   <Modal>, sin envolverlo en "{open && <Modal>...}".
// - headerIcon/subtitle son opcionales — sin ellos el header se ve
//   exactamente igual que siempre (solo título + botón cerrar), así que
//   no afectan a ningún otro modal de la app que no los pase (por ahora
//   solo VisitaModal.jsx los usa, para el encabezado con ícono).
// - arriba (opcional, alternativa a "centered"): en vez de centrarlo
//   verticalmente, lo pega cerca del borde superior y lo ensancha — hoy
//   solo VisitaModal.jsx lo usa (formulario largo con muchos campos, deja
//   espacio abajo para que el teclado del celular no tape el formulario al
//   escribir). Ningún otro modal lo pasa, así que no cambia para ellos.
export default function Modal({ open, title, subtitle, headerIcon, onClose, children, footer, centered, arriba }) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)
  const modalRef = useRef(null)
  const previouslyFocused = useRef(null)
  const exitTimerRef = useRef(null)
  const titleId = useId()

  // Ref en vez de depender de "onClose" directo en el efecto de abajo: los
  // componentes que usan Modal pasan un onClose nuevo (una arrow function)
  // en CADA render — sin este indirect, tipear una letra en un campo (que
  // re-renderiza el formulario) recreaba el efecto entero, incluido
  // modalRef.current.focus(), robándole el foco al input en cada tecla.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Transición open -> rendered/closing.
  useEffect(() => {
    if (open) {
      clearTimeout(exitTimerRef.current)
      setRendered(true)
      setClosing(false)
    } else if (rendered) {
      setClosing(true)
      exitTimerRef.current = setTimeout(() => {
        setRendered(false)
        setClosing(false)
      }, EXIT_MS)
    }
    return () => clearTimeout(exitTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Foco/teclado/scroll: activos mientras el modal está en el DOM (incluida
  // la animación de salida), y se limpian recién cuando termina de
  // desmontarse — si restauráramos el scroll del fondo apenas se pide
  // cerrar, el contenido de atrás saltaría en medio de la animación.
  useEffect(() => {
    if (!rendered) return

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Guarda quién tenía el foco para devolvérselo al cerrar, y mueve el
    // foco al contenedor del modal (no a un campo específico) para que el
    // lector de pantalla anuncie el diálogo apenas se abre.
    previouslyFocused.current = document.activeElement
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [rendered])

  if (!rendered) return null

  return (
    <div
      className={`modal-overlay ${centered ? 'modal-overlay--centered' : ''} ${
        arriba ? 'modal-overlay--arriba' : ''
      } ${closing ? 'modal-overlay--closing' : ''}`}
      onMouseDown={onClose}
    >
      <div
        ref={modalRef}
        className={`modal ${centered ? 'modal--centered' : ''} ${arriba ? 'modal--arriba' : ''} ${
          closing ? 'modal--closing' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`modal__header ${headerIcon ? 'modal__header--icon' : ''}`}>
          {headerIcon && <div className="modal__header-icon">{headerIcon}</div>}
          <div className="modal__header-text">
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle && <div className="modal__subtitle">{subtitle}</div>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
