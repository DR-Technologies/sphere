# DECISIONS

## 1. Evolución incremental en lugar de rewrite
- **Decision:** evolucionar Sphere sobre la base actual en lugar de reescribirla por completo.
- **Reason:** el repositorio ya resuelve ingestión, persistencia, editor visual y sharing básico; el mayor problema es de organización y orientación de producto, no de imposibilidad técnica.
- **Consequences:** se priorizan refactors estructurales, separación de capas y simplificación del flujo antes que reemplazos totales.
- **Status:** `ACCEPTED`

## 2. Supabase como backend actual
- **Decision:** mantener `Supabase` como backend actual para auth, storage, metadata y analytics durante la siguiente fase.
- **Reason:** ya es la base funcional activa del producto y soporta el flujo actual end-to-end.
- **Consequences:** los cambios de M1 deben aprovechar Supabase, no sustituirlo.
- **Status:** `ACCEPTED`

## 3. DuckDB deja de ser parte del flujo activo
- **Decision:** remover `DuckDB` del flujo soportado y del repositorio activo de M1.
- **Reason:** el provider activo es Supabase y mantener DuckDB solo añadía ruido técnico y de producto.
- **Consequences:** el producto, dependencias y documentación quedan alineados con una sola ruta analítica soportada.
- **Status:** `ACCEPTED`

## 4. Auto-viz determinístico antes de IA
- **Decision:** construir primero un motor de auto-visualización determinístico antes de introducir IA.
- **Reason:** reduce complejidad, mejora reproducibilidad y permite entregar valor más rápido.
- **Consequences:** la IA llegará después como capa de sugerencia y refinamiento, no como requisito para el primer resultado útil.
- **Status:** `ACCEPTED`

## 5. El editor manual pasa a ser “Refine”
- **Decision:** el editor manual deja de ser la experiencia principal y pasa a ser una experiencia de refinamiento.
- **Reason:** la visión de producto prioriza el primer resultado rápido sobre la configuración manual profunda.
- **Consequences:** el flujo inicial debe moverse hacia Quick Result y templates; el canvas sigue existiendo, pero con otro rol.
- **Status:** `ACCEPTED`

## 6. Sharing mediante publicación segura o snapshot
- **Decision:** el sharing no debe depender de acceso anónimo al dataset privado.
- **Reason:** el modelo actual mezcla vista pública con datos que siguen protegidos por ownership del dataset.
- **Consequences:** M1 debe introducir publicación segura, snapshot o artefacto compartible materializado.
- **Status:** `ACCEPTED`

## 7. Export PNG en M1
- **Decision:** la primera exportación soportada debe ser `PNG`.
- **Reason:** es el camino más directo para convertir resultados visuales en activos compartibles.
- **Consequences:** video y exportaciones más complejas quedan fuera de M1.
- **Status:** `ACCEPTED`

## 8. Video y animation engine después
- **Decision:** el motor de animación narrativa y export a video no entra en la primera fase activa.
- **Reason:** primero hay que asegurar quick result, templates y sharing seguro.
- **Consequences:** animated stories, playback avanzado y video quedan posteriores a M1.
- **Status:** `ACCEPTED`

## 9. Mobile inicialmente orientado a consumo
- **Decision:** móvil en la fase cercana se orienta a consumo/viewer, no a editor completo.
- **Reason:** el editor actual es desktop-first y no conviene cargar M1 con esa complejidad.
- **Consequences:** responsive de visualización es prioridad; editor móvil full no lo es.
- **Status:** `ACCEPTED`

## 10. No competir con Power BI por profundidad
- **Decision:** no perseguir profundidad funcional tipo BI enterprise como objetivo primario.
- **Reason:** diluye la propuesta de valor de simplicidad, belleza y velocidad.
- **Consequences:** nuevas features deben justificarse por impacto en fricción baja y resultados visuales, no por “paridad de funcionalidades”.
- **Status:** `ACCEPTED`

## 11. La complejidad técnica debe esconderse
- **Decision:** el producto debe ocultar la complejidad técnica siempre que sea razonable.
- **Reason:** Sphere debe sentirse rápido y simple.
- **Consequences:** settings manuales solo se exponen cuando son realmente útiles; la automatización y los defaults tienen prioridad.
- **Status:** `ACCEPTED`

## 12. Publicar bonito antes que configurar mucho
- **Decision:** el sistema debe priorizar resultados atractivos antes que profundidad de configuración.
- **Reason:** la propuesta de valor depende de lograr un “wow” temprano.
- **Consequences:** templates, presets y quick generation pesan más que añadir toggles.
- **Status:** `ACCEPTED`

## 13. Sharing público mediante snapshot materializado
- **Decision:** implementar sharing público mediante snapshot materializado con widgets y resultados ya resueltos.
- **Reason:** evita exponer datasets privados o ejecutar queries anónimas sobre ellos.
- **Consequences:** publicar, republicar y revocar se apoyan en un artefacto público seguro y reproducible.
- **Status:** `ACCEPTED`

## 14. El contrato Query → Visualization se materializa antes del render
- **Decision:** introducir una etapa explícita de materialización y normalización de resultados de widgets antes de llegar al renderer.
- **Reason:** durante `M1.1` se detectó que filas técnicamente válidas podían no ser renderizables o producir widgets visualmente vacíos.
- **Consequences:** `Quick Result`, `Refine` y snapshots públicos consumen un contrato común con:
  - filas normalizadas;
  - conteo de filas renderizables;
  - estado vacío o error amigable.
- **Status:** `ACCEPTED`

## 15. Los widgets sin datos válidos deben mostrar estado vacío explícito
- **Decision:** un widget sin datos renderizables no debe mostrarse como caja vacía.
- **Reason:** la validación humana de `M1.1` mostró que un contenedor aparentemente correcto puede ocultar una falla real de producto.
- **Consequences:** los renderers y la capa de materialización deben devolver mensajes accionables o estados vacíos visibles.
- **Status:** `ACCEPTED`

## 16. Las visualizaciones de composición priorizan dimensión categórica sobre temporal
- **Decision:** para `pie` y `treemap`, cuando exista una dimensión categórica razonable, debe preferirse sobre una dimensión temporal.
- **Reason:** una visualización de participación por fecha suele ser semánticamente débil frente a una participación por categoría.
- **Consequences:** el motor de recomendación mantiene reglas simples, pero evita combinaciones claramente equivocadas para composición.
- **Status:** `ACCEPTED`

## 17. Quick Result, Public URL y PNG comparten reglas de layout de presentación
- **Decision:** la composición visual de resultados compartibles debe basarse en una regla común de spans, alturas mínimas y jerarquía por tipo de widget.
- **Reason:** durante `M1.2` se detectó que reglas separadas producían tablas sobredimensionadas, espacios muertos y resultados inconsistentes entre pantalla pública y export.
- **Consequences:** el producto ahora trata Quick Result, Public URL y PNG como variantes de una misma pieza editorial.
- **Status:** `ACCEPTED`

## 18. La tabla en presentación se muestra como resumen controlado, no como bloque dominante
- **Decision:** en contextos de presentación, la tabla debe tener altura controlada y scroll interno.
- **Reason:** el objetivo de `Instant Wow` es comunicar visualmente rápido, no convertir la tabla en el elemento dominante del canvas.
- **Consequences:** la tabla sigue aportando detalle, pero queda subordinada a la composición general del resultado.
- **Status:** `ACCEPTED`

## 19. El PNG export debe representar la pieza completa, no solo el grid
- **Decision:** la exportación `PNG` debe incluir header, título, subtítulo y composición final completa.
- **Reason:** el activo exportado debe sentirse listo para compartir, no como una captura técnica parcial del canvas.
- **Consequences:** la exportación usa un frame editorial dedicado y oculta controles de edición durante la captura.
- **Status:** `ACCEPTED`
