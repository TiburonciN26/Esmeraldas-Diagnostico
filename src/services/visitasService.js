// Servicio de Visitas (varias por cliente, historial).
// Mock en memoria; misma firma async pensada para la Fase 6.

import { mockDB } from '../data/mockData'
import { genId, delay, clone } from './_utils'

// Campos por defecto de una visita, útil también para el modal en fases siguientes.
export const visitaVacia = {
  tipoAplicacion: '',
  decoloracionEtapa: '',
  formulaRaiz: '',
  oxidanteRaiz: '',
  tiempoRaiz: '',
  formulaMediosAPuntas: '',
  oxidanteMediosAPuntas: '',
  tiempoMediosAPuntas: '',
  fecha: '',
  precio: '',
  nota: '',
  colorObtenido: '',
  porcentajeCanas: '',
  largoCabello: '',
  fotoResultado: '',
}

// Devuelve las visitas activas de un cliente, ordenadas de más reciente a más antigua.
export async function getVisitasByClienteId(clienteId) {
  await delay()
  const visitas = mockDB.visitas
    .filter((v) => v.clienteId === clienteId && v.activo)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  return clone(visitas)
}

export async function getVisitaById(id) {
  await delay()
  const visita = mockDB.visitas.find((v) => v.id === id && v.activo)
  return visita ? clone(visita) : null
}

// Devuelve la visita más reciente de un cliente (para la precarga del modal "Nueva visita").
export async function getUltimaVisita(clienteId) {
  const visitas = await getVisitasByClienteId(clienteId)
  return visitas.length ? visitas[0] : null
}

export async function createVisita(clienteId, data) {
  await delay()
  const nueva = {
    ...visitaVacia,
    ...data,
    id: genId('v'),
    clienteId,
    activo: true,
  }
  mockDB.visitas.push(nueva)
  return clone(nueva)
}

export async function updateVisita(id, data) {
  await delay()
  const visita = mockDB.visitas.find((v) => v.id === id)
  if (!visita) return null
  Object.assign(visita, data, { id: visita.id, clienteId: visita.clienteId })
  return clone(visita)
}

// Soft-delete.
export async function deleteVisita(id) {
  await delay()
  const visita = mockDB.visitas.find((v) => v.id === id)
  if (!visita) return false
  visita.activo = false
  return true
}
