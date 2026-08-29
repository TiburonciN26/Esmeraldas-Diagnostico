Resultado de la auditoría global
Nada crítico. Un hallazgo alto real, el resto menor:

🔴 Alto (corregido): la migración backfillTiposAplicados que agregamos la vez pasada quedó sin ninguna protección — cualquier usuario logueado (no solo admin) podía dispararla, y cada llamada releía la hoja completa de clientes una vez por cliente (ineficiente) mientras retenía el bloqueo global de escritura de toda la app. Como ya se corrió con éxito (37 clientes), la eliminé del backend por completo — cierra el hueco de raíz en vez de solo parchearlo.
🟡 Medio (corregido): el difuminado de fondo al abrir un <select> quedaba casi invisible en modo oscuro (un negro semitransparente sobre un fondo ya casi negro no se nota). Ahora usa una variable que se ajusta por tema — verificado visualmente, ya se ve bien.
🟡 Medio (sin tocar, documentado): reintentar guardar una visita editada con foto nueva tras un timeout puede subir la foto dos veces a Drive (huérfana). No es urgente, solo acumula archivos con el tiempo.
🟡 Medio (sin tocar, documentado): en el caso muy poco probable de dos guardados casi simultáneos sobre el mismo cliente, el filtro por tipo en Home podría mostrar un dato viejo hasta el próximo guardado — se autocorrige solo.
🔵 Bajo (corregidos): un comentario desactualizado sobre precio-solo-admin, y un doble espacio en una etiqueta.
Arquitectura: VisitaModal.jsx (687 líneas) e index.css (1849 líneas) ya son grandes — no es urgente, pero antes de la próxima feature grande convendría partir el modal en un hook + subcomponentes.
Importante: para que el fix de backfillTiposAplicados quede activo de verdad, falta el deploy manual de siempre ("Nueva versión" en Apps Script) — probé llamar esa acción contra el backend en vivo y todavía responde, porque el clasp push no alcanza solo.