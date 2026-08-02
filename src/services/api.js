// Cliente HTTP hacia el Apps Script (ver /apps-script/Code.gs).
// Todas las demás funciones de /services pasan por acá — son las únicas
// que conocen la URL del backend y el formato exacto del request/response.

import { getSession } from './session'

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbzJ8bYwTHeomBabmrYRx0w5_co2wij24GmWVQnwACzEAZD0VGTjVJh_axmoD2cScjnTDQ/exec'

const TIMEOUT_MS = 30000

// Mismo texto que tira el backend cuando verificarUsuario_ rechaza el correo
// o la contraseña (ver Code.gs) — toda acción autenticada pasa por ahí, no
// solo el login. Si esto aparece en una acción que NO es 'login', significa
// que la sesión guardada ya no sirve (p.ej. le cambiaron la contraseña en la
// hoja "usuario" mientras había sesión abierta en este dispositivo), no que
// alguien tipeó mal un campo. SessionContext se suscribe acá para desloguear
// automáticamente en ese caso, en vez de dejar a la usuaria viendo el mismo
// error en cada acción sin salida clara.
const MENSAJE_CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos.'
let onSesionInvalida = null
export function setOnSesionInvalida(fn) {
  onSesionInvalida = fn
}

function credenciales() {
  const s = getSession()
  return { correo: s?.correo ?? '', codigo: s?.codigo ?? '' }
}

// Todo (lecturas y escrituras) va por POST, nunca como query string, para
// que el correo y la contraseña no queden en la URL ni en logs de
// servidores intermedios. Tampoco se declara "Content-Type: application/json"
// en el fetch — eso dispararía un preflight CORS que Apps Script no responde
// bien. Sin ese header el navegador manda text/plain, y el backend igual lo
// parsea con JSON.parse(e.postData.contents).
async function apiRequest(action, body) {
  const payload = { action, ...credenciales(), ...body }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder. Probá de nuevo.')
    }
    throw new Error('No se pudo conectar. Revisá tu conexión a internet.')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    throw new Error(`El servidor respondió con un error (${res.status}).`)
  }

  // Si Apps Script está en mantenimiento, sin cuota, o mal configurado,
  // responde una página HTML en vez del JSON esperado — sin este chequeo,
  // res.json() explota con un SyntaxError críptico en vez de un mensaje
  // legible para el usuario.
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('El servidor no devolvió una respuesta válida. Probá de nuevo en un momento.')
  }

  const json = await res.json()
  if (!json.ok) {
    if (action !== 'login' && json.error === MENSAJE_CREDENCIALES_INVALIDAS) {
      onSesionInvalida?.()
    }
    throw new Error(json.error || 'Error del servidor.')
  }
  return json.data
}

export async function apiGet(action, params = {}) {
  return apiRequest(action, params)
}

export async function apiPost(action, body = {}) {
  return apiRequest(action, body)
}

// Login: valida correo + contraseña contra la pestaña "usuario" y devuelve
// { correo, rol, nombre }. No usa la sesión guardada (todavía no existe).
export async function login(correo, codigo) {
  return apiRequest('login', { correo, codigo })
}
