# Parent Hub Pack 4.6 — Intelligence Policy (LOCKED)

**Status:** POLICY LOCK — NO IMPLEMENTATION · NO REACT · NO CSS · NO DB · NO API  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Pack 4.6 (Intelligence Lock)  

**Approved upstream:** Pack 4.5 Intelligence Study (`PARENT_HUB_PACK4_5_INTELLIGENCE.md`)  
**This document:** Permanent rulebook for Parent Hub room recommendations  

**Frozen:** Welcome · Signup · Child Discovery · Today Home  

---

## Mission

Lock intelligence policy **before** any production code.

Wrong recommendation is worse than no recommendation.  
Silence is Steady. Guessing is SaaS.

---

## Permanent stack (do not invert)

```text
Today Home Law + Entry Law
        ↓
Pack 4.6 Intelligence Policy  →  which room (or none)
        ↓
Pack 4 Living Flow            →  which path + exit to life
```

Intelligence never bypasses Entry Law.  
Intelligence never invents a fifth room.  
Intelligence never redesigns Today Home.

---

# 1. Auto-enter policy (LOCKED)

## 1.1 Confidence model

Confidence is a **deterministic score 0–100** derived only from **allowed signals** (Pack 4.5 allow-list).  
Not ML opacity. Not engagement optimization.

### Band behaviour (LOCKED)

| Confidence | Behaviour | Parent experience |
|---|---|---|
| **≥ 95** | **Direct room open** — enter the suggested room on Hub open | “She already knew.” |
| **70–94** | **Highlight one recommended room door**; keep all four doors visible; **do not auto-enter** | “This one, gently — I still choose.” |
| **< 70** | **Four rooms only** — no highlight, no auto-enter | Companion stays quiet |

### Absolute gates (override score)

| Condition | Force |
|---|---|
| Entry Law forbids Hub (`mayOpenHub=false`) | Treat as **no suggestion** — do not open Hub from intelligence |
| Explicit deep link / Path room target | Confidence **100** for that room — honour explicit intent |
| Parent manually chose another room this session | Do **not** auto-enter against them (see Failure Policy) |

### Scoring principles (LOCKED)

1. Start at 0.  
2. Add only for **allowed** signals that fire.  
3. Cap at 100.  
4. If two rooms both score ≥ 70, apply **Conflict Policy** (do not auto-enter either unless one reaches ≥ 95 **alone** after conflict resolution).  
5. Never raise score with vanity metrics (points, browse, “what’s new”).

### Illustrative weight table (policy — implement later)

| Signal class | Example | Typical points | Notes |
|---|---|---|---|
| Explicit intent | Deep link, Path step with room | → 100 | Absolute |
| Hard life-stage | Infant + Hub tab, no sharper signal | +95 | Care |
| Fresh parent-authored care gap | Sleep/feed log gap they created | +90–100 | Care |
| Clear crisis language already typed/chosen | Prior Emotional open, or Help path completion with repair | +90–100 | Help (see §2) |
| Speech continuity | Speech Coach used recently by parent | +90–95 | Help |
| Development / guidance continuity | Guidance opened recently | +85–95 | Understand |
| Presence continuity | Moments/Presence completed recently | +85–95 | Moments |
| Repeated same-room sessions (short window) | Last 1–3 Hub opens same room | +80–90 | Continuity |
| Soft clock + Discovery focus only | Evening + sleep focus in Discovery | +60–75 | Alone rarely ≥ 95 |
| Weak / single soft signal | Time-of-day alone | +40–55 | Four doors |

**Engineering later may tune weights; bands and gates above are permanent unless Founder re-locks.**

### Wrong-recommendation law (LOCKED)

> If the engine is not ≥ 95% sure of **exactly one** room, it must not auto-enter.  
> Highlight (70–94) is the maximum soft persuasion.  
> Below 70: four doors.

---

# 2. Help state split (LOCKED)

Inside **Help**, Pack 4 already recommends one path.  
Intelligence (when Help is the room) must choose:

**Ask Amy** vs **Emotional Support**

using **only information the parent already shared or completed**.  
**Never infer emotions the parent did not express.**

## 2.1 Ask Amy — recommend when

Any of these **explicit** signals (parent-authored):

| Signal | Why legitimate |
|---|---|
| Parent opened Ask Amy recently and continued questions | Continuity of asking |
| Path / deep link targets Ask Amy / `amy-ai` | Explicit intent |
| Parent’s own words (typed into Ask Amy or saved note fields already in product) contain a **question** about what to say / do / try | They asked |
| Speech Coach continuity without repair/guilt framing | Skill help |
| Default Help recommendation when Help is selected and **no Emotional signal** fires | Pack 4 baseline |

**Label stays:** Pack 4 “Start here” → Ask Amy when this branch wins.

## 2.2 Emotional Support — recommend when

Only when the parent has **already expressed** repair / overwhelm via product actions they chose:

| Signal | Why legitimate |
|---|---|
| Parent opened Emotional Support in this session or recent Hub use | They chose it |
| Parent completed / opened Emotional Support from Path / deep link | Explicit |
| Parent’s own typed text (already stored from Ask Amy or Emotional entry they wrote) contains **self-repair / guilt / overwhelm** language they authored — e.g. they wrote they yelled, feel guilty, can’t cope | Expressed, not inferred from biometrics |
| Parent re-selected Emotional after Ask Amy in the same Help visit | Explicit correction |

**Never** use: mic tone, face, typing speed, “stress detection,” notification scraping, or silent scoring.

## 2.3 Tie / unknown (LOCKED)

| Situation | Winner |
|---|---|
| No Emotional signal | **Ask Amy** |
| Both Ask Amy and Emotional signals fire | Prefer **Emotional Support** if the newest explicit signal is Emotional or repair text; else **Ask Amy** |
| Conflict still ambiguous | **Ask Amy** (safer default for “what do I do”) + Emotional remains visible secondary path |
| Intelligence room ≠ Help | Do not apply this split |

## 2.4 Language (LOCKED)

| Allowed | Forbidden |
|---|---|
| “Start here — ask one calm question.” | “We detected you’re anxious.” |
| “Emotional Support — when feelings are heavy.” | “Your behaviour shows distress.” |
| “Continue where you left off.” | “You’re falling behind on regulation.” |

---

# 3. Failure policy (LOCKED)

Permanent fallback behaviour for every failure mode.

## 3.1 Context conflicts (two+ rooms qualify)

| Rule | Behaviour |
|---|---|
| After conflict resolution, one room ≥ 95 and others < 95 | Auto-enter the ≥ 95 room |
| Two rooms both ≥ 95 | **Do not auto-enter** — highlight the higher; if tied, **four doors** |
| Two rooms in 70–94 | Highlight **one** (higher score); never highlight two |
| Scores close (Δ < 5) in highlight band | **Four doors** — silence beats a coin flip |

**Priority when still tied after scoring (rare):**  
Care (infant body) > Help (crisis) > Understand > Moments  
*Only used for single highlight choice — never to force auto-enter on a tie at ≥ 95.*

## 3.2 Confidence drops mid-session

| Event | Behaviour |
|---|---|
| Parent clears context / switches child | Recompute; if new score < 70 → return to doors if they navigate Hub root |
| Signal expires (continuity window ends) | Do not keep auto-enter; next Hub open recomputes |
| Suggestion was highlight-only | No trap — doors already visible |

## 3.3 Multiple rooms qualify

See §3.1.  
**Never** open a “combo” surface.  
**Never** rotate rooms for engagement.

## 3.4 Today’s NRT already solves the issue (LOCKED)

If `resolveHomeHubBoundary` / Entry Law says action on **Today Home** is enough:

| Behaviour | Required |
|---|---|
| `mayOpenHub` | **false** |
| Room suggestion | **null** |
| Home → Hub invite from intelligence | **Forbidden** |
| Parent may still tab to Hub manually | Yes — then doors or suggestion per score **without** claiming NRT failed |

Intelligence must not undermine Today Home Law.

## 3.5 User manually chooses another room (LOCKED)

| Event | Behaviour |
|---|---|
| Parent taps a different room door | Honour immediately — **manual intent wins** |
| Auto-enter already occurred | Exit Law + All rooms still available (Pack 4) |
| Same session after manual override | Do **not** auto-enter the previous suggestion again |
| Continuity signals | May still **highlight** on next Hub open if score 70–94; auto-enter (≥ 95) only if signals remain decisive **and** parent has not overridden in-session |

**Manual choice is sacred.** Companion proposes; parent disposes.

## 3.6 Universal fallbacks (LOCKED)

| Fallback | When |
|---|---|
| Four room doors | Default whenever unsure |
| Pack 4 path recommendation | Always after a room is entered (unchanged) |
| Pack 4 Exit Law | Always after a path — Back to Home / Continue / Another room |
| Deep link | Always wins over intelligence |
| Flag / kill switch | Restore Pack 4 without intelligence |

---

# 4. Apple Review (LOCKED criteria)

### Would Apple trust this recommendation engine?

**Yes — if implemented as this policy.**  
Rules, thresholds, explicit intent, silence under uncertainty.  
No engagement ML. No dark-pattern auto-trapping.

### Would parents understand why a room appeared?

**Yes — when reason is sayable.**  
Future UI may show one calm line from allowed reason keys only  
(e.g. “Continuing Care for today,” “Help with what you asked”).  
If a reason cannot be shown plainly, the suggestion must not auto-enter.

### Would the recommendation ever feel creepy?

**Not if this policy is obeyed.**  
Creep risk = inferred emotion, silent scoring, or Hub opens that steal Today Home’s job.  
All three are **forbidden** here.

| Apple test | Policy answer |
|---|---|
| Predictable | Deterministic bands |
| Controllable | Manual room always wins; four doors when unsure |
| Private | Allow-listed signals only |
| Deference | Highlight ≠ force below 95 |

---

# 5. Production safety (LOCKED)

| Constraint | Rule |
|---|---|
| Database | **No schema changes** for intelligence v1 |
| API | **No new services** required; client resolver over existing state |
| Analytics | **No rewrites**; additive events only later (`hub_room_suggested` etc.) |
| Auth | Untouched |
| RevenueCat / Firebase | Untouched |
| Today Home | **No Home Hero / NRT changes** for intelligence |
| Welcome / Signup / Discovery | Frozen |
| Implementation vehicle (future) | Pure policy module + optional `VITE_FF_PARENT_HUB_INTEL_V1` under Rooms flag |
| Rollback | Intel flag OFF → Pack 4 doors/flow only |

**This Pack 4.6 deliverable is pure policy only — zero production code.**

---

## Permanent summary (memorize)

1. **≥ 95** → direct room · **70–94** → highlight one door · **< 70** → four doors.  
2. **Wrong guess < silence.**  
3. **Help:** Ask Amy by default; Emotional only on **expressed** repair/overwhelm/choice — never inferred.  
4. **Conflicts / ties / NRT-sufficient → do not auto-enter Hub room.**  
5. **Manual room choice always wins.**  
6. **Entry Law and Today Home always win over companionship theatre.**

---

## Open for implementation (only after Founder APPROVES this lock)

| ID | Work |
|---|---|
| I1 | `resolveHubRoomSuggestion()` implementing these bands + Help split |
| I2 | Wire Hub open behaviours per band behind intel flag |
| I3 | Sayable reason keys (calm copy) |
| I4 | Additive analytics |

**No I1 until this policy document is Founder-APPROVED.**

---

## Commit SHA

`f7ea3438c354b224046310e636970641115edd8e`

---

## STOP

**Intelligence policy locked on paper.**  
No implementation. No React. No CSS. No DB. No API.  
No Pack 5 until Founder approval of this lock (and any separate Pack 5 order).

File: `docs/v2/PARENT_HUB_PACK4_6_INTELLIGENCE_POLICY.md`
