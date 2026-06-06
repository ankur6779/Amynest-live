# Crash Review: ChildForm|MaximumDepth|InfantEffect

> Generated: 2026-06-06T18:20:17.482Z
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
React Query refetch (children query)
→ ChildForm hydration useEffect
→ form.reset with unstable dependency key
→ RHF watch / useWatch subscribers
→ infant educationStage useEffect
→ setValue without equality guard
→ Maximum update depth exceeded
```

- **Component:** ChildForm
- **Hook:** useEffect (infant educationStage normalization)
- **Dependency:** educationStage field + RHF watch subscribers
- **Mutation:** unconditional form.setValue('educationStage', …)

**Evidence files:**
- `artifacts/kidschedule/src/pages/children/form.tsx`
- `artifacts/kidschedule/src/lib/child-form-hydration.ts`
- `artifacts/kidschedule/src/lib/self-healing/orchestrator.ts`

## Source Locations

**Component:** ChildForm
**Route:** /children/:id

| File | Line | Hook | Function | Mutation |
|------|------|------|----------|----------|
| `artifacts/kidschedule/src/pages/children/form.tsx` | 324–342 | useEffect | ChildForm | form.setValue("educationStage", patches.educationStage) |
| | deps: `isInfant, watchDob, form` | | | |
| `artifacts/kidschedule/src/pages/children/form.tsx` | 259–270 | useWatch | ChildForm | watchDob triggers isInfant recalculation |
| | deps: `dob, educationStage, scheduleKnown` | | | |
| `artifacts/kidschedule/src/lib/child-form-hydration.ts` | 44–57 | other | infantFormNormalizationPatches | returns educationStage patch when !== at_home |
| `artifacts/kidschedule/src/pages/children/form.tsx` | 354–430 | useEffect | ChildForm | form.reset(nextValues) |
| | deps: `child, isEditing, parentCountry` | | | |

## Failure Chain (machine-readable)

```json
{
  "readableFingerprint": "ChildForm|MaximumDepth|InfantEffect",
  "loopType": "render",
  "nodes": [
    {
      "id": "A",
      "kind": "query",
      "label": "React Query refetch (children/:id)"
    },
    {
      "id": "B",
      "kind": "effect",
      "label": "ChildForm hydration useEffect"
    },
    {
      "id": "C",
      "kind": "mutation",
      "label": "form.reset(nextValues)"
    },
    {
      "id": "D",
      "kind": "render",
      "label": "RHF useWatch subscribers re-render"
    },
    {
      "id": "E",
      "kind": "state",
      "label": "isInfant derived from watchDob"
    },
    {
      "id": "F",
      "kind": "effect",
      "label": "infant-normalize useEffect"
    },
    {
      "id": "G",
      "kind": "mutation",
      "label": "setValue(\"educationStage\")"
    },
    {
      "id": "H",
      "kind": "render",
      "label": "Maximum update depth exceeded"
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
      "to": "F"
    },
    {
      "from": "F",
      "to": "G"
    },
    {
      "from": "G",
      "to": "D"
    },
    {
      "from": "D",
      "to": "F"
    },
    {
      "from": "F",
      "to": "H"
    }
  ],
  "cycle": [
    "D",
    "E",
    "F",
    "G",
    "D"
  ]
}
```

**Loop type:** render
**Cycle:** D → E → F → G → D

## Fix Candidate

**Issue:** Unconditional setValue in infant-normalize effect.

**Evidence:**
- form.tsx:336 — setValue called when patches.educationStage is truthy without comparing current value
- infantFormNormalizationPatches returns patch when educationStage !== 'at_home'
- Effect deps [isInfant, watchDob, form] — form object identity triggers re-runs
- Hydration reset (form.tsx:429) can change educationStage, re-triggering infant effect
- Production stack: Maximum update depth exceeded at ChildForm

**Proposed fix:** Before setValue, compare form.getValues('educationStage') to patches.educationStage; skip when equal. Consider removing `form` from effect deps (use form.getValues/setValue stable ref). Keep infantFormNormalizationPatches as single source of patch truth.

**Confidence:** 95% | **Risk:** Low

**Minimal diff hint:**
```ts
if (form.getValues('educationStage') !== patches.educationStage) { form.setValue(...) }
```

## Regression Tests

### Edit infant
Load /children/:id for infant (<12mo), verify no render loop
- **File:** `artifacts/kidschedule/src/__tests__/child-form-infant-effect.test.ts`
- **Assertions:**
  - infantFormNormalizationPatches returns null when already at_home
  - effect does not call setValue when patch is null
  - render count stable across 3 hydration cycles

### Refetch storm
Simulate React Query refetch while infant form mounted
- **File:** `artifacts/kidschedule/src/__tests__/child-form-render-loop.test.tsx`
- **Assertions:**
  - form.reset skipped when values equal
  - no Maximum update depth error
  - useWatch subscribers <= 5 renders per refetch

### Change DOB
Toggle DOB across infant/toddler boundary
- **File:** `artifacts/kidschedule/src/__tests__/child-dob-picker.test.tsx`
- **Assertions:**
  - infant effect runs once on boundary cross
  - educationStage set to at_home only when needed

### Navigate between children
Switch childId route param without loop
- **File:** `artifacts/kidschedule/src/lib/child-form-hydration.test.ts`
- **Assertions:**
  - hydrationKey changes reset form once
  - childHydrationKeyRef prevents duplicate reset

**Registry status:** covered (4 files)