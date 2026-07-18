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
export const TIPO_SOLO_RAIZ = 'Retoque de raíz'

// Porcentaje de canas: 10, 20, ... 100
export const PORCENTAJE_CANAS = Array.from({ length: 10 }, (_, i) => String((i + 1) * 10))

export const LARGO_CABELLO = ['Corto', 'Mediano', 'Largo']

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
