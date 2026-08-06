# AmyNest V2 — Analytics Event Registry

**Status:** Canonical · Mandatory for engineering  
**Depends on:** [Analytics Constitution V1](./ANALYTICS_CONSTITUTION.md) (**APPROVED**)  
**Scope:** Registry only — **no emitters** · no Firebase / Google Ads / RevenueCat code changes in this sprint  

---

## Binding rule

> **No event may be emitted unless it is listed in this registry as `status: active` (or `status: deprecated` with an approved grace window).**  
> Unknown event names are a **ship blocker**.  
> Constitution laws override convenience.

---

# 1. Event taxonomy

## 1.1 Layers (exactly one per event)

| Layer | Meaning | Examples |
|-------|---------|----------|
| **Product** | In-product journey / usage value | WOW, mission start/complete, Today view |
| **Business** | North Star / cohort / identity outcomes | D1, Day-3, paid conversion metric, identity link |
| **Commerce** | Monetization UX & checkout mechanics | Premium view/checkout/restore/fail/offline |
| **Ads** | Ad-network conversion signal (optimize surface) | Sole Firebase `purchase` bridge event |
| **System** | Auth / platform / measurement plumbing | `sign_up`, native-fallback diagnostic |

**Law:** An event belongs to **exactly one** layer. Routing flags (`Firebase?`, `Google Ads?`) are not layers.

## 1.2 Status values

| Status | Meaning |
|--------|---------|
| `active` | Allowed to emit when `analytics_v2_core` is on (and platform rules met) |
| `reserved` | Named for future use — **must not emit** until promoted to `active` |
| `deprecated` | May emit only during documented grace; must not be added as new callers |
| `forbidden` | Must never be emitted by V2 paths; legacy debt only outside V2 core |

## 1.3 North Star map (Business / Product)

| # | Metric | Primary event(s) | Layer |
|---|--------|------------------|-------|
| 1 | 90s WOW rate | `v2_wow_completed` | Product |
| 2 | Mission completion rate | `v2_mission_started` + `v2_mission_completed` | Product |
| 3 | D1 return | `v2_d1_returned` | Business |
| 4 | Practice Day-3 | `v2_practice_day3` | Business |
| 5 | Paid conversion | `v2_paid_conversion` | Business |

Ads optimize uses **`ads_purchase`** (Ads layer), not the Business metric name, to keep layers pure. Implementation must fire both from the same transaction commit with shared once-key material (`transaction_id`).

## 1.4 Registry index

| Event name | Layer | Status | Can optimize? |
|------------|-------|--------|---------------|
| `v2_wow_completed` | Product | active | No |
| `v2_mission_started` | Product | active | No |
| `v2_mission_completed` | Product | active | No |
| `today_viewed` | Product | active | No |
| `v2_d1_returned` | Business | active | No |
| `v2_practice_day3` | Business | active | No |
| `v2_paid_conversion` | Business | active | No* |
| `v2_identity_link` | Business | active | No |
| `premium_view` | Commerce | active | No |
| `premium_checkout` | Commerce | active | No |
| `premium_restore_success` | Commerce | active | No |
| `premium_restore_fail` | Commerce | active | No |
| `premium_already` | Commerce | active | No |
| `premium_fail` | Commerce | active | No |
| `premium_offline` | Commerce | active | No |
| `ads_begin_checkout` | Commerce | active | No |
| `ads_purchase` | Ads | active | **YES (only)** |
| `sys_sign_up` | System | active | No |
| `sys_analytics_native_fallback` | System | active | No |

\* `v2_paid_conversion` is the **Business** North Star. Google Ads optimization uses sibling **`ads_purchase`** only. Never optimize both.

### Forbidden / legacy (not V2-registry emitters)

| Name / pattern | Status | Why forbidden for V2 |
|----------------|--------|----------------------|
| Firebase `begin_checkout` from paywall **view** | forbidden | Impression ≠ intent (Constitution A1) |
| `app_store_subscription_convert` as Ads primary | forbidden | Duplicate purchase signal (A2) |
| `paywall_opened` → Firebase checkout | forbidden | Misuse |
| `purchase_success` fan-out to Ads | forbidden | Use `ads_purchase` + `v2_paid_conversion` once |
| `premium_unlocked` / `feature_unlocked` as purchase | forbidden | Not money |
| Restore / trial / already_premium as `purchase` | forbidden | Constitution A7 |
| Child name / free-text worry in any sink | forbidden | PII law |

Legacy `subscription-analytics` / module zoo events are **out of registry**. They must not be added to V2 core. Deprecation of legacy is a separate migration; they are not sources of truth.

---

# 2. Naming rules

1. **V2 product/business events** use prefix `v2_` + `snake_case`.  
2. **Commerce premium journey** uses prefix `premium_` + `snake_case` (matches Premium V2 journey).  
3. **Ads sink events** use prefix `ads_` + standard meaning (`purchase`, `begin_checkout`).  
   - Runtime Firebase name may be the GA4 standard (`purchase`, `begin_checkout`) — registry name is `ads_*` for ownership clarity.  
4. **System events** use prefix `sys_`.  
5. **No** camelCase, no spaces, max **40** chars.  
6. **No** feature-module prefixes outside V2 (`games_`, `birth_sky_`) in this registry.  
7. Past tense for completed outcomes (`_completed`, `_returned`); noun/verb clarity for starts (`_started`, `_view`, `_checkout`).  
8. One concept → one name. Aliases are forbidden unless `deprecated` with replacement.

---

# 3. Payload schema

## 3.1 Common envelope (all active events)

```ts
type V2AnalyticsEnvelope = {
  event_name: string;          // must match registry
  event_version: number;       // integer ≥ 1
  layer: "product" | "business" | "commerce" | "ads" | "system";
  anonymous_id: string;        // guestId or device fallback
  user_id?: string | null;     // firebase uid when known
  occurred_at: string;         // ISO-8601
  platform: "android" | "ios" | "web";
  app_version?: string;
  analytics_flag: "analytics_v2_core";
  journey_id?: string;         // e.g. premium_v2_purchase
  journey_version?: number;
};
```

## 3.2 PII policy (global)

| Allowed | Forbidden |
|---------|-----------|
| `anonymous_id`, `user_id` (opaque) | Child **name** |
| `age_band` (enum id) | Free-text worry / notes |
| `worry_id` (enum id) | Health narratives, audio transcripts |
| `mission_id`, `plan_id` | Email, phone, address |
| `transaction_id` (store/RC) | Raw receipt dumps in client logs to Ads |

**Default retention:** see per-event `Retention policy`. Ads/Firebase params must stay PII-clean even if internal sink keeps more later (internal still forbids child name).

## 3.3 Per-event definitions

Each event below is the full contract.

---

### `v2_wow_completed`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_wow_completed` |
| **Description** | User finished Breath → first practice success within 90 seconds of Front Door start. |
| **Owner** | FE · Front Door / first practice (`v2/front-door`, speech micro) |
| **Layer** | Product |
| **Trigger** | First practice success ∧ elapsed ≤ 90s from door start timestamp |
| **Exactly-once key** | `wow:{anonymous_id}` |
| **Payload** | Envelope + `{ door_started_at, completed_at, elapsed_ms, age_band?, worry_id?, practice_id }` |
| **Version** | `1` |
| **Consumer(s)** | Product North Star #1; Ads **gates** (observe) |
| **Firebase?** | Optional custom (not required for Ads) |
| **Google Ads?** | Observe only — never optimize |
| **Internal?** | Yes (required) |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days; Firebase if used 14 months (GA4 default) |
| **PII policy** | Global; no child name |

---

### `v2_mission_started`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_mission_started` |
| **Description** | User started Today's single Speech mission (intent). |
| **Owner** | FE · Today mission play |
| **Layer** | Product |
| **Trigger** | Navigate to `/today/mission` or explicit Start (first open of play for that mission day) |
| **Exactly-once key** | `mission_start:{anonymous_id}:{mission_id}:{date_key}` |
| **Payload** | Envelope + `{ mission_id, date_key, age_band?, worry_id?, duration?, difficulty?, estimated_minutes? }` |
| **Version** | `1` |
| **Consumer(s)** | Product North Star #2 denominator |
| **Firebase?** | Optional |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days |
| **PII policy** | Global |

---

### `v2_mission_completed`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_mission_completed` |
| **Description** | User marked Today's Speech mission complete (success). |
| **Owner** | FE · Today mission completion |
| **Layer** | Product |
| **Trigger** | `markMissionCompleted` success path (not success-screen revisit alone) |
| **Exactly-once key** | `mission_done:{anonymous_id}:{mission_id}:{date_key}` |
| **Payload** | Envelope + `{ mission_id, date_key, age_band?, worry_id? }` |
| **Version** | `1` |
| **Consumer(s)** | Product North Star #2; Ads gates (observe) |
| **Firebase?** | Optional |
| **Google Ads?** | Observe only |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days |
| **PII policy** | Global |

---

### `today_viewed`

| Field | Value |
|-------|--------|
| **Event Name** | `today_viewed` |
| **Description** | Today shell impressed once per session (impression ≠ mission). |
| **Owner** | FE · Today page |
| **Layer** | Product |
| **Trigger** | Today shell mount / focus when `today_v2` on |
| **Exactly-once key** | `today:{anonymous_id}:{session_id}` |
| **Payload** | Envelope + `{ session_id }` |
| **Version** | `1` |
| **Consumer(s)** | Internal product |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 90 days |
| **PII policy** | Global |

---

### `v2_d1_returned`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_d1_returned` |
| **Description** | User returned on calendar day D+1 after cohort day 0. |
| **Owner** | FE · analytics bootstrap / app open |
| **Layer** | Business |
| **Trigger** | App open where `local_date === cohort_day0 + 1` |
| **Exactly-once key** | `d1:{anonymous_id}:{cohort_day0}` |
| **Payload** | Envelope + `{ cohort_day0, return_date }` |
| **Version** | `1` |
| **Consumer(s)** | North Star #3; Ads gates |
| **Firebase?** | Optional |
| **Google Ads?** | Observe only |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days |
| **PII policy** | Global |

---

### `v2_practice_day3`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_practice_day3` |
| **Description** | User reached ≥2 practice/mission completions by end of day 3. |
| **Owner** | FE · practice counter (mission completes) |
| **Layer** | Business |
| **Trigger** | Counter crosses 2 within days 0–3 of cohort |
| **Exactly-once key** | `day3:{anonymous_id}` |
| **Payload** | Envelope + `{ cohort_day0, practice_count, reached_on_date }` |
| **Version** | `1` |
| **Consumer(s)** | North Star #4; Ads gates |
| **Firebase?** | Optional |
| **Google Ads?** | Observe only |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days |
| **PII policy** | Global |

---

### `v2_paid_conversion`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_paid_conversion` |
| **Description** | Business North Star #5: activated user became a real paying parent (store-confirmed). |
| **Owner** | FE · billing finalize (after RC/server premium + transaction id) |
| **Layer** | Business |
| **Trigger** | Verified paid charge ∧ activated (≥1 mission/practice complete) ∧ not trial-only |
| **Exactly-once key** | `paid:{transaction_id}` |
| **Payload** | Envelope + `{ transaction_id, plan_id, value?, currency?, provider: "revenuecat"\|"razorpay", activated: true }` |
| **Version** | `1` |
| **Consumer(s)** | Product North Star #5 |
| **Firebase?** | No (Ads money signal is `ads_purchase`) |
| **Google Ads?** | No direct — paired emit with `ads_purchase` |
| **Internal?** | Yes (required) |
| **Can optimize?** | **No** (optimize sibling `ads_purchase` only) |
| **Retention policy** | Internal 7 years (finance-aligned) / min 400 days |
| **PII policy** | Global; value/currency from store, not guessed PII |

---

### `v2_identity_link`

| Field | Value |
|-------|--------|
| **Event Name** | `v2_identity_link` |
| **Description** | Guest/anonymous identity linked to account (`user_id`). |
| **Owner** | FE · soft save / signup / account link |
| **Layer** | Business |
| **Trigger** | First successful bind of `anonymous_id` → `user_id` |
| **Exactly-once key** | `link:{anonymous_id}:{user_id}` |
| **Payload** | Envelope + `{ anonymous_id, user_id, method?: "soft_save"\|"sign_in"\|"sign_up" }` |
| **Version** | `1` |
| **Consumer(s)** | Funnel joins; internal |
| **Firebase?** | Optional user-property set only (not a conversion) |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 400 days |
| **PII policy** | Opaque ids only |

---

### `premium_view`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_view` |
| **Description** | Premium V2 journey impressed (impression). |
| **Owner** | FE · `v2/premium` |
| **Layer** | Commerce |
| **Trigger** | Premium journey ready/visible (not already_premium-only flash without view) |
| **Exactly-once key** | `prem_view:{anonymous_id}:{date_key}` |
| **Payload** | Envelope + `{ journey_id, journey_version, date_key }` |
| **Version** | `1` |
| **Consumer(s)** | Internal commerce funnel |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 180 days |
| **PII policy** | Global |

---

### `premium_checkout`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_checkout` |
| **Description** | User committed to pay (Continue / Subscribe) with a selected plan — commerce intent. |
| **Owner** | FE · Premium V2 / pay CTA |
| **Layer** | Commerce |
| **Trigger** | Explicit purchase CTA (not restore, not view) |
| **Exactly-once key** | `prem_chk:{anonymous_id}:{plan_id}:{attempt_id}` |
| **Payload** | Envelope + `{ plan_id, attempt_id, journey_id, journey_version }` |
| **Version** | `1` |
| **Consumer(s)** | Internal funnel; coordinates `ads_begin_checkout` |
| **Firebase?** | Via `ads_begin_checkout` only |
| **Google Ads?** | Observe (never optimize) |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 180 days |
| **PII policy** | Global |

---

### `premium_restore_success` / `premium_restore_fail`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_restore_success` · `premium_restore_fail` |
| **Description** | Restore purchases outcome (not a new charge). |
| **Owner** | FE · Premium V2 / pricing restore |
| **Layer** | Commerce |
| **Trigger** | Restore API returns ok / not ok |
| **Exactly-once key** | `prem_restore:{anonymous_id}:{date_key}:ok` · `...:fail` |
| **Payload** | Envelope + `{ date_key, reason? }` |
| **Version** | `1` |
| **Consumer(s)** | Internal |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 180 days |
| **PII policy** | Global |

---

### `premium_already`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_already` |
| **Description** | User hit Premium journey already unlocked. |
| **Owner** | FE · Premium V2 |
| **Layer** | Commerce |
| **Trigger** | Phase `already_premium` shown |
| **Exactly-once key** | `prem_already:{anonymous_id}:{date_key}` |
| **Payload** | Envelope + `{ date_key }` |
| **Version** | `1` |
| **Consumer(s)** | Internal |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 90 days |
| **PII policy** | Global |

---

### `premium_fail`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_fail` |
| **Description** | Purchase attempt failed (not cancel). |
| **Owner** | FE · Premium V2 |
| **Layer** | Commerce |
| **Trigger** | Phase `failed` after purchase/restore error |
| **Exactly-once key** | `prem_fail:{anonymous_id}:{attempt_id}` |
| **Payload** | Envelope + `{ attempt_id, error_code?: string }` (no raw store dumps) |
| **Version** | `1` |
| **Consumer(s)** | Internal |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 180 days |
| **PII policy** | Global |

---

### `premium_offline`

| Field | Value |
|-------|--------|
| **Event Name** | `premium_offline` |
| **Description** | Premium action blocked by offline (purchase/restore/general). |
| **Owner** | FE · Premium V2 |
| **Layer** | Commerce |
| **Trigger** | Offline phase with context |
| **Exactly-once key** | `prem_off:{anonymous_id}:{session_id}:{context}` |
| **Payload** | Envelope + `{ session_id, context: "general"\|"restore"\|"purchase" }` |
| **Version** | `1` |
| **Consumer(s)** | Internal |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 90 days |
| **PII policy** | Global |

---

### `ads_begin_checkout`

| Field | Value |
|-------|--------|
| **Event Name** | `ads_begin_checkout` |
| **Description** | Ads/Firebase checkout **intent** signal. GA4 runtime name: `begin_checkout`. |
| **Owner** | Native BillingBridge (Android/iOS shell) · JS only on web |
| **Layer** | Commerce |
| **Trigger** | Same moment as `premium_checkout` / store sheet about to present — **never** on premium view |
| **Exactly-once key** | `ads_chk:{anonymous_id}:{plan_id}:{attempt_id}` |
| **Payload** | Envelope + ecommerce `{ plan_id, attempt_id, value, currency, item_id }` |
| **Version** | `1` |
| **Consumer(s)** | Google Ads **observe**; GA4 funnel |
| **Firebase?** | **Yes** (required for Ads observe) |
| **Google Ads?** | Yes — observe / secondary only |
| **Internal?** | Optional mirror |
| **Can optimize?** | **No — never optimize** |
| **Retention policy** | GA4 default |
| **PII policy** | Global; ecommerce ids only |

---

### `ads_purchase`

| Field | Value |
|-------|--------|
| **Event Name** | `ads_purchase` |
| **Description** | **Sole** Google Ads optimization signal. GA4 runtime name: `purchase`. Store-confirmed money. |
| **Owner** | Native on Android/iOS · JS on web after verify · never both |
| **Layer** | **Ads** |
| **Trigger** | Store/RC purchase success with `transaction_id`; paired with `v2_paid_conversion` when activated |
| **Exactly-once key** | `ads_paid:{transaction_id}` |
| **Payload** | Envelope + `{ transaction_id, plan_id, value, currency, item_id, activated?: boolean }` |
| **Version** | `1` |
| **Consumer(s)** | **Google Ads primary optimize**; GA4 |
| **Firebase?** | **Yes** |
| **Google Ads?** | **Yes** |
| **Internal?** | Mirror allowed |
| **Can optimize?** | **YES — only event in registry allowed to optimize** |
| **Retention policy** | GA4 + Ads per Google policy |
| **PII policy** | Global |

**Activation note:** If purchase happens before activation, still emit `ads_purchase` for revenue truth; emit `v2_paid_conversion` only when activation criterion is met (may be same moment or later once — still once-keyed by `transaction_id` for paid business event; if business requires activated-only, delay `v2_paid_conversion` until activated without re-firing `ads_purchase`).

---

### `sys_sign_up`

| Field | Value |
|-------|--------|
| **Event Name** | `sys_sign_up` |
| **Description** | Account created. GA4 runtime name: `sign_up`. |
| **Owner** | FE · auth / growth |
| **Layer** | System |
| **Trigger** | New Firebase account creation |
| **Exactly-once key** | `signup:{user_id}` |
| **Payload** | Envelope + `{ method: string }` |
| **Version** | `1` |
| **Consumer(s)** | Ads observe; internal growth |
| **Firebase?** | Yes |
| **Google Ads?** | Observe only |
| **Internal?** | Yes |
| **Can optimize?** | **No — never optimize** |
| **Retention policy** | GA4 default |
| **PII policy** | No email in params |

---

### `sys_analytics_native_fallback`

| Field | Value |
|-------|--------|
| **Event Name** | `sys_analytics_native_fallback` |
| **Description** | Native Firebase log failed; JS fallback used (diagnostic). |
| **Owner** | FE · attribution adapter |
| **Layer** | System |
| **Trigger** | Shell present ∧ native analytics ack false/error ∧ JS emits checkout/purchase fallback |
| **Exactly-once key** | `native_fb:{anonymous_id}:{transaction_id\|attempt_id}:{kind}` |
| **Payload** | Envelope + `{ kind: "begin_checkout"\|"purchase", reason: string }` |
| **Version** | `1` |
| **Consumer(s)** | Eng reliability |
| **Firebase?** | No |
| **Google Ads?** | No |
| **Internal?** | Yes |
| **Can optimize?** | **No** |
| **Retention policy** | Internal 90 days |
| **PII policy** | Global |

---

# 4. Versioning rules

1. Every event has integer **`event_version`** starting at `1`.  
2. **Additive** optional payload fields → same version OK if consumers tolerate absence.  
3. **Breaking** change (rename, remove field, change once-key meaning, change layer, change optimize flag) → bump version; keep old version `deprecated` for one release.  
4. **Machine source of truth** is [`ANALYTICS_EVENT_REGISTRY.json`](./ANALYTICS_EVENT_REGISTRY.json).  
   - Edit the JSON → run `pnpm --filter @workspace/kidschedule generate:analytics-v2-registry` → regenerates `events.ts`.  
   - **Do not hand-edit** `artifacts/kidschedule/src/lib/analytics/v2-core/registry/events.ts`.  
   - This markdown doc is the **human / review** contract; §1.4 index event names **must match** the JSON (enforced by `check:analytics-v2-registry`).  
5. Runtime Firebase names (`purchase`, `begin_checkout`, `sign_up`) are stable GA4 names; registry `ads_*` / `sys_*` are AmyNest ownership names mapped 1:1.

---

# 5. Deprecation policy

1. Mark event `status: deprecated` with `replaced_by`, `deprecate_after` (date or release).  
2. No new call sites after deprecation.  
3. Grace ≤ **two** production releases, then `forbidden`.  
4. Ads-linked deprecations require Ads conversion remap **before** stopping emit.  
5. Forbidden events must fail CI if referenced from `src/v2/**` or `lib/analytics/v2-core/**`.

---

# 6. Example payloads

### Mission completed

```json
{
  "event_name": "v2_mission_completed",
  "event_version": 1,
  "layer": "product",
  "anonymous_id": "3f2c9a8e-guest",
  "user_id": null,
  "occurred_at": "2026-08-01T17:12:00.000Z",
  "platform": "android",
  "app_version": "2.5.2",
  "analytics_flag": "analytics_v2_core",
  "mission_id": "speech_preschool_name_it",
  "date_key": "2026-08-01",
  "age_band": "preschool_3_5",
  "worry_id": "speech_talking"
}
```

### Premium checkout → Ads begin_checkout

```json
{
  "event_name": "premium_checkout",
  "event_version": 1,
  "layer": "commerce",
  "anonymous_id": "3f2c9a8e-guest",
  "user_id": "uid_abc",
  "occurred_at": "2026-08-01T18:00:00.000Z",
  "platform": "android",
  "analytics_flag": "analytics_v2_core",
  "journey_id": "premium_v2_purchase",
  "journey_version": 1,
  "plan_id": "yearly",
  "attempt_id": "att_9c1"
}
```

```json
{
  "event_name": "ads_begin_checkout",
  "event_version": 1,
  "layer": "commerce",
  "anonymous_id": "3f2c9a8e-guest",
  "user_id": "uid_abc",
  "occurred_at": "2026-08-01T18:00:00.050Z",
  "platform": "android",
  "analytics_flag": "analytics_v2_core",
  "plan_id": "yearly",
  "attempt_id": "att_9c1",
  "item_id": "yearly",
  "value": 2999,
  "currency": "INR"
}
```

### Paid conversion + Ads purchase (same transaction)

```json
{
  "event_name": "ads_purchase",
  "event_version": 1,
  "layer": "ads",
  "anonymous_id": "3f2c9a8e-guest",
  "user_id": "uid_abc",
  "occurred_at": "2026-08-01T18:01:10.000Z",
  "platform": "android",
  "analytics_flag": "analytics_v2_core",
  "transaction_id": "GPA.1234-5678",
  "plan_id": "yearly",
  "item_id": "yearly",
  "value": 2999,
  "currency": "INR",
  "activated": true
}
```

```json
{
  "event_name": "v2_paid_conversion",
  "event_version": 1,
  "layer": "business",
  "anonymous_id": "3f2c9a8e-guest",
  "user_id": "uid_abc",
  "occurred_at": "2026-08-01T18:01:10.000Z",
  "platform": "android",
  "analytics_flag": "analytics_v2_core",
  "transaction_id": "GPA.1234-5678",
  "plan_id": "yearly",
  "value": 2999,
  "currency": "INR",
  "provider": "revenuecat",
  "activated": true
}
```

---

# 7. Validation checklist (before any emitter PR)

- [ ] Event name exists in this registry with `status: active`  
- [ ] Single layer assigned; matches table  
- [ ] Owner team/path documented  
- [ ] Trigger matches impression vs intent vs purchase laws  
- [ ] Exactly-once key implemented via shared once helper (when coding)  
- [ ] Payload ⊆ schema; no forbidden PII  
- [ ] `Can optimize?` is false unless event is `ads_purchase`  
- [ ] Firebase emit only if `Firebase?` = Yes  
- [ ] Native vs JS ownership respected for `ads_*`  
- [ ] Flag `analytics_v2_core` gates emit  
- [ ] Tests: double-call → single emit  
- [ ] Constitution Laws 0–12 still satisfied  

---

# 8. CI validation requirements (future implementation sprint)

When emitters are allowed, CI **must**:

1. **Registry parse** — `docs/v2/ANALYTICS_EVENT_REGISTRY.json` is machine SoT; `check:analytics-v2-registry` fails on JSON ↔ `events.ts` ↔ MD §1.4 index drift.  
2. **Allowlist lint** — any `track*` / `logEvent` / `logSubscriptionAnalytics` under `src/v2/**` and `lib/analytics/v2-core/**` must reference registry `event_name`.  
3. **Forbidden pattern fail** — detect `trackFirebaseBeginCheckout` from paywall view / `paywall_opened` paths.  
4. **Optimize cardinality** — assert exactly one registry event has `canOptimize: true` (`ads_purchase`).  
5. **Layer exclusivity** — schema enum one layer per event.  
6. **Once-key present** — every `active` event defines non-empty once-key template.  
7. **PII scan** — fail if payload examples or code send `name`, `child_name`, `email` to Firebase params in V2 core.  
8. **QA-T10** — golden journeys assert once-fire for North Stars + `ads_purchase`.  

**Machine SoT (live):** [`ANALYTICS_EVENT_REGISTRY.json`](./ANALYTICS_EVENT_REGISTRY.json) → generated `registry/events.ts`.  
**Human SoT (review):** this markdown. Bus entry: `trackV2AnalyticsEvent`.  
**Firebase sink (3C-5):** forwards only registry `firebase: true` events in product/business/system layers (commerce/ads deferred). Product code must never call Firebase directly.

---

# 9. Optimize allowlist (absolute)

```
ALLOWED_TO_OPTIMIZE = { ads_purchase }
```

Everything else: **can never optimize**.

---

# 10. Document control

| Field | Value |
|-------|--------|
| Registry version | `1` |
| Constitution | V1 approved |
| Emitters | **Not implemented** |
| Next gate | Remediation AC + registry approval → emitter sprint |

---

**End of Analytics Event Registry.**  
Registry only. No emitters. No Firebase / Google Ads / RevenueCat modifications in Sprint 3C-2.
