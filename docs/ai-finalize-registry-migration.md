# AI Finalize Registry Migration

Feature flag: `AI_FINALIZE_REGISTRY` (`true` / `1` / `yes`)

When **off** (default): legacy `buildSyncBody` (inline) + `shapePollApiResult` (poll).  
When **on**: migrated routes use `lib/ai-route-contracts` for **both** inline and poll.

Legacy shapers remain until all waves pass parity in staging.

---

## Wave 1 — speech + assistant

### Routes migrated (registry)

| Route | Contract |
|-------|----------|
| `speech/transcribe` | `speechTranscribeContract` |
| `ai/assistant-ai` | `assistantAiContract` |

### Inline response JSON

```json
{ "transcript": "<string>" }
```

```json
{ "answer": "<string>" }
```

### BullMQ poll `result` JSON (flag on)

Same as inline above.

### Parity verification

```bash
cd artifacts/api-server
node --import tsx --test src/lib/ai-route-contracts/parity.test.ts
```

Tests assert: `contract.finalize(raw)` === legacy `buildSyncBody` shape === `shapePollApiResult`.

### Routes remaining (not on registry)

All other queued routes (~15): meals, spelling, abacus, ai-tutor, ai-coach.*, speech-converse, etc.

### Regression risk

| Risk | Level | Mitigation |
|------|-------|------------|
| Assistant history not persisted on poll | Low | `afterFinalize` + `sideEffectsApplied` idempotency |
| Flag accidentally on in prod before QA | Medium | Default off; enable per-environment |

### Rollback plan

1. Set `AI_FINALIZE_REGISTRY=false` on Render API (no redeploy required if env-only).
2. Redeploy previous image if needed.
3. Legacy `buildSyncBody` + `shapePollApiResult` take over immediately.

---

## Wave 2 — infant sleep + feeding

### Routes migrated

| Route | Contract |
|-------|----------|
| `infant-sleep/coach-plan` | `infantSleepCoachContract` |
| `infant-feeding/plan` | `infantFeedingPlanContract` |

### Inline / poll JSON

```json
{
  "ok": true,
  "plan": { },
  "generatedAt": "<ISO8601>",
  "cached": false
}
```

### Parity verification

Same test file — Wave 2 describe blocks (envelope + plan; `generatedAt` is dynamic — compare `plan` + `ok` + `cached`).

### Routes remaining

Wave 3 + all non-migrated queued routes.

### Regression risk

| Risk | Level | Mitigation |
|------|-------|------------|
| Duplicate cache/analytics on double poll | Low | `sideEffectsApplied` on job record |
| `generatedAt` differs inline vs poll | Low | Expected; clients use plan body |

### Rollback plan

Same as Wave 1 — disable flag. Infant routes fall back to `shapePollApiResult` + existing `buildSyncBody`.

---

## Wave 3 — routine generation

### Routes migrated

| Route | Contract |
|-------|----------|
| `routines/generate-ai` | `routineGenerateAiContract` |

Delegates to `buildRoutineGeneratePollResponse` (safety, enrichments, rule-based fallback).

### Inline / poll JSON

Full `GenerateRoutineResponse` + `{ success, fallback, generationSource, ... }` — same as existing inline path.

### Parity verification

- Unit: registry wiring test in `parity.test.ts`
- Integration: `pnpm --filter @workspace/api-server run test:ai-pipeline` (routines.test.ts) with flag on in staging

### Routes remaining

~14 queued routes outside registry (meals, coach next-win, spelling, etc.)

### Regression risk

| Risk | Level | Mitigation |
|------|-------|------------|
| Safety gate divergence | **High** if wrong | Shared `buildRoutineGeneratePollResponse` for registry + legacy poll |
| Large `pollContext` in Redis | Medium | TTL 600s; context is route snapshot only |

### Rollback plan

1. `AI_FINALIZE_REGISTRY=false`
2. Legacy `buildSyncBody` in `routines.ts` unchanged
3. Legacy `shapePollApiResult` case for `routines/generate-ai` unchanged

---

## Post-migration cleanup (do not do until parity green in prod)

- [ ] Remove `shapePollApiResult` route switch
- [ ] Remove per-route `buildSyncBody` closures (use registry only)
- [ ] Remove `pollContext` band-aid field
- [ ] Make `AI_FINALIZE_REGISTRY` default true

---

## Enable in staging

```bash
AI_FINALIZE_REGISTRY=true
```

Smoke per wave before production:

1. Trigger route → verify 200 body
2. Force slow job (or `waitMs: 0`) → poll `/api/result/:jobId` → same JSON shape
3. Compare `apiResult` in Redis job record when flag on
