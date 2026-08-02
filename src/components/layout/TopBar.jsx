import AppMenu from './AppMenu'
import logoUrl from '../../img/LOGOESMERALDAS.png'

// Barra superior. Si se pasa onBack, muestra el botón de volver; si se pasa
// menu, muestra el botón de menú (hamburguesa) — son mutuamente excluyentes
// en la práctica (volver = estás en un drill-down; menú = estás en la raíz).
// showLogo agrega el isotipo del salón a la derecha; bigTitle agranda el título.
export default function TopBar({ title, subtitle, onBack, menu, right, showLogo, bigTitle }) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="topbar__back" onClick={onBack} aria-label="Volver">
          ←
        </button>
      )}
      {menu && <AppMenu />}
      <div className="topbar__titlewrap">
        <h1 className={`topbar__title ${bigTitle ? 'topbar__title--lg' : ''}`}>{title}</h1>
        {subtitle && <div className="topbar__subtitle">{subtitle}</div>}
      </div>
      <div className="topbar__spacer" />
      {right}
      {showLogo && (
        <div className="topbar__logo">
          <img src={logoUrl} alt="Esmeraldas Salón & Spa" />
        </div>
      )}
    </header>
  )
}
