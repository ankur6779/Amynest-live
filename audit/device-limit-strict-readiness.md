# Device Limit Strict Mode — Readiness Assessment

**Generated:** 2026-06-14T12:30:16.630Z
**Data source:** static-audit-only
**DEVICE_LIMIT_STRICT:** NOT enabled (assessment only)

## Recommendation

### ⏸ DELAY strict mode

- DATABASE_URL not set — run against production/staging DB for live coverage metrics.
- Client header audit: PASS (all six headers implemented in device-id.ts).
- DEVICE_LIMIT_STRICT remains disabled — do not enable until live registration success rate ≥ 95%.

## Client header audit

| Header | Shipped |
|--------|---------|
| X-AmyNest-Device-Id | ✅ |
| X-AmyNest-Platform | ✅ |
| X-AmyNest-Device-Name | ✅ |
| X-AmyNest-Browser | ✅ |
| X-AmyNest-OS | ✅ |
| X-AmyNest-App-Version | ✅ |

## Live metrics

Run with `DATABASE_URL` set to populate registration coverage and missing-header percentages.

## Certification thresholds

| Check | Threshold |
|-------|-----------|
| Registration success rate | ≥ 95% |
| Missing header rate | ≤ 5% |
| Auth failure regression | No increase vs baseline |

## API compatibility

- Device routes exempt from `requireRegisteredDevice` middleware
- Legacy clients without headers: allowed until `DEVICE_LIMIT_STRICT=1`
- `demo@amynest.in`: unlimited devices + middleware bypass

**Do not set `DEVICE_LIMIT_STRICT=1` until recommendation is ENABLE.**
