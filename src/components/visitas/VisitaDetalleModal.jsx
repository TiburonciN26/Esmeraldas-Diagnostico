import { useEffect, useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm, useAlert } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
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
  const { visitaView, closeVerVisita, openEditarVisita, aplicarVisitaEliminada } = useApp()
  const { session } = useSession()
  const esAdmin = session?.rol === 'administrador'
  const { open, visita } = visitaView
  const confirmar = useConfirm()
  const alertar = useAlert()
  const toast = useToast()

  const [deleting, setDeleting] = useState(false)

  // Snapshot de la última visita no nula: al pedir el cierre, el contexto
  // limpia "visita" a null en el mismo instante (antes de que termine la
  // animación de salida del modal) — sin esto, el contenido saltaría a
  // "No se encontró la visita" durante el fade en vez de mostrar la visita
  // hasta que el modal termine de desaparecer.
  const [visitaMostrada, setVisitaMostrada] = useState(visita)
  useEffect(() => {
    if (visita) setVisitaMostrada(visita)
  }, [visita])

  // Este componente nunca se desmonta (Modal solo lo oculta), así que sin
  // esto "deleting" quedaba en true para siempre después de un borrado
  // exitoso — al abrir la siguiente visita, sus botones Eliminar/Editar
  // aparecían bloqueados como si esa OTRA visita se estuviera borrando.
  useEffect(() => {
    if (open) setDeleting(false)
  }, [open])

  // Visibilidad de campos condicionales (misma lógica que el formulario).
  const vis = visitaMostrada ? calcularVisibilidad(visitaMostrada) : null
  const mostrarDecoloracion = vis?.decoloracion

  // Qué fórmula(s) mostrar se decide mirando los datos guardados (qué
  // campos tienen contenido), no el tipo de aplicación — VisitaModal.jsx
  // ya se encarga de vaciar el lado que no corresponde al guardar (ver
  // sanitizar() ahí), así que acá alcanza con esta regla simple para que
  // convivan "Retoque de raíz" (solo raíz), "Medio a punta" (solo medios),
  // "Baño de color" (raíz sola, medios sola, o una única para ambas) y el
  // resto (raíz + medios, iguales o no) sin conocer nada de tipos.
  const tieneFormulaRaiz = Boolean(visitaMostrada?.formulaRaiz?.trim())
  const tieneFormulaMedios = Boolean(visitaMostrada?.formulaMediosAPuntas?.trim())
  const formulasIguales =
    tieneFormulaRaiz &&
    tieneFormulaMedios &&
    visitaMostrada?.formulaRaiz === visitaMostrada?.formulaMediosAPuntas &&
    visitaMostrada?.oxidanteRaiz === visitaMostrada?.oxidanteMediosAPuntas &&
    visitaMostrada?.tiempoRaiz === visitaMostrada?.tiempoMediosAPuntas
  const soloMedios = tieneFormulaMedios && !tieneFormulaRaiz
  const mostrarMediosAparte = tieneFormulaMedios && !soloMedios && !formulasIguales

  const handleEditar = () => {
    closeVerVisita()
    openEditarVisita(visitaMostrada)
  }

  const handleEliminar = async () => {
    const ok = await confirmar('¿Eliminar esta visita? (borrado suave)', {
      danger: true,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteVisita(visitaMostrada.id)
      aplicarVisitaEliminada(visitaMostrada.id, visitaMostrada.clienteId)
      closeVerVisita()
      toast('Visita eliminada')
    } catch (err) {
      console.error('Error eliminando la visita:', err)
      await alertar('No se pudo eliminar. Revisá tu conexión e intentá de nuevo.')
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Detalle de la visita"
      onClose={closeVerVisita}
      footer={
        <>
          {/* Eliminar va al extremo izquierdo (btn--start) para no quedar
              pegado a las acciones principales y evitar taps accidentales. */}
          {visitaMostrada && (
            <Button
              variant="danger"
              className="btn--start"
              onClick={handleEliminar}
              disabled={deleting}
            >
              <Trash2 size={14} strokeWidth={2.25} />
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
          )}
          <Button variant="ghost" onClick={closeVerVisita}>
            Cerrar
          </Button>
          {visitaMostrada && (
            <Button variant="primary" onClick={handleEditar} disabled={deleting}>
              <Pencil size={14} strokeWidth={2.25} />
              Editar
            </Button>
          )}
        </>
      }
    >
      {!visitaMostrada ? (
        <p className="muted">No se encontró la visita.</p>
      ) : (
        <>
          {/* Aplicación */}
          <div className="detalle-section">
            <h3 className="form-section-label">Aplicación</h3>
            <div className="dato-grid dato-grid--split">
              <Dato label="Tipo de aplicación">{visitaMostrada.tipoAplicacion}</Dato>
              <Dato label="% de canas">
                {visitaMostrada.porcentajeCanas ? `${visitaMostrada.porcentajeCanas}%` : ''}
              </Dato>
              {mostrarDecoloracion && (
                <Dato label="Decoloración — etapa">{visitaMostrada.decoloracionEtapa}</Dato>
              )}
            </div>
          </div>

          {/* Fórmula principal: medios a puntas si es la única cargada,
              raíz en cualquier otro caso (su label cambia a "raíz y
              puntas" cuando ambas coinciden) — fórmula + oxígeno +
              tiempo, los 3 en una fila */}
          <div className="detalle-section">
            <div className="dato-grid--trio">
              {soloMedios ? (
                <>
                  <Dato label="Fórmula medios a puntas">{visitaMostrada.formulaMediosAPuntas}</Dato>
                  <Dato label="Oxig. Vol">{visitaMostrada.oxidanteMediosAPuntas}</Dato>
                  <Dato label="Tiempo">{visitaMostrada.tiempoMediosAPuntas}</Dato>
                </>
              ) : (
                <>
                  <Dato label={formulasIguales ? 'Fórmula (raíz y puntas)' : 'Fórmula raíz'}>
                    {visitaMostrada.formulaRaiz}
                  </Dato>
                  <Dato label="Oxig. Vol">{visitaMostrada.oxidanteRaiz}</Dato>
                  <Dato label="Tiempo">{visitaMostrada.tiempoRaiz}</Dato>
                </>
              )}
            </div>
          </div>

          {/* Fórmula medios a puntas como bloque APARTE — solo cuando de
              verdad es distinta de la de raíz (no para "Retoque de raíz",
              "Medio a punta", "Baño de color", ni fórmulas únicas). */}
          {mostrarMediosAparte && (
            <div className="detalle-section">
              <div className="dato-grid--trio">
                <Dato label="Fórmula medios a puntas">{visitaMostrada.formulaMediosAPuntas}</Dato>
                <Dato label="Oxig. vol">{visitaMostrada.oxidanteMediosAPuntas}</Dato>
                <Dato label="Tiempo">{visitaMostrada.tiempoMediosAPuntas}</Dato>
              </div>
            </div>
          )}

          {/* Resultado y datos */}
          <div className="detalle-section">
            <h3 className="form-section-label">Resultado y datos</h3>
            <div className="dato-grid dato-grid--split">
              {esAdmin && <Dato label="Precio">{fmtPrecio(visitaMostrada.precio)}</Dato>}
              <Dato label="Color obtenido">{visitaMostrada.colorObtenido}</Dato>
              <Dato label="Largo del cabello">{visitaMostrada.largoCabello}</Dato>
              <Dato label="Fecha">{fmtFecha(visitaMostrada.fecha)}</Dato>
            </div>
            <div style={{ marginTop: 12 }}>
              <Dato label="Nota">{visitaMostrada.nota}</Dato>
            </div>
          </div>

          {/* Foto del resultado */}
          <div className="detalle-section">
            <h3 className="form-section-label">Foto del resultado</h3>
            {visitaMostrada.fotoResultado ? (
              <div className="foto-preview">
                <img className="foto-preview__img" src={visitaMostrada.fotoResultado} alt="Resultado" />
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
