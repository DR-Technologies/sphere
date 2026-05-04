# Roadmap de Producto

## Visión corta
Sphere está orientado a convertir datasets cargados por usuarios en reportes visuales rápidos, configurables y compartibles, con una experiencia de edición simple y una capa analítica sólida basada en Supabase. El foco del producto debe seguir siendo reducir fricción entre ingestión, normalización y visualización.

## Prioridades de corto plazo
- Estabilizar el editor de reportes para que cambiar entre tipos de visualización no deje estados inválidos ni errores de runtime.
- Hacer más consistente el comportamiento del canvas, los widget settings y los mensajes de error.
- Endurecer la validación previa de configuraciones incompatibles antes de consultar o renderizar.
- Mejorar pequeños puntos de UX con alto impacto:
  - estados vacíos,
  - mensajes de configuración incompleta,
  - compatibilidad más clara entre campos y agregaciones.
- Alinear documentación técnica visible del proyecto con la arquitectura real actual.

## Prioridades de mediano plazo
- Fortalecer la capa de normalización y metadata de columnas:
  - tipo técnico,
  - semántica de fecha,
  - moneda,
  - porcentaje,
  - geografía.
- Mejorar la experiencia de ingestión con validación y corrección asistida por columna.
- Añadir soporte geográfico por ciudad o ciudad/país manteniendo latitud/longitud como formato interno final.
- Completar una configuración común y uniforme para widgets, reduciendo settings redundantes y mejorando defaults.
- Consolidar el flujo de analytics sobre Supabase como estándar del producto.

## Prioridades de largo plazo
- Añadir capacidades SaaS más maduras:
  - colaboración,
  - permisos por dataset y reporte,
  - plantillas,
  - versionado o historial.
- Evolucionar hacia un catálogo de datasets con mejor gobernanza y reutilización.
- Incorporar analítica y navegación más avanzada:
  - filtros enriquecidos,
  - drill-down,
  - exportación,
  - widgets comparativos.
- Mejorar observabilidad, métricas de producto y monitoreo de errores por flujo crítico.

## Dependencias y notas técnicas
- Backend principal: `Supabase`.
- Visualización principal: `ReportCanvas` + `ChartRenderer`.
- Proveedor inicial de mapas: `Google Maps`, conservando la posibilidad de cambiar de proveedor más adelante.
- El roadmap actual no asume una reescritura de arquitectura; prioriza robustecer el flujo existente antes de expandir funciones.
- La inversión inmediata más rentable está en consistencia del editor y calidad del flujo de datos, no en sumar muchas visualizaciones nuevas.
