# Sphere V1 Security Hardening

Fecha de revision: 2026-11-12

## Alcance final

La migracion `20261111_security_hardening.sql` es transaccional y no elimina ni
mueve datos. Instala:

- RLS owner-scoped canonico para `datasets`, `reports` y `stories`;
- validacion de ownership de Dataset/Report/Story en snapshots y export jobs;
- acceso publico a Report/Story exclusivamente mediante RPC por slug activo;
- RLS owner-scoped en cada tabla analitica `dataset_<uuid>`;
- `run_dataset_query` como `SECURITY INVOKER`, limitado a un unico `SELECT`
  generado sobre el Dataset propiedad del caller;
- bucket `files` privado, con acceso autenticado por prefijo `<auth.uid()>/...`;
- bloqueo de Storage para cuentas suspendidas y para `anon`;
- prechecks que abortan antes del primer cambio ante relaciones, ownership,
  tablas analiticas o rutas de Storage inconsistentes.

El frontend compatible guarda rutas internas. Las URLs publicas legacy se
convierten de nuevo a object paths y se resuelven mediante descarga autenticada
o URL firmada temporal de cinco minutos. Manifests y partes comprimidas usan el
mismo contrato. PNG/PPTX no dependen del bucket `files`; MP4 conserva su pipeline
separado.

## Prechecks de solo lectura

Ejecutar completo:

`tests/sql/security_hardening_prechecks.sql`

Exportar cada result set como CSV o JSON. Son blockers:

- cualquier mismatch de ownership distinto de cero;
- una tabla analitica no canonica o inexistente;
- una referencia de artefacto fuera del prefijo del owner;
- un objeto de `files` cuyo primer segmento no sea un usuario existente;
- ausencia del bucket `files`;
- que `20261111` ya figure aplicada.

Guardar tambien los row counts generados para todas las tablas analiticas. No
se seleccionan payloads de datasets ni datos personales.

## Backup verificable

Antes de aplicar:

1. Confirmar un backup administrado/restore point de Supabase anterior al cambio.
2. Crear un dump logico con una conexion PostgreSQL autorizada:

   ```bash
   pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-acl \
     --file sphere-pre-security-hardening.dump
   pg_restore --list sphere-pre-security-hardening.dump \
     > sphere-pre-security-hardening.contents.txt
   shasum -a 256 sphere-pre-security-hardening.dump \
     > sphere-pre-security-hardening.dump.sha256
   ```

3. Exportar policies, grants, funciones, triggers, conteos y fingerprints con el
   script de prechecks.
4. Verificar el checksum y restaurar el dump en un proyecto QA aislado. Un dump
   no probado no cuenta como backup recuperable.
5. Exportar inventario de `storage.objects` (bucket, path, size, checksum/etag),
   sin descargar ni publicar el contenido.

No guardar credenciales en los artefactos de backup.

## Orden exacto de aplicacion

1. Aprobar prechecks y evidencia de backup recuperable.
2. Desplegar primero la version compatible de Sphere en el entorno de pruebas.
3. Pausar nuevas importaciones/publicaciones durante la ventana corta.
4. Aplicar una sola vez `20261111_security_hardening.sql` mediante el mecanismo
   normal de migraciones.
5. Si cualquier statement falla, conservar el error y detenerse. La transaccion
   revierte el cambio completo; no improvisar grants ni policies.
6. Confirmar `files.public = false`, policies/grants esperados y fingerprints sin
   cambios.
7. Ejecutar la matriz A/B/anon y los smoke tests funcionales antes de reabrir la
   ventana.

## Validacion obligatoria post-migracion

- `anon` no puede consultar `datasets`, `reports`, snapshots ni `files` como
  tablas/objetos enumerables.
- Usuario A no puede leer/modificar Report, Dataset, tabla analitica ni archivo
  de B, incluso con IDs y paths conocidos.
- `run_dataset_query` rechaza datasets ajenos y consultas fuera del contrato.
- Slug publico activo funciona; slug revocado no devuelve snapshot.
- La URL `/storage/v1/object/public/files/...` deja de descargar.
- El owner puede descargar raw, normalized, manifest y particiones mediante
  acceso autenticado/firmado.
- Cuentas suspendidas siguen bloqueadas.
- Instant Wow, Refine, Save, Publish, Story, PNG, PPTX y MP4 pasan smoke test.
- Los conteos/fingerprints y las 514.704 filas x 14 columnas permanecen iguales.

## Recuperacion

Antes del commit, cualquier fallo revierte automaticamente. Despues del commit,
la estrategia es forward-fix: mantener `files` privado, detener escrituras
afectadas y aplicar una migracion revisada. No volver a habilitar acceso anonimo
a entidades privadas ni `public = true` como rollback.

Si se detecta corrupcion o cambio de datos, detener el entorno y restaurar el
backup probado en un proyecto aislado antes de decidir la recuperacion. La
restauracion remota requiere autorizacion separada.

## Validacion local realizada

La migracion se aplico en PostgreSQL local temporal contra un esquema equivalente.
Se verifico:

- commit completo del DDL;
- acceso propio y aislamiento A/B de Reports, tablas analiticas y Storage;
- rechazo del RPC para un Dataset ajeno;
- rechazo de SQL compuesto/arbitrario;
- acceso anonimo por slug activo y denegacion de acceso directo a tablas.

Esto no sustituye la validacion contra Supabase real despues de la aplicacion.

## Dependencias

- SheetJS usa `xlsx 0.20.3`.
- Vitest usa la linea corregida 4.1.x.
- `image-size` se fija en 2.1.x dentro de `pptxgenjs`.
- CI/desarrollo deben usar Node 22 LTS o Node 24 LTS.
