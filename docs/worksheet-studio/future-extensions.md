# Worksheet Studio — Future Extension Guide

## Cloud sync (library + branding)

- Add API routes mirroring `teacher-library.ts` and `school-branding.ts` shapes
- Keep local-first: write local, background sync, conflict = latest `updatedAt`
- Do not change `LibraryEntry` or `SchoolBrandingProfile` field names without migration

## New material types

- Add generator in lib (e.g. `classroom-pack.ts` pattern)
- Expose in `WorksheetProductivityHub.tsx`
- Save to library with `collection` field

## LMS / Google Classroom export

- Implement new exporter in `lib/worksheet-studio/src/export/`
- Wire in `WorksheetExportSheet.tsx`
- Run through `prepareWorksheetForExport()`

## Collaborative editing

- Requires server document store + CRDT or lock-based API
- Current Fabric bridge (`exportPageState`) is the integration point

## Additional languages

- Extend `i18n-engine.ts` `toHindiHint` map or API translate path
- Language selector already on home; thread through `languageRef` for productivity flows

## School admin portal

- Branding profiles already support multi-school JSON import/export
- Admin UI can POST profiles to org-scoped API; clients call `importSchoolProfileJson`

## Analytics dashboard

- `recordStudioAnalytics` + `getAnalyticsDashboard` ready for server ingest
- Map event types in `worksheet-studio-analytics.ts`

## Testing new features

Add focused vitest file under `features/worksheet-studio/`; keep production matrix in `worksheet-production-v6.test.ts`.
