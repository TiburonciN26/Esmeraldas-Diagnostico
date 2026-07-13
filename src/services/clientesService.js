// Servicio de Clientes. Habla con el Apps Script (ver /apps-script/Code.gs)
// a través de apiGet/apiPost — misma firma que en la fase de datos mock,
// así que los componentes que lo consumen no cambiaron.

import { apiGet, apiPost } from './api'

export async function getClientes() {
  return apiGet('getClientes')
}

export async function getClienteById(id) {
  return apiGet('getClienteById', { id })
}

// Cliente + diagnóstico + visitas en una sola llamada — usado por la
// pantalla de Detalle para no disparar 3 requests en paralelo (cada una
// paga aparte el arranque en frío de Apps Script).
export async function getClienteCompleto(id) {
  return apiGet('getClienteCompleto', { id })
}

// Guarda cliente + diagnóstico en un solo request. id = null -> alta de
// ambos; con id -> actualiza el cliente y crea o actualiza su diagnóstico
// (lo resuelve el backend, que ya sabe si existía uno).
export async function guardarClienteCompleto(id, cliente, diagnostico) {
  return apiPost('guardarClienteCompleto', { id, cliente, diagnostico })
}

// Soft-delete: no borra el registro, solo marca activo = false.
export async function deleteCliente(id) {
  return apiPost('deleteCliente', { id })
}
