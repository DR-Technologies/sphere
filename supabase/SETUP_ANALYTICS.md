# Supabase Analytics Setup

Aplica la estructura SQL de analytics ejecutando el archivo:

- `supabase/migrations/20260407_analytics_provider.sql`
- `supabase/migrations/20260412_fix_sync_normalized_dataset_alias.sql` si ya habías ejecutado la migración anterior y necesitas reemplazar la función `sync_normalized_dataset`.

Opciones:

1. Supabase SQL Editor
- Abre tu proyecto en Supabase.
- Ve a `SQL Editor`.
- Pega el contenido del archivo de migración.
- Ejecútalo.

2. Supabase CLI
- Si ya tienes el proyecto linkeado:
```bash
supabase db push
```

Qué crea este script:

- Nuevas columnas en `public.datasets`:
  - `normalized_file_url`
  - `analytics_manifest_url`
  - `normalized_table_name`
- RPC `public.sync_normalized_dataset(...)`
  - crea/actualiza una tabla normalizada por dataset y carga las filas tipadas.
- RPC `public.run_dataset_query(...)`
  - ejecuta las consultas del canvas usando la tabla normalizada del dataset.

Validación rápida después de correrlo:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'datasets'
  and column_name in ('normalized_file_url', 'analytics_manifest_url', 'normalized_table_name');
```

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('sync_normalized_dataset', 'run_dataset_query');
```

Variable sugerida en desarrollo:

```env
NEXT_PUBLIC_ANALYTICS_PROVIDER=supabase
```
