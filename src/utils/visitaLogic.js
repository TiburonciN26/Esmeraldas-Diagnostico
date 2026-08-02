// Lógica condicional de los campos de una visita, compartida entre el
// formulario (VisitaModal) y la vista de solo lectura (VisitaDetalleModal),
// para que la regla viva en un solo lugar y no diverja.

import {
  TIPOS_CON_DECOLORACION,
  TIPO_SOLO_RAIZ,
  TIPOS_SOLO_MEDIOS,
  TIPOS_FORMULA_UNICA_FIJA,
} from '../data/constants'

// Devuelve qué campos condicionales deben mostrarse según el estado actual
// del formulario/visita. Oxidante y tiempo ya NO se revelan progresivamente
// a medida que se escribe la fórmula (antes eran una "cascada": oxidante
// aparecía recién con texto en fórmula, tiempo recién con texto en ambos) —
// van siempre junto a su fórmula, visibles desde el principio, porque los
// tres son obligatorios por igual.
export function calcularVisibilidad(v) {
  const soloRaiz = v.tipoAplicacion === TIPO_SOLO_RAIZ
  const soloMedios = TIPOS_SOLO_MEDIOS.includes(v.tipoAplicacion)
  return {
    // Decoloración: solo para ciertos tipos de aplicación.
    decoloracion: TIPOS_CON_DECOLORACION.includes(v.tipoAplicacion),
    // "Retoque de raíz" solo pide fórmula raíz; "Medio a punta" solo pide
    // fórmula medios a puntas (ver soloRaiz/soloMedios). El resto de los
    // tipos pueden necesitar las dos (mediosBloque = son relevantes ambas,
    // ni una ni otra sobra); dentro de ese grupo, algunos siempre usan una
    // sola fórmula compartida sin elegir nada (formulaUnicaFija) y el resto
    // deja elegir en el formulario (fórmula única vs. distinta, o los 3
    // modos de "Baño de color") — eso lo decide el propio VisitaModal, acá
    // solo se informa qué hay para elegir.
    soloRaiz,
    soloMedios,
    formulaUnicaFija: TIPOS_FORMULA_UNICA_FIJA.includes(v.tipoAplicacion),
    mediosBloque: !soloRaiz && !soloMedios,
  }
}
