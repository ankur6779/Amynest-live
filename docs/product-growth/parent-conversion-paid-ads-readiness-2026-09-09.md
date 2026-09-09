# AMYNEST — PARENT CONVERSION & PAID ADS READINESS REPORT

**Date:** 2026-09-09  
**Branch audited:** `main` @ `27a1d9f5`  
**Scope:** Current release codebase (kidschedule web + Android WebView shell + iOS Capacitor + API entitlements). No shipped product code was changed.  
**Constraint:** Evidence from current source + prior live audits. This investigation did **not** query live Postgres, RevenueCat, Play Console, Meta Ads, or GA4. Where live counts are cited, they are from dated live audits (June–July 2026) and are labelled as such.  
**Founder question:** If we start spending real money on Meta/Google/Instagram ads today and send parents into AmyNest, are we genuinely ready to convert them into paying subscribers?

---

## 1. Executive Verdict

# NO-GO

AmyNest is **not ready to spend real money on paid acquisition today**.

The product is technically more launchable than it was in June–July (billing is wired, internal trial no longer silently grants full premium, first-session “Begin with today” exists, Discovery Film shortened onboarding). That is **not** the same as being able to **sell**.

A new parent who clicks an ad today will not reliably:

1. Understand what AmyNest is
2. Experience the product they were promised
3. See a reason to pay
4. Reach a working checkout with enough trust
5. Be measurable enough that we can tell whether the ads worked

Previous technical / Play / Rooms / navigation certifications **PASS** does not equal conversion **PASS**. Commercial ops scored 78/100 on 2026-07-18 for infrastructure. Conversion scored 22–31/100 in July. This audit scores **41/100**. The gap is still fatal for paid traffic.

**Do not scale ads.** A tiny instrumented smoke test after the P0 list is a later decision, not a GO.

---

## 2. Conversion Readiness Score

**41 / 100**

| Dimension | Max | Score | Evidence |
|-----------|----:|------:|----------|
| Product clarity | 15 | **4** | First screen says “Begin with today / one next right thing.” Store says “AI Parenting Coach.” Paywall says “growth system / eight tools.” Hub is a mall of 40+ modules. A new parent cannot answer “what is this app?” in one sentence. |
| First-session value | 15 | **5** | `/begin` delivers a generic 8–12 minute parenting tip (sit together, one story, shoes→bag→water). Real product value is first **routine generated**. Taxonomy itself records an **89.9% dashboard→routine drop**. Historical install→routine ≈ 8%. |
| Parent UX | 10 | **4** | Cinematic, slow, then auth, then Discovery Film that re-asks similar questions, then an empty/busy home. Historical first_open→signup drop **73%**; onboarding finish drop **69%**. |
| Child value | 10 | **3** | Child experiences nothing in the first session. Speech, games, phonics, rooms are not the default path. Parent cannot show the child “this is for you” before being asked for an account. |
| Differentiation | 10 | **4** | The stack (routine + Amy + speech + nutrition) is differentiated **on paper**. What the parent actually gets in minute 1 is advice they could get from WhatsApp, Notes, or ChatGPT for free. |
| Paywall | 10 | **4** | Default benefits are a **feature list** (Unlimited AI, Health Lab, Birth Sky, games library). Social proof is generic and unverified. Timing can hit before value (`FF_POST_ONBOARDING_TRIAL` default ON). |
| Pricing / value perception | 10 | **6** | Price itself is not the blocker (₹199 / $4.99 monthly; ₹1499 / $39.99 yearly). Value communication is. INR yearly drift ₹1499 web vs ₹1599 RC seed. |
| Trust | 10 | **5** | Privacy copy is decent. No testimonials, no in-app ratings, no named social proof. Terms say fees are **non-refundable**; paywall says **cancel anytime**. |
| Purchase UX | 5 | **3** | Native Play/RC and India Razorpay paths exist in code. Web non-India checkout is blocked. Historical `purchase_success` = 0; one user hit `purchase_failed` 7×. Device billing matrix still unsigned. |
| Analytics / funnel readiness | 5 | **3** | Events exist, but names don’t match dashboards, games/rooms are blind, and July attribution was **100% unknown UTM** with **0** Google/Meta attributed installs. You cannot run ads you cannot measure. |
| **Total** | **100** | **41** | |

Scores are not inflated. A 41 means: the bones of a sellable product exist; the current packaging cannot convert paid traffic.

---

## 3. Why We Have ZERO Subscriptions

**Primary diagnosis: the product does not create a paying moment.**

Zero subscriptions is **not** “we just need more traffic.” July already had live traffic.

### What we know from live metrics (not invented)

From `docs/product-growth/analytics-growth-report.md` (2026-07-13) and `docs/product-growth/conversion-audit-2026-07-06.md` / `subscription-audit-2026-07-06.md`:

| Fact | Number | Source |
|------|-------:|--------|
| Device registrations (30d) | 274 | Jul 13 growth audit |
| First open | 146 (53% of install) | Jul 13 |
| Sign up | 39 (27% of first open) | Jul 13 |
| Onboarding completed | 39 (14% of install) | Jul 13 |
| Routine generated | 22–23 (~8% of install) | Jul 13 / Jul 6 |
| Paywall viewed | 16–19 (~7% of install) | Jul 13 |
| Checkout started | 3 users | Jul 13 |
| `purchase_success` (analytics) | **0** | Jul 6 + Jul 13 |
| RevenueCat INITIAL_PURCHASE | 2 (Jun 21 only) | Jul 13 / Jul 18 commercial |
| New MRR in install-spike window | **₹0** | Jul 13 |
| D1 / D7 | 5.2% / **2.4%** | Jul 13 |
| Instant exits (&lt;5s) | **79%** of startup funnel | Jul 13 |
| Google Ads / Meta attributed installs | **0** | Jul 13 |
| Internal trials | 29–41 | Jul 6 / Jul 13 |
| Trial → paid | **0%** | Jul 6 |

The Jul 18 commercial launch note recorded **2** RevenueCat ACTIVE rows. The founder’s current statement is **zero subscriptions**. Those two Jun 21 purchases did not become a paid base. Treat commercial paid conversion as **effectively zero**.

### Why zero — ranked causes (not traffic)

1. **Parents never understood the product (H2).** First screen does not say what AmyNest does. Store/ads promise an AI coach + routines + speech + nutrition. First open is a poetic film about “today’s next right thing.”
2. **Parents never reached real value (H3).** First “value” is a generic tip. First *product* value is a generated routine. ~90% of dashboard users never generate one. 76% of trialists never generated a routine.
3. **No reason to pay (H5).** Internal trial historically granted full premium *and hid checkout*. Current code fixed that (`isInternalTrialNow` → `isPremium=false`), but free limits (10 AI/day, 3 routines lifetime, 3 speech sessions) plus a free NRT tip mean a dabbler never hits a compelling lock after feeling a win.
4. **Paywall sells features, not the moment they just had (H6).** After a 10-minute “calm contact” tip, “Health Lab / Birth Sky / games library / eight tools” is a different product.
5. **Purchase path was not reached or failed (H8).** 3 checkouts ever; 0 success; 7 `purchase_failed` on `six_month` for one user; trialists were shown Cancel instead of Subscribe (Jul 6). Code has since been patched; **live purchase success after the patches is not re-proven**.
6. **Wrong / low-quality audience (H9).** 44% US installs for an India-weighted product; 79% instant exits. That is not “parents who want a daily system.”
7. **Measurement could not tell paid from junk (H10 + analytics).** 100% unknown UTM. You cannot fix what you cannot attribute.

**H1 (no traffic) is rejected as the sole cause.** There *was* an install spike (20–32/day). It produced **₹0 new MRR**.

---

## 4. Parent Journey

Ad → Install → First Value → Paywall → Purchase — **as the code actually routes today**.

```
AD / STORE LISTING
  Promise: “AmyNest AI: Parenting Coach”
           routines + speech + nutrition + infant care + 24/7 AMY
        ↓
PLAY / WEB LANDING
  /welcome: “Know what your child needs most today”
  /amy: “Meet AMY — Your AI Parenting Coach”
  /begin (default unsigned /): cinematic film, NOT AMY chat
        ↓
INSTALL (Android WebView → https://www.amynest.in)
  Splash → auth boot (p50 ~3.1s historically)
        ↓
FIRST OPEN  (/)
  Unsigned → Redirect /begin
        ↓
FIRST 60–180s  (/begin)
  Welcome → name → age → today → “noticing…” → generic NRT
  Then: Keep with an account  (auth wall)
        ↓
SIGN-UP / SIGN-IN
  Historical 73% loss here
        ↓
ONBOARDING  (/onboarding → Child Discovery Film, default ON)
  Arrival → country (often IP-skipped) → name/age confirm → rhythm → optional focus
  Infant extra beats if <24 months
        ↓
POST-ONBOARDING
  Default: /dashboard  (Today Home V1 ON)
  Optional: /subscription-trial  (FF_POST_ONBOARDING_TRIAL default TRUE)
  Legacy kill-switch: /routines/generate
        ↓
FIRST PRODUCT VALUE
  Parent must tap “Begin / See today’s plan” → /routines/generate
  Event: first_value_achieved  (first routine only)
        ↓
PAYWALL
  Soft reasons deferred until first routine OR 5 defers OR 72h
  Hard reasons (ai_quota, routines_limit, infant locks) can fire earlier
  Surfaces: PaywallModal, /pricing, trial banners, trial-ended, winback
        ↓
CHECKOUT
  Android shell → BillingBridge → RevenueCat → Google Play
  iOS Capacitor → RevenueCat → App Store
  Web India → Razorpay / UPI
  Web not-India → “Subscribe via the AmyNest app” (NO checkout)
        ↓
PURCHASE / ENTITLEMENT
  Server isPremiumNow / isPremiumSubscriberNow
  Historical analytics: 0 purchase_success
```

**Parent test of the journey:** the ad promised a coach and tools. The first three minutes deliver a mood film and a tip. The account wall arrives before the product. The paywall, if seen, sells an ecosystem the parent has not used.

---

## 5. First 60 Seconds Audit

**Estimated, from code path. Not a stopwatch measurement on a live device.**

| Clock | Screen | What the parent sees | CTA |
|------:|--------|----------------------|-----|
| 0–3s | Splash / `AuthBootShell` | AmyNest brand | none |
| 3–8s | `/begin` welcome | **“Begin with today”** / “One next right thing — formed only from what you share.” Soft-morning hallway photo. | **Continue** · Sign in |
| 8–20s | Child’s first name | Text field, placeholder “e.g. Aria” | Continue |
| 20–30s | Age | Chips 0–2 / 2–4 / 5–7 / 8–10+ | Continue |
| 30–40s | Today | School/care · Home day · Not sure | **See today’s next step** |
| 40–48s | Working | “Noticing today’s next right thing” + rotating lines (“Morning has settled…”, weekday, age band) | none (forced wait ~3.6s) |
| ~50–70s | Reveal | e.g. “Give Aria 10 minutes of calm contact” / “Sit together with no phone…” | **Do this now** · Later |

### Calculated first-session metrics (estimated)

| Metric | Estimate | Notes |
|--------|----------|-------|
| First screen | `/begin` welcome | Not sign-in. Not AMY. Not a routine. |
| First message | “Begin with today” | Does not name the product job. |
| First CTA | Continue | No benefit stated. |
| Taps to first “result” | **5–6** | welcome → name → age → today → reveal |
| Questions asked before value | 3 | name, age, today-type |
| Permissions in first 60s | **0** | Correct. Native mic/push deferred. |
| Login in first 60s | No | Login is forced *after* the tip, to “keep today’s progress.” |
| Time to first *useful* experience | **~50–90s** to a tip; **10–18 min** to a real routine | Tip ≠ product. |
| Time to understand AmyNest | **Unclear — often never** | Copy never says “this builds your child’s daily plan / speech / coaching.” |
| Time to product value (routine) | **~12–18 minutes, 15–20 taps** if they finish FE + signup + film + generate | Historical median open→finish 3.5 min + finish→routine 4.3 min. |
| Time to monetization | Can be **immediately after onboarding** (`/subscription-trial`, flag default ON) or after first routine / quota | Both too early (no value) and too late (most never activate). |

**Time To First Value (TTFV)**

- **Experiential TTFV (NRT tip):** ~60–90 seconds. **ESTIMATED.** Quality: low. Differentiated: no.
- **Product TTFV (`first_value_achieved` = first routine):** ~12–18 minutes on the happy path. **ESTIMATED.** Historical reach: ~8% of installs.
- **Monetization TTFV:** as early as post-onboarding trial screen; as late as never.

### Parent test — first screen

| # | Question | Answer |
|---|----------|--------|
| 1 | What is this screen? | A calm photo and a poetic line. |
| 2 | Why am I seeing it? | Unclear. |
| 3 | What should I do next? | Tap Continue. |
| 4 | Why should I care? | Unclear. |
| 5 | Child benefit? | Not stated. |
| 6 | Parent benefit? | Not stated. |
| 7 | Do I trust this? | Aesthetic trust only. No credentials. |
| 8 | Would I pay? | No — I don’t know what I’m buying. |
| 9 | Objection | “Is this a meditation app? A journal? A coach?” |
| 10 | Stronger CTA | “Get [child]’s plan for today — 2 minutes” |

This is a **conversion problem**, not a craft problem. The film is well made. It does not sell.

---

## 6. Product Value Proposition Audit

### Where “why should I pay?” is actually said

| Surface | Message | Sells |
|---------|---------|-------|
| `/begin` | One next right thing | Mood / ritual |
| `/welcome` | Know what your child needs most today | Outcome (good) |
| Play listing | AI parenting coach + 5 verticals | Feature stack |
| `/amy` landing | 24/7 AMY on your dashboard after 2-minute onboarding | **False vs current default path** |
| Discovery Film | “Amy is ready to understand your child” | Process |
| Today Home | “Today’s next right thing” / generate plan | Closest to a real job |
| Paywall default | “Continue your child's journey” + 8 feature bullets | Features |
| Paywall hero marketing | “The growth system for ages 0–12” + eight tools | Ecosystem |
| Pricing | “Keep Amy beside you.” | Relationship / vague |

### Functional value (supported by the product)

AmyNest can actually help a parent:

- Generate an age-aware **daily routine**
- Ask **Amy** about sleep, meals, tantrums, school (quota-gated)
- Run **Speech Coach** practice
- Use **infant** logs / sleep / feeding aids
- Get **nutrition** meal-plan help
- Open **learning** (phonics, math, spelling)
- See a **parent hub / rooms** of activities

These are real. They are **not** what the first session delivers.

### Emotional value (only if experienced)

Supported *if* the parent reaches a routine or a coaching moment:

- Less morning/bedtime chaos
- A sense that someone is helping *this* child, not a generic blog
- Child independence / speech confidence / calmer days (focus chips exist)

**Not supported by the first session:** “this is actually helping my child.” The NRT is a reminder, not a system.

### Economic / value perception

| Price | Perception if value is proven | Perception after current first session |
|-------|-------------------------------|----------------------------------------|
| ₹199 / $4.99 month | Cheap enough to try | Unclear / unnecessary |
| ₹999 / $24.99 six-month | Reasonable habit window | Too much commitment |
| ₹1499 / $39.99 year | Strong if the system is used daily | Absurd for a tip + locked hub |

**Pricing is not the primary blocker. Value perception is.**

### Why pay vs free alternatives?

| Alternative | Why a parent would stay there | AmyNest’s actual edge | Shown in first session? |
|-------------|-------------------------------|----------------------|-------------------------|
| Doing nothing | Default | A named next step | Tip only |
| WhatsApp / notes | Free, already used | Persistence + child profile | No |
| Calendar | Enough for school families | Adaptive routine | No |
| YouTube / games | Child will actually open them | Safer structured play | No |
| ChatGPT / Gemini | Unlimited free advice | Child-context + routines + speech | No (and `/begin` feels like a prettier GPT tip) |
| Speech Blubs / BabyCenter / Cozi | Category leaders | All-in-one | Parent never reaches the “all” |

**Honest answer to “why pay instead of free?”:** today, most parents should not. The differentiated system is behind signup, onboarding, and navigation. The free first minute is not worth ₹199.

---

## 7. Onboarding Audit

Two onboarding products exist. **Default live path is Child Discovery Film** (`isChildDiscoveryFilmEnabled()` → portfolio living flag, default ON). Legacy chat (21+ steps) remains behind `VITE_FF_CHILD_DISCOVERY_FILM=0`.

### Path A — Child Discovery Film (default)

| Step | Purpose | Parent value | Friction | Drop-off risk | Recommendation |
|------|---------|--------------|----------|---------------|----------------|
| arrival | Continuity from `/begin` | Low — restates process | Low | Low | Replace with child outcome in one line |
| place | Country | Education defaults | Low (IP skip) | Low | Keep |
| child-name | Identity | Medium | Low | Low | Skip if FE seeded (already does) |
| child-age | Age band | High | Low | Low | Keep |
| today-world | School vs home | Medium | Low | Medium if “unsure” | Keep |
| infant-feeding / sleep | Infant care | High for 0–24m | Medium | Medium | Keep for infants only |
| rhythm | Confirm wake/sleep | Medium | Low | Low | Keep |
| focus | Goal (sleep, tantrums, screens…) | High | Low + skip | Low | **Lead with this** — it is the sale |
| earned | NRT preview | High if specific | Low | Medium if same generic tip as `/begin` | Must differ from FE tip |
| saving / done | Persist | None | Passive | Low | Speed up |

**Is this selling or configuring?** Mostly **configuring**, dressed as a film. The focus beat is the only explicit parent-pain ask. Diet, allergies, school times, parent work are **inferred** (defaults: vegetarian, work_from_home, mother, no allergies). That is good for speed and dangerous if the generated routine is wrong.

### Path B — Legacy chat (kill-switch)

21+ questions including cuisine region, diet, school timetable. High drop-off historically (69% never finish). Do not put paid traffic on this path.

### Auth + child setup friction

- Unsigned users get value-before-identity on `/begin` (**good**).
- To keep anything, they must create an account (**historical 73% death**).
- `FF_GUEST_TRY_FIRST` default **OFF**.
- Discovery Film then re-confirms name/age/today — feels like “I already did this.”
- Child form later: only name required.

**Onboarding is not selling the subscription. It is not even selling the routine.** It is selling *understanding*. Parents do not pay for being understood until they see a plan that works tonight.

---

## 8. Dashboard Audit

Default post-onboarding land: **`/dashboard`** (`POST_ONBOARDING_ACTIVATION_PATH` when Today Home V1 is on).

### Does it answer “what should I do with my child right now?”

**Today Home V1 (default ON):** Yes, *if* the hero resolves a single NRT and the parent taps Begin. Empty copy: “No plan for today yet. Amy can shape one around {child}.” That is the strongest post-auth screen in the product.

**Legacy dashboard:** Weaker. Weather, retention check-in, 7-day journey, feature discovery strip compete with `FirstValueHeroCard` (“See today’s plan”). Comment in code: only ~18% of dashboard users reached `/routines/generate`.

### Does it answer “why is AmyNest useful to me?”

Only after a plan exists. First landing is often **empty**. Continuity greeting (“{name}'s first success is still here”) helps FE completers and is invisible to everyone else.

### Failure modes present

| Failure | Evidence |
|---------|----------|
| Empty dashboard | No today routine until generate |
| Too many choices | Hub / rooms / discovery strip still reachable |
| Feature dumping | Parent Hub 8 groups, dozens of tiles |
| Subscription too early | `/subscription-trial` can intercept before home |
| Subscription too late | Soft paywalls deferred; most never hit a lock after a win |

**Parent test:** “I finished a long setup and you still don’t have a plan until I tap again.” One extra decision after onboarding is a conversion leak. Jul 6: **60% of onboarding finishers never reached `/routines/generate`**.

---

## 9. Core Feature Value Audit

| Feature | Problem solved | Value obvious? | Differentiated? | First session? | Could drive sub? | Helping conversion now? | Class |
|---------|----------------|----------------|-----------------|----------------|------------------|-------------------------|-------|
| **First Experience NRT** | “What do I do right now?” | Somewhat | **No** (generic advice) | **Yes** | Weak | Sets wrong product story | **CONFUSING** |
| **Routines** | Structure the day | Yes once seen | Yes (age + feedback) | Only if they generate | **Yes — primary** | Intended spine; historically unused | **CORE CONVERSION DRIVER** |
| **Today Home** | One next action | Yes | Yes | After auth | Yes | Best current frame | **CORE CONVERSION DRIVER** |
| **Amy AI / Coach** | In-the-moment help | Yes | Medium | No (hub/assistant) | **Yes** | Store-promised, path-hidden | **CORE CONVERSION DRIVER** (mis-positioned) |
| **Speech Coach** | Practice speaking | Yes for that parent | Yes vs notes | No | **Yes** for speech ads | Dead for general cohort (Jul hub: 1 user) | **SUPPORTING VALUE** / speech-intent **CORE** |
| **Infant Hub** | Feeds, sleep, cry | Yes for 0–24m | Medium | Infant shortcut only | Medium | Wrong for toddler/school ads | **SUPPORTING VALUE** |
| **Nutrition** | Meals / picky eating | Medium | Low | No | Medium | Near-zero hub usage (Jul) | **DISCOVERY FEATURE** |
| **Learning / phonics / games** | Child engagement | Medium | Medium | No | Medium | Distracts first session | **DISCOVERY FEATURE** / early **DISTRACTION** |
| **Rooms / Parent Hub** | Browse the OS | No | No (mall) | No | Retention expander | Overwhelms | **DISTRACTION** on day 0 |
| **Rewards / streaks** | Habit loop | Low day 0 | No | No | Indirect | Premature | **SUPPORTING VALUE** |
| **Progress / weekly reports** | Proof | After days of use | Medium | No | Medium | Paywall lists it before it exists | **SUPPORTING VALUE** |
| **Birth Sky / Health Lab** | Novelty / wellness | Low for core sale | Niche | No | Weak | On paywall benefit list | **DISTRACTION** on paywall |
| **Notifications** | Return tomorrow | After value | No | Opt-in later | Retention | Correctly deferred | **SUPPORTING VALUE** |

**Strategic truth:** Routines + Today Home + Amy-in-context are the only honest conversion drivers. Everything else is a retention catalog that currently **dilutes** the sale.

---

## 10. Paywall Audit

### Surfaces

| Surface | When | Parent has experienced | Headline (verbatim) | CTA |
|---------|------|------------------------|---------------------|-----|
| `PaywallModal` | Feature lock / `openPaywall` | Often little or a single lock | Default: **“Continue your child's journey”** | **Start Growing Together** |
| `/pricing` | Banners, See Plans, winback | Mixed | **“Keep Amy beside you.”** | Plan CTAs |
| `/subscription-trial` | After onboarding if flag on | **Setup only — no routine required** | **“You can use AmyNest for free”** | Continue with AmyNest · See Plans |
| `/subscription-trial-ended` | Internal trial expiry (server-confirmed) | 3 days later | **“Your free exploration has ended”** | Continue My Child's Journey |
| Trial banner | Dashboard/hub during trial | Variable | “You have N days remaining…” | Subscribe Now |
| Post-activation banner | After first routine | **Best timing** | “Loving your routines? Upgrade today” | Upgrade |
| Winback | Lapsed paid | Had paid | “Their routines and progress are still here” | Reactivate Growth Year |
| Moment sheet | Value moments | After a win | Per-trigger | Contextual |
| Native RC paywall | Flag default **OFF** | — | “The growth system for ages 0–12” | Continue with AmyNest Premium |

### Default modal contents (what most locks show)

- **Subtitle:** “You've already started with AmyNest. Premium keeps AI guidance, routines, learning, and reports working together every day.”
- **Benefits (`PAYWALL_CORE_BENEFITS`):** Unlimited AI · Unlimited personalized routines · Weekly family reports · **Health Lab** · Complete learning journeys · Educational games library · **Birth Sky stories** · Priority AI responses
- **Free vs Premium matrix:** honest quotas (3 routines, 3 speech, 2 games, daily AI limit)
- **Social proof:** “Parents use AmyNest every day…” / “Designed to grow with your child.” / “Trusted parenting guidance powered by AI.” — **no names, no ratings, no reviews**
- **Plans:** monthly “Try the System” · six_month “Steady Progress” · yearly “Growth Year”
- **Close:** Maybe later · exit intercept “Before you go…”
- **Restore:** native only
- **Trust:** Cancel anytime · Privacy/Terms links
- **Referral:** “invite friends to earn premium free” (undercuts urgency)

### Does the parent see the paywall after understanding value?

**Usually no.**

- Soft locks are deferred until first routine — good *in theory*, but **~90% never generate**, so they never see a paywall after a win.
- `FF_POST_ONBOARDING_TRIAL` default **true** can show monetization **before** the dashboard.
- Quota locks (`ai_quota`, `routines_limit`) can fire before the parent loves the feature.
- Jul trial cohort: **1/29** saw a paywall (because trial = premium). Current code no longer grants premium on internal trial — parents will hit limits *without* having been delighted.

**Paywall timing is both too early (trial interstitial) and too late (never activated).**

---

## 11. Pricing Audit

| Plan | USD fallback | India web (Razorpay) | Native store | Marketing frame |
|------|-------------:|---------------------:|--------------|-----------------|
| Monthly | $4.99 | ₹199 | RC / Play / App Store live | Try the System |
| Six month | $24.99 | ₹999 | live | Steady Progress · “Most Popular” on API; modal suppresses 6-mo badge and highlights **yearly** as Most Popular / Best Value |
| Yearly | $39.99 | ₹1499 | RC seed documents **₹1599** | Growth Year · Smartest Choice |

**Trial:** internal **3 days** (`FREE_LIMITS.trialDays`). Not a store intro trial in app code. Store intro offers, if any, live in Play/App Store Connect — not verified here.

**Presentation:** per-month equivalent on annual (flag ON). First visit defaults `six_month`; repeat visits `yearly`.

### Is price the blocker?

**No.** ₹199/month is a snack price in India if the parent believes the app will remove daily friction. $4.99 is cheap vs Speech Blubs / tutoring.

**Value perception vs price:** weak value communication makes **any** price feel like “another subscription.” Do **not** cut price to fix this. Prove tonight’s plan, then ask.

**Sharp edges:** yearly INR web ₹1499 vs Play/RC ₹1599; web checkout **India-only**; store-trial users with `isPremium` can have `/pricing` checkout suppressed (`shouldSuppressPremiumMonetization` uses `allPremiumAccess`).

---

## 12. Purchase Technical Audit

### Paths (current code)

| Channel | Path | Status in code |
|---------|------|----------------|
| Android Play | `use-native-billing` → `BillingBridge` → RC `purchaseWith` → webhook → `isPremiumSubscriber` | Wired. Jul cohort: **0 purchases reached the bridge**. |
| iOS | Capacitor RC → App Store → same finalize | Wired. Aug 18 Apple event audit: **ads not instrumented; do not spend**. |
| Web India | Razorpay / UPI create → verify → poll entitlements | Wired. |
| Web other countries | Message: subscribe in the app | **No purchase.** |

### Entitlements (current — improved vs Jul 6)

- Internal trial (`provider=none`, active `trialEndsAt`) → **`isPremiumNow = false`**. Feature caps apply. Checkout **shown**. This **fixes** the Jul P0 (trial hid Subscribe / showed Cancel).
- Grandfathered internal trials started before **2026-07-26** still get `isPremium=true`.
- Paid unlock: Razorpay/RC + `ACTIVE`/`CANCELLED` + valid period end → `isPremiumSubscriberNow`.
- Free users **can** use premium features until `FREE_FEATURE_LIMITS` (AI 10/day, routines 3 lifetime, speech 3, etc.).
- Inconsistency: `FREE_LIMITS.routinesMax = 2` vs `FREE_FEATURE_LIMITS.routine_generate = 3` vs paywall matrix **“3 total”**.

### Restore / errors

Restore exists on native paywall + pricing. Cancel is silent. Pending sync tells the user to wait / restore. Guest checkout blocked.

### Does payment unlock premium?

**In code, yes** — after webhook/verify + client poll. **In live history, almost nobody completed a payment**, so unlock is not battle-tested for a paid-ads volume. Jul 18: 2 RC ACTIVE matched DB. Device lifecycle matrix (refund, grace, account hold) still **unsigned**.

### Can free users accidentally get premium?

Admin/manual grants and grandfathered trials can. Internal trial no longer does (post-cap). Journey / preview routes exist for some modules.

**Purchase is not the reason you have zero subs today. Reaching a healthy checkout after a felt win is. Treat live purchase as “wired, under-proven.”**

---

## 13. Trust Audit

| Area | Current | Parent hesitation |
|------|---------|-------------------|
| Privacy | `/privacy` — no sale of data, no third-party ads to children, parent-managed profiles, delete via support@amynest.in | Good. Last updated April 21, 2026 — feels stale. |
| Child safety | 18+ parent account; no child login | Good. Not said on first screen. |
| AI transparency | Terms: not medical advice. `/amy` FAQ says not a doctor. FE does not disclose the NRT is a **rules engine**, not a model. | Medium — “Amy is noticing” overclaims a lookup table. |
| Permissions | Deferred until after value on native | Good. |
| Account security | Firebase auth, Google sign-in | Fine. Auth *friction* is the issue. |
| Subscription transparency | Cancel anytime on paywall | **Conflicts with Terms: “All fees are non-refundable except as required by law.”** |
| Brand / social proof | Generic sentences only | **Critical gap.** No reviews, names, city, “10,000 parents,” or Play rating. |
| Support | support@amynest.in, `/feedback` | Not on first session or paywall hero. Pricing has a support link. |
| Store credibility | Play listing exists (`com.amynest.app`) | Localized listings may still say KidSchedule (ASO report). |
| Testimonials | **None in repo** | Parents of children do not buy anonymous AI. |

---

## 14. Analytics / Funnel Audit

### Requested events vs current

| Requested | In taxonomy / client? | Usable for ads? |
|-----------|----------------------|-----------------|
| app_open | Yes | Yes |
| onboarding_started | Funnel step | Yes |
| onboarding_completed | Client emits; observatory counts **`finish_clicked`** | **Mismatch** |
| child_created | No; `child_profile_created` only on add-child form | **Onboarding child save missed** |
| first_value | `first_value_achieved` | Yes if queried correctly |
| routine_created | `routine_generation_completed` / `routine_generated` | Yes |
| game_started | No canonical | Blind |
| room_opened | No (localStorage) | Blind |
| premium_feature_view | `premium_gate_seen` etc. | Partial |
| paywall_view | `paywall_opened` / `premium_paywall_viewed` | Yes |
| paywall_dismiss | `paywall_close` | Rename for dashboards |
| subscribe_clicked | Funnel step | Yes |
| checkout_started | Funnel step | Yes |
| purchase_success / failed | Funnel steps | Yes — historically 0 / 7 |
| restore_purchase | Funnel + native | Yes |
| subscription_active | No; `entitlement_activated` / `upgrade_completed` | Map it |

Paid vs free: `subscription_state` attached after entitlements resolve. Pre-auth events cannot distinguish.

Attribution **code** captures UTM, gclid, fbclid, Play referrer. July **live** showed 0 paid-channel installs and 100% unknown UTM. Either ads were not actually hitting the product, or the bridge was broken.

### Funnel model

| Stage | Instrumentation | Expected friction | Missing | Major risk | Recommended event |
|-------|-----------------|-------------------|---------|------------|-------------------|
| AD IMPRESSION | Ads manager only | Creative | No product event | Unmeasurable | `ad_impression` (ads side) |
| AD CLICK | Ads + landing `landing_page_view` | Promise mismatch | Click IDs often dropped | US junk / bots | `ad_click` + gclid/fbclid persist |
| STORE / LANDING | `play_store_click`, `install_intent` | Listing vs app | Play CVR not in DB | ASO overpromise | `store_listing_view` (Play) |
| INSTALL | `device_registered`, `install_source` | WebView cold start | Campaign empty in Jul | 79% instant exit | `install_source` **must** carry campaign |
| FIRST OPEN | `app_open`, `first_open` | Splash | — | Bounce | keep |
| SIGNUP | `signup_completed` / auth | **73% historical drop** | Google bypass undercount | Auth wall after FE | `signup_completed` + method |
| ONBOARDING COMPLETE | funnel; SQL uses `finish_clicked` | Re-ask after FE | `onboarding_completed` not in observatory | Double onboarding feel | unify step name |
| FIRST VALUE | `first_value_achieved` | Extra generate tap | Many never fire | 89.9% dash→routine | keep; add `nrt_completed` for FE |
| CORE FEATURE USE | routine_* strong; games/rooms weak | Hub mall | room/game events | Distraction | `room_opened`, `game_started` |
| PAYWALL VIEW | multiple aliases | Too early / too late | single `paywall_view` | Inflated counts | one canonical event |
| CHECKOUT | `checkout_started` | Web non-IN dead | — | Billing not ready | keep |
| PURCHASE | `purchase_success` | Under-proven | 0 historical | Failed six_month | keep + store txn id |
| SUB ACTIVE | entitlement sync | Webhook lag | `subscription_active` | False premium | emit on server grant |

**Minimum taxonomy before scaling ads:** `install_source` (campaign), `first_open`, `signup_completed`, `onboarding_completed`, `first_value_achieved`, `paywall_view`, `paywall_dismiss`, `subscribe_clicked`, `checkout_started`, `purchase_success`, `purchase_failed`, `subscription_active`, plus `utm_*` / `gclid` / `fbclid` on every one of those.

Until those reconcile in a live dashboard for 7 consecutive days, **do not buy traffic**.

---

## 15. Parent Objection Map

| Parent objection | Current answer in app | Severity | Fix |
|------------------|----------------------|----------|-----|
| Why do I need this? | “Begin with today” / next right thing | **Critical** | First screen: “Get {name}’s plan for today” |
| Why should I pay? | Feature list + free-vs-premium matrix | **Critical** | Sell the plan/coach moment they just had |
| Is this safe? | Privacy page; not on first session | High | One line on FE + paywall: parent-only, no child ads |
| Is this useful for my child? | After a routine — maybe | **Critical** | Child-visible win in session 1 (routine item or 60s speech) |
| Better than free alternatives? | Ecosystem one-liner on paywall | **Critical** | Show one thing ChatGPT cannot: *today’s schedule that the child can follow* |
| Will my child actually use it? | Not demonstrated | High | Speech/game only after first plan, as proof |
| Is setup difficult? | Film claims “not a form”; still many beats | High | Skip Discovery if FE complete; generate immediately |
| Can I cancel? | Paywall yes; Terms non-refundable | High | Align terms + one “cancel in Play Store” line |
| Is this worth the price? | ₹199 / $4.99 never anchored to a felt win | High | Anchor: “less than one snack / one tutoring session — after you’ve used today’s plan” |

---

## 16. Conversion Leak Map

Ranked blockers.

| Rank | Blocker | Severity | Funnel stage | Expected conversion impact | Evidence | Recommended fix | Priority |
|------|---------|----------|--------------|---------------------------|----------|-----------------|----------|
| 1 | Product identity conflict (NRT film vs AI coach vs 8-tool OS) | **Critical** | Ad → first 60s | Kills qualified intent | `/begin` vs `play-store-metadata.md` vs `PAYWALL_CORE_BENEFITS` | One promise, one first screen | **P0** |
| 2 | First “value” is generic advice, not the product | **Critical** | First value | Parents leave thinking “I already know this” | `decide-next.ts` tips | FE should **generate/show today’s plan**, not a phone-down tip | **P0** |
| 3 | Auth wall after the tip (73% historical loss) | **Critical** | Signup | Loses majority of paid installs | Jul 13 funnel; `FF_GUEST_TRY_FIRST=false` | Guest continue into today’s plan; account at save/sync | **P0** |
| 4 | Extra generate step after onboarding (60–90% never) | **Critical** | First value | No activation → no paywall-after-value | Jul 6 60% finish→generate; 89.9% dash→routine | Auto-generate on finish; land on the plan | **P0** |
| 5 | Cannot measure paid ads | **Critical** | Whole funnel | Blind spend | Jul 13: 0 Meta/Google attributed installs | Prove `install_source` + purchase with campaign for 7 days | **P0** |
| 6 | Paywall sells features / unused modules | **High** | Paywall | Low checkout intent | `PAYWALL_CORE_BENEFITS` includes Health Lab, Birth Sky | Outcome copy tied to the lock + child name | **P1** |
| 7 | Monetization interstitial before home | **High** | Onboarding → paywall | Ask before value | `FF_POST_ONBOARDING_TRIAL` default true | Default OFF until first routine | **P1** |
| 8 | No social proof | **High** | Trust / paywall | Parents of kids don’t buy anonymous AI | Generic `PAYWALL_SOCIAL_PROOF` | Real Play rating + 2 named quotes | **P1** |
| 9 | Purchase under-proven + web non-IN dead | **High** | Checkout | Failed or impossible buy | 0 `purchase_success`; web lock | Sandbox purchase QA; Play-only CTA for ads | **P0** |
| 10 | Hub/rooms feature dump | **Medium** | Dashboard | Dilutes next action | Parent Hub truth audit | Hide hub until first routine done | **P1** |
| 11 | Store/ad promise ≠ first minute | **High** | Ad → first open | Refunds + chargebacks + junk CPA | `/amy` “AMY on dashboard after 2 min” | Match ads to Today’s plan | **P0** |
| 12 | Terms vs cancel copy | **Medium** | Trust | Last-second abort | `terms.tsx` non-refundable | Align legal + UI | **P1** |
| 13 | D7 2.4% | **Critical** (economics) | Retention | Even 2% trial→paid loses money if nobody returns | Jul 13 | Do not scale until D1 ≥15% on a qualified cohort | **P0** |
| 14 | Wrong geo / instant-exit traffic | **High** | Ad targeting | Wasted spend | 44% US; 79% &lt;5s | India (and later US) **parent** lookalikes only after P0 | **P1** |
| 15 | Routine cap copy mismatch (2 vs 3) | **Low** | Pricing trust | Confusion | `FREE_LIMITS` vs matrix | One number | **P2** |

---

## 17. Estimated Conversion Range

**ESTIMATE — NOT OBSERVED DATA.**

There is **no current live funnel** in this investigation. Ranges are anchored to July observed rates plus judgment about current code. They are **not** forecasts you should put in an ads budget.

### Install → paid subscription

| Case | Range | Assumptions |
|------|-------|-------------|
| **Conservative** | **0.05–0.20%** | Traffic quality like Jul (many instant exits / wrong geo). Auth + activation leaks persist. Purchase still rare. Matches historical ~0%. |
| **Base (current product, qualified India parents)** | **0.2–0.6%** | Parents who want routines; Android app (not desktop web); purchase path works; still poetic FE + extra generate step. |
| **Strong execution (after P0/P1)** | **0.8–1.5%** | First screen = today’s plan; guest path; auto-generate; paywall after a completed routine; attribution works; D1 ≥12%. Still below a mature parenting-subscription benchmark (often 2–4% when the aha is sharp). |

### Supporting observed (July) step rates — **observed, dated**

- Install → first open: 53%
- First open → signup: 27%
- Install → routine: 8%
- Paywall → checkout: ~12% of paywall viewers (2/16)
- Checkout → paid: **0%**
- D7: **2.4%**

**If D7 stays near 2%, paid ads are structurally unprofitable** even at a “strong” 1% install→paid, because those subscribers will not stay.

**Insufficient evidence for a reliable 2026-09 estimate of the *live* funnel.** The ranges above are planning bounds, not KPIs.

---

## 18. Top 10 Changes Before Paid Ads

| # | Change | Why | Screen / file | Priority | Expected impact |
|---|--------|-----|---------------|----------|-----------------|
| 1 | **One promise.** Ads, store, `/begin`, and paywall all say: AmyNest gives your child **today’s plan**. | Stops identity whiplash | `first-experience.tsx`, `play-store-metadata.md`, `subscription-marketing` | P0 | Recovers wasted intent |
| 2 | **First session = generate and show today’s routine**, not a generic phone-down tip | Tip is not worth money; a plan is | `decide-next.ts` + `/routines/generate` | P0 | Activation + TTFV |
| 3 | **Remove or defer the account wall** until the plan is visible / save | 73% died at signup | `first-experience.tsx`, `FF_GUEST_TRY_FIRST` | P0 | Largest volume unlock |
| 4 | **Auto-create first routine on onboarding finish**; land on the plan, not empty home | 60–90% never tap generate | `onboarding-navigation.ts`, `child-discovery-film.tsx` | P0 | First value |
| 5 | **Turn off post-onboarding trial interstitial** until first routine | Asking before value | `subscription-feature-flags.ts` `FF_POST_ONBOARDING_TRIAL` | P1 | Paywall after aha |
| 6 | **Rewrite paywall to outcomes of the plan they just used**; drop Birth Sky / Health Lab from default bullets | Feature list does not convert parents | `paywall-modal.tsx`, `lib/subscription-marketing` | P1 | Checkout intent |
| 7 | **Prove attribution + purchase in live for 7 days** (campaign on `install_source`, one sandbox/live purchase, `purchase_success`) | Cannot scale a blind funnel | analytics + Play + RC | P0 | Ads accountability |
| 8 | **Add real social proof** (Play rating, 2 parent quotes) on landing + paywall | Child + money = trust required | paywall + ASO pages | P1 | Trust |
| 9 | **Hide Parent Hub / rooms / games until first routine is completed** | Mall kills the sale | `parenting-hub` entry, dashboard strip | P1 | Focus |
| 10 | **Run ads only to Android / India (or one geo) “today’s plan”** after D1 ≥15% on a 200-install organic/cohort test | D7 2.4% + US junk will burn cash | ads manager + targeting | P0 | Protect spend |

---

## 19. Exact Selling Strategy

**Core positioning**  
AmyNest gives you your child’s next right thing today — a real daily plan, not another parenting feed.

**Parent-facing promise**  
In two minutes, see what your child should do next today, then actually do it together.

**Primary subscription reason**  
Because the plan, Amy’s help, and practice keep adapting every day — notes and YouTube do not.

**Best first-session CTA**  
See {name}’s plan for today.

**Paywall headline**  
Keep {name}’s days this clear.

**Paywall supporting message**  
You already have today’s plan. Premium keeps Amy building tomorrow’s routine, answering the hard moments, and tracking the progress you can see — without starting over in five other apps.

**Primary CTA**  
Continue {name}’s plan

**3–5 strongest subscription benefits (outcomes, real product)**

1. A daily routine that fits {name}’s age and actual day — not a blank calendar  
2. Amy in your pocket when bedtime, meals, or tantrums blow up  
3. Speech and learning practice that sits *inside* the day, not as another app  
4. Progress you can see at the end of the week  
5. Cancel anytime in Google Play (must match terms)

---

## 20. Paid Ads Strategy

**Do not run this until P0s ship and a 200-install cohort proves D1 and attribution.**

**Who to target**  
Parents 25–40, Android, **India first** (IN + maybe AE), child age 2–8, interests: preschool, routines, parenting, school mornings. Exclude generic “self-improvement” and US broad until geo quality is clean.

**Pain point**  
Morning / after-school / bedtime chaos: “I know what I *should* do, I just need the next step for *this* child today.”

**Promise**  
Get today’s plan for your child in two minutes.

**Do not promise**  
“Best parenting app.” “24/7 AI coach on your dashboard.” “Eight tools.” “Speech therapist.” “Medical sleep advice.”

**First screen after the ad**  
`/begin` rewritten **or** a campaign landing that is the same as `/begin`: child’s name → age → **today’s plan on screen**. Not AMY chat. Not Hub.

**First minute**  
Name, age, today-type, **visible plan with 4–6 blocks**. One tap: Start the first block. No account yet.

**When monetization appears**  
After the parent marks the first block done **or** generates the plan and opens Amy about it. Not before. Soft paywall after first routine. Hard paywall on the 3rd extra generate / AI quota with the outcome they just felt.

**Creative**  
UGC parent in a kitchen, 15s: chaos → opens AmyNest → child’s name on a simple timeline → child doing the first step. End card: “Today’s plan. Free to start.”

---

## 21. Experiment Roadmap

Run **after** P0 instrumentation. One variable at a time. Minimum 400 first-opens per cell or 2 weeks.

| # | Experiment | Hypothesis | Variant A | Variant B | Metric | Success threshold |
|---|------------|------------|-----------|-----------|--------|-------------------|
| 1 | First-screen messaging | Outcome > poetry | “Begin with today” | “Get {name}’s plan for today” | `/begin` complete + signup | +25% FE complete |
| 2 | Onboarding length | Skip film if FE done | Current Discovery Film | FE seed → skip to generate | Onboarding complete | +20% finish |
| 3 | First-value experience | Plan > tip | Current NRT tip | Auto routine on FE complete | `first_value_achieved` / first_open | ≥25% (vs ~8% hist.) |
| 4 | Paywall timing | After aha > after setup | Post-onboarding trial ON | Trial only after first routine | paywall→checkout | +50% relative |
| 5 | Paywall copy | Outcomes > features | Current 8-feature list | 4 outcome bullets + child name | subscribe_clicked / view | +30% relative |
| 6 | Pricing presentation | Monthly-first reduces fear | Current 6-mo/year bias | Monthly selected + “cancel anytime” | checkout_started | +20% (watch LTV) |
| 7 | Annual vs monthly | Yearly highlight too soon | Yearly Most Popular | Monthly default, yearly as save | checkout + refund rate | checkout +15% without +refund |
| 8 | CTA wording | Specific > Continue | Continue | See {name}’s plan | CTA tap | +15% |
| 9 | Parent benefit | Stress relief vs child growth | Child-growth headline | “Fewer battles this week” | paywall convert | pick winner on checkout |

---

## 22. READY-TO-IMPLEMENT FIX LIST

No live behavior was changed in this investigation. Implement only when separately authorized.

### F1 — First-screen promise (P0)

- **File:** `artifacts/kidschedule/src/pages/first-experience.tsx`
- **Component:** welcome `Shell`
- **Current:** “Begin with today” / “One next right thing — formed only from what you share.” CTA Continue
- **Desired:** “Get a plan for your child today.” One line of parent benefit. CTA “See today’s plan”
- **Intent:** Align first paint with the sellable job
- **Acceptance:** Copy visible on `/begin`; marketing event still fires
- **Risk:** Brand/film tone; i18n keys

### F2 — FE result is a routine preview, not a generic tip (P0)

- **Files:** `artifacts/kidschedule/src/lib/first-experience/decide-next.ts`, reveal UI in `first-experience.tsx`
- **Current:** Deterministic tips (“sit with no phone”, “one story”)
- **Desired:** Same inputs produce a **4–6 item today plan** (reuse routine templates / generate API if signed in; local template if guest)
- **Intent:** TTFV = product
- **Acceptance:** Reveal shows timed blocks (wake/meal/play/bed), not only a mindfulness tip
- **Risk:** Offline generate; infant vs school-age templates; must not invent medical advice

### F3 — Guest path through the plan (P0)

- **Files:** `first-experience.tsx` keep room; `artifacts/kidschedule/src/lib/mrr-experiment-flags.ts` (`FF_GUEST_TRY_FIRST`)
- **Current:** Keep with an account / Not now (local only). Guest flag default false
- **Desired:** Primary CTA continues into today’s plan without account; account on “save across devices”
- **Acceptance:** Unsigned user can see a full plan; signup optional
- **Risk:** Entitlements/device limits; abuse of AI generate

### F4 — Auto-generate on onboarding complete (P0)

- **Files:** `artifacts/kidschedule/src/lib/onboarding-navigation.ts`, `pages/child-discovery-film.tsx`, `pages/onboarding.tsx`
- **Current:** Navigate `/dashboard`; parent must tap generate
- **Desired:** Finish transaction triggers first routine generate; navigate to routine detail (or dashboard with plan filled)
- **Acceptance:** `first_value_achieved` fires without a second generate tap for happy path
- **Risk:** Generate failures; double-create; paywall `routines_limit` on first

### F5 — Default off post-onboarding trial page (P1)

- **File:** `artifacts/kidschedule/src/lib/subscription-feature-flags.ts`
- **Current:** `FF_POST_ONBOARDING_TRIAL` default **true**
- **Desired:** default **false** (or gate on `hasFirstRoutineActivationProgress`)
- **Acceptance:** Fresh completer lands on plan/home, not `/subscription-trial`
- **Risk:** Trial attach rate drops — acceptable until activation is fixed

### F6 — Paywall default benefits = outcomes (P1)

- **Files:** `lib/subscription-marketing/src/index.ts` `PAYWALL_CORE_BENEFITS`; `artifacts/kidschedule/src/components/paywall-modal.tsx`
- **Current:** Health Lab, Birth Sky, games library, priority AI
- **Desired:** Four outcomes: calmer days, today’s plan every day, Amy in hard moments, progress you can see. Child-name personalization already exists — use it as default
- **Acceptance:** Modal test `paywall-benefits-list` shows outcomes; no unused-module names on default lock
- **Risk:** Some lock reasons (phonics, infant) should keep specific copy

### F7 — Observatory event names (P0 measurement)

- **File:** `artifacts/api-server/src/services/growth-observatory/funnel-intelligence.ts`
- **Current:** onboarding complete = `finish_clicked` only
- **Desired:** also count `step = onboarding_completed`; emit `child_profile_created` from Discovery finish
- **Acceptance:** SQL matches client; one dashboard row per stage in section 14
- **Risk:** Double-count if both fire — use OR + distinct user

### F8 — Align legal cancel/refund (P1)

- **File:** `artifacts/kidschedule/src/pages/terms.tsx`
- **Current:** “All fees are non-refundable except as required by applicable law.”
- **Desired:** Store-policy-accurate: Play/App Store manage + cancel; refunds per store law
- **Acceptance:** No contradiction with paywall “Cancel anytime”
- **Risk:** Legal review required

### F9 — Hide hub until first routine (P1)

- **Files:** dashboard feature strip; nav to `/parenting-hub`
- **Current:** Hub reachable immediately
- **Desired:** Hub entry after `hasFirstRoutineActivationProgress()`
- **Acceptance:** New user cannot open rooms mall before first plan
- **Risk:** Infant parents who need Infant Hub first — allow infant shortcut only

### F10 — Single routine cap number (P2)

- **Files:** `subscriptionService.ts` `FREE_LIMITS.routinesMax` vs `FREE_FEATURE_LIMITS.routine_generate` vs `FREE_VS_PREMIUM_MATRIX`
- **Desired:** One number (recommend 3, matching marketing)
- **Acceptance:** Lock + copy + server agree
- **Risk:** Off-by-one for users already at 2

---

## 23. Final Recommendation

**NO-GO for paid ads.**

Ship the P0 list (promise, first-session plan, guest path, auto-generate, measurement + one proven purchase). Then run a **200-install organic or $50–100 geo-fenced test**, not a campaign.

Promote to **CONDITIONAL GO** only when all of these are true:

1. First screen and ads say the same job  
2. ≥25% of first opens reach `first_value_achieved`  
3. D1 ≥15% on that cohort  
4. `install_source` carries campaign on ≥80% of paid installs  
5. A real Play (or Razorpay) purchase unlocks premium in &lt;30s and emits `purchase_success`  
6. Paywall is shown **after** a completed plan, with outcome copy and real social proof  

Promote to **GO** only when a small paid test also shows install→paid **≥0.8%** with CPA below 1 month of ₹199/$4.99 **and** D7 ≥10%.

Until then, paid traffic will buy you more of what July already proved: installs, confusion, and ₹0.

---

## Hypothesis tree (zero subscriptions)

| ID | Hypothesis | Evidence available | Evidence missing | Confidence | Prove / disprove |
|----|------------|--------------------|------------------|------------|------------------|
| H1 | No/low qualified traffic | Jul spike 20–32 installs/day; 0 paid-channel tags | Live Sep 2026 traffic; Play Console | Medium that *current* traffic is low; **High that July traffic was not zero** | Play + `device_registered` 14d |
| H2 | Install but don’t understand | `/begin` copy; store mismatch; 79% instant exit | Session recordings | **High** | First-screen A/B + 30s retention |
| H3 | Understand but no value | 8% routine; 89.9% dash→routine; FE is a tip | 2026-09 rates | **High** | `first_value_achieved` / first_open |
| H4 | Value but no trust | No testimonials; terms vs cancel | Survey | Medium | Paywall with/without proof |
| H5 | Want it, no reason to pay | Feature paywall; free tip; generous free quotas | Interview | **High** | Outcome paywall after plan |
| H6 | Paywall weak | Feature list; generic proof; trial interstitial | Live paywall→checkout now | **High** | Copy + timing test |
| H7 | Pricing weak | ₹199/$4.99 reasonable | Price test | **Low** as root cause | Do not discount first |
| H8 | Purchase broken / friction | 0 success; 7 failures; web non-IN block; Jul trial hid CTA (fixed in code) | Live purchase after fixes | Medium–High historically; Medium now | One QA purchase both stores |
| H9 | Wrong audience | 44% US; instant exits | Ads account geos | Medium | India parent campaigns only |
| H10 | Product too broad / wrong aha | Hub mall; 8-tool paywall; NRT ≠ routine | — | **High** | Constrain day-0 surface |

---

## Appendix A — Code map (high signal)

| Concern | Path |
|---------|------|
| First open redirect | `artifacts/kidschedule/src/AppCore.tsx` `HomeRedirect` |
| First session | `artifacts/kidschedule/src/pages/first-experience.tsx` |
| NRT engine | `artifacts/kidschedule/src/lib/first-experience/decide-next.ts` |
| Discovery Film | `artifacts/kidschedule/src/pages/child-discovery-film.tsx`, `lib/child-discovery/beats.ts` |
| Post-onboarding path | `artifacts/kidschedule/src/lib/onboarding-navigation.ts` |
| Activation defer | `artifacts/kidschedule/src/lib/activation-gate.ts` |
| Paywall | `artifacts/kidschedule/src/components/paywall-modal.tsx` |
| Marketing copy | `lib/subscription-marketing/src/index.ts` |
| Premium gate | `artifacts/api-server/src/services/subscription-premium-gate.ts` |
| Free limits | `artifacts/api-server/src/services/subscriptionService.ts` |
| Android billing | `android/app/src/main/kotlin/com/amynest/app/BillingBridge.kt` |
| Store promise | `play-store-metadata.md` |
| Prior conversion data | `docs/product-growth/conversion-audit-2026-07-06.md`, `subscription-audit-2026-07-06.md`, `analytics-growth-report.md` |
| Apple ads | `docs/v2/AMYNEST_APPLE_SUBSCRIPTION_EVENT_AUDIT.md` (NO) |

## Appendix B — What this audit did not redo

Rooms remediation, Play compliance, navigation containment, and live architecture certifications were treated as **already done**. They do not change the conversion verdict.

## Appendix C — What this audit could not verify live

Live subscription counts as of 2026-09-09, Play Console install/CVR, Meta/Google Ads Manager, current D1/D7, and a real-money purchase on this build. Founder-reported **zero subscriptions** is taken as the commercial truth.

---

## Final question

**If I were a parent discovering AmyNest for the first time today, would I personally pay for the subscription after using the app?**

# NO

I would tap through a beautiful film, get a tip I already know (“put the phone down and sit with your child”), hit an account wall, answer more questions, land on a home that still asks me to generate a plan, glimpse a mall of rooms and games, and then be asked to pay for Health Lab, Birth Sky, and unlimited AI.

I would not be able to tell my partner what AmyNest *is*. I would not have seen my child use it. I would not have seen another parent’s proof. I can get a daily list from Notes and advice from a free chatbot.

I might pay **after** a week where tonight’s routine actually reduced a bedtime fight and Speech Coach made my child proud. The current first session never gets me there. Spending ad money before that path is the default is how you buy zero subscriptions faster.
