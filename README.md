# Sphere - Resumen Técnico

Sphere es una plataforma SaaS diseñada para transformar conjuntos de datos (CSV, Excel, JSON) en reportes visuales dinámicos e interactivos en segundos, simplificando el análisis de datos sin necesidad de código complejo.

## Tecnologías
- **Core**: Next.js 16 (App Router), React 19 y TypeScript.
- **Persistencia y Auth**: Supabase.
- **Motor Analítico Actual**: Supabase (normalización + consultas vía RPC encapsuladas sobre tablas normalizadas).
- **Visualización**: Recharts, D3.js y Framer Motion.
- **Mapas**: Google Maps como proveedor inicial.
- **Estructura**: React Grid Layout para canvas personalizables.
- **Estilos**: Tailwind CSS.

## Detalles Técnicos
- Ingestión de archivos CSV, Excel y JSON con opciones de parsing por tipo de archivo.
- Perfilado y normalización de columnas antes de sincronizar datasets normalizados a Supabase.
- Consultas de widgets ejecutadas sobre tablas normalizadas en Supabase mediante una capa tipada de query service.
- Motor de profiling automático para detección de tipos y métricas.
- Detección semántica inicial de columnas para generar resultados automáticos.
- Arquitectura enfocada en visualización rápida con editor basado en `ReportCanvas` y render de widgets en `ChartRenderer`.
