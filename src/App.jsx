import { useApp, VIEWS } from './context/AppContext'
import Home from './pages/Home'
import ClienteDetalle from './pages/ClienteDetalle'
import ClienteModal from './components/clientes/ClienteModal'
import VisitaModal from './components/visitas/VisitaModal'
import VisitaDetalleModal from './components/visitas/VisitaDetalleModal'

// Router simple basado en el view-state del contexto (sin librería de routing).
export default function App() {
  const { view } = useApp()

  return (
    <div className="app-shell">
      {view === VIEWS.DETALLE ? <ClienteDetalle /> : <Home />}

      {/* Modales globales: se controlan por estado en el contexto */}
      <ClienteModal />
      <VisitaModal />
      <VisitaDetalleModal />
    </div>
  )
}
