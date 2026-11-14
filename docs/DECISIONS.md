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

## 20. Story es una entidad independiente con referencia opcional al reporte
- **Decision:** `Story` se modela como entidad independiente y puede conservar `sourceReportId?` únicamente como referencia opcional al origen.
- **Reason:** una Story puede nacer desde Quick Result o desde un Report, pero no debe dejar de funcionar si ese Report luego cambia o desaparece.
- **Consequences:** la persistencia y publicación de Story se diseñan alrededor de `StoryDefinition`, no de la vida útil del reporte fuente.
- **Status:** `ACCEPTED`

## 21. Los contratos de Story quedan separados por definición, materialización y playback
- **Decision:** M2 separa explícitamente `StoryDefinition`, `MaterializedStory` y `PlaybackState`.
- **Reason:** evita mezclar lo que el usuario creó, lo que el sistema resolvió para reproducir y lo que se deriva en runtime desde el tiempo.
- **Consequences:** los contratos de Story no persisten estado efímero ni datos de render calculados en tiempo de ejecución.
- **Status:** `ACCEPTED`

## 22. SceneDefinition no depende rígidamente de Widget ni de Recharts
- **Decision:** una `SceneDefinition` puede conservar referencias livianas como `sourceWidgetId`, pero no persistirá un `Widget` completo ni dependerá conceptualmente de `Recharts`.
- **Reason:** el player, la URL pública y el export MP4 necesitan un contrato estable y agnóstico al renderer concreto.
- **Consequences:** la comunicación con el renderer pasa por `VisualizationRenderModel` y `SceneRenderModel`.
- **Status:** `ACCEPTED`

## 23. Playback usa tiempo global como fuente de verdad
- **Decision:** el playback de Story se deriva de `global time -> active scene -> local progress`.
- **Reason:** se necesita coherencia entre preview web, publicación pública y render de video.
- **Consequences:** `pause`, `seek`, fases `enter/main/exit`, transiciones y frame rendering se diseñan de forma determinística.
- **Status:** `ACCEPTED`

## 24. MP4 se renderiza server-side mediante arquitectura híbrida
- **Decision:** la arquitectura objetivo para MP4 es híbrida: `Story Definition / Snapshot -> Playback Engine -> Shared Presentation Renderer -> Headless Browser -> Frames -> Native FFmpeg -> MP4`.
- **Reason:** `ffmpeg.wasm` no ofrece el mejor equilibrio para 1080p, consistencia visual y escalabilidad operativa.
- **Consequences:** el export será asíncrono desde el inicio y la previsualización web compartirá el mismo modelo temporal y de render con el video.
- **Status:** `ACCEPTED`

## 25. Public Story no tendrá autoplay por defecto en M2
- **Decision:** la URL pública de Story mostrará el estado inicial y una acción explícita de `Play`.
- **Reason:** reduce fricción contextual, evita comportamientos intrusivos y simplifica la primera versión pública.
- **Consequences:** el player público debe estar preparado para autoplay futuro, pero no activarlo en M2.
- **Status:** `ACCEPTED`

## 26. El orden de validación de Animated Charts reduce riesgo progresivamente
- **Decision:** M2 valida primero `KPI Counter`, luego `Line Evolution`, después `Bar Ranking`, luego `Bar Chart Race` y finalmente `Composition Evolution`.
- **Reason:** permite endurecer Playback y Render Contract con visualizaciones de menor riesgo antes de entrar a escenas temporalmente más complejas.
- **Consequences:** `Bar Chart Race` y `Composition Evolution` permanecen dentro de M2, pero no son el primer frente de validación técnica.
- **Status:** `ACCEPTED`

## 27. Story persiste como documento versionado en una sola tabla principal
- **Decision:** `stories` almacena columnas indexables para lectura operativa y un `story_definition` JSONB versionado como fuente de verdad persistida.
- **Reason:** evita fragmentar M2 prematuramente en múltiples tablas por escena y mantiene compatibilidad futura mediante `definition_version`.
- **Consequences:** guardar, reabrir y editar Story se apoyan en un contrato estable sin depender de `story_scenes`.
- **Status:** `ACCEPTED`

## 28. Public Story usa snapshot materializado independiente del dataset privado
- **Decision:** la publicación de Story crea un registro en `public_story_snapshots` con `story_definition` y `materialized_story`.
- **Reason:** el player público debe funcionar sin consultar datasets privados ni recalcular consultas analíticas en tiempo real.
- **Consequences:** `publish`, `republish` y `unpublish` operan sobre snapshots públicos revocables y la URL pública consume exclusivamente ese artefacto.
- **Status:** `ACCEPTED`

## 29. El player público reutiliza playback y renderer compartidos
- **Decision:** `/story/[slug]` reutiliza el mismo `Playback Engine`, `Scene Render Model` y `Presentation Renderer` del Story Studio.
- **Reason:** evita divergencia visual y reduce el riesgo de mantener dos implementaciones narrativas distintas.
- **Consequences:** browser preview, URL pública y video se mantienen alineados sobre la misma cadena temporal y de render.
- **Status:** `ACCEPTED`

## 30. El export MP4 es asíncrono desde su primera versión productiva
- **Decision:** el usuario solicita `Export Video` y el sistema crea un `story_export_job` con estados `queued`, `processing`, `completed` o `failed`.
- **Reason:** un render de video no debe depender de una request HTTP larga ni bloquear la UI hasta terminar.
- **Consequences:** Story Studio muestra progreso y descarga posterior; la implementación actual puede ser serial/simple, pero el contrato ya permite evolucionar hacia workers dedicados.
- **Status:** `ACCEPTED`

## 31. El modo mock de export existe solo para acceptance QA
- **Decision:** `mockMode` completa el ciclo de export con un artefacto ligero determinístico en pruebas E2E, sin ejecutar Chromium + FFmpeg completos.
- **Reason:** valida el lifecycle de `Export -> Processing -> Completed -> Download` sin volver frágil ni lenta la suite end-to-end.
- **Consequences:** el producto real sigue usando el pipeline productivo; el atajo vive únicamente detrás de la bandera de pruebas.
- **Status:** `ACCEPTED`

## 32. Los reportes existentes son la única definición de consumo del límite
- **Decision:** el límite de tres reportes cuenta filas reales de `reports` por `user_id + dataset_id`; no existen estados locales o filtros alternativos de “reporte activo”.
- **Reason:** el Dashboard podía quedar desactualizado y mostrar menos reportes que el conteo usado al crear.
- **Consequences:** Save actualiza el mismo ID, Save As inserta uno nuevo, delete libera el slot y todas las mutaciones refrescan el listado autoritativo.
- **Status:** `ACCEPTED`

## 33. Los deletes de aggregates se ejecutan en base de datos
- **Decision:** Report y Story usan funciones transaccionales con cleanup de sus dependencias. Dataset usa un endpoint autenticado y un RPC transaccional, pero su eliminación se bloquea mientras tenga Reports o Stories asociados.
- **Reason:** secuencias de deletes desde cliente podían fallar parcialmente y dejar publicaciones o relaciones huérfanas.
- **Consequences:** RLS permanece activa, no existe cascada destructiva desde Dataset y el usuario debe eliminar explícitamente Reports y Stories antes de borrar la fuente. Un Dataset ya independiente sí limpia su tabla analítica normalizada y artefactos propios.
- **Status:** `ACCEPTED`

## 34. Solo un snapshot puede estar activo por entidad privada
- **Decision:** Report y Story tienen como máximo un snapshot no revocado; republish actualiza ese artefacto y settings resuelve siempre el slug activo.
- **Reason:** slugs revocados o duplicados podían presentarse como URL vigente.
- **Consequences:** los lookups filtran `revoked_at`, priorizan la publicación más reciente y una restricción parcial protege la invariancia.
- **Status:** `ACCEPTED`

## 35. App Theme y Report Template son independientes
- **Decision:** el shell consume Light/Dark del usuario, mientras el Report stage consume exclusivamente su template Modern/Editorial/Dark.
- **Reason:** superficies translúcidas de un reporte claro perdían contraste dentro de la aplicación oscura.
- **Consequences:** Refine crea un stage visual autocontenido sin modificar geometría, layout canónico ni exportación.
- **Status:** `ACCEPTED`

## 36. Un Report guardado abre primero en la superficie Instant Wow
- **Decision:** seleccionar un Report existente carga su definición persistida en `QuickResultView`; no regenera recomendaciones ni entra directamente a Refine.
- **Reason:** la experiencia de consumo y edición ligera debe preceder al editor técnico, manteniendo el principio de baja fricción.
- **Consequences:** Create Story, Publish, PNG y Refine comparten la misma identidad de Report; Save actualiza el mismo ID y Refine puede regresar a la previsualización.
- **Status:** `ACCEPTED`

## 37. Identidad, rol de seguridad y suscripción comercial son contratos separados
- **Decision:** Supabase Auth administra identidad; `user_roles` administra rol/estado y overrides explícitos; Stripe administra la suscripción comercial mediante estado sincronizado por webhook.
- **Reason:** seleccionar un plan en cliente no puede conceder privilegios, y un SUPERADMIN debe poder asignar acceso sin falsificar una suscripción pagada.
- **Consequences:** el plan efectivo tiene precedencia determinística, Checkout/Portal son server-side y Stripe Test Mode es obligatorio hasta validar credenciales externas.
- **Status:** `ACCEPTED`

## 38. La eliminación de cuenta es suspend-first, reintentable y Auth-last
- **Decision:** una solicitud bloquea inmediatamente el acceso, persiste inventario y estado, limpia datos/artefactos por etapas y elimina el usuario de Auth únicamente al final.
- **Reason:** Storage, filesystem, Stripe y PostgreSQL no comparten una transacción; ocultar fallos produciría cuentas aparentemente eliminadas con recursos huérfanos.
- **Consequences:** un fallo queda en estado `failed` con credencial opaca de retry; el trigger del último SUPERADMIN permanece como protección transaccional.
- **Status:** `ACCEPTED`

## 37. Los límites de cuenta son autoritativos en base de datos y dependen del rol
- **Decision:** `user_roles` define `standard` o `superadmin`; los triggers protegen datasets y reportes bajo locks transaccionales. El rol no puede mutarse desde el cliente autenticado.
- **Reason:** los controles frontend no protegen llamadas directas ni carreras concurrentes.
- **Consequences:** standard conserva límites `3/3/9`; superadmin elimina solo los límites de datasets y reportes, mientras nueve widgets sigue siendo universal.
- **Status:** `ACCEPTED`

## 38. Dataset no es dueño destructivo de Reports o Stories
- **Decision:** las FKs desde Reports, Stories y snapshots hacia Dataset usan restricción y `delete_dataset_lifecycle` falla si encuentra dependencias.
- **Reason:** eliminar una fuente no debe destruir resultados construidos sin una acción explícita del usuario.
- **Consequences:** la UI muestra conteo y nombres de Reports, la base evita bypass y las eliminaciones independientes conservan su lifecycle existente.
- **Status:** `ACCEPTED`

## 39. Rol, plan y estado de cuenta son conceptos independientes
- **Decision:** `user_roles.role` define autoridad, `subscription_plan` registra el nivel de acceso administrativo y `status` determina si la cuenta puede operar.
- **Reason:** un plan comercial futuro no debe conceder privilegios de seguridad ni mezclarse con los límites actuales.
- **Consequences:** los planes `free`, `pro` y `enterprise` no alteran límites en V1; standard conserva `3/3/9` y SUPERADMIN conserva ilimitados datasets/reportes con nueve widgets.
- **Status:** `ACCEPTED`

## 40. La administración de Supabase Auth existe solo en servidor
- **Decision:** listar, invitar, suspender y reactivar usuarios pasa por rutas server-side que verifican un SUPERADMIN activo y utilizan `service_role` fuera del bundle del navegador.
- **Reason:** Supabase Auth Admin no puede exponerse al cliente ni confiar en controles visuales.
- **Consequences:** las RPC administrativas solo son ejecutables por `service_role`, cada acción relevante queda auditada y los cambios Auth/DB usan compensación ante fallos parciales.
- **Status:** `ACCEPTED`

## 41. El último SUPERADMIN activo está protegido en base de datos
- **Decision:** un trigger transaccional con lock impide suspender, degradar o eliminar al último SUPERADMIN activo; un administrador tampoco puede cambiar su propio rol o estado.
- **Reason:** la protección debe resistir concurrencia y llamadas directas, no solo deshabilitar controles en UI.
- **Consequences:** cualquier delegación o retiro de privilegios requiere que otra cuenta SUPERADMIN activa permanezca disponible.
- **Status:** `ACCEPTED`

## 42. Reports y artefactos de Dataset son privados por defecto
- **Decision:** `datasets` y `reports` usan RLS owner-scoped; el bucket `files` es privado y se accede mediante rutas internas o URLs firmadas temporales.
- **Reason:** los filtros del cliente y las URLs públicas permanentes no constituyen una frontera de seguridad entre usuarios.
- **Consequences:** compartir Reports sigue dependiendo exclusivamente de snapshots materializados activos; las URLs públicas legacy de artefactos se normalizan a rutas sin migrar ni duplicar archivos.
- **Status:** `ACCEPTED`

## 43. La eliminación de cuenta verifica un OTP consumible para el mismo usuario
- **Decision:** el código de eliminación se verifica con Supabase Auth mediante un OTP de email real y se compara el `user.id` resultante con la sesión que inició la operación.
- **Reason:** el nonce de `reauthenticate()` solo es validado por Supabase durante un cambio de contraseña; enviarlo con una actualización de metadata no probaba posesión del código.
- **Consequences:** un código arbitrario o perteneciente a otra cuenta no inicia la eliminación; los retries usan únicamente la credencial opaca de recuperación emitida después de una verificación válida.
- **Status:** `ACCEPTED`
