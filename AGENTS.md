# AGENTS

## Propósito
Sphere existe para convertir datos en resultados visuales impactantes con la menor fricción posible.

Objetivo central:

`archivo -> comprensión automática -> resultado visual impactante -> compartir/exportar`

Sphere no busca competir con Power BI por profundidad funcional. Busca ser simple, bello, rápido y altamente usable.

## Principios del producto
- `SIMPLE`
- `BEAUTIFUL`
- `FAST`
- `ANIMATED`
- `LOW FRICTION`

## Estado actual del repositorio
- Frontend: `Next.js 16`, `React 19`, `TypeScript`
- Persistencia/Auth: `Supabase`
- Visualización: `Recharts`, `D3`, `Framer Motion`
- Editor visual: `react-grid-layout`
- Ingestión: `PapaParse`, `xlsx`
- Mapas: `Google Maps`
- Provider analítico activo: `Supabase`
- `DuckDB` ya no forma parte del flujo soportado ni del repositorio activo

## Arquitectura relevante
- [src/components/Dashboard.tsx](/Users/dayana/Source/sphere/src/components/Dashboard.tsx)
  Shell principal de la app y orquestación actual de vistas, auth, datasets y carga de reportes.
- [src/components/canvas/ReportCanvas.tsx](/Users/dayana/Source/sphere/src/components/canvas/ReportCanvas.tsx)
  Editor visual principal.
- [src/components/visuals/ChartRenderer.tsx](/Users/dayana/Source/sphere/src/components/visuals/ChartRenderer.tsx)
  Renderer central de gráficos actuales.
- [src/lib/analytics/providers/supabaseProvider.ts](/Users/dayana/Source/sphere/src/lib/analytics/providers/supabaseProvider.ts)
  Perfilado, parsing, normalización y queries activas.
- [src/lib/persistence.ts](/Users/dayana/Source/sphere/src/lib/persistence.ts)
  Persistencia de datasets, reportes y storage.
- [src/app/report/[id]/page.tsx](/Users/dayana/Source/sphere/src/app/report/[id]/page.tsx)
  Vista pública del reporte.

Regla importante:
- `Dashboard.tsx` y `ReportCanvas.tsx` ya concentran demasiadas responsabilidades. No deben seguir creciendo como contenedores de lógica de dominio.

## Comandos reales del repositorio
Instalación:

```bash
npm install
```

Desarrollo:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

Producción local:

```bash
npm run start
```

Tests:

```bash
npm test
```

E2E:

```bash
npm run test:e2e
```

## Política de autonomía
El agente debe tomar decisiones técnicas normales, implementar una solución razonable y continuar sin solicitar confirmación.

No pedir confirmación por:
- nombres;
- estructura interna;
- componentes;
- decisiones UX menores;
- refactors razonables;
- elección entre alternativas técnicas equivalentes;
- tests;
- detalles visuales menores.

Detenerse únicamente ante:
- riesgo real de pérdida de datos;
- migraciones destructivas o difíciles de revertir;
- credenciales o accesos externos faltantes;
- contratación de servicios o costes nuevos;
- decisiones de producto que cambien significativamente el alcance;
- conflictos serios con trabajo existente del usuario.

No hacer `push`, no crear releases y no hacer deploy salvo instrucción explícita.

## Reglas para cambios de código
- Preferir cambios incrementales sobre rewrites.
- No introducir un rewrite completo salvo razón técnica fuerte y demostrable.
- Mantener el flujo principal del producto orientado a baja fricción.
- Antes de añadir complejidad manual, considerar automatización o defaults inteligentes.
- No exponer decisiones técnicas al usuario si pueden resolverse automáticamente.
- Reutilizar componentes y capas existentes cuando tenga sentido.
- Si una pieza está claramente viva y útil, refactorizar antes de reemplazar.
- Si una pieza está claramente muerta, duplicada o fuera del flujo activo, marcarla para remover y documentarlo.

## Reglas sobre cambios del usuario
- Respetar cambios existentes del usuario.
- No revertir cambios no hechos por el agente salvo instrucción explícita.
- Si aparece trabajo del usuario que entra en conflicto con la tarea en curso, detenerse y explicitar el conflicto.

## Validaciones obligatorias después de modificar código
Después de cualquier cambio de código, ejecutar las validaciones relevantes.

Mínimo esperado:
- `npm run build`

Cuando aplique:
- `npm run typecheck`
- `npm run lint`

Si no se puede correr una validación, dejarlo explícito en el cierre.

## Reglas de documentación
- Mantener actualizados:
  - [README.md](/Users/dayana/Source/sphere/README.md)
  - [docs/PRODUCT.md](/Users/dayana/Source/sphere/docs/PRODUCT.md)
  - [docs/ARCHITECTURE.md](/Users/dayana/Source/sphere/docs/ARCHITECTURE.md)
  - [docs/ROADMAP.md](/Users/dayana/Source/sphere/docs/ROADMAP.md)
  - [docs/DECISIONS.md](/Users/dayana/Source/sphere/docs/DECISIONS.md)
- No inventar comportamientos que el código no soporte.
- Si algo no está resuelto aún, documentarlo como `OPEN DECISION`.
- La documentación de producto debe priorizar claridad operativa sobre exhaustividad teórica.

## Seguridad y datos
- No commitear credenciales reales.
- `.env.local` y artefactos locales deben permanecer fuera del tracking.
- No exponer dataset privados mediante acceso anónimo directo a tablas privadas.
- Para sharing público, preferir publicación segura o snapshot explícito.
- No introducir consultas SQL construidas desde cliente en nuevas piezas si existe una forma más segura de encapsularlas.
- Evitar cambios destructivos sobre datasets/reportes sin una estrategia clara de reversión.

## Criterio de producto para decisiones técnicas
Ante dos opciones técnicamente válidas, preferir la que mejor soporte:
- menor fricción;
- mejor resultado visual inicial;
- menor cantidad de pasos;
- mejor base para animación y storytelling;
- mejor legibilidad en desktop y móvil;
- menor exposición de complejidad técnica al usuario.
