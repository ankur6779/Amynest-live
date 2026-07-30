# Birth Sky production audit

Date: 2026-07-30  
Scope: Birth Sky module only (no RevenueCat / plan / AI quota changes)

## Checklist

| Item | Status | Notes |
|------|--------|-------|
| House generation (12 bhavas) | ✓ | Daemon whole-sign cusps; validated in chart-details + ephemeris house tests |
| Planet accuracy | ✓ | Skyfield daemon positions persisted; lite fallback never invents houses |
| Lagna accuracy | ✓ | Rising = house 1 sign; mismatch blocks PDF |
| Kundli accuracy | ✓ | All 9 grahas placed via `planetHouseMap` (not sign-index fake houses) |
| House mapping | ✓ | `houseDetails` + `planetHouseMap` stored on snapshot |
| Snapshot validation | ✓ | `chartCompleteness` gates kundli/PDF; Day Sky / fallback / missing place blocked |
| PDF generation | ✓ | Server `pdf-lib` → real `%PDF` bytes |
| Premium gating | ✓ | PDF generate/download/history/preview require `isPremiumNow`; AI quota untouched |
| Export history | ✓ | `birth_sky_pdf_exports` stores base64 PDF; reopen without regenerate |
| Failed cases | ✓ | Day Sky, missing place, lite fallback, incomplete houses → no fake chart / no PDF |
| Fixed bugs | ✓ | Simplified Sun/Moon/Rising kundli replaced; silent house invention refused |
| Remaining issues | ⚠ | Live Skyfield integration test needs daemon + BSP kernels in CI; combust computed in Node (not Swiss Ephemeris combust flags) |

## Pipeline

1. Profile birth date/time/place → ephemeris port (Python daemon, retry, lite fallback)  
2. Persist astronomy jsonb → attach meaning + **chart details** (houses, planets, combust, completeness)  
3. UI kundli uses `planetHouseMap` only when `canRenderKundli`  
4. Premium PDF from server; cached per snapshotId until force regenerate  

## Tests run

- `chart-details.test.ts` + `pdf-export-service.test.ts` + export/visibility (12 pass)  
- `build-kundli-bodies.test.ts` + snapshot-generation (6 pass)  
