# Crash Audit Report — Phase 4 Step 1

**Generated:** 2026-07-04  
**Evidence:** Phase 0 verification, `crash_events` table, client crash spine

---

## Production crash inventory (confirmed)

| Route | crash_events (prod) | Severity | Phase 4 action |
|-------|--------------------:|----------|----------------|
| `/phonics` | 43 | P0 | PhonicsErrorBoundary → `reportCrash`, retry UI |
| `/parenting-hub` | 42 | P0 | ageGroup guard, hub query retry |
| Math playground | 3 (`mathConfidenceStars`) | P0 | `normalizeParentRetentionSnapshot` |
| `/children/*` | Known (ChildForm) | P1 | Existing playbooks |
| `/dashboard` | ChunkLoad (mapped) | P2 | Existing boundary |
| Onboarding | Low volume | P2 | Existing `AppErrorBoundary` |
| Speech coach | Low volume | P2 | Engine freeze — boundary only |

---

## Crash sources by category

### React runtime errors
- Phonics render failures (manifest/items/progress maps)
- Parenting hub `ageGroup!` non-null assertion when `isTwoPlus` true but group null
- Stale `lastParentSnapshot` missing `mathConfidenceStars`

### Unhandled promise rejections
- Hub/learning status API failures before Phase 3 (mitigated server-side)
- Global bridge now routes through `reportCrash` with fingerprint dedupe

### Navigation / lazy load
- `Dashboard|ChunkLoad|LazyImport` — mapped in crash-intelligence registry
- Parenting hub wrapped in `Suspense` + `AppErrorBoundary`

### Capacitor / WebView
- Detected via UA in `crash-report.ts` (`Capacitor WebView`, `AmyNest Android WebView`)
- No native crash symbolication in web layer — client logs + crash_events

### Memory / listener leaks
- `AppErrorBoundary` clears recovery timer on unmount ✅
- `useMountedRef` / `useSafeAsync` available — not audited on all hotspots (Phase 4B)

### Context failures
- OnboardingStatusProvider — guarded routes in AppCore
- Paywall/analytics providers — boot after auth

---

## Existing protections (pre-Phase 4)

| Mechanism | Coverage |
|-----------|----------|
| `AppErrorBoundary` | Layout, routes, onboarding, parenting-hub, phonics test |
| `PhonicsErrorBoundary` | phonics-learning tree |
| `SentryErrorBoundary` | Optional Sentry wrapper |
| `safe-route-page.tsx` | Per-route wrapper pattern |
| `reportCrash` + fingerprint | Global spine |
| `crash-intelligence` API | DB aggregates, heatmaps, launch gate |
| `self-healing/orchestrator` | Auto-recovery levels 1–10 |

---

## Error boundary coverage (major routes)

| Route | Boundary | Retry |
|-------|----------|-------|
| `/parenting-hub` | AppErrorBoundary | App fallback reload |
| `/phonics` | PhonicsErrorBoundary | **Try again** (Phase 4) |
| `/onboarding` | AppErrorBoundary | Recovery stages |
| `/dashboard` | AppRoutes boundary | Reload |
| Speech coach | Partial | Manual |

---

## Analytics gap (fixed Phase 4)

- `error_captured` lacked fingerprint/stack_hash — extended taxonomy
- Duplicate emissions from error-bridge + orchestrator — unified via `reportCrash` + 60s dedupe
- Phonics boundary used `logClientError` only — now full spine

---

## Intentionally not changed (stable / low crash)

- 90+ routes with zero production crash signal
- Speech coach engine internals (freeze rule)
- Routine engine (Phase 2 freeze)
