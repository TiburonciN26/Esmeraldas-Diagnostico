// Devuelve la fecha de hoy en formato YYYY-MM-DD (para inputs type="date"),
// respetando la zona horaria local (no UTC).
export function hoyISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

// Compara solo mes y día contra la fecha de hoy (el año de nacimiento no
// importa para saber si "hoy" es el cumpleaños). Parsea el string a mano
// en vez de "new Date(fechaISO)" para evitar corrimientos de zona horaria.
export function esCumpleanosHoy(fechaISO) {
  if (!fechaISO) return false
  const partes = String(fechaISO).split('-')
  if (partes.length !== 3) return false
  const [, mes, dia] = partes
  const hoy = hoyISO().split('-')
  return mes === hoy[1] && dia === hoy[2]
}
