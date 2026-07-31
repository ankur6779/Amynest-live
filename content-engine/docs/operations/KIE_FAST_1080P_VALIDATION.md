# KIE_FAST_1080P_VALIDATION

**Date:** 2026-07-31  
**Objective:** Validate whether KIE Fast @ native 1080p is sufficient for AmyNest production.  
**Status:** **BLOCKED — insufficient KIE credits** (no complete Short generated; no visual conclusion yet)

---

## Isolation

| Constraint | Honored |
|------------|---------|
| Production pipeline unchanged | ✅ |
| Validators / publishing / story unchanged | ✅ |
| Output isolated under `.amynest-assets/kie-fast-1080p-validation/` | ✅ |
| Prior production master preserved | ✅ `kie-production/amynest-kie-production-golden-001.mp4` |

---

## Requested generation settings

| Setting | Value |
|---------|-------|
| Model | KIE **Veo 3.1 Fast** (`veo3_fast`) |
| Resolution | **Native 1080×1920** |
| Prompts | Enhanced motion + camera + lighting (KIE-only boost) |
| Encode | **CRF 16 · preset slow · high profile** |
| Duration / script / narration / CTA | Unchanged (golden-001) |

---

## Metering (this attempt)

| Field | Value |
|------:|
| Credits before | **100** |
| Credits after | **100** (no generation) |
| Credits needed (~5 × 65) | **~325** |
| Shortfall | **~225 credits (~$1.13)** |
| Generation | **not started** |
| Validators | **not run** (no master) |
| Upload | **not attempted** |

Preflight failure detail:  
`Insufficient KIE credits: 100 (need ~325 for Veo 3.1 Fast @ 1080p …)`

---

## Comparison baseline (previous KIE production)

| Field | Value |
|-------|-------|
| Master | `.amynest-assets/kie-production/amynest-kie-production-golden-001.mp4` |
| YouTube | https://youtube.com/shorts/pzY4h63ABKQ |
| Mode | Fast @ **720p** → canvas pad 1080 |
| Cert | PASS / 100 |
| Cost | $1.50 (300 credits) |

---

## Scorecard (pending full Short)

| Dimension | Fast@720p (prior) | Fast@1080p (this run) | Notes |
|-----------|-------------------:|----------------------:|-------|
| Face quality | baseline | **pending** | Needs generated master |
| Character consistency | PASS gate | **pending** | |
| Motion smoothness | baseline | **pending** | |
| Camera movement | baseline | **pending** | |
| Lighting | baseline | **pending** | |
| Compression artifacts | baseline | **pending** | CRF16 only applies after gen |
| Subtitle readability | PASS | **pending** | Same caption assets |
| CTA quality | PASS | **pending** | Same CTA plate |

**Quality vs ~4× cost:** deferred — cannot judge Quality mode ROI without Fast@1080p evidence first.

---

## Final conclusion

**Not issued yet** — requires a completed Fast@1080p Short + side-by-side frame review against `pzY4h63ABKQ`.

Required conclusion options (after top-up + re-run):

- `KEEP FAST 1080P AS DEFAULT`
- `QUALITY MODE IS WORTH THE EXTRA COST`

---

## Next step

1. Top up KIE to **≥ ~325 credits** (ideally ≥400 for headroom).  
2. Re-run:

```bash
cd content-engine
AMYNEST_KIE_OUT_DIR=.amynest-assets/kie-fast-1080p-validation \
AMYNEST_KIE_MASTER_NAME=amynest-kie-fast-1080p-validation.mp4 \
AMYNEST_KIE_REPORT_PATH=docs/operations/KIE_FAST_1080P_VALIDATION_RUN.md \
AMYNEST_KIE_VEO_RESOLUTION=1080p \
pnpm exec node --import tsx/esm ./operations/kie-production-run.ts
```

3. This report will be updated with frame evidence scores and one of the two final conclusions.
