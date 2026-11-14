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
- ejecución distribuida/worker queue para escalar el pipeline MP4 actual;
- refresh y versionado reutilizable de datasets, fuera del alcance activo.

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

### Lifecycle e integridad referencial
- `datasets` y `reports` son entidades privadas protegidas por RLS owner-scoped. Guardas transaccionales verifican que el owner de un Report sea también owner del Dataset y que un snapshot publicado mantenga consistente `report_id + dataset_id + user_id`.
- El bucket `files` es privado. La persistencia guarda rutas internas bajo `<user_id>/datasets/...`; la lectura genera URLs firmadas de corta duración y normaliza URLs públicas legacy sin exponer nuevamente el bucket.
- `datasets` es el aggregate root de datos privados, pero no posee una cascada destructiva sobre producto: si existen Reports o Stories asociados, su eliminación se bloquea en UI, RPC y claves foráneas. Solo un dataset sin dependencias puede eliminarse y limpiar su tabla analítica normalizada.
- `reports` y `stories` tienen lifecycle propio. Sus snapshots públicos se eliminan con el padre; una Story conserva `source_report_id` solo como referencia opcional y sobrevive a la eliminación del reporte origen.
- `user_roles` contiene el rol operativo protegido. Un usuario estándar tiene tres datasets y tres reportes por dataset; `superadmin` no tiene esos dos límites. Los triggers transaccionales son la autoridad y el frontend solo anticipa el resultado.
- El límite de nueve widgets por reporte permanece común a todos los roles.
- La administración de cuentas separa tres conceptos: `role` controla seguridad, `subscription_plan` registra el nivel administrativo sin facturación y `status` controla acceso activo/suspendido. El plan no modifica por sí mismo los límites V1.
- El navegador nunca recibe `SUPABASE_SERVICE_ROLE_KEY`. Las rutas `/api/admin/*` validan el JWT y el rol activo, y solo después usan Supabase Auth Admin y RPC restringidas a `service_role`.
- Una cuenta suspendida se bloquea en Auth, mediante el pre-request de PostgREST y con una política restrictiva de Storage, evitando que una sesión autenticada ya abierta continúe ejecutando operaciones protegidas.
- `admin_audit_log` registra invitaciones y cambios de acceso; un trigger transaccional bajo advisory lock impide degradar, suspender o eliminar al último SUPERADMIN activo.
- Solo puede existir un snapshot activo por Report o Story. Republish reutiliza el snapshot activo; revoke lo excluye de cualquier lookup de publicación activa.
- Los endpoints server-side de Dataset y Story verifican ownership y ejecutan primero el RPC transaccional. Los archivos de dataset en Storage solo se eliminan después del commit de un dataset sin dependencias.

### Cuenta, planes y facturación
- `Supabase Auth` continúa siendo la autoridad para identidad, correo, contraseña y sesiones. El navegador usa `updateUser`/`reauthenticate`; nunca modifica `auth.users` mediante SQL.
- La eliminación de cuenta exige un OTP de email verificado por Supabase Auth para el mismo `user.id`. La sesión efímera de verificación se revoca y los retries posteriores usan un token opaco independiente del código de reautenticación.
- `user_roles.role` y `user_roles.status` controlan seguridad. `admin_plan_override` representa una asignación administrativa explícita y permanece separada del estado comercial.
- `account_subscriptions` replica únicamente el estado verificado por webhooks de Stripe. El plan efectivo se resuelve con precedencia `admin override -> Stripe active/trialing/past_due -> Free`.
- Checkout y Customer Portal se crean en rutas server-side. La configuración V1 exige claves `sk_test`; el webhook verifica firma y registra cada `event_id` para procesamiento idempotente.
- La eliminación de cuenta es un workflow reintentable. Primero suspende el acceso, persiste inventario y token opaco de recuperación; después elimina datos transaccionalmente, limpia Storage/exportaciones y elimina Auth al final. `account_deletion_requests` conserva el estado de recuperación sin depender de la vida de `auth.users`.

### Navegación de Report
- Abrir un dataset genera un nuevo Instant Wow determinístico.
- Abrir un Report existente carga su definición persistida en la misma superficie de presentación de Instant Wow, sin regenerar recomendaciones.
- Refine añade chrome de edición sobre ese Report y puede volver a la previsualización; Save conserva el ID y Save As crea una entidad nueva.

### Ownership visual de themes
- El App Theme controla exclusivamente el shell: navegación, toolbar, inspector y settings.
- El Report Template controla stage, cards, charts y tipografía del reporte.
- El stage de Report posee background y variables visuales propias; un template claro no hereda transparencia ni color del shell oscuro.

### Responsabilidad a evitar
- `Dashboard.tsx` no debe transformarse en orquestador de Story domain.
- `ReportCanvas.tsx` no debe absorber Story generation ni playback logic.
- la lógica temporal y de materialización debe vivir en `src/lib/story/*` y capas de render dedicadas.

## Decisiones resueltas en M1
- `run_dataset_query` queda encapsulado detrás de una capa tipada de query model y query service.
- La publicación pública usa snapshot materializado con datos ya resueltos, sin acceso anónimo al dataset privado.
- `Quick Result`, `Public URL` y `PNG` comparten reglas de presentación y layout.
