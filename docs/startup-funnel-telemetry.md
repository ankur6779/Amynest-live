# Startup Funnel Telemetry — Production Diagnostics

This document describes the **startup funnel telemetry system** added to prove where users drop between install and signup. It does **not** change business logic or UI.

## Architecture

```
index.html (launch ts, early stub)
    ↓
Android MainActivity (webview_*, device info bridge)
    ↓
startup-funnel/tracker.ts (milestone + failure events)
    ↓
localStorage offline queue
    ↓
POST /api/startup-funnel-events (public, pre-auth)
    ↓
startup_funnel_events (PostgreSQL, append-only)
    ↓
GET /api/admin/startup-funnel-dashboard (admin)
```

**Separate from** the in-memory `/api/startup-events` beacon (retained for boot debugging).

## Deploy Steps

1. Apply migration:
   ```bash
   DATABASE_URL=postgresql://amynest:amynest@localhost:5432/amynest_dev pnpm db:push
   ```
2. Deploy API + web bundle together.
3. Verify ingest:
   ```bash
   curl -X POST https://www.amynest.in/api/startup-funnel-events \
     -H 'Content-Type: application/json' \
     -d '{"events":[{"event_name":"app_open","session_id":"test-session-1","install_id":"test-install-1","device_id":"test-device-1","platform":"android","elapsed_ms":100}]}'
   ```
4. Admin dashboard (requires `ADMIN_USER_IDS`):
   ```
   GET /api/admin/startup-funnel-dashboard?days=7
   ```

## Event Inventory (Code-Verified)

| Event | Fires? | Location |
|-------|--------|----------|
| `app_install_first_open` | ✅ | `startup-funnel/tracker.ts` (once per install) |
| `app_open` | ✅ | `startup-funnel/tracker.ts` |
| `native_splash_started` | ✅ | `index.html` early stub |
| `native_splash_finished` | ✅ | `main.tsx` splash dismissal |
| `webview_created` | ✅ | `android/.../MainActivity.kt` |
| `webview_page_started` | ✅ | `MainActivity.kt` onPageStarted |
| `webview_page_finished` | ✅ | `MainActivity.kt` onPageFinished |
| `react_bundle_started` | ✅ | `boot-phase.ts` |
| `react_bundle_loaded` | ✅ | `main.tsx` |
| `react_first_render` | ✅ | `main.tsx` |
| `firebase_init_started` | ✅ | `production-app-shell.tsx` |
| `firebase_init_finished` | ✅ | `production-app-shell.tsx` |
| `auth_started` | ✅ | `firebase-auth-listener.ts` |
| `auth_finished` | ✅ | `firebase-auth-listener.ts` |
| `version_check_started` | ✅ | `App.tsx` |
| `version_check_finished` | ✅ | `App.tsx` |
| `appcore_started` | ✅ | `App.tsx` |
| `appcore_loaded` | ✅ | `AppCore.tsx` AppCoreMountMarker |
| `router_ready` | ✅ | `app-init-gate.tsx` |
| `login_screen_visible` | ✅ | `startup-funnel-screen-tracker.tsx` |
| `signup_screen_visible` | ✅ | `startup-funnel-screen-tracker.tsx` |
| `signup_started` | ✅ | `startup-funnel-screen-tracker.tsx` (/sign-up) |
| `account_created` | ✅ | `sign-up.tsx` (email), `oauth-session-finalize.ts` (OAuth) |
| `home_visible` | ✅ | `AppCore.tsx` HomeRedirect useEffect |
| `onboarding_complete` | ✅ | `onboarding.tsx` |
| `routine_generated` | ✅ | `routines/generate.tsx` |

### Failure Events

| Event | Fires? | Location |
|-------|--------|----------|
| `startup_timeout` | ✅ | `AppCoreLoader.tsx`, `startup-watchdog-gate.tsx` |
| `firebase_failed` | ✅ | `production-app-shell.tsx` |
| `auth_timeout` | ✅ | `firebase-auth-listener.ts` |
| `auth_failed` | ✅ | `firebase-auth-listener.ts` |
| `chunk_load_failed` | ✅ | `AppCoreLoader.tsx` |
| `webview_error` | ✅ | `MainActivity.kt` onReceivedError |
| `dns_failure` | ✅ | `MainActivity.kt` (host lookup errors) |
| `offline_launch` | ✅ | `index.html` if `navigator.onLine === false` |
| `cache_recovery` | ✅ | `index.html` pre-bundle recovery |
| `reload_triggered` | ✅ | `index.html` pre-bundle recovery |
| `permission_denied` | ✅ | `MainActivity.kt` (notifications denied) |
| `blank_screen_detected` | ✅ | `startup-watchdog-gate.tsx` |
| `javascript_exception` | ✅ | `global-error-handlers.ts` |

### NOT YET VERIFIED (requires deploy + traffic)

| Event | Status | Notes |
|-------|--------|-------|
| `api_timeout` | ❌ Not wired | Add when specific API timeout handlers are identified |
| `network_lost` | ❌ Not wired | Add via `offline` event listener |
| `white_screen_detected` | ❌ Not wired | Distinct from blank_screen — needs visual probe |
| `react_render_failed` | ✅ | `main.tsx` bootstrap catch |
| `carrier` | ⚠️ Partial | Field exists; not populated on web (native bridge can extend) |
| `play_store_version` | ⚠️ Partial | Field exists; requires Play Store API / referrer bridge |
| `battery_saver` | ⚠️ Partial | Field exists; native PowerManager bridge not added |
| Phone OTP funnel events | N/A | Phone OTP disabled (`ENABLE_PHONE_OTP=false`) |

## SQL Queries

### 1. Startup Funnel (drop % between steps)

```sql
WITH installs AS (
  SELECT DISTINCT install_id
  FROM startup_funnel_events
  WHERE server_ts >= NOW() - INTERVAL '7 days'
),
steps AS (
  SELECT unnest(ARRAY[
    'app_install_first_open',
    'app_open',
    'webview_page_finished',
    'react_first_render',
    'firebase_init_finished',
    'login_screen_visible',
    'signup_started',
    'account_created',
    'onboarding_complete',
    'routine_generated'
  ]) AS step
),
reach AS (
  SELECT s.step,
         COUNT(DISTINCT e.install_id) AS devices
  FROM steps s
  LEFT JOIN startup_funnel_events e
    ON e.event_name = s.step
   AND e.server_ts >= NOW() - INTERVAL '7 days'
  GROUP BY s.step
)
SELECT step,
       devices,
       ROUND(100.0 * devices / NULLIF((SELECT COUNT(*) FROM installs), 0), 1) AS pct_of_installs
FROM reach
ORDER BY array_position(ARRAY[
  'app_install_first_open','app_open','webview_page_finished','react_first_render',
  'firebase_init_finished','login_screen_visible','signup_started','account_created',
  'onboarding_complete','routine_generated'], step);
```

### 2. Device Breakdown (failures by manufacturer)

```sql
SELECT COALESCE(manufacturer, 'unknown') AS manufacturer,
       COALESCE(android_version, 'unknown') AS android_version,
       event_name,
       COUNT(*) AS events,
       COUNT(DISTINCT device_id) AS devices
FROM startup_funnel_events
WHERE event_type = 'failure'
  AND server_ts >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY events DESC
LIMIT 50;
```

### 3. Failure Breakdown

```sql
SELECT event_name,
       COUNT(*) AS total,
       COUNT(DISTINCT install_id) AS installs_affected,
       ROUND(AVG(elapsed_ms)) AS avg_elapsed_ms
FROM startup_funnel_events
WHERE event_type = 'failure'
  AND server_ts >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY installs_affected DESC;
```

### 4. Startup Duration Percentiles (time to login)

```sql
SELECT
  percentile_cont(0.50) WITHIN GROUP (ORDER BY elapsed_ms) AS p50_ms,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY elapsed_ms) AS p75_ms,
  percentile_cont(0.90) WITHIN GROUP (ORDER BY elapsed_ms) AS p90_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY elapsed_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY elapsed_ms) AS p99_ms
FROM startup_funnel_events
WHERE event_name = 'login_screen_visible'
  AND elapsed_ms IS NOT NULL
  AND server_ts >= NOW() - INTERVAL '7 days';
```

### 5. Signup Conversion by Country

```sql
WITH installs AS (
  SELECT DISTINCT install_id FROM startup_funnel_events
  WHERE event_name = 'app_install_first_open'
    AND server_ts >= NOW() - INTERVAL '30 days'
),
converted AS (
  SELECT DISTINCT install_id, country FROM startup_funnel_events
  WHERE event_name = 'account_created'
    AND server_ts >= NOW() - INTERVAL '30 days'
)
SELECT COALESCE(e.country, 'unknown') AS country,
       COUNT(DISTINCT i.install_id) AS installs,
       COUNT(DISTINCT c.install_id) AS signups,
       ROUND(100.0 * COUNT(DISTINCT c.install_id) / NULLIF(COUNT(DISTINCT i.install_id), 0), 1) AS signup_pct
FROM installs i
JOIN startup_funnel_events e ON e.install_id = i.install_id
LEFT JOIN converted c ON c.install_id = i.install_id AND c.country = e.country
WHERE e.server_ts >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY installs DESC;
```

### 6. Blank Screen / Timeout Rates (daily)

```sql
SELECT DATE(server_ts) AS day,
       COUNT(DISTINCT install_id) FILTER (WHERE event_name = 'app_install_first_open') AS installs,
       COUNT(DISTINCT install_id) FILTER (WHERE event_name = 'blank_screen_detected') AS blank_screen,
       COUNT(DISTINCT install_id) FILTER (WHERE event_name = 'startup_timeout') AS timeout,
       COUNT(DISTINCT install_id) FILTER (WHERE event_name = 'offline_launch') AS offline
FROM startup_funnel_events
WHERE server_ts >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### 7. Top 20 Slowest Devices (p95 to login)

```sql
SELECT manufacturer, device_model,
       COUNT(*) AS samples,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY elapsed_ms)::int AS p95_login_ms
FROM startup_funnel_events
WHERE event_name = 'login_screen_visible'
  AND elapsed_ms IS NOT NULL
  AND server_ts >= NOW() - INTERVAL '7 days'
GROUP BY manufacturer, device_model
HAVING COUNT(*) >= 3
ORDER BY p95_login_ms DESC
LIMIT 20;
```

### 8. Top 20 Failed Devices

```sql
SELECT manufacturer, device_model,
       COUNT(*) AS failure_events,
       COUNT(DISTINCT device_id) AS devices
FROM startup_funnel_events
WHERE event_type = 'failure'
  AND server_ts >= NOW() - INTERVAL '7 days'
GROUP BY manufacturer, device_model
ORDER BY failure_events DESC
LIMIT 20;
```

## Dashboard Metrics (API)

`GET /api/admin/startup-funnel-dashboard?days=7` returns:

- `startupSuccessRate`, `startupFailureRate`, `blankScreenRate`, `timeoutRate`
- `loginReachRate`, `signupReachRate`, `signupConversionRate`, `accountCreationRate`
- `durations.*` p50/p75/p90/p95/p99 for cold start, react, login, appcore, firebase, auth
- `funnel[]` step-by-step device counts + drop %
- `topFailureEvents`, `topSlowDevices`, `topFailedDevices`

## Measurement Accuracy Notes

| Concern | Status |
|---------|--------|
| Events before AppCore mount | ✅ Fixed — early `index.html` stub + queue drain |
| `device_id` on all events | ✅ Via `getOrCreateDeviceId()` |
| Native WebView timing | ✅ `MainActivity` injects page_started/finished |
| Offline event delivery | ✅ localStorage queue + online flush |
| Milestone deduplication | ✅ Once per session per milestone |
| Failure re-emission | ✅ Failures not deduped |
| Production evidence | **NOT VERIFIED** until deploy + 7 days traffic |

## Recommended Dashboards

1. **Startup Health** — daily success/failure/timeout/blank screen rates
2. **Funnel Drop** — waterfall from install → account_created
3. **Device Heatmap** — failures by manufacturer × Android version
4. **Latency SLIs** — p50/p95 time-to-login, time-to-appcore
5. **Network Slice** — conversion by `network_type`

## Production Monitoring Strategy

1. **Week 1:** Deploy telemetry only; validate event volumes match install count ±10%
2. **Week 2:** Set alerts on `startupFailureRate > 15%`, `loginReachRate < 70%`
3. **Week 3:** Segment by top 5 manufacturers; compare to baseline
4. **Week 4:** Only then prioritize P0 fixes backed by funnel data

**Do not optimize startup until Week 1–2 data confirms bottlenecks.**
