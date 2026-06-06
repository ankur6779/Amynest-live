# Crash Review: NotificationEngine|Network|NotificationEngine

> Generated: 2026-06-06T18:20:17.487Z
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
Notification dispatch
→ API fetch timeout
→ Failed to fetch
→ unhandled rejection → crash overlay
```

- **Component:** NotificationEngine
- **Hook:** dispatch / fetch
- **Dependency:** network timeout
- **Mutation:** unhandled fetch rejection

**Evidence files:**
- `lib/notification-engine/src/delivery/`

## Source Locations

**Component:** NotificationEngine
**Route:** *

| File | Line | Hook | Function | Mutation |
|------|------|------|----------|----------|
| `lib/notification-engine/src/delivery/guard.ts` | 0 | other | dispatch | unhandled fetch rejection |

## Failure Chain (machine-readable)

```json
{
  "readableFingerprint": "NotificationEngine|Network|NotificationEngine",
  "loopType": "retry",
  "nodes": [
    {
      "id": "A",
      "kind": "mutation",
      "label": "Notification dispatch fetch"
    },
    {
      "id": "B",
      "kind": "retry",
      "label": "Network timeout"
    },
    {
      "id": "C",
      "kind": "render",
      "label": "Unhandled rejection → crash overlay"
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
    }
  ],
  "cycle": []
}
```

**Loop type:** retry

## Fix Candidate

**Issue:** Unhandled network timeout at dispatch boundary.

**Evidence:**
- Failed to fetch in notification dispatch path

**Proposed fix:** try/catch at dispatch guard; log + dedup, never throw to React.

**Confidence:** 80% | **Risk:** Low

## Regression Tests

**Registry status:** pending (0 files)