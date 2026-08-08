# FA-02 P1 — Living Flag Production Mixed-Mode Hardening Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Authority:** Founder Order — FA-02 P1 Mixed-Mode Production Hardening  
**Source:** `docs/v2/FA_02_LIVING_FLAG_PRODUCTION_LOCK_VERIFICATION.md`  
**Branch:** `cursor/product-execution-model-v2`  
**Actual implementation SHA:** `26b2c05ce8fe8d9cc10fad1dd2e7a95ac90e2bab`

**Law:** Smallest safe production guard only. No module experience / visual / product / entitlement changes. No Final Apple Audit.

---

## Original P1 finding

From FA-02 Production Lock Verification (`fa775176`):

> FA-02 is VERIFIED overall, but one P1 remains:  
> Explicit production build with `VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed` is technically possible because mixed mode currently has no production guard.  
> Accidental mixed states are already blocked.

---

## Chosen guard behaviour

**Policy:** `mixed` / `allow_mixed` = DEV/TEST ONLY.

**Chosen behaviour (documented — not silent remap):**

| Layer | Behaviour |
|-------|-----------|
| **Vite production build** | `assertAmynestLivingUniverseBuildEnv(mode, raw)` runs at config load via `loadEnv`. If `mode === "production"` and raw is `mixed` or `allow_mixed` → **throw** → **build fails** |
| **Runtime resolver** | `resolveAmynestLivingUniverseMode()` throws the same error when production runtime (`MODE===production` or `PROD===true`) would otherwise return `"mixed"` |
| **Silent remap to living?** | **No** — production+mixed is **rejected**, not converted to living |

**Rationale:** Founder preferred failing production build/configuration over silently shipping mixed. Rejecting (not remapping) keeps misconfiguration loud and prevents accidental “looks like living but ops thought mixed” ambiguity.

**Pure helpers exported for build + tests:**

- `isAmynestMixedUniverseRaw`
- `isProductionMixedUniverseForbidden`
- `assertAmynestLivingUniverseBuildEnv`
- `AMYNEST_PRODUCTION_MIXED_UNIVERSE_ERROR`

**Touched files only:**

- `artifacts/kidschedule/src/lib/amynest-living-universe.ts`
- `artifacts/kidschedule/src/lib/amynest-living-universe.test.ts`
- `artifacts/kidschedule/vite.config.ts` (build assert call only)
- `.env.production.example` (docs for forbidden mixed)
- this review

**Not touched:** module components, Parent Hub / Speech / Health / Grow / Birth Sky / Routine / Coach / Audio product, P0-7, DB, API, Firebase, RevenueCat, Auth, Analytics, routing, individual living flag semantics.

---

## Environment matrix

| Master value | Environment | Expected | Actual |
|--------------|-------------|----------|--------|
| unset | production | Living (all 16 ON) | ✅ Living |
| living | production | Living | ✅ Living |
| 1 | production | Living | ✅ Living |
| 0 | production | Legacy (all 16 OFF) | ✅ Legacy |
| legacy | production | Legacy | ✅ Legacy |
| mixed | development | Mixed allowed | ✅ Mixed |
| mixed | test | Mixed allowed | ✅ Mixed |
| mixed | production | **REJECTED** | ✅ Build throws / resolver throws |
| allow_mixed | production | **REJECTED** | ✅ Same |

---

## Production mixed test

```bash
VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed \
  pnpm exec vite build --config vite.config.ts --mode production
```

**Result:** FAIL (exit 1)

```
Error: FA-02: VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed (or allow_mixed) is forbidden in production.
Use unset/living/1 for the living universe, or 0/legacy/false for coherent emergency rollback.
mixed is DEV/TEST only.
```

Unit tests also assert resolver throws under `MODE=production` + `PROD=true` + `mixed` / `allow_mixed` (no silent remap).

---

## Development mixed test

```bash
VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed \
  pnpm exec vite build --config vite.config.ts --mode development
```

**Result:** SUCCESS (exit 0) — mixed remains valid for development builds.

Unit: `development + mixed remains valid` → `resolve()` returns `"mixed"`.

---

## Living test

- Master `living` / `1` / unset (non-test): all surfaces forced ON (existing + retained tests).
- Production build with master unset: **SUCCESS** (`✓ built in ~38s`).

---

## Legacy rollback test

- Master `0` / `legacy`: all 16 forced OFF even when module flags ON (unit tests pass).
- `assertAmynestLivingUniverseBuildEnv("production", "0")` does **not** throw.
- Coherent emergency rollback path preserved: set `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` + rebuild.

---

## 16-surface coverage

`AMYNEST_LIVING_SURFACE_FLAGS.length === 16` — unchanged inventory.

All 16 helpers still call `resolvePortfolioLivingFlag(...)`. No individual flag wiring changed.

| # | Flag | Covered under master |
|---|------|----------------------|
| 1–16 | Today Home → Routine (`VITE_FF_*` inventory) | ✅ Yes |

---

## Regression results

| Check | Result |
|-------|--------|
| `pnpm run typecheck` (kidschedule) | ✅ PASS |
| `amynest-living-universe.test.ts` | ✅ PASS |
| `today-home` / `parent-hub` / `onboarding-conversion` flag tests | ✅ PASS |
| `portfolio-nav-labels` / `onboarding-navigation` / `routine-generation/living-entry` tests | ✅ PASS |
| Combined targeted flag/portfolio suite | ✅ 23 tests passed |

---

## Production build result

| Build | Result |
|-------|--------|
| `vite build --mode production` (master unset) | ✅ SUCCESS |
| `vite build --mode production` + `UNIVERSE=mixed` | ✅ REJECTED (exit 1) |
| `vite build --mode development` + `UNIVERSE=mixed` | ✅ SUCCESS |

---

## DB / API / RC / Firebase / Auth safety

| Surface | Modified? |
|---------|-----------|
| DB | No |
| API / api-server | No |
| RevenueCat | No |
| Firebase | No |
| Auth | No |
| Analytics contracts | No |
| Routing | No |
| Module UX / CSS / engines | No |

Only master universe gate + Vite config assert + env example docs + tests/review.

---

## Final answers (hardening)

| Question | Answer |
|----------|--------|
| Is production+mixed now impossible? | **YES** (build fail + resolver throw) |
| Is living production still valid? | **YES** |
| Is legacy rollback still valid? | **YES** |
| Is development/test mixed still valid? | **YES** |
| Silent remap of prod-mixed → living? | **NO** (rejected instead) |

---

**STOP for Founder review. Do not run Final Apple Audit until Founder orders.**
