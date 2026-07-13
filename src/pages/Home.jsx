import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getClientes } from '../services'
import TopBar from '../components/layout/TopBar'
import ClienteCard from '../components/clientes/ClienteCard'
import Button from '../components/ui/Button'

export default function Home() {
  const { goDetalleCliente, refreshTick, openNuevoCliente } = useApp()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let vivo = true
    setLoading(true)
    getClientes().then((data) => {
      if (vivo) {
        setClientes(data)
        setLoading(false)
      }
    })
    return () => {
      vivo = false
    }
  }, [refreshTick])

  const handleNuevo = () => openNuevoCliente()

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(q) ||
        (c.telefono ?? '').toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

  return (
    <>
      <TopBar title="Clientes" bigTitle showLogo />

      {!loading && clientes.length > 0 && (
        <div className="search-bar">
          <Search size={16} className="search-bar__icon" />
          <input
            type="text"
            className="search-bar__input"
            placeholder="Buscar por nombre o teléfono…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando…</div>
      ) : clientes.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">💇‍♀️</div>
          <p>Todavía no hay clientes.</p>
          <Button variant="primary" onClick={handleNuevo}>
            + Agregar el primero
          </Button>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">🔍</div>
          <p>No se encontraron clientes para "{busqueda}".</p>
        </div>
      ) : (
        <div className="cliente-list">
          {clientesFiltrados.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} onOpen={goDetalleCliente} />
          ))}
        </div>
      )}

      <Button variant="primary" className="fab" onClick={handleNuevo}>
        + Nuevo cliente
      </Button>
    </>
  )
}
