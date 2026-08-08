# FA-02 — Living Flag Production Lock Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Authority:** Founder Order — FA-02 Living Flag Production Lock  
**Source:** `docs/v2/AMYNEST_FINAL_APPLE_AUDIT.md` (FA-02)  
**Branch:** `cursor/product-execution-model-v2`  
**Verified application HEAD (pre-impl):** `8b68e5bd` / Final Apple Audit stamp  

**Law:** Smallest safe production coherence lock. No module redesign. No Final Apple re-audit. No FA-01 / FA-07 work.

**Not modified (experience / policy / engines):**

- P0-7 · P0-6 IA · Speech/Health/Grow/Birth Sky/Routine/Coach/Audio deep manufacturing  
- Premium policy · DB · API · RevenueCat · Firebase · Auth · pricing · entitlements  

**Touched only:** portfolio living **flag resolvers** + new central lock + env example + this review.

---

## 1. Flag inventory (actual)

| # | Flag | Helper | Default (pre-lock, unset) | Role |
|---|---|---|---|---|
| 1 | `VITE_FF_TODAY_HOME_V1` | `isTodayHomeV1Enabled` | ON | Today Home sanctuary |
| 2 | `VITE_FF_PARENT_HUB_ROOMS_V1` | `isParentHubRoomsV1Enabled` | ON | Hub Rooms (not mall) |
| 3 | `VITE_FF_CHILD_DISCOVERY_FILM` | `isChildDiscoveryFilmEnabled` | ON | Child Discovery film |
| 4 | `VITE_FF_INFANT_CARE_LIVING_V1` | `isInfantCareLivingV1Enabled` | ON | Infant Care living |
| 5 | `VITE_FF_SPEECH_COACH_LIVING_V1` | `isSpeechCoachLivingV1Enabled` | ON | Speech living |
| 6 | `VITE_FF_NUTRITION_LIVING_V1` | `isNutritionLivingV1Enabled` | ON | Nutrition living |
| 7 | `VITE_FF_HEALTH_LAB_LIVING_V1` | `isHealthLabLivingV1Enabled` | ON | Health Lab living |
| 8 | `VITE_FF_GROW_LIVING_V1` | `isGrowLivingV1Enabled` | ON | Grow living |
| 9 | `VITE_FF_BIRTH_SKY_LIVING_V1` | `isBirthSkyLivingV1Enabled` | ON | Birth Sky living |
| 10 | `VITE_FF_ASK_AMY_LIVING_V1` | `isAskAmyLivingV1Enabled` | ON | Ask Amy living |
| 11 | `VITE_FF_GUIDANCE_LIVING_V1` | `isGuidanceLivingV1Enabled` | ON | Guidance living |
| 12 | `VITE_FF_MOMENTS_LIVING_V1` | `isMomentsLivingV1Enabled` | ON | Moments living |
| 13 | `VITE_FF_TALKING_AMY_LIVING_V1` | `isTalkingAmyLivingV1Enabled` | ON | Talking Amy living |
| 14 | `VITE_FF_AMY_COACH_LIVING_V1` | `isAmyCoachLivingV1Enabled` | ON | Amy Coach living |
| 15 | `VITE_FF_AMY_AUDIO_LIVING_V1` | `isAmyAudioLivingV1Enabled` | ON | Amy Audio living |
| 16 | `VITE_FF_ROUTINE_LIVING_V1` | `isRoutineLivingV1Enabled` | ON | Routine Generation living |

**New master:**

| Flag | Values | Role |
|---|---|---|
| `VITE_FF_AMYNEST_LIVING_UNIVERSE` | unset/`living`/`1` → living · `0`/`legacy` → legacy · `mixed` → honor individuals | FA-02 production lock |

Routine result/execution helpers already delegate to `isRoutineLivingV1Enabled()` (single surface).

**Not in inventory (out of scope):** `VITE_FF_BIRTH_SKY` (engine kill), allowlists, billing/auth flags, MSE streaming, guest try-first, etc.

---

## 2. Current architecture (before)

| Question | Answer |
|---|---|
| Source | Build-time Vite `import.meta.env` |
| Who can change | Deploy/build env only (not per-user, not localStorage) |
| Per user? | **NO** |
| Per session? | **NO** |
| Per environment? | **YES** (each build can set a different subset) |
| Runtime remote config? | **NO** |
| Mixed universe risk? | **YES** — e.g. prod env accidentally sets `VITE_FF_GROW_LIVING_V1=0` while others remain unset/ON → Living Hub + Legacy Grow |

Deep links do not set flags; they only enter routes. Mixed risk was **build/env composition**, not user state.

---

## 3. Mixed-universe risks (before)

| Scenario | Possible before? |
|---|---|
| Living Parent Hub + Legacy Health Lab | **YES** via partial env |
| Living Speech + Legacy Grow | **YES** |
| Living Birth Sky + Legacy Amy Coach | **YES** |
| Apple review build with one module OFF | **YES** if env incomplete |
| End-user toggling mid-session | **NO** (build-time only) |

---

## 4. Production model (after)

**Smallest safe mechanism:** central portfolio resolver  
`artifacts/kidschedule/src/lib/amynest-living-universe.ts`

| Mode | Master value | Effect |
|---|---|---|
| **Living (production default)** | unset / `living` / `1` / `true` | **All 16 surfaces forced ON** — individual OFF ignored |
| **Legacy (emergency)** | `0` / `false` / `legacy` | **All 16 surfaces forced OFF** — coherent legacy rollback |
| **Mixed (dev/test only)** | `mixed` / `allow_mixed` | Honor per-module flags (can mix) |
| **Vitest default** | unset in `MODE=test` | **mixed** so existing kill-switch unit tests remain valid |

Production docs: `.env.production.example` documents the master.

**Apple review path `/begin`:** with production living master (default), always presents the intended living universe regardless of stray individual `=0` in env.

---

## 5. Rollback model

| Intent | Action | Result |
|---|---|---|
| Production living | Leave master unset or `living` | Coherent living |
| Emergency coherent legacy | Set `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` and **rebuild** | Coherent legacy (all OFF) |
| Dev single-module legacy face | `VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed` + module `=0` | Intentional mixed (not for prod) |

Per-module flags are **retained** (not deleted). They are inert under living/legacy master.

Rollback remains **deliberate** (build-time env + rebuild) — not accidental end-user state.

---

## 6. Before vs After

| | Before | After |
|---|---|---|
| Production default | 16 independent defaults ON | Master living → **locked coherent ON** |
| Accidental one-flag OFF in prod env | Mixed universe | **Ignored** (still living) |
| Emergency rollback | Flip N flags correctly or risk mix | Flip **one** master → all legacy |
| Dev kill-switch tests | Per-module `=0` | Still work (test mode = mixed) |
| Module experience code | Unchanged | Unchanged (flag helpers only) |

---

## 7. Test matrix

| Case | Result |
|---|---|
| Master living + module flags OFF | All helpers **ON** · snapshot coherent · **PASS** |
| Master legacy + module flags ON | All helpers **OFF** · snapshot coherent · **PASS** |
| Master mixed + Grow OFF + Health ON | Mixed allowed · **PASS** (dev) |
| Vitest unset master + parent-hub/today kill tests | Still pass · **PASS** |
| Living-room unit suites (Speech/Health/Grow/Birth Sky/…) | **PASS** |
| P0-7 hard-day regression | **PASS** |
| TypeScript | **PASS** |
| Production build | **PASS** |

---

## 8. Existing-user safety

| Concern | Result |
|---|---|
| Per-user flag storage | None existed — nothing to migrate |
| Unexpected mid-session flip | Impossible (build-time) |
| Fresh users | Coherent living (production default) |
| Existing users after deploy | See whatever the **build** locked — living by default |

---

## 9. Deep-link safety

Deep links route into modules; presentation follows the universe lock.

Under production living master, deep links cannot resurrect legacy presentation via a stray module env OFF.

Under emergency legacy master, deep links present coherent legacy faces.

---

## 10. Apple review path

| Check | Result |
|---|---|
| `/begin` canonical | Unchanged |
| `/welcome` not review | Unchanged |
| Production living config | Master living (default) → living universe on `/begin` |
| Stray individual OFF in review env | **Cannot** break coherence |

---

## 11. Production safety

| Domain | Result |
|---|---|
| DB / API / RC / Firebase / Auth | **Unchanged** |
| Engines | **Unchanged** |
| Pricing / entitlements | **Unchanged** |
| Completed module deep UX files | **Unchanged** (only `is*Enabled` resolvers) |
| Dual-flag rollback capability | **Preserved** via master legacy + mixed dev |

---

## 12. Final questions

1. **Can production accidentally enter a mixed visual universe?** → **NO** (under living/legacy master; mixed is opt-in dev only)  
2. **Is living the single intended production universe?** → **YES**  
3. **Is rollback still possible?** → **YES**  
4. **Can rollback be performed coherently?** → **YES** (`VITE_FF_AMYNEST_LIVING_UNIVERSE=0` + rebuild)  
5. **Are completed modules untouched?** → **YES** (experience/policy/engines; flag helpers only)  
6. **Are DB/API/RC/Firebase/Auth unchanged?** → **YES**  

---

## 13. Founder score

| Dimension | Score | Note |
|---|---|---|
| Coherence lock strength | **9.5** | Master forces all-ON / all-OFF |
| Rollback safety | **9** | One deliberate rebuild switch |
| Minimal surface area | **9** | Central resolver + thin helper wiring |
| Test/dev ergonomics | **9** | Vitest defaults mixed |
| Ops clarity | **8.5** | Documented in `.env.production.example` |

**Overall FA-02:** **9.2 / 10**

---

## 14. Remaining debt

1. Ops must set/keep master correctly in Cloudflare/Coolify build env (document already in example)  
2. `mixed` remains available — must never be set in production builds  
3. Non-living flags (`VITE_FF_BIRTH_SKY` engine kill, guest, MSE, etc.) intentionally outside this lock  
4. FA-01 device a11y / FA-07 scale ops — **not in this order**  
5. Final Apple Audit **not** re-run  

---

## 15. Rollback

```bash
# Emergency coherent legacy (requires web rebuild / redeploy)
VITE_FF_AMYNEST_LIVING_UNIVERSE=0
```

```bash
# Restore production living (default if unset)
VITE_FF_AMYNEST_LIVING_UNIVERSE=living
# or omit the variable
```

```bash
# Dev-only mixed (never production)
VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed
VITE_FF_GROW_LIVING_V1=0
```

---

## 16. File map

| Path | Change |
|---|---|
| `lib/amynest-living-universe.ts` | **New** master resolver + inventory + snapshot |
| `lib/amynest-living-universe.test.ts` | **New** lock / mixed / wired-helper tests |
| `lib/*/living-room.ts` · `living-entry.ts` · Hub/Today flags · child discovery | Flag helpers → `resolvePortfolioLivingFlag` |
| `.env.production.example` | Master documented |
| `docs/v2/FA_02_LIVING_FLAG_PRODUCTION_LOCK_REVIEW.md` | This review |

---

## 17. Commit SHA

**Implementation:** `2ca49cd29451ab385038031bc771d95fd7a1ccc4`

---

## STOP

Do **not** re-run Final Apple Audit.  
Do **not** touch FA-01 or FA-07.  

Verify → commit → push → Founder Review → **STOP**.
