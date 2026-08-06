# Launch Readiness Report

**Date:** 2026-08-04  
**Scope:** AmyNest V2 presentation surfaces + frozen platform readiness  
**Mode:** Report only — no implementation in this sprint  
**Source:** Code audit of `artifacts/kidschedule/src/v2` + shell gates in `AppCore.tsx`

---

## Verdict

Presentation craft (loading, reduced motion, hope empty states, Mission / Coach / Premium continuity) is in good shape for founder observation.

**Guest → Ask Amy / For Child is not production-true for unsigned parents** while those routes remain `makeProtectedRoute`. Soft-nav and For Child teaser UI exist, but AppCore redirects unsigned users to sign-in. Treat that as a P0 observation blocker for those two tabs — not as a craft failure.

Frozen Amy OS engines (Decision, Stability, History, Cooldown, Attention, Registry, Bridge, Shadow, Experience Resolver/Packs) are **unit-tested and flag-default OFF**. Ready as platform; **not** live in dogfood unless explicitly bound.

---

## Part 6 — Production readiness (craft surfaces)

| Area | Status | Evidence |
|------|--------|----------|
| Loading | **PASS** | Calm Suspense → `V2CalmLoadingShell` / `V2CalmPrepare` |
| Accessibility | **RISK** | Landmarks + aria on core V2; guest sheet dialog lacks focus trap |
| Reduced Motion | **PASS** | Shared `useReducedMotion` across Today, Front Door, Mission, Premium, Nav, Sheet |
| Focus | **RISK** | Press tokens include focus rings; sheet autofocuses primary; no full trap/restore |
| Keyboard | **RISK** | Escape dismiss on guest sheet; incomplete keyboard suite for modals |
| Empty states | **PASS** | `V2_HOPE_EMPTY` + For Child hope copy; finish tests |
| Offline | **RISK** | Global `OfflineGate` + Premium offline phase; uneven craft elsewhere |
| Guest journey | **RISK** | Front Door → Today/Mission/Coach/Premium guest-aware; Ask Amy / For Child route-protected |
| Signup return | **RISK** | Soft-save + post-verify resolve exist; `/ask-amy` & `/for-child` may hit children/onboarding gate |
| Premium continuity | **PASS** | Account gate stashes `/premium`; purchase/offline covered by tests |
| For Child preview | **RISK** | Soft teaser UI exists; protected route blocks unsigned preview |
| Ask Amy continuity | **RISK** | Personalized entry + guest sheet intent; route protection breaks guest continuity |
| Coach continuity | **PASS** | Prepared plan + post-auth `/amy-coach` |
| Mission continuity | **PASS** | Local daily completion + success exits; guest-aware mission route |

---

## Part 7 — Technical audit (frozen platform)

All boolean V2 flags default **false** (`lib/feature-flags/defaults.ts`).

| Slice | Status | Notes |
|-------|--------|-------|
| memory | **Ready** | Soft-save / Amy Memory tests; no kill switch |
| decision | **Flagged-off** | `amy_decision_engine_v2` OFF + tests |
| stability | **Flagged-off** | `amy_decision_stability_v2` OFF + tests |
| history | **Flagged-off** | `amy_decision_history_v2` OFF + tests |
| cooldown | **Flagged-off** | `amy_decision_cooldown_v2` OFF + tests |
| attention | **Flagged-off** | `amy_attention_budget_v2` OFF + tests |
| registry adapters | **Flagged-off** | `amy_registry_adapters_v2` OFF + tests |
| bridge | **Flagged-off** | `amy_decision_bridge_v2` OFF + tests |
| shadow validation | **Flagged-off** | `amy_brain_shadow_validation_v2` OFF + tests |
| experience resolver | **Flagged-off** | `amy_experience_resolver_v2` OFF + tests |
| experience packs | **Flagged-off** | Speech / Sleep packs OFF + tests |
| flags | **Ready** | Defaults OFF asserted in `feature-flags.test.ts` |

Today still uses presentation + legacy speech mission path when Brain adapters are OFF (by design).

### Soft-save / return (as implemented)

| Step | Behavior |
|------|----------|
| Stash | `sessionStorage` `amynest.v2.post_auth_return` |
| Sheet | Ask Amy → `/ask-amy`; For Child → `/for-child`; else current / Premium |
| Resolve | `tryResolveV2PostAuthPath` before classic onboarding |
| Risk | Child-required gate may override Ask Amy / For Child returns |

### Observation tooling

| Tool | Gate |
|------|------|
| Runtime Inspector | DEV + `?runtimeInspector=1` / localStorage |
| Founder Observation | DEV + `?founderObserve=1` / localStorage → `window.__AMYNEST_FOUNDER_OBS__` |

Neither is visible to parents. Neither changes analytics backends.

---

## Dogfood recommendation

1. Run founder sessions on Front Door → Today → Mission → Coach → Premium first (highest truth).  
2. Explicitly note Ask Amy / For Child guest bounce as known P0 when testing those tabs.  
3. Keep Brain flags OFF unless a separate engine dogfood is scheduled.  
4. Use Observation Mode + Parent Guide + Emotion Log — do not ship product changes from this sprint.

See [`RISK_MATRIX.md`](./RISK_MATRIX.md) and [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).
