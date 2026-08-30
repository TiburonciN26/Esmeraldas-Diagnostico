import { useApp, VIEWS } from './context/AppContext'
import Home from './pages/Home'
import ClienteDetalle from './pages/ClienteDetalle'
import ClienteModal from './components/clientes/ClienteModal'
import VisitaModal from './components/visitas/VisitaModal'
import VisitaDetalleModal from './components/visitas/VisitaDetalleModal'
import TopBar from './components/layout/TopBar'

// Router simple basado en el view-state del contexto (sin librería de routing).
export default function App() {
  const { view } = useApp()

  return (
    <div className="app-shell">
      {/* Único cabezal de la app: fijo, no cambia al entrar/salir del
          detalle de un cliente (antes cada pantalla traía el suyo propio,
          y el menú/logo desaparecían y volvían a aparecer de golpe al
          navegar — quedaba confuso). ClienteDetalle.jsx ya no trae ningún
          cabezal propio; "volver" vive ahí como botón flotante. */}
      <TopBar title="Clientes" bigTitle showLogo menu />

      {view === VIEWS.DETALLE ? <ClienteDetalle /> : <Home />}

      {/* Modales globales: se controlan por estado en el contexto */}
      <ClienteModal />
      <VisitaModal />
      <VisitaDetalleModal />
    </div>
  )
}
