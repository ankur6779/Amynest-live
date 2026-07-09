# LPS AI Worksheet Studio — Architecture

## Overview

Worksheet Studio is a mobile-first React SPA feature at `/worksheet` in `artifacts/kidschedule/`. Intelligence and document logic live in `lib/worksheet-studio/`. The API (`artifacts/api-server/src/routes/worksheet-studio.ts`) provides optional AI generation; local fallback always works offline.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| UI shell | `features/worksheet-studio/` | Home, editor, library, productivity, branding |
| Document lib | `lib/worksheet-studio/src/` | Generation, layout, quality, branding, export |
| Browser client | `lib/worksheet-studio/src/client.ts` | IndexedDB, PDF/DOCX, analytics |
| API | `api-server/.../worksheet-studio.ts` | AI generate + quality score |

## Document pipeline

```
Generate request → local-generator / API
  → diversify → layout V2 → validate → score → repair
  → finalizeWorksheet → applyBrandingToDocument
  → Fabric render → export (prepareWorksheetForExport)
```

## Storage (local-first)

- **Drafts / versions:** IndexedDB `amynest-worksheet-studio`
- **Library:** IndexedDB `library` store
- **Branding:** `localStorage` `worksheet-studio-branding-v2`
- **Analytics:** `localStorage` `worksheet-studio-analytics-v1`
- **Curriculum progress:** `localStorage` `worksheet-curriculum-progress`

Cloud sync hooks: branding v2 schema (`version`, `profiles[]`), library entry shape — ready for future API sync without breaking local workflow.

## Editor bridge

`fabric-editor.ts` maps `WorksheetPage.elements` ↔ Fabric canvas. `exportPageState()` syncs canvas edits back to the document model for autosave and version history.

## Key modules

- `worksheet-pipeline.ts` — finalize + export prep
- `school-branding.ts` + `header-engine.ts` + `footer-engine.ts` — white-label
- `teacher-library.ts` — library CRUD
- `weekly-planner.ts`, `homework-pack.ts`, `classroom-pack.ts` — productivity

## Performance

- Fabric.js lazy-loaded on editor open
- `WorksheetEditor` code-split via `React.lazy`
- Pinch-zoom RAF-throttled
- Canvas initialized once per session; page changes use `renderPage` only

## Testing

```bash
pnpm --filter @workspace/kidschedule exec vitest run src/features/worksheet-studio/
```

Test suites: studio, editor v3.1, intelligence v4, productivity v5, branding v5.1, production v6.
