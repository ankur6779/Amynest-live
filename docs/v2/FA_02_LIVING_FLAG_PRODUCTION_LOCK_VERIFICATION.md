# FA-02 Living Flag Production Lock — Independent Verification

**Status:** AUDIT ONLY — NO IMPLEMENTATION  
**Date:** 2026-05-08  
**Branch:** `cursor/product-execution-model-v2`  
**Implementation under review:** `2ca49cd2`  
**Docs stamp under review:** `222ed6cb`  
**Scope:** Verify `VITE_FF_AMYNEST_LIVING_UNIVERSE` is the single production visual-universe gate  
**Frozen:** Do not modify FA-02 · Do not run Final Apple Audit

---

## Executive Summary

FA-02 is **independently verified as a working production-lock layer** for the AmyNest portfolio living universe.

**What is proven from code:**

1. Master gate `VITE_FF_AMYNEST_LIVING_UNIVERSE` exists in `lib/amynest-living-universe.ts` and orchestrates portfolio living ON/OFF coherence.
2. All **16** inventory surfaces resolve through `resolvePortfolioLivingFlag(individualRaw)` — helpers pass `import.meta.env.<FLAG>` into the master resolver; none of the 16 bypass it.
3. Production defaults (unset / living / 1 / true) force a **coherent living universe**.
4. Emergency rollback (`0` / `false` / `legacy`) forces a **coherent legacy universe** across all 16 surfaces (rebuild required — Vite build-time).
5. Accidental mixed via individual module flags while master is living/legacy/unset is **blocked** (unit-tested).
6. FA-02 commit (`2ca49cd2`) touched only flag resolvers + central lock + `.env.production.example` + review doc — not frozen deep UX / P0-6 / P0-7 / engines / DB / API / RevenueCat / Firebase / Auth.

**What is not fully sealed by code:**

| Gap | Severity | Evidence |
|-----|----------|----------|
| `mixed` / `allow_mixed` is **not MODE-guarded** — a production build can still select mixed if ops sets the master | **P1** | `resolveAmynestLivingUniverseMode` returns `"mixed"` for those strings with no `MODE === "production"` rejection |
| Case-sensitive master values — `LEGACY` / `Living` / `TRUE` do not match; unknown → fail-closed **living** | **P2** | Exact string match only |
| Out-of-scope kill switches remain (Birth Sky engine, Growth AI, Maze) | **P2 / intentional** | Not portfolio living presentation gates |

**Bottom line:** Production cannot accidentally ship mixed via stray per-module flags. Production **can** ship mixed only if someone **explicitly** sets the master to `mixed` / `allow_mixed` — an ops discipline gap, not a silent default.

---

## Master Gate Verification

### Central module

| Item | Evidence |
|------|----------|
| File | `artifacts/kidschedule/src/lib/amynest-living-universe.ts` |
| Env key | `VITE_FF_AMYNEST_LIVING_UNIVERSE` |
| Mode resolver | `resolveAmynestLivingUniverseMode()` |
| Per-surface API | `resolvePortfolioLivingFlag(individualRaw)` — raw Vite env value, not env key string |
| Inventory | `AMYNEST_LIVING_SURFACE_FLAGS` length **16** |
| Unit tests | `amynest-living-universe.test.ts` — living / legacy / mixed / vitest default / wired helpers |

### Contract from code (not assumed)

```ts
export function resolveAmynestLivingUniverseMode(): AmynestLivingUniverseMode {
  const raw = import.meta.env.VITE_FF_AMYNEST_LIVING_UNIVERSE;
  if (raw === "0" || raw === "false" || raw === "legacy") return "legacy";
  if (raw === "mixed" || raw === "allow_mixed") return "mixed";
  if (raw === "true" || raw === "1" || raw === "living") return "living";
  if (raw === undefined || raw === "") {
    return isTestRuntime() ? "mixed" : "living"; // MODE=test OR VITEST=true
  }
  return "living"; // unknown → fail closed living
}

export function resolvePortfolioLivingFlag(individualRaw): boolean {
  const mode = resolveAmynestLivingUniverseMode();
  if (mode === "living") return true;
  if (mode === "legacy") return false;
  // mixed — honor per-module kill switch (default ON when unset)
  ...
}
```

**Verified against Expected Contract:**

| Input | Expected | Actual (code) | Match |
|-------|----------|---------------|-------|
| unset (non-test) | ALL living ON | `"living"` → all true | ✅ |
| living | ALL living ON | `"living"` → all true | ✅ |
| 1 | ALL living ON | `"living"` → all true | ✅ |
| true | ALL living ON | `"living"` → all true | ✅ |
| 0 | ALL living OFF | `"legacy"` → all false | ✅ |
| legacy | ALL living OFF | `"legacy"` → all false | ✅ |
| false | ALL living OFF | `"legacy"` → all false | ✅ |
| mixed | DEV/TEST ONLY | `"mixed"` → per-module | ⚠️ selectable in any MODE including production |
| allow_mixed | DEV/TEST ONLY | `"mixed"` | ⚠️ same |
| unset in test (`MODE=test` or `VITEST=true`) | mixed (tests) | `"mixed"` | ✅ test-only |

---

## 16-Surface Matrix

Source of truth: `AMYNEST_LIVING_SURFACE_FLAGS` + FA-02 review inventory + helper wiring.

All 16 helpers call `resolvePortfolioLivingFlag(import.meta.env.<FLAG>)`.  
Repo scan of the 16 flag identifiers: **only** helper files + universe module (+ tests/comments) reference them — **no production bypass reads**.

| # | Surface | Env flag | Living flag helper | File | Master gate dependency | Default (mixed / unset module) | Legacy fallback | Production (master unset/living/1/true) | Rollback (master=0/false/legacy) |
|---|---------|----------|--------------------|------|------------------------|--------------------------------|-----------------|-----------------------------------------|----------------------------------|
| 1 | Today Home | `VITE_FF_TODAY_HOME_V1` | `isTodayHomeV1Enabled` | `lib/today-home/feature-flags.ts` | via `resolvePortfolioLivingFlag` | ON | Legacy Today home | Forced ON | Forced OFF |
| 2 | Parent Hub Rooms | `VITE_FF_PARENT_HUB_ROOMS_V1` | `isParentHubRoomsV1Enabled` | `lib/parent-hub/feature-flags.ts` | via master | ON | Classic Parent Hub shell | Forced ON | Forced OFF |
| 3 | Child Discovery Film | `VITE_FF_CHILD_DISCOVERY_FILM` | `isChildDiscoveryFilmEnabled` | `lib/onboarding-conversion-flags.ts` | via master | ON | Legacy discovery chat | Forced ON | Forced OFF |
| 4 | Infant Care | `VITE_FF_INFANT_CARE_LIVING_V1` | `isInfantCareLivingV1Enabled` | `lib/infant-care/living-room.ts` | via master | ON | Classic Infant Care | Forced ON | Forced OFF |
| 5 | Speech Coach | `VITE_FF_SPEECH_COACH_LIVING_V1` | `isSpeechCoachLivingV1Enabled` | `lib/speech-coach/living-room.ts` | via master | ON | Classic Speech | Forced ON | Forced OFF |
| 6 | Nutrition | `VITE_FF_NUTRITION_LIVING_V1` | `isNutritionLivingV1Enabled` | `lib/nutrition/living-room.ts` | via master | ON | Classic Nutrition | Forced ON | Forced OFF |
| 7 | Health Lab | `VITE_FF_HEALTH_LAB_LIVING_V1` | `isHealthLabLivingV1Enabled` | `lib/health-lab/living-room.ts` | via master | ON | Classic Health Lab | Forced ON | Forced OFF |
| 8 | Grow | `VITE_FF_GROW_LIVING_V1` | `isGrowLivingV1Enabled` | `lib/grow/living-room.ts` | via master | ON | Classic Grow | Forced ON | Forced OFF |
| 9 | Birth Sky | `VITE_FF_BIRTH_SKY_LIVING_V1` | `isBirthSkyLivingV1Enabled` | `lib/birth-sky/living-room.ts` | via master | ON | Classic Birth Sky presentation | Forced ON | Forced OFF |
| 10 | Ask Amy | `VITE_FF_ASK_AMY_LIVING_V1` | `isAskAmyLivingV1Enabled` | `lib/ask-amy/living-room.ts` | via master | ON | Classic Ask Amy | Forced ON | Forced OFF |
| 11 | Guidance | `VITE_FF_GUIDANCE_LIVING_V1` | `isGuidanceLivingV1Enabled` | `lib/guidance/living-room.ts` | via master | ON | Classic Guidance | Forced ON | Forced OFF |
| 12 | Moments | `VITE_FF_MOMENTS_LIVING_V1` | `isMomentsLivingV1Enabled` | `lib/moments/living-room.ts` | via master | ON | Classic Moments | Forced ON | Forced OFF |
| 13 | Talking Amy | `VITE_FF_TALKING_AMY_LIVING_V1` | `isTalkingAmyLivingV1Enabled` | `lib/talking-amy/living-room.ts` | via master | ON | Classic Talking Amy | Forced ON | Forced OFF |
| 14 | Amy Coach | `VITE_FF_AMY_COACH_LIVING_V1` | `isAmyCoachLivingV1Enabled` | `lib/amy-coach/living-room.ts` | via master | ON | Classic Amy Coach | Forced ON | Forced OFF |
| 15 | Amy Audio | `VITE_FF_AMY_AUDIO_LIVING_V1` | `isAmyAudioLivingV1Enabled` | `lib/amy-audio/living-room.ts` | via master | ON | Classic Amy Audio | Forced ON | Forced OFF |
| 16 | Routine Generation | `VITE_FF_ROUTINE_LIVING_V1` | `isRoutineLivingV1Enabled` | `lib/routine-generation/living-entry.ts` | via master | ON | Classic routine generation | Forced ON | Forced OFF |

**Delegates (same surface #16, not extra gates):**

- `living-result.ts` → `isRoutineLivingV1Enabled()`
- `living-execution.ts` → `isRoutineLivingV1Enabled()`

**No surface among the 16 silently bypasses the master gate.**

---

## Flag Bypass Search

### Searches performed

| Pattern | Result |
|---------|--------|
| All 16 inventory env keys in app `src` | Reads only in helpers + `amynest-living-universe.ts` (+ tests / comments) |
| Direct `import.meta.env.VITE_FF_*` living-surface reads outside helpers | **0** production bypasses |
| `localStorage` living / portfolio feature flags | **None** for these 16 |
| Module-level kill switches for living UI | All 16 go through master |
| Route-level legacy switches reading env directly | Not found — routes use helpers; comments mention kill switches only |
| FA-02 commit frozen-path scan | No hard-day / dashboard / api-server / revenue / firebase / auth matches |

### Production paths that could create Living A + Legacy B

| Path | Possible without `mixed`? | Notes |
|------|---------------------------|-------|
| Individual `VITE_FF_*=0` while master unset/living | **NO** | Master forces true (tested) |
| Individual `=1` while master=legacy/`0` | **NO** | Master forces false (tested) |
| Master=`mixed` in production build | **YES** | Explicit ops action — see Mixed Mode |
| Birth Sky engine `VITE_FF_BIRTH_SKY` (non-living) | N/A to 16-surface mix | Separate engine kill |
| Vitest unset master | Test-only mixed | `isTestRuntime()` — not production |

### Unrelated flags (out of scope)

- `VITE_FF_BIRTH_SKY` / allowlist — engine availability  
- `VITE_FF_GROWTH_AI`, `VITE_FF_MAZE_*`, speech pipeline non-living flags  
- Guest try-first, co-parent, MSE streaming  

These do **not** create living/legacy presentation mix of the 16 portfolio surfaces via FA-02 paths.

---

## Production Matrix

| Master value | Expected universe | Actual universe (code) | Allowed environment (policy) | Risk |
|--------------|-------------------|------------------------|------------------------------|------|
| **unset** (prod/dev build) | Living (all 16 ON) | Living | Production default | Low — coherent living |
| **living** | Living | Living | Production | Low |
| **1** | Living | Living | Production | Low |
| **true** | Living | Living | Production | Low |
| **0** | Legacy (all 16 OFF) | Legacy | Emergency rollback | Low if rebuild done |
| **false** | Legacy | Legacy | Emergency rollback | Low |
| **legacy** | Legacy | Legacy | Emergency rollback | Low |
| **mixed** | Dev/test only | Mixed (per-module) | **Policy: dev/test** — **code: any MODE** | **P1** |
| **allow_mixed** | Same as mixed | Mixed | Same | **P1** |
| **unknown** (e.g. `foo`, `LEGACY`) | Fail-closed living | Living | Production-safe default | P2 — case typo on rollback fails closed to living (safe, not silent mix) |
| **unset** + test runtime | Mixed | Mixed | Vitest only | Info |

---

## Build-Time Verification

| Check | Finding |
|-------|---------|
| Vite env handling | Values read via `import.meta.env.VITE_*` — inlined at **Vite build time** |
| Runtime toggling | **Not** supported per-user/session; changing env without rebuild does not change shipped client |
| Production build | Master resolution is a compile-time constant per build artifact |
| Tree/runtime evaluation | Sync helpers; not remote config |
| Deployment config | `.env.production.example` documents master + “DEV ONLY” for mixed + rebuild for rollback |
| Server/client mismatch | Portfolio living gates are **client Vite** env; no separate server twin for these 16 |

**Conclusion:** Gate is genuinely **build-time**. Rollback requires:

```bash
VITE_FF_AMYNEST_LIVING_UNIVERSE=0
# rebuild + redeploy client
```

---

## Rollback Verification

### Procedure (documented + code-backed)

1. Set `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` (or `legacy` / `false`)
2. Rebuild client
3. Redeploy

### Coherence proof

When mode=`legacy`, `resolvePortfolioLivingFlag` **always returns false** before reading per-module semantics. Unit tests assert: master=`0` / `legacy` with module env `"1"` / `"true"` still yields `false`; snapshot `coherent === true`.

| Failure mode | Occurs on rollback? |
|--------------|---------------------|
| Half-living UI | **No** — all 16 forced OFF |
| Half-legacy UI | **No** — coherent legacy |
| Mixed premium presentation | **No** |
| Broken routes from flag alone | **No** — classic branches remain behind helpers |
| Missing modules | **No** — gates toggle presentation path |

**Verdict:** Coherent legacy rollback is **proven in code + tests**. Operational rebuild/redeploy is required.

---

## Mixed Mode Verification

### Intended policy

`mixed` = development / test only (stated in module header + `.env.production.example`).

### Code enforcement

| Guard | Present? |
|-------|----------|
| Master must be explicitly `mixed` or `allow_mixed` | ✅ Yes |
| Test runtime unset → mixed | ✅ `isTestRuntime()` (`MODE=test` or `VITEST=true`) |
| Production MODE blocks mixed | ❌ **No** |
| Runtime warning when mixed in production | ❌ Not present in gate |

### How mixed can appear in production

**Only** if deployment sets:

```text
VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed
# or allow_mixed
```

then rebuilds. Individual module flags alone **cannot** create mixed while master is living/legacy/unset.

### Accidental mixed without setting master?

**No** — not via undefined env (→ living), not via per-module `=0`, not via localStorage.

### Enforcement gap (report only — not fixed)

> **P1:** Mixed mode is technically selectable in a production build if ops sets the master value. Policy intent is not code-enforced via `MODE === "production"` rejection.

---

## Frozen Surface Verification

FA-02 commit (`2ca49cd2`) touched:

- `lib/amynest-living-universe.ts` (+ test) — **new**
- 16 living helper / feature-flag files — **flag wiring only**
- `.env.production.example`
- `docs/v2/FA_02_LIVING_FLAG_PRODUCTION_LOCK_REVIEW.md`

**Not modified by FA-02:**

| Frozen surface | Modified by FA-02? |
|----------------|--------------------|
| P0-6 Parent Hub | No |
| P0-7 | No |
| Speech Coach deep / hard-day | No |
| Health Lab deep CSS/interior | No |
| Grow deep CSS/interior | No |
| Birth Sky deep CSS/interior | No |
| Routine Generation engines / R1–R5 product | No (flag helper only) |
| Amy Coach product | No (living-room flag only) |
| Amy Audio product | No (living-room flag only) |
| Parent Hub IA | No |
| DB / API / api-server | No |
| RevenueCat | No |
| Firebase / Auth | No |
| Analytics contracts | No |

**Only the master gating layer (+ helper wiring + env docs) changed.** ✅

---

## 16-Surface Coherence Test

| # | Surface | Production default | Rollback | Mixed production possibility |
|---|---------|--------------------|----------|------------------------------|
| 1 | Today Home | **LIVING** | **LEGACY** | **NO*** |
| 2 | Parent Hub Rooms | **LIVING** | **LEGACY** | **NO*** |
| 3 | Child Discovery Film | **LIVING** | **LEGACY** | **NO*** |
| 4 | Infant Care | **LIVING** | **LEGACY** | **NO*** |
| 5 | Speech Coach | **LIVING** | **LEGACY** | **NO*** |
| 6 | Nutrition | **LIVING** | **LEGACY** | **NO*** |
| 7 | Health Lab | **LIVING** | **LEGACY** | **NO*** |
| 8 | Grow | **LIVING** | **LEGACY** | **NO*** |
| 9 | Birth Sky | **LIVING** | **LEGACY** | **NO*** |
| 10 | Ask Amy | **LIVING** | **LEGACY** | **NO*** |
| 11 | Guidance | **LIVING** | **LEGACY** | **NO*** |
| 12 | Moments | **LIVING** | **LEGACY** | **NO*** |
| 13 | Talking Amy | **LIVING** | **LEGACY** | **NO*** |
| 14 | Amy Coach | **LIVING** | **LEGACY** | **NO*** |
| 15 | Amy Audio | **LIVING** | **LEGACY** | **NO*** |
| 16 | Routine Generation | **LIVING** | **LEGACY** | **NO*** |

\* **NO** via accidental per-module / unset / living / legacy master.  
**YES** only if master is explicitly set to `mixed` / `allow_mixed` for that production build (ops).

No surface answers **AMBIGUOUS** or **BROKEN** for default/rollback under documented master values.

---

## Production Risks

| ID | Risk | Severity | Evidence |
|----|------|----------|----------|
| R1 | Ops sets `mixed` in production → living A + legacy B possible | **P1** | No MODE guard on mixed |
| R2 | Case mismatch on rollback (`LEGACY` vs `legacy`) → fails closed to **living** (not mixed) | **P2** | Exact lowercase match; unknown → living |
| R3 | Forgot rebuild after setting `=0` → stale living client remains | **P2** | Build-time Vite — ops process |
| R4 | Unrelated Birth Sky **engine** kill vs living presentation | **P2** | Separate `VITE_FF_BIRTH_SKY` — pre-existing; not FA-02 regression |
| R5 | Test runtime default mixed when master unset | **Info** | `isTestRuntime()` only; production unset → living |

### Production safety checklist

| Concern | Status |
|---------|--------|
| Undefined environment behaviour | ✅ Fail-closed **living** (coherent) |
| Different defaults across modules under living/legacy master | ✅ Eliminated — master forces |
| Case-sensitive mismatches | ⚠️ P2 — see R2 |
| String/boolean mismatches | ✅ `"1"`/`"true"`/`"0"`/`"false"` handled on master |
| Build-time/runtime mismatch | ✅ Build-time; documented |
| Server/client env mismatch for living gates | ✅ Client Vite only for these 16 |
| Stale helper imports | ✅ All use `resolvePortfolioLivingFlag` |
| Dead flag helpers | ✅ Not found |
| Legacy routes bypassing gate | ✅ Not found for living presentation |
| Deep-link bypasses of living gate | ✅ Deep links enter routes; flags still via helpers |

---

## Remaining Debt

1. **P1 — Enforce mixed ≠ production in code** (future Founder order only): reject or remap `mixed` when `MODE === "production"`.
2. **P2 — Case-insensitive master tokens** (optional hardening).
3. **P2 — Ops runbook:** never set master=`mixed` in prod deploy configs; prefer unset/living; use `0` for rollback + rebuild.
4. **Out of scope:** Birth Sky engine kill vs living presentation coherence (not a FA-02 bypass of the 16 surfaces).

---

## Final Verdict

### Exact answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Is living the only intended production universe? | **YES** |
| 2 | Can production accidentally ship mixed universe? | **CONDITIONAL** |
| 3 | Is coherent legacy rollback proven? | **YES** |
| 4 | Are all 16 surfaces covered? | **YES** |
| 5 | Are there any P0/P1 flag risks? | **YES** |
| 6 | Is FA-02 production lock VERIFIED? | **YES** |

### Evidence for CONDITIONAL / YES on risks

**Q2 — CONDITIONAL:**

- **Accidental** mixed via unset master, per-module flags, localStorage, or unknown values: **NO** (proven blocked).
- **Explicit** mixed via `VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed` (or `allow_mixed`) in a production build: **YES** (no MODE enforcement).

**Q5 — YES (P1, not P0):**

- **P1:** Mixed selectable in production MODE if master explicitly set — ops discipline gap.
- **No P0** found: no silent default to mixed in production; no surface bypass of master among the 16; rollback does not create half-living UI.

**Q6 — YES (verified with documented P1 debt):**

FA-02 achieves the Founder objective: production cannot **accidentally** ship a mixed living/legacy portfolio. The remaining gap is **explicit ops selection of mixed**, which is remaining debt — not a silent failure of the lock.

---

## Recommendation to Founder

| Option | Meaning |
|--------|---------|
| **A) ACCEPT FA-02 VERIFIED** | Proceed when ready; treat mixed MODE-guard as follow-up hardening |
| **B) REQUIRE MIXED PRODUCTION HARDENING** | New Founder order only — reject `mixed` when `MODE===production` |
| **C) HOLD** | If Founder requires zero CONDITIONAL answers before any further audit |

**This verification does NOT authorize Final Apple Audit.**  
Await Founder order before any re-audit or FA-01 / FA-07 work.

---

**END OF FA-02 PRODUCTION LOCK VERIFICATION**  
**Audit only · No implementation · STOP for Founder review**
