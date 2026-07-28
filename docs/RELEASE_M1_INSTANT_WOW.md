# Sphere M1 — Instant Wow

## Estado
- Milestone: `M1 — Instant Wow`
- Estado: `COMPLETED`
- Fecha de cierre: `2026-07-28`

## Capacidades entregadas
- autenticación con `Supabase` y flujo principal de uso listo para pruebas;
- ingestión de archivos `CSV`, `JSON`, `XLSX/XLS`;
- profiling tipado y normalización de datasets;
- detección semántica determinística de columnas;
- generación automática de `Quick Result`;
- templates visuales `Modern`, `Editorial` y `Dark`;
- personalización ligera del resultado:
  - título;
  - subtítulo;
  - cambio de template;
  - reordenar;
  - eliminar widgets;
- entrada a `Refine` como modo de edición manual;
- publicación segura mediante snapshot materializado;
- `Public URL` desacoplada del dataset privado;
- exportación `PNG`;
- render responsive de Quick Result y reporte público;
- aceptación automática con `Vitest` y `Playwright`.

## Cambios arquitectónicos principales
- encapsulación del acceso analítico detrás de:
  - `Query Model`;
  - `Query Service`;
  - `Widget Result Materialization`;
- introducción de una capa explícita de:
  - `Dataset Semantics`;
  - `Visualization Recommendation`;
- separación funcional entre:
  - `Quick Result`;
  - `Refine`;
  - `Persistence & Sharing`;
- materialización de snapshots públicos con resultados ya resueltos;
- remoción de `DuckDB` del flujo soportado;
- estandarización de layout de presentación para:
  - Quick Result;
  - Public URL;
  - PNG export.

## Limitaciones conocidas
- `Dashboard.tsx` y `ReportCanvas.tsx` siguen siendo componentes con demasiadas responsabilidades;
- el editor manual continúa siendo desktop-first;
- la exportación soportada en esta fase es solo `PNG`;
- no hay refresh automático de snapshots públicos;
- no existe todavía pipeline de video, storytelling o animación narrativa;
- la personalización visual en Quick Result sigue siendo deliberadamente acotada.

## Mejoras deliberadamente pospuestas
- `M2 — Visual Identity + Animated Data`;
- `M3 — Reusable Data`;
- `M4 — Intelligence + Mobile Companion`;
- exportaciones adicionales:
  - `PDF`;
  - `SVG`;
  - `MP4`;
- refresh avanzado de datasets;
- versionado avanzado y transform recipes;
- IA para sugerencias, insights o configuración asistida.

## Calidad y validación
- `tests`: `PASS`
- `build`: `PASS`
- `typecheck`: `PASS`
- `E2E`: `PASS`

### Cobertura validada
- datasets de aceptación `A`, `B` y `C`;
- render automático de widgets;
- publicación;
- revocación;
- `Public URL`;
- export `PNG`;
- responsive en desktop, tablet y mobile.
