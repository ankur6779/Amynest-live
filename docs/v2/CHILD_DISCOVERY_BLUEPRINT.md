# Child Discovery Blueprint — Phase 1 (Study Only)

**Status:** FOUNDER APPROVED — Phase 2 implemented (see `CHILD_DISCOVERY_PHASE2_FOUNDER_REVIEW.md`)  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Authority:** Founder Order — Child Discovery Phase 2  

| Surface | Status |
|---|---|
| Welcome V3 (`/begin`) | Permanently frozen |
| Signup Keep Experience | Permanently frozen |
| Child Discovery | Phase 2 film on `/onboarding` (kill switch `VITE_FF_CHILD_DISCOVERY_FILM=0`) |
| Today Home | NOT STARTED — STOP |

---

## Mission (locked)

Child Discovery is **not** onboarding.

It is how AmyNest earns the right to recommend **today’s next right thing**.

| Parent must never feel | Parent must feel |
|---|---|
| “I’m filling a form.” | “Amy is understanding my child.” |

Every screen must increase confidence.  
Every answer must make AmyNest **visibly** smarter.

---

## Governing laws (absolute)

1. **Four Pillars** — Premium · Product · Production Safety · Conversion  
2. **Question Tax Law** — every additional question is a tax; every tap must earn existence; infer safely → never ask; if must ask → immediately prove why it mattered; parents leave smarter, never more tired  
3. **Six Reviews Manufacturing Law** — Founder · Parent · Apple Craft · Engineering · Database · Growth — all must PASS or the feature is not COMPLETE  
4. **Philosophy DNA** — Notice · Guide · Remember · Support  
5. **Database first** — reuse existing schema; no duplicate tables; migrate only when genuinely required  

Code gates: `mayAskParentQuestion()` · `MANUFACTURING_SIX_REVIEWS` · `isManufacturingComplete()` in `artifacts/kidschedule/src/lib/amynest-philosophy.ts`.  
Full Six Reviews law: `docs/AMYNEST_MANUFACTURING_LAW.md`.

---

## 1. Current onboarding audit

### 1.1 What exists today

Post-auth child setup is a single Amy Coach chat at **`/onboarding`**.

| Concern | Current reality |
|---|---|
| Entry | After verify/OAuth/guest/home — if setup incomplete → `/onboarding` |
| UI metaphor | Chat thread + chips (better than a form, still feels like a long questionnaire) |
| Completion | `runOnboardingFinishTransaction` → parent profile + child create + goals + `onboardingComplete` |
| Exit | `/subscription-trial` (flag) or **`/routines/generate`** |
| Session | `amynest_onboarding_session` (v5), 14-day resume |
| Continuity from FE | Name / age band / school-going seed from Signup Keep continuity |

**Primary files**

| Layer | Path |
|---|---|
| Page / state machine | `artifacts/kidschedule/src/pages/onboarding.tsx` |
| Thread / chips | `lib/onboarding-thread-builder.ts`, `lib/onboarding-keyboard-free.ts` |
| Finish transaction | `lib/onboarding-completion.ts` |
| Setup gate | `lib/setup-status.ts`, `lib/onboarding-setup-gate.ts` |
| Flow helpers | `lib/education-stages/src/onboarding-flow.ts` |
| Short branch experiment | `lib/onboarding-short-branch.ts` (`VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH`) |
| Analytics | `lib/onboarding-analytics.ts`, `lib/child-journey-telemetry.ts` |
| Ops doc | `docs/onboarding-production-readiness.md` |

### 1.2 Current step machine (full branch)

```
country-confirm
  → child-name
  → child-dob                 [skipped if First Experience age seeded]
  → child-birthday            [skippable]
  → infant-feeding / infant-sleep   [if < 24 months]
  → child-education-stage
  → child-class-grade         [if stage requires]
  → child-schedule-known
       ├ known → school-start → school-end → school-days
       └ later → (skip times)
  → child-wake → child-sleep
  → parent-name → parent-role → parent-work
  → parent-region → parent-diet → parent-goals → parent-allergies
  → saving → done → notifications? → exit
```

### 1.3 Field inventory — asked vs inferred

| Signal | Asked today? | Already inferred / seedable | Changes today’s NRT? |
|---|---|---|---|
| Country / location | Yes (confirm) | GPS → IP → manual | Yes (education stages, cuisine, locale) |
| Child name | Yes | FE continuity | Yes (identity) |
| Age band | Yes (unless FE) | FE continuity / approx DOB | **Critical** |
| Exact birthday | Optional ask | Approx from band | Rarely for day-0 NRT |
| Feeding / infant sleep | Yes if infant | Smart defaults exist | Yes for infants |
| Education stage | Yes | Age + FE todayContext (`school\|home`) | Yes |
| Class / grade | Conditional | Country class lists | Sometimes |
| School schedule known | Yes | Default false + age defaults | Sometimes |
| School start/end/days | Conditional | Age-appropriate defaults | Sometimes |
| Wake / bedtime | Yes | `getSmartWakeSleepDefaults` | Yes |
| Parent name | Yes / OAuth confirm | Firebase displayName | Low for NRT |
| Parent role | Yes | Default mother | Low |
| Work type | Yes | Default | Medium (capacity) |
| Cuisine / region | Yes | Country defaults | Low for day-0 NRT |
| Diet | Yes | Inherit / default | Medium (meals later) |
| Parent goals | Optional multi | Default `balanced-routine` | Yes |
| Allergies | Optional | None | High **when present**, else tax |

### 1.4 Intelligence after answers (today)

| Moment | Visible adaptation? |
|---|---|
| During chat | Live profile strip (“Amy is learning…”) + preview strip — **partial** |
| After each answer | Acknowledgement copy — **weak proof** that recommendation changed |
| Done screen | Theater: “Preparing age-appropriate recommendations…” — **promise, not proof** |
| First real NRT | Deferred to `/routines/generate` — **too late** for “that answer mattered” |

**Gap:** Answers are stored; the parent rarely *sees* the next right thing change inside Discovery.

### 1.5 Production systems that must not break

| System | Preserve |
|---|---|
| Auth | Google / Apple / Facebook / Email / Phone / verify / session |
| APIs | `GET/POST /api/onboarding`, `PUT /api/parent-profile`, `POST /api/children`, `PUT /api/child-intelligence/:id/goals` |
| Analytics | `onboarding_funnel_event` steps, child-journey events, startup `onboarding_complete`, growth `signup_completed` → Firebase `sign_up` |
| RevenueCat | Post-finish trial routing flags untouched |
| Feature flags | Strict complete gate, short branch, post-onboarding trial, guest try-first |
| Navigation | Setup incomplete → `/onboarding`; complete → dashboard / activation path |
| Profiles | Existing `children` + `parent_profiles` rows for returning users |
| Resume | Session snapshot restore + heal paths |

---

## 2. Previous vs New

### 2.1 Emotional contract

| | Previous (`/onboarding`) | New (Child Discovery) |
|---|---|---|
| Metaphor | Setup wizard in chat clothing | Continuous film: Amy understanding this child |
| Parent story | “Finish setup to unlock the app” | “Help Amy earn the right to recommend today” |
| Success feeling | Form complete | Confidence that today’s next step is right |
| Visual | Chat SaaS + chips | Premium photography, motion, materials (Welcome/Signup craft language — **new manufacturing**, not Welcome edits) |

### 2.2 Question strategy (Question Tax)

| | Previous | New |
|---|---|---|
| Question count | ~12–18 taps (full branch) | **Minimum viable truth** for today’s NRT |
| Inference | Partial (FE seed, smart wake/sleep, short-branch flag) | **Default:** infer; ask only when inference is unsafe |
| After each ask | Soft acknowledgement | **Immediate demonstration** — preview of today’s next right thing adapts |
| “For later” fields | Cuisine, diet, allergies, work often asked day-0 | Defer unless they change **today’s** recommendation |

### 2.3 Impact matrix

| Dimension | Previous → New | Notes |
|---|---|---|
| **What improved** | From questionnaire completion to earned recommendation | Aligns with Product Execution Model Stage 1 UNDERSTAND |
| **Why** | Conversion + trust; parents abandon long chats | Question Tax Law |
| **Technical impact** | Re-skin / re-sequence **same finish transaction** where possible | No auth rewrite; keep `runOnboardingFinishTransaction` contract |
| **Database impact** | Prefer **zero new tables** for Phase 2 | Reuse `children`, `parent_profiles`, `parent_goals` |
| **Analytics impact** | Keep funnel event names; map new beats → existing steps | Avoid dashboard breakage |
| **Conversion impact** | Fewer taxes → higher completion → faster first NRT | Primary KPI |
| **Performance** | Shorter path = less time-to-first-value | Keep offline-first Step 1 |
| **Production risk** | Medium if step IDs rename carelessly | Mitigate with adapter layer + flags |

### 2.4 Screen-level previous vs new (summary)

| Beat | Previous | New (proposed) | Justification |
|---|---|---|---|
| Country | Explicit confirm early | Keep (unsafe to invent) but sanctuary craft; IP/GPS first | Changes stage options |
| Name | Asked | Confirm FE name if present — one tap | Already known |
| Age | Asked | Confirm FE band if present | Critical for NRT |
| Birthday | Optional step | **Infer / skip** unless medical infant path needs exact | Tax without day-0 value |
| Education | Long branch | Infer from age + FE todayContext; ask only if ambiguous | Question Tax |
| School times | Multi-step | Ask only if school-going **and** times change today’s plan | Else defaults |
| Wake/sleep | Asked | Show inferred defaults → confirm or adjust **one** beat | Prove adaptation |
| Parent role/work | Asked | Defer or one soft capacity beat | Low for day-0 NRT |
| Cuisine/diet | Asked | Defer to first meal moment | Not day-0 NRT |
| Goals | Optional multi | **At most one** primary focus — instantly reshapes NRT preview | Conversion |
| Allergies | Asked | Ask only if nutrition is today’s surface; else later | Safety without tax |
| Done | Theater then leave | **Show today’s next right thing** before exit | Earn the right |

---

## 3. Screen-by-screen emotional journey (proposed)

> Phase 1 design only. Route may remain `/onboarding` for Production Safety (deep links, gates) while the experience becomes Child Discovery emotionally.

### Film principle

One continuous emotional film.  
No “Step 3 of 12.”  
No survey chrome.  
Photography + motion + restraint (Pillar 1).

### Journey beats

| # | Beat | One question only | Parent feeling | Immediate proof (intelligence) |
|---|---|---|---|---|
| D0 | Arrival | — | “Amy already knows something” | Surface FE keepsake continuity (name, what began) |
| D1 | Place | “Where should Amy personalize from?” | Settled, not interrogated | Education/cuisine context quietly updates |
| D2 | Child | “Who are we understanding today?” | Seen | Name appears in living preview |
| D3 | Age / stage | “How old is [Name]?” *(confirm if known)* | Competent | NRT preview switches age-appropriate card |
| D4 | Today’s world | Only if unsafe to infer: school vs home rhythm | Understood | Preview chooses school-day vs home-day path |
| D5 | Rhythm | “Does this daily rhythm feel right?” (confirm inferred wake/sleep) | Relieved | Timeline of today updates live |
| D6 | Focus *(optional, one)* | “What would help most right now?” | Hopeful | NRT title/reason changes instantly |
| D7 | Earned recommend | — | Trust | **Today’s next right thing** named before any paywall |
| D8 | Quiet keep | Optional notifications — never pressure | Still calm | Exit to execute NRT (`/routines/generate` or Today) |

### Infant branch (conditional)

Only when age infers infant: feeding + sleep pattern — each must immediately change the infant care NRT preview.  
Never ask school class for infants.

### Explicitly out of day-0 Discovery

| Topic | Why deferred |
|---|---|
| Autism / ADHD labels | Safety policy; product must never diagnose; no schema columns today |
| Speech concern | Collect when Speech Coach is today’s surface |
| Full interest inventory | “Might be useful” = tax |
| Complete allergy/cuisine matrix | Ask at first nutrition moment |
| Exact birthday | Optional later for celebrations / precise milestones |
| Second child | After first NRT earned — not mid-discovery |

---

## 4. Database impact

### 4.1 Current schema (reuse)

**Source of truth:** Postgres + Drizzle (`lib/db/src/schema/`).  
Firebase Auth supplies `userId` only — **no profile documents in Firestore**.

#### `children` (reuse — primary)

Key columns already present:

- Identity: `name`, `dob`, `selected_age_band`, `dob_is_estimated`, `age`, `age_months`  
- School / development: `education_stage`, `learning_environment`, `is_school_going`, `child_class`, `schedule_known`, school times/days  
- Rhythm: `wake_up_time`, `sleep_time`, `feeding_type`, `sleep_pattern`, `energy_profile`, `fixed_activities`  
- Goals: `parent_goals` (jsonb), legacy `goals` (text)  
- Food: `diet_type`, `food_style`, `sub_cuisine`, `allergies`, inherit flags  
- Ownership: `user_id` (indexed) · `created_at`  
- **Gaps on table:** no `updated_at`, no soft delete  

#### `parent_profiles` (reuse)

- `name`, `role`, `work_type`, food prefs, `region`  
- Location: `country`, `latitude`, `longitude`, `location_source`  
- `created_at`, `updated_at`  
- **No** timezone/language columns (live on `notification_preferences`)

#### `onboarding_profiles` (reuse carefully)

- `onboarding_complete`, `priority_goal`  
- JSONB `children` / `parent` snapshots — **redundant** with real tables; do not expand as source of truth  

#### Prefer existing over new

| Need | Use |
|---|---|
| Goals | `children.parent_goals` + child-intelligence API |
| Family | `parent_profiles` + `child_caregivers` |
| Daily rhythm signals later | `child_daily_signals` |
| Timezone / locale | `notification_preferences` |
| Birth place / tz (Birth Sky) | `birth_profiles` — **do not overload for Discovery** |

### 4.2 Discovery engine needs vs schema

| Need | Schema status | Phase 2 stance |
|---|---|---|
| Child | Ready | Reuse |
| Family | Ready | Reuse |
| Age | Ready | Reuse |
| Development stage | Partial (`education_stage` only) | Reuse education_stage; do not invent clinical stage |
| School stage | Ready | Reuse |
| Goals | Ready | Reuse `parent_goals` |
| Challenges | **Missing** | **Do not add day-0** unless NRT requires; prefer goal codes + later signals |
| Daily rhythm | Ready | Reuse wake/sleep/school |
| Interests | **Missing** | **Do not collect day-0**; ephemeral in routine AI today |
| Health context | Partial (allergies, infant) | Ask only when needed |
| Speech | Progress tables only | Out of day-0 |
| Autism / ADHD | **Missing by design** | **Do not add diagnostic columns** |
| Location | Ready on parent | Reuse |
| Language | Prefs only | Reuse `notification_preferences.locale` |
| Timezone | Prefs only | Reuse `notification_preferences.timezone` |

---

## 5. New tables (if needed)

### Phase 2 recommendation: **zero new tables**

Earn today’s NRT with existing `children` + `parent_profiles` + `onboarding_profiles.onboarding_complete`.

### Only if Founder later requires durable Discovery memory

If a future phase must persist “what Amy learned mid-film” beyond child columns:

| Proposed (NOT approved) | Purpose | Required fields if ever created |
|---|---|---|
| `child_discovery_sessions` | Resume film state server-side (optional; client session already exists) | `id`, `user_id`, `child_id` nullable, `state` jsonb, `created_at`, `updated_at`, ownership FK/index, soft delete **or** TTL |

**Do not create** until client session + existing tables prove insufficient.

### Column-level extensions (only with Founder + migration doc)

| Column idea | Table | Justification bar |
|---|---|---|
| `updated_at` | `children` | Hygiene — justified, low risk |
| `interests` jsonb | `children` | Only if Today NRT uses it day-0 |
| `challenges` jsonb | `children` | Only if distinct from `parent_goals` |

Any new column requires: migration SQL, `ensureStartupTables` / drizzle sync, OpenAPI update, backfill nullability plan, analytics note.

---

## 6. Existing tables reused

| Table | Discovery use |
|---|---|
| `children` | Source of truth for child understanding |
| `parent_profiles` | Family / location / deferred food prefs |
| `onboarding_profiles` | Completion gate only |
| `notification_preferences` | Timezone + locale |
| `child_caregivers` | Multi-caregiver later — not day-0 |
| `family_goals` / family twin | Post-Discovery intelligence — do not duplicate into onboarding JSON |

**Never duplicate:** goals into a fifth store; school stage into a new table; Discovery-only copy of child rows.

---

## 7. API impact

### Preserve (no rewrite)

| API | Role |
|---|---|
| `GET/POST /api/onboarding` | Completion status |
| `POST /api/onboarding/complete` | Heal path |
| `PUT /api/parent-profile` | Parent upsert |
| `POST /api/children` | Child create (`isOnboarding: true` semantics) |
| `PUT /api/child-intelligence/:childId/goals` | Structured goals |
| Analytics ingest endpoints | Funnel + startup |

### Finish transaction order (keep)

1. Read onboarding status  
2. Upsert parent  
3. Create child(ren)  
4. Write goals  
5. Mark `onboardingComplete: true`  
6. Verify  

File: `artifacts/kidschedule/src/lib/onboarding-completion.ts`

### Allowed Phase 2 shape (pending approval)

- New UI / copy / cinematography **calling the same APIs**  
- Adapter mapping Discovery beats → existing payload fields  
- Feature flag to switch film UI vs legacy chat  
- **No** parallel “discovery_profiles” API unless schema proves need  

### OpenAPI

`CreateChildBody` / `UpdateChildBody` already cover Discovery fields. Prefer extending OpenAPI only when columns are approved.

---

## 8. Analytics impact

### Preserve event names (dashboards depend on them)

| Rail | Events to keep mapping |
|---|---|
| Funnel | `onboarding_started`, `step_viewed`, `step_completed`, `step_skipped`, `finish_clicked`, `finish_success`, `onboarding_completed`, `finish_failed` |
| Child journey | `child_name_*`, `child_age_*`, education/school/wake/sleep pairs, `parent_segment_*` |
| Startup | `onboarding_complete` |
| Growth | milestone that currently fires Firebase `sign_up` (`signup_completed`) — **do not silently rename** |

### Adaptation for shorter film

| New beat | Map to existing step id (recommended) |
|---|---|
| D2 Child confirm | `child-name` |
| D3 Age confirm | `child-dob` |
| D4 Today’s world | `child-education-stage` or `child-schedule-known` |
| D5 Rhythm confirm | `child-wake` / `child-sleep` (single combined complete ok if both props set) |
| D6 Focus | `parent-goals` |
| D7 Earned NRT shown | new **optional** funnel prop `nrt_preview_shown=true` on `finish_clicked` — additive only |

Skipped taxes → emit `step_skipped` with reason `inferred_safely` (additive prop) so conversion science can prove Question Tax wins.

### Firebase

No child-create Firebase event today — **keep it that way** unless Growth explicitly requests one. Do not invent diagnosis events.

---

## 9. Migration strategy

### Phase 1 (this document)

No migrations.

### Phase 2 (implementation — after Founder approval)

1. **Prefer zero schema change** — ship Discovery film on existing columns  
2. If `children.updated_at` approved → additive nullable/default migration + backfill `created_at`  
3. Run against staging; verify existing users:  
   - `onboarding_complete = true` never reset  
   - Existing children rows render Today unchanged  
   - Resume sessions with old step IDs still sanitize  
4. Feature flag rollout:  
   - `VITE_FF_CHILD_DISCOVERY_FILM` (name TBD) off by default  
   - Short-branch / strict-complete flags remain authoritative for completion math  
5. Rollback = flag off → legacy chat path (keep until film proves conversion)

### Soft delete strategy

Children today are hard-deleted. Discovery must not assume soft delete. Any future soft delete is a **separate** platform project — out of scope.

---

## 10. Production risks

| Risk | Severity | Mitigation |
|---|---|---|
| Step ID rename breaks resume + analytics | High | Keep canonical step ids; film beats map to them |
| Setup gate redirect loops | High | Preserve `resolveSetupStatus` / `shouldSkipOnboardingPage` |
| Finish transaction order change | Critical | Do not rewrite `runOnboardingFinishTransaction` |
| Inferring education_stage wrong | Medium | Confirm beat when FE context is `unsure` or age ambiguous |
| Deferring allergies → meal risk | Medium | Gate nutrition surfaces until allergy unknown resolved; ask at first meal |
| FE continuity missing | Medium | Fall back to ask name/age (earned taps) |
| Short-branch flag conflict | Medium | Unify under Discovery inference policy |
| Post-onboarding trial before NRT proof | High for trust | Prefer show NRT **before** trial route (conversion + trust) |
| Existing complete users forced back | Critical | Never clear `onboarding_complete`; heal paths stay |
| Welcome/Signup regression | Critical | **Do not edit** frozen surfaces |

---

## 11. Conversion opportunities

| Opportunity | Mechanism |
|---|---|
| Cut day-0 taxes | Infer age/stage/rhythm; defer cuisine/diet/work |
| Continuity from Signup Keep | Confirm, don’t re-ask — feels like one story |
| Instant proof | NRT preview updates after every required answer |
| Earn before monetize | Name today’s next right thing before `/subscription-trial` |
| Fatigue exit | Already have device continuity — don’t trap in wizard |
| One focus goal | Multi-select goals → single primary (Question Tax) |
| Instrument skips | `inferred_safely` skip reasons → prove lift |

**Primary KPI:** Discovery completion % and time-to-first-NRT.  
**Secondary:** D1 routine activation, trial start **after** NRT seen.

---

## 12. Performance considerations

| Area | Guidance |
|---|---|
| First paint | Keep offline-capable first beat; failsafe timers already exist (`ONBOARDING_MAX_LOADING_MS`) |
| Photography | Use Welcome-grade asset pipeline; lazy decode; never block first question |
| Motion | Calm, interruptible; respect reduced motion |
| Network | Finish transaction remains the only hard online requirement |
| Resume | Client session stays; avoid new server round-trips per beat |
| Bundle | Prefer reusing chat platform / shell; don’t ship a second onboarding framework |

---

## 13. Founder recommendations

### Recommend APPROVE for Phase 2 direction

1. **Emotion:** Child Discovery film — “Amy is understanding my child.”  
2. **Route safety:** Keep `/onboarding` entry + gates; change experience, not plumbing.  
3. **Schema:** **Zero new tables** for first manufacturing pass.  
4. **APIs:** Preserve finish transaction + child/parent endpoints 100%.  
5. **Question Tax:** Day-0 asks only: place (if needed), child confirm, age confirm, rhythm confirm, optional one focus — everything else inferred or deferred.  
6. **Intelligence:** Mandatory live NRT preview that changes after each ask.  
7. **Monetization:** Show earned next right thing **before** trial paywall.  
8. **Never ask:** Autism/ADHD diagnostic labels; interest catalogs; “for later” admin fields.  
9. **Frozen:** Do not touch Welcome V3 or Signup Keep pixels/routes.  
10. **Rollout:** Feature flag + analytics-compatible step mapping + rollback to legacy chat.

### Recommend REJECT (if proposed later)

- New parallel Discovery database  
- Rewriting Firebase auth or RevenueCat for Discovery  
- Multi-page HTML wizard  
- Collecting clinical diagnoses  
- Re-asking FE name/age without confirm-first  
- Expanding `onboarding_profiles` JSONB as source of truth  

### Open questions for Founder (product, not engineering blockers)

1. Must day-0 Discovery always create a routine (`/routines/generate`), or may it land on Today with NRT already named?  
2. Is one optional focus goal in day-0 approved, or should goals wait until after first NRT completion?  
3. Confirm: allergy ask deferred to first nutrition surface — acceptable?

---

## Appendix A — Discovery engine coverage (collect policy)

| Attribute | Collect in Discovery? | How |
|---|---|---|
| Child | Yes | Confirm / ask name |
| Family | Minimal | Parent from OAuth; role deferred |
| Age | Yes | Confirm FE / ask band |
| Development stage | Via education_stage | Infer + confirm if needed |
| School stage | Conditional | Infer from age + today context |
| Goals | At most one | Optional focus |
| Challenges | No day-0 | Later signals / goals |
| Daily rhythm | Confirm inferred | Wake/sleep defaults |
| Interests | No | — |
| Health | Only if required | Infant feeding/sleep; allergies deferred |
| Speech | No | — |
| Autism | **Never as diagnosis** | — |
| ADHD | **Never as diagnosis** | — |
| Location | Yes if unknown | Existing location pipeline |
| Language | Infer device / prefs | Do not ask |
| Timezone | Infer device / prefs | Do not ask |

---

## Appendix B — Quality gate (Phase 2 — not started)

Before Founder Review of implementation:

- [ ] Build passes  
- [ ] Tests pass  
- [ ] Database migrations verified (if any)  
- [ ] Existing users unaffected  
- [ ] Analytics verified (funnel continuity)  
- [ ] Performance acceptable  
- [ ] Mobile tested  
- [ ] Desktop tested  
- [ ] Accessibility tested  
- [ ] No production regressions  
- [ ] Welcome / Signup Keep untouched  

---

## STOP

**Phase 1 deliverable complete.**

No production code.  
No schema migrations.  
No UI manufacturing.

Await Founder approval before Phase 2 implementation.
