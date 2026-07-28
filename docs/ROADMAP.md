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

**Status:** `PLANNED`

Objetivo de alto nivel:

Convertir la fortaleza visual de Sphere en una característica diferencial del producto.

Enfoque:

* identidad visual más fuerte;
* sistema de templates más avanzado;
* Animated Charts;
* Bar Chart Race;
* rankings animados;
* timelines animadas;
* KPIs animados;
* Before / After;
* Presentation / Story Mode;
* timeline y playback;
* controles de duración y velocidad;
* primeras formas de Data Storytelling;
* pipeline de exportación de vídeo;
* MP4 como formato prioritario.

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

Este roadmap no autoriza automáticamente la implementación de `M2`, `M3` o `M4`.

Solo `M1 — Instant Wow` tiene estado `ACTIVE`.

Codex puede preparar arquitectura compatible con funcionalidades futuras cuando sea razonable, pero **no debe implementar anticipadamente funcionalidades de milestones posteriores** salvo que sean estrictamente necesarias para completar M1.
