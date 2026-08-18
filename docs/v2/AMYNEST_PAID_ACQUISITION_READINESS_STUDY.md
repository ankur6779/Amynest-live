# AmyNest Paid Acquisition Readiness Study

**Status:** DECISION STUDY ONLY — NO CODE, NO CAMPAIGNS, NO PRICING, NO ANALYTICS CHANGES  
**Date:** 2026-08-18  
**Product release candidate:** `5bb33cc0` (Phase 3 + Phase 4 on `main`; current `main` also includes later AI commits)  
**Final post-Phase-4 product audit:** B. APPLE READY WITH CERTIFICATION DEBT (P0 = 0, P1 = 0, device accessibility outstanding)  
**This study answers:** should AmyNest restart paid acquisition **now**, with a scarce ~₹20,000 budget?

Number labels used throughout:

| Label | Meaning |
|---|---|
| **OBSERVED** | Counted in production Postgres / RevenueCat / dated audits |
| **CODE-VERIFIED** | Present in current repository production path; not proven live in Ads Manager |
| **UNKNOWN** | Cannot be measured in this environment or has no post-remediation sample |
| **MODELLED ESTIMATE** | Range from assumptions + historical rates; **not** a measured fact |

This environment could **not** query production Postgres, Play Console, Google Ads, GA4 Data API, or RevenueCat (MCP unauthenticated). Live August 2026 conversion is therefore **UNKNOWN**. All paid-user counts below are from dated production audits, not a fresh pull.

---

## 1. Executive verdict

### Should ads start now?

# LIMITED TEST ONLY

Not **YES** (scale or spend the full ₹20,000).  
Not a hard **NO** forever.  
**No uncontrolled Google Ads restart. No install-optimised UAC. No equal spend across countries.**

| Lens | Grade | One line |
|---|---|---|
| **Product readiness** | **Mostly yes** | Living universe + Phase 3/4 conversion remediation is a real product. Apple-audit B is craft, not demand. |
| **Funnel readiness** | **Improved in code, unproven in production** | Historical blockers (internal-trial = full premium, trial-ended page orphaned, paywall-before-value) are remediated in code. **Zero post-remediation paid conversions measured.** |
| **Traffic quality** | **Historically poor** | Jul 2026 spike: 79% instant exits; 44% US geo for an India parenting app; 0 Google Ads-attributed installs in product DB. |
| **Payment readiness** | **Code exists; live customer purchase uncertified** | Native Play `begin_checkout` / `purchase` are wired. Billing QA matrix is still unticked. Analytics `purchase_success` lifetime = **0** in every dated audit. |
| **Market demand** | **UNKNOWN** | Product quality ≠ willingness to pay. No post-living paid cohort. |
| **Retention** | **Historically fatal** | OBSERVED D1 **5.2%**, D7 **2.4%** (2026-07-13). Post-living retention **UNKNOWN**. |
| **Unit economics** | **Cannot compute** | No trustworthy CPI/CAC/ROAS. Last dated MRR **₹324** from **2** RevenueCat rows (2026-07-18), not from the install spike. |
| **Attribution** | **Partial** | Native Firebase purchase path exists. Several Google Ads events are missing or noisy. First-party `gclid` was **0** in July. |

### A vs B (mandatory distinction)

| Question | Answer |
|---|---|
| **A. Is the product much better than before?** | **YES.** Living universe, Home, routine R2/R3, Hub P0-6, Hard-Day P0-7, Speech/Health/Grow/Birth Sky P0, navigation, Amy AI, pricing sanctuary, Phase 3 free→premium honesty, Phase 4 Health Lab static preview + Speech V2 90s first-use. This is not the July product. |
| **B. Is there enough evidence that users will PAY now?** | **NO.** A does not prove B. Every production monetisation snapshot through 2026-07-18 shows **0 `purchase_success`**, **0 new MRR during the install spike**, and **2** RevenueCat `INITIAL_PURCHASE` events — both **2026-06-21**, before the cheap-install spike. Post-`5bb33cc0` paid conversion is **UNKNOWN**. |

**Do not spend the full ₹20,000. Do not optimise for installs. If a license-tester Play purchase cannot be proven in Firebase / Google Ads this week, spend ₹0 on ads.**

---

## 2. Historical baseline

### 2.1 What “3,500+ installs” is — and is not

The founder figure of **3,500+ installs** is treated as a **Play Console / store-reported** claim. This study **could not independently verify** that number (no Play Console API in-repo; no live DB).

Product analytics never showed 3,500 engaged users.

| Source | Window | Install proxy | Value | Label |
|---|---|---|---:|---|
| Conversion audit | through 2026-07-06 | `device_registered` users | **195** | OBSERVED |
| Same audit | context | “~600 installs” from acquisition reports | ~600 | OBSERVED (external, not Postgres) |
| Growth audit | 30d to 2026-07-13 | `device_registered` | **274** | OBSERVED |
| Growth audit | startup funnel unique `install_id` | **101** | OBSERVED |
| Growth audit | 7d | `device_registered` | **81** | OBSERVED |
| 24h health | ~2026-07-13→14 | app install events | **6** | OBSERVED |
| Play Console | — | store installs | **3,500+ claimed** | UNKNOWN in this study |

The gap (store thousands vs product hundreds) is the same pattern as **79% instant exits** in `startup_funnel_events` (81/102 installs elapsed <5s — OBSERVED 2026-07-13). Store install ≠ opened app ≠ signed-in parent ≠ activated user.

### 2.2 Funnel that actually ran (pre-living, OBSERVED)

Lifetime-ish funnel from `analytics-growth-report.md` (production Postgres, 2026-07-13):

```
Install (device_registered)     274    100%
First open                      146     53.3%
Sign up                          39     14.2%
Onboarding completed             39     14.2%
Routine generated                23      8.4%
Premium viewed                   19      6.9%
Trial started (analytics)        12      4.4%
Paid (analytics purchase_success) 0      0.0%
```

30-day paid: **0**.  
Checkout started (all-time in that audit): **3 users**.  
`purchase_failed`: **1 user, 7 events**, `six_month` via pricing.  
`purchase_success`: **0 users, 0 events**.

### 2.3 Two RevenueCat subscribers — do not treat as spike conversion

OBSERVED 2026-07-18 (`docs/ops/commercial-launch-billing-qa.md`, daily 2026-07-07):

| User prefix | Plan | Provider | State | Period end | Last RC event |
|---|---|---|---|---|---|
| CMrahNV1 | yearly | revenuecat | ACTIVE | 2027-06-14 | CUSTOMER_SYNC 2026-07-06 |
| batwvUd0 | monthly | revenuecat | ACTIVE | 2026-07-25 | CUSTOMER_SYNC 2026-07-06 |

RevenueCat webhooks all-time in that snapshot: `INITIAL_PURCHASE` ×2 and `RENEWAL` ×2, **all 2026-06-21**. **Post-spike purchases: 0.**

Dated MRR: **₹324**. Subscription rate if those 2 are counted against 274 installs: **0.73%** — but they **predate** the install spike, so they are **not** evidence that paid ads convert.

Whether those two rows are founder/test vs real customers is **UNKNOWN**. The founder statement “I have still not seen the first paid subscription” is treated as: **no Founder-visible customer conversion after the product work.** Analytics agrees: **0 `purchase_success`**.

By 2026-08-18 the monthly period (2026-07-25) would have expired unless renewed. Current paid count is **UNKNOWN**.

### 2.4 Why conversion was zero (mechanical, not aesthetic)

From `docs/product-growth/subscription-audit-2026-07-06.md` and `conversion-audit-2026-07-06.md`:

1. **Internal 3-day trial (`provider=none`) granted full premium.** `isPremium=true` hid Subscribe and showed Cancel. Highest-intent user (`iQEzeqb1`) hit checkout then **cancel agent / `technical_issues`**, never Play Billing.
2. **Trial-ended fullscreen existed but was not routed** (fixed in code 2026-07-20 recovery sprint; production proof still pending in that doc).
3. **Auth wall:** first_open → signup drop **73.3%** (107 of 146).
4. **Activation:** onboarding finish → `/routines/generate` drop **60%** when users landed on dashboard (Jul 6). Direct-to-generate day hit **75%** (3/4 on Jul 5) — small n.
5. **Retention:** D1 **4.4–5.2%**, D7 **2.4%**. A subscription app with D7 ~2% cannot pay back CAC.
6. **Attribution blind:** 100% of 30d installs lacked UTM; Google Ads attributed users in product DB = **0**.
7. **Traffic quality:** US 43.6% of startup-funnel installs; 79% instant exit.

### 2.5 What previous ads taught

| Lesson | Evidence | Label |
|---|---|---|
| Google Ads (or store) can buy **cheap installs** | Spike 20–32 `device_registered`/day late Jun–early Jul | OBSERVED |
| Install campaigns do **not** create subscribers | 0 paid during spike | OBSERVED |
| Product analytics did **not** see Google Ads | `gclid` / `google_ads` = 0 | OBSERVED |
| US-heavy install mix was **anomalous** for this product | 44% US vs India parenting app | OBSERVED, fraud-suspicious |
| Optimising for install volume is how you **light money on fire** | Historical recommendation: do not scale until funnel fixed | Prior study conclusion |

That recommendation still holds for **scale**. The only new question is whether a **tiny, conversion-instrumented test** is now justified.

---

## 3. What the 66K / living remediation changed

These are **mechanical** improvements. They raise the *ceiling* of conversion. They do not prove the *rate*.

### 3.1 Trust

| Change | Mechanical effect |
|---|---|
| Living universe + FA-02 production lock | One house, not a catalogue of leftover products. Reduces “this app is spamware” bounce. |
| P0-7 Hard-Day Law | Help first; no distress sell; no FOMO/unlock theatre on hard-day paths. Protects trust; **deliberately reduces** panic-paywall conversion. |
| Pricing sanctuary | `/pricing` is membership continuation, not neon SaaS. Displayed billed amount matches charge (India web ₹ overlay). |
| Phase 3 truthful trial copy | “Remaining in your AmyNest preview” / “You can use AmyNest for free” — stops lying that free floor is Premium. |
| Internal trial is **not** full premium | `isPremiumNow` returns **false** for capped internal trials after 2026-07-26 (`subscription-premium-gate.ts`). Checkout is no longer hidden behind “already premium”. |

### 3.2 Activation / first value

| Change | Mechanical effect |
|---|---|
| First-experience `/begin` | Value before identity; quieter sign-in. **May** cut the 73% auth drop. Unmeasured. |
| Child Discovery film | Calmer child setup vs chat onboarding. |
| Phase 3 D5 | Do **not** auto-route to `/subscription-trial` until first routine. Protects first-value; **delays** paywall. |
| First-routine generate bypass | `shouldBypassRoutineGeneratePaywall` while no first routine. Removes the old “paywall before first plan” leak. |
| Today Home as post-onboarding land | Living ON: `POST_ONBOARDING_ACTIVATION_PATH = /dashboard` (Home Begin → generate). Living OFF: `/routines/generate`. |

**Tension (do not hide this):** the Jul 6 OBSERVED #1 activation leak was **landing on dashboard instead of generator**. Living product **reintroduced Home-first**. That is better craft. It is **not** proven better activation. If parents never tap Begin, first-value rate can stay ~8% of installs.

### 3.3 Continuity / premium presentation

| Change | Mechanical effect |
|---|---|
| Amy AI workspace + quota education at 70–80% | Names remaining help; exhaustion is soft-continue, not a trap. |
| Phase 4 Health Lab static free preview | Free user sees a Care-room door, not a blank lock. Continuity CTA only. |
| Phase 4 Speech V2 90s lifetime first-use | One real taste of speaking practice, then continue-with-Premium. |
| Talk-with-Amy first-use clock | 3 UTC days from first actual converse, not from `subscription.createdAt`. |
| Earned routines stay open | Saved plans are not re-locked. Stops “I already made this, now pay” betrayal. |
| Value-bridge / post-activation banners | Conversion after a felt moment, not at the door. |

### 3.4 Conversion friction (checkout / entitlement)

| Change | Mechanical effect |
|---|---|
| Jul 6–20 recovery sprint (in code) | Trialists can see Subscribe; trial-ended page routed; sticky paywall CTA; `checkout_started` only at store/Razorpay start (product analytics). |
| Native Play purchase | `BillingBridge.purchase()` opens RevenueCat → Play Billing; on success logs native Firebase `purchase`. |
| Entitlement `premium` | Unchanged. Server `isPremiumNow` is the gate. Health Lab mutations now 402 if free (Phase 4). |
| Guest checkout | Anonymous users **blocked** from checkout until they create an account (`getGuestCheckoutBlock`). Guest Try First defaults **OFF**. |

### 3.5 What this still is not

- Not a pricing experiment (₹199 / ₹999 / ₹1499 and USD $4.99 / $24.99 / $39.99 unchanged).
- Not a RevenueCat catalogue change.
- Not proof Google Ads is linked or that conversion actions are primary.
- Not VoiceOver / TalkBack / Dynamic Type certification.
- Not “Apple-quality means they will subscribe.”

---

## 4. What it did NOT prove

| Claim people will want to make | Reality |
|---|---|
| Conversion will come after these changes | **Not proven.** No post-remediation paid cohort. |
| Apple-ready = product-market fit | Apple audit is identity/craft. PMF is payment + retention. |
| Visual quality = willingness to pay | Sanctuary pricing can **lower** impulse conversion while raising trust. Net effect **UNKNOWN**. |
| 3,500 installs will convert if we just tell them the product is better | Almost all of that pool is cold, never-activated, or uninstalled. See §3 of historical + §9 of this doc’s reactivation section. |
| Checkout works in production | Code path exists. Device billing matrix **unticked**. `purchase_success` **0** in dated analytics. |
| Google Ads will learn | Learning needs conversions. Historical primary signal was **install**. Purchase volume is still ~0. |

**Remaining unknowns (the ones that matter for ads money):**

1. Post-living install → first routine rate (was 8.4%).
2. Post-living first_open → authenticated parent (was 26.7% of first_open).
3. Whether a parent who *does* reach Play Billing completes payment.
4. Whether `purchase` / Play `in_app_purchase` actually appear in **this** Google Ads account.
5. D1/D7 after living Home + Discovery.
6. India vs US/UK willingness to pay at current prices.
7. Whether production web at `www.amynest.in` is serving living `5bb33cc0`+ to all Play WebView users (OTA/web deploy vs APK mix) — **UNKNOWN** here.

---

## 5. Current funnel health

### 5.1 Intended production journey (CODE-VERIFIED)

```
Play install (Android WebView → www.amynest.in)
  → Firebase first_open (SDK automatic)
  → /begin (First Experience)
  → identity (Google / email; guest Try First default OFF)
  → Child Discovery / onboarding
  → Today Home /dashboard  (living)
  → Begin → /routines/generate  (first routine bypasses generate lock)
  → optional /subscription-trial only after first routine
  → free floor (routines cap, Amy 10/day, Talk 5min × 3 first-use days,
     Speech V2 90s lifetime, Health Lab static door, Hard-Day 4 cards)
  → continuity paywall / pricing sanctuary / trial-ended
  → Play Billing (wrapper) or Razorpay (India web)
  → RevenueCat webhook → DB ACTIVE → isPremiumNow
```

### 5.2 Stage health vs ads money

| Stage | Pre-living OBSERVED | Current code | Ads implication |
|---|---|---|---|
| Install → first open | 53% device_registered; 79% instant-exit in startup table | Unchanged measurement; traffic quality still the killer | If you buy junk installs, this stage stays dead |
| Auth | 73% drop first_open→signup | `/begin` quieter; guest default OFF | Better UX, **unproven** rate |
| Onboarding complete | 14.2% of install | Discovery film + Home | Unknown |
| First routine | 8.4% of install | Bypass + Home Begin (not auto-generate) | **Highest remaining product risk** |
| Paywall exposure | 6.9% of install; often too early | Deferred to first routine / 72h / 5 defers | Fewer, later, more honest views |
| Checkout | 3 users ever | Native sheet + sanctuary pricing | Still the graveyard until a live success |
| Paid | 0 analytics; 2 old RC | Same providers | **No evidence** |
| Retention | D7 2.4% | Living habit loop unmeasured | Even a paid user may not renew |

### 5.3 Monetisation posture (important for Google Smart Bidding)

Phase 3 + P0-7 **intentionally delay and soften** the ask. That is correct for trust. It is **hostile** to install-day conversion signals.

Google Ads App campaigns that bid on `purchase` will see **sparse, delayed** conversions (days after install). Campaigns that bid on `begin_checkout` may learn from **paywall opens**, because product analytics maps `paywall_opened` → Firebase `begin_checkout` (see §6). That is a signal-quality bug for bidding, not a feature.

### 5.4 Payment / entitlement readiness

| Item | Status |
|---|---|
| Play Billing via RevenueCat in Android wrapper | CODE-VERIFIED |
| Razorpay India web | CODE-VERIFIED; 0 Razorpay webhooks in Jul snapshot |
| iOS Capacitor billing | CODE-VERIFIED; sandbox matrix open |
| Webhook URL `https://www.amynest.in/api/subscription/webhook` | OBSERVED live 2026-07-18 |
| Closed-test purchase → premium in <30s | ☐ open (`docs/ops/commercial-launch-billing-qa.md`) |
| Restore / grace / refund / account hold | ☐ open |
| Guest → paying parent | Blocked until account link; Try First default OFF |

**Payment readiness for ads: not certified.** A test purchase in Play closed testing is a **gate**, not an optional nicety.

---

## 6. Attribution health

### 6.1 Does Google Ads currently receive these events?

| Event | Sent to Google Ads / Firebase? | How | Trustworthy? |
|---|---|---|---|
| **Install** | **YES (Play + Firebase)** | Play install conversion if Ads↔Play linked; Firebase `first_open` automatic | **Trustworthy as volume.** Historically this is the signal Google **over-optimised**. Do not bid on it. |
| **First open** | **YES** | Firebase Analytics SDK auto-logs `first_open` on the native Android app | **Trustworthy** for “app opened”. Not a subscription signal. |
| **Onboarding completion** | **NO as a Google Ads conversion** | Product: `onboarding_complete` / `onboarding_funnel`. Not mapped in `firebase-subscription-attribution.ts` | **Not an Ads learning event** unless manually imported from GA4 (UNKNOWN if imported). |
| **First routine generated** | **NO as a Google Ads conversion** | Product + GA4 via `trackGrowthEvent("first_routine_generated")` | Same: first-party/GA4, **not** native Firebase Ads convert. |
| **Paywall viewed** | **PARTIAL / NOISY** | `trackSubscriptionEvent(paywall_opened)` → `trackFirebaseBeginCheckout` | **Not trustworthy as checkout.** Inflates `begin_checkout`. |
| **Checkout started** | **YES, mixed quality** | (1) Product `checkout_started` / `subscribe_clicked` → Firebase `begin_checkout`. (2) Native `BillingBridge.purchase()` logs `begin_checkout` **before** the Play sheet | Native (2) is the **real** checkout signal. (1)+paywall mapping is **polluted**. |
| **Purchase** | **YES in code** | Native `logSubscriptionPurchase` on RC success (`purchase` + `app_store_subscription_convert`). Web `purchase_success` also calls the same native/JS path | **CODE-VERIFIED, PRODUCTION-UNPROVEN.** Dated analytics `purchase_success` = 0. No `transaction_id` in the ecommerce bundle → duplicate risk if native + web both fire. |
| **Subscription conversion** | **YES in code** | `app_store_subscription_convert` alongside `purchase` | Same as purchase. Older bridges without `sign_up` used to map unknown events to this convert — web now gates `sign_up` on `__AMYNEST_BILLING >= 2.5.2`. Mixed APK fleet is a risk. |

### 6.2 `begin_checkout` and `purchase` on the production path

**`begin_checkout` — fires, but too often.**

CODE-VERIFIED callers:

1. `subscription-analytics.ts` on **`paywall_opened`** (explicit comment: “Early Google Ads signal — most users never reach checkout_started”).
2. Same file on **`subscribe_clicked`** and **`checkout_started`**.
3. `BillingBridge.kt` immediately before `Purchases.purchaseWith`.

So a parent who opens a paywall and leaves has already sent Google a checkout event. If that action is **primary** in Google Ads, the algorithm will hunt paywall viewers, not payers.

**`purchase` — wired on the native success path.**

```
Play sheet success
  → FirebaseAnalytics.Event.PURCHASE + app_store_subscription_convert  (native)
  → JS callback ok
  → trackSubscriptionEvent(purchase_success) from pricing / paywall / trial-ended
  → trackFirebaseSubscriptionPurchase again (native if wrapper present)
```

Possible **double fire** of `purchase` for one transaction. Without `transaction_id`, Google/GA4 may count two conversions. Until a real purchase is inspected in Ads Manager, treat purchase counting as **unverified**.

Play Console **automatic in-app purchase** conversions (Ads linked to Play, no app code required) are a **second** purchase pipe for Play Billing. Whether **this** Ads account has that link is **UNKNOWN**. If both Firebase `purchase` and Play `in_app_purchase` are primary, conversions double-count.

### 6.3 Delayed conversion (days after install)

This **can** work. It does not require the user to convert on day 0.

1. User clicks a Google App ad → Play install. Google stores click ID / advertising ID.
2. Native Firebase SDK creates an **app instance ID** on first open.
3. Google Ads ↔ Firebase / GA4 link plus imported conversion actions.
4. Default **in-app** click-through windows are typically **up to 90 days** (Play in-app purchase help recommends 90 days; many accounts default 30). Install/`first_open` windows are often **30 days**.
5. When `purchase` fires on day 3–14, Google attributes it back to the original click **if** the same app instance / device identity survived.

**Breaks the chain:**

- Uninstall / clear data / new WebView profile before purchase.
- JS-only Firebase inside WebView **without** native SDK (wrapper **does** have native Firebase — good).
- Conversion action not imported, or imported as **secondary** while bidding stays on installs.
- Web Razorpay purchase from a **web campaign** vs App campaign (different attribution object). Android wrapper **must not** fall back to Razorpay for digital goods (Play policy). Ads that land on the **website** instead of Play will not train App campaigns.
- First-party `install_source` / `gclid` was **0** in July — Play Install Referrer **code exists** (`InstallReferrerBridge` → `__AMYNEST_INSTALL_REFERRER`) but was not observed populated in product analytics. Channel CAC in Postgres remains **blind** until that bridge is proven in a live campaign.

**Attribution chain: incomplete for decision-making.** Code is better than July. Proof in Ads Manager is missing. First-party channel tags were historically broken in practice.

### 6.4 Events Google **cannot** currently learn from (unless separately imported)

- Onboarding completed  
- First routine generated  
- First Amy chat  
- Value-bridge shown/clicked  

Those are the **actual** quality proxies. They are not native Firebase conversion events in this codebase.

---

## 7. Conversion probability ranges

**All figures in this section are MODELLED ESTIMATES unless marked OBSERVED.**  
Historical paid conversion during the install spike is OBSERVED **0%**. Sample of successful checkouts after the Jul recovery sprint: **0**. Sample after living/Phase 3/4: **UNKNOWN (treated as 0 observed)**.

Assumptions shared by all models:

- Traffic is **not** the July junk mix (79% instant-exit). If it is, use the “historical repeat” row only.
- Production is serving living + Phase 3/4 to the WebView.
- Play Billing sheet can complete (unproven).
- Prices unchanged (India ₹199 / ₹999 / ₹1499; USD fallback $4.99 / $24.99 / $39.99).

### 7.1 Probability of **at least one** paid subscription from a **controlled** campaign

Controlled = qualified geo, in-app (not install) optimisation, daily stop-loss, n small.

| Scenario | Assumed install→paid | P(≥1 paid \| 80–150 qualified installs) | Label |
|---|---|---|---|
| Historical repeat (junk or funnel still dead) | **0–0.05%** | **5–15%** | MODELLED; consistent with OBSERVED 0/274 spike |
| Pessimistic (better product, weak demand) | **0.1–0.25%** | **15–30%** | MODELLED |
| Base (qualified parents, checkout works) | **0.3–0.8%** | **30–55%** | MODELLED |
| Optimistic (strong PMF in test geo) | **1.0–2.0%** | **55–85%** | MODELLED |

There is **no** scenario in which “the product is nicer, therefore a subscription is likely.” Even the optimistic band is a coin-flip at ~100 installs.

### 7.2 Expected install → paid subscription

| Band | Range | What would have to be true |
|---|---|---|
| Pessimistic | **0.0–0.2%** | Auth/activation still ~July, or traffic still junk, or Play sheet fails |
| Base | **0.2–0.8%** | First-open quality up; ~15–25% of installs activate; ~1–4% of activated pay |
| Optimistic | **0.8–2.0%** | Qualified parents; Home Begin works; checkout completes; India or UK English parents who want a companion |

OBSERVED install→paid during spike: **0%**. OBSERVED including the two Jun 21 RC rows vs 274: **0.73%**, **not** attributable to ads.

### 7.3 Expected activated-user → paid

“Activated” = first routine generated (the product’s own first-value definition).

OBSERVED: 23 routine generators, 0 paid → **0%** (small n, broken checkout).

| Band | Range | Notes |
|---|---|---|
| Pessimistic | **0–2%** | Felt value, still will not pay (India Play subscription resistance, or pricing still wrong) |
| Base | **2–6%** | Honest free floor + continuity ask; checkout unblocked |
| Optimistic | **6–12%** | Strong infant/hard-day parents; yearly ₹1,499 or $39.99 feels cheap vs time saved |

Consumer parenting subscription benchmarks are often cited higher; **AmyNest has no right to those benchmarks** until it has payers.

### 7.4 Why ranges are wide

n of post-fix checkouts = 0. n of post-living cohorts = 0. Prior checkout was architecturally blocked. Any single number would be theatre.

---

## 8. India vs English-speaking markets

Do **not** spend equally.

### 8.1 Pricing (CODE-VERIFIED, not a recommendation to change)

| Market | Monthly | 6-month | Yearly | Who charges |
|---|---|---|---|---|
| India web | ₹199 | ₹999 | ₹1,499 | Razorpay |
| India Play (store-localised) | Play account price | Play | Play | Google Play / RC |
| US default / fallback display | $4.99 | $24.99 | $39.99 | Stores when native |
| UK / CA / AU | Store-localised | Store | Store | Not a separate in-app price list in `pricing-region.ts` (IN vs US display only) |

USD yearly **$39.99** is cheap vs many US parenting apps. That does **not** mean US parents want AmyNest. The product, copy, and Care/Hub design are India-first.

### 8.2 Economics sketch (MODELLED, FX ~₹83/USD)

| | India | US | UK / CA / AU |
|---|---|---|---|
| Willingness to pay | Low-to-medium for Play subscriptions; ₹199 is affordable | High in category; **unproven for this app** | Similar to US; smaller volume |
| Expected CPI if optimising installs | ₹8–40 historically “cheap” | $1.50–8+ | $2–6 |
| Expected CPI if hunting qualified parents | ₹40–120 | $3–10 | $3–8 |
| LTV if 1× yearly then churn | ~₹1,499 | ~$40 | ~store yearly |
| LTV if monthly + churn | Often <₹400–800 | Often <$15–25 | similar |
| CAC that can survive unknown retention | **< ₹400–600** to even discuss scale | **< $15–20** | similar |
| Historical conversion | 0% in spike (IN+US mixed) | US was 44% of junk installs | GB 16% of 101 startup installs |
| Store behaviour | Android **95.6%** of 30d device_registered | Needs iOS for quality; iOS was **2.9%** | Mixed; Play+iOS |
| PMF uncertainty | **Lowest a priori** (product built for this parent) | **Highest** | High |

₹20,000 ≈ **$240**. That buys:

- India junk installs: **500–2,000** if Google is allowed to minimise CPI → **useless**.
- India qualified: **150–400** at ₹50–120 CPI → **barely** a conversion experiment.
- US/UK qualified: **25–80** installs → **too few** to estimate conversion; maybe enough to see **one** payer if optimistic.

### 8.3 Tiers

**Tier 1 — test markets (only these for ₹ test budget)**

1. **India — English-capable metro parents (Bengaluru, Mumbai, Delhi NCR, Pune, Hyderabad, Chennai).** Highest product-market prior. Play is the real store. Price is local. Language of the living product is English. Bid **in-app** (sign_up as temporary primary only if purchase is zero; never install). Exclude cheap Android 6–8 / high-fraud placements if the UI allows.

2. **United Kingdom — English parents, Play + (later) iOS.** Smaller, more expensive, better WTP, less India-specific cultural mismatch than US “explore” junk. Use only a **slice** of budget if India CPIs are clean and sign-ups exist.

**Tier 2 — hold for after Gate 2–3 (first paid users)**

- **US** — only after India/UK has **real** purchase events and you can afford $3–8 CPI. Historical US mix was a fraud/quality smell. iOS share is too small today to be the US plan.
- **Canada / Australia** — same economics as UK, even less volume. Do not open until a playbook exists.

**Avoid / hold now**

- **Global / “all countries” App campaigns** (this is how you buy US/CN/ES instant-exits).
- **India install-volume / UAC for installs.**
- **China, Spain, random Play explore geos** (1% each in July startup table — not a market).
- **iOS Apple Search Ads as the first ₹20k** — iOS was 2.9% of product installs; sandbox billing matrix open; Capacitor/OTA is a different ops surface.
- **Web Search to Razorpay landing** as the first test — App campaign learning will not see those purchases; Play policy wants Play Billing in the app.

---

## 9. ₹20,000 controlled-test plan

**Do not spend ₹20,000 immediately. Objective = subscription conversion, not CPI.**

### 9.1 Gate 0 — before any media (₹0 ads)

Spend **nothing** on ads until:

1. One **Play license-tester** (or closed-test) purchase on a production-like WebView build.
2. Confirm **all** of: Play sheet success, RC `INITIAL_PURCHASE`, DB `subscription_state=ACTIVE`, client `purchase_success`, Firebase `purchase` (DebugView), and — if the Ads account is linked — the conversion in Google Ads (can take hours).
3. Confirm `begin_checkout` on **sheet open**, and count how many extra `begin_checkout` fire from mere paywall open (so you know not to bid on it).
4. Confirm production web is **living** (FA-02 on) for the Play wrapper.

If Gate 0 fails: **₹0 ads.** Fix is out of scope of this study; the decision is “do not buy traffic into an unproven payment pipe.”

### 9.2 Test budget (after Gate 0)

| Item | Recommendation |
|---|---|
| **Initial test budget** | **₹4,000** (hold ₹16,000) |
| **Daily budget** | **₹400–500** |
| **Duration** | **8–10 days** (need delay window; do not judge on day 1) |
| **Campaign type** | Google App campaign → **Android**, India metros (Tier 1). One campaign, one geo set. |
| **Optimisation** | **Not installs.** If `purchase` has 0 history: start on **`sign_up`** as primary, `purchase` as secondary. **Never** make `begin_checkout` primary until paywall mapping is known not to pollute (this study recommends treating current `begin_checkout` as dirty). |
| **Creative** | One parenting job (today’s plan / hard day calm / infant care) — not “AI suite / 20 features.” |
| **Max acceptable CPI** | **₹80** blended. If CPI < ₹25 with no sign-ups, you are buying junk — **kill**. |
| **Max acceptable CAC** (this test) | **₹1,500** to acquire **one** paid yearly (equal to yearly price — only acceptable as **learning**, not scale). Monthly CAC cap **₹400**. If the only convert is monthly at CAC > ₹400, do not scale. |
| **Target qualified installs** | **50–80**, not 500. |

### 9.3 What to watch daily (manual; this study does not change analytics)

- Play installs vs Firebase `first_open` (gap = junk or attribution lag)
- Product `signup_completed` / `sign_up`
- `routine_generated` / `first_routine_generated`
- `paywall_opened` vs native `begin_checkout` vs Play sheet
- `purchase` / RC webhook / DB ACTIVE
- Geo of first_open (if US floods an India campaign, kill)

### 9.4 When to stop vs increase

See §10–11. Short version:

- **Stop the ₹4,000** if Gate 0 wasn’t done, or if 40 installs produce 0 first_opens, or CPI < ₹25 with 0 sign-ups, or checkout errors repeat.
- **Do not add budget** because CPI looks “efficient.”
- **Increase only** after Gate 2 (first **non-test** paid user) **and** CAC under the learning cap **and** activation not collapsed.

The remaining ₹16,000 is **not** a second burst. It is reserved for a **post-Gate-2** replica only if the first paid user is real.

---

## 10. Stop-loss rules

Kill or pause paid spend when **any** fire:

| ID | Rule | Why |
|---|---|---|
| S1 | Gate 0 purchase event not visible in Firebase DebugView / Ads | You would be flying blind |
| S2 | **40 installs, 0 `first_open`** (24h lag allowed) | Attribution or store fraud |
| S3 | **Blended CPI < ₹25 and 0 sign-ups after 50 installs** | Classic junk-install replay |
| S4 | **>30% of first_opens outside target country** | Geo leakage / VPN / mis-target |
| S5 | **0 sign-ups after 80 qualified first_opens** | Auth/onboarding still broken for this traffic |
| S6 | **0 first routines after 30 sign-ups** | Home-first activation failed; do not buy more |
| S7 | **Checkout started ≥5, purchase 0, with `purchase_failed` or Play errors** | Payment pipe, not demand |
| S8 | **Daily budget spent 3 days with DAU of tagged users = 0** | Events not landing |
| S9 | **Any P0 product / billing outage** | Obvious |
| S10 | **₹4,000 spent, 0 paid, and no checkout_started** | Demand or funnel; remaining ₹16,000 stays in the bank |

Vanity metrics that **must not** prevent a stop: cheap CPI, high install count, impressions, Play listing rank.

---

## 11. Scaling rules

**Ads should not scale until every item below is true.** Vague “looks good” is not a condition.

1. **Attribution verified** — Play install, Firebase `first_open`, and campaign ID or `gclid`/`play_referrer` visible on **≥20** users in first-party analytics **or** Ads↔Firebase numbers reconcile within a documented discrepancy band.
2. **Purchase event verified** — at least one **non-license-tester** `purchase` in Firebase **and** RC `INITIAL_PURCHASE` **and** DB ACTIVE, same user.
3. **Checkout verified** — native `begin_checkout` count on sheet-open is understood; paywall-open `begin_checkout` is **not** the primary bid action.
4. **First paid users** — **≥2 independent** paying parents (different devices/accounts, not founder, not license testers).
5. **Minimum sample** — **≥300 qualified first_opens** in the winning geo **or** ≥2 paid, whichever comes later for **rate** estimates. Do not declare a conversion rate from 1/40.
6. **Acceptable CAC** — CAC ≤ **50% of expected first-year cash collected** at the plan they bought (India yearly: CAC ≤ ₹750 as a **scale** cap; monthly: CAC ≤ ₹250 until renewal is observed). The test allowed a worse CAC; **scale does not**.
7. **No payment failures** — `purchase_failed` / Play Billing errors not repeating; webhook processing_status not failing.
8. **No onboarding funnel break** — signed-in → first routine **≥ 40%** in the **paid-traffic** cohort (MODELLED bar; July OBSERVED was worse). If paid traffic activates worse than organic, **do not scale**.
9. **Retention not dead** — D1 of paid-traffic cohort **≥ 15%** (still below healthy consumer apps; below this, LTV is fiction). July OBSERVED D1 was 5.2%.
10. **Optimisation object is purchase** — Google has enough `purchase` events to bid on them (practically **≥20–30 / month** for Smart Bidding stability). Until then, **do not raise budget**; you are still in manual/proxy learning. ₹20,000 cannot produce 30 purchases. Therefore **this budget cannot honestly “scale.”** It can only hunt the **first** conversions.

**Translation:** ₹20,000 is a **probe**, not a growth engine. Scaling is a **later** decision with more money **after** Gates 2–4.

---

## 12. 100 / 500 / 1,000 install scenarios

Assumptions are stated. **Not observed.** If traffic matches July junk, use BAD only.

Activation rates used:

| | BAD | BASE | GOOD |
|---|---|---|---|
| Install → “real first open” (not instant-exit) | 25% | 55% | 75% |
| First open → signed-in + onboarded | 15% | 35% | 50% |
| Onboarded → first routine (activated) | 40% | 60% | 75% |
| Activated → saw paywall / continuity ask | 40% | 55% | 70% |
| Paywall → true checkout (Play sheet) | 10% | 20% | 30% |
| Checkout → paid | 0–10% | 25% | 40% |
| Implied install → paid | **~0–0.05%** | **~0.3%** | **~2.4%** |

Implied BASE: 0.55 × 0.35 × 0.60 × 0.55 × 0.20 × 0.25 ≈ **0.32%**.

### BAD — good-enough product, poor traffic / poor activation

| Stage | 100 installs | 500 | 1,000 |
|---|---:|---:|---:|
| Real first open | 25 | 125 | 250 |
| Onboarded | 4 | 19 | 38 |
| Activated (routine) | 2 | 8 | 15 |
| Paywall exposure | 1 | 3 | 6 |
| Checkout (sheet) | 0 | 0–1 | 0–1 |
| Paid subscribers | **0** | **0** | **0–1** |

This is the July movie with a prettier UI. **Most likely if you restart install UAC.**

### BASE — qualified traffic + normal activation + some conversion

| Stage | 100 installs | 500 | 1,000 |
|---|---:|---:|---:|
| Real first open | 55 | 275 | 550 |
| Onboarded | 19 | 96 | 193 |
| Activated | 12 | 58 | 115 |
| Paywall exposure | 6 | 32 | 80 |
| Checkout | 1 | 6 | 13 |
| Paid subscribers | **0–1** | **1–3** | **2–5** |

### GOOD — strong qualified traffic + product lift + healthy conversion

| Stage | 100 installs | 500 | 1,000 |
|---|---:|---:|---:|
| Real first open | 75 | 375 | 750 |
| Onboarded | 38 | 188 | 375 |
| Activated | 28 | 141 | 281 |
| Paywall exposure | 20 | 99 | 197 |
| Checkout | 6 | 30 | 59 |
| Paid subscribers | **2–3** | **10–15** | **20–30** |

GOOD is **not** the forecast. It is what “healthy consumer subscription” would look like. AmyNest has **never** observed this. Using GOOD to spend ₹20,000 would be self-deception.

₹4,000 at ₹50–80 CPI ≈ **50–80 installs** → closest to the **100-install BASE/BAD** columns: **expect 0 paid**, hope for 1.

---

## 13. First-subscription probability

Question: after these product changes, is it reasonable to expect the first **customer** subscription within N **new qualified** installs?

**Do not promise a subscription.** Historical spike of hundreds of installs produced **zero** new payers.

Using binomial **MODELLED** rates from §7.2 (independent installs, qualified traffic, checkout works). “Historical repeat” uses 0.05%.

| N qualified installs | P(≥1 paid) pessimistic 0.15% | Base 0.4% | Optimistic 1.2% | Historical repeat 0.05% |
|---:|---:|---:|---:|---:|
| **100** | **14%** | **33%** | **70%** | **5%** |
| **250** | **31%** | **63%** | **95%** | **12%** |
| **500** | **53%** | **86%** | **~99%** | **22%** |
| **1,000** | **78%** | **98%** | **~100%** | **39%** |

**Honest reading:**

- **Within 100:** possible, **not** reasonable to plan on. Treat as a **low-probability** bonus.
- **Within 250:** only “reasonable” if traffic is truly qualified **and** Gate 0 passed. Still ~1/3 chance of zero in the pessimistic band.
- **Within 500–1,000:** mathematically more likely **if** conversion is even 0.4%. **₹20,000 cannot buy 1,000 qualified installs** in UK/US and should not buy 1,000 cheap India installs.

If conversion remains 0% (checkout still broken or no demand), P = **0** at every N.

---

## 14. Founder recommendation

### If this were your ₹20,000 and you could not afford to lose it, would you spend it on AmyNest ads TODAY?

# YES, BUT ONLY ₹4,000 FOR A CONTROLLED TEST

**and only after Gate 0 (a proven test purchase in Firebase / Google Ads).**

If Gate 0 cannot be completed this week: the answer collapses to **NO**.

**Why not YES (full ₹20,000 / scale):**

- Product is better; **payment by real parents is unproven**.
- Previous ads bought installs, not subscriptions.
- D7 retention was 2.4% when last measured — unit economics were already dead.
- `begin_checkout` is polluted; Google will happily relearn junk if you let it.
- ₹20,000 is too small to estimate conversion in US/UK and too large to burn on CPI theatre.

**Why not a permanent NO:**

- The July **architectural** blockers (trial = premium, orphaned trial-ended, paywall-before-routine) are remediated in code.
- Native `purchase` logging exists; Play automatic IAP *might* already be a clean Ads signal if linked.
- A **₹4,000** probe, after Gate 0, is the cheapest way to learn whether **anyone pays**, which is now the only question that matters.

**How I would actually spend it if it were mine:**

1. ₹0 until license-tester purchase is visible in Ads/Firebase.  
2. ₹4,000 / 8–10 days / India metros / not install-optimised.  
3. Stop-loss table in §10 — no ego.  
4. ₹16,000 stays in the bank until two independent payers or the test is declared failed.

### What would prove the product is working? (hard gates)

| Gate | Threshold | Meaning |
|---|---|---|
| **Gate 1 — First real checkout** | Native Play sheet opened by a **non-founder** user; `begin_checkout` from `native_purchase` | Demand to pay is non-zero |
| **Gate 2 — First successful subscription** | RC `INITIAL_PURCHASE` + DB ACTIVE + Firebase `purchase` for that user | Payment pipe works in the wild |
| **Gate 3 — Multiple independent paid users** | **≥2** distinct parents, distinct days, not testers | Not a fluke / not one friend |
| **Gate 4 — Stable install → paid** | **≥300** qualified first_opens in one geo; install→paid **≥ 0.5%** (or activated→paid **≥ 4%**) with 95% interval still above 0 | A rate exists |
| **Gate 5 — CAC below sustainable LTV** | CAC ≤ 50% of first-year cash **and** D7 of that cohort ≥ 15% **and** ≥1 renewal or 30-day still-active paid | You may spend more |

Until Gate 2, AmyNest is a **beautiful free app with a billing SDK**. Until Gate 5, it is not a paid-growth company.

---

## 15. Biggest remaining uncertainty

**The single biggest remaining uncertainty between current product quality and actual subscription revenue is:**

# Whether a real parent, after using the free floor, will complete a store payment.

Not visual quality.  
Not the Apple audit.  
Not “is AmyNest nicer than in July.”  
Not Health Lab preview or Speech 90s.

That uncertainty is a stack, in order:

1. **Market demand** — does this parent want to pay for continuity at ₹199–₹1,499 / $4.99–$39.99?  
2. **Payment completion** — does Play Billing / RC / webhook / entitlement actually finish for that parent?  
3. **Activation** — do they ever generate a first routine on living Home, or bounce like July?  
4. **Traffic quality** — can ₹4,000 buy that parent instead of instant-exit inventory?  
5. **Retention** — if they pay, do they stay long enough for LTV to exist?

Item 1 is unmeasured. Item 2 is code-ready and **live-uncertified**. Item 3 is **regressed-or-improved, unknown**, because Home-first contradicts the only OBSERVED activation win (direct-to-generate). Item 4 failed last time. Item 5 last measured as a dead D7.

### Readiness scorecard (do not collapse these)

| Dimension | Ready to **scale** ads? | Ready for **₹4,000 probe** after Gate 0? |
|---|---|---|
| Product readiness | No (not the bottleneck) | **Yes** |
| Funnel readiness | No | **Conditional** |
| Traffic quality | No (must be designed, not assumed) | **Only if targeting is strict** |
| Payment readiness | No | **Only after Gate 0** |
| Market demand | Unknown | **That is what the probe measures** |
| Retention | No (last OBSERVED D7 2.4%) | Probe can proceed; scale cannot |
| Unit economics | No | Probe uses a **learning** CAC cap, not a scale CAC |

---

## Appendix A — Data sources used

| Source | Date | Used for |
|---|---|---|
| `analytics-growth-report.md` | 2026-07-13 | Funnel, retention, fraud, 0 paid, geo |
| `docs/product-growth/conversion-audit-2026-07-06.md` | 2026-07-06 | Activation leaks, 60% miss generate |
| `docs/product-growth/subscription-audit-2026-07-06.md` | 2026-07-06 | Internal trial = premium; 0 Play billing |
| `docs/product-growth/conversion-recovery-2026-07-20.md` | 2026-07-20 | Checkout/trial-ended code fixes |
| `docs/product-growth/daily/2026-07-07.md` | 2026-07-07 | 2 RC paid users, 0 purchase_success |
| `docs/ops/commercial-launch-billing-qa.md` | 2026-07-18 | Webhook, 2 ACTIVE, unticked device matrix |
| `amynest-v1-commercial-launch-readiness.md` | 2026-07-18 | Soft-launch GO WITH CONDITIONS |
| `docs/v2/AMYNEST_FINAL_APPLE_AUDIT.md` | 2026-08-16 | B + certification debt |
| `docs/v2/AMYNEST_FREE_PREMIUM_CONVERSION_REMEDIATION_REPORT.md` | 2026-08-17 | Phase 3 |
| `docs/v2/AMYNEST_PHASE4_MONETIZATION_IMPLEMENTATION_REVIEW.md` | 2026-08-17 | Phase 4 |
| `docs/v2/AMYNEST_PHASE3_PHASE4_MAIN_INTEGRATION_REVIEW.md` | 2026-08-18 | `5bb33cc0` on main |
| `docs/v2/AMYNEST_FINAL_PRODUCTION_READINESS.md` | 2026-08-07 | Guest linking, billing not millions-ready |
| `docs/production-stabilization/phase-0/analytics-map.md` | 2026-07 | First-party vs GA4 vs logs |
| Code: `firebase-subscription-attribution.ts`, `subscription-analytics.ts`, `BillingBridge.kt`, `FirebaseSubscriptionAnalytics.kt`, `install-attribution.ts`, `subscription-premium-gate.ts`, `activation-gate.ts`, `onboarding-navigation.ts`, `pricing-region.ts` | `main` @ study time | Attribution + funnel mechanics |

**Not available this run:** production SQL, Play Console, Google Ads, GA4, RevenueCat dashboard, August 2026 event counts.

## Appendix B — Existing 3,500+ installs as a reactivation pool

| Question | Answer | Label |
|---|---|---|
| How valuable are they? | **Low as a pool.** Store install count is not a warm list. Product saw hundreds of registrations, not thousands of parents. | OBSERVED gap + founder store figure UNKNOWN here |
| Likely still active? | **Mostly no.** OBSERVED D7 **2.4%**. Spike was ~6 weeks before this study. D30 sample was n=8. | OBSERVED then; current **UNKNOWN** |
| Can they be re-engaged? | **Weak without a working channel.** Jul 14: Resend domain **not verified** (email failing); FCM stale-token errors. Push/email reactivation was unhealthy then. Current status **UNKNOWN**. | OBSERVED Jul 14 |
| Does install history predict conversion? | **No.** Hundreds of installs, 0 spike conversions. Past non-payers are not a lookalike of future payers. | OBSERVED |
| Data needed before heavy **new** acquisition | Gate 0 purchase proof; 8–10 day ₹4,000 qualified test; first-party `install_source` non-zero; D1 of **new** cohort; **do not** wait for this cold pool to “wake up” as a substitute for that test. | Decision |

Reactivation of old installs is a **CRM** problem, not an ads-scale reason. It is **not** a substitute for Gate 0–2.

## Appendix C — What this study did not do

- Did not change code, campaigns, pricing, RevenueCat, or analytics.  
- Did not start or pause Google Ads.  
- Did not query production (credentials not present in this environment).  
- Did not invent a post-remediation conversion rate.

---

**STOP.** Decision study only.
