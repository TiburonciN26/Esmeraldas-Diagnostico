import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  getClienteById,
  getDiagnosticoByClienteId,
  getVisitasByClienteId,
  deleteCliente,
} from '../services'
import TopBar from '../components/layout/TopBar'
import Card, { Dato } from '../components/ui/Card'
import Button from '../components/ui/Button'

// Formatea precio como moneda simple.
function fmtPrecio(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : `$${n.toLocaleString('es-AR')}`
}

export default function ClienteDetalle() {
  const {
    selectedClienteId,
    goHome,
    refreshTick,
    refresh,
    openEditarCliente,
    openNuevaVisita,
    openVerVisita,
  } = useApp()

  const [cliente, setCliente] = useState(null)
  const [diagnostico, setDiagnostico] = useState(null)
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    Promise.all([
      getClienteById(selectedClienteId),
      getDiagnosticoByClienteId(selectedClienteId),
      getVisitasByClienteId(selectedClienteId),
    ]).then(([c, d, v]) => {
      if (!vivo) return
      setCliente(c)
      setDiagnostico(d)
      setVisitas(v)
      setLoading(false)
    })
    return () => {
      vivo = false
    }
  }, [selectedClienteId, refreshTick])

  const handleEditCliente = () => openEditarCliente(selectedClienteId)
  const handleNuevaVisita = () => openNuevaVisita(selectedClienteId)
  const handleVerVisita = (visita) => openVerVisita(visita.id)

  const handleDeleteCliente = async () => {
    const ok = window.confirm(
      `¿Eliminar a ${cliente.nombreCompleto}? (se puede recuperar, es un borrado suave)`
    )
    if (!ok) return
    await deleteCliente(selectedClienteId)
    refresh()
    goHome()
  }

  if (loading) {
    return (
      <>
        <TopBar title="Cliente" onBack={goHome} />
        <div className="loading">Cargando…</div>
      </>
    )
  }

  if (!cliente) {
    return (
      <>
        <TopBar title="Cliente" onBack={goHome} />
        <div className="empty">
          <div className="empty__emoji">🤔</div>
          <p>No se encontró el cliente.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={cliente.nombreCompleto}
        subtitle="Detalle de cliente"
        onBack={goHome}
        right={
          <>
            <Button variant="danger" size="sm" onClick={handleDeleteCliente}>
              🗑️ Eliminar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleEditCliente}>
              ✏️ Editar
            </Button>
          </>
        }
      />

      {/* Tarjetas 1 y 2: cliente + diagnóstico (lado a lado en desktop) */}
      <div className="detalle-top-grid">
        <Card>
          <div className="card__label">Datos del cliente</div>
          <div className="dato-grid dato-grid--split">
            <Dato label="Nombre completo">{cliente.nombreCompleto}</Dato>
            <Dato label="Teléfono">{cliente.telefono}</Dato>
            <Dato label="Cumpleaños">{cliente.fechaCumpleanos}</Dato>
          </div>
        </Card>

        <Card>
          <div className="card__label">Diagnóstico</div>
          {diagnostico ? (
            <div className="dato-grid dato-grid--split">
              <Dato label="Canas resistentes">{diagnostico.canasResistentes}</Dato>
              <Dato label="Alisado/keratina previa">{diagnostico.alisadoOKeratinaPrevia}</Dato>
              {diagnostico.alisadoOKeratinaPrevia === 'Sí' && (
                <Dato label="Fecha alisado/keratina">{diagnostico.fechaAlisadoOKeratina}</Dato>
              )}
              <Dato label="Grosor del cabello">{diagnostico.grosorCabello}</Dato>
            </div>
          ) : (
            <p className="muted">Sin diagnóstico cargado.</p>
          )}
        </Card>
      </div>

      {/* Tarjeta 3: visitas */}
      <Card>
        <div className="card__header">
          <h2>Visitas</h2>
          <Button variant="primary" size="sm" onClick={handleNuevaVisita}>
            + Nueva visita
          </Button>
        </div>

        {visitas.length === 0 ? (
          <p className="muted">Este cliente todavía no tiene visitas registradas.</p>
        ) : (
          <div className="visitas-wrap">
            <table className="visitas-table">
              <thead>
                <tr>
                  <th>Tipo de aplicación</th>
                  <th>Precio</th>
                  <th>Fecha</th>
                  <th className="col-desktop">Decoloración — etapa</th>
                  <th className="col-desktop">Fórmula raíz</th>
                  <th className="col-desktop">Oxidante raíz</th>
                  <th className="col-desktop">Tiempo raíz</th>
                  <th className="col-desktop">Fórmula medios a puntas</th>
                  <th className="col-desktop">Oxidante medios a puntas</th>
                  <th className="col-desktop">Tiempo medios a puntas</th>
                  <th className="col-desktop">Color obtenido</th>
                  <th className="col-desktop">% Canas</th>
                  <th className="col-desktop">Largo</th>
                  <th className="col-desktop">Nota</th>
                  <th className="col-desktop">Foto</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v) => (
                  <tr key={v.id} onClick={() => handleVerVisita(v)}>
                    <td>{v.tipoAplicacion}</td>
                    <td>{fmtPrecio(v.precio)}</td>
                    <td>{v.fecha}</td>
                    <td className="col-desktop">{v.decoloracionEtapa}</td>
                    <td className="col-desktop">{v.formulaRaiz}</td>
                    <td className="col-desktop">{v.oxidanteRaiz}</td>
                    <td className="col-desktop">{v.tiempoRaiz}</td>
                    <td className="col-desktop">{v.formulaMediosAPuntas}</td>
                    <td className="col-desktop">{v.oxidanteMediosAPuntas}</td>
                    <td className="col-desktop">{v.tiempoMediosAPuntas}</td>
                    <td className="col-desktop">{v.colorObtenido}</td>
                    <td className="col-desktop">{v.porcentajeCanas ? `${v.porcentajeCanas}%` : ''}</td>
                    <td className="col-desktop">{v.largoCabello}</td>
                    <td className="col-desktop col-nota" title={v.nota}>
                      {v.nota}
                    </td>
                    <td className="col-desktop col-foto">
                      {v.fotoResultado ? (
                        <img className="col-foto__thumb" src={v.fotoResultado} alt="Resultado" />
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
