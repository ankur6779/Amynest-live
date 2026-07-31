# Amy Learning Platform — Telemetry

**Goal:** make every production learning-stack issue explainable within minutes.  
**Constraint:** zero user-visible product UI. Collectors are silent; the dashboard is DEV-only.

## Package

`@workspace/learning-telemetry` — pure collector, health score, alert evaluation, report formatting.

## What is collected

### Runtime
- Decision latency (last / max / p95)
- Rule evaluation counts, matches, failures, cooldown hits
- Recommendation offered / accepted / ignored
- Review queue size (last + max)
- Knowledge updates
- Attention transitions
- Per-rule latency rollups (top slow rules)

### Event bus
- Publish latency
- Queue depth (last + max)
- Offline duration
- Replay count
- Duplicate prevention count
- Flush duration

### Knowledge graph
- Node / edge counts
- Snapshot size (bytes)
- Repair count + reason
- Migration duration
- Storage growth

### Performance
- JS heap (Chrome `performance.memory` when available)
- Device memory hint
- FPS (opt-in via `?learningTelemetry=1` / `?debug=1` to avoid always-on rAF)
- Bundle navigation load timing
- Audio latency field (host may push via `recordPerf`)

## Host wiring

`artifacts/kidschedule/src/lib/learning-telemetry-host.ts`

Installed from `GrowthBootstrap` for **all** builds (silent). Hooks:

| Surface | Mechanism |
|---------|-----------|
| Bus | `createLearningEventBus({ onTelemetry })` via mutable sink |
| Runtime | `setMetricsObserver` (detailed in DEV) |
| KG | `createKnowledgeGraphApi({ onTelemetry })` via mutable sink |

Console helpers (any build after install):

```js
window.__amynestLearningTelemetry()
window.__amynestLearningTelemetryReport()
```

## Developer dashboard

- Route: `/debug/telemetry` (redirects to `/dashboard` in production bundles)
- Query: `?learningTelemetry=1` or `?debug=1`
- localStorage: `__amynest_learning_telemetry=1`

Shows health score, warnings, trend sparks, top slow rules, largest snapshots, storage.

## Alert definitions

| Id | When |
|----|------|
| `runtime_latency_high` | Decision latency &gt; 16ms (default) |
| `queue_depth_high` | Offline queue &gt; 40 |
| `repair_spike` | ≥3 KG repairs in 60s |
| `storage_limit` | Snapshot &gt; 2.5MB |
| `snapshot_large` | Snapshot &gt; 1.5MB |
| `recommendations_repetitive` | Same rec ignored ≥5 times |
| `offline_duration_high` | Offline &gt; 30 minutes |
| `flush_slow` | Flush max &gt; 250ms |

Thresholds: `DEFAULT_ALERT_THRESHOLDS` / `collector.setThresholds(...)`.

## Overhead

- Bus / KG telemetry callbacks are no-ops when sinks are unset.
- Runtime lite observer does not force `evaluateRulesDetailed`.
- DEV enables detailed metrics (cooldown / dependency skips).
- FPS sampler is opt-in only.

## Tests

```bash
pnpm --filter @workspace/learning-telemetry test
pnpm --filter @workspace/learning-events test
pnpm --filter @workspace/learning-runtime test
```

## Production readiness

- Collectors installed at boot; no product chrome.
- Alerts + health score available via snapshot API for future log sinks.
- Dashboard never ships as a production route.
