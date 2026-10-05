# Analytics spine production verification — 5 Oct 2026

**Gate status:** `PRODUCTION VERIFICATION BLOCKED — EVIDENCE INSUFFICIENT`

```
ADS CAMPAIGN 23986249354: PAUSED
ADS GEO / BUDGET / BIDDING: UNCHANGED
PRODUCTION ANDROID ROLLOUT: NO
WEB/API PRODUCTION DEPLOY: NO
HISTORICAL BACKFILL: NONE
```

This is not a source-code “pass.” The required fresh-install sequence was not executed on a device, and production still serves the pre-fix Web/API.

---

## 1. Ads

Re-checked via Ads API (`customer 6395859996`, `status_filter=PAUSED`):

| Field | Value |
|---|---|
| Campaign | `23986249354` |
| Name | App promotion-Android (purchases · metros) |
| Status | **PAUSED** |
| Budget | ₹400 |
| Timestamp | 5 Oct 2026 ~10:36 IST |

No Ads mutation was performed.

---

## 2. Deployed vs repo

| Plane | Live now | Repo (uncommitted) | Schema migration? |
|---|---|---|---|
| Play production APK/AAB | **1.4.63 / 106** (last store artifact in `android/releases` before this work) | Native spine `1.4.65 / 108` AAB on disk | None |
| Cloudflare Pages SPA | `assets/analytics-service-QCLKmxf8.js` | ACK + unsigned flush + native device id | None |
| Coolify API | `/api/analytics/preauth-events` exists (older allowlist) | stitch + first_open dedupe + expanded allowlist + gclid retain | **None** — `analytics_events.props` is already JSONB |

**No DB migration is required.** Do not alter Coolify Postgres.

### Live SPA proof (fetched 5 Oct 2026)

`https://www.amynest.in/assets/analytics-service-QCLKmxf8.js` contains:

```
shouldEmitFirstOpen(){ ... localStorage.setItem(v,"1"),!0 }
```

`v` = `amynest_analytics_first_open`. The live site still marks first_open **before** ACK.

It has `/api/analytics/preauth-events` fallback, but **zero** hits for `markFirstOpenDelivered`, `__AMYNEST_NATIVE_DEVICE_ID`, `gbraid`, `campaign_id`.

### Live Coolify proof (READ-ONLY, last 3 days)

| Slice | Result |
|---|---|
| Android events | 646 / 2 users, `app_version=unknown` |
| `first_open` | 1 event / 1 user, **authenticated**, `app_version=unknown` |
| `app_version=1.4.65` | **0** |
| `user_id LIKE 'device:%'` | **0** (same as Window A) |

---

## 3. Minimum Web/API deploy required (not executed)

Needed on production API (Coolify git deploy) + SPA (Cloudflare Pages via `main`):

| Change | File |
|---|---|
| Preauth allowlist (onboarding/plan/paywall/checkout/speech) | `preauthAnalyticsService.ts` |
| `device:` → Firebase uid stitch | `analyticsIdentityStitchService.ts` + `routes/analytics.ts` |
| `first_open` dedupe per `user_id` | `analyticsIngestService.ts` |
| Keep `gclid`/`gbraid`/`wbraid`/`campaign_id` | `lib/analytics-taxonomy` |
| Unsigned flush / ACK / native device id | kidschedule analytics + `device-id.ts` + `AppCore.tsx` |

**Not deployed.** Reasons:

1. These files are **uncommitted** on `main`.
2. Pages deploy is gated by full CI typecheck; Coolify deploys independently on git push — a partial/unsafe push was not done.
3. A production API/web ship without a tester device cannot complete this gate and would change live ingest for all users.

Native `1.4.65` can POST `first_open` to the **already-live** preauth route without a web deploy. That still requires a real sideload.

---

## 4. Android internal test

| Item | Evidence |
|---|---|
| AAB | `/Users/macbook/AmyNestProject/AmyNest-AI/android/releases/amynest-1.4.65-108.aab` (33 MB, 5 Oct 2026 10:28 IST) |
| Uploaded to Play | **NO** |
| `adb devices` | daemon up, **no devices attached** |
| Fresh uninstall/install | **NOT RUN** |
| Launch before login | **NOT RUN** |
| Device / build captured | **NONE** |

Play Install Referrer from a sideloaded internal AAB is **NOT TESTABLE IN INTERNAL ORGANIC INSTALL** even with a device: there is no Ads click. No fake `gclid`/`gbraid`/`wbraid` were created.

---

## 5. Production DB checks (tester device)

| Required | Result |
|---|---|
| `device:{id}` before login | **NOT OBSERVED** — no 1.4.65 rows |
| `first_open` before login | **NOT OBSERVED** |
| `app_version` = 1.4.65 | **0 rows** |
| Post-auth stitch | **NOT OBSERVED** (stitch not on live API) |
| Single first_open after login/reload | **NOT OBSERVED** |

No synthetic rows were inserted.

---

## 6. Attribution

| Path | Status |
|---|---|
| Live taxonomy keeps `gclid` on ingest | **NO** (repo only; Window A first_open rows had no `gclid` key) |
| Real Play referrer on this machine | **NOT TESTABLE IN INTERNAL ORGANIC INSTALL** |
| Fabricated click ids | **NONE** |

Ads attribution remains production-gated after a real Ads install, with the campaign still paused.

---

## 7. ACK / Firebase comparison

| System | This session |
|---|---|
| Firebase AUTO `first_open` | Not observed (no install). Separate native SDK event. |
| Internal `analytics_events.first_open` | Not observed for 1.4.65 |
| Internal before login | Not observed |
| Live JS ACK | **FAILING on production SPA** — flag set before POST |

They remain **independent** events. Not merged.

---

## 8. iOS

No iOS release.

| Layer | Status |
|---|---|
| Play Install Referrer | N/A |
| Apple Search Ads / AdServices | **NOT IMPLEMENTED** |
| Firebase Analytics pod | **NOT IMPLEMENTED** (`CoreOnly` + Messaging) |
| Equivalent native preauth first_open | **NOT IMPLEMENTED** |
| JS/API path | Same undeployed web/API as Android |

iOS is **not** production-verified.

---

## 9. Automated tests (this session)

| Suite | Result |
|---|---|
| kidschedule: attribution, ACK, device id, 401→preauth | **18 passed** |
| API: taxonomy gclid persist + preauth allowlist | **13 passed** |
| API route DB integration (`analytics.test.ts`) | **SKIPPED** (no local integration DB) |
| Emulator / physical | **NOT RUN** |

---

## 10. Success checklist

| Gate | Proven? |
|---|---|
| fresh install | NO |
| first_open before login | NO |
| `device:{id}` before login | NO |
| production API accepted tester event | NO |
| production `analytics_events` has tester event | NO |
| ACK semantics on live SPA | NO (opposite) |
| device → Firebase stitch on live API | NO (not deployed) |
| first_open dedupe on live API | NO (not deployed) |
| WebView reload keeps identity | NO device |
| attribution fields survive when supplied | unit YES; production/device NO |
| tests pass (unit) | YES |
| deployed Web/API contains fix | **NO** |
| Android 1.4.65 verified against production | **NO** |

---

## 11. Blockers

1. No Android device/emulator attached — cannot sideload `1.4.65-108`.
2. Web/API fix not on `www.amynest.in` / Coolify (uncommitted; live JS still sets first_open before ACK).
3. Sideload cannot supply a real Ads referrer — Ads path stays gated.
4. Play production still 1.4.63.

**Next (in order):** commit/deploy **only** the analytics Web/API files → sideload 1.4.65 on a wiped device **without login** → Coolify READ-ONLY confirm `device:` + `first_open` + `app_version=1.4.65` → then login → confirm stitch and single first_open. Keep Ads paused.

---

## Final status

```
PRODUCTION VERIFICATION BLOCKED — EVIDENCE INSUFFICIENT

ADS CAMPAIGN 23986249354: PAUSED
```
