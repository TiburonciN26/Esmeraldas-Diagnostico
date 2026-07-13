import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getClienteById,
  getDiagnosticoByClienteId,
  createCliente,
  updateCliente,
  createDiagnostico,
  updateDiagnostico,
} from '../../services'
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
  const { open, clienteId } = clienteModal
  const esEdicion = Boolean(clienteId)

  const [form, setForm] = useState(FORM_VACIO)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Al abrir: si es edición, precargar cliente + diagnóstico; si es alta, limpiar.
  useEffect(() => {
    if (!open) return
    setErrors({})
    if (!esEdicion) {
      setForm(FORM_VACIO)
      return
    }
    let vivo = true
    setLoading(true)
    Promise.all([getClienteById(clienteId), getDiagnosticoByClienteId(clienteId)]).then(
      ([c, d]) => {
        if (!vivo) return
        setForm({
          nombreCompleto: c?.nombreCompleto ?? '',
          telefono: c?.telefono ?? '',
          fechaCumpleanos: c?.fechaCumpleanos ?? '',
          canasResistentes: d?.canasResistentes ?? 'No',
          alisadoOKeratinaPrevia: d?.alisadoOKeratinaPrevia ?? 'No',
          fechaAlisadoOKeratina: d?.fechaAlisadoOKeratina ?? '',
          grosorCabello: d?.grosorCabello ?? 'Medio',
        })
        setLoading(false)
      }
    )
    return () => {
      vivo = false
    }
  }, [open, clienteId, esEdicion])

  if (!open) return null

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const validar = () => {
    const e = {}
    if (!form.nombreCompleto.trim()) e.nombreCompleto = 'El nombre es obligatorio.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setSaving(true)

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

    if (esEdicion) {
      await updateCliente(clienteId, datosCliente)
      // Si el cliente no tenía diagnóstico, lo creamos; si tenía, lo actualizamos.
      const diagExistente = await getDiagnosticoByClienteId(clienteId)
      if (diagExistente) {
        await updateDiagnostico(clienteId, datosDiagnostico)
      } else {
        await createDiagnostico(clienteId, datosDiagnostico)
      }
    } else {
      const nuevo = await createCliente(datosCliente)
      await createDiagnostico(nuevo.id, datosDiagnostico)
    }

    setSaving(false)
    refresh()
    closeClienteModal()
  }

  return (
    <Modal
      title={esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={closeClienteModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeClienteModal} disabled={saving}>
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
              <Field label="Teléfono" htmlFor="f-tel">
                <TextInput
                  id="f-tel"
                  value={form.telefono}
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
