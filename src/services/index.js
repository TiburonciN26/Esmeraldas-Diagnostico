// Punto único de importación de la capa de servicios.
// Los componentes importan desde '../services' y no conocen la implementación
// interna (mock ahora, fetch al Apps Script en la Fase 6).

export * from './clientesService'
export * from './diagnosticosService'
export * from './visitasService'
export * from './usuarioService'
