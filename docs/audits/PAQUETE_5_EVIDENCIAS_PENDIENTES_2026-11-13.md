# Paquete 5 - Evidencias pendientes

Fecha: 2026-11-13 (America/Bogota)
Modo: read-only

No se aplicaron migraciones, cambios de permisos, cambios de Storage, deploys ni
operaciones destructivas.

## 1. Conteos reales

Se consultaron las dos relaciones analiticas mediante `HEAD` de PostgREST con
`Prefer: count=exact`, usando service role y sin leer filas. Es el equivalente
read-only del `count(*)`, pero no sustituye la ejecucion literal por PostgreSQL
que requiere una conexion DB.

| Dataset | Metadata expected | Actual relation count | Resultado |
| --- | ---: | ---: | --- |
| Dataset 1 (`5b5ce20b0f585d44`) | 514704 | 514704 | PASS |
| Dataset 2 (`b633f462f970c542`) | 0 | 28 | FAIL |

Evidencia mecanica: `artifacts/package-5/real-row-counts.json`.

La segunda relacion tiene 28 filas, pero `datasets.normalized_row_count` registra
0 y no tiene checksum de contenido. No se corrigio ni altero ese metadata.

Estado: **FAIL / requiere conciliacion antes del GO**.

## 2. Inventario completo de grants

No ejecutado. El entorno dispone de URL, anon key y service-role para PostgREST,
pero no contiene `SUPABASE_DB_URL`, password PostgreSQL, `.pgpass`, sesion de
Supabase CLI ni access token de Management API. PostgREST no expone
`information_schema.role_table_grants` y usar un RPC de producto como canal de
introspeccion no es aceptable.

Para cerrar la evidencia debe ejecutarse por conexion PostgreSQL, sin limite UI:

```bash
psql "$SUPABASE_DB_URL" --csv --command "
select grantee, table_schema, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
order by table_schema, table_name, grantee, privilege_type
" > sphere_grants_before_hardening.csv
```

Estado: **BLOCKED - falta conexion PostgreSQL autorizada**.

## 3. Backup logico y restauracion

No ejecutado por la misma ausencia de conexion PostgreSQL. No se genero un
backup parcial desde REST ni se declaro recuperable un artefacto incompleto.

Evidencia requerida para cerrar:

- dump custom creado con `pg_dump`;
- SHA-256 del dump;
- `pg_restore --list` exitoso;
- restauracion en PostgreSQL/Supabase QA aislado;
- conteos post-restore iguales a origen;
- log sin errores de restauracion.

Estado: **BLOCKED - falta conexion PostgreSQL autorizada y destino QA**.

## 4. Development compatible con Storage privado

No confirmado. Evidencia disponible:

- `origin/main`: `d1f5cf2f0b6fc1047eecd47010f1693e3a812b3b`;
- el branch remoto no contiene `src/lib/storage/files.ts` ni
  `src/lib/datasetArtifacts.ts`;
- `src/lib/persistence.ts` remoto todavia usa `getPublicUrl` para raw,
  normalized y manifest;
- no existe `.vercel/project.json`, Vercel CLI/token, URL de Development ni
  metadata de deployment en este entorno.

Por tanto no hay evidencia de que la version compatible este desplegada. Si
Development se construye desde `origin/main`, la version actualmente publicada
no es compatible con el bucket privado.

Estado: **FAIL / deployment compatible no demostrado**.

## Veredicto

**NO-GO** para aplicar `20261111_security_hardening.sql`.

Bloqueos concretos:

1. mismatch de 28 filas frente a metadata 0 en Dataset 2;
2. inventario completo de grants no exportado;
3. backup recuperable y restauracion aislada no demostrados;
4. version compatible con Storage privado no confirmada en Development.
