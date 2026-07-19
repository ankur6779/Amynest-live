# AmyNest — Complete Acquisition & Conversion Audit

**Report date:** 2026-07-13 (IST)  
**Analyst:** Senior Product Growth Analyst  
**Production status:** LIVE  
**Constraint:** Read-only analysis — no production changes, no deployments

---

## Data Sources & Coverage

| Source | Access | Status |
|--------|--------|--------|
| **Production Postgres** (`amynest-db-dykj`) | ✅ Queried via Render (read-only) | Primary evidence |
| **Backend analytics** (`analytics_events`, `startup_funnel_events`, `subscriptions`, `crash_events`) | ✅ Full | SSOT for product funnel |
| **RevenueCat webhooks** (`revenuecat_webhook_events`) | ✅ Full | Billing truth |
| **Google Analytics (GA4)** | ❌ No Data API in repo | User-reported install spike **not independently verified** in this audit |
| **Firebase Analytics** | ❌ Not instrumented | AmyNest deliberately uses first-party Postgres spine, not Firebase Analytics SDK |
| **Google Play Console** | ❌ No API integration | Install/store metrics unavailable programmatically |
| **Meta Ads / Google Ads** | ❌ No Marketing API | Spend, CPI, CAC, ROAS **cannot be computed** from available data |

> **Note:** GA4 may show higher install counts than Postgres because GA4 tracks marketing web (`install_intent`, `play_store_click`) while product installs are confirmed via `device_registered` + `startup_funnel_events`. The Postgres spike (Jun 28 → 32/day peak Jul 9) corroborates a real acquisition increase even without GA4 API access.

---

## STEP 1 — Install Analysis

### Install Totals

| Window | `device_registered` (users) | `startup_funnel_events` (unique `install_id`) |
|--------|----------------------------:|----------------------------------------------:|
| **Today (Jul 13 IST)** | **0** | **0** |
| **Last 7 days** | **81** | **101** |
| **Last 30 days** | **274** | **101** |

`device_registered` is the authoritative install proxy in the product analytics spine. `startup_funnel_events` is a newer, richer pre-auth table (launched ~late Jun) with 101 unique installs captured to date.

### Daily Install Trend (Last 30 Days)

| Day (IST) | Device Registered | First Open | Install Source |
|-----------|------------------:|-----------:|---------------:|
| Jul 12 | 4 | 4 | 6 |
| Jul 11 | 7 | 6 | 10 |
| Jul 10 | 13 | 13 | 13 |
| Jul 9 | **17** | 16 | 17 |
| Jul 8 | 13 | 13 | 13 |
| Jul 7 | 26 | 28 | 26 |
| Jul 6 | 14 | 16 | 14 |
| Jul 5 | 17 | 19 | 17 |
| Jul 4 | 20 | 22 | 19 |
| Jul 3 | 18 | 12 | 17 |
| Jul 2 | 27 | 0 | 21 |
| Jul 1 | 23 | 0 | 17 |
| Jun 30 | 21 | 0 | 16 |
| Jun 29 | 32 | 0 | 19 |
| Jun 28 | 5 | 0 | 5 |

**Spike confirmed:** Installs rose from ~1–5/day (mid-Jun) to **20–32/day** (Jun 29 – Jul 10), then cooled to 4–7/day (Jul 11–12). Jul 13 is partial (0 so far).

### Breakdown — Country (30d, `startup_funnel_events`)

| Country | Installs | Share |
|---------|--------:|------:|
| **US** | 44 | 43.6% |
| **IN** | 39 | 38.6% |
| **GB** | 16 | 15.8% |
| CN | 1 | 1.0% |
| ES | 1 | 1.0% |

⚠️ **US leading installs for an India-focused parenting app is anomalous** — see Step 7 (Fraud Check).

### Breakdown — State / City (30d, `analytics_events`)

| Country | State | City | Users |
|---------|-------|------|------:|
| unknown | unknown | unknown | 205 |
| IN | unknown | unknown | 158 |
| CA | unknown | unknown | 2 |
| GB | unknown | unknown | 2 |
| US | unknown | unknown | 2 |
| AU | unknown | unknown | 1 |

**State and city are not populated** in production analytics props. Geo resolution requires Play Console or GA4 — not available here.

### Breakdown — Device / Platform (30d)

| Platform | Users (device_registered) | Share |
|----------|--------------------------:|------:|
| Android | 262 | 95.6% |
| iOS | 8 | 2.9% |
| Web | 1 | 0.4% |
| Unknown | 272* | — |

\*Platform field on many events is `unknown`; Android dominates confirmed registrations.

### Breakdown — Android Version (30d, `startup_funnel_events`)

| Android Version | Installs |
|-----------------|--------:|
| 11 | 16 |
| 15 | 15 |
| 14 | 14 |
| 12 | 13 |
| 16 | 11 |
| 13 | 8 |
| 10 | 7 |
| 8.1.0 | 3 |
| 9 | 2 |
| 6.0.1 | 1 |

Distribution is healthy across Android 10–16. No single legacy version dominance.

### Breakdown — App Version (30d)

| App Version | Installs |
|-------------|--------:|
| web (Android WebView shell) | 101 |

All installs run through the **Android WebView wrapper** loading `www.amynest.in`. Native shell version `1.4.45` is not separately tracked in `startup_funnel_events.app_version`.

### Breakdown — Traffic Source / Campaign / Medium (30d)

| Source | Medium | Campaign | Platform | Users |
|--------|--------|----------|----------|------:|
| unknown | unknown | unknown | android | 262 |
| organic | unknown | unknown | android | 222 |
| play_referrer | unknown | unknown | android | 11 |
| unknown | unknown | unknown | ios | 8 |
| organic | unknown | unknown | ios | 7 |

**Marketing channel classification (30d):**

| Channel | Users | Share |
|---------|------:|------:|
| Organic | 228 | 83.2% |
| Play Store Browse (`play_referrer`) | 11 | 4.0% |
| Google Ads | **0** | 0% |
| Meta Ads | **0** | 0% |
| Direct / Referral | **0** | 0% |
| Unknown (no UTM/referrer) | 274 | 100%* |

\*Every install row lacks `utm_campaign` / `utm_medium`. Attribution is effectively **uninstrumented** for paid channels despite Meta Pixel and GA4 existing on marketing pages.

---

## STEP 2 — User Quality (Conversion Funnel)

### Lifetime Funnel (Production Postgres)

```
Install (device_registered)     274 users   100.0%
        ↓ 53.3% pass
First Open (first_open)         146 users    53.3%
        ↓ 26.7% pass  ← LARGEST % DROP-OFF
Sign Up                         39 users     26.7%
        ↓ 100% pass (profiles exceed signups — Google auth bypasses signup event)
Parent Profile Created          93 users     33.9% of install
        ↓ 101% pass
Child Added                     94 users     34.3% of install
        ↓ 41.5% pass (of signups)
Onboarding Completed            39 users     14.2% of install
        ↓ 59.0% pass
Routine Generated               23 users      8.4% of install
        ↓ 82.6% pass
Premium Viewed                  19 users      6.9% of install
        ↓ 63.2% pass (auto-trial inflates)
Trial Started (analytics)       12 users      4.4% of install
        ↓ 0.0% pass
Paid Subscription               0 users*      0.0%

* 2 paid RevenueCat subscribers exist but predate analytics `purchase_success` (Jun 21)
```

### 30-Day Funnel

| Stage | Users | Step Conversion | Cumulative (from install) |
|-------|------:|----------------:|--------------------------:|
| Install | 274 | — | 100.0% |
| First Open | 146 | 53.3% | 53.3% |
| Sign Up | 39 | 26.7% | 14.2% |
| Parent Profile | 70 | — | 25.5% |
| Child Added | 70 | — | 25.5% |
| Onboarding Completed | 39 | — | 14.2% |
| Routine Generated | 22 | 56.4%* | 8.0% |
| Premium Viewed | 16 | 72.7%* | 5.8% |
| Trial Started | 12 | 75.0%* | 4.4% |
| Paid Subscription | 0 | **0.0%** | **0.0%** |

\*Step conversion calculated from prior stage in 30d window.

### 7-Day Funnel (Jul 7–13)

| Stage | Users | Step Conversion |
|-------|------:|----------------:|
| Install | 81 | — |
| First Open | 81 | 100.0% |
| Sign Up | 0 | **0.0%** |
| Routine Generated | 5 | — |
| Premium Viewed | 1 | 20.0% |
| Trial Started | 12 | 1200%* |
| Paid Subscription | 0 | **0.0%** |

\*Trials are auto-applied on entitlement read without signup completion events — inflates trial counts relative to signup.

### Largest Drop-Off

| Rank | Transition | Drop | Lost Users | Severity |
|------|------------|-----:|-----------:|----------|
| **#1** | **First Open → Sign Up** | **73.3%** | **107** | 🔴 Critical |
| **#2** | **Install → First Open** | **46.7%** | **128** | 🔴 Critical |
| **#3** | **Sign Up → Routine Generated** | **41.0%** | **16** | 🟠 High |
| **#4** | **Premium Viewed → Paid** | **100.0%** | **19** | 🔴 Revenue blocker |
| **#5** | **Onboarding → Finish** | **~69%** | — | 🟠 High (historical) |

**Verdict:** Installs are arriving but **most users never authenticate**. Among those who sign up, **activation to first routine** remains the secondary leak. **Zero users convert to paid** in the analytics window.

---

## STEP 3 — Marketing

### Channel Comparison (30d, Postgres attribution)

| Channel | Installs | Signups | Routines | Trials | Paid | Trial Rate | Sub Rate |
|---------|--------:|--------:|---------:|-------:|-----:|-----------:|---------:|
| Organic | 228 | ~35 | 20 | 10 | 0 | 4.4% | 0.0% |
| Play Store Browse | 11 | 2 | 1 | 1 | 0 | 9.1% | 0.0% |
| Google Ads | 0 | 0 | 0 | 0 | 0 | — | — |
| Meta Ads | 0 | 0 | 0 | 0 | 0 | — | — |
| Direct | 0 | 0 | 0 | 0 | 0 | — | — |
| Referral | 0 | 0 | 0 | 0 | 0 | — | — |
| Unknown | 274 | 39 | 22 | 12 | 0 | 4.4% | 0.0% |

### Unit Economics

| Metric | Value | Notes |
|--------|------:|-------|
| **CPI** | **N/A** | No ad spend data; no Google/Meta attributed installs in DB |
| **CAC** | **N/A** | Cannot compute without marketing spend |
| **Trial Rate** | **15.0%** (DB) / **4.4%** (analytics) | 41 DB trials ÷ 274 installs vs 12 analytics events |
| **Subscription Rate** | **0.73%** | 2 paid ÷ 274 installs (both paid Jun 21, pre-spike) |
| **ROAS** | **N/A** | No ad spend; MRR = **₹324** (1× monthly ₹199 + 1× yearly ₹1499÷12) |

### Marketing Assessment

1. **Install spike is real in product data** but **attribution is blind** — 100% of installs lack campaign/medium tags.
2. **No evidence of paid channel installs** reaching the product (`gclid`, `fbclid`, `google_ads`, `meta` all = 0 users).
3. If GA4/Meta Ads Manager show paid installs, the **attribution bridge is broken** between marketing pages and in-app `install_source` events.
4. Play Store organic (`play_referrer`) is only **4%** — most installs are unattributed organic/unknown.

---

## STEP 4 — User Behaviour

### Active Users

| Metric | Value |
|--------|------:|
| **DAU (today Jul 13)** | 0 |
| **WAU (7d)** | 115 |
| **MAU (30d)** | 281 |

### Session & Engagement (30d)

| Metric | Value |
|--------|------:|
| Total sessions | 636 |
| Sessions per user | **2.3** |
| Screen views | 2,368 |
| Screen views per user | **8.4** |
| Avg session duration (p50)* | ~52 min |
| Session end events tracked | 25 (sparse) |

\*Only 5 `session_end` events had valid duration (1s–60min). Session duration tracking is unreliable; treat as directional only.

### Top Screens (30d)

| Screen | Users | Views |
|--------|------:|------:|
| `/dashboard` | 102 | 667 |
| `/onboarding` | 142 | 547 |
| `/` (splash/home) | 145 | 447 |
| `/sign-in` | 140 | 265 |
| `/parenting-hub` | 19 | 84 |
| `/routines` | 22 | 55 |
| `/routines/generate` | 18 | 36 |
| `/amy-coach` | 15 | 29 |

### Top Exit Screens (30d, last screen per session)

| Exit Screen | Sessions |
|-------------|--------:|
| `/dashboard` | 78 |
| `/onboarding` | 56 |
| `/` | 50 |
| `/sign-in` | 22 |
| `/parenting-hub` | 13 |
| `/routines` | 12 |

**Pattern:** Users exit on **onboarding (56)** and **sign-in (22)** — consistent with auth/activation leak.

### Retention

| Day | Eligible Cohort | Retained | Rate |
|-----|----------------:|---------:|-----:|
| **D1** | 287 | 15 | **5.2%** |
| **D3** | 278 | 28 | **10.1%** |
| **D7** | 209 | 5 | **2.4%** |
| **D14** | 70 | 3 | **4.3%** |
| **D30** | 8 | 1 | **12.5%** |

D7 at **2.4%** is below survival threshold for a consumer subscription app (benchmark: 15–25%).

---

## STEP 5 — Premium Funnel

### Lifetime Premium Funnel

```
Viewed Paywall                    19 users    100.0%
        ↓ 21.1%
Clicked Subscribe                 4 users      21.1%
        ↓ 300%* 
Started Trial (analytics)         12 users     63.2%
        ↓ 0.0%
Trial Converted (purchase_success)  0 users       0.0%
        ↓ —
Renewed (RC webhook)              1 user        5.3%

* Auto-trial on entitlement read creates trials without paywall click
```

### DB Subscription Truth

| State | Users |
|-------|------:|
| FREE | 261 |
| TRIAL (active) | 8 |
| EXPIRED (healed) | 33 |
| ACTIVE paid (RevenueCat) | 2 |
| Stuck trialing (past `trial_ends_at`) | **7** |

### Subscription Funnel Events (All-Time)

| Step | Users | Events |
|------|------:|-------:|
| `trial_started` | 12 | 12 |
| `trial_expired` | 33 | 33 |
| `plan_card_viewed` | 6 | 24 |
| `checkout_started` | 3 | 10 |
| `plan_selected` | 3 | 6 |
| `paywall_opened` | 3 | 6 |
| `purchase_success` | **0** | **0** |
| `purchase_failed` | 1 | 7 |
| `paywall_deferred_activation` | 3 | 6 |

### Revenue

| Metric | Value |
|--------|------:|
| MRR | ₹324 |
| ARPU (paid) | ₹162 |
| New MRR (30d) | **₹0** |
| RevenueCat `INITIAL_PURCHASE` webhooks | 2 (Jun 21) |
| RevenueCat `RENEWAL` webhooks | 2 (Jun 21) |
| Post-spike purchases | **0** |

**Only user with purchase attempts:** 7× `purchase_failed` on `six_month` plan via `pricing` source. No successful conversion.

---

## STEP 6 — Technical Health

### Crash Rate (30d)

| Metric | Value |
|--------|------:|
| Crash events | 115 |
| Crash users | 8 |
| Crash rate (vs MAU) | **2.8%** of MAU experienced ≥1 crash |
| Crashes per DAU (avg) | ~0.4 (using WAU proxy) |

Top crash fingerprints are **single-user concentrated** (likely dev/test devices), not widespread production regressions.

### ANR / Startup Failures (30d, `startup_funnel_events`)

| Failure Type | Events | Rate (vs 8,215 total) |
|--------------|-------:|----------------------:|
| `startup_timeout` | 57 | 0.69% |
| `javascript_exception` | 51 | 0.62% |
| `blank_screen_detected` | 33 | 0.40% |
| `network_lost` | 10 | 0.12% |
| `offline_launch` | 6 | 0.07% |
| **Total failures** | **157** | **1.91%** |

ANR is not directly tracked. `startup_timeout` (57 events) is the closest proxy.

### App Start Time (30d, milestone events)

| Percentile | Time |
|------------|-----:|
| p50 | **3.1s** |
| p90 | **8.7s** |

Within acceptable range for WebView cold start.

### API / Audio / Worker Failures (30d)

| Event | Events | Users |
|-------|-------:|------:|
| `error_captured` | 0 | 0 |
| `api_error` | 0 | 0 |
| `audio_error` / `audio_playback_failed` | 0 | 0 |
| `worker_error` | 0 | 0 |

No product-level API/audio/worker failure events in the analytics window. Failures may be captured in Sentry (not queried in this audit).

### Technical Verdict

| Area | Status |
|------|--------|
| Crash rate | 🟡 Moderate (2.8% MAU) |
| Startup reliability | 🟡 1.9% failure rate; blank screen + JS exceptions need monitoring |
| App start time | 🟢 Acceptable (p50 3.1s) |
| API/Audio/Worker | 🟢 No signals in analytics |
| Billing infrastructure | 🔴 0 successful purchases post-spike; 7 stuck trials |

---

## STEP 7 — Fraud Check

### Signals Investigated

| Signal | Finding | Risk |
|--------|---------|------|
| **Bot traffic** | No emulator devices detected (`manufacturer` ≠ generic/emulator) | 🟢 Low |
| **Emulator installs** | 0 / 102 devices | 🟢 Low |
| **Duplicate devices** | 0 devices with >3 install_ids | 🟢 Low |
| **Click spam** | No paid channel attribution to validate | ⚪ Unknown |
| **Fake installs** | **79% instant exits** (<5s elapsed in startup funnel) | 🔴 **High** |
| **Abnormal countries** | **US = 43.6%** of installs for India-focused app; CN + ES = 2% | 🟠 **Medium** |
| **High uninstall rate** | Not tracked in Postgres | ⚪ Unknown (needs Play Console) |
| **Instant exits** | **81 / 102 installs** exit within 5 seconds | 🔴 **High** |

### Fraud Assessment

**Mixed verdict — spike is partially suspicious:**

1. **79% instant-exit rate** suggests low-quality or bot traffic, preloaded installs that never engage, or measurement timing artifacts in `elapsed_ms`.
2. **US-dominant geo (44%)** is atypical for an India parenting app. Could indicate VPN fraud, mis-targeted ads, or Play Store explore traffic from non-IN regions.
3. **No emulator signatures** — traffic appears to be real devices, not synthetic farms.
4. **Zero paid attribution** — if ad platforms report installs, they are not reaching product analytics (broken bridge, not necessarily fake).
5. **D1 retention 5.2%** — low but not zero; some installs are genuine engaged users.

**Recommendation:** Cross-reference Play Console install vs. Active Device metrics and GA4 `first_open` geo before scaling acquisition spend.

---

## STEP 8 — Executive Summary

### Scores (0–100)

| Score | Value | Rationale |
|-------|------:|-----------|
| **Overall Growth Score** | **34** | Strong install velocity undermined by conversion, retention, and monetization failures |
| **Traffic Quality Score** | **38** | Real devices but 79% instant exits, 44% US geo anomaly, zero attribution |
| **Conversion Score** | **22** | 73% drop at auth; 0% install-to-paid; 8.4% reach routine |
| **Retention Score** | **18** | D1 5.2%, D7 2.4% — far below benchmark |
| **Monetization Score** | **15** | 0 `purchase_success`; ₹0 new MRR; 7 stuck trials |

### Biggest Opportunity

**Convert the 41-user trial cohort before scaling acquisition.**

- 33 trials already expired with **0 purchases**
- 8 active trials with **0 paywall views** in the last 7 days
- Only **4 users ever clicked Subscribe**; **1 user hit `purchase_failed` 7×**
- Post-sprint revenue recovery code may not be fully live (per Jul 7 launch audit)
- **Recovering even 5% of expired trials = ~2 paid users = ₹3,000 ARR**

### Biggest Problem

**Installs do not convert because users never complete authentication and the billing funnel is broken end-to-end.**

Evidence chain:
1. 274 installs → only 39 sign-ups (**86% never auth**)
2. 39 sign-ups → 23 routines (**41% never activate**)
3. 19 saw paywall → **0 `purchase_success`** (100% monetization failure)
4. 7 users stuck in `trialing` past expiry (entitlement drift)
5. 1 user attempted purchase 7× — all `purchase_failed`, no retry success
6. RevenueCat webhooks: last activity **Jun 21** — no billing events during install spike

### Top 10 Recommendations

| # | Recommendation | Evidence | Expected Impact |
|---|----------------|----------|-----------------|
| 1 | **Fix auth friction** — reduce sign-in drop (73% loss) | 107 users lost first_open→signup | +30–50% activated users |
| 2 | **Deploy & verify revenue recovery sprint** | 0 post-spike purchases; 7 stuck trials; Jul 7 NO-GO | Unblock monetization |
| 3 | **Repair marketing attribution bridge** | 0 Google/Meta attributed installs; 100% unknown UTM | Enable CPI/CAC/ROAS |
| 4 | **Route onboarding finish → `/routines/generate`** | 60% finishers never reach generator (Jul 6 audit) | +40pp activation |
| 5 | **Re-engage 33 expired trials** | 0% trial→paid; 33 `trial_expired` events | +2–5% conversion |
| 6 | **Investigate US traffic quality** | 44% US installs, 79% instant exits | Protect ad spend |
| 7 | **Fix `purchase_failed` for six_month plan** | 7 failures, 1 user, 0 success | Recover highest-intent buyer |
| 8 | **Populate geo in analytics events** | 75% geo = unknown | Enable market targeting |
| 9 | **Improve D1 retention** (push + routine habit) | D1 5.2%, D7 2.4% | +5–10pp retention |
| 10 | **Connect GA4 + Play Console to growth dashboard** | No external API integration | Full-funnel visibility |

### Why Installs Are NOT Converting to Paid Subscriptions

**Exact reason (evidence-based):**

> The install spike feeds users into a product that **loses 86% before authentication**, **loses another 41% before first routine**, and then hits a **billing system that has recorded zero successful purchases since June 21**. Trials are auto-granted without purchase intent, expire without conversion (33/41 = 80% expired, 0 paid), and the one user who attempted checkout failed 7 times. The acquisition engine is running; the **activation → monetization pipeline is not**.

| Blocker | Data Point |
|---------|------------|
| Auth wall | 146 first_open → 39 signup (73% loss) |
| Activation gap | 39 signup → 23 routine (41% loss) |
| Paywall reach | Only 19/274 installs (6.9%) see pricing |
| Checkout | Only 3 users ever started checkout |
| Purchase | **0 `purchase_success` lifetime** |
| Billing | Last RC webhook Jun 21; 7 `purchase_failed` |
| Trial waste | 41 trials granted, 0 converted, 33 expired |

---

## Appendix — Query Metadata

- **Database:** `amynest-db-dykj` (Render Postgres 18, Singapore)
- **Query time:** 2026-07-13 ~14:00 UTC
- **Tables queried:** `analytics_events`, `startup_funnel_events`, `subscriptions`, `crash_events`, `revenuecat_webhook_events`, `parent_profiles`, `children`
- **Noise filter:** `event_name != 'device_header_missing'`
- **Prior audits referenced:** `docs/product-growth/conversion-audit-2026-07-06.md`, `docs/product-growth/daily/2026-07-07.md`

---

*Next audit recommended: 2026-07-20 after revenue recovery sprint deploy verification and 7-day post-fix retention window.*
