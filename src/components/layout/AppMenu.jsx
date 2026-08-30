import { useEffect, useRef, useState } from 'react'
import { Menu, Users, LogOut, Sun, Moon, CircleUserRound } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { temaActual, aplicarTema } from '../../utils/theme'
import { comprimirImagen } from '../../utils/image'

// Menú desplegable del header (botón "hamburguesa"). Tiene "Clientes"
// (única sección de la app), el toggle de modo oscuro/claro, y "Cerrar
// sesión" — antes vivía como un botón suelto en el header de Home; se
// pensó como menú para poder sumar más opciones más adelante sin ensuciar
// el header de íconos.
export default function AppMenu() {
  const [open, setOpen] = useState(false)
  // Estado propio (no contexto): el tema es un atributo de <html>, no algo
  // que otro componente de la app necesite leer — alcanza con que ESTE
  // botón sepa qué mostrar. Se inicializa leyendo el atributo real en vez
  // de asumir 'light', porque main.jsx ya lo aplicó (guardado o del
  // sistema) antes de que este componente exista.
  const [tema, setTema] = useState(temaActual)
  const wrapRef = useRef(null)
  const { goHome } = useApp()
  const { session, logout, actualizarFoto } = useSession()
  const confirmar = useConfirm()
  const toast = useToast()
  const [subiendoFoto, setSubiendoFoto] = useState(false)

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

  // No cierra el desplegable (a diferencia de las otras opciones): a
  // pedido, para poder mirar el resultado del cambio de tema sin tener
  // que reabrir el menú.
  const handleToggleTema = () => {
    const nuevo = tema === 'dark' ? 'light' : 'dark'
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  // Sube la foto al backend (columna "foto" en la pestaña "usuario", ver
  // SessionContext.jsx) — así se ve igual en cualquier navegador/dispositivo
  // donde se loguee esta cuenta, no solo en el que la subió.
  const handleFotoPerfil = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const dataUrl = await comprimirImagen(file, { maxDim: 256, calidad: 0.8 })
      await actualizarFoto(dataUrl)
    } catch (err) {
      console.error('Error subiendo la foto de perfil:', err)
      toast('No se pudo subir la foto. Probá de nuevo.')
    } finally {
      setSubiendoFoto(false)
    }
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
          <div className="app-menu__perfil">
            <div className="app-menu__avatar">
              {session?.foto ? (
                <img src={session.foto} alt="" className="app-menu__avatar-img" />
              ) : (
                <CircleUserRound size={34} strokeWidth={1.5} />
              )}
            </div>
            <div className="app-menu__perfil-texto">
              <div className="app-menu__perfil-nombre">{session?.nombre}</div>
              {session?.rol && <div className="app-menu__perfil-rol">{session.rol}</div>}
            </div>
          </div>
          <input
            type="file"
            id="app-menu-foto"
            accept="image/*"
            className="sr-only"
            onChange={handleFotoPerfil}
            disabled={subiendoFoto}
          />
          <label htmlFor="app-menu-foto" className="app-menu__foto-boton">
            {subiendoFoto ? 'Subiendo…' : 'Cargar foto'}
          </label>

          <div className="app-menu__separador" role="separator" />

          <button type="button" className="app-menu__item" role="menuitem" onClick={handleClientes}>
            <Users size={16} strokeWidth={2.25} />
            Clientes
          </button>
          <button
            type="button"
            className="app-menu__item"
            role="menuitemcheckbox"
            aria-checked={tema === 'dark'}
            onClick={handleToggleTema}
          >
            <span className="app-menu__tema-icono" key={`icono-${tema}`}>
              {tema === 'dark' ? <Sun size={16} strokeWidth={2.25} /> : <Moon size={16} strokeWidth={2.25} />}
            </span>
            <span className="app-menu__tema-texto" key={`texto-${tema}`}>
              {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </span>
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
