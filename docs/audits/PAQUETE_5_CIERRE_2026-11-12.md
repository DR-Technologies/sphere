# PAQUETE 5 - Cierre de estabilizacion y seguridad

Fecha de ultima verificacion: 2026-11-14
Estado: **NO-GO - BLOQUEO CDN P0**

## Correccion final de seguridad

La migracion base `20261111_security_hardening.sql` y el forward-fix
`20261115_suspended_account_security_forward_fix.sql` fueron aplicados una sola
vez exclusivamente a Supabase Development. No se modifico Produccion y no se
realizo deploy a Netlify.

Versiones verificadas:

- codigo compatible: `2080248`;
- forward-fix: `f3acd2966c9c3b68f9047153ad6da6db30dd4a01`;
- SHA-256 forward-fix:
  `e528fc383f0585d5fa623a3418ff3be71a4f9cf1bd2a19b7db8d2900e5c77696`.

### Cuentas suspendidas

El forward-fix agrega politicas restrictivas de cuenta activa a todas las tablas
privadas accesibles por usuarios autenticados y a las tablas analiticas actuales
y futuras. Tambien bloquea mutaciones de RPC `SECURITY DEFINER` mediante un
trigger transaccional, y refuerza `run_dataset_query` y
`get_dataset_delete_dependencies` con `ACCOUNT_SUSPENDED`.

| Prueba | Resultado |
| --- | --- |
| Usuario activo consulta sus entidades privadas | PASS |
| Sesion emitida antes de suspension consulta datasets/reports/stories | PASS - 0 filas |
| Sesion suspendida consulta tabla analitica | PASS - 0 filas |
| Sesion suspendida ejecuta `run_dataset_query` | PASS - SQLSTATE `42501` |
| Sesion suspendida ejecuta dependencia/mutacion lifecycle | PASS - bloqueada transaccionalmente |
| Usuario A consulta recursos de B | PASS - denegado por owner RLS |
| Anon consulta `datasets` | PASS - HTTP 401 |
| Publicacion activa por slug | PASS - HTTP 200 |

Las tablas internas exclusivas de `service_role` permanecen sin grants para
`anon`/`authenticated`; por ello no forman una ruta de acceso cliente.

### Bloqueo CDN P0

Las dos URLs originales de manifests se comprobaron sin query strings ni
variantes. Ambas continuan entregando HTTP 206 desde cache (`CF-Cache-Status:
HIT`) aunque el bucket `files` ya es privado.

Se actualizaron los objetos en el mismo path con bytes identicos y
`cacheControl=0`; sus SHA-256 no cambiaron. Luego se invoco el mecanismo oficial
de purge por objeto, `DELETE /storage/v1/cdn/files/{exact-object-path}`. Supabase
respondio para ambos objetos `403 FeatureNotEnabled`. Tras 90 segundos las URLs
exactas continuaron en `206 HIT`.

No se borraron ni movieron objetos para forzar invalidacion. Para cerrar el P0
se requiere habilitar purge CDN en Development o solicitar a Supabase la
invalidacion de esos dos paths y repetir la comprobacion exacta.

### Integridad post-forward-fix

Los registros remotos se compararon con el backup restaurado mediante SHA-256
canonico, normalizando solamente timestamps UTC equivalentes.

| Objeto | Resultado |
| --- | --- |
| datasets (2) | PASS - fingerprint igual |
| reports (4) | PASS - fingerprint igual |
| public report snapshots (2) | PASS - fingerprint igual |
| stories (1) | PASS - fingerprint igual |
| public story snapshots (0) | PASS |
| story export jobs (0) | PASS |
| Dataset grande | PASS - 514.704 filas, 14 columnas, checksum `07208b1452b8bf4f01382a4446b9a00a` |
| Dataset pequeno | PASS - 28 filas, 20 columnas |

### Quality gates finales

| Gate | Resultado |
| --- | --- |
| Unit/acceptance | PASS - 127 passed, 11 skipped por entorno |
| Forward-fix focused | PASS - 12/12 |
| Typecheck | PASS |
| Build | PASS |
| ESLint | PASS - 0 errores, 74 warnings historicos |
| E2E completo serial | PASS - 36/36 |
| `npm audit` | PASS - 0 vulnerabilidades |

Las evidencias privadas se guardaron fuera de Git en
`/Users/dayana/SphereBackups/package-5/2026-11-14-security-hardening-application/`.

### Veredicto actual

**NO-GO para Alpha cerrada.** La proteccion P0 de cuentas suspendidas esta
resuelta y los datos permanecen integros. El Paquete 5 no puede declararse
formalmente cerrado mientras las dos URLs publicas legacy sigan entregando
manifests desde CDN.

## Registro historico previo a la aplicacion

## Limite de esta ejecucion

No se aplico ninguna migracion, deploy, escritura, limpieza ni cambio de datos
remoto. La migracion ejecutada indicada en este documento fue aplicada solamente
a un PostgreSQL local temporal.

## Cambios locales revisados

- `20261111_security_hardening.sql` se cerro con proteccion para Dataset,
  Report, Story, snapshots, export jobs, tablas analiticas y Storage.
- Los snapshots publicos se leen por RPC slug-scoped; no existe grant anonimo
  de lectura de la tabla completa.
- `run_dataset_query` dejo de ser un ejecutor SQL arbitrario `SECURITY DEFINER`.
  Ahora es `SECURITY INVOKER`, owner-scoped y acepta solo el SELECT generado por
  Sphere sobre el token `dataset`.
- El frontend usa paths privados, descarga autenticada y URLs firmadas para
  referencias legacy.
- Se agrego el precheck read-only `tests/sql/security_hardening_prechecks.sql`.

Correcciones de revision del 2026-11-13:

- el precheck detecta con `to_regclass` si el historial opcional de Supabase no
  existe y continua sin crear una tabla artificial;
- `run_dataset_query` sustituye solo el identificador fuente `FROM dataset`,
  preservando valores de texto e identificadores entre comillas;
- ambas condiciones se validaron en PostgreSQL local, incluyendo una columna
  `"dataset"` y el valor `'literal from dataset preserved'`.

## Prechecks remotos read-only

Ejecutados contra el Supabase de desarrollo configurado, sin leer payloads de
datasets ni exponer identificadores en este informe.

| Check | Resultado |
| --- | ---: |
| Datasets | 2 |
| Reports | 4 |
| Public Report Snapshots | 2 (2 activos) |
| Stories | 1 |
| Public Story Snapshots | 0 |
| Story Export Jobs | 0 |
| Mismatch Report/Dataset owner | 0 |
| Mismatch Report Snapshot owner | 0 |
| Mismatch Story/Dataset owner | 0 |
| Mismatch Story Snapshot owner | 0 |
| Mismatch Story Export owner | 0 |
| Objetos en `files` | 28 |
| Bytes registrados en `files` | 57,329,446 |
| Referencias de artefactos directas | 5 |
| Partes de manifests | 9 |
| Referencias faltantes | 0 |
| Referencias con owner invalido | 0 |
| Partes de manifest invalidas | 0 |
| Objetos sin referencia de metadata | 15 |

Los 15 objetos no referenciados no se modificaron ni se clasifican como basura
sin una auditoria de lifecycle independiente.

Estos checks se ejecutaron mediante las APIs read-only disponibles. El inventario
completo de catalogo (`pg_policies`, ACL, definiciones de funciones, triggers y
`supabase_migrations`) requiere ejecutar manualmente
`tests/sql/security_hardening_prechecks.sql` en SQL Editor o una conexion
PostgreSQL read-only. Esa evidencia sigue pendiente antes de FASE 2.

## Exposicion remota actual antes de migrar

| Prueba | Actual | Esperado post-migracion | Estado |
| --- | --- | --- | --- |
| `anon` consulta `reports` | HTTP 200, 4 filas | Denegado/0 | FAIL esperado |
| `anon` consulta `datasets` | HTTP 200, 0 filas | Denegado/0 | PARTIAL |
| `anon` consulta snapshots activos | HTTP 200, 2 filas | Solo RPC por slug | FAIL esperado |
| Bucket `files` | Publico | Privado | FAIL esperado |
| URL publica legacy de archivo | HTTP 200 | Denegada | FAIL esperado |
| URL firmada owner | HTTP 200 | HTTP 200 | PASS |

Estos FAIL son evidencia de que la migracion aun no fue aplicada, no regresiones
de la version local compatible.

## Validacion PostgreSQL local

La migracion completo `BEGIN ... COMMIT` en PostgreSQL temporal. Pruebas:

| Prueba | Resultado |
| --- | --- |
| Usuario A lista solo su Report | PASS |
| Usuario A no ve Report de B | PASS |
| Usuario A no ve tabla analitica de B | PASS |
| RPC consulta Dataset propio | PASS |
| RPC rechaza Dataset de B | PASS |
| RPC rechaza UNION/SQL compuesto | PASS |
| Usuario A ve solo su objeto Storage | PASS |
| `anon` no consulta tablas privadas/snapshots/Storage | PASS |
| `anon` obtiene snapshot activo por slug | PASS |
| Slug inexistente/revocado no devuelve snapshot | PASS |

## Backup

El procedimiento verificable esta documentado en
`SPHERE_V1_SECURITY_HARDENING_2026-11-11.md`. En esta fase no se recibio evidencia
de un restore point ni de una restauracion de prueba. Por tanto, FASE 2 no puede
comenzar hasta adjuntar:

- identificador/fecha del backup administrado;
- checksum SHA-256 del dump logico;
- listado `pg_restore --list`;
- evidencia de restauracion exitosa en QA aislado;
- exports de grants, policies, funciones, conteos y fingerprints.

## Conteos de integridad

Los valores anteriores forman el baseline pre-migracion. Los mismos conteos,
fingerprints y row counts de tablas analiticas deben repetirse inmediatamente
despues de aplicar. Esta fase no genera un baseline `despues` porque no hubo
cambios remotos.

## Quality gates de FASE 1

| Gate | Resultado |
| --- | --- |
| Unit/acceptance | PASS - 120 passed, 11 skipped por entorno |
| Security focused | PASS - 15/15 |
| Typecheck | PASS |
| Build | PASS |
| ESLint `--quiet` | PASS |
| E2E completo | PASS - 36/36 |
| Excel real 514.704 x 14 (perfilado local) | PASS - 18.62 s |
| `npm audit` | PASS - 0 vulnerabilidades |
| `git diff --check` | PASS |

Checksums de los artefactos de aplicacion:

- migration: `274d7e50238d7b5be95dc4ef14760f5a125d3bee077c88279bd08c6da3e9393a`
- prechecks: `5626f984b94baf876626effa69777d4385d576067c5c0ba40da42b68fb3d9fbf`
- hardening guide: `95afb9db63732b375df6f009541b00c9fcda770da009b359e6245d52702f7f8a`

## Matriz pendiente de FASE 3

| Area | Estado actual |
| --- | --- |
| A/B/anon contra Supabase migrado | PENDING |
| Bucket privado y URLs legacy | PENDING |
| Publicacion activa/revocada real | PENDING |
| Cuenta suspendida | PENDING |
| Instant Wow / Refine / Save | PENDING post-migration |
| Story / Public Story | PENDING post-migration |
| PNG / PPTX / MP4 | PENDING post-migration |
| 514.704 x 14 sin duplicar datos | PENDING post-migration |
| Conteos/fingerprints before/after | PENDING post-migration |

## Riesgos

- **CRITICAL hasta aplicar:** Reports privados y archivos siguen expuestos por la
  configuracion remota actual.
- **HIGH operativo:** cambiar primero el bucket a privado sin desplegar el
  frontend compatible rompe lectura de artefactos.
- **HIGH operativo:** aplicar sin backup restaurable impide una recuperacion
  demostrable.
- **MEDIUM:** las consultas generadas futuras que requieran JOIN/CTE deberan
  ampliar el contrato del RPC de manera revisada; el motor V1 actual no los usa.
- **LOW:** los 15 objetos Storage no referenciados requieren auditoria separada;
  no bloquean el hardening y no deben eliminarse en este paquete.

## Veredicto actual

**NO APTO todavia para pruebas controladas.**

La FASE 1 esta lista para aprobacion. El bloqueo es deliberado: migracion no
aplicada, backup recuperable no evidenciado y pruebas reales post-migracion aun
pendientes.
