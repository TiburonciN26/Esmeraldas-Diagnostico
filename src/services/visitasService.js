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
  onzasRaiz: '',
  tiempoRaiz: '',
  amonioRaiz: '',
  formulaMediosAPuntas: '',
  oxidanteMediosAPuntas: '',
  onzasMediosAPuntas: '',
  tiempoMediosAPuntas: '',
  amonioMediosAPuntas: '',
  fecha: '',
  precio: '',
  nota: '',
  colorObtenido: '',
  // '0' (no '') así una visita nueva sin historial previo arranca en 0%
  // en vez de forzar a elegir algo en el select — la mayoría de las
  // clientas no tiene canas, así que es el caso más común.
  porcentajeCanas: '0',
  largoCabello: '',
  fotoResultado: '',
}

// El id de una visita nueva se genera en el frontend (no en el backend) para
// que un reintento tras un timeout de red sea idempotente: si el POST
// anterior en realidad sí llegó a guardarse (el timeout fue solo esperando
// la respuesta), el reintento manda el MISMO id y el backend detecta que esa
// visita ya existe en vez de crear una duplicada — ver el comentario en
// Code.gs, case 'createVisita'. El caller (VisitaModal) genera el id una
// sola vez por visita nueva y lo reusa en todos los reintentos de ESE
// guardado.
export function generarIdVisita() {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random()}`.replace(/\D/g, '')
  return `v_${random.slice(0, 10)}`
}

export async function createVisita(clienteId, id, data) {
  return apiPost('createVisita', { clienteId, id, data })
}

export async function updateVisita(id, data) {
  return apiPost('updateVisita', { id, data })
}

// Soft-delete.
export async function deleteVisita(id) {
  return apiPost('deleteVisita', { id })
}
