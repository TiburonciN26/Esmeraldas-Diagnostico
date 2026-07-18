import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { createVisita, updateVisita, visitaVacia } from '../../services'
import {
  TIPOS_APLICACION,
  PORCENTAJE_CANAS,
  LARGO_CABELLO,
  COLORES_OBTENIDOS,
} from '../../data/constants'
import { hoyISO } from '../../utils/date'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { comprimirImagen } from '../../utils/image'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput, AutoGrowInput, TextArea, Select } from '../ui/Field'

// Campos que se copian desde la última visita al crear una nueva.
// (No se copian ni "fecha" -> hoy, ni "fotoResultado" -> vacía.)
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
  'nota',
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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [errors, setErrors] = useState({})
  const [errorFoto, setErrorFoto] = useState(null)
  // Snapshot del formulario recién cargado, para detectar cambios sin guardar.
  const inicialRef = useRef(null)

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
  }, [open, visitaId, esEdicion, visita])

  const vis = calcularVisibilidad(form)
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const validar = () => {
    const e = {}
    if (!form.tipoAplicacion) e.tipoAplicacion = 'Elegí un tipo de aplicación.'
    if (!form.fecha) e.fecha = 'La fecha es obligatoria.'
    if (form.precio !== '' && Number(form.precio) < 0) {
      e.precio = 'No puede ser negativo.'
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
    if (!vis.oxidanteRaiz) limpio.oxidanteRaiz = ''
    if (!vis.tiempoRaiz) limpio.tiempoRaiz = ''
    if (!vis.mediosBloque) {
      limpio.formulaMediosAPuntas = ''
      limpio.oxidanteMediosAPuntas = ''
      limpio.tiempoMediosAPuntas = ''
    } else {
      if (!vis.oxidanteMedios) limpio.oxidanteMediosAPuntas = ''
      if (!vis.tiempoMedios) limpio.tiempoMediosAPuntas = ''
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
        : await createVisita(clienteId, datos)

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

      {/* Tipo de aplicación conserva su placeholder ("Elegir…") a propósito:
          es un campo obligatorio, y un <select> sin opción vacía siempre
          muestra la primera opción como si ya estuviera elegida — si el
          usuario la quiere de verdad, no puede "reseleccionarla" (un
          <select> nativo no dispara onChange si no cambia el valor), así
          que el campo quedaría atascado en vacío sin poder guardar. Los
          demás campos de acá abajo son opcionales, así que no tienen ese
          problema y se les sacó el placeholder como pediste. */}
      <div className="form-row form-row--2-1">
        <Field label="Tipo de aplicación" required error={errors.tipoAplicacion} htmlFor="v-tipo">
          <Select
            id="v-tipo"
            options={TIPOS_APLICACION}
            placeholder="Elegir…"
            value={form.tipoAplicacion}
            error={errors.tipoAplicacion}
            onChange={(e) => set('tipoAplicacion', e.target.value)}
          />
        </Field>

        <Field label="% de canas" htmlFor="v-canas">
          <Select
            id="v-canas"
            options={PORCENTAJE_CANAS.map((p) => ({ value: p, label: `${p}%` }))}
            value={form.porcentajeCanas}
            onChange={(e) => set('porcentajeCanas', e.target.value)}
          />
        </Field>
      </div>

      {/* Condicional: decoloración - etapa */}
      {vis.decoloracion && (
        <Field label="Decoloración — etapa" htmlFor="v-decol">
          <div className="field--cond">
            <TextInput
              id="v-decol"
              value={form.decoloracionEtapa}
              onChange={(e) => set('decoloracionEtapa', e.target.value)}
            />
          </div>
        </Field>
      )}

      {/* Fórmula + oxígeno + tiempo (raíz), los 3 en una fila */}
      <div className="formula-row">
        <Field label="Fórmula raíz" htmlFor="v-fraiz">
          <AutoGrowInput
            id="v-fraiz"
            minChars={15}
            value={form.formulaRaiz}
            onChange={(e) => set('formulaRaiz', e.target.value)}
          />
        </Field>

        {vis.oxidanteRaiz && (
          <Field label="Oxig. Vol" htmlFor="v-oraiz">
            <div className="field--cond">
              <AutoGrowInput
                id="v-oraiz"
                minChars={8}
                value={form.oxidanteRaiz}
                onChange={(e) => set('oxidanteRaiz', e.target.value)}
              />
            </div>
          </Field>
        )}

        {vis.tiempoRaiz && (
          <Field label="Tiempo" htmlFor="v-traiz">
            <div className="field--cond">
              <AutoGrowInput
                id="v-traiz"
                minChars={6}
                value={form.tiempoRaiz}
                onChange={(e) => set('tiempoRaiz', e.target.value)}
              />
            </div>
          </Field>
        )}
      </div>

      {/* Fórmula + oxígeno + tiempo (medios a puntas), los 3 en una fila
          (oculto para "Retoque de raíz") */}
      {vis.mediosBloque && (
        <div className="field--cond formula-row">
          <Field label="Fórmula medios a puntas" htmlFor="v-fmed">
            <AutoGrowInput
              id="v-fmed"
              minChars={15}
              value={form.formulaMediosAPuntas}
              onChange={(e) => set('formulaMediosAPuntas', e.target.value)}
            />
          </Field>

          {vis.oxidanteMedios && (
            <Field label="Oxig.Vol" htmlFor="v-omed">
              <AutoGrowInput
                id="v-omed"
                minChars={6}
                value={form.oxidanteMediosAPuntas}
                onChange={(e) => set('oxidanteMediosAPuntas', e.target.value)}
              />
            </Field>
          )}

          {vis.tiempoMedios && (
            <Field label="Tiempo" htmlFor="v-tmed">
              <AutoGrowInput
                id="v-tmed"
                minChars={6}
                value={form.tiempoMediosAPuntas}
                onChange={(e) => set('tiempoMediosAPuntas', e.target.value)}
              />
            </Field>
          )}
        </div>
      )}

      {/* Resultado y datos generales */}
      <div className="form-row">
        <Field label="Color obtenido" htmlFor="v-color">
          <Select
            id="v-color"
            options={COLORES_OBTENIDOS}
            value={form.colorObtenido}
            onChange={(e) => set('colorObtenido', e.target.value)}
          />
        </Field>

        <Field label="Largo del cabello" htmlFor="v-largo">
          <Select
            id="v-largo"
            options={LARGO_CABELLO}
            value={form.largoCabello}
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
          <Field label="Precio" htmlFor="v-precio" error={errors.precio}>
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
        <input
          type="file"
          id="v-foto"
          accept="image/*"
          className="foto-input"
          onChange={handleFoto}
        />
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
