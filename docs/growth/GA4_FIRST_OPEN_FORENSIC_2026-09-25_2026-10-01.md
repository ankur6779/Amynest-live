# GA4 first_open forensic — 25 Sep 2026 to 1 Oct 2026

**Window:** 25 Sep 2026 00:00 through 1 Oct 2026 23:59, Asia/Calcutta  
**2 Oct:** excluded from window totals (partial; not mixed)  
**Google Ads campaign:** `23986249354`  
**Ads action:** NO CHANGE  
**Budget:** ₹400/day — UNCHANGED  
**Bidding:** UNCHANGED  
**Geo:** UNCHANGED  
**Purchase conversion:** PRIMARY / UNCHANGED (`7665026069`)

**Final status:** `GA4 FORENSIC BLOCKED — ANALYTICS READ ACCESS UNAVAILABLE`

This file records verified reads only. Missing GA4 unique-user counts are not estimated.

---

## 1. Authentication status

| Field | Value |
|---|---|
| AUTH ACCOUNT | `ankur6779@gmail.com` (email verified) |
| GOOGLE CLOUD PROJECT | `amynest-836ff` / `573340015027` (AmyNest, ACTIVE) |
| FIREBASE PROJECT | `amynest-836ff` (CLI active project for this repo) |
| GA4 PROPERTY | `534309209` (`amynest-836ff`), Analytics account `392410187` |
| GA4 ACCESS STATUS | **READ BLOCKED** — OAuth token lacks `https://www.googleapis.com/auth/analytics.readonly` |

Firebase CLI login is valid. Token scopes are only:

- `email` / `openid` / `userinfo.email`
- `https://www.googleapis.com/auth/cloud-platform`
- `https://www.googleapis.com/auth/cloudplatformprojects.readonly`
- `https://www.googleapis.com/auth/firebase`

`gcloud` is also signed in as `ankur6779@gmail.com`. That identity has GCP scopes (`cloud-platform`, Compute, App Engine, SQL, Drive) — not Analytics.

GA4 Viewer / Analyst / Editor / Admin **role on the property was not readable**. Analytics Admin `GetProperty` returned `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`, not a property-ACL denial. Firebase `analyticsDetails` succeeded for this account, which confirms the Firebase↔GA4 link, not a Data API grant.

No access tokens, refresh tokens, or client secrets are recorded here.

---

## 2. GA4 access status

| Check | Result |
|---|---|
| Google Analytics Data API (`analyticsdata.googleapis.com`) | **ENABLED** on `amynest-836ff` |
| Google Analytics Admin API (`analyticsadmin.googleapis.com`) | **ENABLED** on `amynest-836ff` |
| Firebase Analytics BigQuery export | **NOT PRESENT** (BigQuery dataset list for the project is empty) |
| Data API `properties/534309209/metadata` | **403** `ACCESS_TOKEN_SCOPE_INSUFFICIENT` |
| Admin API `properties/534309209` | **403** `ACCESS_TOKEN_SCOPE_INSUFFICIENT` |
| Stale `firebase-adminsdk-fbsvc@amynest-836ff` key on this machine | Token exchange **invalid_grant / Invalid JWT Signature** — not used |

Minimum legitimate grant for this forensic: **GA4 Viewer or Analyst** on property `534309209`, plus an OAuth token with **`analytics.readonly` only** (plus existing Firebase/GCP scopes if already granted). Owner/Admin is not required. A new service account was not created.

Firebase CLI cannot add Analytics scopes by itself (`firebase login --reauth` stays on Firebase/GCP scopes). `gcloud auth application-default login --scopes=...analytics.readonly...` can still mint a consent URL via the Cloud SDK client, with a warning that this scope will be blocked soon for the default client ID. Completing that consent requires the human Google account in a browser. That step was not completed in this session (Google sign-in password cannot be entered here).

---

## 3. Property / stream verification

Verified via Firebase Management `GET .../projects/amynest-836ff/analyticsDetails` (Firebase-scoped; not Data API):

| Resource | ID | App |
|---|---|---|
| GA4 property | `534309209` | displayName `amynest-836ff` |
| Android stream | `14777407204` | `1:573340015027:android:02ecf19e6840a03ba293c6` · `com.amynest.app` |
| iOS stream | `14869288128` | `1:573340015027:ios:53a95ea0d3e909bea293c6` · `com.amynest.app` |
| Web stream | `14421971096` | measurement `G-2EMXFM4GKP` |

Google Ads conversion action `7665026078` (`FIREBASE_ANDROID_FIRST_OPEN`) is linked to the same property id `534309209` and event `first_open`.

Property reporting timezone was **not** confirmed via Admin API (blocked). Ads and this forensic use **Asia/Calcutta**. If the GA4 property timezone differs, later unique-user totals can shift by a day boundary.

---

## 4. Unique `first_open`

**Window A (25 Sep–1 Oct 2026, Asia/Calcutta), Android intended:**

| Metric | Value |
|---|---:|
| TOTAL FIRST_OPEN EVENTS (GA4) | NOT AVAILABLE |
| UNIQUE FIRST_OPEN USERS (GA4) | NOT AVAILABLE |
| UNIQUE FIRST_OPEN USERS (GA4, Android stream `14777407204`) | NOT AVAILABLE |
| Ads-attributed `first_open` (`7665026078` `allConversions`) | **55** |
| Ads `metrics.conversions` on first_open | **0** (secondary action; volume is in `allConversions`) |

`user_pseudo_id` / app instance id: **NOT AVAILABLE** (Data API not callable).

Campaign / source dimensions (`sessionCampaignName`, `sessionSource`, `sessionManualAdContent`, `gclid` / `gbraid` / `wbraid`): **NOT AVAILABLE**.

---

## 5. Daily `first_open`

GA4 daily unique users and event counts: **NOT AVAILABLE**.

Ads-attributed `first_open` `allConversions` (campaign `23986249354` = account-wide for this action):

| Date | Ads attributed first_open | GA4 unique first_open users | GA4 first_open events |
|---|---:|---:|---:|
| 25 Sep 2026 | 6 | NOT AVAILABLE | NOT AVAILABLE |
| 26 Sep 2026 | 4 | NOT AVAILABLE | NOT AVAILABLE |
| 27 Sep 2026 | 16 | NOT AVAILABLE | NOT AVAILABLE |
| 28 Sep 2026 | 10 | NOT AVAILABLE | NOT AVAILABLE |
| 29 Sep 2026 | 4 | NOT AVAILABLE | NOT AVAILABLE |
| 30 Sep 2026 | 9 | NOT AVAILABLE | NOT AVAILABLE |
| 1 Oct 2026 | 6 | NOT AVAILABLE | NOT AVAILABLE |
| **Window A** | **55** | **NOT AVAILABLE** | **NOT AVAILABLE** |

2 Oct 2026 (partial, not in Window A): Ads first_open **5**, Play installs **9**. Do not fold into the 7-day totals.

---

## 6. Ads vs GA4 comparison

| Metric | Value |
|---|---:|
| Play installs (`7649483003`) | 88 |
| Ads first_open (`7665026078` allConversions) | 55 |
| Ads first_open account-wide vs campaign | **equal (55 = 55)** |
| GA4 unique first_open | NOT AVAILABLE |
| GA4 − Ads first_open gap | NOT AVAILABLE |
| Installs − GA4 first_open gap | NOT AVAILABLE |

Account-wide Ads first_open matching campaign 55 **rules out** “another Ads campaign ate the missing 33.” It does **not** decide never-open vs unattributed open.

---

## 7. 33-install gap analysis

Play installs 88 − Ads first_open 55 = **33**.

| Hypothesis | Verdict | Evidence |
|---|---|---|
| A. ~55 opened and ~33 never opened | **NOT PROVEN** | Needs GA4 unique `first_open` ≈ 55 (Android, same window) |
| B. More than 55 opened; Ads lost attribution | **NOT PROVEN** | Needs GA4 unique `first_open` > 55 |
| Other Ads campaigns | **RULED OUT** | Account-wide Ads first_open = campaign 55 |
| Play reporting delay as sole cause | UNLIKELY as sole cause | 25–28 Sep still show install > first_open after several days |
| Metric / timezone / platform mismatch | **OPEN** | GA4 not queried; property timezone unverified |

No difference is labeled an error. A vs B is **undecided**.

---

## 8. Funnel events (GA4)

GA4 existence, counts, unique users, Android split, and daily series for the names below: **NOT AVAILABLE** (Data API blocked). These are **not** marked NOT FOUND — the catalog was not readable.

| Event name | Ads | GA4 (this query) |
|---|---|---|
| `first_open` | 55 attributed (`7665026078`) | NOT AVAILABLE |
| `sign_up` | NOT IMPORTED (no conversion action by that name) | NOT AVAILABLE |
| `onboarding_completed` | NOT IMPORTED | NOT AVAILABLE |
| `first_plan_generated` | NOT IMPORTED | NOT AVAILABLE |
| `speech_coach_v2_session_start` | NOT IMPORTED | NOT AVAILABLE |
| `start_trial` | NOT IMPORTED | NOT AVAILABLE |
| `begin_checkout` | **EXISTS in Ads — ZERO** (`7665026090`) | NOT AVAILABLE |
| `purchase` | **EXISTS in Ads — ZERO** (`7665026069` PRIMARY) | NOT AVAILABLE |
| `in_app_purchase` | **EXISTS in Ads — ZERO** (`7665026081`) | NOT AVAILABLE |

Ads `session_start` (`7665026093`) allConversions in Window A = **56**. That is Ads-attributed session_start, not GA4 unique users, and not used as a stand-in for first_open unique users.

---

## 9. Firebase Auth cross-check

Account-wide Identity Toolkit `downloadAccount` (464 users, `createdAt` in Asia/Calcutta). **Not Ads-attributed.**

| Metric | Value |
|---|---:|
| New Auth accounts Window A | **7** |
| Auth last-login in Window A | **9** |
| New Auth accounts 2 Oct (partial) | **2** |
| Auth users all-time | **464** |

Daily Auth creates vs Ads first_open:

| Date | Ads first_open | Auth created (account-wide) |
|---|---:|---:|
| 25 Sep | 6 | 0 |
| 26 Sep | 4 | 1 |
| 27 Sep | 16 | 3 |
| 28 Sep | 10 | 1 |
| 29 Sep | 4 | 0 |
| 30 Sep | 9 | 1 |
| 1 Oct | 6 | 1 |
| Window A | 55 | 7 |

GA4 `sign_up` unique users: **NOT AVAILABLE**. No equality is forced with Auth 7.

If every Window A Auth create came from this campaign (not proven), Ads signup would be **at most 7 of 55** first_open users. Lower bound is **0**. Do not label 7 as campaign signups.

Providers all-time (not Window A): Google 317, Facebook 118, Apple 13, password 10, phone 6. No anonymous users in the dump.

---

## 10. Remaining blockers

1. **User OAuth consent for `analytics.readonly`** on `ankur6779@gmail.com`, then Data API `runReport` on property `534309209`, Android stream `14777407204`, dates `2026-09-25`–`2026-10-01`.
2. Confirm GA4 property timezone vs Asia/Calcutta.
3. After unique `first_open` is readable: compare to Ads 55 / Play 88; then query funnel event names without assuming they exist.
4. Production `analytics_events` still unreachable (not used as a substitute in this file).
5. **USER-LEVEL GA4 JOIN: NOT AVAILABLE** — no `user_pseudo_id`, install referrer, or click id export in this session. Do not manufacture a join to Ads.

Durable (non-expiring) re-auth command after consent, Viewer/Analyst is enough:

```bash
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/userinfo.email,openid"
```

Google currently warns that `analytics.readonly` on the default Cloud SDK client ID will be blocked later. If that happens, use a project-owned Desktop OAuth client (`--client-id-file`) with the same read-only scope. Do not grant Owner. Do not create a service account unless that later client path requires impersonation.

---

## Ads action

**NO CHANGE**

Campaign `23986249354` remains ENABLED. Incomplete GA4 access is not a reason to pause, retarget, change ₹400/day, change ₹200 CPI, change geo, or change conversion actions.

---

*Read-only investigation. No React, Android, Firebase event, Ads, budget, bidding, or production-data writes.*
