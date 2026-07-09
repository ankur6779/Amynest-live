# Worksheet Studio — Deployment Guide

## Web (production)

Worksheet Studio ships inside the kidschedule Vite SPA (`artifacts/kidschedule/`).

1. Build: `pnpm --filter @workspace/kidschedule run build`
2. Output: `artifacts/kidschedule/dist/`
3. iOS Capacitor bundle copies dist → `artifacts/amynest-capacitor/www/`
4. Android WebView loads `https://www.amynest.in/worksheet`

## API (AI generation)

Route: `POST /api/worksheet-studio/generate`

Deploy with `artifacts/api-server/` on Render. Required env: `DATABASE_URL`, AI provider keys per existing API config.

## Static assets

School logos default: `/illustrations/worksheet-studio/lps-logo.svg`

Uploaded branding logos are stored as data URLs in localStorage (per device).

## Feature flags

No separate flag — route is `/worksheet` in `AppCore.tsx`.

## Post-deploy verification

1. Generate UKG English worksheet
2. Export PDF + DOCX
3. Switch branding profile → re-export
4. Open library → reopen worksheet
5. Run offline (disable network) → generate locally

## Rollback

Revert kidschedule + worksheet-studio lib commits. IndexedDB schemas are forward-compatible; v2 branding migrates from v1 automatically.
