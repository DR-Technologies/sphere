# ARCHITECTURE

## 1. Arquitectura actual

### Stack real
- `Next.js 16`
- `React 19`
- `TypeScript`
- `Supabase` para auth, storage, tablas y RPCs
- `Recharts` para la mayoría de visualizaciones
- `Framer Motion` para motion UI
- `react-grid-layout` para canvas de reportes
- `PapaParse` y `xlsx` para ingestión
- `Google Maps` como proveedor de mapas

### Flujo actual
1. Usuario autentica con Google vía Supabase.
2. Sube archivo `CSV`, `JSON`, `XLSX/XLS`.
3. El archivo se perfila en cliente.
4. Se detectan tipos técnicos y roles semánticos.
5. Se suben archivo original y artefactos a Supabase Storage.
6. Se guarda metadata del dataset en `datasets`.
7. Se sincroniza una tabla analítica normalizada en Postgres vía RPC.
8. Sphere genera automáticamente un `Quick Result`.
9. Las recomendaciones automáticas se convierten en widgets con layout y presentación inicial.
10. Los widgets generan consultas a través de `Query Model` y `Query Service`.
11. Los resultados pasan por una etapa de materialización para asegurar compatibilidad de render.
12. El usuario puede:
    - compartir;
    - exportar `PNG`;
    - o entrar a `Refine`.
13. El reporte se guarda en `reports`.
14. La publicación crea un snapshot materializado en `public_report_snapshots`.
15. Existe una vista pública por `/report/[id]`.

### Módulos clave actuales
- [src/components/Dashboard.tsx](/Users/dayana/Source/sphere/src/components/Dashboard.tsx)
- [src/components/canvas/ReportCanvas.tsx](/Users/dayana/Source/sphere/src/components/canvas/ReportCanvas.tsx)
- [src/components/quick-result/QuickResultView.tsx](/Users/dayana/Source/sphere/src/components/quick-result/QuickResultView.tsx)
- [src/components/visuals/ChartRenderer.tsx](/Users/dayana/Source/sphere/src/components/visuals/ChartRenderer.tsx)
- [src/lib/analytics/providers/supabaseProvider.ts](/Users/dayana/Source/sphere/src/lib/analytics/providers/supabaseProvider.ts)
- [src/lib/analytics/queryModel.ts](/Users/dayana/Source/sphere/src/lib/analytics/queryModel.ts)
- [src/lib/analytics/queryService.ts](/Users/dayana/Source/sphere/src/lib/analytics/queryService.ts)
- [src/lib/analytics/widgetResult.ts](/Users/dayana/Source/sphere/src/lib/analytics/widgetResult.ts)
- [src/lib/quickResult/recommendation.ts](/Users/dayana/Source/sphere/src/lib/quickResult/recommendation.ts)
- [src/lib/quickResult/layout.ts](/Users/dayana/Source/sphere/src/lib/quickResult/layout.ts)
- [src/lib/publishing.ts](/Users/dayana/Source/sphere/src/lib/publishing.ts)
- [src/lib/persistence.ts](/Users/dayana/Source/sphere/src/lib/persistence.ts)
- [src/app/report/[id]/page.tsx](/Users/dayana/Source/sphere/src/app/report/[id]/page.tsx)

## 2. Principales problemas existentes

### Acumulación de responsabilidades
- `Dashboard.tsx` mezcla navegación, auth, ingestión, preview, datasets y reportes.
- `ReportCanvas.tsx` mezcla dominio, UI, defaults, validación, query building y authoring.

### Duplicación
- Validación y construcción de queries duplicadas entre editor y reporte público.
- Defaults de widgets y lógica de presentación repartidos en múltiples capas.

### Fricción de producto
- El sistema actual está optimizado para configurar widgets manualmente.
- La primera experiencia todavía exige demasiadas decisiones del usuario.

### Fragilidad en sharing
- El concepto de vista pública existe, pero el modelo real de acceso a datos necesita endurecimiento y publicación segura.

### Legado técnico
- La principal deuda histórica sigue concentrada en componentes monolíticos y duplicación de reglas.

## 3. Arquitectura objetivo

La evolución objetivo se organiza en seis capas:

### Ingestion Layer
Responsable de:
- upload;
- parsing;
- opciones por formato;
- perfilado inicial;
- validación estructural.

### Dataset Intelligence
Responsable de:
- inferencia de tipos;
- semántica de columnas;
- roles analíticos;
- validación de calidad;
- transformaciones reutilizables;
- actualización/versionado futuro.

### Visualization Recommendation
Responsable de:
- detectar estructuras visuales útiles;
- recomendar charts;
- sugerir KPIs;
- generar quick dashboards;
- producir configuraciones determinísticas antes de IA.

### Presentation Engine
Responsable de:
- render de visualizaciones;
- templates visuales;
- historias visuales;
- motion;
- playback;
- export visual.

### Persistence & Sharing
Responsable de:
- datasets;
- reportes;
- snapshots/publicación;
- export jobs;
- permisos y publicación segura.

### Authoring Experience
Responsable de:
- quick result;
- refine mode;
- story mode futuro;
- edición progresiva con complejidad escondida por defecto.

## 4. Límites entre capas

### Reglas
- Ingestion Layer no decide templates visuales.
- Dataset Intelligence no renderiza UI.
- Visualization Recommendation no debe vivir dentro de `ReportCanvas`.
- Presentation Engine no debe construir queries.
- Persistence & Sharing no debe depender de componentes UI.
- Authoring Experience consume capacidades de las otras capas, pero no debe reimplementar sus reglas.

## 5. Reglas arquitectónicas para nuevo código

- No seguir agregando lógica de dominio a `Dashboard.tsx`.
- No seguir agregando reglas de negocio complejas a `ReportCanvas.tsx`.
- No duplicar construcción de queries entre editor y reporte público.
- Mover reglas reutilizables a capas `lib/*` o módulos dedicados.
- Antes de añadir nuevos settings manuales, evaluar si la recomendación automática resuelve mejor el caso.
- Mantener las decisiones de visualización inicial lo más determinísticas posible.
- Separar claramente:
  - configuración manual,
  - generación automática,
  - publicación.

## Estado actual vs objetivo

### Ya existe base reutilizable
- ingestión multiformato;
- perfilado;
- normalización;
- semantics layer explícita;
- auto-viz determinístico inicial;
- quick result con templates;
- persistencia de datasets/reportes;
- publicación segura mediante snapshot;
- exportación `PNG`;
- render de charts;
- canvas.

### Falta construir o reforzar
- enriquecimiento de semantics y recommendation;
- export pipeline más allá de `PNG`;
- story/playback engine.

## Decisiones resueltas en M1
- `run_dataset_query` queda encapsulado detrás de una capa tipada de query model y query service.
- La publicación pública usa snapshot materializado con datos ya resueltos, sin acceso anónimo al dataset privado.
- `Quick Result`, `Public URL` y `PNG` comparten reglas de presentación y layout.
