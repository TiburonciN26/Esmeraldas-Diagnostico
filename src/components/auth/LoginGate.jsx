import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import Button from '../ui/Button'
import { Field, TextInput } from '../ui/Field'
import logoUrl from '../../img/LOGOESMERALDAS.png'

// Bloquea el resto de la app hasta que haya una sesión válida.
// No hay "olvidé mi contraseña": la reasigna el admin editando la pestaña
// "usuario" directamente en la hoja.
export default function LoginGate({ children }) {
  const { session, login, motivoSalida } = useSession()
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)

  // Este componente nunca se desmonta (solo alterna entre mostrar el
  // formulario o "children"), así que si no limpiamos a mano, después de
  // un logout el formulario reaparece con el correo/código anteriores
  // todavía cargados en el estado.
  useEffect(() => {
    if (!session) {
      setCorreo('')
      setCodigo('')
      setError(null)
    }
  }, [session])

  if (session) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(correo.trim(), codigo.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__logo">
          <img src={logoUrl} alt="Esmeraldas Salón & Spa" />
        </div>
        <p className="muted login-card__sub">Ingresá con tu correo y contraseña.</p>

        {(error || motivoSalida) && (
          <div className="form-error" role="alert">
            {error || motivoSalida}
          </div>
        )}

        <Field label="Correo" required htmlFor="login-correo">
          <TextInput
            id="login-correo"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </Field>

        <Field label="Contraseña" required htmlFor="login-codigo">
          <div className="password-field">
            <TextInput
              id="login-codigo"
              type={mostrarContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-field__toggle"
              aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={mostrarContrasena}
              onClick={() => setMostrarContrasena((v) => !v)}
            >
              {mostrarContrasena ? (
                <EyeOff size={16} strokeWidth={2.25} />
              ) : (
                <Eye size={16} strokeWidth={2.25} />
              )}
            </button>
          </div>
        </Field>

        <Button type="submit" variant="primary" disabled={loading} className="login-card__btn">
          {loading ? 'Ingresando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
