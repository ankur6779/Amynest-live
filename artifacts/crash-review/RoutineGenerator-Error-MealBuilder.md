# Crash Review: RoutineGenerator|Error|MealBuilder

> Generated: 2026-06-06T18:20:17.486Z
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
Routine generation request
→ MealBuilder slot mapping
→ TypeError on undefined slot
→ component crash
```

- **Component:** RoutineGenerator
- **Hook:** meal builder integration
- **Dependency:** routine payload shape
- **Mutation:** invalid meal slot access

**Evidence files:**
- `artifacts/kidschedule/src/pages/routines/`

## Source Locations

**Component:** RoutineGenerator
**Route:** /routines

| File | Line | Hook | Function | Mutation |
|------|------|------|----------|----------|
| `artifacts/kidschedule/src/pages/routines/` | 0 | other | RoutineGenerator | meal slot access without null guard |

## Failure Chain (machine-readable)


## Fix Candidate

**Issue:** Undefined meal slot access.

**Evidence:**
- TypeError during MealBuilder mapping in routine generation

**Proposed fix:** Null-guard slot reads; default empty slot object.

**Confidence:** 70% | **Risk:** Medium

## Regression Tests

**Registry status:** pending (0 files)