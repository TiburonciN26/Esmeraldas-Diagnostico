import { useEffect, useRef, useState } from 'react'
import { User, Phone, Cake } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { getClienteById, getDiagnosticoByClienteId, guardarClienteCompleto } from '../../services'
import { GROSOR_CABELLO, SI_NO, MESES } from '../../data/constants'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput, Select, Segmented } from '../ui/Field'

// Estado inicial del formulario (cliente + diagnóstico juntos). El
// cumpleaños vive como diaCumpleanos/mesCumpleanos SUELTOS (no como un
// fechaCumpleanos único derivado en cada tecleo) — si se derivara de un
// solo campo, escribir el día mientras el mes todavía está vacío
// reconstruiría una fecha inválida, la limpiaría a "", y en el siguiente
// render el día tecleado desaparecería solo. Se arma la fecha ISO final
// recién al guardar (ver armarCumpleanos).
const FORM_VACIO = {
  nombreCompleto: '',
  telefono: '',
  diaCumpleanos: '',
  mesCumpleanos: '',
  canasResistentes: 'No',
  grosorCabello: 'Medio',
}

const OPCIONES_MES = MESES.map((nombre, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: nombre,
}))

// El cumpleaños solo pide día y mes (no se pregunta el año de nacimiento) —
// se sigue guardando como fecha ISO completa (mismo campo/formato de
// siempre, sin tocar el backend ni esCumpleanosHoy, que ya compara solo mes
// y día) usando este año fijo de relleno, que nunca se muestra en pantalla.
const ANIO_CUMPLE_RELLENO = '2000'

// Extrae { dia, mes } (strings "DD"/"MM") de una fecha ISO. Si falta o no
// matchea, ambos quedan vacíos (campos sin completar).
function partesCumpleanos(iso) {
  const m = String(iso || '').match(/^\d{4}-(\d{2})-(\d{2})/)
  return m ? { mes: m[1], dia: m[2] } : { mes: '', dia: '' }
}

// Arma la fecha ISO a partir de día y mes sueltos. Si falta alguno, no hay
// fecha completa todavía (el campo es opcional, así que esto es válido).
function armarCumpleanos(dia, mes) {
  if (!dia || !mes) return ''
  return `${ANIO_CUMPLE_RELLENO}-${mes.padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export default function ClienteModal() {
  const { clienteModal, closeClienteModal, aplicarClienteGuardado, clientes } = useApp()
  const confirmar = useConfirm()
  const toast = useToast()
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
        const { dia, mes } = partesCumpleanos(c?.fechaCumpleanos)
        const datos = {
          nombreCompleto: c?.nombreCompleto ?? '',
          telefono: c?.telefono ?? '',
          diaCumpleanos: dia,
          mesCumpleanos: mes,
          canasResistentes: d?.canasResistentes ?? 'No',
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
    if (!tel) {
      e.telefono = 'El teléfono es obligatorio.'
    } else if (!/^[\d\s()+-]+$/.test(tel)) {
      e.telefono = 'Solo números, espacios y + - ( ).'
    } else if (tel.replace(/\D/g, '').length < 7) {
      e.telefono = 'Parece incompleto.'
    } else {
      // Duplicado: comparamos solo los dígitos, para que "931 893667" y
      // "931-893667" cuenten como el mismo número. Se excluye al propio
      // cliente (si estamos editando) para no marcarse a sí mismo.
      const telNormalizado = tel.replace(/\D/g, '')
      const yaExiste = clientes.some(
        (c) => c.id !== clienteId && String(c.telefono || '').replace(/\D/g, '') === telNormalizado
      )
      if (yaExiste) e.telefono = 'Ya hay un cliente con este teléfono.'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setSaving(true)
    setSaveError(null)

    const datosCliente = {
      nombreCompleto: form.nombreCompleto.trim(),
      telefono: form.telefono.trim(),
      fechaCumpleanos: armarCumpleanos(form.diaCumpleanos, form.mesCumpleanos),
    }
    const datosDiagnostico = {
      canasResistentes: form.canasResistentes,
      grosorCabello: form.grosorCabello,
    }

    try {
      const resultado = await guardarClienteCompleto(
        esEdicion ? clienteId : null,
        datosCliente,
        datosDiagnostico
      )
      aplicarClienteGuardado(resultado)
      closeClienteModal()
      toast(esEdicion ? 'Cliente actualizado' : 'Cliente creado')
    } catch (err) {
      console.error('Error guardando cliente:', err)
      setSaveError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={cerrarConGuardia}
      footer={
        <>
          <Button variant="ghost" onClick={cerrarConGuardia} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="btn--sin-borde-rosa"
            onClick={handleGuardar}
            disabled={saving || loading}
          >
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
          {saveError && (
            <div className="form-error" role="alert">
              {saveError}
            </div>
          )}

          {/* Sección 1: datos del cliente (sin título — a pedido) */}
          <div className="card">
            <Field
              icon={<User size={14} strokeWidth={2.25} />}
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
              <Field
                icon={<Phone size={14} strokeWidth={2.25} />}
                label="Teléfono"
                required
                htmlFor="f-tel"
                error={errors.telefono}
              >
                <TextInput
                  id="f-tel"
                  type="tel"
                  value={form.telefono}
                  error={errors.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </Field>

              <Field
                icon={<Cake size={14} strokeWidth={2.25} color="var(--color-amarillo-brillante)" />}
                label="Cumpleaños (día y mes)"
              >
                {/* Sin año a propósito — no se pregunta el año de
                    nacimiento, solo día y mes (lo único que necesita el
                    aviso de cumpleaños). */}
                <div className="cumple-inputs">
                  <TextInput
                    id="f-cumple-dia"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="Día"
                    aria-label="Día de cumpleaños"
                    value={form.diaCumpleanos}
                    onChange={(e) => set('diaCumpleanos', e.target.value)}
                  />
                  <Select
                    id="f-cumple-mes"
                    options={OPCIONES_MES}
                    placeholder="Mes"
                    aria-label="Mes de cumpleaños"
                    value={form.mesCumpleanos}
                    onChange={(e) => set('mesCumpleanos', e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Sección 2: diagnóstico */}
          <div className="card">
            <h3 className="form-section-label">Diagnóstico</h3>

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

              <Field label="Grosor del cabello" htmlFor="f-grosor">
                <Select
                  id="f-grosor"
                  options={GROSOR_CABELLO}
                  value={form.grosorCabello}
                  onChange={(e) => set('grosorCabello', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
