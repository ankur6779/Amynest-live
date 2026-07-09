# Worksheet Studio — Developer Guide

## Local development

```bash
pnpm run dev:web          # port 3000
pnpm run dev:api          # port 5000 (optional for AI)
```

Open `http://localhost:3000/worksheet`.

Set `VITE_USE_LOCAL_API=1` to proxy AI generation to the local API.

## Project layout

```
artifacts/kidschedule/src/features/worksheet-studio/   # React UI
lib/worksheet-studio/src/                              # Core engine
lib/worksheet-studio/src/client.ts                     # Browser-only exports
```

## Adding a worksheet improvement action

1. Add action to `WorksheetImproveAction` in `lib/worksheet-studio/src/types.ts`
2. Implement in `improvements.ts`
3. Wire copilot mapping in `copilot.ts` if needed
4. Add quick-action in `WorksheetAiAssistant.tsx`
5. Add test in `worksheet-studio.test.ts` or intelligence suite

## Adding export format

1. Implement in `lib/worksheet-studio/src/export/`
2. Export from `client.ts`
3. Wire handler in `WorksheetEditor.tsx` + `WorksheetExportSheet.tsx`
4. Ensure `prepareWorksheetForExport()` runs before export

## Branding

Active profile: `getActiveBrandingProfile()`. Applied at generation, editor open, and export via `applyBrandingToDocument()`.

Do not hardcode LPS strings in new export paths — use `footer-engine.ts` / `header-engine.ts`.

## IndexedDB migration

Bump `DB_VERSION` in `teacher-library.ts` or `auto-save.ts` and handle `onupgradeneeded`.

## Pre-commit checks

```bash
pnpm --filter @workspace/kidschedule run typecheck
pnpm --filter @workspace/kidschedule exec vitest run src/features/worksheet-studio/
```

If you change `lib/api-spec/`, run `pnpm run codegen`.

## Common pitfalls

- **Canvas vs document:** Always sync via `exportPageState()` before autosave/export
- **Branding duplication:** `applyBrandingToDocument` strips `brand_*` / `footer_*` before re-apply
- **AI offline:** `use-worksheet-ai.ts` falls back to local generator; surface `usedFallback` in UI
