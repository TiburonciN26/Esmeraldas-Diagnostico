import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useSession } from '../../context/SessionContext'
import { useConfirm } from '../../context/ConfirmContext'
import { createVisita, updateVisita, visitaVacia } from '../../services'
import { TIPOS_APLICACION, PORCENTAJE_CANAS } from '../../data/constants'
import { hoyISO } from '../../utils/date'
import { calcularVisibilidad } from '../../utils/visitaLogic'
import { comprimirImagen } from '../../utils/image'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput, TextArea, Select } from '../ui/Field'

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
  const { visitaModal, closeVisitaModal, refresh } = useApp()
  const { session } = useSession()
  const esAdmin = session?.rol === 'administrador'
  const confirmar = useConfirm()
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

  if (!open) return null

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
      if (esEdicion) {
        // Editar modifica ESA visita (no crea una nueva).
        await updateVisita(visitaId, datos)
      } else {
        // Alta: siempre crea un registro nuevo (la última visita no se toca).
        await createVisita(clienteId, datos)
      }

      refresh()
      closeVisitaModal()
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
      {saveError && <div className="form-error">{saveError}</div>}

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

      {/* Condicional: decoloración - etapa */}
      {vis.decoloracion && (
        <Field label="Decoloración — etapa" htmlFor="v-decol">
          <div className="field--cond">
            <TextInput
              id="v-decol"
              value={form.decoloracionEtapa}
              placeholder="Ej. Etapa 2 - fondo naranja"
              onChange={(e) => set('decoloracionEtapa', e.target.value)}
            />
          </div>
        </Field>
      )}

      {/* Fórmula raíz + Oxidante raíz en la misma fila (cascada) */}
      <div className="form-row">
        <Field label="Fórmula raíz" htmlFor="v-fraiz">
          <TextInput
            id="v-fraiz"
            value={form.formulaRaiz}
            placeholder="Ej. 6.0 + 6.11"
            onChange={(e) => set('formulaRaiz', e.target.value)}
          />
        </Field>

        {vis.oxidanteRaiz && (
          <Field label="Oxidante raíz" htmlFor="v-oraiz">
            <div className="field--cond">
              <TextInput
                id="v-oraiz"
                value={form.oxidanteRaiz}
                placeholder="Ej. 20 vol"
                onChange={(e) => set('oxidanteRaiz', e.target.value)}
              />
            </div>
          </Field>
        )}
      </div>

      {vis.tiempoRaiz && (
        <Field label="Tiempo raíz" htmlFor="v-traiz">
          <div className="field--cond">
            <TextInput
              id="v-traiz"
              value={form.tiempoRaiz}
              placeholder="Ej. 35 min"
              onChange={(e) => set('tiempoRaiz', e.target.value)}
            />
          </div>
        </Field>
      )}

      {/* Fórmula medios a puntas (oculta para "Retoque de raíz") */}
      {vis.mediosBloque && (
        <div className="field--cond">
          <div className="form-row">
            <Field label="Fórmula medios a puntas" htmlFor="v-fmed">
              <TextInput
                id="v-fmed"
                value={form.formulaMediosAPuntas}
                placeholder="Ej. 9.1"
                onChange={(e) => set('formulaMediosAPuntas', e.target.value)}
              />
            </Field>

            {vis.oxidanteMedios && (
              <Field label="Oxidante medios a puntas" htmlFor="v-omed">
                <TextInput
                  id="v-omed"
                  value={form.oxidanteMediosAPuntas}
                  placeholder="Ej. 30 vol"
                  onChange={(e) => set('oxidanteMediosAPuntas', e.target.value)}
                />
              </Field>
            )}
          </div>

          {vis.tiempoMedios && (
            <Field label="Tiempo medios a puntas" htmlFor="v-tmed">
              <TextInput
                id="v-tmed"
                value={form.tiempoMediosAPuntas}
                placeholder="Ej. 40 min"
                onChange={(e) => set('tiempoMediosAPuntas', e.target.value)}
              />
            </Field>
          )}
        </div>
      )}

      {/* Resultado y datos generales */}
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
              placeholder="Ej. 15000"
              onChange={(e) => set('precio', e.target.value)}
            />
          </Field>
        )}
      </div>

      <div className="form-row">
        <Field label="Color obtenido" htmlFor="v-color">
          <TextInput
            id="v-color"
            value={form.colorObtenido}
            placeholder="Ej. Rubio ceniza"
            onChange={(e) => set('colorObtenido', e.target.value)}
          />
        </Field>

        <Field label="Porcentaje de canas" htmlFor="v-canas">
          <Select
            id="v-canas"
            options={PORCENTAJE_CANAS.map((p) => ({ value: p, label: `${p}%` }))}
            placeholder="—"
            value={form.porcentajeCanas}
            onChange={(e) => set('porcentajeCanas', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Largo del cabello" htmlFor="v-largo">
        <TextInput
          id="v-largo"
          value={form.largoCabello}
          placeholder="Ej. Media melena"
          onChange={(e) => set('largoCabello', e.target.value)}
        />
      </Field>

      <Field label="Nota" htmlFor="v-nota">
        <TextArea
          id="v-nota"
          value={form.nota}
          placeholder="Observaciones de la aplicación…"
          onChange={(e) => set('nota', e.target.value)}
        />
      </Field>

      <Field
        label="Foto del resultado"
        hint="Se comprime automáticamente y se sube al guardar la visita."
        error={errorFoto}
      >
        <input type="file" accept="image/*" className="foto-input" onChange={handleFoto} />
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
