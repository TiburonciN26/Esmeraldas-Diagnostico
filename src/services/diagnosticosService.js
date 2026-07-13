// Servicio de Diagnósticos (uno por cliente). Habla con el Apps Script.
// Las escrituras van junto con el cliente por clientesService.guardarClienteCompleto.

import { apiGet } from './api'

export async function getDiagnosticoByClienteId(clienteId) {
  return apiGet('getDiagnosticoByClienteId', { clienteId })
}
