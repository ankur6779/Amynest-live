# Growth Observatory — Production Intelligence Layer

Permanent executive intelligence on top of `analytics_events`, subscriptions, and startup funnel telemetry. **Measurement only** — no product flow changes.

## Architecture

```
analytics_events (Postgres)
startup_funnel_events
subscriptions / user_devices
        │
        ▼
growth-dashboard/          ← existing KPI engine (60s in-memory cache)
        │
        ▼
growth-observatory/        ← executive layer (funnel intel, experiments, alerts, brief)
        │
        ├── GET /api/admin/growth/observatory
        ├── GET /api/admin/growth/daily-brief
        └── GET /api/admin/growth/gos/observatory  (GOS section wrapper)
        │
        ▼
/admin/growth/observatory  (kidschedule admin UI)
```

### Modules (`artifacts/api-server/src/services/growth-observatory/`)

| Module | Responsibility |
|--------|----------------|
| `index.ts` | Orchestrates payload; 60s cache via `growth-dashboard/cache.ts` |
| `funnel-intelligence.ts` | Install → purchase funnel + activation % + 90-day MA7/MA30 series |
| `experiment-intelligence.ts` | `experiment_variant` A/B + first-value CTA source comparison |
| `cohort-intelligence.ts` | Country + platform cohort retention/conversion |
| `alerts.ts` | Rule-based alerts (≥10% change, ≥15 users) |
| `opportunities.ts` | Top-5 growth/revenue/retention/technical opportunities |
| `daily-brief.ts` | One-page executive summary |
| `predictions.ts` | Momentum forecasts with CI; `NOT ENOUGH DATA` if &lt;14 days |
| `product-health.ts` | Crash + startup funnel + API latency |

## API Endpoints

Admin-only (`ADMIN_USER_IDS` / `ADMIN_GROWTH_EMAILS`).

### `GET /api/admin/growth/observatory`

Query: `preset` (`last_7_days`, `last_30_days`, `custom`), optional `start`, `end`.

Returns full `GrowthObservatoryPayload`: KPIs, funnel, experiments, cohorts, alerts, opportunities, predictions, historical trends, `dataGaps`.

### `GET /api/admin/growth/daily-brief`

Same query params. Returns `{ ok: true, brief: DailyExecutiveBrief }`.

### `GET /api/admin/growth/gos/observatory`

GOS envelope: `{ observatory, brief }` inside `data`.

## SQL — Core Funnel (live queries)

Distinct users per stage in selected window + previous / 1d / 7d / 30d baselines:

```sql
SELECT count(DISTINCT user_id) FILTER (WHERE server_ts BETWEEN :start AND :end)
FROM analytics_events
WHERE event_name = 'device_registered'
  AND user_id NOT LIKE 'anon:%';
```

| Stage | Event condition |
|-------|-----------------|
| Install | `device_registered` |
| Login | `login_completed` OR authenticated `session_start` |
| Onboarding | `onboarding_completed` |
| Dashboard | `dashboard_view` OR `screen_view` `/dashboard` |
| Routine CTA | `routine_cta_clicked` |
| Routine generated | `routine_generated` OR `routine_generation_completed` |
| First value | `first_value_achieved` |
| Second session | `session_start` (2+ sessions) |
| Trial | `subscription_funnel_event` step `trial_started` |
| Purchase | `upgrade_completed` OR purchase_success |

Activation rates: stage users ÷ dashboard users (dashboard reach % uses signup denominator).

## Materialized View

`lib/db/migrations/0048_growth_observatory_daily_agg.sql`:

- Pre-aggregates `day × event_name × platform` for 400-day window
- Speeds historical MA7/MA30 and cron refreshes

Refresh (daily cron or post-backfill):

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY growth_observatory_daily_agg;
```

## Caching

| Layer | TTL | Key |
|-------|-----|-----|
| Growth dashboard | 60s | `growth-dashboard:{start}\|{end}` |
| Observatory | 60s | `growth-observatory:{start}\|{end}` |
| GOS sections | 60s | `gos:{section}:…` |

## Alert Rules

Triggered only when **|change| ≥ 10%** and **affected users ≥ 15**:

- Signup volume (7d baseline)
- Routine completion (7d)
- D1 retention &lt; 5%
- Trial starts vs prior period
- Crash-free rate decline
- Startup failure spike
- Purchase failure rate increase
- Blank screen / auth failure (startup funnel)

## NOT VERIFIED Gaps

Explicitly surfaced in `dataGaps` and metric `note` fields:

- Cost per install / organic vs paid (no ad spend API)
- Meta Ads / Google Ads cohorts (no UTM attribution)
- Parent role / child age cohorts (props not consistently populated)
- First-value funnel (awaiting `first_value_*` traffic post-deploy)
- Routine failure % (needs `routine_generation_failed` volume)
- Predictions with &lt;14 days history → `NOT ENOUGH DATA`

## Rollback Strategy

1. **UI**: Remove `observatory` from `GOS_NAV` — no user-facing app impact.
2. **API**: Observatory routes are additive; disable by not linking in admin.
3. **DB**: `DROP MATERIALIZED VIEW growth_observatory_daily_agg` — optional; live SQL still works.
4. **Cache**: Restart API process clears in-memory cache.

## Admin Access

`/admin/growth/observatory` in kidschedule. Same auth as Growth OS.
