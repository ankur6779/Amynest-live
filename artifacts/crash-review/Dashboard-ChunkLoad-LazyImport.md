# Crash Review: Dashboard|ChunkLoad|LazyImport

> Generated: 2026-06-06T18:20:17.485Z
> **Read-only analysis** — engineers approve all code changes.

## Summary

| Field | Value |
|-------|-------|
| Severity | — |
| Affected users (7d) | — |
| Affected routes | — |
| Recovery rate | —% |
| 24h / 7d count | — / — |
| Example error IDs | — |

## Root Cause

```
Route navigation to /dashboard
→ React.lazy import
→ ChunkLoadError (stale bundle)
→ error boundary recovery
```

- **Component:** Dashboard
- **Hook:** React.lazy / dynamic import
- **Dependency:** stale deploy chunk hash
- **Mutation:** failed module fetch

**Evidence files:**
- `artifacts/kidschedule/src/lib/crash-recovery.ts`
- `artifacts/kidschedule/src/lib/self-healing/orchestrator.ts`

## Source Locations

**Component:** Dashboard
**Route:** /dashboard

| File | Line | Hook | Function | Mutation |
|------|------|------|----------|----------|
| `artifacts/kidschedule/src/lib/crash-recovery.ts` | 1 | other | planCrashRecovery | reload stage on ChunkLoadError |

## Failure Chain (machine-readable)

```json
{
  "readableFingerprint": "Dashboard|ChunkLoad|LazyImport",
  "loopType": "navigation",
  "nodes": [
    {
      "id": "A",
      "kind": "navigation",
      "label": "Navigate to /dashboard"
    },
    {
      "id": "B",
      "kind": "mutation",
      "label": "React.lazy import"
    },
    {
      "id": "C",
      "kind": "retry",
      "label": "ChunkLoadError"
    },
    {
      "id": "D",
      "kind": "mutation",
      "label": "L6 controlled reload"
    }
  ],
  "edges": [
    {
      "from": "A",
      "to": "B"
    },
    {
      "from": "B",
      "to": "C"
    },
    {
      "from": "C",
      "to": "D"
    },
    {
      "from": "D",
      "to": "A"
    }
  ],
  "cycle": [
    "A",
    "B",
    "C",
    "D",
    "A"
  ]
}
```

**Loop type:** navigation
**Cycle:** A → B → C → D → A

## Fix Candidate

**Issue:** Stale lazy chunk after deploy.

**Evidence:**
- ChunkLoadError in message fingerprint class
- crash-recovery.ts L6 reload stage exists

**Proposed fix:** Ensure ChunkLoadError triggers single reload (max 3). Bump app-build-version meta on deploy.

**Confidence:** 85% | **Risk:** Low

## Regression Tests

### Chunk load recovery
ChunkLoadError triggers single reload
- **File:** `artifacts/kidschedule/src/__tests__/crash-recovery.test.ts`
- **Assertions:**
  - planCrashRecovery returns reload for ChunkLoadError
  - MAX_RECOVERY_ATTEMPTS respected

**Registry status:** pending (1 files)