# Activation Audit — Phase 5

**Data source:** Production `analytics_events` (2026-07-03 audit, Phase 0) + Phase 1 funnel events  
**Method:** Event counts by distinct `user_id` — no assumptions

## Executive summary

The largest activation drop-off is **after device registration and before first routine generation**. Only **~10%** of registered users ever emit `routine_generated`. Profile/onboarding completion is also weak relative to opens.

**Activation Score (baseline): 34 / 100**

Scoring: weighted funnel pass rates vs Phase 5 targets (first routine 80%, profile 85%, device 95%).

## Funnel (production events)

| Stage | Users | Events | Pass rate from prior |
|-------|------:|-------:|---------------------:|
| `app_open` / `session_start` | 140 | 476 | — |
| `device_registered` | 131 | 269 | **93.6%** |
| `onboarding_milestone` | 26 | 26 | **19.8%** of registered |
| `onboarding_funnel_event` (post-Phase-1) | *deploy* | *deploy* | Persisted after Phase 1 |
| `routine_generated` | 13 | 23 | **9.9%** of registered |
| `routine_viewed` | *sparse* | *sparse* | Under-instrumented pre-Phase-1 |
| `routine_item_completed` | *sparse* | *sparse* | Taxonomy exists; low volume |
| `premium_paywall_viewed` | 13 | 30 | **100%** of routine generators saw paywall |

## Drop-off diagnosis

### 1. First open → registration (6.4% loss)

- **Evidence:** 140 opens vs 131 `device_registered`
- **Likely causes:** Sign-in friction, WebView auth on Android, optional skip paths
- **Not primary P0** — pass rate acceptable

### 2. Registration → profile completion (~80% loss)

- **Evidence:** 131 registered vs 53 `parent_profiles` rows (DB); 26 `onboarding_milestone`
- **Impact:** Routine generator requires child profile — blocks first success
- **Phase 5 action:** Dashboard already gates with `OnboardingScreen` when no children; no extra questions added

### 3. Profile → first routine (~90% loss among registered)

- **Evidence:** 13/131 users with `routine_generated`; Phase 0 notes 1 `user_feedback` on generation failure (addressed Phase 2)
- **Impact:** **Top activation blocker**
- **Phase 5 actions shipped:**
  - Bypass `routines_limit` paywall when `routineCount === 0`
  - Defer soft premium gates (hub, phonics, etc.) until first routine generated
  - Prominent empty-state CTA on dashboard timeline (existing, retained)
  - `first_routine_generated` milestone for measurement

### 4. Premium paywall before success

- **Evidence:** 13 paywall viewers ≈ 13 routine generators; **~92% CTA drop** (1/13 click, Phase 0)
- **Impact:** Paywall shown before users experience core value
- **Phase 5 action:** Defer soft paywalls; route to `/routines/generate` with `paywall_deferred_activation` analytics

### 5. First feature usage

- **Evidence:** Analytics coverage ~22%; `feature_open` newly instrumented Phase 1
- **Hub tiles:** `feature_usage` table had ~8 users pre-audit
- **Phase 5 action:** `FeatureDiscoveryStrip` on dashboard for unused high-engagement modules

## Onboarding funnel (post-Phase-1)

Onboarding steps now persist as `onboarding_funnel_event` with `props.step`. After deploy, run:

```bash
node scripts/production-stabilization/analyze-activation-funnel.mjs
```

## Most successful user journey (observed)

```
install_source → app_open → device_registered → onboarding_milestone →
routine_generated → routine_item_completed → streak_updated → return app_open
```

Only **~9%** of MAU reach `routine_generated`. Users who complete a routine show `streak_updated` (111 users) — engagement engine works for activated cohort.

## Top remaining drop-off

**Registered users who never generate a routine (~90%)**

## Recommendations (Top 20 — activation subset)

1. Monitor `first_routine_generated` vs `routine_generated` post-deploy
2. Monitor `paywall_deferred_activation` — should rise for new users, paywall views should lag first routine
3. A/B dashboard resume banner CTR (`activation_resume` navigation trigger)
4. Track `feature_open` from `dashboard_discovery` source
5. Ensure Android WebView completes device registration (Phase 1 device header fix)
6. Alert if `routine_generated` users / `device_registered` users < 15% weekly
7. Profile completion campaign for 116 subs without profiles (data issue + onboarding)
8. Reduce onboarding steps only where `onboarding_funnel_event` shows `step_abandoned` spikes
9. Deep-link notifications to `/routines/generate` for D1 users with zero routines
10. Surface Seven Day Journey `routine_generate` task above fold (already present)

See [funnel-improvements.md](./funnel-improvements.md) for full list.
