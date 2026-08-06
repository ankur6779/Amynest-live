# AmyNest V2 — Analytics Constitution V1

**Status:** Binding measurement law (architecture only)  
**Gate:** Sprint 3C-0 audit **FAILED** — no production analytics implementation until this constitution is approved and remediation AC met  
**Mode:** Remediation plan · No emitters · No Firebase / Google Ads / RevenueCat edits in this document’s delivery

---

## Preamble

Previous Ads spend failed because measurement optimized the wrong signals.

This constitution exists so that:

1. Exactly **five** North Star metrics define product success.  
2. Google Ads may optimize **only** real paid conversion.  
3. Every event has one owner, one exactly-once key, and one consumer class.  
4. RevenueCat remains entitlement truth; analytics never invents premium.  
5. Guest → account funnels never break attribution.

If a PR violates this document, it does not ship.

---

# PART A — Remediation plans (every FAIL)

For each finding: Root Cause · Correct Architecture · Migration · Rollback · Risk · Acceptance Criteria.

---

## A1. `begin_checkout` misuse

### Root Cause
`trackSubscriptionEvent({ event: "paywall_opened" })` also calls `trackFirebaseBeginCheckout`.  
Paywall **impression** was labeled as checkout **intent**. Google Ads (and humans) treat `begin_checkout` as funnel progress toward purchase. Curiosity became a conversion-like signal.

### Correct Architecture
| Layer | Rule |
|-------|------|
| Impression | `premium_view` (internal / optional Firebase custom) — **never** `begin_checkout` |
| Intent | `premium_checkout` / Firebase `begin_checkout` — **only** when user taps Continue / Subscribe / opens store sheet with a selected plan |
| Purchase | Firebase `purchase` (or single custom `v2_paid_conversion`) — store-confirmed only |

### Migration Strategy
1. Document freeze: no new callers of Firebase checkout from view events.  
2. Implementation sprint: remove `trackFirebaseBeginCheckout` from `paywall_opened` path.  
3. Keep `begin_checkout` only on: subscribe click, checkout start, native BillingBridge before Play sheet.  
4. Remap Google Ads: demote / unoptimize any conversion action fed by inflated checkout.  
5. Backfill: do not rewrite historical Ads data; start clean cohort date.

### Rollback Strategy
Flag `analytics_v2_core` off restores prior emitters only if explicitly needed for debug — **default rollback = stop V2 emitters**. Do not re-attach checkout to paywall view.

### Risk
Checkout volume drops sharply (correct). Stakeholders may think “funnel broke.” Communicate: volume was false.

### Acceptance Criteria
- [ ] Opening paywall / `/premium` does **not** emit Firebase `begin_checkout`.  
- [ ] `begin_checkout` fires at most once per checkout attempt (plan + session key).  
- [ ] Ads UI shows `begin_checkout` as **secondary / observe**, not primary optimize.

---

## A2. Purchase duplication

### Root Cause
Multiple layers fire “purchase” semantics:

1. Native Android: `purchase` **and** `app_store_subscription_convert` on RC success.  
2. JS: `purchase_success` → Firebase `purchase` + `app_store_subscription_convert` again.  
3. Product fan-out: `purchase_completed` + `premium_unlocked` + `feature_unlocked`.

One store charge can become many conversion-like events.

### Correct Architecture
| Concern | Owner | Emit |
|---------|-------|------|
| Store charge (Ads) | **Native SDK only** on Android/iOS; web Razorpay path once in JS | Exactly one Ads-facing purchase event |
| Product paid metric | V2 core `v2_paid_conversion` | Once per `transactionId` or RC entitlement grant id |
| Internal funnel aliases | Deprecated for Ads | Internal-only, optional, never Firebase purchase |

**Law:** One real money event → one Ads purchase signal. Prefer native ownership on shells; JS must no-op if native already logged.

### Migration Strategy
1. Choose **single Ads event name**: Firebase standard `purchase` (preferred) **or** `v2_paid_conversion` — not both as optimize targets.  
2. `app_store_subscription_convert`: demote to observe-only or stop emitting once Ads remapped.  
3. JS `trackFirebaseSubscriptionPurchase`: skip when `nativeAlreadyLogged === true` (bridge ack).  
4. Stop mapping `purchase_success` → three funnel unlock events for Ads; keep at most one internal `premium_unlocked` with once-key.

### Rollback Strategy
If purchase attribution under-counts: temporarily allow JS fallback **only when native log fails**, with once-key `rc_transaction_id`. Never dual-success.

### Risk
Under-count during migration if native fails silently. Mitigate with bridge ack + JS fallback once-key.

### Acceptance Criteria
- [ ] One Play/App Store success → ≤1 Firebase `purchase` in DebugView.  
- [ ] `app_store_subscription_convert` not an Ads optimize goal.  
- [ ] Restore never emits `purchase`.  
- [ ] Idempotent re-delivery of webhooks / finalize does not re-fire Ads purchase.

---

## A3. Guest → account identity stitching

### Root Cause
V2 guest session (`guestId`, age, name, worry) is local-only. Analytics identity is account/Firebase-oriented. WOW/mission as guest then signup **splits** the funnel; Ads/Firebase cannot join pre-auth value to paid user.

### Correct Architecture
```
anonymous_id = guestId (V2) | first_open device id fallback
     ↓
all V2 core events carry anonymous_id
     ↓
on account link / soft save:
  set user_id = firebase uid
  emit v2_identity_link { anonymous_id, user_id } exactly once
  subsequent events carry both until stable user_id-only
```

Server/product analytics and Firebase user properties must accept the stitch.  
**Do not** reset North Star progress on signup.

### Migration Strategy
1. Define `anonymous_id` = existing `V2GuestSession.guestId` when guest mode on.  
2. Persist stitch record locally + optional server.  
3. V2 emitters always attach `anonymous_id`.  
4. After link, attach `user_id`; keep `anonymous_id` on paid conversion for 30d join window.

### Rollback Strategy
If stitch bugs inflate users: stop emitting `v2_identity_link`; keep anonymous-only metrics; no entitlement impact.

### Risk
PII: never put child name in Ads/Firebase event params. Age band / worry id OK if product-approved.

### Acceptance Criteria
- [ ] Guest completes WOW → later signup → same `anonymous_id` on both events.  
- [ ] Paid conversion joinable to pre-auth mission complete.  
- [ ] No child name / free text in Ads payloads.

---

## A4. Five North Star metrics

### Root Cause
Metrics locked in Phase 8; no `lib/analytics/v2-core/` implementation. Legacy vanity/subscription events dominate.

### Correct Architecture

| # | Metric | Event name | Definition (freeze) |
|---|--------|------------|---------------------|
| 1 | 90s WOW | `v2_wow_completed` | Breath → first practice success in ≤90s from Front Door start |
| 2 | Mission completion | `v2_mission_started` + `v2_mission_completed` | Rate = completed / started (same session or same day key) |
| 3 | D1 return | `v2_d1_returned` | Open on calendar day D+1 after first open / soft-save cohort day 0 |
| 4 | Practice Day-3 | `v2_practice_day3` | ≥2 practice/mission completions by end of day 3 |
| 5 | Paid conversion | `v2_paid_conversion` | Store-confirmed pay **and** activated (≥1 practice/mission complete) |

**Nothing else is a V2 success metric.** Legacy events may continue as internal noise until deprecated; they must not enter Ads optimize or V2 dashboards as North Stars.

### Migration Strategy
1. Implement emitters behind `analytics_v2_core` (default OFF).  
2. Wire only the five (+ supporting started/identity as needed for denominators).  
3. Build internal dashboard / BigQuery views for these five only.  
4. Ads restart only after Phase 8 gates on these metrics.

### Rollback Strategy
`analytics_v2_core` → OFF. Entitlements and UX unchanged.

### Risk
Partial flag-on cohorts: report rates only on `analytics_v2_core` exposed users.

### Acceptance Criteria
- [ ] Exactly five North Star definitions in code constants matching Phase 8.  
- [ ] QA-T10: each fires once per once-key in golden journeys.  
- [ ] No sixth “success” metric in V2 core package.

---

## A5. Once-event architecture

### Root Cause
`screen_view` uses `dedupe: false`. Subscription helpers fan out. Mission/Premium have no once-guards. Placeholders are no-ops (safe) but future naive wiring would explode.

### Correct Architecture
Every V2 event **must** declare:

```
exactlyOnceKey = f(eventName, identity, businessKey)
```

Storage: local (`localStorage` / IndexedDB) + optional server idempotency for paid.

| Event | Exactly-once key (minimum) |
|-------|----------------------------|
| `v2_wow_completed` | `wow:{anonymous_id}` |
| `v2_mission_started` | `mission_start:{anonymous_id}:{missionId}:{dateKey}` |
| `v2_mission_completed` | `mission_done:{anonymous_id}:{missionId}:{dateKey}` |
| `v2_d1_returned` | `d1:{anonymous_id}:{cohortDay0}` |
| `v2_practice_day3` | `day3:{anonymous_id}` |
| `v2_paid_conversion` | `paid:{transactionId\|rcEntitlementGrantId}` |
| `v2_identity_link` | `link:{anonymous_id}:{user_id}` |
| `premium_view` | `prem_view:{anonymous_id}:{dateKey}` or session |
| `premium_checkout` | `prem_chk:{anonymous_id}:{plan}:{attemptId}` |
| `premium_purchase` | same as paid / transaction id |
| `premium_restore_*` | `prem_restore:{anonymous_id}:{dateKey}:{result}` |
| `premium_already` | `prem_already:{anonymous_id}:{dateKey}` |
| `premium_fail` | `prem_fail:{anonymous_id}:{attemptId}` |
| `premium_offline` | `prem_off:{anonymous_id}:{sessionId}:{context}` |

**Law:** Re-render, restart, success-screen revisit, finalize poll → **no second emit**.

### Migration Strategy
Shared `v2Once.tryEmit(key, () => sink...)` used by all V2 emitters. Unit tests for double-call.

### Rollback Strategy
Once-store corruption: clear V2 once keys only (never entitlements).

### Risk
Over-aggressive keys hide real second purchases — paid key **must** be transaction-scoped, not user-scoped lifetime (except wow/day3 which are lifetime/cohort).

### Acceptance Criteria
- [ ] Double invoke in tests → single sink call.  
- [ ] App restart after mission complete → no second `v2_mission_completed`.  
- [ ] Two distinct store transactions → two paid events.

---

## A6. Impression vs intent vs purchase

### Root Cause
Collapsed layers: view ≈ checkout ≈ purchase in naming and Ads linkage.

### Correct Architecture

```
IMPRESSION     →  saw surface (Today, Premium, Mission card)
INTENT         →  explicit commit (Start mission, Continue to pay, store sheet)
PURCHASE       →  money captured (RC / Play / App Store / Razorpay verified)
STATE          →  already_premium / offline / fail / restore (not purchase)
```

| Surface | Impression | Intent | Purchase |
|---------|------------|--------|----------|
| Today | `today_viewed` (session once) — **supporting**, not North Star | `v2_mission_started` | n/a |
| Mission | card visible ⊂ today | start | n/a — complete is product success not pay |
| Premium | `premium_view` | `premium_checkout` + Firebase `begin_checkout` | `v2_paid_conversion` + Firebase `purchase` |

### Migration Strategy
Rename/split in V2 package only; do not “fix” legacy names in place for Ads — cut Ads from legacy view path first.

### Rollback Strategy
Stop V2 supporting events; North Stars remain.

### Risk
Extra supporting events tempt vanity dashboards — keep supporting list short and internal-only unless listed below.

### Acceptance Criteria
- [ ] Taxonomy doc maps every V2 event to exactly one layer.  
- [ ] Ads optimize list contains only PURCHASE layer.

---

## A7. RevenueCat ownership

### Root Cause
Analytics sometimes treats product flags (`premium_unlocked`) as equivalent to store purchase. Entitlement sync and analytics purchase can race or double.

### Correct Architecture
| Authority | Owns |
|-----------|------|
| **RevenueCat + server `/api/subscription`** | Whether user **is** premium |
| **Native purchase success / verified webhook** | Whether to emit **paid** analytics |
| **V2 unlock UI** | Reads `entitlements.isPremium` only — never emits purchase |

Analytics must not grant premium.  
Restore: entitlement refresh only; analytics = `premium_restore_success` / fail — **never** `purchase`.

### Migration Strategy
Paid emit after finalize confirms `isPremium` **and** store transaction id present (or RC non-anonymous purchase).  
Upsell / post-purchase UI must not emit a second paid event without new transaction id.

### Rollback Strategy
If under-count: log internal `paid_emit_skipped` reason — still no fake purchase.

### Risk
Trialing vs paid: North Star **Paid conversion** = real money, not trial start.

### Acceptance Criteria
- [ ] Trial start ≠ `v2_paid_conversion`.  
- [ ] Restore ≠ `v2_paid_conversion`.  
- [ ] Already premium screen ≠ purchase.  
- [ ] Unlock UI without new charge ≠ purchase.

---

## A8. Ads optimization signal

### Root Cause
Campaign optimized as if subscription conversions existed while volume was installs / empty purchase; checkout misuse would teach wrong intent.

### Correct Architecture
| Ads role | Event |
|----------|-------|
| **Primary optimize (only)** | Firebase `purchase` **or** single custom `v2_paid_conversion` — pick one in Ads UI |
| **Observe / gate only** | WOW, mission complete, D1, Day-3 |
| **Never optimize** | `begin_checkout`, `sign_up`, install, paywall view, restore, fail, offline, already_premium, screen_view |

Ads restart only when Phase 8 gates hold (7-day trailing) **and** this constitution’s purchase hygiene AC is green.

### Migration Strategy
1. Freeze spend (already paused per MVP).  
2. Remap conversion actions before any restart.  
3. Primary goal = real purchase only.  
4. Document conversion action IDs in runbook.

### Rollback Strategy
Pause campaigns. Do not re-enable install-optimize as substitute.

### Risk
Learning period with low volume after cleanup — expected.

### Acceptance Criteria
- [ ] Written Ads checklist: primary conversion = purchase only.  
- [ ] `begin_checkout` and `sign_up` not primary bidding goals.  
- [ ] Audit re-run section 10 = PASS.

---

## A9. Firebase event ownership

### Root Cause
Firebase used as dumping ground for product funnel aliases and dual convert events.

### Correct Architecture
Firebase may receive **only**:

| Event | Purpose |
|-------|---------|
| `purchase` | Ads + ecommerce (single) |
| `begin_checkout` | Intent only |
| `sign_up` | Account create (observe) |
| Optional: `v2_*` custom | North Stars if product chooses Firebase as sink |

**Must not** use Firebase for: paywall view aliases, `premium_unlocked` fan-out, module zoo, screen_view spam as conversions.

Internal product taxonomy → AmyNest analytics pipeline (`AnalyticsService` / server). Cross-emit to Firebase only through a **Firebase sink adapter** owned by V2 core.

### Migration Strategy
Introduce `V2AnalyticsBus` → sinks: `InternalSink`, `FirebaseSink` (allowlist), `NoAdsSink`.  
Legacy `subscription-analytics` Firebase side-effects disabled when `analytics_v2_core` on (or permanently removed for view→checkout).

### Rollback Strategy
`analytics_v2_core` off; legacy path documented as deprecated debt.

### Risk
Two systems during dual-run — report only V2 core for North Stars.

### Acceptance Criteria
- [ ] Allowlist of Firebase event names in code.  
- [ ] CI/test fails if non-allowlist Firebase emit added from V2 package.

### Sink failure strategy (binding)

See [ANALYTICS_SINK_FAILURE.md](./ANALYTICS_SINK_FAILURE.md).

- Sink failures **never** block product UX.  
- Bus does not await sink success; exceptions are swallowed.  
- Events **may be dropped** after once-key claim (no reopen).  
- Debug-only health: Accepted / Dropped / Rejected / Duplicate — **no production UI**.

---

## A10. Native vs JS ownership

### Root Cause
Android WebView requires native Firebase for reliable app attribution; JS Firebase also logs; BillingBridge already logs checkout + purchase. Unclear single writer.

### Correct Architecture

| Platform | Checkout (`begin_checkout`) | Purchase (`purchase`) |
|----------|----------------------------|------------------------|
| **Android wrapper** | Native BillingBridge (before sheet) = **sole** writer | Native on RC success = **sole** writer |
| **iOS Capacitor** | Native RC/IAP path = sole writer (mirror Android law) | Native sole writer |
| **Web / PWA** | JS sole writer | JS sole writer after Razorpay verify |
| **JS in native shell** | **Forbidden** for Firebase purchase/checkout if native ack | Same |

Bridge returns `{ analyticsLogged: true }` so JS skips.

### Migration Strategy
1. Spec bridge ack field.  
2. JS attribution functions early-return when shell + ack.  
3. Integration test: mock shell → JS does not double-log.

### Rollback Strategy
If native logging broken: JS fallback with once-key + alert/metric `analytics_native_fallback`.

### Risk
Old APKs without ack → temporary dual risk; gate by bridge version (already used for `sign_up`).

### Acceptance Criteria
- [ ] On current Android build: one checkout + one purchase per success in Logcat.  
- [ ] JS unit test proves skip when `analyticsLogged`.  
- [ ] Web path still logs once.

---

# PART B — Event catalog (Constitution registry)

Legend: **Ads?** Firebase to Google Ads · **FB?** may hit Firebase · **Opt?** may be Ads optimize goal

| Event | Owner | Exactly-once key | Consumer | FB? | Ads? | Opt? | Never Opt? |
|-------|-------|------------------|----------|-----|------|------|------------|
| `v2_wow_completed` | Front Door / first practice | `wow:{anon}` | Product, Ads **gates** | optional | observe | **No** | Yes |
| `v2_mission_started` | Today mission | `mission_start:{anon}:{missionId}:{date}` | Product | optional | no | **No** | Yes |
| `v2_mission_completed` | Today mission | `mission_done:{anon}:{missionId}:{date}` | Product, Ads gates | optional | observe | **No** | Yes |
| `v2_d1_returned` | App session / bootstrap | `d1:{anon}:{cohortDay0}` | Product, Ads gates | optional | observe | **No** | Yes |
| `v2_practice_day3` | Practice counter | `day3:{anon}` | Product, Ads gates | optional | observe | **No** | Yes |
| `v2_paid_conversion` | Billing finalize (RC verified) | `paid:{transactionId}` | Product, **Ads** | yes (or map) | **yes** | **YES (only)** | — |
| `v2_identity_link` | Soft save / signup | `link:{anon}:{uid}` | Product joins | optional | no | **No** | Yes |
| `today_viewed` | Today shell | `today:{anon}:{sessionId}` | Internal | no | no | **No** | Yes |
| `premium_view` | Premium V2 | `prem_view:{anon}:{date\|session}` | Internal | no | no | **No** | Yes |
| `premium_checkout` | Premium V2 / legacy pay CTA | `prem_chk:{anon}:{plan}:{attemptId}` | Funnel | **yes** as `begin_checkout` | observe | **No** | Yes |
| `premium_purchase` | Same txn as paid | = paid key | Funnel alias of paid | via purchase | via purchase | only if ≡ paid | — |
| `premium_restore_success` | Premium / pricing restore | `prem_restore:{anon}:{date}:ok` | Internal | no | no | **No** | Yes |
| `premium_restore_fail` | Premium / pricing restore | `prem_restore:{anon}:{date}:fail` | Internal | no | no | **No** | Yes |
| `premium_already` | Premium V2 | `prem_already:{anon}:{date}` | Internal | no | no | **No** | Yes |
| `premium_fail` | Premium V2 | `prem_fail:{anon}:{attemptId}` | Internal | no | no | **No** | Yes |
| `premium_offline` | Premium V2 | `prem_off:{anon}:{session}:{context}` | Internal | no | no | **No** | Yes |
| Firebase `begin_checkout` | Native (shell) / JS (web) | per attempt | Ads observe | yes | observe | **No** | **Never optimize** |
| Firebase `purchase` | Native (shell) / JS (web) | per transaction | Ads | yes | yes | **Yes (only money event)** | — |
| Firebase `sign_up` | Auth / growth | `signup:{uid}` | Ads observe | yes | observe | **No** | **Never optimize** |
| Legacy `paywall_*` fan-out | Legacy (deprecate) | n/a | Internal debt | **forbidden** for checkout | no | **No** | Yes |
| `screen_view` / `navigation` | AnalyticsService | none (noisy) | Internal | no | no | **No** | Yes |

**Optimize allowlist (Ads):** `{ Firebase purchase | v2_paid_conversion }` — **cardinality one**.

---

# PART C — Analytics Constitution V1 (laws)

### Law 0 — Audit gate
No production V2 analytics code ships while Sprint 3C-0 audit remains FAIL. Remediation AC above must be re-audited to PASS.

### Law 1 — Five only
North Stars are exactly the five Phase-8 metrics. No sixth success metric in V2 core.

### Law 2 — Exactly once
Every V2 event has a declared once-key. No emit without `tryOnce`.

### Law 3 — Layer purity
Impression ≠ Intent ≠ Purchase ≠ State. Names and sinks must not cross layers.

### Law 4 — Ads purity
Google Ads may optimize **only** real store-confirmed payment. Never optimize checkout, signup, install, view, restore, or product unlock aliases.

### Law 5 — RevenueCat purity
RC/server own entitlement. Analytics never grants premium. Restore/trial/already ≠ paid.

### Law 6 — Firebase allowlist
Only allowlisted events may touch Firebase. Side-effects from legacy subscription helpers must not smuggle Ads signals.

### Law 7 — Native primacy
On Android/iOS shells, native SDK is sole writer for Firebase checkout/purchase when capable. JS must not double-write.

### Law 8 — Identity continuity
`anonymous_id` (guestId) stitches guest → account. Paid and WOW must join.

### Law 9 — Flag default off
`analytics_v2_core` defaults OFF. Rollback &lt;1h by flag. Entitlements untouched.

### Law 10 — No child PII in Ads
No child name, free-text worry, or health content in Firebase/Ads params.

### Law 11 — Premium V2 silence until wired
Until V2 emitters ship under this constitution, Premium V2 remains `analytics: "none"`. No half-wired vanity.

### Law 12 — Ads restart subordination
Ads spend resumes only after Phase-8 gates **and** Laws 4–7 green on a stable build.

---

# PART D — Implementation readiness checklist (future sprint — not now)

Do **not** execute until founder/staff approve this constitution.

1. [ ] Approve Analytics Constitution V1  
2. [ ] Re-audit 3C-0 → expect PASS on paper against this plan  
3. [ ] Sprint: strip view→`begin_checkout`; native/JS single writer  
4. [ ] Sprint: `v2-core` five metrics + once + identity  
5. [ ] Sprint: Premium V2 once-events  
6. [ ] Ads conversion action remap (human/ops)  
7. [ ] QA-T10 golden once-fire  
8. [ ] Final audit PASS → implementation considered done  

---

# PART E — Explicit non-goals (this document)

- Emitting events  
- Editing Firebase project / GA4 / Google Ads UI  
- Editing RevenueCat  
- Deleting legacy analytics in one big bang (debt accepted until after Ads remap)  
- Building Adaptive / vanity dashboards  

---

**End of Analytics Constitution V1.**  
Architecture only. Implementation remains **BLOCKED** until approval + remediation AC satisfied.
