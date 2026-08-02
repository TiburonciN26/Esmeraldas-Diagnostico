// Listas / enums reutilizables por toda la app (modales, selects, etc.)

export const GROSOR_CABELLO = ['Fino', 'Medio', 'Grueso']

export const SI_NO = ['Sí', 'No']

export const TIPOS_APLICACION = [
  'Baño de color',
  'Retoque de raíz',
  'Raíz a punta',
  'Medio a punta',
  'Rayitos',
  'Balayage',
  'Mechas',
  'Iluminación',
  'Otro',
]

// Tipos de aplicación que muestran el campo condicional "Decoloración - etapa"
export const TIPOS_CON_DECOLORACION = ['Rayitos', 'Balayage', 'Mechas', 'Iluminación']

// Tipo de aplicación que oculta todo el bloque "Fórmula medios a puntas"
// (solo pide fórmula raíz).
export const TIPO_SOLO_RAIZ = 'Retoque de raíz'

// Mismo criterio pero al revés: solo piden fórmula medios a puntas, sin
// raíz (nunca muestran nada para elegir).
export const TIPOS_SOLO_MEDIOS = ['Medio a punta', 'Balayage']

// Único tipo con 3 modos posibles en vez de 2 (ver el toggle de íconos en
// VisitaModal.jsx): a veces se aplica solo a la raíz, a veces solo a
// medios a puntas, a veces a todo el cabello con una fórmula — pero NUNCA
// con fórmulas distintas para raíz y medios a la vez (a diferencia de
// "Raíz a punta", Rayitos, etc., que sí lo necesitan).
export const TIPO_TRES_MODOS = 'Baño de color'

// Tipos que SIEMPRE usan una única fórmula para toda la cabeza (raíz y
// puntas comparten los mismos 3 campos) — no se les pide elegir nada, no
// muestran ningún ícono de modo.
export const TIPOS_FORMULA_UNICA_FIJA = ['Rayitos', 'Mechas', 'Iluminación']

// Porcentaje de canas: 0, 10, 20, ... 100
export const PORCENTAJE_CANAS = Array.from({ length: 11 }, (_, i) => String(i * 10))

export const LARGO_CABELLO = ['Corto', 'Mediano', 'Largo']

// Meses para el selector de "Cumpleaños" (día + mes, sin año — ver
// ClienteModal.jsx).
export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

// Colores de resultado más comunes en colorimetría de salón.
export const COLORES_OBTENIDOS = [
  'Negro azabache',
  'Negro natural',
  'Castaño oscuro',
  'Castaño medio',
  'Castaño claro',
  'Chocolate',
  'Caoba',
  'Cobrizo',
  'Cobrizo dorado',
  'Rojo',
  'Rubio oscuro',
  'Rubio medio',
  'Rubio claro',
  'Rubio dorado',
  'Rubio miel',
  'Rubio ceniza',
  'Rubio platino',
  'Beige',
  'Champagne',
  'Gris / Plata',
]
