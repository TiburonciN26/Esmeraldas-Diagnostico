// Utilidades de formato y texto compartidas por toda la app.

// Formatea un precio numérico como moneda simple ($1.500). Deja pasar
// strings no numéricos tal cual (por si en el futuro se guarda "s/d", etc.).
export function fmtPrecio(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : `$${n.toLocaleString('es-AR')}`
}

// Convierte una fecha ISO (YYYY-MM-DD) a formato local dd/mm/aaaa para
// mostrarla al usuario. Si no matchea el patrón, la devuelve sin tocar.
export function fmtFecha(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return String(iso)
  const [, y, mes, dia] = m
  return `${dia}/${mes}/${y}`
}

// Cumpleaños: solo importan día y mes (ver ClienteModal.jsx), el año que se
// guarda es un valor de relleno sin significado — mostrarlo confundiría
// ("¿de qué año es esto?"), así que acá se lo descarta a propósito.
export function fmtDiaMes(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return String(iso)
  const [, , mes, dia] = m
  return `${dia}/${mes}`
}

// Normaliza texto para búsquedas: minúsculas y sin tildes/diacríticos
// (rango Unicode de combining marks U+0300–U+036F), de modo que "maria"
// encuentre "María".
export function normalizarTexto(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// urlDeFoto_ (backend, Code.gs) guarda las fotos como
// ".../thumbnail?id=...&sz=w1280" — ese tamaño está pensado para el detalle
// a pantalla completa, no para una miniatura de ~40px en una tabla. Reescribe
// el parámetro "sz" al tamaño pedido; deja cualquier otra URL (data URL local
// todavía sin subir, o algo que no matchee) tal cual.
export function fotoThumbUrl(url, size) {
  if (!url) return url
  return String(url).replace(/sz=w\d+/, `sz=w${size}`)
}
