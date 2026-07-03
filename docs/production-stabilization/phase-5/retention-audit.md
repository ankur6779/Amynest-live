# Retention Audit — Phase 5

**Data source:** `analytics_events` via `retentionService.ts` + Phase 0 production audit

## Executive summary

D1 and D7 retention are far below program targets. Return behavior is concentrated in a small activated cohort (routine + streak users). False streak resets on the dashboard likely discouraged morning re-opens.

**Retention Score (baseline): 28 / 100**

## Cohort retention (production baseline)

| Metric | Value | Target | Gap |
|--------|------:|-------:|----:|
| D1 retention | **7.0%** | >25% | −18 pp |
| D7 retention | **2.8%** | >15% | −12.2 pp |
| MAU | 148 | — | — |
| DAU | 27 | — | ~18% DAU/MAU |

**Query:** `GET /api/admin/analytics/retention?days=30` (admin only)

## Returning user behavior

| Signal | Users | Interpretation |
|--------|------:|----------------|
| `app_open` | 140 | Install / register base |
| `streak_updated` | 111 | Engagement engine fires for most actives |
| `routine_generated` | 13 | Small core loop cohort |
| `session_end` | *Phase 1+* | Enables session length analysis post-deploy |

### Return experience gaps (pre-Phase-5)

- No persisted "resume routine" state across sessions
- Dashboard showed **0 streak** before today's plan existed (even after yesterday's routine)
- Context reset: no banner for in-progress routine items

## Streak logic review

| System | Location | Issue | Fix |
|--------|----------|-------|-----|
| Dashboard routine streak | `dashboard.tsx` | Required routine **today** to count | **Fixed:** `computeRoutineStreak` same-day grace |
| Engagement streak | `retention-engine.ts` | Calendar-day via `lastActive` | Correct — unchanged |
| Game unlock streak | `routine-streak-cache.ts` | Cached from dashboard | Benefits from dashboard fix |

### False reset scenario (fixed)

Parent completes routine Monday. Opens app Tuesday 8am before generating Tuesday plan. **Before:** streak = 0. **After:** streak = 1 (counts Monday).

## Notifications (audit only)

| Metric | Value | Source |
|--------|------:|--------|
| Notification CTR | **0.28%** | `notification_log` (Phase 0) |

**Phase 5 scope:** No notification spam added. Recommendations:

- Deep-link to resume routine (`/routines/:id`) when incomplete items exist
- D1 nudge only if zero `routine_generated` (server-side segment)
- Respect `notification-prefs.ts` caps

## Habit formation

- Seven Day Journey card active on dashboard
- `recordEngagementDay` on key actions (unchanged)
- Review triggers at streak 7 (unchanged)

## Trial & premium (retention lens)

- 2 paid ACTIVE (RevenueCat) vs 148 MAU — monetization not driving retention yet
- Paywall shown too early for generators — addressed via activation gate

## Top remaining retention drop-off

**D1 return after first session without routine success** — users who register but never generate have no habit hook.

## Post-deploy metrics to watch

1. D1/D7 via `computeRetention` — 14-day rolling
2. `activation_resume` navigation events
3. Dashboard streak distribution (inferred from `streak_updated` with `source: dashboard`)
4. `session_end` duration for activated vs non-activated cohorts
