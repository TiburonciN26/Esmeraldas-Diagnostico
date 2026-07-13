import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getVisitaById,
  getUltimaVisita,
  createVisita,
  updateVisita,
  visitaVacia,
} from '../../services'
import {
  TIPOS_APLICACION,
  TIPOS_CON_DECOLORACION,
  TIPO_SOLO_RAIZ,
  PORCENTAJE_CANAS,
} from '../../data/constants'
import { hoyISO } from '../../utils/date'
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

// Calcula qué campos condicionales deben mostrarse según el estado actual.
function calcularVisibilidad(form) {
  const tieneTexto = (v) => String(v ?? '').trim() !== ''
  const mostrarMediosBloque = form.tipoAplicacion !== TIPO_SOLO_RAIZ
  return {
    // Decoloración: solo para ciertos tipos de aplicación.
    decoloracion: TIPOS_CON_DECOLORACION.includes(form.tipoAplicacion),
    // Cascada raíz.
    oxidanteRaiz: tieneTexto(form.formulaRaiz),
    tiempoRaiz: tieneTexto(form.formulaRaiz) && tieneTexto(form.oxidanteRaiz),
    // Bloque medios a puntas (oculto entero para "Retoque de raíz").
    mediosBloque: mostrarMediosBloque,
    oxidanteMedios: mostrarMediosBloque && tieneTexto(form.formulaMediosAPuntas),
    tiempoMedios:
      mostrarMediosBloque &&
      tieneTexto(form.formulaMediosAPuntas) &&
      tieneTexto(form.oxidanteMediosAPuntas),
  }
}

export default function VisitaModal() {
  const { visitaModal, closeVisitaModal, refresh } = useApp()
  const { open, clienteId, visitaId } = visitaModal
  const esEdicion = Boolean(visitaId)

  const [form, setForm] = useState({ ...visitaVacia })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Al abrir, decidir precarga:
  // - Edición: cargar ESA visita.
  // - Alta con historial: copiar la última visita (menos fecha y foto).
  // - Alta sin historial: formulario vacío con la fecha de hoy.
  useEffect(() => {
    if (!open) return
    setErrors({})
    let vivo = true
    setLoading(true)

    const preparar = async () => {
      if (esEdicion) {
        const v = await getVisitaById(visitaId)
        return { ...visitaVacia, ...(v || {}) }
      }
      const ultima = await getUltimaVisita(clienteId)
      const base = { ...visitaVacia, fecha: hoyISO() }
      if (ultima) {
        for (const campo of CAMPOS_PRECARGA) base[campo] = ultima[campo] ?? ''
      }
      return base
    }

    preparar().then((datos) => {
      if (!vivo) return
      setForm(datos)
      setLoading(false)
    })

    return () => {
      vivo = false
    }
  }, [open, clienteId, visitaId, esEdicion])

  if (!open) return null

  const vis = calcularVisibilidad(form)
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const validar = () => {
    const e = {}
    if (!form.tipoAplicacion) e.tipoAplicacion = 'Elegí un tipo de aplicación.'
    if (!form.fecha) e.fecha = 'La fecha es obligatoria.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Lee el archivo elegido y lo guarda como data URL (preview local).
  // En la Fase 6 esto se reemplaza por compresión + subida a Google Drive.
  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('fotoResultado', reader.result)
    reader.readAsDataURL(file)
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
    const datos = sanitizar()

    if (esEdicion) {
      // Editar modifica ESA visita (no crea una nueva).
      await updateVisita(visitaId, datos)
    } else {
      // Alta: siempre crea un registro nuevo (la última visita no se toca).
      await createVisita(clienteId, datos)
    }

    setSaving(false)
    refresh()
    closeVisitaModal()
  }

  return (
    <Modal
      title={esEdicion ? 'Editar visita' : 'Nueva visita'}
      onClose={closeVisitaModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeVisitaModal} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar} disabled={saving || loading}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="loading">Cargando…</div>
      ) : (
        <>
          <Field
            label="Tipo de aplicación"
            required
            error={errors.tipoAplicacion}
            htmlFor="v-tipo"
          >
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

            <Field label="Precio" htmlFor="v-precio">
              <TextInput
                id="v-precio"
                type="number"
                inputMode="numeric"
                value={form.precio}
                placeholder="Ej. 15000"
                onChange={(e) => set('precio', e.target.value)}
              />
            </Field>
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

          <Field label="Foto del resultado" hint="Por ahora solo se guarda una previsualización local.">
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
        </>
      )}
    </Modal>
  )
}
