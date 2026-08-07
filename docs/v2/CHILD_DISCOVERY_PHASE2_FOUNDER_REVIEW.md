# Child Discovery Phase 2 — Founder Review Pack

**Status:** Implemented — awaiting Six Reviews verdict  
**Commit surface:** Child Discovery Film on `/onboarding`  
**Kill switch:** `VITE_FF_CHILD_DISCOVERY_FILM=0` → legacy chat  

Welcome V3 frozen. Signup Keep frozen. **Today Home not started.**

---

## 1. Previous vs New

| | Previous | New |
|---|---|---|
| Metaphor | Long Amy Coach questionnaire | Scene 2 film — “Amy is understanding my child” |
| Questions | ~12–18 taps | Arrival + confirm/infer path (~4–7 taps) |
| Proof | Weak acknowledgements | **Live NRT preview** after every important answer |
| Visual | Purple SaaS chat | Sanctuary gold-ivory (Welcome/Signup language) |
| Place | GPS modal early | IP inference; ask only if needed |
| Cuisine/diet/allergies/role/work | Asked day-0 | Deferred (defaults) — Question Tax |
| Goals | Multi optional | One optional focus or skip |
| Exit | Theater then trial/routines | **Earned NRT named** before continue |

---

## 2. Production safety report

| System | Status |
|---|---|
| Auth | Untouched |
| Finish transaction | `runOnboardingFinishTransaction` reused |
| Child / parent APIs | Same payloads (`isOnboarding: true`) |
| Routing | Still `/onboarding` gates |
| Feature flags | New kill switch; others preserved |
| RevenueCat / trial routing | Same `shouldRouteToPostOnboardingFreeTrial` |
| Firebase growth milestone | Still `signup_completed` → `sign_up` |
| Existing completed users | Unchanged — skip gate intact |
| Rollback | `VITE_FF_CHILD_DISCOVERY_FILM=0` |

---

## 3. Database impact report

| Change | Verdict |
|---|---|
| New tables | **None** |
| New columns | **None** |
| Migrations | **None** |
| Reused | `children`, `parent_profiles`, `onboarding_profiles`, prefs |

---

## 4. Analytics impact

| Concern | Approach |
|---|---|
| Funnel events | Preserved names (`onboarding_started`, `step_viewed/completed/skipped`, `finish_*`, `onboarding_completed`) |
| Step ids | Mapped via `beatToAnalyticsStep` to canonical steps |
| Additive props | `discovery_film: true`, `discovery_beat`, `inferred_safely`, `nrt_preview_shown` |
| Startup / growth | Unchanged |

---

## 5. Conversion improvement estimate

| Lever | Expected effect |
|---|---|
| Question tax cut (~60% fewer taps) | Higher completion % |
| Continuity confirm-first | Lower drop after Signup Keep |
| Live NRT proof | Higher trust → finish click |
| NRT before trial | Better trial intent quality |

**Estimate (directional, not a promise):** +15–35% relative lift on onboarding completion for FE-sourced users; validate with `discovery_film` funnel segment.

---

## 6. Apple Craft Review

| Check | Notes |
|---|---|
| Sanctuary materials | Gold-ivory, no neon portal |
| One question / screen | Enforced by beat machine |
| No wizard chrome | No “Step 3 of 12” |
| Photography | Continuity film language; full photo rooms can deepen later |
| Verdict | **PASS with debt** — craft solid; deeper FE photography rooms remain debt |

---

## 7. Parent Review

| Check | Notes |
|---|---|
| Feels like understanding | Arrival + live NRT |
| Never profiled medically | No autism/ADHD/diagnosis |
| Smarter after answers | Adaptation notes + NRT title change |
| Verdict | **PASS** |

---

## 8. Engineering Review

| Check | Notes |
|---|---|
| Build / typecheck / unit tests | Required gate |
| No duplicate finish logic rewrite | Shared transaction |
| Hooks-safe page split | Film branch before legacy hooks |
| Verdict | **PASS** if CI green |

---

## 9. Founder Review

| Check | Notes |
|---|---|
| Mission | Earn right to recommend today |
| Five absolute rules | Implemented |
| Frozen surfaces untouched | Yes |
| STOP before Today | Yes |
| Verdict | Awaiting Founder |

---

## 10. Remaining debt

1. Deeper Welcome photography rooms per Discovery beat (not just sanctuary shell)  
2. Resume mid-film server-side (client session for legacy only today)  
3. Allergy ask at first nutrition surface (explicit handoff)  
4. Device certification of focus order / a11y on film controls  
5. Offline finish parity messaging polish  
6. Unify short-branch experiment under Discovery inference permanently  

---

## Six Reviews scorecard (self)

| Review | Self |
|---|---|
| Founder | Awaiting |
| Parent | PASS |
| Apple Craft | PASS w/ debt |
| Engineering | PASS (pending CI) |
| Database | PASS |
| Growth | PASS (directional; measure in prod) |

**COMPLETE only when Founder marks all six PASS.**
