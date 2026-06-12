# Phase 7 — Filesystem Audit

**Generated:** 2026-06-11T18:45:00Z

---

## Build / Import Integrity

| Check | Result | Evidence |
|-------|--------|----------|
| TypeScript compile (libs) | **PASS** | `pnpm run typecheck:libs` exit 0 |
| TypeScript compile (kidschedule) | **PASS** | 98s, exit 0 |
| TypeScript compile (api-server) | **PASS** | exit 0 |
| Production web build | **PASS** | vite build 34.83s |
| Broken imports blocking build | **0** | Build succeeded |

---

## Dead / Orphan Files

| File | Issue | Severity |
|------|-------|----------|
| `pages/discovery-world-preview.tsx` | Route wrapper exists, no path | HIGH |
| `pages/verify-email-action.tsx` | Unreferenced | MEDIUM |
| `pages/not-found.tsx` | Unused in router | LOW |
| `AppCore.tsx` import of not-found | Dead import | LOW |

---

## Duplicate Components / Assets

| Area | Finding |
|------|---------|
| static-audio-map.json | Duplicated in kidschedule + api-server data dirs (intentional sync) |
| rhymes-gcs-registry.json | 3 copies (lib, kidschedule, api-server) — sync required |
| phonics-audio-map.json | kidschedule data copy of lib catalog |
| package.json duplicate key | `@workspace/education-stages` listed twice (kidschedule) — build warning |

No automated duplicate-component scan was run; manual review found no identical component filenames.

---

## Circular Dependencies

Not exhaustively scanned with madge/depcruise in this session. TypeScript project references build cleanly via `tsc --build`, suggesting no hard circular TS project failures.

**Status:** UNVERIFIED for runtime import cycles within kidschedule.

---

## Test File Coverage Gaps

Known pre-existing failures (from AGENTS.md):
- `hub-support-utils`, `routine-timeline-ui`, `safe-import` — Vite module resolution (0 assertions)
- Full vitest suite was **still running** at audit cutoff (>5 min) — **complete count UNVERIFIED**

Phonics release gate: **7 files, 29 tests PASS**

---

## Archived / Do-Not-Edit Paths

| Path | Status |
|------|--------|
| `archive/amynest-mobile-expo/` | Read-only legacy |
| `artifacts/amynest-mobile-ARCHIVED.md` | Pointer doc |

Production audit did not modify archived paths.

---

## Lib Package Count

Approximately **80+ workspace packages** under `lib/` including:
- speech-coach, phonics-sounds, phonics-curriculum, content-bank, world-engine
- math-playground, family-intelligence, learning-progress-engine
- static-audio, rhymes-audio, audio-lessons, coach-journey

---

## Filesystem Audit Score Impact

Deductions for orphan pages, duplicate registry sync burden, unverified circular deps, incomplete vitest run.

**No build-breaking dead code detected.**
