// Lógica condicional de los campos de una visita, compartida entre el
// formulario (VisitaModal) y la vista de solo lectura (VisitaDetalleModal),
// para que la regla viva en un solo lugar y no diverja.

import { TIPOS_CON_DECOLORACION, TIPO_SOLO_RAIZ } from '../data/constants'

const tieneTexto = (v) => String(v ?? '').trim() !== ''

// Devuelve qué campos condicionales deben mostrarse según el estado actual
// del formulario/visita.
export function calcularVisibilidad(v) {
  const mostrarMediosBloque = v.tipoAplicacion !== TIPO_SOLO_RAIZ
  return {
    // Decoloración: solo para ciertos tipos de aplicación.
    decoloracion: TIPOS_CON_DECOLORACION.includes(v.tipoAplicacion),
    // Cascada raíz.
    oxidanteRaiz: tieneTexto(v.formulaRaiz),
    tiempoRaiz: tieneTexto(v.formulaRaiz) && tieneTexto(v.oxidanteRaiz),
    // Bloque medios a puntas (oculto entero para "Retoque de raíz").
    mediosBloque: mostrarMediosBloque,
    oxidanteMedios: mostrarMediosBloque && tieneTexto(v.formulaMediosAPuntas),
    tiempoMedios:
      mostrarMediosBloque &&
      tieneTexto(v.formulaMediosAPuntas) &&
      tieneTexto(v.oxidanteMediosAPuntas),
  }
}
