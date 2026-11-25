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
      {/* La "hoja" del cuaderno sobre el escritorio (ver .hoja en
          index.css). Único cabezal de la app: fijo, no cambia al entrar/
          salir de la ficha de un cliente. "Volver" vive en la ficha. */}
      <div className="hoja">
        <TopBar
          title={
            <>
              Registro de
              <br />
              clientes
            </>
          }
          menu
        />

        {view === VIEWS.DETALLE ? <ClienteDetalle /> : <Home />}
      </div>

      {/* Modales globales: se controlan por estado en el contexto */}
      <ClienteModal />
      <VisitaModal />
      <VisitaDetalleModal />
    </div>
  )
}
