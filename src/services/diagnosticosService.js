// Servicio de Diagnósticos (uno por cliente).
// Mock en memoria; misma firma async pensada para la Fase 6.

import { mockDB } from '../data/mockData'
import { genId, delay, clone } from './_utils'

export async function getDiagnosticoByClienteId(clienteId) {
  await delay()
  const diag = mockDB.diagnosticos.find((d) => d.clienteId === clienteId)
  return diag ? clone(diag) : null
}

export async function createDiagnostico(clienteId, data) {
  await delay()
  const nuevo = {
    id: genId('d'),
    clienteId,
    canasResistentes: data.canasResistentes ?? 'No',
    alisadoOKeratinaPrevia: data.alisadoOKeratinaPrevia ?? 'No',
    fechaAlisadoOKeratina: data.fechaAlisadoOKeratina ?? '',
    grosorCabello: data.grosorCabello ?? 'Medio',
  }
  mockDB.diagnosticos.push(nuevo)
  return clone(nuevo)
}

export async function updateDiagnostico(clienteId, data) {
  await delay()
  const diag = mockDB.diagnosticos.find((d) => d.clienteId === clienteId)
  if (!diag) return null
  Object.assign(diag, {
    canasResistentes: data.canasResistentes ?? diag.canasResistentes,
    alisadoOKeratinaPrevia: data.alisadoOKeratinaPrevia ?? diag.alisadoOKeratinaPrevia,
    fechaAlisadoOKeratina: data.fechaAlisadoOKeratina ?? diag.fechaAlisadoOKeratina,
    grosorCabello: data.grosorCabello ?? diag.grosorCabello,
  })
  return clone(diag)
}
