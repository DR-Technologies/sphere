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
16. Desde Quick Result el usuario puede crear una `Story`.
17. La `Story` se persiste en `stories` mediante `story_definition` versionado.
18. La reproducción privada usa `MaterializedStory -> Playback Engine -> Presentation Renderer`.
19. La publicación crea snapshots en `public_story_snapshots`.
20. La URL pública vive en `/story/[slug]`.
21. El export de video crea `story_export_jobs` y usa un pipeline asíncrono con Chromium headless + FFmpeg nativo.

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
- [src/components/story/StoryStudio.tsx](/Users/dayana/Source/sphere/src/components/story/StoryStudio.tsx)
- [src/components/story/StoryFrameView.tsx](/Users/dayana/Source/sphere/src/components/story/StoryFrameView.tsx)
- [src/components/story/PresentationRenderer.tsx](/Users/dayana/Source/sphere/src/components/story/PresentationRenderer.tsx)
- [src/lib/story/generator.ts](/Users/dayana/Source/sphere/src/lib/story/generator.ts)
- [src/lib/story/materialize.ts](/Users/dayana/Source/sphere/src/lib/story/materialize.ts)
- [src/lib/story/playback.ts](/Users/dayana/Source/sphere/src/lib/story/playback.ts)
- [src/lib/story/persistence.ts](/Users/dayana/Source/sphere/src/lib/story/persistence.ts)
- [src/lib/story/publishing.ts](/Users/dayana/Source/sphere/src/lib/story/publishing.ts)
- [src/lib/story/exportPipeline.ts](/Users/dayana/Source/sphere/src/lib/story/exportPipeline.ts)
- [src/app/story/[slug]/page.tsx](/Users/dayana/Source/sphere/src/app/story/[slug]/page.tsx)
- [src/app/api/story-exports/start/route.ts](/Users/dayana/Source/sphere/src/app/api/story-exports/start/route.ts)
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

Para `M2`, esta capa se especializa en la cadena:

`Story Definition -> Materialized Story -> Playback Engine -> Scene Render Model -> Presentation Renderer`

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
- persistencia, publicación y export productivo de Story.

## Objetivo M2 aprobado

### Contratos
- `StoryDefinition`
- `SceneDefinition`
- `MaterializedStory`
- `MaterializedScene`
- `VisualizationRenderModel`
- `PlaybackState`

Separación obligatoria:
- `StoryDefinition`: lo que el usuario creó y persistimos.
- `MaterializedStory`: el artefacto seguro y reproducible para player público y export.
- `PlaybackState`: estado derivado desde tiempo global; no se persiste.

### Render
- `Story` no debe hablarle directamente a `Recharts`.
- `Recharts` puede seguir existiendo como detalle de algunos renderers, pero no como dependencia conceptual del contrato de Story.
- `Quick Result`, `Public Report`, `Story Player`, `Public Story` y futuro `Video Renderer` deben converger progresivamente sobre contratos de render compatibles.

### Public Story
- debe funcionar sin acceso al dataset privado;
- debe consumir el mismo `Playback Engine`;
- debe consumir el mismo `Presentation Renderer`;
- no debe existir un segundo player paralelo solo para la URL pública.

### Video
- la arquitectura objetivo de export es híbrida y server-side:
  - `Story Definition / Snapshot`
  - `Playback Engine`
  - `Shared Presentation Renderer`
  - `Headless Browser`
  - `Frames`
  - `Native FFmpeg`
  - `MP4`

### Persistencia M2 implementada
- `stories` persiste metadatos indexables + `story_definition` versionado.
- `public_story_snapshots` persiste publicación segura con `materialized_story`.
- `story_export_jobs` persiste el ciclo de export asíncrono y su estado.

### Responsabilidad a evitar
- `Dashboard.tsx` no debe transformarse en orquestador de Story domain.
- `ReportCanvas.tsx` no debe absorber Story generation ni playback logic.
- la lógica temporal y de materialización debe vivir en `src/lib/story/*` y capas de render dedicadas.

## Decisiones resueltas en M1
- `run_dataset_query` queda encapsulado detrás de una capa tipada de query model y query service.
- La publicación pública usa snapshot materializado con datos ya resueltos, sin acceso anónimo al dataset privado.
- `Quick Result`, `Public URL` y `PNG` comparten reglas de presentación y layout.
