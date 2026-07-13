import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm, useAlert } from '../../context/ConfirmContext'
import { deleteVisita } from '../../services'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { fmtPrecio, fmtFecha } from '../../utils/format'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Dato } from '../ui/Card'

// Vista de solo lectura con TODOS los campos de una visita.
// Se abre al hacer clic en el cuerpo de una fila de la tabla de visitas, que
// ya trae el objeto completo (nada que pedirle al backend acá).
export default function VisitaDetalleModal() {
  const { visitaView, closeVerVisita, openEditarVisita, refresh } = useApp()
  const { session } = useSession()
  const esAdmin = session?.rol === 'administrador'
  const { open, visita } = visitaView
  const confirmar = useConfirm()
  const alertar = useAlert()

  const [deleting, setDeleting] = useState(false)

  if (!open) return null

  // Visibilidad de campos condicionales (misma lógica que el formulario).
  const vis = visita ? calcularVisibilidad(visita) : null
  const mostrarMedios = vis?.mediosBloque
  const mostrarDecoloracion = vis?.decoloracion

  const handleEditar = () => {
    closeVerVisita()
    openEditarVisita(visita)
  }

  const handleEliminar = async () => {
    const ok = await confirmar('¿Eliminar esta visita? (borrado suave)', {
      danger: true,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteVisita(visita.id)
      refresh()
      closeVerVisita()
    } catch (err) {
      console.error('Error eliminando la visita:', err)
      await alertar('No se pudo eliminar. Revisá tu conexión e intentá de nuevo.')
      setDeleting(false)
    }
  }

  return (
    <Modal
      title="Detalle de la visita"
      onClose={closeVerVisita}
      footer={
        <>
          {/* Eliminar va al extremo izquierdo (btn--start) para no quedar
              pegado a las acciones principales y evitar taps accidentales. */}
          {visita && (
            <Button
              variant="danger"
              className="btn--start"
              onClick={handleEliminar}
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : '🗑️ Eliminar'}
            </Button>
          )}
          <Button variant="ghost" onClick={closeVerVisita}>
            Cerrar
          </Button>
          {visita && (
            <Button variant="primary" onClick={handleEditar} disabled={deleting}>
              ✏️ Editar
            </Button>
          )}
        </>
      }
    >
      {!visita ? (
        <p className="muted">No se encontró la visita.</p>
      ) : (
        <>
          {/* Aplicación */}
          <div className="card">
            <div className="form-section-label">Aplicación</div>
            <div className="dato-grid dato-grid--split">
              <Dato label="Tipo de aplicación">{visita.tipoAplicacion}</Dato>
              <Dato label="Fecha">{fmtFecha(visita.fecha)}</Dato>
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
              {esAdmin && <Dato label="Precio">{fmtPrecio(visita.precio)}</Dato>}
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
