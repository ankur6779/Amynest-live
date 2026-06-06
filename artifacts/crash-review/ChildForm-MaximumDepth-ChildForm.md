# Crash Review: ChildForm|MaximumDepth|ChildForm

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
React Query background refetch
→ hydration useEffect fires
→ form.reset
→ RHF field subscriptions
→ child field effects
→ render loop
```

- **Component:** ChildForm
- **Hook:** useEffect (child hydration)
- **Dependency:** hydrationKey including updatedAt/name
- **Mutation:** form.reset on every query refetch

**Evidence files:**
- `artifacts/kidschedule/src/lib/child-form-hydration.ts`
- `artifacts/kidschedule/src/pages/children/form.tsx`

## Source Locations

**Component:** ChildForm
**Route:** /children/:id

| File | Line | Hook | Function | Mutation |
|------|------|------|----------|----------|
| `artifacts/kidschedule/src/pages/children/form.tsx` | 354–430 | useEffect | ChildForm | form.reset(nextValues) |
| | deps: `child, isEditing, parentCountry` | | | |
| `artifacts/kidschedule/src/lib/child-form-hydration.ts` | 27–33 | other | buildChildHydrationKey | hydrationKey stability guard |
| `artifacts/kidschedule/src/lib/child-form-hydration.ts` | 67–88 | other | childFormResetValuesEqual | skip redundant form.reset |

## Failure Chain (machine-readable)

```json
{
  "readableFingerprint": "ChildForm|MaximumDepth|ChildForm",
  "loopType": "reset",
  "nodes": [
    {
      "id": "A",
      "kind": "query",
      "label": "React Query background refetch"
    },
    {
      "id": "B",
      "kind": "effect",
      "label": "hydration useEffect"
    },
    {
      "id": "C",
      "kind": "mutation",
      "label": "form.reset"
    },
    {
      "id": "D",
      "kind": "render",
      "label": "RHF field subscriptions"
    },
    {
      "id": "E",
      "kind": "effect",
      "label": "child field effects"
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
      "to": "E"
    },
    {
      "from": "E",
      "to": "B"
    }
  ],
  "cycle": [
    "B",
    "C",
    "D",
    "E",
    "B"
  ]
}
```

**Loop type:** reset
**Cycle:** B → C → D → E → B

## Fix Candidate

**Issue:** form.reset on every React Query refetch despite hydration key guard.

**Evidence:**
- form.tsx:354-430 — hydration useEffect depends on child + parentCountry
- childFormResetValuesEqual exists but reset still fires when watchers churn
- buildChildHydrationKey uses childId:dob:parentCountry (stable)

**Proposed fix:** Early-return when childHydrationKeyRef matches hydrationKey before any setValue/reset. Use country-only patch path (lines 407-424) when only parentCountry changed.

**Confidence:** 90% | **Risk:** Low

**Minimal diff hint:**
```ts
if (childHydrationKeyRef.current === hydrationKey) return;
```

## Regression Tests

### Background refetch
Query refetch with unchanged child record
- **File:** `artifacts/kidschedule/src/lib/child-form-hydration.test.ts`
- **Assertions:**
  - childFormResetValuesEqual prevents reset
  - hydrationKey unchanged → early return

**Registry status:** covered (2 files)