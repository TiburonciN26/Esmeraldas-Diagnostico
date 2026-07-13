# Salón · Diagnóstico de Colorimetría

Web app para gestión de clientes y diagnósticos de colorimetría de un salón de belleza.

## Stack

- **Frontend:** React + Vite
- **Backend (Fase 6):** Google Apps Script (Web App, `doGet`/`doPost` → JSON)
- **Base de datos (Fase 6):** Google Sheets
- **Deploy (Fase 6):** GitHub Pages

Por ahora la app funciona con **datos mock en memoria**. Toda la lectura/escritura
pasa por la capa de servicios (`src/services/`), pensada para reemplazar su
implementación interna por llamadas `fetch` al Apps Script sin tocar los componentes.

## Correr en local

```bash
npm install
npm run dev
```

## Estructura

```
src/
  components/
    ui/          Button, Card (+ Dato)
    layout/      TopBar
    clientes/    ClienteCard
  context/       AppContext (navegación Home <-> Detalle + refresh)
  data/          mockData, constants (listas/enums)
  pages/         Home, ClienteDetalle
  services/      clientesService, diagnosticosService, visitasService (mock async)
```

## Fases

- [x] **Fase 1** — Andamiaje: estructura, mock data, servicios, Home (cards + soft-delete) y navegación a Detalle.
- [x] **Fase 2** — Modal Nuevo/Editar cliente (2 tarjetas + fecha condicional de alisado).
- [x] **Fase 3** — Modal Nueva/Editar visita: lógica condicional (decoloración, cascadas, excepción retoque de raíz), precarga desde la última visita e input de foto con preview local.
- [x] **Fase 4** — Vista de solo lectura de una visita (todos los campos + foto).
- [x] **Fase 5** — Pulido responsive/UX.
- [ ] **Fase 6** — Integración Apps Script + Sheets + Drive, deploy a GitHub Pages.
