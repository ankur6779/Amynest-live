# Ads post-install DB forensic — 25 Sep 2026 to 1 Oct 2026

**Window A:** 25 Sep 2026 00:00 through 1 Oct 2026 23:59, Asia/Calcutta (`server_ts`)  
**2 Oct:** excluded  
**Google Ads campaign:** `23986249354`  
**Method:** READ-ONLY SQL against live production Postgres  
**Noise filter:** `event_name <> 'device_header_missing'`  
**PII:** no emails, phones, names, or user ids in this file  

**Primary question:** Can AmyNest’s production database independently reconstruct the post-install funnel for the 88 Ads installs?

**Answer:** `PARTIAL — SOME FUNNEL DATA AVAILABLE BUT ADS JOIN INCOMPLETE`

**ADS CAMPAIGN ACTION:** NO CHANGE  
**GOOGLE ADS:** NO CHANGE  
**DATABASE:** READ ONLY  
**PRODUCTION:** NO DEPLOYMENT  

---

## 1. Executive summary

Live Coolify Postgres was queried. It is the current production analytics store (`analytics_events`, 143 public tables, timezone `Asia/Calcutta`). Render Postgres was not used.

For Window A, Android `analytics_events` contains **12 unique authenticated users** and **8 unique `first_open` users** (9 events). Google Ads reports **88 Play installs** and **55 attributed `first_open`**. Those two systems do not join.

| Metric | Count |
|---|---:|
| Ads Play installs | 88 |
| Ads first_open | 55 |
| DB first_open (Android unique users) | 8 |
| Install → DB first_open | 8/88 = 9.1% |
| Ads first_open → DB first_open overlap | NOT AVAILABLE |

**ADS → DB USER JOIN: UNAVAILABLE** for campaign `23986249354`. Typed `campaign_id` / `utm_campaign` never equal `23986249354`. `install_source = google_ads` labels **2** users (same 2 have nonempty `gclid`). That is not a verified campaign-level join to the 88 installs.

Do **not** call the remaining 33 Ads installs “never opened.” Ads already records 55 Firebase `first_open`. The DB drop 55 → 8 is an **instrumentation / ingest** gap on the WebView product spine, not proof of non-open.

Firebase Auth creates **7** match **7 new `subscriptions` rows** in this window, and those 7 sit inside the 12 Android analytics users. That is **ACCOUNT-WIDE**, not Ads-attributed.

---

## 2. Production DB source verification

| Field | Value |
|---|---|
| PRODUCTION DATABASE | Coolify-managed PostgreSQL on Hetzner (not Render) |
| HOST/IDENTIFIER | Worker private path `10.0.0.2:5432` → server `inet_server_addr` `10.0.2.7`; Coolify resource id `tcl9udyxcuq2zu598ebj0pfu` (internal Docker name; does not resolve off-VPS) |
| DATABASE | `postgres` |
| SOURCE OF TRUTH | Coolify production (`AMYNEST_ENV` / `NODE_ENV` production on the live API plane `188.245.208.126`; `https://www.amynest.in/api/health` HTTP 200) |
| ACCESS STATUS | **READ-ONLY QUERY SUCCEEDED** from the Hetzner worker using existing deploy SSH + worker `DATABASE_URL` (credentials not recorded) |

Identity checks that this is Coolify production, not a stale Render copy:

- Database name `postgres`, 143 public base tables (matches 25 Sep 2026 Coolify restore certification).
- Host is **not** `dpg-d85k80jtqb8s7382m7lg-a` (retired Render).
- Session `TimeZone` is `Asia/Calcutta`.
- Tables present: `analytics_events`, `parent_profiles`, `subscriptions`, `billing_audit_events`, `revenuecat_webhook_events`.

Paths that are **not** production for this forensic:

- Render Postgres: retired/suspended; **not queried**.
- Coolify internal hostname from the laptop: DNS fail.
- Public `188.245.208.126:5432`: TCP timeout (closed).
- Local Homebrew `127.0.0.1:5432`: scratch/dev only; **not queried**.
- 25 Sep escrow dump: plaintext wiped; too incomplete for this full window anyway.

Admin UI `/admin/growth/ads-health` was open as `demo@amynest.in` and stayed on “Loading section…” — not used as a data source (unauthenticated admin API is HTTP 401).

---

## 3. Data access

Read-only `psql` from worker → private Postgres. No writes, no schema changes, no deploys.

Spine used: `analytics_events` (`user_id`, `event_name`, `props` JSONB, `platform`, `app_version`, `client_ts`, `server_ts`). Attribution is expected on `props` (`gclid`, `gbraid`, `wbraid`, `utm_*`, `install_source`, Play referrer), attached client-side by `install-attribution.ts` / `analytics-service.ts`. `parent_profiles` has **no** attribution columns.

Product `first_open` is JS `AnalyticsService.trackAppOpen()` (not Firebase AUTO). Pre-auth ingest is supposed to store `user_id = device:{deviceId}`. In this window that path produced **zero** rows.

---

## 4. First open analysis

Actual Android event names in Window A (top of catalog; full 37 names queried):

`performance_metric`, `navigation`, `screen_view`, `screen_leave`, `onboarding_funnel_event`, `subscription_funnel_event`, `app_open`, `session_start`, `onboarding_started`, `onboarding_milestone`, `premium_paywall_viewed`, `streak_updated`, `first_value_achieved`, `today_nrt_shown`, `paywall_view`, `first_plan_generated`, **`first_open`**, `install_source`, `routine_opened`, `routine_viewed`, `dashboard_view`, `first_plan_action_started`, `device_registered`, `child_created`, `growth_funnel_event`, `onboarding_completed`, `routine_generated`, `pre_signup_signup_started`, `checkout_started`, `subscribe_clicked`, …

**Not present** in Android Window A rows: `speech_coach_v2_session_start`, `speech_coach_entry`, `speech_coach_trial_started`, `upgrade_completed`, `purchase_success`, `pre_signup_signup_completed`, `start_trial` / `trial_started` step.

### first_open totals

| Slice | Events | Unique users |
|---|---:|---:|
| Android | 9 | 8 |
| iOS | 1 | 1 |
| `device:` pre-auth | 0 | 0 |
| Authenticated `user_id` (Android) | 9 | 8 |

Duplicates: **1** Android user has 2 `first_open` rows (max per user = 2).

`app_version` on every Android event in the window, including `first_open`: **`unknown`**.

### Daily Android `first_open` vs Ads

| Date | Ads first_open | Ads Play installs | DB unique first_open | DB first_open events |
|---|---:|---:|---:|---:|
| 25 Sep | 6 | 13 | 0 | 0 |
| 26 Sep | 4 | 10 | 2 | 2 |
| 27 Sep | 16 | 24 | 3 | 3 |
| 28 Sep | 10 | 11 | 1 | 1 |
| 29 Sep | 4 | 9 | 1 | 1 |
| 30 Sep | 9 | 12 | 1 | 1 |
| 1 Oct | 6 | 9 | 1 | 1 |
| **Window A** | **55** | **88** | **8** | **9** |

25 Sep: Android analytics had **59 events / 1 user / 0 first_open** (a returning session). Ads had 13 installs that day.

Mean `server_ts - client_ts` on Android `first_open` ≈ **-403035 s** (client clock ahead). Ordering used **`server_ts`**.

---

## 5. Attribution join

| Signal | Android Window A |
|---|---|
| Events | 5337 |
| Unique users | 12 |
| `gclid` nonempty | 18 events / **2 users** |
| `gbraid` / `wbraid` nonempty | 0 |
| `utm_source` / `utm_campaign` nonempty | 0 |
| Typed `campaign_id` or `utm_campaign` = `23986249354` | **0** |
| `props` text contains `23986249354` | **1** row (`install_source` event, 26 Sep; typed campaign/utm/gclid keys empty) |
| `install_source = google_ads` | 20 events / **2 users** |
| `install_source = organic` | 53 events / 10 users |
| `install_source` null | 5264 events / all 12 users (most events never got the attach) |
| `gclid` users ∩ `google_ads` users | **2 = 2** |

`first_open` install_source split: `google_ads` 2 users, `organic` 6 users. Those `google_ads` first_open rows themselves had **no** `gclid` key; gclid appears on other events for the same 2 users.

Campaign `23986249354` cannot be joined to internal users. Possible chain Google Ads → referrer → analytics → auth **is not observed at campaign granularity**. Play referrer capture exists in code; it did not populate typed campaign fields for this window except one opaque JSON substring.

**ADS → DB USER JOIN: UNAVAILABLE**

---

## 6. 33-install gap

Known: 88 Play installs, 55 Ads `first_open` (account-wide Ads = this campaign).

| If we used DB first_open = 8 | Interpretation |
|---|---|
| vs Ads 55 | DB is **far below** Ads. Not “Ads over-counted 33.” Product JS `first_open` is missing for most Firebase opens. |
| vs Play 88 | 8/88 is not a never-open rate. Ads already has 55 native Firebase opens. |
| 33-install (88−55) | **Still not decided** by this DB. Needs GA4 unique `first_open` (blocked separately). |

**Do not label the 33 as never opened.** Supported statement: **the production `analytics_events` spine does not see most Play installs or most Ads first_opens.**

---

## 7. Account-wide funnel (Android, Window A)

Population = **12** users who emitted any Android analytics event. **Not** the 88 Ads installs.

| Stage | Unique users | Events | From previous | From first_open (8) |
|---|---:|---:|---:|---:|
| Any Android event | 12 | 5337 | — | — |
| First open | 8 | 9 | 8/12 = 67% | 100% |
| Signup (`growth_funnel_event` step `signup_completed`) | 6 | 6 | 6/8 = 75% | 75% |
| Onboarding completed (event or funnel `finish_clicked` / `onboarding_completed`) | 6 | 6 named + funnel | 6/6 = 100% | 75% |
| First plan generated | 6 | 10 | 6/6 = 100% | 75% |
| Speech Coach (`speech_coach_v2_session_start` / `speech_coach_entry`) | 0 | 0 | — | 0% |
| Trial started (funnel step / `speech_coach_trial_started`) | 0 | 0 | — | 0% |
| Paywall (`paywall_view` / `premium_paywall_viewed` / funnel paywall steps) | 4 | 26 named + funnel | — | 4/8 = 50% |
| Begin checkout (`checkout_started` / funnel `checkout_started` / `subscribe_clicked`) | 1 | 1 + 1 | 1/4 | 1/8 |
| Purchase (`upgrade_completed` / `purchase_success` / funnel `purchase_success`) | 0 | 0 | 0/1 | 0% |

Related: `onboarding_started` 10 users; `child_created` 6; `pre_signup_signup_started` 4; `pre_signup_signup_completed` **NOT FOUND**. Subscription funnel also has `paywall_viewed` 4 users, `trial_paywall_shown` 2, `purchase_cancelled` 1, `trial_started` step **ZERO**. `winback_blocked_loading` fired for all 12.

Speech Coach event names: **NOT FOUND** in this Android window (not merely zero on a row that exists elsewhere that week).

---

## 8. Ads-attributed funnel

Campaign-level Ads-attributed users in DB: **NOT AVAILABLE**.

Proxy **not equal to campaign 23986249354**: `install_source = google_ads` (**2 users**).

| Stage | google_ads-labeled users (n=2) |
|---|---:|
| First open | 2 |
| Signup | 2 |
| Onboarding | 2 |
| First plan | 2 |
| Speech Coach | 0 |
| Trial started | 0 |
| Paywall | 1 |
| Checkout | 0 |
| Purchase | 0 |

Do not scale 2 → 55. Do not call these the Ads 55.

---

## 9. Billing / revenue cross-check

**REVENUE DATA: ACCOUNT-WIDE ONLY.** No join to campaign `23986249354`.

| Source | Window A |
|---|---|
| `subscriptions` created | **7** (4 FREE, 2 EXPIRED, 1 TRIAL/`trialing`; `store` null) |
| `subscriptions` updated | 8 |
| `parent_profiles` created | 6 |
| Android analytics users ∩ new subscriptions | **7** |
| Android `first_open` ∩ new subscriptions | **7** (of 8) |
| `billing_audit_events` | `subscription_reconciled` 140 / 5 users; `entitlement_removed` 84 / 3; `entitlement_granted` 56 / 2; webhook applied/received 1 each |
| `revenuecat_webhook_events` | **1 × `RENEWAL`** |
| Analytics purchase events | **0** |
| Ads purchase / IAP / begin_checkout | 0 / 0 / 0 |

The 1 TRIAL row is billing state, not a `trial_started` analytics event. The 1 checkout user cancelled (`purchase_cancelled`). Entitlement_granted on 2 users is **not** mapped to the 88 installs.

---

## 10. Release correlation

Every Android analytics row in Window A has `app_version = unknown` (5337/5337, 12/12 users). No build boundary can be read from this table. Missing events cannot be blamed on a specific Play version from DB evidence.

---

## 11. Data quality

| Check | Result |
|---|---|
| Duplicate `first_open` | 1 user, 2 events |
| Duplicate signup / trial / purchase | signup 6 events / 6 users; trial 0; purchase 0 |
| Duplicate checkout | 1 event / 1 user |
| `device:` → authenticated | **No `device:` rows at all** in Window A (any platform). Pre-auth spine absent. |
| Missing user ids | none in selected rows (`user_id` NOT NULL) |
| Timezone | DB session `Asia/Calcutta`; window bound with `+05:30` on `server_ts` |
| Client vs server | large negative skew on `first_open`; `server_ts` used |
| Late events | not proven; 25 Sep has activity without `first_open` |
| Old builds | version field is `unknown`, not an old semver |
| Android vs web | funnel restricted to `lower(platform)='android'` |
| Test/internal users | **no test flag** on `analytics_events`; emails not queried. Exclusion rule: `device_header_missing` only. Internal testers may be inside the 12. |
| Deleted/anonymized | not detected |

---

## 12. Evidence table

| Stage | Account-wide DB | Ads-attributed | Ads count | Status |
|---|---:|---:|---:|---|
| Play installs | — | 88 | 88 | VERIFIED (Ads) |
| First open | 8 unique / 9 events (Android) | UNAVAILABLE | 55 | DB VERIFIED; Ads join UNAVAILABLE |
| Signup | 6 | UNAVAILABLE (proxy 2 google_ads) | — | ACCOUNT-WIDE VERIFIED |
| Onboarding | 6 | UNAVAILABLE (proxy 2) | — | ACCOUNT-WIDE VERIFIED |
| First plan | 6 | UNAVAILABLE (proxy 2) | — | ACCOUNT-WIDE VERIFIED |
| Speech Coach | 0 | UNAVAILABLE | — | NOT FOUND in Android window |
| Trial | 0 analytics; 1 new `subscriptions` TRIAL | UNAVAILABLE | — | ANALYTICS ZERO; BILLING ACCOUNT-WIDE |
| Paywall | 4 | UNAVAILABLE (proxy 1) | — | ACCOUNT-WIDE VERIFIED |
| Begin checkout | 1 | UNAVAILABLE (proxy 0) | 0 | DB 1 ACCOUNT-WIDE; Ads 0 |
| Purchase | 0 | UNAVAILABLE | 0 | EXISTS — ZERO (analytics); Ads ZERO |

---

## 13. Primary diagnosis

Evidence-supported, in order:

1. **E. Analytics instrumentation problem** — strongest. Native Ads/Firebase `first_open` = 55; product `analytics_events.first_open` = 8; pre-auth `device:` ingest = 0; `app_version` always `unknown`; most events lack `install_source`. The WebView JS spine is not measuring Play opens.
2. **F. Insufficient data** for the 88-install Ads cohort. No campaign join.
3. **B. Activation problem** — only **inside the 12 observed Android users**: 8 first_open → 6 signup/onboarding/plan; Speech Coach 0; trial analytics 0. Do not apply this rate to 88 or 55.
4. **C. Monetization problem** — among observed users: paywall 4, checkout 1 then cancel, purchase 0. RC window is 1 renewal account-wide. Not Ads-attributed.
5. **D. Attribution problem** — product `install_source=google_ads` only 2 users; campaign id not stored as a typed field. Cannot confirm Ads 55 ⊂ DB 8 or the reverse.
6. **A. Install → open problem** — **NOT PROVEN** by this DB. Ads 55 first_open contradicts “33 never opened.”

---

## 14. Remaining unknowns

- GA4 unique Android `first_open` (consent blocked; stopped for this pass).
- Whether the 8 DB first_open users are a subset of the 55 Ads first_open users.
- Why `device:` pre-auth events are zero (ingest broken vs first_open only after login).
- Why `app_version` is `unknown` on Android WebView.
- Whether Play Install Referrer is populated in the wrapper for campaign `23986249354`.
- Whether any of the 12 users are internal testers.

---

## 15. Next engineering action

Keep Ads **unchanged** (₹400/day, bidding, geo, conversion actions).

Engineering, not Ads:

1. Fix Android WebView so `first_open` / `install_source` flush **pre-auth** (`device:` rows) with Play referrer, `gclid`/`gbraid`, and a real `app_version`.
2. Re-query Window A after that ships; until then DB cannot certify the 88-install funnel.
3. Optional later: GA4 unique `first_open` with `analytics.readonly` to decide the 88→55 gap. Not required to conclude the DB join is incomplete.

---

*Read-only investigation. No Ads, schema, production writes, or deploys.*
