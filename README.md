# Sphere - Resumen Técnico

Sphere es una plataforma SaaS diseñada para transformar conjuntos de datos (CSV, Excel, JSON) en reportes visuales dinámicos e interactivos en segundos, simplificando el análisis de datos sin necesidad de código complejo.

## Tecnologías
- **Core**: Next.js 16 (App Router), React 19 y TypeScript.
- **Persistencia y Auth**: Supabase.
- **Motor de Datos**: DuckDB-Wasm (procesamiento SQL en el cliente).
- **Visualización**: Recharts, D3.js y Framer Motion.
- **Estructura**: React Grid Layout para canvas personalizables.
- **Estilos**: Tailwind CSS.

## Detalles Técnicos
- Procesamiento de archivos local con PapaParse y XLSX.
- Motor de profiling automático para detección de tipos y métricas.
- Arquitectura "Client-Side First" para máxima velocidad y privacidad.

