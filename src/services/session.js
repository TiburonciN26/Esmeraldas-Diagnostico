// Persistencia local de la sesión (correo + código + rol + nombre).
// No hay tokens de verdad: el "código" es el mismo que valida el backend
// contra la pestaña "usuario" en cada request.
//
// La contraseña queda en texto plano acá (localStorage) y también en el
// CacheService del backend (usuariosCacheados_ en Code.gs) — no hay hash ni
// cifrado en ningún lado. Es una decisión consciente del diseño de auth
// liviana elegido para un equipo chico de confianza, no un descuido: no vale
// la pena la complejidad de hashear una contraseña que el backend igual
// necesita en texto plano para compararla contra la columna "codigo" de la
// hoja (que tampoco está hasheada). Si esto alguna vez maneja datos más
// sensibles que fichas de colorimetría, hay que repensar el esquema entero
// de auth, no parchear esta pieza sola.

const KEY = 'esmeraldas_session'

// Caché de la lista de clientes (ver AppContext.jsx) — se declara acá, no
// ahí, para que clearSession() pueda borrarla al cerrar sesión sin que
// AppContext.jsx tenga que exponer nada. Sin esto, cerrar sesión en un
// dispositivo compartido dejaba nombres y teléfonos de clientas legibles en
// localStorage para quien use el navegador después.
export const CLIENTES_CACHE_KEY = 'esmeraldas_clientes_cache'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(CLIENTES_CACHE_KEY)
}
