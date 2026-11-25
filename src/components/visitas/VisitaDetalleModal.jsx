import { useEffect, useState } from 'react'
import { Trash2, Pencil, RefreshCw, Calendar } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useConfirm, useAlert } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { deleteVisita } from '../../services'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { fmtPrecio, fmtFecha } from '../../utils/format'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// Agrega la unidad ("Vol 20", "2 oz", "35 min") solo si el valor guardado
// es un número pelado — si ya trae texto propio, se muestra tal cual.
function conUnidad(valor, prefijo, sufijo) {
  const v = String(valor ?? '').trim()
  if (!v) return '—'
  return /^\d+([.,]\d+)?$/.test(v) ? `${prefijo}${v}${sufijo}` : v
}

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

  // Una fila de la planilla de fórmulas (raíz, medios a puntas o única):
  // Zona | Mezcla | Amonio | Oxigenta | Onzas | Tiempo. data-k da el
  // rótulo de cada celda en celular, donde la cabecera se oculta.
  const filaFormula = (zona, formula, oxidante, onzas, tiempo, amonio) => (
    <div className="planilla__fila" key={zona}>
      <span className="planilla__celda planilla__zona">{zona}</span>
      <span className="planilla__celda" data-k="Mezcla">
        {formula || '—'}
      </span>
      <span className="planilla__celda" data-k="Amonio">
        {etiquetaAmonio(amonio)}
      </span>
      <span className="planilla__celda" data-k="Oxigenta">
        {conUnidad(oxidante, 'Vol ', '')}
      </span>
      <span className="planilla__celda" data-k="Onzas">
        {conUnidad(onzas, '', ' oz')}
      </span>
      <span className="planilla__celda" data-k="Tiempo">
        {conUnidad(tiempo, '', ' min')}
      </span>
    </div>
  )

  // Celda de lectura (rótulo + valor sobre renglón).
  const celda = (rotulo, valor) => (
    <div className="celda">
      <span className="celda__k">{rotulo}</span>
      <span className="celda__v">{valor || <span className="muted">—</span>}</span>
    </div>
  )

  return (
    <Modal
      open={open}
      ancho="lg"
      kicker="Registro de visita"
      title="Detalle de la visita"
      subtitle={
        nombreCliente ? (
          <>
            Cliente: <strong>{nombreCliente}</strong>
          </>
        ) : undefined
      }
      closeExtra={
        visitaMostrada ? (
          <>
            <Calendar size={15} strokeWidth={2.25} aria-hidden="true" />
            {fmtFecha(visitaMostrada.fecha)}
          </>
        ) : undefined
      }
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
              <Trash2 size={16} strokeWidth={2.25} />
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
          )}
          <Button variant="ghost" onClick={closeVerVisita}>
            Cerrar
          </Button>
          {visitaMostrada && (
            <>
              <Button variant="ghost" onClick={handleReutilizarFormula} disabled={deleting}>
                <RefreshCw size={16} strokeWidth={2.25} />
                Reutilizar fórmula
              </Button>
              <Button
                variant="primary"
                className="btn--sin-borde-rosa"
                onClick={handleEditar}
                disabled={deleting}
              >
                <Pencil size={16} strokeWidth={2.25} />
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
          <section className="seccion">
            <h3 className="seccion__titulo">1. Datos de la visita</h3>
            <div className="celdas" style={{ '--celdas': mostrarDecoloracion ? 4 : 3 }}>
              {celda('Tipo de aplicación', visitaMostrada.tipoAplicacion)}
              {celda('% de canas', visitaMostrada.porcentajeCanas ? `${visitaMostrada.porcentajeCanas}%` : '')}
              {celda('Largo del cabello', visitaMostrada.largoCabello)}
              {mostrarDecoloracion && celda('Decoloración — etapa', visitaMostrada.decoloracionEtapa)}
            </div>
          </section>

          {/* Fórmula principal: medios a puntas si es la única cargada,
              raíz en cualquier otro caso ("Raíz y puntas" cuando ambas
              coinciden). Medios a puntas como fila APARTE solo cuando de
              verdad es distinta de la de raíz. */}
          <section className="seccion">
            <h3 className="seccion__titulo">{mostrarMediosAparte ? '2. Fórmulas' : '2. Fórmula'}</h3>
            <div className="planilla planilla--formula">
              <div className="planilla__fila planilla__fila--cabecera" aria-hidden="true">
                <span className="planilla__celda">Zona</span>
                <span className="planilla__celda">Mezcla</span>
                <span className="planilla__celda">Amonio</span>
                <span className="planilla__celda">Oxigenta</span>
                <span className="planilla__celda">Onzas</span>
                <span className="planilla__celda">Tiempo</span>
              </div>
              {soloMedios
                ? filaFormula(
                    'Medios a puntas',
                    visitaMostrada.formulaMediosAPuntas,
                    visitaMostrada.oxidanteMediosAPuntas,
                    visitaMostrada.onzasMediosAPuntas,
                    visitaMostrada.tiempoMediosAPuntas,
                    visitaMostrada.amonioMediosAPuntas
                  )
                : filaFormula(
                    formulasIguales ? 'Raíz y puntas' : 'Raíz',
                    visitaMostrada.formulaRaiz,
                    visitaMostrada.oxidanteRaiz,
                    visitaMostrada.onzasRaiz,
                    visitaMostrada.tiempoRaiz,
                    visitaMostrada.amonioRaiz
                  )}
              {mostrarMediosAparte &&
                filaFormula(
                  'Medios a puntas',
                  visitaMostrada.formulaMediosAPuntas,
                  visitaMostrada.oxidanteMediosAPuntas,
                  visitaMostrada.onzasMediosAPuntas,
                  visitaMostrada.tiempoMediosAPuntas,
                  visitaMostrada.amonioMediosAPuntas
                )}
            </div>
          </section>

          <section className="seccion">
            <h3 className="seccion__titulo">3. Resultado obtenido</h3>
            <div className="celdas" style={{ '--celdas': 2 }}>
              {celda('Color obtenido', visitaMostrada.colorObtenido)}
              {celda('Precio', visitaMostrada.precio ? fmtPrecio(visitaMostrada.precio) : '')}
            </div>
            <div className="celda" style={{ borderTop: '1px solid var(--line-soft)' }}>
              <span className="celda__k">Nota</span>
              <p className={`nota-rayada ${visitaMostrada.nota ? '' : 'muted'}`}>{visitaMostrada.nota || '—'}</p>
            </div>
            {/* Foto del resultado: si no hay foto, no se muestra nada. */}
            {visitaMostrada.fotoResultado && (
              <figure className="detalle-foto" style={{ margin: 0 }}>
                <span className="celda__k">Foto del resultado</span>
                <img src={visitaMostrada.fotoResultado} alt="Foto del resultado" />
              </figure>
            )}
          </section>
        </>
      )}
    </Modal>
  )
}
