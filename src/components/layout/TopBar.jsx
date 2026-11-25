import AppMenu from './AppMenu'
import logoUrl from '../../img/LOGOESMERALDAS.png'

// Encabezado de la hoja — único y persistente (no cambia al navegar entre
// Home y la ficha de un cliente, ver App.jsx). Estilo cuaderno: menú +
// logo + rótulo a la izquierda, título grande en mayúsculas a la derecha.
export default function TopBar({ title, menu }) {
  return (
    <header className="topbar">
      <div className="topbar__marca">
        {menu && <AppMenu />}
        <div className="topbar__logo">
          <img src={logoUrl} alt="Esmeraldas Salón & Spa" />
        </div>
      </div>
      <div className="topbar__spacer" />
      <h1 className="topbar__title">{title}</h1>
    </header>
  )
}
