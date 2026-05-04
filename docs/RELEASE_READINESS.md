# Release Readiness Checklist

## Recommended hosting
- Primary recommendation: `Vercel`
- Secondary documented option: `Firebase App Hosting`

## Required environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER=supabase`
- Optional:
  - `NEXT_PUBLIC_MAP_PROVIDER=google`

## Supabase requirements
- `public.datasets` must contain:
  - `normalized_file_url`
  - `analytics_manifest_url`
  - `normalized_table_name`
- RPCs available:
  - `public.sync_normalized_dataset(...)`
  - `public.run_dataset_query(...)`
- Storage bucket expected by app:
  - `files`
- Auth callback URL must include the deployed domain and `/auth/callback`

## Google Maps requirements
- API key must allow Maps JavaScript API
- Restrict by HTTP referrer for production domains
- Keep local dev origins allowed separately

## Pre-release quality gates
- `npm run typecheck`
- `npm run build`
- No blocking errors in these flows:
  - login
  - upload dataset
  - load dataset
  - create report
  - save report
  - open public report
  - render map widget

## Known non-blocking diagnostics
- Missing client env vars should warn once, not spam repeatedly
- Missing map provider key should show fallback UI and a single actionable error
- Analytics/query failures should surface a user-facing message plus a categorized console log

## Release smoke test
1. Sign in with Supabase auth.
2. Upload CSV, JSON and Excel datasets.
3. Confirm normalized dataset sync succeeds.
4. Create at least one widget of each supported type.
5. Save a report and reopen it.
6. Open the public report URL.
7. Validate map rendering with real coordinates.
