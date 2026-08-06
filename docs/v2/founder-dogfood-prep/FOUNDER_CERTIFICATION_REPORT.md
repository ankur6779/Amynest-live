# AmyNest V2 — Founder Certification Report

**FINAL PRODUCT CERTIFICATION**  
**Date:** 2026-08-04  
**Mode:** Review only — no code, no redesign, no architecture  
**Method:** First-principles walk of live DEV build (`localhost:3000`) with V2 dogfood flags + prior readiness audit  
**Frozen:** Amy OS v1.0 · Experience Platform · Brain · Craft system

---

## Certification verdict

### ⚠ READY FOR INTERNAL DOGFOOD ONLY

| Score | Value |
|-------|------:|
| **Overall Product Score** | **72 / 100** |
| **Emotional Score** | **73 / 100** |
| **Craft Score** | **76 / 100** |
| **Launch Readiness** | Internal dogfood · not Closed Alpha |

**Recommended Launch Stage:** Internal founder + closed trusted parents on the **core path only** (Landing/entry → Front Door → Today → Mission → Coach → Premium → Signup → return).  
Do **not** certify Closed Alpha until guest Ask Amy / For Child stop hard-walling to Sign-in, and Landing does not error in the dogfood path.

---

## Part 1 — Founder Journey (experience only)

Lived walk on DEV with an existing guest memory (child **Aria**, worry **Sleep**).

| Step | What a first-time founder feels | Verdict |
|------|----------------------------------|---------|
| **Landing** | `/landing` showed “Something went wrong / Try Again” in this session. Brand splash (“MEET AMY”) still appears during loads. | Friction / risk |
| **Front Door** | With guest complete, redirects to Today — continuity works. Fresh door (prior sessions) is calm, worry-first, low pressure. | Strong when reached |
| **Today** | Crystal clear: “Today's focus: Sleep”, “Today's step for Aria”, memory line, RIGHT NOW mission, Coach, Quick help. Tab “For Aria”. | Magical |
| **Mission** | Success copy: “That was a real step… Confidence grows from moments like this.” Gentle exits. | Magical |
| **Coach** | “Amy is ready to guide your Sleep journey” + soft Continue / “Not right now”. Sparse mid-canvas but emotionally correct. | Strong |
| **Ask Amy** | Direct `/ask-amy` → **hard Sign-in wall** (“Welcome back / Sign in to your personal parenting coach”). Trust break vs soft sheet story. | Broken for guest |
| **Premium** | Soft gate: “Stay with Aria's Sleep journey” / protect progress — feels like continuity, not a cashier. | Strong |
| **Signup** | Continuity subline: “Save Aria's Sleep journey.” Calm, not salesy. | Strong |
| **Return** | Soft-save plumbing exists; Ask Amy / For Child returns remain at risk vs children/onboarding gate (audit). Core Today/Premium/Coach returns stronger. | Partial |
| **For Child** | Tab promises “For Aria”; direct route → **same hard Sign-in**. Soft teaser UI not reachable unsigned. | Broken for guest |

**Journey truth:** The spine (Today → Mission → Coach → Premium → Signup) feels like care. The wings (Ask Amy, For Child) still feel like software gates.

---

## Part 2 — Parent personas

| Persona | Where they thrive | Where they struggle |
|---------|-------------------|---------------------|
| **Anxious parent** | Today focus + short Mission lowers panic; success copy reduces perfectionism | Hard Sign-in on Quick help spikes anxiety; MEET AMY flash feels like delay |
| **Busy working parent** | 3‑min Mission is honest; hierarchy is scannable | Any bounce to Sign-in = abandon; Landing error = dead end |
| **First-time parent** | Front Door worry step + Amy memory language feel personal | Coach vs Ask Amy naming (“Quick help”) may blur; For Child empty promise |
| **Speech-delayed child’s parent** | If worry/speech path is chosen, Today can feel specific | Brain/Experience packs OFF — depth may feel thin vs expectation of specialist AI |
| **Premium subscriber** | Continuity framing on Premium is right | Must already be past account gate; offline uneven outside Premium |
| **Guest user** | Front Door → Today → Mission → Coach → Premium soft path is the product | Ask Amy + For Child hard walls destroy the guest thesis |

---

## Part 3 — Emotional review

| Dimension | Score /10 | Why |
|-----------|----------:|-----|
| **Trust** | 7.5 | Remembers Aria + Sleep; hard Sign-in on promised help undermines it |
| **Calm** | 8.0 | Dark quiet surfaces, short copy, gentle exits (“Not right now”) |
| **Hope** | 7.0 | Mission success + hope empty language; For Child hollowness when reachable |
| **Confidence** | 7.5 | “Real step” framing; busy parents get a clear RIGHT NOW |
| **Guidance** | 8.0 | Focus → step → coach ladder is obvious on Today |
| **Companionship** | 7.0 | Amy voice present; Ask Amy still legacy/black-box once inside |
| **Continuity** | 6.0 | Excellent on Premium/Signup/Today; broken on guest Ask Amy / For Child |
| **Luxury** | 7.5 | Orb, silence, restraint — occasional MEET AMY / logo chrome feels older |

**Emotional Score: 73 / 100** (mean of dimensions × 10, rounded)

---

## Part 4 — Product review (5‑second answers)

| Question | Can a parent answer in 5s? | Evidence |
|----------|----------------------------|----------|
| What is today's focus? | **Yes** | “Today's focus: Sleep” |
| What should I do next? | **Yes** | RIGHT NOW / Wind-down talk · 3 min |
| Why is Amy different from ChatGPT? | **Partial** | Continuity + child-named steps show it; Ask Amy hard wall + legacy chat don’t prove it |
| Why should I return tomorrow? | **Partial** | Coach “long-term” + completed today imply rhythm; no strong Day‑2 ritual visible in this walk |

---

## Part 5 — Competitive review

| Competitor | AmyNest unique strength | AmyNest weakness / blind spot |
|------------|-------------------------|-------------------------------|
| **ChatGPT** | Child-named daily step + Mission ritual; not a blank chat | Ask Amy still feels like “sign in to chat” for guests |
| **Claude** | Action over essay; short parenting moves | Depth of reasoning/safety theater less visible |
| **Huckleberry** | Broader parenting + coach journey, not only sleep logs | Sleep tracking science/brand trust not matched |
| **Wonder Weeks** | Live “today” agency vs leap calendar | Leap/milestone education content thinner |
| **BabyCenter** | Calm premium craft vs content portal noise | Community/SEO content library not the game |
| **Typical parenting apps** | Emotional exits, continuity Premium, guest Front Door | Feature sprawl still exists under V1; V2 is a renovation skin on a treasury |

**Blind spot:** Parents may think Amy is “ChatGPT for kids” until Mission + memory land. Hard Sign-in on Quick help confirms the wrong mental model.

---

## Part 6 — Launch blockers (UX-material only)

### P0 — Must fix before Closed Alpha

1. Guest `/ask-amy` hard-redirects to Sign-in (live confirmed).  
2. Guest `/for-child` hard-redirects to Sign-in while tab says “For Aria” (live confirmed).  
3. Post-auth return to Ask Amy / For Child can lose the soft-save promise (children/onboarding gate — audit).  
4. `/landing` error state in this dogfood session (“Something went wrong”) — entry must not die.

### P1 — Must fix before Public Beta

1. MEET AMY splash still flashes on V2 navigations (calm Suspense intent not fully felt).  
2. Guest sheet / modal keyboard focus trap incomplete.  
3. For Child preview is title-only shells when reachable — set expectation or fill.  
4. “Why return tomorrow” / D1 ritual still soft.  
5. ChatGPT differentiation not proven at Ask Amy entry for guests.

### P2 — After launch

1. Offline craft uneven outside Premium.  
2. Coach mid-screen sparseness.  
3. Logo / chrome vs V2 orb language inconsistency.  
4. Flag inventory vs runtime (unused mission engine flag, etc.).

### P3 — Future roadmap

1. Brain / Experience packs ON for specialist depth (speech delay, etc.).  
2. Ask Amy beyond legacy black box.  
3. Richer For Child Play / Learn / Care.

---

## Part 7 — Founder decision

### ⚠ READY FOR INTERNAL DOGFOOD ONLY

**Evidence for:**

- Today answers focus + next step in under 5 seconds.  
- Mission success feels like care, not gamification.  
- Premium and Signup speak continuity (“Aria's Sleep journey”).  
- Coach soft dismiss preserves trust.  
- Core guest path is emotionally coherent.

**Evidence against Closed Alpha / Public Beta:**

- Ask Amy and For Child still punish guests with a classic Sign-in wall (live).  
- Landing failed in this certification walk.  
- Brain OFF — specialist promise not fully live.  
- Continuity score dragged by broken wings of the journey.

**Not** ❌ NOT READY — the spine is real enough to learn from parents.  
**Not** ✅ CLOSED ALPHA — broken help/child tabs + entry error are material.  
**Not** 🚀 PUBLIC BETA — too early.

---

## Part 8 — Final Founder Letter

Dear Founder,

You have built something rare: a parenting product that can make a parent feel *seen* within a single screen. On Today, Amy named Aria, named Sleep, and offered a three‑minute wind‑down — not a dashboard, not a chatbot void. Mission success did not congratulate noise; it said a real step is enough. Premium did not shout pricing; it asked to protect a journey. That is the product.

What worries me is honesty at the edges. “Quick help” and “For Aria” still open a Sign‑in wall for guests. That is not a small bug — it is a broken promise. Landing failing to “Something went wrong” is the wrong first emotion. And MEET AMY still flickers between moments of calm, like an older app peeking through a new one.

I am most proud of the restraint. The exits (“Not right now”), the silence between cards, the child‑named continuity on Signup. You did not chase feature theater in this craft wave. You chased *leaving calmer*.

Do not change the spine: worry → Today focus → one Mission → soft Coach → continuity Premium. Do not turn Amy into ChatGPT with a mascot. Do not unfreeze Brain for spectacle before the guest wings are true.

For the next six months, focus on three things only: (1) make every tab a parent can see actually open with care for guests, (2) prove why Amy is not ChatGPT in the first minute of Ask Amy, and (3) earn Day‑2 return with the same quiet certainty Today already has. Then Closed Alpha. Not before.

With respect for what you’ve already made —

**Certification Board**  
(Founder · Product · Design · Growth · QA · Parent Psychology · Red Team)

---

## Top 10 Strengths

1. Today’s focus + RIGHT NOW mission clarity  
2. Child-named memory language (Aria / Sleep)  
3. Mission success emotional framing  
4. Premium continuity (not cashier)  
5. Signup calm continuity subline  
6. Soft dismiss language across Coach / sheets  
7. Guest Front Door → Today continuity when session exists  
8. Visual restraint / orb calm on key moments  
9. Coach as long-term vs Mission as now  
10. Observation tooling ready for founder learning (DEV)

## Top 10 Risks

1. Guest Ask Amy → hard Sign-in  
2. Guest For Child → hard Sign-in vs “For Aria” tab  
3. Landing error in dogfood entry  
4. Soft-save return vs children gate  
5. MEET AMY flash on V2 navigations  
6. ChatGPT confusion at Ask Amy  
7. Hollow For Child when opened  
8. Brain/Experience depth OFF vs specialist expectations  
9. Weak explicit “return tomorrow” ritual  
10. Offline / a11y modal gaps outside Premium

---

## Output summary

| Field | Result |
|-------|--------|
| Founder Certification Report | This document |
| Overall Product Score | **72 / 100** |
| Emotional Score | **73 / 100** |
| Craft Score | **76 / 100** |
| Launch Readiness | **Internal dogfood only** |
| Recommended Launch Stage | **⚠ Internal dogfood** (core path) |
| Closed Alpha | **NO** until P0 cleared |
| Public Beta | **NO** |

**STOP.** No implementation. Awaiting Founder decision.
