// Arma el link de WhatsApp a partir del teléfono guardado, quitando todo
// lo que no sea dígito (espacios, guiones, paréntesis). Si no hay teléfono
// cargado, devuelve null.
export function buildWhatsappLink(telefono) {
  const digits = String(telefono ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}`
}
