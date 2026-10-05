# Paid-user identity + attribution architecture — 5 Oct 2026

**Status:** `READY FOR CONTROLLED TEST`

```
ADS CAMPAIGN 23986249354: PAUSED
BUDGET / BIDDING / GEO / CREATIVES / CONVERSIONS: UNCHANGED
WEB/API DEPLOY: NO
AAB UPLOAD: NO
PRODUCTION DB WRITES: NONE
HISTORICAL BACKFILL: NONE
ADS CONVERSION UPLOAD: NONE
```

This is the identity / revenue loop, not a first_open ticket.

---

## 1. Current architecture (`VERIFIED`)

Three planes do not join in production today:

| Plane | Source of truth | Production gap |
|---|---|---|
| Product analytics | `analytics_events` (client JS + native preauth) | `device:` = 0; live JS ACKs first_open before POST; purchase events = 0 |
| Revenue | RevenueCat webhook → `subscriptions` | 1 Play + 1 App Store + 1 manual; no campaign columns |
| Ads | Firebase native import | 98 conversions / ₹0 value last 30d |

```
Ads click → Play referrer → (live 1.4.63 after WebView)
  → JS localStorage → install_source (gclid stripped live)
  → login → analytics_events.user_id = Firebase UID
  → RC configure() anonymous → later JS billing hook logIn
  → Play purchase → webhook → subscriptions.user_id
  → client purchase analytics (often never flushed)
  → Firebase purchase (if JS bridge fires)
```

Ads API 5 Oct 2026: campaign `23986249354` **PAUSED**, budget ₹400.

---

## 2. Canonical identity decision

**`canonical_user_id` = Firebase UID that owns the subscription row.**

Evidence (no separate `users` table exists):

| Store | Key | Value |
|---|---|---|
| Auth | `requireAuth` `decoded.uid` | Firebase UID |
| `parent_profiles.user_id` | Firebase UID | App data |
| `subscriptions.user_id` | Firebase UID (alias-resolved owner) | Revenue |
| `analytics_events.user_id` | Firebase UID or `device:{id}` | Measurement |
| RC `app_user_id` intended | Same Firebase UID | Billing |
| `parent_profiles.id` | serial PK | **Never** used as identity |

`user_identity_aliases.internal_user_id` is **also a Firebase UID** (premium email recovery). Session UID may differ from billing owner; both are Firebase UIDs.

**Deterministic mappings:**

```
device_id
  → analytics_events.user_id = device:{device_id}
  → user_acquisition_attribution.device_id
  → on login: canonical_user_id = Firebase UID
  → RevenueCat.app_user_id = canonical_user_id
  → subscriptions.user_id = canonical_user_id (or alias owner)
  → attribution.gclid/gbraid/wbraid (first-touch, never null-overwritten)
```

There is exactly one canonical strategy. Firebase UID is canonical because production already uses it everywhere; a new UUID space would split history.

---

## 3. Identity graph

| Identity | Created | Stored | Lifetime | Join key | Failure |
|---|---|---|---|---|---|
| `canonical_user_id` | Firebase Auth | all `user_id` columns | Account | Firebase UID | Alias recovery can point billing at another UID |
| Firebase UID | Sign-in | SDK + session | Until logout | = canonical (usually) | Logout clears |
| Native device id | `NativeAnalyticsSpine` | SharedPreferences | Until uninstall | `device_id` | New on reinstall |
| WebView localStorage | JS fallback | `amynest:device:id:v1` | Until clear | Same device if inject won | Not source of truth |
| RC `$RCAnonymousID` | `Purchases.configure` without uid | RC cloud | Until `logIn` | Must not own purchase | **Dominates Android customers** |
| RC identified | `logIn(canonical)` | RC + `subscriptions.revenuecat_app_user_id` | Until logout | = canonical | Late billing hook |
| Play txn | Play / RC | webhook + `latest_transaction_id` | Store-owned | `transaction_id` | Not joined to Ads |
| Ads click ids | Play referrer | attribution row + event props | First-touch | `gclid`/`gbraid`/`wbraid` | Live taxonomy strip |
| Campaign | Referrer / Ads | `campaign_id` only if ATTRIBUTED | First-touch | campaign_id | Label-only `google_ads` is unknown |

---

## 4. Attribution graph

```
Play Install Referrer
  → native prefs (1.4.65+)
  → preauth first_open / install_source
  → user_acquisition_attribution (first-touch fact)
  → login stitch (attach canonical_user_id, keep gclid)
  → purchase webhook lookup
  → campaign answer OR ATTRIBUTION_UNKNOWN
```

**ATTRIBUTED** only if `gclid` or `gbraid` or `wbraid` exists.

`install_source=google_ads` **without** a click id = `ATTRIBUTION_UNKNOWN`.

First-touch click ids are never overwritten with null.

---

## 5. RevenueCat graph

```
Application.onCreate
  → configure(persisted canonical uid if present)
  → else anonymous (first launch only)
Firebase Auth publishes uid
  → syncIdentifiedRevenueCatUser(uid) immediately
  → BillingBridge.setUserId → logIn + persist
Play purchase
  → refuse if no persisted canonical uid
  → logIn again if current RC id ≠ canonical
  → only then purchaseWith
Logout
  → logOut + clear persisted uid (new anonymous for next account)
```

Anonymous configure is kept for the unauthenticated first session. Authenticated purchase cannot stay on `$RCAnonymousID`.

---

## 6. Purchase graph

```
Play Billing
  → RevenueCat (identified customer)
  → webhook INITIAL_PURCHASE
  → subscriptions (canonical user)
  → recordServerPurchaseTruth
       subscription_funnel_event step=purchase_success
       upgrade_completed source=server
       attribution_status + click ids if ATTRIBUTED
  → ads_conversion_upload_ledger status=prepared | skipped_no_click_id | blocked_ads_paused
  → shouldUpload = false while campaign paused
```

UI purchase events may still fire. They are **not** revenue truth.

---

## 7. Exact root causes (`ROOT CAUSE IDENTIFIED`)

1. Internal analytics required authenticated JS; `device:` never persisted.
2. Live taxonomy stripped click ids from `first_open` / `install_source` (40 `google_ads`, 0 gclid).
3. Android RC booted anonymous; `logIn` waited on the WebView billing hook.
4. Webhook wrote `subscription_started`, not `purchase_success`. Client purchase analytics never landed (0 all-time).
5. `subscriptions` has no acquisition columns; no first-touch fact table.
6. No Ads offline upload; Firebase purchase value = 0.

---

## 8. Proposed vs implemented

| Change | Status |
|---|---|
| Canonical identity = Firebase UID / billing owner | `FIX IMPLEMENTED` (documented + used) |
| `user_acquisition_attribution` + ledger schema + SQL `0051` | `FIX IMPLEMENTED` — **not applied to production** |
| First-touch merge / ATTRIBUTION_UNKNOWN / no google_ads inference | `FIX IMPLEMENTED` |
| Preauth writes attribution fact | `FIX IMPLEMENTED` |
| Login stitch attaches canonical user, keeps gclid | `FIX IMPLEMENTED` |
| Immediate RC `logIn` from Firebase Auth (not billing hook) | `FIX IMPLEMENTED` |
| Persist RC uid + configure on restart | `FIX IMPLEMENTED` |
| Native purchase refused unless identified | `FIX IMPLEMENTED` |
| Server `purchase_success` on INITIAL_PURCHASE | `FIX IMPLEMENTED` |
| Ads conversion prepare, never upload while paused | `FIX IMPLEMENTED` |
| Taxonomy keeps gclid/txn on purchase events | `FIX IMPLEMENTED` |
| Native first_open ACK after 2xx | `FIX IMPLEMENTED` (prior + this) |

---

## 9. Remaining blockers (`BLOCKED`)

1. Web/API not deployed.
2. Migration `0051` not applied (additive; apply only with approved deploy).
3. AAB not uploaded. Identity-repair build is **1.4.66 / 109**, distinct from 1.4.65-108.
4. No device attached — fresh-install proof `NOT VERIFIED`.
5. Organic sideload cannot prove Ads click ids.
6. Campaign remains paused — no real Ads attribution or conversion upload.

---

## 10. Test matrix

Deterministic fixtures in `acquisitionAttributionLogic.test.ts` (12 cases covering A–R). Plus taxonomy 11, preauth 3, kidschedule ACK/device/attribution 18.

| Case | Automated |
|---|---|
| A Fresh install device identity | YES |
| B first_open before login | YES (logic + ACK tests) |
| C attribution before login | YES |
| D login stitching | YES |
| E RC identity sync | YES |
| F WebView reload first-touch | YES |
| G app restart first-touch | YES |
| H network failure / empty retry | YES |
| I preauth retry fills click id | YES |
| J duplicate first_open | YES |
| K duplicate attribution null-safe | YES |
| L purchase under authenticated user | YES |
| M purchase after reload (same first-touch) | YES |
| N anonymous → identified; refuse anonymous purchase | YES |
| O subscription → canonical user | YES |
| P subscription → attribution / campaign | YES |
| Q ATTRIBUTION_UNKNOWN | YES |
| R Ads conversion no-upload + dedupe key | YES |
| Device / emulator | `NOT VERIFIED` |
| Production | `NOT VERIFIED` |

---

## 11. Deployment plan (do not execute now)

1. Isolated commit of identity/attribution/API/Android files only.
2. Apply **additive** migration `0051` to Coolify (no backfill).
3. Deploy API then Cloudflare Pages.
4. Confirm live JS no longer sets first_open before ACK.
5. Sideload **1.4.66** on a wiped device, no login, Coolify `device:` + attribution row.
6. Login → stitch proof.
7. Separate written approval for a paused-budget Ads experiment.
8. One real Ads install + one real Play purchase.
9. Confirm server `purchase_success`, attribution status, ledger `blocked_ads_paused`.
10. Only then consider Ads resume.

---

## 12. Ads resume prerequisites

All must be `VERIFIED` in production before any resume recommendation:

- [ ] Web/API deployed and live assets confirmed
- [ ] Migration 0051 applied
- [ ] Fresh Android first_open before login
- [ ] Attribution row before login
- [ ] Login stitch keeps first-touch
- [ ] RC identified immediately (not billing-hook-only)
- [ ] Anonymous RC cannot purchase when canonical uid exists
- [ ] Server purchase_success for the Play payer
- [ ] Subscription joins attribution or ATTRIBUTION_UNKNOWN
- [ ] Campaign answer only when click id exists
- [ ] Ads ledger never uploaded while paused
- [ ] Controlled real Ads install + real purchase

**DO NOT resume campaign 23986249354.**

---

## Success criteria (architecture vs production)

| Criterion | Architecture | Production |
|---|---|---|
| canonical identity defined | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| device identity survives WebView | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| attribution survives pre-auth | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| attribution survives login | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| Firebase UID joins canonical user | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| RC deterministic identified user | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| anonymous RC cannot capture authed purchase | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| Play purchase has canonical user | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| RC subscription has canonical user | already true for 1 Play payer | `PARTIALLY` historical |
| subscription can join attribution | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| purchase → campaign when attributed | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| missing attribution explicit | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| duplicate conversion prevented | `FIX IMPLEMENTED` | `NOT VERIFIED` |
| Ads upload architecture ready | `FIX IMPLEMENTED` (upload off) | `BLOCKED` |
| no synthetic historical attribution | `VERIFIED` | `VERIFIED` |

```
READY FOR CONTROLLED TEST
ADS CAMPAIGN 23986249354: PAUSED
```
