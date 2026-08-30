import AppMenu from './AppMenu'
import logoUrl from '../../img/LOGOESMERALDAS.png'

// Barra superior — hoy es el único cabezal de la app (ver App.jsx), fijo,
// no cambia al navegar entre Home y Detalle de cliente. showLogo agrega el
// isotipo del salón a la derecha; bigTitle agranda el título.
export default function TopBar({ title, menu, showLogo, bigTitle }) {
  return (
    <header className="topbar">
      {menu && <AppMenu />}
      <div className="topbar__titlewrap">
        <h1 className={`topbar__title ${bigTitle ? 'topbar__title--lg' : ''}`}>{title}</h1>
      </div>
      <div className="topbar__spacer" />
      {showLogo && (
        <div className="topbar__logo">
          <img src={logoUrl} alt="Esmeraldas Salón & Spa" />
        </div>
      )}
    </header>
  )
}
