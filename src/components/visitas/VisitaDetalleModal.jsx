import { useEffect, useState } from 'react'
import { Trash2, Pencil, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useConfirm, useAlert } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { deleteVisita } from '../../services'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { fmtPrecio, fmtFecha } from '../../utils/format'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// Vista de solo lectura con TODOS los campos de una visita.
// Se abre al hacer clic en el cuerpo de una fila de la tabla de visitas, que
// ya trae el objeto completo (nada que pedirle al backend acá).
export default function VisitaDetalleModal() {
  const { visitaView, closeVerVisita, openEditarVisita, openNuevaVisita, aplicarVisitaEliminada, clienteDetalle } =
    useApp()
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

  // Mismo criterio que VisitaModal.jsx para el nombre del cliente en el
  // header: solo se muestra si el cliente actualmente abierto en Detalle
  // de cliente coincide con el de esta visita.
  const nombreCliente =
    visitaMostrada && clienteDetalle.cliente?.id === visitaMostrada.clienteId
      ? clienteDetalle.cliente.nombreCompleto
      : null

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

  // "Sí"/"No" legible a partir del valor guardado ('si'/'no'/'').
  const etiquetaAmonio = (valor) => (valor === 'si' ? 'Sí' : valor === 'no' ? 'No' : '—')

  const handleEditar = () => {
    closeVerVisita()
    openEditarVisita(visitaMostrada)
  }

  // Abre Nueva visita precargada con los datos de ESTA visita (no
  // necesariamente la última del cliente) — mismo mecanismo que la
  // precarga automática de "alta con historial" (ver CAMPOS_PRECARGA en
  // VisitaModal.jsx), solo que la fuente es la visita que se está viendo
  // acá en vez de la más reciente. Al ser alta (visitaId null), la fecha
  // arranca en hoy y se guarda como una visita nueva, no pisa esta.
  const handleReutilizarFormula = () => {
    closeVerVisita()
    openNuevaVisita(visitaMostrada.clienteId, visitaMostrada)
  }

  const handleEliminar = async () => {
    const ok = await confirmar('¿Eliminar esta visita? (borrado suave)', {
      danger: true,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    setDeleting(true)
    try {
      // Devuelve { cliente }: la fila de cliente con "tiposAplicados"
      // recalculado (si era la única visita de ese tipo, deja de tenerlo) —
      // ver actualizarTiposDeCliente_ en Code.gs.
      const { cliente: clienteActualizado } = await deleteVisita(visitaMostrada.id)
      aplicarVisitaEliminada(visitaMostrada.id, visitaMostrada.clienteId, clienteActualizado)
      closeVerVisita()
      toast('Visita eliminada')
    } catch (err) {
      console.error('Error eliminando la visita:', err)
      await alertar('No se pudo eliminar. Revisá tu conexión e intentá de nuevo.')
      setDeleting(false)
    }
  }

  // Bloque de una fórmula (raíz o medios a puntas) — 3 filas: nombre +
  // amonio arriba, y debajo una mini tabla de label/valor (mismo patrón
  // que .detalle-visita__grid de las otras secciones) para mezcla,
  // oxígeno, onzas y tiempo.
  const tarjetaFormula = (nombre, formula, oxidante, onzas, tiempo, amonio) => (
    <div className="detalle-visita__formula-card">
      <div className="detalle-visita__formula-header">
        <span className="detalle-visita__formula-nombre">{nombre}</span>
        <span className="detalle-visita__amonio">
          Amonio: <strong>{etiquetaAmonio(amonio)}</strong>
        </span>
      </div>
      <div className="detalle-visita__grid detalle-visita__grid--formula">
        <div className="detalle-visita__dato">
          <span className="detalle-visita__label">Mezcla</span>
          <span className="detalle-visita__valor">{formula || '—'}</span>
        </div>
        <div className="detalle-visita__dato">
          <span className="detalle-visita__label">Oxígenta</span>
          <span className="detalle-visita__valor">{oxidante || '—'}</span>
        </div>
        {onzas && (
          <div className="detalle-visita__dato">
            <span className="detalle-visita__label">Onzas</span>
            <span className="detalle-visita__valor">{onzas}</span>
          </div>
        )}
        <div className="detalle-visita__dato">
          <span className="detalle-visita__label">Tiempo</span>
          <span className="detalle-visita__valor">{tiempo || '—'}</span>
        </div>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      centered
      headerOscuro
      title="Detalle de la visita"
      subtitle={
        nombreCliente ? (
          <>
            Cliente: <strong>{nombreCliente}</strong>
          </>
        ) : undefined
      }
      closeExtra={visitaMostrada ? fmtFecha(visitaMostrada.fecha) : undefined}
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
            <>
              <Button variant="ghost" onClick={handleReutilizarFormula} disabled={deleting}>
                <RefreshCw size={14} strokeWidth={2.25} />
                Reutilizar fórmula
              </Button>
              <Button
                variant="primary"
                className="btn--sin-borde-rosa"
                onClick={handleEditar}
                disabled={deleting}
              >
                <Pencil size={14} strokeWidth={2.25} />
                Editar
              </Button>
            </>
          )}
        </>
      }
    >
      {!visitaMostrada ? (
        <p className="muted">No se encontró la visita.</p>
      ) : (
        <>
          {/* Parámetros del servicio (sin título — a pedido) */}
          <div className="detalle-section">
            <div className="detalle-visita__grid">
              <div className="detalle-visita__dato">
                <span className="detalle-visita__label">Tipo de aplicación</span>
                <span className="detalle-visita__valor">{visitaMostrada.tipoAplicacion || '—'}</span>
              </div>
              <div className="detalle-visita__dato">
                <span className="detalle-visita__label">% de canas</span>
                <span className="detalle-visita__valor">
                  {visitaMostrada.porcentajeCanas ? `${visitaMostrada.porcentajeCanas}%` : '—'}
                </span>
              </div>
              <div className="detalle-visita__dato">
                <span className="detalle-visita__label">Largo del cabello</span>
                <span className="detalle-visita__valor">{visitaMostrada.largoCabello || '—'}</span>
              </div>
              {mostrarDecoloracion && (
                <div className="detalle-visita__dato">
                  <span className="detalle-visita__label">Decoloración — etapa</span>
                  <span className="detalle-visita__valor">{visitaMostrada.decoloracionEtapa || '—'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fórmula principal: medios a puntas si es la única cargada,
              raíz en cualquier otro caso (su label cambia a "raíz y
              puntas" cuando ambas coinciden) — cada fórmula es su propia
              tarjeta (ver .detalle-visita__formula-card en index.css). */}
          <div className="detalle-section">
            {soloMedios
              ? tarjetaFormula(
                  'Fórmula medios a puntas',
                  visitaMostrada.formulaMediosAPuntas,
                  visitaMostrada.oxidanteMediosAPuntas,
                  visitaMostrada.onzasMediosAPuntas,
                  visitaMostrada.tiempoMediosAPuntas,
                  visitaMostrada.amonioMediosAPuntas
                )
              : tarjetaFormula(
                  formulasIguales ? 'Fórmula (raíz y puntas)' : 'Fórmula raíz',
                  visitaMostrada.formulaRaiz,
                  visitaMostrada.oxidanteRaiz,
                  visitaMostrada.onzasRaiz,
                  visitaMostrada.tiempoRaiz,
                  visitaMostrada.amonioRaiz
                )}

            {/* Fórmula medios a puntas como bloque APARTE — solo cuando de
                verdad es distinta de la de raíz (no para "Retoque de raíz",
                "Medio a punta", "Baño de color", ni fórmulas únicas). */}
            {mostrarMediosAparte &&
              tarjetaFormula(
                'Fórmula medios a puntas',
                visitaMostrada.formulaMediosAPuntas,
                visitaMostrada.oxidanteMediosAPuntas,
                visitaMostrada.onzasMediosAPuntas,
                visitaMostrada.tiempoMediosAPuntas,
                visitaMostrada.amonioMediosAPuntas
              )}
          </div>

          {/* Resultado y datos */}
          <div className="detalle-section">
            <h3 className="detalle-visita__titulo">Resultado obtenido</h3>
            <div className="detalle-visita__grid">
              <div className="detalle-visita__dato">
                <span className="detalle-visita__label">Color obtenido</span>
                <span className="detalle-visita__valor">{visitaMostrada.colorObtenido || '—'}</span>
              </div>
              <div className="detalle-visita__dato">
                <span className="detalle-visita__label">Precio</span>
                <span className="detalle-visita__valor">{fmtPrecio(visitaMostrada.precio)}</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <span className="detalle-visita__label">Nota</span>
              <div className="detalle-visita__nota-caja">
                {visitaMostrada.nota || <span className="muted">—</span>}
              </div>
            </div>
          </div>

          {/* Foto del resultado — sin título ni texto de placeholder (a
              pedido): si no hay foto, no se muestra nada. */}
          {visitaMostrada.fotoResultado && (
            <div className="detalle-section">
              <div className="foto-preview">
                <img className="foto-preview__img" src={visitaMostrada.fotoResultado} alt="Resultado" />
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
