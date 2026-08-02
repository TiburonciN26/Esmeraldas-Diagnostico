import { useEffect, useRef, useState } from 'react'
import { Split, Merge, ArrowUpToLine, ArrowDownToLine } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { createVisita, updateVisita, visitaVacia, generarIdVisita } from '../../services'
import {
  TIPOS_APLICACION,
  PORCENTAJE_CANAS,
  LARGO_CABELLO,
  COLORES_OBTENIDOS,
  TIPO_SOLO_RAIZ,
  TIPOS_SOLO_MEDIOS,
  TIPO_TRES_MODOS,
} from '../../data/constants'
import { hoyISO } from '../../utils/date'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { comprimirImagen } from '../../utils/image'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput, AutoGrowInput, TextArea, Select } from '../ui/Field'

// Campos que se copian desde la última visita al crear una nueva.
// (No se copian "fecha" -> hoy, "fotoResultado" -> vacía, ni "nota" -> vacía:
// la nota es específica de cada visita, no algo que tenga sentido repetir.)
const CAMPOS_PRECARGA = [
  'tipoAplicacion',
  'decoloracionEtapa',
  'formulaRaiz',
  'oxidanteRaiz',
  'tiempoRaiz',
  'formulaMediosAPuntas',
  'oxidanteMediosAPuntas',
  'tiempoMediosAPuntas',
  'colorObtenido',
  'porcentajeCanas',
  'largoCabello',
  'precio',
]

export default function VisitaModal() {
  const { visitaModal, closeVisitaModal, aplicarVisitaGuardada } = useApp()
  const { session } = useSession()
  const esAdmin = session?.rol === 'administrador'
  const confirmar = useConfirm()
  const toast = useToast()
  const { open, clienteId, visitaId, visita } = visitaModal
  const esEdicion = Boolean(visitaId)

  const [form, setForm] = useState({ ...visitaVacia })
  // Fórmula única para todo el cabello (raíz y medios a puntas comparten
  // los mismos 3 campos) vs. fórmula distinta para cada uno — ver el
  // toggle Split/Merge junto a "Tipo de aplicación". Arranca siempre en
  // "distinta" (false) para una visita nueva; al editar se infiere desde
  // los datos (ver el useEffect de abajo). No aplica a "Baño de color"
  // (ver modoBanio): ese tipo nunca usa fórmulas distintas para raíz y
  // medios, así que no tiene sentido este toggle ahí.
  const [formulaUnica, setFormulaUnica] = useState(false)
  // Solo para "Baño de color": 'raiz' | 'medios' | 'unica' — a veces se
  // aplica solo a la raíz, solo a medios a puntas, o a todo el cabello con
  // una fórmula. Arranca en 'unica' (menos campos) para una visita nueva;
  // al editar se infiere desde los datos.
  const [modoBanio, setModoBanio] = useState('unica')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [errors, setErrors] = useState({})
  const [errorFoto, setErrorFoto] = useState(null)
  // Snapshot del formulario recién cargado, para detectar cambios sin guardar.
  const inicialRef = useRef(null)
  // Id de la visita nueva, generado una sola vez al abrir el modal para alta
  // (ver el useEffect de abajo) y reusado en todos los reintentos de ESE
  // guardado — así un timeout de red seguido de reintentar manualmente no
  // crea una visita duplicada (ver generarIdVisita en visitasService.js).
  const nuevaVisitaIdRef = useRef(null)

  // Al abrir, decidir precarga con los datos que ya llegaron por contexto
  // (sin pedirlos al backend):
  // - Edición: la visita puntual pasada por openEditarVisita.
  // - Alta con historial: copiar la última visita (menos fecha y foto).
  // - Alta sin historial: formulario vacío con la fecha de hoy.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setSaveError(null)
    setErrorFoto(null)

    const datos = esEdicion
      ? { ...visitaVacia, ...(visita || {}) }
      : { ...visitaVacia, fecha: hoyISO() }
    if (!esEdicion && visita) {
      for (const campo of CAMPOS_PRECARGA) datos[campo] = visita[campo] ?? ''
    }

    setForm(datos)
    inicialRef.current = JSON.stringify(datos)
    if (!esEdicion) nuevaVisitaIdRef.current = generarIdVisita()

    // Coinciden raíz y medios a puntas en los 3 campos (y raíz no está
    // vacía) => probablemente se cargó como "una sola fórmula para todo".
    const coincidenRaizYMedios = Boolean(
      datos.formulaRaiz.trim() &&
        datos.formulaRaiz === datos.formulaMediosAPuntas &&
        datos.oxidanteRaiz === datos.oxidanteMediosAPuntas &&
        datos.tiempoRaiz === datos.tiempoMediosAPuntas
    )

    // "Fórmula única" (toggle Split/Merge) solo se infiere al editar, y
    // nunca para "Baño de color" (ese usa modoBanio en su lugar).
    setFormulaUnica(
      Boolean(
        esEdicion &&
          datos.tipoAplicacion !== TIPO_SOLO_RAIZ &&
          !TIPOS_SOLO_MEDIOS.includes(datos.tipoAplicacion) &&
          datos.tipoAplicacion !== TIPO_TRES_MODOS &&
          coincidenRaizYMedios
      )
    )

    // modoBanio se infiere al editar un "Baño de color": mirando qué
    // campos tienen contenido, no hay forma de saber si alguna vez fue
    // "distinta" (ese modo ya no existe para este tipo) — en el peor caso
    // (datos viejos con raíz y medios distintos) se muestra "raiz" como
    // resguardo, para no perder de vista ningún dato con un guardado
    // accidental.
    if (esEdicion && datos.tipoAplicacion === TIPO_TRES_MODOS) {
      if (coincidenRaizYMedios) setModoBanio('unica')
      else if (datos.formulaMediosAPuntas.trim() && !datos.formulaRaiz.trim()) setModoBanio('medios')
      else setModoBanio('raiz')
    } else {
      setModoBanio('unica')
    }
  }, [open, visitaId, esEdicion, visita])

  const vis = calcularVisibilidad(form)
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // "Baño de color" tiene su propio toggle de 3 modos (raiz/medios/unica);
  // Rayitos/Mechas/Iluminación siempre usan "única" sin mostrar nada para
  // elegir (vis.formulaUnicaFija); el resto de los tipos "flexibles" usan
  // el toggle de 2 (Split/Merge, formulaUnica). Estos booleans combinan
  // los tres orígenes en un único criterio, para que el resto del
  // componente no tenga que saber cuál está en juego.
  const esBanioColor = form.tipoAplicacion === TIPO_TRES_MODOS
  const modoSoloRaiz = vis.soloRaiz || (esBanioColor && modoBanio === 'raiz')
  const modoSoloMedios = vis.soloMedios || (esBanioColor && modoBanio === 'medios')
  const modoUnica = vis.formulaUnicaFija || (esBanioColor ? modoBanio === 'unica' : formulaUnica)
  // La fila de medios a puntas APARTE (fórmula realmente distinta) solo
  // existe para los tipos flexibles que de verdad la necesitan (no "Baño
  // de color" ni Rayitos/Mechas/Iluminación, que nunca tienen fórmulas
  // distintas), y solo si no se activó "única".
  const mostrarMediosAparte =
    vis.mediosBloque && !esBanioColor && !vis.formulaUnicaFija && !formulaUnica

  // La fila de fórmula "principal" (la que siempre se ve) usa los campos de
  // medios a puntas en modo "solo medios", y los de raíz para cualquier
  // otro caso (incluida "fórmula única").
  const campoFormula = modoSoloMedios ? 'formulaMediosAPuntas' : 'formulaRaiz'
  const campoOxidante = modoSoloMedios ? 'oxidanteMediosAPuntas' : 'oxidanteRaiz'
  const campoTiempo = modoSoloMedios ? 'tiempoMediosAPuntas' : 'tiempoRaiz'
  const idFormula = modoSoloMedios ? 'v-fmed' : 'v-fraiz'
  const idOxidante = modoSoloMedios ? 'v-omed' : 'v-oraiz'
  const idTiempo = modoSoloMedios ? 'v-tmed' : 'v-traiz'
  const labelFormula = modoSoloMedios
    ? 'Fórmula medios a puntas'
    : modoUnica
    ? 'Fórmula (raíz y puntas)'
    : 'Fórmula raíz'

  // Toggle de modo de fórmula: 3 íconos para "Baño de color", 2 (Split/
  // Merge) para el resto de los tipos flexibles, o nada si todavía no se
  // eligió tipo de aplicación (sin esto, "vis.mediosBloque" da true por
  // defecto con tipoAplicacion vacío, y el toggle Split/Merge aparecía
  // antes de elegir nada) o si el tipo no tiene nada para elegir. Va
  // pegado al <select> de Tipo de aplicación (ver .campo-con-toggle más
  // abajo), no a su etiqueta.
  const formulaModoToggle = !form.tipoAplicacion ? null : esBanioColor ? (
    // "Baño de color" es el único tipo con 3 modos: a veces se aplica
    // solo a la raíz, solo a medios a puntas, o a todo el cabello con una
    // fórmula — nunca con fórmulas distintas para raíz y medios (por eso
    // acá no hay ícono Split).
    <div className="formula-modo-toggle" role="group" aria-label="Modo de fórmula">
      <button
        type="button"
        className={`formula-modo-toggle__btn ${modoBanio === 'raiz' ? 'formula-modo-toggle__btn--activo' : ''}`}
        aria-pressed={modoBanio === 'raiz'}
        title="Solo raíz"
        onClick={() => setModoBanio('raiz')}
      >
        <ArrowUpToLine size={15} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={`formula-modo-toggle__btn ${modoBanio === 'medios' ? 'formula-modo-toggle__btn--activo' : ''}`}
        aria-pressed={modoBanio === 'medios'}
        title="Solo medios a puntas"
        onClick={() => setModoBanio('medios')}
      >
        <ArrowDownToLine size={15} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={`formula-modo-toggle__btn ${modoBanio === 'unica' ? 'formula-modo-toggle__btn--activo' : ''}`}
        aria-pressed={modoBanio === 'unica'}
        title="Todo el cabello (una sola fórmula)"
        onClick={() => setModoBanio('unica')}
      >
        <Merge size={15} strokeWidth={2.25} />
      </button>
    </div>
  ) : (
    // Resto de los tipos flexibles: Split (fórmula distinta para raíz y
    // medios) o Merge (una sola para todo el cabello). No para "Retoque
    // de raíz"/"Medio a punta" (nunca tienen los dos bloques a la vez) ni
    // Rayitos/Mechas/Iluminación (siempre única, sin nada para elegir).
    vis.mediosBloque &&
    !vis.formulaUnicaFija && (
      <div className="formula-modo-toggle" role="group" aria-label="Modo de fórmula">
        <button
          type="button"
          className={`formula-modo-toggle__btn ${!formulaUnica ? 'formula-modo-toggle__btn--activo' : ''}`}
          aria-pressed={!formulaUnica}
          title="Fórmula distinta para raíz y medios a puntas"
          onClick={() => setFormulaUnica(false)}
        >
          <Split size={15} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className={`formula-modo-toggle__btn ${formulaUnica ? 'formula-modo-toggle__btn--activo' : ''}`}
          aria-pressed={formulaUnica}
          title="Una sola fórmula para todo el cabello"
          onClick={() => setFormulaUnica(true)}
        >
          <Merge size={15} strokeWidth={2.25} />
        </button>
      </div>
    )
  )

  // Todos los campos son obligatorios excepto Nota y Foto — los
  // condicionales (decoloración, medios a puntas entero) solo se exigen
  // mientras están visibles según "vis" (si no aplican, sanitizar() ya los
  // vacía antes de guardar, así que no tendría sentido pedirlos). Oxidante
  // y tiempo ya no son condicionales (ver visitaLogic.js), así que se piden
  // siempre junto con su fórmula.
  const validar = () => {
    const e = {}
    if (!form.tipoAplicacion) e.tipoAplicacion = 'Elegí un tipo de aplicación.'
    if (!form.porcentajeCanas) e.porcentajeCanas = 'Elegí el % de canas.'
    if (vis.decoloracion && !form.decoloracionEtapa.trim()) {
      e.decoloracionEtapa = 'Este campo es obligatorio.'
    }
    // La fila principal (raíz, o medios a puntas si es "Medio a punta")
    // siempre se pide.
    if (!form[campoFormula].trim()) e[campoFormula] = 'Este campo es obligatorio.'
    if (!form[campoOxidante].trim()) e[campoOxidante] = 'Este campo es obligatorio.'
    if (!form[campoTiempo].trim()) e[campoTiempo] = 'Este campo es obligatorio.'
    // La fila de medios a puntas aparte solo se pide cuando de verdad hay
    // DOS bloques distintos en pantalla — con "fórmula única"/"Baño de
    // color" la de arriba ya cubre todo (sanitizar() la copia antes de
    // guardar).
    if (mostrarMediosAparte) {
      if (!form.formulaMediosAPuntas.trim()) e.formulaMediosAPuntas = 'Este campo es obligatorio.'
      if (!form.oxidanteMediosAPuntas.trim()) e.oxidanteMediosAPuntas = 'Este campo es obligatorio.'
      if (!form.tiempoMediosAPuntas.trim()) e.tiempoMediosAPuntas = 'Este campo es obligatorio.'
    }
    if (!form.colorObtenido) e.colorObtenido = 'Elegí el color obtenido.'
    if (!form.largoCabello) e.largoCabello = 'Elegí el largo del cabello.'
    if (!form.fecha) e.fecha = 'La fecha es obligatoria.'
    if (esAdmin) {
      if (form.precio === '') e.precio = 'Este campo es obligatorio.'
      else if (Number(form.precio) < 0) e.precio = 'No puede ser negativo.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Comprime la foto elegida (máx. 1280px, JPEG) y la deja como data URL
  // local. La subida real a Drive ocurre recién al guardar la visita
  // (visitasService la detecta y la reemplaza por la URL definitiva).
  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorFoto(null)
    try {
      const dataUrl = await comprimirImagen(file)
      set('fotoResultado', dataUrl)
    } catch (err) {
      console.error('Error procesando la foto:', err)
      setErrorFoto('No se pudo procesar esa imagen.')
    }
  }

  // Antes de guardar, limpiamos los campos que están ocultos por la lógica
  // condicional para no persistir datos que "no aplican".
  const sanitizar = () => {
    const limpio = { ...form }
    if (!vis.decoloracion) limpio.decoloracionEtapa = ''
    if (modoSoloRaiz) {
      // "Retoque de raíz", o "Baño de color" en modo "raiz": no hay medios
      // a puntas, se vacía.
      limpio.formulaMediosAPuntas = ''
      limpio.oxidanteMediosAPuntas = ''
      limpio.tiempoMediosAPuntas = ''
    } else if (modoSoloMedios) {
      // "Medio a punta", o "Baño de color" en modo "medios": la fila
      // principal cargó directo en los campos de medios a puntas (ver
      // campoFormula); acá no hay raíz, se vacía.
      limpio.formulaRaiz = ''
      limpio.oxidanteRaiz = ''
      limpio.tiempoRaiz = ''
    } else if (modoUnica) {
      // Una sola fórmula para todo el cabello: se guarda igual en ambos
      // lados, así la tabla y el detalle de la visita se ven exactamente
      // como si se hubiera cargado dos veces a mano.
      limpio.formulaMediosAPuntas = limpio.formulaRaiz
      limpio.oxidanteMediosAPuntas = limpio.oxidanteRaiz
      limpio.tiempoMediosAPuntas = limpio.tiempoRaiz
    }
    return limpio
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setSaving(true)
    setSaveError(null)
    const datos = sanitizar()

    try {
      // Editar modifica ESA visita; alta siempre crea un registro nuevo (la
      // última visita no se toca). Ambas devuelven la fila final (con foto
      // ya subida a Drive, precio filtrado por rol) — se aplica directo al
      // estado en memoria, sin volver a pedir el cliente completo.
      const visitaGuardada = esEdicion
        ? await updateVisita(visitaId, datos)
        : await createVisita(clienteId, nuevaVisitaIdRef.current, datos)

      aplicarVisitaGuardada(visitaGuardada)
      closeVisitaModal()
      toast(esEdicion ? 'Visita actualizada' : 'Visita guardada')
    } catch (err) {
      console.error('Error guardando la visita:', err)
      setSaveError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Cierra pidiendo confirmación si hay cambios sin guardar (evita perder
  // datos por un Escape o un clic accidental en el fondo).
  const cerrarConGuardia = async () => {
    const sucio = inicialRef.current !== null && JSON.stringify(form) !== inicialRef.current
    if (sucio && !(await confirmar('Hay cambios sin guardar. ¿Descartar esta visita?'))) return
    closeVisitaModal()
  }

  return (
    <Modal
      open={open}
      centered
      title={esEdicion ? 'Editar visita' : 'Nueva visita'}
      onClose={cerrarConGuardia}
      footer={
        <>
          <Button variant="ghost" onClick={cerrarConGuardia} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      {saveError && (
        <div className="form-error" role="alert">
          {saveError}
        </div>
      )}

      {/* Todos los <select> obligatorios de acá abajo llevan placeholder
          ("Elegir…"): un <select> sin opción vacía siempre muestra la
          primera opción como si ya estuviera elegida — si el usuario la
          quiere de verdad, no puede "reseleccionarla" (un <select> nativo
          no dispara onChange si no cambia el valor), así que el campo
          quedaría atascado en vacío sin poder guardar. */}
      <div className="form-row form-row--2-1">
        <Field label="Tipo de aplicación" required error={errors.tipoAplicacion} htmlFor="v-tipo">
          {/* El toggle de modo de fórmula va pegado al select, no a la
              etiqueta (ver comentario de .campo-con-toggle en index.css). */}
          <div className="campo-con-toggle">
            <Select
              id="v-tipo"
              options={TIPOS_APLICACION}
              placeholder="Elegir…"
              value={form.tipoAplicacion}
              error={errors.tipoAplicacion}
              onChange={(e) => set('tipoAplicacion', e.target.value)}
            />
            {formulaModoToggle}
          </div>
        </Field>

        <Field label="% de canas" required error={errors.porcentajeCanas} htmlFor="v-canas">
          <Select
            id="v-canas"
            className="select--corto"
            options={PORCENTAJE_CANAS.map((p) => ({ value: p, label: `${p}%` }))}
            placeholder="Elegir…"
            value={form.porcentajeCanas}
            error={errors.porcentajeCanas}
            onChange={(e) => set('porcentajeCanas', e.target.value)}
          />
        </Field>
      </div>

      {/* Condicional: decoloración - etapa */}
      {vis.decoloracion && (
        <Field
          label="Decoloración — etapa"
          required
          error={errors.decoloracionEtapa}
          htmlFor="v-decol"
        >
          <div className="field--cond">
            <TextInput
              id="v-decol"
              value={form.decoloracionEtapa}
              error={errors.decoloracionEtapa}
              onChange={(e) => set('decoloracionEtapa', e.target.value)}
            />
          </div>
        </Field>
      )}

      {/* Fórmula + oxígeno + tiempo principal — raíz salvo "Medio a punta"
          (usa medios a puntas directo) o "fórmula única" (label cambia,
          campos siguen siendo los de raíz). Los 3 en una fila y siempre
          visibles juntos (ya no se revelan a medida que se escribe). */}
      <div className="formula-row">
        <Field label={labelFormula} required error={errors[campoFormula]} htmlFor={idFormula}>
          <AutoGrowInput
            id={idFormula}
            minChars={15}
            anchoResponsivo
            crecer
            value={form[campoFormula]}
            error={errors[campoFormula]}
            onChange={(e) => set(campoFormula, e.target.value)}
          />
        </Field>

        <Field label="Oxig. Vol" required error={errors[campoOxidante]} htmlFor={idOxidante}>
          <TextInput
            id={idOxidante}
            value={form[campoOxidante]}
            error={errors[campoOxidante]}
            onChange={(e) => set(campoOxidante, e.target.value)}
          />
        </Field>

        <Field label="Tiempo" required error={errors[campoTiempo]} htmlFor={idTiempo}>
          <AutoGrowInput
            id={idTiempo}
            type="number"
            inputMode="numeric"
            min="0"
            minChars={6}
            value={form[campoTiempo]}
            error={errors[campoTiempo]}
            onChange={(e) => set(campoTiempo, e.target.value)}
          />
        </Field>
      </div>

      {/* Fórmula + oxígeno + tiempo (medios a puntas) como bloque APARTE —
          solo cuando de verdad hay una fórmula distinta para raíz y
          medios (nunca para "Baño de color", "Retoque de raíz"/"Medio a
          punta", ni en modo "fórmula única": la fila de arriba ya cubre
          todo el cabello en esos casos). */}
      {mostrarMediosAparte && (
        <div className="field--cond formula-row">
          <Field
            label="Fórmula medios a puntas"
            required
            error={errors.formulaMediosAPuntas}
            htmlFor="v-fmed"
          >
            <AutoGrowInput
              id="v-fmed"
              minChars={15}
              anchoResponsivo
              crecer
              value={form.formulaMediosAPuntas}
              error={errors.formulaMediosAPuntas}
              onChange={(e) => set('formulaMediosAPuntas', e.target.value)}
            />
          </Field>

          <Field label="Oxig. Vol" required error={errors.oxidanteMediosAPuntas} htmlFor="v-omed">
            <TextInput
              id="v-omed"
              value={form.oxidanteMediosAPuntas}
              error={errors.oxidanteMediosAPuntas}
              onChange={(e) => set('oxidanteMediosAPuntas', e.target.value)}
            />
          </Field>

          <Field label="Tiempo" required error={errors.tiempoMediosAPuntas} htmlFor="v-tmed">
            <AutoGrowInput
              id="v-tmed"
              type="number"
              inputMode="numeric"
              min="0"
              minChars={6}
              value={form.tiempoMediosAPuntas}
              error={errors.tiempoMediosAPuntas}
              onChange={(e) => set('tiempoMediosAPuntas', e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Resultado y datos generales */}
      <div className="form-row">
        <Field label="Color obtenido" required error={errors.colorObtenido} htmlFor="v-color">
          <Select
            id="v-color"
            options={COLORES_OBTENIDOS}
            placeholder="Elegir…"
            value={form.colorObtenido}
            error={errors.colorObtenido}
            onChange={(e) => set('colorObtenido', e.target.value)}
          />
        </Field>

        <Field label="Largo del cabello" required error={errors.largoCabello} htmlFor="v-largo">
          <Select
            id="v-largo"
            options={LARGO_CABELLO}
            placeholder="Elegir…"
            value={form.largoCabello}
            error={errors.largoCabello}
            onChange={(e) => set('largoCabello', e.target.value)}
          />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Fecha" required error={errors.fecha} htmlFor="v-fecha">
          <TextInput
            id="v-fecha"
            type="date"
            value={form.fecha}
            error={errors.fecha}
            onChange={(e) => set('fecha', e.target.value)}
          />
        </Field>

        {esAdmin && (
          <Field label="Precio" required error={errors.precio} htmlFor="v-precio">
            <TextInput
              id="v-precio"
              type="number"
              inputMode="numeric"
              min="0"
              value={form.precio}
              error={errors.precio}
              onChange={(e) => set('precio', e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="Nota" htmlFor="v-nota">
        <TextArea id="v-nota" value={form.nota} onChange={(e) => set('nota', e.target.value)} />
      </Field>

      <Field
        label="Foto del resultado"
        htmlFor="v-foto"
        hint="Se comprime automáticamente y se sube al guardar la visita."
        error={errorFoto}
      >
        {/* Input real oculto (.sr-only, no display:none: sigue en el tab
            order) — el botón visible es el <label> de abajo, así se puede
            controlar el texto ("Tomar foto" en celular/tablet), cosa que
            el botón nativo del input no permite (su texto lo pone el
            navegador y no se puede cambiar por CSS).
            capture="environment" salta directo a la cámara trasera en
            celular en vez de mostrar primero el selector "Cámara / Galería
            / Archivos"; en desktop el navegador lo ignora y cae al
            selector de archivos de siempre. */}
        <input
          type="file"
          id="v-foto"
          accept="image/*"
          capture="environment"
          className="foto-input sr-only"
          onChange={handleFoto}
        />
        <label htmlFor="v-foto" className="foto-boton">
          <span className="foto-boton__texto foto-boton__texto--movil">Tomar foto</span>
          <span className="foto-boton__texto foto-boton__texto--desktop">Seleccionar archivo</span>
        </label>
        {form.fotoResultado && (
          <div className="foto-preview">
            <img className="foto-preview__img" src={form.fotoResultado} alt="Resultado" />
            <div>
              <Button
                variant="danger"
                size="sm"
                className="foto-preview__quitar"
                onClick={() => set('fotoResultado', '')}
              >
                Quitar foto
              </Button>
            </div>
          </div>
        )}
      </Field>
    </Modal>
  )
}
