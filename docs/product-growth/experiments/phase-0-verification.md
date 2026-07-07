# Phase 0 Verification — Growth Experiments

**Date:** 2026-07-07  
**Status:** PASSED

## Flag inventory

| Env var | Code export | Module | Default |
|---------|-------------|--------|---------|
| `VITE_FF_VALUE_BRIDGE_INVITES` | `FF_VALUE_BRIDGE_INVITES` | `subscription-feature-flags.ts` | `false` |
| `VITE_FF_DASHBOARD_PRIORITY_ORDER` | `FF_DASHBOARD_PRIORITY_ORDER` | `dashboard-feature-flags.ts` | `false` |

## Isolation matrix

| Consumer | Value Bridge flag | Dashboard flag |
|----------|-------------------|----------------|
| `value-bridge.ts` | ✅ reads | ❌ no import |
| `subscription-value-bridge-banner.tsx` | ✅ reads | ❌ no import |
| `dashboard.tsx` | ❌ no import | ✅ reads |
| `dashboard-priority.ts` | ❌ no import (name-only in rank map) | ✅ used by dashboard |

**No shared logic.** `dashboard-priority.ts` references `"value_bridge"` only as a widget label in `widgetPriorityRank()` — not coupled to `FF_VALUE_BRIDGE_INVITES`.

## Verification command

```bash
node scripts/growth-experiments/verify-experiment-flags.mjs
# Phase 0 PASSED — flags exist, default false, isolated.
```

## Tests

```bash
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/value-bridge.test.ts \
  src/lib/value-bridge-analytics.test.ts \
  src/lib/dashboard-priority.test.ts
# 11/11 passed
```
