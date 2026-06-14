# Device Limit — Production Certification

**Date:** 2026-06-14 (hardening pass)  
**Status:** CERTIFIED (static + unit tests) — strict mode **NOT** enabled  
**Limits unchanged:** Free = 1 · Premium = 3 · Family = 6

## Executive summary

The device limit system has been hardened for production rollout with metadata enrichment, abuse analytics, transactional registration, demo-account bypass, admin metrics, and strict-mode readiness assessment. **`DEVICE_LIMIT_STRICT` remains off** until live telemetry confirms ≥ 95% registration success.

| Area | Result |
|------|--------|
| Plan limits unchanged | PASS |
| Existing subscriptions unaffected | PASS |
| Backend enforcement | PASS |
| Grandfathering | PASS |
| Demo bypass (`demo@amynest.in`) | PASS |
| Race-condition guard (advisory lock) | PASS |
| Metadata capture | PASS |
| Bypass analytics | PASS |
| Admin metrics API | PASS |
| Strict mode auto-enable | **NOT DONE** (by design) |

---

## 1. Free plan device limit

| Test | Expected | Result |
|------|----------|--------|
| `resolveDevicesMax(false)` | 1 | PASS |
| New device when 1 active | 402 `device_limit_reached` | PASS (service logic) |
| Replace on free at limit | Swap allowed | PASS |

## 2. Premium plan device limit

| Test | Expected | Result |
|------|----------|--------|
| `resolveDevicesMax(true)` | 3 | PASS |
| 4th new device registration | Blocked + bypass event | PASS |
| UI copy | Device Limit Reached dialog | PASS |

## 3. Grandfathering

| Scenario | Expected | Result |
|----------|----------|--------|
| User with 5 active devices, limit 3 | Existing 5 keep working | PASS |
| 6th new device | Blocked | PASS |
| Replace on grandfathered account | 1:1 swap allowed | PASS |

## 4. Device replacement flow

| Step | Result |
|------|--------|
| `POST /devices/replace` initiates bypass telemetry | PASS |
| Transaction removes old + registers new | PASS |
| No post-swap limit re-check (swap semantics) | PASS |

## 5. Concurrent registration

| Test | Mechanism | Result |
|------|-----------|--------|
| Parallel register attempts | `pg_advisory_xact_lock` per user | PASS (source + design) |
| `canAddNewDevice` pure logic | Unit tested | PASS |

## 6. Missing header scenarios

| Mode | Missing `X-AmyNest-Device-Id` | Result |
|------|------------------------------|--------|
| Default (`DEVICE_LIMIT_STRICT` unset) | Request allowed + `device_header_missing` logged | PASS |
| Strict (`DEVICE_LIMIT_STRICT=1`) | 403 `device_id_required` | PASS (code path) |

## 7. Strict mode behavior

| Check | Result |
|-------|--------|
| Auto-enable strict | **NOT implemented** | PASS |
| Readiness endpoint | `GET /api/admin/analytics/device-strict-readiness` | PASS |
| Readiness report | `audit/device-limit-strict-readiness.md` | PASS |

## 8. Security review

| Control | Status |
|---------|--------|
| Middleware on all authed routes (exempt list only) | PASS |
| Frontend-only bypass insufficient | PASS |
| IP stored as hash only (`lastIpHash`) | PASS |
| Demo account middleware bypass | PASS |
| Device deletion decrements active count | PASS |
| Replace respects swap semantics | PASS |

## 9. Metadata & UI

| Field | Stored | Displayed |
|-------|--------|-----------|
| browser | ✅ | ✅ (`Chrome on Windows`) |
| os | ✅ | ✅ |
| platform | ✅ | ✅ |
| appVersion | ✅ | — (analytics only) |
| lastIpHash | ✅ (hashed) | — |
| isCurrentDevice | computed | ✅ `✓ Current Device` |

## 10. Analytics & monitoring

### Events tracked

- `device_registered`
- `device_removed`
- `device_replaced`
- `device_limit_reached`
- `device_limit_bypass_attempt` (new)
- `device_header_missing` (server telemetry)

### Admin dashboard

- `GET /api/admin/analytics/device-metrics?period=day|week`
- Daily + weekly aggregation via `deviceMetricsService`

## 11. Test suite

```bash
# Unit + certification (static)
cd artifacts/api-server
node --import tsx/esm --test \
  src/services/__tests__/deviceLimitService.test.ts \
  src/services/__tests__/device-limit-concurrency.test.ts \
  src/routes/device-limit-production-cert.test.ts \
  src/routes/device-limit-integration.test.ts

# Strict readiness report
node scripts/generate-device-strict-readiness.mjs
```

## 12. Rollout recommendation

1. Deploy migration `0032_user_devices_metadata.sql`
2. Ship web/mobile bundle with extended headers
3. Monitor `/api/admin/analytics/device-metrics` for 7 days
4. Run `scripts/generate-device-strict-readiness.mjs` with production `DATABASE_URL`
5. Enable `DEVICE_LIMIT_STRICT=1` **only when readiness report recommends ENABLE**

---

**Certification:** APPROVED for staged production deployment. Strict enforcement remains **DELAY** until live metrics confirm readiness.
