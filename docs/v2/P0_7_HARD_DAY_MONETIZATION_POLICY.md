# P0-7 — Hard-Day Monetization Policy

**Status:** STUDY + POLICY ONLY — **NO IMPLEMENTATION**  
**Authority:** Founder Order — P0-7 Hard-Day Monetization Remediation Study  
**Source of truth inputs:**
- `docs/v2/AMYNEST_POST_P0_P1_GAP_AUDIT.md`
- `docs/v2/AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_REVIEW.md`
- Live entitlement / gate / copy inspection (2026-05-08)

**Business objective (binding):**  
Keep Premium. Do **not** remove monetization.  
Ensure a parent asking for help on a difficult day never feels abandoned, trapped, manipulated, or commercially pressured.

AmyNest sells: **continuity · support · confidence · time saved · deeper help**  
AmyNest does **not** sell: **fear · urgency · guilt · unlock theatre · FOMO**

---

## 1. Executive Summary

AmyNest can charge for **deeper continuity** without selling **help itself** — but only if hard-day paths deliver a **meaningful free first outcome** before any Premium surface appears, and Premium is framed as **continue helping you**, never **pay to get help**.

### Current state (honest)

| Layer | Status after P0/P1 SELECT |
|---|---|
| Pack 5 quiet defaults | Mostly landed (`PREMIUM_VOICE`, muted Try Free) |
| Ask Amy companion chrome | Softens Zap copy when living ON — **quotas unchanged** |
| Emotional Support | Journey-exempt tile — **SubItemGate still can cut hard-day cards** |
| Speech / Infant / Nutrition / Health / Coach / Guidance / RG | Freemium floors exist; mostly continuity-shaped, not distress-shaped |
| Residual pressure | SubItemGate “Premium feature — tap to upgrade”; infant “Upgrade to unlock free baby questions”; Ask Amy hard quota cut mid-need; Season FOMO banner residue on PTM |

### Verdict

| Question | Answer |
|---|---|
| Can AmyNest charge for deeper continuity without making a parent feel that help itself is being sold? | **YES** |
| Is current product already compliant with that promise on every hard-day path? | **NO** |
| What must change before Final Apple Audit? | Adopt **Hard-Day Law** below; remediate **Policy Conflicts** and **Unsafe Monetization** paths; keep Premium on continuity moments |

### One-sentence Founder rule

> **Help first. Continuity next. Never monetize distress.**

---

## 2. Current Monetization Map

### Entitlement floors (from `subscription-defaults.ts` — observed, not changed)

| Capability | Free floor | Gate / feature key |
|---|---|---|
| Adult AI questions | ~10 / day | `ai_quota` |
| Infant AI questions | ~3 / day | `infant_ai_quota` |
| Speech Coach sessions | 3 | `speech_coach` |
| Infant sleep / feeding AI plans | 1 each | `infant_sleep_coach`, `infant_feeding_plan` |
| Nutrition AI meals / day | 3 | nutrition AI gates |
| Weekly meal planner | Premium | `meal_planner` |
| Shopping lists | Premium | `shopping_lists` |
| Health Lab AI analyses | 1 | health AI |
| Amy Coach AI plans | 1 | coach AI |
| Guidance AI insights | 1 | guidance AI |
| Routines / month | 3 | `routines_limit` |
| Emotional Support journeys | Journey-exempt tile; cards still SubItemGate (~2 free) | mixed |

### Premium appearance patterns (product-wide)

1. **Hard entitlement cut** → `EntitlementGate` / `useEntitlementGate` → Pricing / paywall  
2. **SubItemGate** → “Premium feature — tap to upgrade” (ignores Pack 5 quiet)  
3. **Inline Upgrade / Unlock / Zap CTAs** inside module chrome  
4. **Soft continuity offer** after value (desired pattern — uneven today)  
5. **FOMO / season banners** (PTM residue)  
6. **Leave continuity** (Today Home / Parent Hub) — exit without sell (good)

### Value → ask timing (current)

```
Parent enters hard-day destination
        │
        ├─ Sometimes: free floor delivers answer / plan / session
        │         └─ then Upgrade / Premium CTA (mixed quality)
        │
        └─ Sometimes: gate / quota / SubItemGate BEFORE answer
                  └─ feels like "pay to get help"  ← UNSAFE
```

---

## 3. Hard-Day Flow Inventory

For each path: parent ask · immediate value · Premium timing · leave / free continue · pressure.

### 3.1 Ask Amy (`/assistant`)

| Dimension | Finding |
|---|---|
| Parent asking for | Immediate advice, validation, “what do I do now?” |
| Immediate free value | Adult AI answers within daily quota (~10); infant path lower (~3) |
| Premium appears | On `ai_quota` / `infant_ai_quota` exhaustion → paywall / pricing; Upgrade CTAs in chrome |
| Before Premium | Answers until quota hits — **unless already exhausted earlier that day** |
| After Premium | Framing varies; companion softens Zap when living ON |
| Can leave? | Yes (nav / leave continuity on related shells) |
| Useful free outcome? | Yes **if quota remains**; no meaningful soft-continue when hard-cut |
| Pressure? | **Medium–High** when cut mid-need; companion reduces theatre but not the cut |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM CONTINUITY *(intent)* · **POLICY CONFLICT** *(hard cut + upgrade theatre residual)*

---

### 3.2 Emotional Support (`/emotional-support`)

| Dimension | Finding |
|---|---|
| Parent asking for | Grounding, overwhelm relief, “I’m not failing” |
| Immediate free value | Journey tile exempt; some cards open |
| Premium appears | **SubItemGate after ~2 free cards** — can block before Amy answers |
| Before Premium | Partial card access |
| After Premium | Upgrade path |
| Can leave? | Yes |
| Useful free outcome? | **Not guaranteed** on hard-day card #3+ |
| Pressure? | **High** — monetizes distress if gate hits mid-crisis |

**Classification:** **UNSAFE MONETIZATION** (when SubItemGate blocks first meaningful Amy answer) · intended: CORE FREE HELP

---

### 3.3 Speech Coach (`/speech`)

| Dimension | Finding |
|---|---|
| Parent asking for | Help with speech concern / practice tonight |
| Immediate free value | 3 free sessions; living ON silences XP/points theatre |
| Premium appears | After free sessions (`speech_coach`) |
| Before Premium | Real sessions available |
| After Premium | More practice / continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes within 3 sessions |
| Pressure? | Low–Medium (neon chassis residual is UX, not paywall) |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM CONTINUITY

---

### 3.4 PTM Prep (`/ptm-prep`)

| Dimension | Finding |
|---|---|
| Parent asking for | Confidence for school meeting; reduce anxiety |
| Immediate free value | Journey-exempt; local fallback; free prep path |
| Premium appears | Continuity / deeper tools; **Season FOMO banner residue** possible |
| Before Premium | Meaningful prep can complete free |
| After Premium | Deeper packs / save continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes |
| Pressure? | Low on core prep; **Medium if FOMO banner active** |

**Classification:** CORE FREE HELP (first prep) · PREMIUM DEPTH (deeper packs) · FOMO residue = **POLICY CONFLICT**

---

### 3.5 Infant Care (`/infant-care`)

| Dimension | Finding |
|---|---|
| Parent asking for | Feeding / sleep / “is this normal?” |
| Immediate free value | Tracking free; 1 free sleep + 1 free feeding AI plan; limited infant AI Q |
| Premium appears | After free plan units; Upgrade CTAs; **“Upgrade to unlock free baby questions”** copy risk |
| Before Premium | Tracking + first plan |
| After Premium | More plans / questions |
| Can leave? | Yes |
| Useful free outcome? | Yes for first unit |
| Pressure? | **Medium** — wording can feel like selling baby help |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM CONTINUITY · copy = **POLICY CONFLICT** / near **UNSAFE** if framed as unlock-to-ask

---

### 3.6 Nutrition (`/nutrition`)

| Dimension | Finding |
|---|---|
| Parent asking for | What to feed tonight; less decision load |
| Immediate free value | Free meal suggestions within daily AI meal floor |
| Premium appears | Weekly planner, shopping lists, extra AI meals |
| Before Premium | Tonight’s help possible |
| After Premium | Week planning continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes for tonight |
| Pressure? | Low if floor holds; Medium if Upgrade interrupts mid-recipe |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM CONTINUITY · weekly planner = PREMIUM PLAN

---

### 3.7 Health Lab (`/health-lab`)

| Dimension | Finding |
|---|---|
| Parent asking for | Symptom worry triage (non-clinical) |
| Immediate free value | Free triage / view paths; limited AI analyses |
| Premium appears | After free AI analysis unit |
| Before Premium | Orienting free content |
| After Premium | Deeper analysis continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes for first orient |
| Pressure? | Medium if gate hits during acute worry — must not claim clinical safety |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM DEPTH  
**Policy note:** Do **not** invent medical policy; do **not** claim clinical safety. Free first help = orient + next-step parenting guidance only.

---

### 3.8 Amy Coach (`/amy-coach`)

| Dimension | Finding |
|---|---|
| Parent asking for | Structured plan for a behaviour / habit struggle |
| Immediate free value | Limited free AI plan unit(s); living ON softens dual Unlock CTAs |
| Premium appears | After free plan; depth / more plans |
| Before Premium | One meaningful plan possible |
| After Premium | Continuity of coaching |
| Can leave? | Yes |
| Useful free outcome? | Yes if free unit remains |
| Pressure? | Medium on living OFF (Unlock theatre); Low–Medium on living ON |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM DEPTH / PREMIUM PLAN

---

### 3.9 Guidance (`/guidance`)

| Dimension | Finding |
|---|---|
| Parent asking for | Longer-form parenting insight |
| Immediate free value | Limited free AI insights |
| Premium appears | Deeper packs / more insights |
| Before Premium | First insight possible |
| After Premium | Library continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes for first insight |
| Pressure? | Low–Medium |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM DEPTH

---

### 3.10 Routine Generation (`/routine-generation`)

| Dimension | Finding |
|---|---|
| Parent asking for | Rescue a failed evening / bedtime structure |
| Immediate free value | Free monthly generations; R5 grace skip + quiet completion; rest path on Today |
| Premium appears | Soft block on `routines_limit` — continuity-shaped |
| Before Premium | Generate within free month quota; or rest / leave |
| After Premium | More generations / family continuity |
| Can leave? | Yes (R5 + AmyNestLeaveContinuity) |
| Useful free outcome? | Yes within quota; rest path if over |
| Pressure? | Low (post-R5) |

**Classification:** FREE FIRST EXPERIENCE → PREMIUM PLAN · rest path = CORE FREE HELP

---

### 3.11 Today Home (`/dashboard`)

| Dimension | Finding |
|---|---|
| Parent asking for | Orient the day; recover from overwhelm |
| Immediate free value | Rest path, today’s plan view, leave continuity — no paywall on orient |
| Premium appears | Indirect via Generate → routines_limit; module CTAs elsewhere |
| Before Premium | Full orient free |
| After Premium | N/A on home itself |
| Can leave? | Yes |
| Useful free outcome? | Yes |
| Pressure? | Low |

**Classification:** CORE FREE HELP

---

### 3.12 Parent Hub Help (`/hub/help` and help destinations)

| Dimension | Finding |
|---|---|
| Parent asking for | “Where do I go for help right now?” |
| Immediate free value | Navigation into help modules; leave continuity |
| Premium appears | Inside destination modules (Ask Amy, Emotional, etc.) |
| Before Premium | Hub itself should not sell |
| After Premium | N/A at hub layer |
| Can leave? | Yes |
| Useful free outcome? | Routing + first module help |
| Pressure? | Low at hub; inherits destination risk |

**Classification:** CORE FREE HELP (hub shell) · destination inherits module class

---

### 3.13 Parent Hub Care (`/hub/care` and care destinations)

| Dimension | Finding |
|---|---|
| Parent asking for | Care tools (infant, health, nutrition, sleep) under stress |
| Immediate free value | Entry + module free floors |
| Premium appears | Inside care modules |
| Before Premium | Hub shell free |
| After Premium | Module continuity |
| Can leave? | Yes |
| Useful free outcome? | Yes if destination floors hold |
| Pressure? | Low at hub; Medium in infant/health if copy wrong |

**Classification:** CORE FREE HELP (hub shell) · destinations per §3.5–3.7

---

### 3.14 Other hard-day-adjacent destinations

| Destination | Hard-day relevance | Classification |
|---|---|---|
| Rooms / Explore (`/rooms`) | Escape / browse when overwhelmed | CORE FREE HELP for free rooms; Premium rooms = PREMIUM DEPTH — Explore Free badge must stay quiet |
| Amy Audio | Calming / story when dysregulated | FREE FIRST EXPERIENCE → PREMIUM DEPTH (do not gate first calm clip if product offers one) |
| Progress / Family | Rarely acute hard-day | PREMIUM DEPTH / PLAN — do not force during crisis navigation |
| Pricing / Paywall routes | Explicit sell | Allowed only after Meaningful First Help or from Settings / intentional Upgrade |

---

## 4. Free vs Premium Classification

### Legend

| Class | Meaning |
|---|---|
| **CORE FREE HELP** | Must deliver meaningful first help without payment; Premium never blocks this moment |
| **FREE FIRST EXPERIENCE → PREMIUM CONTINUITY** | Free proves value once; Premium extends frequency, memory, depth, time saved |
| **PREMIUM DEPTH** | Richer tools after free orient; not required for first relief |
| **PREMIUM PLAN** | Ongoing structure (weeks, family, unlimited) — strongest honest subscribe reason |
| **POLICY CONFLICT** | Stated product intent vs live gate/copy mismatch |
| **UNSAFE MONETIZATION** | Monetizes distress, traps, guilt, FOMO, or help-itself |

### Matrix

| Experience | Class |
|---|---|
| Today Home orient / rest / leave | CORE FREE HELP |
| Parent Hub Help / Care shells | CORE FREE HELP |
| Emotional Support — first meaningful Amy answer / grounding | CORE FREE HELP *(required)* · currently UNSAFE if SubItemGate blocks |
| PTM first prep + local fallback | CORE FREE HELP |
| Ask Amy — first answer in-session while free floor remains | FREE FIRST → PREMIUM CONTINUITY |
| Ask Amy — unlimited / higher daily / memory | PREMIUM CONTINUITY / PLAN |
| Speech — free sessions | FREE FIRST → PREMIUM CONTINUITY |
| Infant tracking + first AI plan | FREE FIRST → PREMIUM CONTINUITY |
| Nutrition tonight meal | FREE FIRST → PREMIUM CONTINUITY |
| Nutrition weekly planner / shopping | PREMIUM PLAN |
| Health Lab first orient | FREE FIRST → PREMIUM DEPTH |
| Amy Coach first plan | FREE FIRST → PREMIUM DEPTH / PLAN |
| Guidance first insight | FREE FIRST → PREMIUM DEPTH |
| Routine Generation within free month + rest path | FREE FIRST → PREMIUM PLAN |
| Rooms Premium destinations | PREMIUM DEPTH |
| Emotional SubItemGate mid-crisis | **UNSAFE MONETIZATION** |
| Infant “upgrade to unlock free baby questions” framing | **POLICY CONFLICT** → treat as near-UNSAFE until fixed |
| SubItemGate “tap to upgrade” on Pack 5 quiet surfaces | **POLICY CONFLICT** |
| PTM Season FOMO during anxiety prep | **POLICY CONFLICT** |
| Ask Amy Zap / Unlock mid-quota-cut without soft continue | **POLICY CONFLICT** |

---

## 5. Policy Conflicts

| # | Conflict | Why it matters on a hard day |
|---|---|---|
| C1 | Ask Amy companion softens copy but **quotas / hard-cut unchanged** | Parent can still hit a wall mid-ask; feels abandoned |
| C2 | Emotional Support **journey-exempt** vs **SubItemGate on cards** | Distress path can still require upgrade before Amy answers |
| C3 | Infant Care **Upgrade / free baby questions** language | Sells baby help; Apple + parent trust risk |
| C4 | Pack 5 quiet defaults vs **SubItemGate** residual copy | Unlock theatre returns at the worst moment |
| C5 | Dual living OFF paths still show **Unlock / Zap** | Flag-off parents get harsher sell during stress |
| C6 | PTM free prep vs **Season FOMO** residue | Anxiety + artificial scarcity |
| C7 | P0/P1 shipped experience fixes but **entitlement behaviour frozen** | UX calmed; policy boundary not yet law |

These are **documentation / future implementation conflicts** — this study does **not** change entitlements.

---

## 6. Apple Risks

| Risk | Present today? | Severity |
|---|---|---|
| Tired parent feels sold-to before helped | **Yes** on Emotional SubItemGate + Ask Amy hard-cut + infant upgrade framing | **P0** |
| Paywall as manipulative monetization vs reasonable continuity | Mixed — continuity-shaped in RG/Nutrition; distress-shaped in Emotional/Ask Amy cut | **P0** |
| Monetizing distress | **Yes** — Emotional Support gate risk | **P0** |
| Artificial scarcity | Season FOMO residue (PTM); urgency CTAs residual | **P1** |
| Emotional pressure / guilt | Softened in Pack 5; residual Upgrade theatre + SubItemGate | **P1** |
| Incomplete-app feel if free path feels hollow | If free floor is “tease then wall” | **P0** for Apple complete-app story |

**Apple test answer (current product):**  
Not consistently. A tired parent sometimes gets help-first; sometimes hits pay-to-continue-help. That is enough for Apple reviewer / trust failure on hard-day paths.

**Apple test answer (if Hard-Day Law adopted):**  
Yes — help first, continuity second, Premium as deeper support is a reasonable freemium story.

---

## 7. Conversion Risks

### Do not assume “remove paywall = better conversion”

| Pattern | Conversion effect |
|---|---|
| Paywall **before** first help | Trust collapse → churn / 1★ / no subscribe |
| Free floor too thin (empty tease) | Parent never feels value → no subscribe |
| Free floor too generous with no continuity story | Value without reason to pay → weak conversion |
| Premium as **continue helping you** after proven value | Strongest honest conversion |
| FOMO / guilt / unlock theatre | Short spike, long trust damage, Apple risk |

### Where value is already proven (keep)

- Speech free sessions  
- Infant tracking + first plan  
- Nutrition tonight meals  
- PTM free prep  
- RG free gens + rest path  
- Today Home orient  

### Where Premium can naturally appear (keep / strengthen framing)

- After Ask Amy answer: “Want Amy beside you for more of tonight / this week?”  
- After Speech free sessions: “Keep this week’s practice going”  
- After Infant first plan: “Save and regenerate as baby changes”  
- After Nutrition tonight: “Plan the week so dinner stops being a fight”  
- After RG success: “More living routines for busy months”  
- After Coach / Guidance first unit: “Deeper plans and saved arcs”  

### Where Premium is harmful (fix)

- Before Emotional Support Amy answer  
- Mid-crisis Ask Amy with no soft continue / no graceful free close  
- Infant “unlock free baby questions”  
- Any Zap / Unlock / guilt / FOMO on hard-day surfaces  
- SubItemGate as the first interaction with a help card  

### Too much / too little before asking

| Module | Today | Recommendation |
|---|---|---|
| Emotional Support | Too little guaranteed free help | Raise free floor to **Meaningful First Help** always |
| Ask Amy | Floor OK when remaining; cliff too hard | Soft-continue + continuity offer; never silent abandon |
| Speech | Balanced | Keep 3; Premium = continuity |
| Infant | First plan OK; copy too sharp | Keep floor; fix framing |
| Nutrition / Health / Coach / Guidance | Mostly balanced | Keep; Premium after first unit |
| RG | Balanced post-R5 | Keep soft block |

---

## 8. Proposed Hard-Day Law

### 8.1 Hard-Day Contexts (checkable)

A session is a **Hard-Day Context** when the parent is in any of:

| Context | Signals (product) |
|---|---|
| Crisis / emotional support | `/emotional-support` and emotional intents |
| Speech concern | `/speech` entry and speech session start |
| Parent guilt / overwhelm | Emotional Support; Today Home rest; Ask Amy overwhelm intents |
| PTM anxiety | `/ptm-prep` |
| Infant care concern | `/infant-care` AI / plan / ask flows |
| Health-related concern | `/health-lab` triage / AI analysis entry |
| Routine failure | `/routine-generation`; Today Home generate/rest |
| Child behaviour difficulty | `/amy-coach`; Ask Amy behaviour intents; Guidance behaviour topics |

*(Nutrition hard-day = “dinner crisis tonight” — treat first meal help as hard-day-adjacent.)*

### 8.2 Meaningful First Help Outcome (MFHO)

Exactly one of the following, delivered in-session for the parent’s current ask:

1. **Amy response text delivered** for the parent’s question (Ask Amy / Emotional Support answer)  
2. **Emotional Support grounding steps / card answer delivered** without requiring upgrade  
3. **Speech free session started or free-session result shown**  
4. **PTM prep sheet or local fallback delivered**  
5. **Infant care tracking saved OR one free AI plan delivered**  
6. **Health Lab free triage / orient view shown** (non-clinical; no safety claims)  
7. **Nutrition free meal suggestion shown** for tonight  
8. **Routine free generation completed OR rest / leave path offered**  
9. **Amy Coach / Guidance first free unit delivered** when that is the entered path  

### 8.3 Hard-Day First Help Rule (binding law)

```
IF Hard-Day Context
AND Meaningful First Help Outcome has NOT been delivered for this intent in this session
THEN FORBIDDEN:
  - paywall / Pricing interstitial that blocks the outcome
  - SubItemGate that blocks the outcome
  - Upgrade / Unlock / Zap CTA that is the only path to the outcome
  - guilt, FOMO, urgency, scarcity copy

AFTER Meaningful First Help Outcome
THEN ALLOWED:
  - Premium Continuity Offer (see §9)
  - entitlement gates for additional units beyond free floor
  - Settings / intentional Upgrade entry
```

### 8.4 What must remain free enough

| Hard-day type | Minimum free bar |
|---|---|
| Crisis / emotional support | At least one full Amy / grounding answer path — **never paywall before first answer** |
| Speech concern | Keep ≥ 1–3 free sessions (current 3 is acceptable) |
| Guilt / overwhelm | Today rest + Emotional first answer + Ask Amy answer while floor remains |
| PTM anxiety | Complete first prep free (already intent) |
| Infant concern | Tracking always free + first AI plan unit free |
| Health concern | Free orient / triage view; AI unit per existing floor; **no clinical claims** |
| Routine failure | Free gen within month quota OR rest/leave without sell |
| Behaviour difficulty | First Coach / Ask Amy unit per floors |

### 8.5 Non-claims (absolute)

- Do **not** invent medical policy.  
- Do **not** claim clinical safety.  
- Do **not** position AmyNest as emergency services.  
- Hard-day free help = parenting support + orient + next step — not diagnosis or treatment.

---

## 9. Allowed Premium Moments

Premium may appear when **all** are true:

1. MFHO already delivered **or** parent opened Settings / explicit Upgrade  
2. Offer is framed as **continuity / depth / time saved / confidence**  
3. Copy uses **PREMIUM_VOICE** (Pack 5) — calm, specific, no Zap/Unlock theatre  
4. Parent can **Keep going free** / **Not now** / leave without trapped loop  
5. Parent can understand **what Premium adds** in one sentence  

### Allowed examples (intent)

- “You’ve got a plan for tonight. Premium keeps Amy beside you for more questions this week.”  
- “You’ve used today’s free speech sessions. Premium continues practice so progress doesn’t pause.”  
- “Tonight’s meals are ready. Premium plans the week and shopping so dinner stops being a fight.”  
- “Your PTM prep is ready. Premium saves deeper packs for the next meeting.”  
- “This routine is living. Premium gives more living routines across busy months.”  

### Allowed surfaces

- Post-answer continuity card  
- Soft block after free floor exhausted (with free close)  
- Module settings / account upgrade  
- Rooms Premium destinations (browse, not distress gate)  
- Family / multi-child continuity  

---

## 10. Forbidden Premium Moments

Never show Premium / paywall / Upgrade as the blocking action when:

| Forbidden moment | Why |
|---|---|
| Before first Emotional Support Amy / grounding answer | Monetizes distress |
| As the only path to any MFHO | Sells help itself |
| Mid-crisis with no free close / leave | Trap |
| With Zap / Unlock / neon urgency theatre | Manipulative |
| With guilt (“you’re failing without Premium”) | Emotional pressure |
| With FOMO / season scarcity on PTM anxiety | Artificial scarcity |
| Infant “upgrade to unlock free baby questions” | Sells baby help |
| SubItemGate “Premium feature — tap to upgrade” as first hard-day card interaction | Unlock theatre |
| Replacing leave / rest with paywall | Blocks recovery |

---

## 11. Module-by-Module Recommendation

| Module | Keep free | Sell as Premium | Fix before Apple |
|---|---|---|---|
| **Ask Amy** | First answers within floor; soft-continue when exhausted | Higher daily / memory / week continuity | Soft-continue path; PREMIUM_VOICE only; no Zap wall |
| **Emotional Support** | **Always** MFHO on hard-day cards | Longer journeys, saved notes, multi-week arcs | **Remove SubItemGate from first-help path**; raise free card floor for MFHO |
| **Speech Coach** | 3 sessions | Ongoing weeks / advanced packs | Keep; optional quieter chassis (separate P0) |
| **PTM Prep** | Full first prep | Deeper packs / history | Kill FOMO season pressure on this path |
| **Infant Care** | Tracking + first plans + honest free Q floor | More plans / questions | Rewrite Upgrade copy to continuity; ban “unlock free questions” |
| **Nutrition** | Tonight meals within floor | Weekly planner / shopping | Keep; Premium after tonight value |
| **Health Lab** | Orient + free AI unit | More analyses | Keep non-clinical; no distress theatre |
| **Amy Coach** | First free plan | More plans / saved arcs | Living ON path preferred; no dual Unlock |
| **Guidance** | First insight | Deeper library | Keep |
| **Routine Generation** | Free month gens + rest | More gens / family | Keep R5 soft block |
| **Today Home** | Orient / rest / leave | None on home | Keep |
| **Parent Hub Help/Care** | Routing + leave | None on shell | Keep; destinations follow law |
| **Rooms** | Free rooms browse | Premium rooms | Keep quiet Explore Free |

**Entitlement numbers:** This policy does **not** mandate specific new quota integers. Founder may keep current numbers **if** MFHO is guaranteed and soft-continue exists. Changing quotas is a **Founder Decision** (§14), not automatic.

---

## 12. Implementation Scope

### In scope for a future P0-7 implementation PR (after Founder approval only)

| Work | Layer |
|---|---|
| Enforce Hard-Day First Help Rule in gate UX ordering | Experience / gate presentation |
| Emotional Support: ensure MFHO before any SubItemGate / paywall | Experience + possibly free-floor presentation |
| Ask Amy: soft-continue + continuity offer when quota exhausted | Experience (prefer no entitlement schema change) |
| Replace residual Unlock/Zap/SubItemGate copy with PREMIUM_VOICE + free exit | Copy / components |
| Infant Upgrade framing → continuity framing | Copy |
| PTM FOMO banner suppression on hard-day prep | Experience |
| QA checklist: Hard-Day Law conversion + Apple tests | Docs / QA |

### Explicitly out of scope unless Founder separately orders

- RevenueCat product / price changes  
- Entitlement schema / Firebase / API / DB changes  
- Broad quota number redesign (unless Founder picks options in §14)  
- Speech neon remanufacture (separate P0)  
- Parent Hub IA remanufacture (P0-6)  
- Final Apple Audit execution  
- Analytics contract changes  

### Suggested implementation phases (future)

1. **Policy lock** — this document approved  
2. **Copy + gate ordering** — zero entitlement math change  
3. **Emotional Support MFHO guarantee** — highest trust risk  
4. **Ask Amy soft-continue** — second trust risk  
5. **Founder optional quota tune** — only if needed after 2–4  
6. **Final Apple Audit**  

---

## 13. Rollback Strategy

| If | Then |
|---|---|
| Continuity offer confuses parents | Revert offer component; keep MFHO free path |
| Soft-continue abused / cost spike | Cap soft-continue (e.g. 1 graceful close message / day) — Founder-set; do not reintroduce Zap wall |
| Free floor raised too high (conversion drop) | Restore prior free counts **only after** MFHO still guaranteed; never restore distress paywall |
| SubItemGate changes regress modules | Feature-flag gate presentation; rollback flag |
| Copy experiment fails | Restore PREMIUM_VOICE baseline from Pack 5 |

**Rollback principle:** Never roll back to **paywall-before-help** on Emotional Support or hard-day MFHO paths. Roll back conversion experiments, not the Hard-Day Law.

---

## 14. Founder Decisions Required

**LOCKED (Founder Decision Lock — P0-7):**

| # | Decision | Locked choice |
|---|---|---|
| D1 | Approve Hard-Day Law (§8) as binding product policy? | **YES** |
| D2 | Emotional Support: guarantee MFHO by raising free cards vs bypassing SubItemGate for hard-day cards? | **both** |
| D3 | Ask Amy on quota exhaust | **soft-continue message only** |
| D4 | Change any quota integers now, or experience-only first? | **Experience-only** |
| D5 | Infant free AI questions | **Keep + rewrite** |
| D6 | Dual living OFF: force PREMIUM_VOICE on hard-day paths regardless of flag? | **YES** |
| D7 | PTM Season FOMO | **Hard-day only** |
| D8 | Proceed to implementation after D1–D7? | **proceed** |

---

## Final Question — Answer

### Can AmyNest charge for deeper continuity without making a parent feel that help itself is being sold?

# YES

### Exact rule engineering can implement without ambiguity

```text
HARD-DAY FIRST HELP RULE

1. Define Hard-Day Context = parent is on Emotional Support, Speech,
   PTM Prep, Infant Care concern flows, Health Lab concern flows,
   Routine Generation / Today rest, Amy Coach behaviour plan,
   Guidance behaviour topics, or Ask Amy while handling overwhelm /
   crisis / speech / PTM / infant / health / behaviour intents.

2. Define Meaningful First Help Outcome (MFHO) = one delivered unit of
   real help for that intent (Amy answer, grounding steps, free speech
   session, PTM prep/fallback, infant track or first free plan,
   health free orient, nutrition free tonight meal, routine free gen
   or rest/leave, coach/guidance first free unit).

3. IF Hard-Day Context AND MFHO not yet delivered for this intent
   in this session:
     - Do not present paywall, Pricing interstitial, SubItemGate,
       or Upgrade/Unlock/Zap as the path to that help.
     - Deliver MFHO using existing free floors; if floors are
       insufficient for MFHO, treat as product defect — raise
       presentation free access for MFHO (Founder D2/D3), do not
       sell the missing help.

4. AFTER MFHO:
     - Premium may appear only as a Continuity Offer:
         voice = PREMIUM_VOICE
         must state what continues (more / saved / week / memory)
         must offer Keep going free / Not now / leave
         must not use fear, urgency, guilt, FOMO, unlock theatre

5. NEVER monetize distress:
     - No paywall before Emotional Support first answer
     - No "upgrade to unlock free baby questions"
     - No FOMO season pressure on PTM anxiety
     - No guilt copy on overwhelm

6. Premium remains for:
     continuity, support, confidence, time saved, deeper help —
     never for permission to be helped.
```

---

## STOP

- **No React / CSS / RevenueCat / pricing / entitlements / DB / API / Firebase / analytics / routing changes** in this order.  
- This document is the only deliverable.  
- **Wait for Founder approval** (especially §14 D1–D8) before any P0-7 implementation.

*— End of P0-7 Hard-Day Monetization Policy —*
