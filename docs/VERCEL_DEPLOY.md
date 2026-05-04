# Deploy En Vercel

## Resumen
Esta app ya está lista para desplegarse en `Vercel` con:
- `Next.js 16`
- `Supabase` para auth, storage y analytics
- `Google Maps` para widgets de mapa

La build actual del proyecto pasa correctamente con:
- `npm run build`
- `npm run typecheck`

## 1. Variables de entorno en Vercel
Configura estas variables en el proyecto de Vercel:

### Requeridas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER=supabase`

### Para mapas
- `NEXT_PUBLIC_MAP_PROVIDER=google`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Puedes tomar como base el archivo `../.env.example`.

## 2. Crear el proyecto en Vercel
### Opción A: desde GitHub
1. Sube este repo a GitHub.
2. Entra a Vercel.
3. Crea un proyecto nuevo importando el repositorio.
4. Vercel detectará automáticamente `Next.js`.

### Opción B: desde CLI
1. Instala la CLI:

```bash
npm i -g vercel
```

2. Desde la raíz del proyecto:

```bash
vercel
```

3. Para publicar a producción:

```bash
vercel --prod
```

Referencia oficial:
- Vercel docs: https://vercel.com/docs/concepts/next.js/overview
- Vercel CLI deploy: https://vercel.com/docs/cli/deploy

## 3. Configuración recomendada en Vercel
Si usas el flujo estándar de Vercel, no necesitas un `vercel.json` especial.

Valores esperados:
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

## 4. Ajustes obligatorios en Supabase
Como la app usa OAuth con Google y callback en `/auth/callback`, debes actualizar Supabase:

### Authentication > URL Configuration
Configura:
- `Site URL`: tu dominio principal de producción
  - ejemplo: `https://tu-dominio.vercel.app`

### Additional Redirect URLs
Agrega al menos:
- `http://localhost:3000/**`
- `https://tu-dominio.vercel.app/**`

Si vas a usar previews de Vercel, agrega también el patrón de preview correspondiente de tu equipo/cuenta.

Referencia oficial:
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls

## 5. Ajustes en Google Maps
La API key debe tener habilitada la `Maps JavaScript API`.

En Google Cloud:
1. Ve a la API key usada por la app.
2. Restringe por `HTTP referrers`.
3. Agrega:
   - `http://localhost:3000/*`
   - `https://tu-dominio.vercel.app/*`
4. Si usarás preview deployments, agrega también su patrón si quieres probar mapas allí.

## 6. Requisitos del proyecto Supabase
Antes del deploy, confirma que tu proyecto Supabase ya tiene:

### Tabla `public.datasets`
Debe incluir:
- `normalized_file_url`
- `analytics_manifest_url`
- `normalized_table_name`

### RPCs
Deben existir:
- `public.sync_normalized_dataset(...)`
- `public.run_dataset_query(...)`

### Storage
Debe existir el bucket:
- `files`

## 7. Checklist antes de producción
Ejecuta localmente:

```bash
npm install
npm run typecheck
npm run build
```

Prueba manual recomendada:
1. Login con Google.
2. Subida de CSV.
3. Subida de Excel.
4. Subida de JSON.
5. Creación de reporte.
6. Cambio entre varios tipos de gráfico.
7. Guardado del reporte.
8. Reapertura del reporte.
9. Apertura del reporte público.
10. Render de widget tipo mapa con coordenadas válidas.

## 8. Primer release recomendado
Para el primer release te recomiendo este orden:
1. Desplegar primero a un preview o dominio temporal de Vercel.
2. Configurar `Site URL` y `Redirect URLs` en Supabase con ese dominio.
3. Validar login, upload, reportes y mapas.
4. Después promover a dominio final.

## 9. Qué revisar si algo falla
### El login redirige mal
Revisa:
- `Site URL` en Supabase
- `Additional Redirect URLs`
- que el dominio actual de Vercel esté permitido

### Los datasets no persisten o fallan queries
Revisa:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- bucket `files`
- RPCs `sync_normalized_dataset` y `run_dataset_query`

### El mapa no carga
Revisa:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_MAP_PROVIDER=google`
- Maps JavaScript API habilitada
- restricciones por referrer de la key

## 10. Recomendación operativa
Para pruebas con usuarios finales:
- usa primero un deployment de producción en Vercel con dominio estable
- evita hacer pruebas de auth solo sobre previews si no has configurado bien los redirect URLs
- deja activados los logs de consola categorizados para detectar errores reales sin ruido excesivo
