// Servicio de Clientes.
// Por ahora trabaja sobre los datos mock en memoria. La firma de cada función
// (async + Promise) está pensada para reemplazar el cuerpo por fetch() al
// Apps Script en la Fase 6 sin cambiar los componentes que las consumen.

import { mockDB } from '../data/mockData'
import { genId, delay, clone } from './_utils'

// Lista solo clientes activos (soft-delete: activo === true).
export async function getClientes() {
  await delay()
  return clone(mockDB.clientes.filter((c) => c.activo))
}

export async function getClienteById(id) {
  await delay()
  const cliente = mockDB.clientes.find((c) => c.id === id && c.activo)
  return cliente ? clone(cliente) : null
}

export async function createCliente(data) {
  await delay()
  const nuevo = {
    id: genId('c'),
    nombreCompleto: data.nombreCompleto ?? '',
    telefono: data.telefono ?? '',
    fechaCumpleanos: data.fechaCumpleanos ?? '',
    activo: true,
  }
  mockDB.clientes.push(nuevo)
  return clone(nuevo)
}

export async function updateCliente(id, data) {
  await delay()
  const cliente = mockDB.clientes.find((c) => c.id === id)
  if (!cliente) return null
  Object.assign(cliente, {
    nombreCompleto: data.nombreCompleto ?? cliente.nombreCompleto,
    telefono: data.telefono ?? cliente.telefono,
    fechaCumpleanos: data.fechaCumpleanos ?? cliente.fechaCumpleanos,
  })
  return clone(cliente)
}

// Soft-delete: no borra el registro, solo marca activo = false.
export async function deleteCliente(id) {
  await delay()
  const cliente = mockDB.clientes.find((c) => c.id === id)
  if (!cliente) return false
  cliente.activo = false
  return true
}
