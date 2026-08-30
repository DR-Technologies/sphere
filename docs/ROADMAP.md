# ROADMAP

## M1 — Instant Wow

**Status:** `COMPLETED`

### Objetivo

Hacer que un usuario pueda pasar de:

**archivo → comprensión automática → resultado visual atractivo → compartir/exportar**

en pocos minutos y con mínima configuración.

El objetivo principal de M1 es reducir drásticamente el **Time to Wow**.

La configuración manual debe convertirse en una opción de refinamiento, no en un requisito para obtener el primer resultado.

---

## Alcance

### 1. Estabilización técnica mínima

Realizar únicamente los cambios arquitectónicos necesarios para soportar de forma segura y mantenible el nuevo flujo de producto.

Incluye:

* consolidar validaciones y compatibilidad de widgets;
* reducir responsabilidades críticas en `Dashboard.tsx` y `ReportCanvas.tsx`;
* eliminar duplicaciones evidentes entre editor y reporte público;
* eliminar completamente DuckDB del flujo soportado:

  * provider legado;
  * dependencia;
  * imports;
  * referencias;
  * branding y documentación residual;
* centralizar el acceso analítico detrás de una capa tipada de:

  * Query Model;
  * Query Service;
* impedir que nuevos componentes construyan SQL directamente;
* impedir que nuevas capas de producto dependan directamente de `run_dataset_query`;
* mantener `run_dataset_query` únicamente como detalle interno de infraestructura mientras resulte útil;
* añadir tests para los flujos críticos;
* validar continuamente:

  * lint;
  * build;
  * tests.

No realizar un rewrite general.

---

### 2. Dataset Semantics

Extender el profiling actual para que Sphere entienda no solo el tipo técnico de las columnas, sino su función dentro del dataset.

Introducir como mínimo roles semánticos para:

* dimension;
* measure;
* datetime;
* geography;
* identifier;
* currency;
* percentage;
* boolean.

La detección inicial debe ser:

* determinística;
* reproducible;
* explicable;
* independiente de IA generativa.

Estos roles serán la base del Auto Visualization Engine.

---

### 3. Auto Visualization Engine

Crear una capa independiente que utilice Dataset Semantics para identificar automáticamente oportunidades de visualización.

Debe reconocer, entre otros:

* categorías + métricas;
* series temporales;
* rankings;
* KPIs;
* composición;
* distribución;
* información geográfica cuando existan campos compatibles.

Debe poder generar automáticamente configuraciones para visualizaciones existentes como:

* KPI / card;
* bar;
* line;
* area;
* pie cuando resulte apropiado;
* treemap;
* table;
* map.

El usuario no debe necesitar seleccionar manualmente:

* dimensión;
* métrica;
* agregación;
* orden;
* Top N;
* ejes;

para obtener el primer resultado.

El motor debe generar aproximadamente **4–6 visualizaciones útiles**, dependiendo del dataset.

No generar visualizaciones solo para completar espacio.

---

### 4. Quick Result

Después de procesar correctamente un archivo, Sphere debe generar automáticamente un resultado inicial.

El flujo principal pasa a ser:

**Upload → Processing → Quick Result**

No:

**Upload → Canvas vacío → Configuración manual**

Quick Result debe priorizar:

* velocidad;
* simplicidad;
* calidad visual;
* mínima toma de decisiones.

En M1, Quick Result puede permitir únicamente personalización ligera:

* cambiar entre los tres templates;
* editar título;
* editar subtítulo;
* eliminar una visualización;
* reordenar visualizaciones de forma simple cuando resulte natural.

La configuración avanzada pertenece a **Refine**.

No exponer directamente en Quick Result:

* dimensión;
* métrica;
* agregación;
* Top N;
* sorting;
* ejes;
* configuración técnica de charts;
* formatting avanzado.

Principio:

**Quick Result = obtener resultado.**

**Refine = editar resultado.**

El editor actual debe mantenerse y evolucionar progresivamente hacia el modo Refine.

---

### 5. Tres Visual Templates Premium

Crear tres estilos visuales claramente diferenciados y con calidad de producto.

Conceptualmente:

* Modern;
* Editorial;
* Dark.

Los nombres finales pueden ajustarse.

Cada template debe controlar coherentemente:

* tipografía;
* jerarquía;
* backgrounds;
* cards;
* charts;
* espaciado;
* bordes;
* presentación general.

El cambio de template debe transformar el resultado completo sin obligar al usuario a personalizar cada visualización individualmente.

No crear todavía un sistema avanzado de personalización visual.

---

### 6. Sharing Público Seguro

Implementar un modelo explícito de publicación mediante **snapshot o artefacto público materializado**.

Flujo:

**Private Dataset
→ Private Report
→ Publish
→ Public Snapshot
→ Public URL**

Un visitante anónimo nunca debe necesitar acceder directamente al dataset privado ni ejecutar queries sobre él.

M1 debe permitir:

* publish;
* obtener URL pública;
* republish / actualizar snapshot;
* unpublish / revoke.

El diseño debe permitir posteriormente incorporar refresh automático, pero esta funcionalidad no pertenece a M1.

---

### 7. Export PNG

Permitir exportar el resultado visual como imagen PNG de buena calidad.

Debe ser útil para:

* presentaciones;
* mensajería;
* documentos;
* redes sociales;
* compartir rápidamente.

M1 soportará únicamente:

* PNG;
* Public URL.

No implementar todavía:

* PDF;
* SVG;
* MP4;
* GIF;
* PowerPoint;
* otros formatos.

La arquitectura debe evitar bloquear una futura pipeline de exportación de vídeo.

---

### 8. Excelente Visualización Responsive

Garantizar que Quick Result y los reportes publicados tengan una excelente experiencia desde móvil.

Priorizar:

* lectura;
* jerarquía;
* charts;
* navegación;
* compartir;
* visualización del resultado;
* preview de exportación cuando corresponda.

No intentar llevar el editor completo a móvil.

En esta etapa Sphere Mobile significa principalmente:

**view → present → share**

y no:

**crear dashboards completos desde teléfono**.

---

## Definition of Done

M1 se considera terminado cuando un usuario nuevo puede:

1. iniciar sesión;
2. subir un archivo compatible;
3. Sphere detectar automáticamente tipos y roles semánticos;
4. recibir automáticamente un resultado visual útil y atractivo;
5. obtener ese resultado sin configurar manualmente gráficos;
6. cambiar entre los tres templates;
7. modificar de forma ligera el Quick Result;
8. entrar opcionalmente a Refine para personalización adicional;
9. publicar el resultado mediante URL pública segura;
10. actualizar o revocar esa publicación;
11. exportar el resultado como PNG;
12. visualizar correctamente el resultado publicado desde móvil.

### Criterio esencial

**La configuración manual de visualizaciones debe ser opcional.**

Un usuario debe poder obtener valor real de Sphere sin conocer:

* tipos de gráficos;
* agregaciones;
* dimensiones;
* métricas;
* SQL;
* conceptos de BI.

---

## Fuera de alcance de M1

M1 NO incluye:

* IA generativa;
* Bar Chart Race;
* Data Stories;
* Story Mode;
* timeline;
* Playback Engine;
* animaciones avanzadas;
* exportación de vídeo;
* PDF;
* dataset refresh avanzado;
* versionado avanzado;
* transform recipes;
* colaboración;
* equipos;
* permisos avanzados;
* app móvil nativa;
* editor móvil completo.

Estas funcionalidades pertenecen a milestones posteriores.

---

# M2 — Visual Identity + Animated Data

**Status:** `ACTIVE`

Objetivo de alto nivel:

Convertir la fortaleza visual de Sphere en una característica diferencial del producto, permitiendo transformar un resultado automático en una historia visual animada, reproducible, publicable y exportable.

Arquitectura objetivo de M2:

**Story Definition / Snapshot
→ Playback Engine
→ Shared Presentation Renderer
→ Headless Browser
→ Frames
→ Native FFmpeg
→ MP4**

Decisiones de alcance ya resueltas:

* `Story` es una entidad independiente con `sourceReportId?` opcional.
* `Composition Evolution` permanece en M2 v1 con alcance controlado.
* `Bar Chart Race` permanece en M2, pero no se usa como primer validador de Playback.
* `MP4` será server-side y asíncrono desde el inicio.
* `Public Story` no tendrá autoplay por defecto; mostrará estado inicial + acción clara de `Play`.

## BLOCK 1 — Contracts + Render Architecture

Objetivo:

cerrar correctamente los contratos antes de construir experiencia.

Incluye:

* `StoryDefinition`;
* `SceneDefinition`;
* `MaterializedStory`;
* `MaterializedScene`;
* `VisualizationRenderModel`;
* `SceneRenderModel`;
* `PlaybackState`;
* Motion model;
* Visual System.

Reglas:

* `StoryDefinition` no contiene datos materializados;
* `SceneDefinition` no depende rígidamente de `Widget`;
* `PlaybackState` no se persiste;
* `MaterializedStory` contiene únicamente datos necesarios para reproducir;
* `Recharts` no aparece como dependencia conceptual del Story contract;
* corregir la dependencia invertida entre `visualSystem` y `quickResult/templates`.

Campos obligatorios donde corresponda:

* `schemaVersion`;
* `renderModelVersion`.

### DoD

* contratos tipados definitivos de M2;
* unit tests;
* scaffolding actual alineado;
* repo verde;
* ningún Story contract rígidamente acoplado a `Widget` o `Recharts`.

## BLOCK 2 — Playback + Video Feasibility Spike

Objetivo:

probar temprano que la arquitectura temporal y de render sirve tanto para navegador como para video.

Incluye:

* global controlled clock;
* play;
* pause;
* seek;
* scene timing;
* enter / main / exit phases;
* transitions;
* overlap cuando corresponda;
* easing;
* `frameTime`;
* deterministic playback.

Render mínimo a validar:

* Intro;
* KPI Counter;
* Line Evolution.

### Video Spike

Validar técnicamente:

**Story
→ headless browser
→ deterministic frames
→ native FFmpeg
→ MP4**

Probar:

* `16:9` en `1080p`;
* `9:16` en `1080p`.

Medir:

* tiempo de render;
* CPU / RAM;
* consistencia;
* fonts;
* SVG / charts;
* calidad;
* diferencias contra browser preview.

### DoD

* playback determinístico funcional;
* seek correcto;
* Intro / KPI / Line reproducibles;
* MP4 técnico producido en ambas orientaciones;
* comparación visual razonable browser vs video;
* arquitectura validada por evidencia.

## BLOCK 3 — Story Product

Objetivo:

convertir la infraestructura validada en una experiencia real de producto.

Incluye:

* `Create Story` desde Quick Result;
* Automatic Story Generator determinístico;
* Story Player;
* Simple Editor;
* Animated Charts v1.

Reglas del generator:

* `Intro` si aporta;
* `KPI` para primary measure;
* `Evolution` cuando existe temporalidad útil;
* `Ranking` cuando existe dimensión categórica apropiada;
* `Bar Race` únicamente con suficientes periodos y categorías;
* `Composition` únicamente cuando semánticamente tenga sentido;
* `Outro` opcional;
* tablas no son escenas principales por defecto;
* no crear escenas solo para completar cantidad.

Edición ligera permitida:

* Play / Pause;
* Previous / Next;
* seek;
* reorder;
* remove;
* edit title / subtitle;
* template;
* Motion Preset;
* pacing.

Animated Charts v1:

* KPI Counter;
* Line Evolution;
* Bar Ranking;
* Bar Chart Race;
* Composition Evolution acotada.

### DoD

Un usuario puede:

**Quick Result
→ Create Story
→ Automatic Story
→ Play
→ Edit lightly**

sin conocimientos de animación.

## BLOCK 4 — Persistence + Public Story + Production Export

**Status:** `COMPLETED`

Objetivo:

hacer Story persistente, compartible y exportable.

Persistencia objetivo:

* `stories` con columnas indexables + `story_definition` JSONB versionado;
* sin tabla `story_scenes` separada inicialmente.

Materialización objetivo:

* por escena;
* sin materializar datasets completos.

Ejemplos:

* KPI → final value
* Ranking → ordered items
* Race → temporal keyframes
* Line → aggregated series
* Composition → category shares / temporal shares

Public Story:

**Private Story
→ Materialize
→ Snapshot
→ /story/[slug]**

Debe reutilizar:

* el mismo `Playback Engine`;
* el mismo `SceneRenderModel`;
* el mismo `Presentation Renderer`.

Export objetivo:

**Export
→ Job
→ Processing
→ Completed / Failed
→ Download**

Requisitos:

* `16:9` `1080p`;
* `9:16` `1080p`;
* sin exponer codec / FPS / bitrate al usuario;
* worker serial/simple aceptable en la primera versión.

### DoD

Story:

* persiste;
* se publica;
* funciona sin dataset privado;
* se reproduce desde URL pública;
* puede revocarse;
* puede exportarse a MP4;
* browser / public / video mantienen coherencia visual.

### Estado actual de M2

* `BLOCK 1` completado.
* `BLOCK 2` completado.
* `BLOCK 3` completado.
* `BLOCK 4` completado.
* `M2.5 — Visual Polish & Product Coherence` permanece pendiente antes de considerar `M2` como terminado.

---

# M3 — Reusable Data

**Status:** `PLANNED`

Objetivo de alto nivel:

Permitir que un resultado construido una vez pueda reutilizarse continuamente.

Enfoque:

* reemplazar/actualizar dataset;
* reconocimiento de estructura;
* compatibilidad de columnas;
* transformaciones reutilizables;
* versionado;
* histórico;
* validación estructurada;
* reutilización de configuraciones;
* actualización de resultados existentes.

---

# M4 — Intelligence + Mobile Companion

**Status:** `PLANNED`

Objetivo de alto nivel:

Añadir inteligencia sobre la infraestructura determinística ya construida y ampliar Sphere hacia consumo móvil.

Enfoque:

* sugerencias IA;
* recomendación avanzada de visualizaciones;
* generación asistida de métricas;
* insights;
* explicaciones de cambios;
* generación de configuraciones reproducibles;
* mobile companion;
* viewer;
* presenter;
* playback;
* sharing;
* quick export.

La IA complementa los motores determinísticos existentes; no sustituye la lógica reproducible del producto.

---

# Restricción importante

Este roadmap no autoriza automáticamente la implementación de `M3` o `M4`.

`M2 — Visual Identity + Animated Data` está `ACTIVE`, pero su ejecución debe respetar el orden interno de bloques aprobado.

Mientras no exista una nueva instrucción explícita, el trabajo autorizado se limita al bloque activo en curso.
