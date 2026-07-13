import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getVisitaById, deleteVisita } from '../../services'
import { TIPO_SOLO_RAIZ, TIPOS_CON_DECOLORACION } from '../../data/constants'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Dato } from '../ui/Card'

function fmtPrecio(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : `$${n.toLocaleString('es-AR')}`
}

// Vista de solo lectura con TODOS los campos de una visita.
// Se abre al hacer clic en el cuerpo de una fila de la tabla de visitas.
export default function VisitaDetalleModal() {
  const { visitaView, closeVerVisita, openEditarVisita, refresh } = useApp()
  const { open, visitaId } = visitaView

  const [visita, setVisita] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let vivo = true
    setLoading(true)
    getVisitaById(visitaId).then((v) => {
      if (!vivo) return
      setVisita(v)
      setLoading(false)
    })
    return () => {
      vivo = false
    }
  }, [open, visitaId])

  if (!open) return null

  // Visibilidad de campos condicionales (misma lógica que el formulario).
  const mostrarMedios = visita && visita.tipoAplicacion !== TIPO_SOLO_RAIZ
  const mostrarDecoloracion = visita && TIPOS_CON_DECOLORACION.includes(visita.tipoAplicacion)

  const handleEditar = () => {
    closeVerVisita()
    openEditarVisita(visita.clienteId, visita.id)
  }

  const handleEliminar = async () => {
    const ok = window.confirm('¿Eliminar esta visita? (borrado suave)')
    if (!ok) return
    await deleteVisita(visita.id)
    refresh()
    closeVerVisita()
  }

  return (
    <Modal
      title="Detalle de la visita"
      onClose={closeVerVisita}
      footer={
        <>
          <Button variant="ghost" onClick={closeVerVisita}>
            Cerrar
          </Button>
          {visita && (
            <>
              <Button variant="danger" onClick={handleEliminar}>
                🗑️ Eliminar
              </Button>
              <Button variant="primary" onClick={handleEditar}>
                ✏️ Editar
              </Button>
            </>
          )}
        </>
      }
    >
      {loading ? (
        <div className="loading">Cargando…</div>
      ) : !visita ? (
        <p className="muted">No se encontró la visita.</p>
      ) : (
        <>
          {/* Aplicación */}
          <div className="card">
            <div className="form-section-label">Aplicación</div>
            <div className="dato-grid dato-grid--split">
              <Dato label="Tipo de aplicación">{visita.tipoAplicacion}</Dato>
              <Dato label="Fecha">{visita.fecha}</Dato>
              {mostrarDecoloracion && (
                <Dato label="Decoloración — etapa">{visita.decoloracionEtapa}</Dato>
              )}
            </div>
          </div>

          {/* Fórmula raíz (excepción: sin layout "en fila"; oxidante y tiempo
              van juntos en la misma fila, en 2 columnas) */}
          <div className="card">
            <div className="form-section-label">Fórmula raíz</div>
            <Dato label="Fórmula raíz">{visita.formulaRaiz}</Dato>
            <div className="dato-grid dato-grid--pair" style={{ marginTop: 12 }}>
              <Dato label="Oxidante raíz">{visita.oxidanteRaiz}</Dato>
              <Dato label="Tiempo raíz">{visita.tiempoRaiz}</Dato>
            </div>
          </div>

          {/* Fórmula medios a puntas (oculta para "Retoque de raíz"; misma excepción) */}
          {mostrarMedios && (
            <div className="card">
              <div className="form-section-label">Fórmula medios a puntas</div>
              <Dato label="Fórmula medios a puntas">{visita.formulaMediosAPuntas}</Dato>
              <div className="dato-grid dato-grid--pair" style={{ marginTop: 12 }}>
                <Dato label="Oxidante medios a puntas">{visita.oxidanteMediosAPuntas}</Dato>
                <Dato label="Tiempo medios a puntas">{visita.tiempoMediosAPuntas}</Dato>
              </div>
            </div>
          )}

          {/* Resultado y datos */}
          <div className="card">
            <div className="form-section-label">Resultado y datos</div>
            <div className="dato-grid dato-grid--split">
              <Dato label="Precio">{fmtPrecio(visita.precio)}</Dato>
              <Dato label="Color obtenido">{visita.colorObtenido}</Dato>
              <Dato label="Porcentaje de canas">
                {visita.porcentajeCanas ? `${visita.porcentajeCanas}%` : ''}
              </Dato>
              <Dato label="Largo del cabello">{visita.largoCabello}</Dato>
            </div>
            <div style={{ marginTop: 12 }}>
              <Dato label="Nota">{visita.nota}</Dato>
            </div>
          </div>

          {/* Foto del resultado */}
          <div className="card">
            <div className="form-section-label">Foto del resultado</div>
            {visita.fotoResultado ? (
              <div className="foto-preview">
                <img className="foto-preview__img" src={visita.fotoResultado} alt="Resultado" />
              </div>
            ) : (
              <p className="muted">Sin foto cargada.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
