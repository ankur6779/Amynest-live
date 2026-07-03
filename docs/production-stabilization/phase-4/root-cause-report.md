# Root Cause Report — Phase 4 P0

## 1. `/phonics` (43 crash_events)

| Field | Detail |
|-------|--------|
| **Symptom** | White screen or broken phonics UI |
| **Fingerprint** | `Phonics|Error|PhonicsLearning` |
| **Root cause** | Uncaught React render errors in phonics tree; telemetry used `logClientError` only (no fingerprint spine, no retry) |
| **Fix** | `PhonicsErrorBoundary` → `reportCrash`; retry remount; existing item sanitization retained |
| **Regression test** | `phonics-error-boundary` via crash-report tests |

## 2. `/parenting-hub` (42 crash_events)

| Field | Detail |
|-------|--------|
| **Symptom** | Hub section crash during activities render |
| **Fingerprint** | `ParentingHub|Error|ActivitiesSection` |
| **Root cause** | `ActivitiesSection` rendered with `ageGroup!` when `isTwoPlus` bypassed null check — `effectiveChild.name` on undefined group |
| **Fix** | Require `ageGroup` before activities section; safe `tipsAgeGroup` fallback |
| **Network** | `useHubJourney` / `useLearningProgress` `retry: 2` after Phase 3 API fixes |

## 3. `mathConfidenceStars` undefined (3 crash_events)

| Field | Detail |
|-------|--------|
| **Symptom** | `Cannot read properties of undefined (reading 'mathConfidenceStars')` or opacity compare on undefined |
| **Fingerprint** | `MathPlayground|TypeError|mathConfidenceStars` |
| **Root cause** | Stale `lastParentSnapshot` in localStorage from v2/v3 migrations missing `mathConfidenceStars` field |
| **Fix** | `normalizeParentRetentionSnapshot()` in `@workspace/math-playground`; storage load + dashboard defensive stars |
| **Regression test** | `parent-retention.test.ts`, `parent-retention-dashboard.test.ts` |

## 4. Onboarding / dashboard / speech (P2 — documented)

| Area | Root cause | Status |
|------|------------|--------|
| Onboarding | Pipeline race / infant form loop | Playbooks exist (`ChildForm|MaximumDepth`) |
| Dashboard | Lazy chunk load failure | Mapped + reload recovery |
| Speech coach | Network / mic permission | Engine freeze — boundary only |

## Fingerprinting architecture (already present + Phase 4 enhancements)

```
React error / window.onerror / boundary
    → reportCrash()
        → fingerprintCrash()          # hash id fp_*
        → buildReadableFingerprint() # Phonics|Error|PhonicsLearning
        → recordCrashFingerprint()   # session: count, first/last seen
        → shouldEmitErrorCaptured()  # 60s dedupe
        → AnalyticsService.error_captured
        → POST /api/crash-events
        → crash_events + aggregation (firstSeen/lastSeen in DB)
```

Each crash record includes:

| Field | Source |
|-------|--------|
| Error fingerprint/hash | `fingerprint` + `readableFingerprint` |
| Route | `window.location.pathname` |
| Component | Boundary label / meta |
| Stack trace (sanitized) | Truncated 8k, numbers normalized in hash |
| Browser/OS | UA detection |
| App version | meta tags |
| Session ID | sessionStorage |
| User ID | Firebase (anonymous when logged out) |
| Frequency | Session registry + DB aggregate |
| First/last seen | Registry + SQL aggregation |
