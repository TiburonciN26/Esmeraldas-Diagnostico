import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useConfirm } from '../../context/ConfirmContext'
import { getClienteById, getDiagnosticoByClienteId, guardarClienteCompleto } from '../../services'
import { GROSOR_CABELLO, SI_NO } from '../../data/constants'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput, Select, Segmented } from '../ui/Field'

// Estado inicial del formulario (cliente + diagnóstico juntos).
const FORM_VACIO = {
  nombreCompleto: '',
  telefono: '',
  fechaCumpleanos: '',
  canasResistentes: 'No',
  alisadoOKeratinaPrevia: 'No',
  fechaAlisadoOKeratina: '',
  grosorCabello: 'Medio',
}

export default function ClienteModal() {
  const { clienteModal, closeClienteModal, refresh } = useApp()
  const confirmar = useConfirm()
  const { open, clienteId } = clienteModal
  const esEdicion = Boolean(clienteId)

  const [form, setForm] = useState(FORM_VACIO)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [errors, setErrors] = useState({})
  const [retryTick, setRetryTick] = useState(0)
  // Snapshot del formulario recién cargado, para detectar cambios sin guardar.
  const inicialRef = useRef(null)

  // Al abrir: si es edición, precargar cliente + diagnóstico; si es alta, limpiar.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setLoadError(null)
    if (!esEdicion) {
      setForm(FORM_VACIO)
      inicialRef.current = JSON.stringify(FORM_VACIO)
      return
    }
    let vivo = true
    setLoading(true)
    Promise.all([getClienteById(clienteId), getDiagnosticoByClienteId(clienteId)])
      .then(([c, d]) => {
        if (!vivo) return
        const datos = {
          nombreCompleto: c?.nombreCompleto ?? '',
          telefono: c?.telefono ?? '',
          fechaCumpleanos: c?.fechaCumpleanos ?? '',
          canasResistentes: d?.canasResistentes ?? 'No',
          alisadoOKeratinaPrevia: d?.alisadoOKeratinaPrevia ?? 'No',
          fechaAlisadoOKeratina: d?.fechaAlisadoOKeratina ?? '',
          grosorCabello: d?.grosorCabello ?? 'Medio',
        }
        setForm(datos)
        inicialRef.current = JSON.stringify(datos)
        setLoading(false)
      })
      .catch((err) => {
        if (!vivo) return
        console.error('Error cargando cliente/diagnóstico:', err)
        setLoadError('No se pudieron cargar los datos del cliente.')
        setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [open, clienteId, esEdicion, retryTick])

  if (!open) return null

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Cierra pidiendo confirmación si hay cambios sin guardar.
  const cerrarConGuardia = async () => {
    const sucio = inicialRef.current !== null && JSON.stringify(form) !== inicialRef.current
    if (sucio && !(await confirmar('Hay cambios sin guardar. ¿Descartar los cambios?'))) return
    closeClienteModal()
  }

  const validar = () => {
    const e = {}
    if (!form.nombreCompleto.trim()) e.nombreCompleto = 'El nombre es obligatorio.'

    const tel = form.telefono.trim()
    if (tel) {
      if (!/^[\d\s()+-]+$/.test(tel)) {
        e.telefono = 'Solo números, espacios y + - ( ).'
      } else if (tel.replace(/\D/g, '').length < 7) {
        e.telefono = 'Parece incompleto.'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setSaving(true)
    setSaveError(null)

    // Si "alisado/keratina previa" es No, no guardamos la fecha.
    const fechaAlisado =
      form.alisadoOKeratinaPrevia === 'Sí' ? form.fechaAlisadoOKeratina : ''

    const datosCliente = {
      nombreCompleto: form.nombreCompleto.trim(),
      telefono: form.telefono.trim(),
      fechaCumpleanos: form.fechaCumpleanos,
    }
    const datosDiagnostico = {
      canasResistentes: form.canasResistentes,
      alisadoOKeratinaPrevia: form.alisadoOKeratinaPrevia,
      fechaAlisadoOKeratina: fechaAlisado,
      grosorCabello: form.grosorCabello,
    }

    try {
      await guardarClienteCompleto(esEdicion ? clienteId : null, datosCliente, datosDiagnostico)
      refresh()
      closeClienteModal()
    } catch (err) {
      console.error('Error guardando cliente:', err)
      setSaveError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={cerrarConGuardia}
      footer={
        <>
          <Button variant="ghost" onClick={cerrarConGuardia} disabled={saving}>
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
      ) : loadError ? (
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>{loadError}</p>
          <Button variant="ghost" onClick={() => setRetryTick((t) => t + 1)}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {saveError && <div className="form-error">{saveError}</div>}

          {/* Sección 1: datos del cliente */}
          <div className="card card--accent">
            <div className="form-section-label">Datos del cliente</div>

            <Field
              label="Nombre completo"
              required
              error={errors.nombreCompleto}
              htmlFor="f-nombre"
            >
              <TextInput
                id="f-nombre"
                value={form.nombreCompleto}
                error={errors.nombreCompleto}
                onChange={(e) => set('nombreCompleto', e.target.value)}
              />
            </Field>

            <div className="form-row">
              <Field label="Teléfono" htmlFor="f-tel" error={errors.telefono}>
                <TextInput
                  id="f-tel"
                  type="tel"
                  value={form.telefono}
                  error={errors.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </Field>

              <Field label="Fecha de cumpleaños" htmlFor="f-cumple">
                <TextInput
                  id="f-cumple"
                  type="date"
                  value={form.fechaCumpleanos}
                  onChange={(e) => set('fechaCumpleanos', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Sección 2: diagnóstico */}
          <div className="card card--accent">
            <div className="form-section-label">Diagnóstico</div>

            <div className="form-row">
              <Field label="Canas resistentes">
                <div>
                  <Segmented
                    name="Canas resistentes"
                    options={SI_NO}
                    value={form.canasResistentes}
                    onChange={(v) => set('canasResistentes', v)}
                  />
                </div>
              </Field>

              <Field label="Alisado o keratina previa">
                <div>
                  <Segmented
                    name="Alisado o keratina previa"
                    options={SI_NO}
                    value={form.alisadoOKeratinaPrevia}
                    onChange={(v) => set('alisadoOKeratinaPrevia', v)}
                  />
                </div>
              </Field>
            </div>

            {/* Fecha condicional: solo si alisado/keratina previa === "Sí" */}
            {form.alisadoOKeratinaPrevia === 'Sí' && (
              <Field label="Fecha del alisado o keratina" htmlFor="f-alisado">
                <TextInput
                  id="f-alisado"
                  type="date"
                  value={form.fechaAlisadoOKeratina}
                  onChange={(e) => set('fechaAlisadoOKeratina', e.target.value)}
                />
              </Field>
            )}

            <Field label="Grosor del cabello" htmlFor="f-grosor">
              <Select
                id="f-grosor"
                options={GROSOR_CABELLO}
                value={form.grosorCabello}
                onChange={(e) => set('grosorCabello', e.target.value)}
              />
            </Field>
          </div>
        </>
      )}
    </Modal>
  )
}
