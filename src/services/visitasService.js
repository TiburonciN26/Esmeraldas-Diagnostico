// Servicio de Visitas (varias por cliente, historial). Habla con el Apps
// Script. Si "fotoResultado" trae una foto recién elegida (data URL local,
// todavía no subida), el backend la sube a Drive y guarda la URL definitiva
// como parte del mismo request de crear/editar la visita.

import { apiPost } from './api'

// Campos por defecto de una visita, usado por el modal para el estado inicial.
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

export async function createVisita(clienteId, data) {
  return apiPost('createVisita', { clienteId, data })
}

export async function updateVisita(id, data) {
  return apiPost('updateVisita', { id, data })
}

// Soft-delete.
export async function deleteVisita(id) {
  return apiPost('deleteVisita', { id })
}
