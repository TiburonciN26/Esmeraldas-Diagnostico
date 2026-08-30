// Servicio de Usuario (sesión). Por ahora solo la foto de perfil — el resto
// de los datos del usuario (correo/rol/nombre) se cargan enteros en el login
// (ver SessionContext.jsx), no hace falta un getter aparte.

import { apiPost } from './api'

// Guarda la foto de perfil (data URL comprimida) de quien está logueada.
// El backend identifica a quién pertenece por la sesión autenticada, no por
// nada que mande este payload — no hay forma de pisar la foto de otro
// usuario desde acá.
export async function actualizarFotoUsuario(foto) {
  return apiPost('actualizarFotoUsuario', { foto })
}
