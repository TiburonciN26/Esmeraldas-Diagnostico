// Utilidades compartidas por la capa de servicios (mock).
// En la Fase 6 estas funciones se reemplazan por llamadas fetch al Apps Script.

// Genera un id simple y único para los registros mock.
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// Simula la latencia de una llamada de red para que la UI se comporte
// igual que contra el backend real (loading states, etc.).
export function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Devuelve una copia profunda para que los componentes no muten el "mockDB"
// directamente (imita que el backend devuelve datos nuevos en cada request).
export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
