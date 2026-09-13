# AmyNest Free → Premium Conversion — Remediation Review

**Status:** PHASE 1 AUDIT ONLY — NO PRODUCTION CODE CHANGES  
**Date:** 2026-08-17  
**HEAD:** `da20fe25` (`main`)  
**Authority:** Founder Order — Free → Premium Conversion P1 Remediation  
**Source of truth for current behavior:** Founder-provided deep entitlement audit (this session). In-repo file `docs/v2/AMYNEST_FREE_PREMIUM_AUDIT.md` does **not** exist; this review restates current behavior from code, not from UI copy.

**This document is not an implementation. It is not a Final Apple Audit.**

**STOP after this file.** Phase 2 = Founder review. Phase 3 = low-risk remediation only after approval. Phase 4 = Health Lab preview / Speech V2 first-use — separate proposals, not the same commit as copy/UX.

---

## 0. Commercial model (locked for this program)

**FREE FOREVER + STRATEGIC LIMITS + PREMIUM VALUE**

Do **not**:

- Introduce a universal automatic premium trial
- Convert internal 3-day `status=trialing` into `isPremiumNow=true` without a separate Founder decision
- Create RevenueCat products, change entitlement ID `premium`, change plan prices, Razorpay amounts, or store product IDs
- Split `ai_query` unless a later evidence review proves conversion gain without cost abuse
- Change AI model routing (`gpt-4o-mini` / Birth Sky `gpt-5-mini`+`gpt-5` / Speech V2 `gpt-realtime`)
- Change Ask Amy 10/day, infant 3/day, Emotional 4-card floor, infant static Coach, PTM tile access
- Touch `plan-price.ts`, `pricing-region.ts`, checkout, restore, FA-02, P0-7 integers, routine engines, Birth Sky intelligence

Conversion work, if approved, is **timing, clarity, value-before-paywall, and truthful copy** — not price or entitlement inflation.

---

## 1. Layer trace (current implementation)

Each layer: **current behavior → intended (this program) → file/function → authority → RC / pricing / free-usage impact if changed**.

### 1.1 Signup / authentication

| | |
|---|---|
| **Current** | Protected routes require Firebase sign-in. Guest “Try First” is **off** (`VITE_FF_GUEST_TRY_FIRST` default `false`). Anonymous checkout blocked. |
| **Intended** | Unchanged. Recognized free user = authenticated Firebase UID. |
| **Files** | `artifacts/kidschedule/src/AppCore.tsx` `ProtectedRoute`; `lib/anonymous-auth.ts`; `lib/mrr-experiment-flags.ts` |
| **Authority** | Client routing + Firebase; server `requireAuth` |
| **RC / price / free usage** | None if left alone |

### 1.2 Subscription row creation

| | |
|---|---|
| **Current** | First `getOrCreateSubscription(userId)` inserts `plan=free`, `status=free`, `provider=none`, `subscriptionState=FREE`. |
| **Intended** | Unchanged. |
| **Files** | `artifacts/api-server/src/services/subscriptionService.ts` `getOrCreateSubscription` |
| **Authority** | **Server** |
| **Impact if changed** | Entitlement semantics — **STOP** (not Phase 3) |

### 1.3 `isPremiumNow()`

| | |
|---|---|
| **Current** | Internal capped trial (`status=trialing`, `provider=none\|manual`, `trialEndsAt` future, not grandfathered) → **false**. RC/Razorpay/Stripe paid states with future period, grace, store trial, bonus expiry → **true**. Grandfathered internal trials started before `2026-07-26T00:00:00.000Z` → true. |
| **Intended** | Keep false for new internal trials. Do not grant premium by flipping this. |
| **Files** | `artifacts/api-server/src/services/subscription-premium-gate.ts` `isPremiumNow`, `isInternalTrialNow` |
| **Authority** | **Server** |
| **Impact** | Changing it **is** an entitlement change. RC mapping unchanged only if we do not flip it. **Founder-gated.** |

### 1.4 `isPremiumSubscriberNow()`

| | |
|---|---|
| **Current** | Paid provider + ACTIVE/CANCELLED/`status=active` + future `currentPeriodEnd`. **Not** trial, grace, bonus, journey. Used for phonics workbook download. |
| **Intended** | Unchanged. |
| **Files** | `subscription-premium-gate.ts` `isPremiumSubscriberNow` |
| **Authority** | **Server** |

### 1.5 RevenueCat mapping

| | |
|---|---|
| **Current** | Entitlement ID `premium`. Products `amynest_monthly*`, `amynest_6month*`, `amynest_yearly*`. Snapshot → `FREE\|TRIAL\|ACTIVE\|GRACE_PERIOD\|CANCELLED\|EXPIRED`. Restore uses `applyRevenueCatSnapshot(..., restore)`. |
| **Intended** | Freeze products, packages, entitlement ID, checkout, restore. |
| **Files** | `subscriptionStateService.ts`; `rcCustomerService.ts`; `kidschedule/src/lib/native-rc-paywall.ts` `RC_ENTITLEMENT_ID` |
| **Authority** | RC webhook/snapshot **writes** row; `isPremiumNow` **reads** row |
| **Impact** | Any product/price change is **out of scope** |

### 1.6 `FREE_FEATURE_LIMITS`

Canonical free caps (server): `subscriptionService.ts`.

| Key | Limit | Scope |
|---|---|---|
| `ai_query` | 10 | UTC day — **shared** adult AI pool |
| `infant_ai_query` | 3 (env `INFANT_AI_DAILY_LIMIT`) | UTC day |
| `routine_generate` | 3 | Lifetime **overridden** by journey engine |
| `behavior_log` | 1 | Lifetime |
| `audio_lesson` | 1 | UTC day |
| `tts_generation` | 50 | UTC day (cost guard) |
| `hub_speech_session` / `hub_speech_coach` | 3 | Lifetime |
| `speech_conversation_seconds` | 300 | UTC day **plus** 3-day `createdAt` clock |
| `speech_transcribe` | 20 | UTC day |
| `speech_coach_v2_seconds` | 600 in table | **Not used** for free users; policy uses 0 / 120 / 600 |
| `nutrition_week_plan` / `nutrition_family_ai` / `nutrition_pdf` | 1 each | Lifetime |
| `learning_load_more_*` | 1 each section | Lifetime |
| `kids_how_pdf` | 1 | Lifetime |
| `infant_sleep_coach` / `infant_feeding_plan` | 1 each | Lifetime; feeding also age ≥6m |

Also: `FREE_LIMITS.routinesMax = 2` (list UI), `childrenMax = 1`, `devicesMax = 1`, `trialDays = 3`.

**Intended:** keep integers. Align **presentation** of routine 2 vs 3. Do not silently change AI quotas.

### 1.7 `featureGate` / usage gates

| | |
|---|---|
| **Current** | `applyFeatureGate`: premium bypass; else increment, 402 if over limit, **refund if HTTP not 2xx**. Ask Amy uses `assistantAiUsageGate` (infant vs adult pool). Coach/tutor/worksheets/spelling/abacus/PTM/event-prep/rewrite-tip use `aiUsageGate` = `ai_query`. |
| **Intended** | Keep server enforcement and refund. Improve **client** remaining/education copy. Do not split pool in Phase 3. |
| **Files** | `middlewares/featureGate.ts`, `aiUsageGate.ts`, `assistantAiUsageGate.ts` |
| **Authority** | **Server** |
| **Free usage** | Presentation-only changes = no usage change |

### 1.8 Journey gates

| Journey | Constants | Clock start | Lock |
|---|---|---|---|
| Parent Hub | 3 days / 7 calendar | Hub journey `startedAt` | Tiles except `hub_emotional`, `hub_ptm_prep` |
| Routine | 3 gens / 7 calendar | Routine journey `startedAt` | New generate (same child+date free) |
| Coach | Days **deprecated**; per-category first sample | Catalog | Locked goals + `isPremiumNow` for extend |

**Authority:** server `assertHubModuleAccess`, `assertRoutineCanGenerate`, `getCoachGoalAccess`. Client SubItemGate / list lock can disagree (routinesMax).

### 1.9 Paywall reasons (client taxonomy)

`PaywallReason` in `paywall-context.tsx`. Copy in `lib/subscription-marketing` `PAYWALL_REASON_COPY`. Technical keys (`ai_quota`, `feature_locked`) must not appear in parent-facing strings.

Proposed commercial taxonomy (Phase 3 mapping, **copy only**):

| Proposed class | Current reasons |
|---|---|
| `UNLIMITED_AI` | `ai_quota`, `infant_ai_quota` |
| `VOICE_CONTINUATION` | `speech_coach` |
| `CONTINUATION` | `routines_limit`, `audio_lessons`, `hub_nutrition`, `nutrition_library`, `infant_sleep_coach`, `infant_feeding_plan`, `behavior_locked` |
| `PREMIUM_ROOM` | Health Lab route `feature`, `learning_locked`, `hub_locked`, `hub_journey`, `section_locked`, `coach_locked`, `personalized_coaching` |
| `VALUE_EXTENSION` | `premium_insight` (Birth Sky / insights / weekly) |
| `FAMILY_EXPANSION` | `child_limit`, `child_locked` |
| `CAPACITY` | device limit (not always a paywall reason today) |

### 1.10 Activation deferral

| | |
|---|---|
| **Current** | `shouldDeferPaywallForActivation()` defers **soft** reasons until first routine **or** 5 defers **or** 72h since first open. Redirects to `/routines/generate`. **Not** deferred: `ai_quota`, `infant_ai_quota`, `routines_limit`, `child_limit`, `audio_lessons`, infant sleep/feeding. |
| **Intended** | Keep hard-day undeferred. Post-onboarding trial **screen** should not block first value. After first routine, value-bridge then stronger CTAs is the desired sequence. |
| **Files** | `lib/activation-gate.ts`; `contexts/paywall-context.tsx`; `lib/first-experience/continuity.ts` `shouldDeferMonetizationForFirstExperience` |
| **Authority** | **Client presentation only.** Server still 402s. |
| **RC / price / usage** | None |

LocalStorage keys (`subscription-funnel-storage.ts`): paywall visits, defer count, first open, first routine, onboarding trial seen, trial started. **Must never authorize premium.** Reinstall resets these → conversion screen can reappear.

### 1.11 Paywall presentation

Modal: `paywall-modal.tsx` — dismissible, exit intercept, “Maybe later”. Native: custom paywall first (`FF_NATIVE_RC_PAYWALL_FIRST` default false), purchase via store. Web India: Razorpay. Web non-India: “use the app”.

Post-onboarding: `/subscription-trial` — **full-screen conversion**, dismissible “Maybe Later”. Native CTA = **yearly store purchase** (intro trial if store configured). Web CTA = `startTrial()` → internal trial, **still not** `isPremiumNow`.

Trial banner (`subscription-trial-banner.tsx`) for `isTrialing`: copy **“remaining in Premium”** while `isPremiumNow` is false. **Misleading.**

### 1.12 Purchase / restore / cancel

Unchanged and frozen: `use-subscription.ts` Razorpay; `use-native-billing`; `applyRevenueCatSnapshot`; cancel route. Phase 3 must not edit these handlers.

### 1.13 Country pricing

| | India | US / UK / EUR / other |
|---|---|---|
| Access / quotas | Same | Same |
| Web display | `INR_PLAN_PRICES` 199 / 999 / 1499 | USD cards from API |
| Web checkout | Razorpay | Disabled |
| Native | Store-localised | Store-localised |

**Freeze:** `pricing-region.ts`, `INR_PLAN_PRICES`, `RAZORPAY_PLAN_PRICES_INR`, `PLAN_PRICES`, RC product IDs.

### 1.14 AI model routing

Unchanged: Ask Amy / shared chat `gpt-4o-mini`; Birth Sky fast `gpt-5-mini`, reasoning `gpt-5`; Speech V2 `gpt-realtime`; Talk `gpt-4o-mini`. Free vs paid is quota/entitlement, not model.

### 1.15 Client vs server

Server is authority for premium, quotas, child/device, Speech seconds, journeys. Client may hide/show paywalls, defer, and copy. Fail-open: routine generate gate on thrown error; Health Lab route fail-open if entitlements never load (timeout).

### 1.16 localStorage trial/defer

Presentation only. `markTrialStartedLocally` can fire for internal trial even though premium is false — feeds `trial_converted` analytics incorrectly if user later becomes premium.

### 1.17 Firebase / auth

`useSubscription` enabled only when signed in. Placeholder `FREE_ENTITLEMENTS` is not authority (`entitlementsResolved` false → suppress some monetization).

### 1.18 Hard-day (P0-7) — do not regress

| Rule | Implementation |
|---|---|
| D1 Hard-Day Law binding | Policy + helpers |
| D2 Emotional floor 4 + SubItemGate bypass | `SECTION_LIFETIME_LIMITS.hub_emotional=4`; `isHardDaySubItemMfhoSection` |
| D3 Ask Amy exhaust = soft-continue, no auto-paywall | `assistant.tsx`, `amy-ai-conversation-workspace.tsx` |
| D4 No AI quota integer changes | Keep 10 / 3 |
| D5 Infant free AI floor + continuity copy | `PAYWALL_INFANT_AI` / soft-continue infant message |
| D6 PREMIUM_VOICE on hard-day regardless of living | `hardDayPremiumContinueCta` |
| D7 No PTM season FOMO | `shouldShowPtmSeasonFomoOnHardDayPath() === false` |
| Infant static Coach free | `isFreeCoachCategory("infant-problems")` |

**Known P0-7 gaps (do not “fix” by unlocking Health Lab / V2 without Founder):** Health Lab route is premium-before-value; shared `ai_query` can paywall tutor/coach/PTM after Ask Amy; Speech V2 0s and Talk day-4 unused lock.

---

## 2. Part B — “3-day free trial” copy inventory

User-facing strings only. Code comments omitted.

| Location | String (summary) | Class | Notes |
|---|---|---|---|
| `pages/subscription-trial.tsx` H1 / CTA | “Explore AmyNest Free for {N} Days” | **C** (native) / **B** (web) | Native starts **store yearly purchase** (may include store intro trial). Web `startTrial()` does **not** grant `isPremiumNow`. Sounds like N days of Premium. |
| `i18n` `pricing.start_trial` | “Explore AmyNest Free for 3 Days” | **B/C** | Same |
| `subscription-trial-offer.tsx` default CTA | same | **B/C** | Toast “Couldn’t start trial” |
| `subscription-trial-banner.tsx` | “You have N day remaining in **Premium**.” | **B** | Internal trial is **not** premium. Highest-priority copy fix. |
| `speech-coach/conversation-coach.tsx` | “Your free trial has ended. Upgrade to keep talking with Amy!” | **B** if unused; **A** if they talked 3 days | Clock is `subscription.createdAt`, not first talk |
| `speech-converse.ts` 402 message | “Your 3-day free trial of Talk with Amy has ended…” | **B** if never used | Server message |
| V2 `usage-display.ts` | “N min/day during free trial” | **A** | Matches 120s trial policy |
| Hub `parent_hub.infant.trial_intro` | “Try 3 days of personalized parenting support… No credit card required.” | **C** | Describes hub **journey**, not Premium; “no card” is true for journey |
| Phonics / Coach `journey_banner_title` | “Day {{day}} **free trial** · …” | **C** | Journey day, not RC trial |
| Routines i18n | “You’ve used all 3 free routine generations” | **A** | Matches journey |
| `pages/terms.tsx` §6 | “We may offer a free trial period for Premium features” | **A** | Legal; store trials exist |
| Marketing “Start Free Today” | Landing CTA | **A** | Means start using free, not Premium trial |
| Infant weekly “after 3 days of activity” | Logging requirement | **A** | Not monetization |
| Colic “3 days a week” | Medical | **A** | Ignore |

**Phase 3 copy goal (if approved):**  
“You can use AmyNest for free. Some experiences have limits. Premium unlocks the complete experience.”  
Never “3 days of Premium” unless `isPremiumNow` is true.

---

## 3. Master remediation table

| Feature | Current free experience | Current limit | Current paywall trigger | Value-before-paywall | Conversion risk | Recommended change | Server gate | Client gate | RC impact | Country pricing impact | Implementation risk |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Onboarding conversion** | Full-screen `/subscription-trial` after onboard | N/A | Route; dismissible Maybe Later | Often **before** first product value | High — “pay before I know” | Soft invitation; keep dismiss; optionally require first-experience defer always | None | `onboarding.tsx`, `subscription-trial.tsx`, `shouldRouteToPostOnboardingFreeTrial` | None if copy/routing only | None | **Low** (Phase 3) |
| **Internal 3-day status** | `trialing` if child ≥24m | 3×24h from account min timestamp | Banner / trial-ended UI | Status ≠ premium | High — false Premium promise | Copy only; do **not** flip `isPremiumNow` | `maybeApplyAutomaticAgeTrial`, `isInternalTrialNow` | Trial banner/chip | None if copy only | None | Copy **low**; entitlement flip **STOP** |
| **Ask Amy** | Full answers | 10/day adult, 3/day infant | **No auto-paywall**; soft-continue | Yes (10/3) | Medium — remaining unused in UI; shared pool surprise elsewhere | Show remaining; ~70–80% education (no modal); UTC reset hint on exhaust | `assistantAiUsageGate` | `assistant.tsx`, living workspace | None | None | **Low** |
| **Shared `ai_query` others** | Coach AI, tutor, worksheets, spelling, abacus, PTM AI, event-prep, rewrite-tip | Same 10 | 402 → paywall (tutor/coach) | Depends | High — unexpected paywall after Ask Amy | Parent-friendly “Amy’s help for today”; do not split pool | `aiUsageGate` | tutor/coach/PTM clients | None | None | **Low** (copy/UX) |
| **Emotional Support** | 4 cards | 4; journey-exempt | No MFHO paywall | Yes | Low | **Preserve** | Section limit | `SubItemGate` bypass | None | None | Do not touch |
| **Routines generate** | 3 journey gens / 7 days | 3 | 402 `routine_locked` | Yes | Medium | Keep 3; premium = continued generate | `routineGenerateGate` | generate page | None | None | Do not cut 3→2 |
| **Routines saved list** | Extra rows locked at `routinesMax=2` | 2 | `openPaywall` on tap | **No** — can hide earned 3rd routine | High trust | **Do not lock viewing earned routines**; align cap to 3 or remove list slice | `FREE_LIMITS.routinesMax` display only | `pages/routines/index.tsx` `lockedRoutineIds` | None | None | **Low** if client-only view unlock |
| **Amy Coach** | Infant static all free; other cats 1 sample | Sample + shared AI | Locked goal / 402 | Sample yes; later goals **E** | Medium | “Unlock complete Coach”; explain AI help shared | `getCoachGoalAccess`, `aiUsageGate` | `ai-coach.tsx` | None | None | **Low** copy; catalog change = higher |
| **Speech hub** | 3 sessions | 3 lifetime | Route + 402 | After 3 | OK | Continuity copy | `hub_speech_session` | AppCore `/speech-coach` | None | None | Low |
| **Talk with Amy** | 300s/day for 3 days from **row createdAt** | Then 402 even if unused | `trial_expired` | **No** if unused | High | First-use clock **or** drop calendar keep daily cap | `speech-converse.ts` `resolveConversationBudget` | conversation-coach 402 UI | None | None | **Medium** — see §H |
| **Speech V2** | 0s free; 120s if internal/store trial; 600 paid | 0 / 120 / 600 | 429 at start | **No** | High | First short session — **Phase 4**, server policy | `speechCoachV2UsagePolicy` | session-page | None | None | **High** (cost). Do not ship with Phase 3 |
| **Health Lab** | Route blocked | 0 | `PremiumRoutePreview` | **No** | High + P0-7 | Preview proposal **Phase 4** only | `canAccessHealthLab=isPremium` | AppCore | None if preview still non-engine | None | **High**. Founder approval |
| **Birth Sky AI** | 1 insight/profile after ack | 1 | `premium_insight` | **Yes** | Low — already strong | Continuity copy after first insight; no engine change | `evaluateBirthSkyAiGate` | `use-birth-sky-ai.ts` | None | None | **Low** |
| **Amy Audio** | 1/day | 1 UTC | consume 402 | After 1 | OK | Continuity CTA | `audio_lesson` | `audio-lessons.tsx` | None | None | Low |
| **Nutrition AI** | 1 week plan + 1 family AI + 1 PDF | Lifetime | `hub_nutrition` | After 1 | OK | Keep floors; continuation copy | featureGate | nutrition components | None | None | Low |
| **Infant sleep/feeding** | 1 each (feeding ≥6m) | Lifetime | after 1 | After 1 | OK | Keep; continuation copy | featureGate | hooks | None | None | Low |
| **Insights / weekly** | Today’s tip free | Reports premium | `premium_insight` | Partial | OK | Keep | `canAccessWeeklyReports` | `insights.tsx` | None | None | Low |
| **2nd child / device** | 1 / 1 | Hard cap | `child_limit` / 402 device | Capacity | OK | Family copy; no limit change | `childrenMax` / `devicesMax` | add-child gate | None | None | Low |
| **Games** | 2 starters, 3 plays/day | Catalog | premium-only games | After starters | OK | Unchanged | gaming policy | hub | None | None | None |
| **Talking Amy** | No RC gate | TTS 50/day cost | None | N/A | Low | Unchanged | TTS guard | none | None | None | None |
| **PTM tile** | Journey-exempt | AI shares pool | Possible 402 on AI | Tile yes | Medium if AI | Keep tile; shared-AI copy | hub exempt + `aiUsageGate` | hub | None | None | Low |

---

## 4. Part C — Ask Amy / shared AI quota

**Current:** Remaining is computed in `assistant.tsx` (`remaining`, `limitReached`) but **not shown** as a count. i18n `ai.quota_remaining` exists and is **unused**. Tutor **does** show “X of Y Amy AI replies left today”. Exhaustion: soft-continue, no paywall, no UTC-reset sentence. Shared pool: Ask Amy 10th message can make Coach/tutor/PTM 402 with a **paywall**.

**Intended:** Parent-friendly remaining; ~70–80% subtle education (banner/line, **not** modal); exhaustion keeps D3 + add “Amy’s extra help returns tomorrow”; non-hard-day consumers may paywall with “unlimited Amy help”, never `ai_query`.

**Authority:** Server quotas unchanged; client presentation.

**RC / price / free usage:** None / none / **none** (do not change 10 or 3).

**Conversion benefit:** Reduces surprise; educates before boundary; preserves hard-day trust.

**Regression:** Must not auto-open paywall on Ask Amy 402. Must not mention `ai_query`.

**Do not split the pool in Phase 3.** Splitting is a cost + abuse question, not a copy fix.

---

## 5. Part D — First premium moment

**Current first-paywall candidates (unordered):** Health Lab, Speech V2, `/subscription-trial`, locked Coach goal, 4th routine, 2nd audio, Birth Sky 2nd insight, 2nd child, non-deferred AI 402, unused Talk day 4.

**Intended sequence:** Signup → onboarding → first home → first value → first routine → **soft education** (value bridge already exists after first routine) → second value → high-intent paywall at a **continuation** boundary.

**Value bridge today:** `routine_completion` / `weekly_summary`; requires first routine; suppressed for paid; default ON (`FF_VALUE_BRIDGE_INVITES`). Copy is already continuation-framed.

**Onboarding screen:** Already dismissible. First-experience defer exists but only when durable first-experience memory is set **and** home continuity not yet surfaced — easy to skip. **Phase 3:** treat as soft invitation; never block dashboard; rewrite 3-day Premium implication.

**Do not** add a hard paywall at signup.

---

## 6. Part E — Routine 2 vs 3

**Generate (server):** 3 journey generations; same child+date does not burn; consume on 2xx. **Authoritative.**

**List (client):** `entitlements.limits.routinesMax` default **2** slices `allRoutines` and paywalls viewing extras (`pages/routines/index.tsx`). Dashboard also `openPaywall("routines_limit")`.

**Intended:** User never loses a routine they generated. Premium = more generations / ongoing use, not hiding earned plans.

**Recommended Phase 3 (low risk):** Stop locking **view** of persisted routines. Keep generate lock at journey 3. Optionally set `FREE_LIMITS.routinesMax` to 3 so list cap matches journey **if** still used for something else — prefer unused for view-lock.

**Not recommended:** Reduce journey 3→2.

**RC / price:** none. **Free usage:** viewing 3rd saved routine (already created) — not new AI cost.

**Regression:** Confirm generate still 402s on 4th **new** child+date.

---

## 7. Part F — Health Lab (Phase 4 proposal — STOP for Founder)

| | |
|---|---|
| **Exact current gate** | `getEntitlements().canAccessHealthLab = isPremiumNow`. `AppCore` `PREMIUM_ROUTE_METADATA` `/health-lab` → `PremiumRoutePreview` if false. Hub tile `healthLabRouteOpen` same. Infant preview UI in `health-lab.tsx` is **unreachable** for free users. |
| **Possible free value** | Static living “Today’s Care” intro (already in `HealthLabPreviewOverview`) **if** route allowed for preview-only; **or** one non-engine explainer. Must not open motion/quest/scoring engines. |
| **Cost** | Preview-only: ~zero AI. Engine session: real device/compute — do not free that. |
| **Entitlement** | Would require `canAccessHealthLab` **or** a new `canPreviewHealthLab` **without** treating preview as `isPremiumNow`. Route guard change. |
| **UX** | Fixes P0-7 Health MFHO if preview is meaningful; risk of “I thought I had Health Lab”. |
| **Decision** | **Do not implement in Phase 3.** Founder chooses: keep premium-only room **or** ship a strictly static preview. |

---

## 8. Part G — Speech V2 (Phase 4 proposal — STOP for Founder)

| | |
|---|---|
| **Current** | `resolveSpeechCoachV2UsagePolicyFromSubscription`: paid 600s, trialing 120s, else **0**. `canStartSession(used, 0)` is always false. Enforced on `POST /speech/v2/session/start` via `speechCoachV2DailyUsageTable` (server, per child). |
| **Preferred** | One short first experience, server-capped; then premium 600s. |
| **Smallest safe architecture** | Do **not** invent client timers. Options: (1) lifetime first-session seconds using **existing** `speechCoachV2SessionsTable` count + daily table (no new migration if “0 completed sessions ⇒ allow N seconds once”); (2) tiny daily free cap (cost every day — worse). Need a constant e.g. 60–90s, still `gpt-realtime` (model freeze). |
| **If unsafe** | Policy today cannot express “lifetime N seconds” without a clear lifetime counter. Sessions table is the least-schema path. **Still Phase 4.** |
| **RC / price / models** | None / none / none |

---

## 9. Part H — Talk with Amy

| | |
|---|---|
| **Current** | `resolveConversationBudget`: if not `isPremiumNow`, `trialExpired = (now - sub.createdAt) / 86400000 > 3`. Independent of usage. Kickoff charges 0s; later turns charge `elapsedSeconds`. |
| **Intended** | Do not tell unused users the trial ended. Clock starts on **first actual Talk session** (or drop calendar, keep 300s/day). |
| **Safe-ish first-use (no SQL migration)** | Lifetime marker in existing `usage_daily` (new feature key, lifetime scope) **or** treat “never incremented converse seconds and never completed kickoff session” as not expired — kickoff-only is 0 charge, so must record first **session start** explicitly. |
| **Backward compat** | Users already past 3 days who never talked would **gain** access (intended). Users mid-talk keep daily 300s. Premium unchanged. Reinstall: server `createdAt` today; first-use marker would persist by userId (good). Timezone: keep UTC/server now. |
| **If not isolated** | Document and **STOP**. Do not half-fix client copy only while server still 402s `trial_expired` on unused accounts — copy+server must match. |
| **Phase** | Isolated server condition + copy = **Phase 3 if Founder approves first-use**. Else copy-only is still **B** until server changes. |

---

## 10. Parts I–L (Coach, Birth Sky, Audio/Nutrition/Infant, family)

- **Coach:** Keep infant static + first sample. Phase 3: locked CTA = “Unlock the complete Coach experience”; if 402 from `ai_query`, say Amy’s daily help is used, not “button locked”.
- **Birth Sky:** Keep 1 free insight. Phase 3: after successful ack, continuity copy only. No model/engine change.
- **Audio / nutrition / infant / behavior / insights:** Already mostly value-then-continuation. Phase 3: CTA “what continues”. Do not remove floors.
- **Child/device:** Keep 1/1. Phase 3: “This keeps AmyNest available for your whole family.” No urgency.

---

## 11. Part M — Paywall strategy (Phase 3 copy)

Every modal should answer: what I just did, what I want next, what Premium unlocks, why it is worth it, can I leave (yes).

Do not add scarcity timers, fake discounts, fear, or distress (“pay to help your child”).

Hard-day Ask Amy / Emotional: **no** modal at MFHO or Ask Amy exhaust.

---

## 12. Part N — Activation deferral assessment

| Stage | Current | Verdict |
|---|---|---|
| 0 value | Soft hub reasons deferred to generate; Health Lab / V2 / onboarding screen **not** | **Too early** on those three |
| 1 value | Value bridge after first routine | **Correct** if onboarding screen is softened |
| 2+ values | Repeat paywall on locks | OK |
| Quota boundary | Direct 402 (except Ask Amy) | OK for non-hard-day |

**Phase 3:** do not weaken deferral; do not add Health Lab to defer (that hides a premium room). Fix early screens with copy/routing, not by making Health Lab free.

---

## 13. Part O — Telemetry (propose, do not add schema yet)

**Existing (do not duplicate):** `paywall_opened` / `paywall_viewed` / `paywall_view` (aliased), `paywall_close`, `paywall_deferred_activation`, `paywall_reason`, `checkout_started`, `subscribe_clicked`, `purchase_success`, `restore_purchase`, `feature_locked`, `trial_started`, `trial_expired`, `first_routine_completed`, `value_bridge_*`, `premium_paywall_viewed`, Birth Sky `birth_sky.premium_paywall_viewed`. Payload already has `reason`, `source`, `country`, `platform`.

**Gaps:**

| Wanted | Exists? | Proposal |
|---|---|---|
| First paywall **feature** | `reason` + `source` partial | Require `source` = surface id on every `openPaywall`; no new event |
| `quota_warning` 70–80% | **No** | Optional client funnel step `quota_warning` **if** Phase 3 education ships; reuse `subscription_funnel_event` |
| `quota_exhausted` | Ask Amy has no event; 402 paths vary | Map 402 handler → existing `feature_locked` with `feature` extra |
| `first_ai_success` | **No** | Only if needed; else infer from usage |
| `first_speech_session` | `speech_coach_trial_started` | Reuse; do not add duplicate |
| `premium_conversion` | `purchase_success` / `trial_converted` | Reuse. Note: `trial_converted` can fire from internal-trial localStorage — **misleading**; fix when copy is fixed |
| Child age / days since signup | Not on paywall payload | Add as **optional extras** on existing event; no DB migration |

**Never log conversation content.**

---

## 14. Frozen surfaces (verify after any later implementation)

| Freeze | Evidence |
|---|---|
| India ₹199 / ₹999 / ₹1499 | `INR_PLAN_PRICES`, `RAZORPAY_PLAN_PRICES_INR` |
| USD $4.99 / $24.99 / $39.99 display fallback | `PLAN_PRICES` |
| Entitlement `premium` | `RC_ENTITLEMENT_ID`, `REVENUECAT_ENTITLEMENT_ID` |
| Product prefixes | `amynest_monthly`, `amynest_6month`, `amynest_yearly` |
| Ask Amy 10 / infant 3 | `FREE_FEATURE_LIMITS` |
| Emotional 4 | `SECTION_LIFETIME_LIMITS.hub_emotional` |
| Models | `openai-chat.ts` default; Birth Sky router; V2 `gpt-realtime`; converse `gpt-4o-mini` |

---

## 15. Phase 3 vs Phase 4 (Founder checklist)

### Phase 3 — low-risk (implement only after approval)

1. Misleading trial copy (banner “in Premium”, onboarding 3-day implication, Talk unused “trial ended” **if** server first-use also approved)
2. Paywall/onboarding as soft invitation; preserve dismiss
3. Ask Amy remaining + 70–80% education + reset hint; shared-pool explanation on other 402s
4. Routine **view** consistency (do not hide earned plans)
5. Coach / Birth Sky / family / continuation CTA clarity
6. Telemetry extras on existing events; fix misleading `trial_converted` if tied to internal trial
7. Talk first-use **only if** Founder accepts server condition in §H

### Phase 4 — separate Founder decisions (do not combine with Phase 3)

1. Health Lab static preview vs keep premium-only room  
2. Speech V2 first-session seconds (server policy + cost cap)

### Explicitly not this program

- `isPremiumNow` true for internal trial  
- New RC products / prices / ₹49 plans  
- Quota integer changes / pool split  
- AI model downgrade  
- DB schema  
- P0-7 helper integer changes  
- FA-02, living interiors, routine/Birth Sky engines  

---

## 16. Founder decisions required before Phase 3

| ID | Question | Default if unanswered |
|---|---|---|
| D1 | Approve Phase 3 copy + quota visibility + routine view-lock fix? | **STOP** (no code) |
| D2 | Talk with Amy: first-use clock vs drop 3-day calendar vs copy-only? | Copy-only leaves **B** server message |
| D3 | Health Lab: static preview (Phase 4) or remain premium-only? | Remain premium-only |
| D4 | Speech V2: allow ~60–90s first session (Phase 4) or keep 0s? | Keep 0s |
| D5 | Onboarding `/subscription-trial`: keep screen as soft invite vs skip until after first routine? | Soften copy, keep dismiss, keep screen |

---

## 17. Conversion benefit (honest)

This program **cannot** claim a conversion lift without post-ship telemetry. Expected **mechanism** if Phase 3 ships:

- Fewer users bounce at a fake “3-day Premium” wall  
- Fewer users hit a paywall on a routine they already earned  
- Users who like Ask Amy see remaining help and a calm Premium education before a hard boundary  
- High-intent paywalls stay at continuation (4th routine, 2nd insight, extra Coach goal)

Health Lab / V2 first-value are the largest **experience** gaps; they are also the highest **cost/entitlement** risk — hence Phase 4.

---

## 18. STOP

No production code was changed in this stage.  
No RevenueCat, pricing, quota integers, models, or entitlement semantics were changed.

**Next:** Founder review (Phase 2).  
**Do not** run Final Apple Audit.  
**Do not** implement Phase 3 until D1 is yes.
