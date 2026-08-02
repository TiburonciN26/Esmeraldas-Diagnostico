import { useEffect, useRef, useState } from 'react'
import { Menu, Users, LogOut } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm } from '../../context/ConfirmContext'

// Menú desplegable del header (botón "hamburguesa"). Por ahora solo tiene
// "Clientes" (única sección de la app) y "Cerrar sesión" — antes vivía como
// un botón suelto en el header de Home; se pensó como menú para poder
// sumar más secciones más adelante sin ensuciar el header de íconos.
export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const { goHome } = useApp()
  const { session, logout } = useSession()
  const confirmar = useConfirm()

  // Cierra al hacer clic afuera o con Escape — mismo criterio que el resto
  // de los overlays de la app (Modal, ConfirmContext).
  useEffect(() => {
    if (!open) return
    const onClickFuera = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickFuera)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleClientes = () => {
    setOpen(false)
    goHome()
  }

  // Misma confirmación que antes (el botón cae justo donde caen los taps
  // accidentales en un celular).
  const handleLogout = async () => {
    setOpen(false)
    const ok = await confirmar('¿Cerrar sesión?')
    if (ok) logout()
  }

  return (
    <div className="app-menu" ref={wrapRef}>
      <button
        type="button"
        className="app-menu__trigger"
        aria-label="Abrir menú"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Menu size={20} strokeWidth={2.25} />
      </button>

      {open && (
        <div className="app-menu__dropdown" role="menu">
          <button type="button" className="app-menu__item" role="menuitem" onClick={handleClientes}>
            <Users size={16} strokeWidth={2.25} />
            Clientes
          </button>
          <button
            type="button"
            className="app-menu__item"
            role="menuitem"
            onClick={handleLogout}
            title={session?.nombre ? `Salir (${session.nombre})` : 'Salir'}
          >
            <LogOut size={16} strokeWidth={2.25} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
