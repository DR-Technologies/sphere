# PAQUETE 5 - Cierre de estabilizacion y seguridad

Fecha: 2026-11-12
Estado: FASE 1 COMPLETA; FASES 2 Y 3 PENDIENTES DE AUTORIZACION

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
