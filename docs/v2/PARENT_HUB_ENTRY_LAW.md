# Parent Hub — Entry Law

**Status:** STUDY ONLY — NO IMPLEMENTATION · NO UI · NO BLUEPRINT  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Entry Law  

**Approved upstream:**  
Rooms (Help · Understand · Care · Moments) · Journey map · Room validation ·  
Today Home Law · Home ↔ Hub Boundary Law  

**Frozen:** Welcome · Signup · Child Discovery · Today Home  

---

## Mission

Define exactly when AmyNest may send a parent into Parent Hub —  
and when it **absolutely must not**.

---

## Governing laws (binding)

### Today Home Law

> If the parent has to decide what to do next, Today Home has failed.  
> If Today Home has to decide what to do next, AmyNest has succeeded.

### Home ↔ Hub Boundary

> If the answer can be completed today, it belongs to Today Home.  
> If the answer changes how the parent thinks, it belongs to Parent Hub.  
> Never confuse action with understanding.

### Entry Law (this document)

> **Today Home always wins when action is enough.**  
> **Parent Hub opens only when understanding (or care/help/presence beyond one action) is needed.**

Code DNA (boundary): `resolveHomeHubBoundary()` · `TODAY_HOME_HUB_BOUNDARY_LAW`

---

## Immutable routing rules

| # | Rule |
|---|---|
| R1 | If the need is **one completable action today** → **Today Home only** |
| R2 | If the need is **Help / Understand / Care / Moments** beyond that action → **Parent Hub → that room** |
| R3 | Parent Hub never opens as a default “explore” after Home |
| R4 | Tab tap to Parent Hub is allowed — but Hub must open on **intention**, not mall |
| R5 | Deep links may open a room — never a feature catalogue |
| R6 | Activation / Path may surface Hub only when the path step is understanding/care/presence — not when it is “generate routine” |
| R7 | Gamification, browsing, boredom, and “see what’s new” are **forbidden entry reasons** |
| R8 | When ambiguous between action and understanding → **split**: action on Home first; Hub only if still needed |
| R9 | Infant daily body loops may open **Care** directly — still not a mall |
| R10 | “I’m just browsing” → **do not invite Hub**; stay on Home or leave the product calm |

---

## 1. Parent state → destination matrix

| Parent state (what they feel / say) | Correct destination | Wrong destination | Reason | Product impact |
|---|---|---|---|---|
| “I don’t know what to do today.” | **Today Home** | Parent Hub · Help | Action gap — Home must decide NRT | Daily opens · routine start |
| “What’s the next step right now?” | **Today Home** | Hub rooms | Completable today | Completion · retention |
| “Begin / continue today’s plan.” | **Today Home → Begin** | Generate tile inside Hub | Home owns Begin | Conversion · trust |
| “My child keeps refusing bedtime.” | **Hub → Help** | Home as article dump · Learning Zone | Stuck beyond one step — need help thinking/acting through it | Trust · crisis retention |
| “What do I say when they yell?” | **Hub → Help** (Ask Amy) | Moments · Care | Language/strategy help | Trust |
| “Speech / talking worry.” | **Hub → Help** (Speech) | Moments (Talking Amy as substitute) | Clinical/skill anxiety ≠ play | Segment retention |
| “PTM tomorrow — I’m unprepared.” | **Hub → Help** (PTM) | Understand tip mall · Home | Seasonal hard moment | Confidence · seasonal value |
| “I think my child is changing.” | **Hub → Understand** | Today Home NRT only | Thinking shift — meaning | Trust · identity |
| “Why do they always do this?” | **Hub → Understand** | Help (unless crisis) | Pattern clarity | Understanding habit |
| “Who is my child becoming?” / Birth Sky mood | **Hub → Understand** | Care · Moments | Meaning door | Brand · soft sub |
| “My baby isn’t sleeping.” | **Hub → Care** | Moments · Gaming | Body/rhythm care | Infant daily opens |
| “What do I feed / solids / meals?” | **Hub → Care** | Moments recipes-as-fun | Care spine | Practical retention |
| “Vaccine / sick / doctor.” | **Hub → Care** | Help articles first | Care coordination | Trust |
| “We have ten free minutes.” | **Hub → Moments** | Learning Zone · Gaming | Presence, not curriculum | Warm retention · referral stories |
| “Rainy afternoon — need something together.” | **Hub → Moments** | Understand tip shelf | One presence offer | Calm companionship |
| “I yelled — I feel guilty.” | **Hub → Help** (Steady tone) then optional Home | Content library · browse | Repair / regulation first | Trust · humanity |
| “I’m overwhelmed as a person.” | **Hub → Help** (Steady tone) | Command Center · scores | Parent held — not judged | Trust |
| “Show me everything / what’s new.” | **Stay Home or idle** | Parent Hub mall | Forbidden browse entry | Protects calm identity |
| “I’m just browsing.” | **Do not open Hub** | Any Hub room as destination | Boredom ≠ intention | Anti-mall · anti-churn-from-overwhelm |
| “Earn points / play games.” | **Not Parent Hub** | Hub Gaming | Gamification forbidden | Philosophy integrity |
| “Family dashboard / scores.” | **Not Parent Hub** | Command Center | Dashboard forbidden | Anti-enterprise |
| “What’s tomorrow’s forecast?” | **Not a Hub entry** (optional later elsewhere) | Forecast tile as peer room | Not an intention room | Focus |
| Post-Discovery first open | **Today Home** first | Hub mall · Generate-as-Hub | Film: Home before browse | Day-1 retention |
| After completing Home Begin | **Life / routine** — Hub only if they still need Help/Care/… | Auto-dump into Hub | Don’t punish success with mall | Conversion purity |

---

## 2. Anti-patterns (reject these journeys)

| Anti-pattern | How it sneaks in | Reject by |
|---|---|---|
| **Feature mall** | Hub opens to eight groups / chips | Intention-only entry; no catalogue home |
| **Content library** | Tips/articles as the Hub landing | Guidance lives inside Understand after intention |
| **Boredom destination** | “Explore What’s Next” / empty Sunday browse | R10 — do not invite Hub for browsing |
| **Exploration page** | Equal tiles competing for curiosity | Four rooms max; Steady tone; no gamified discovery |
| **Second Today** | Hub Path / Generate as rival NRT | Boundary law — action stays on Home |
| **Dopamine lobby** | Points for opening sections | Gamification permanently forbidden |
| **Dashboard lobby** | Command Center as entry | Remove from Hub IA |
| **Default after everything** | Any success → “check Parent Hub” | Exit to life/Home; Hub is pull not push |

---

## 3. Product impact summary

| When Entry Law is obeyed | When violated |
|---|---|
| Home stays the heart (action) | Hub steals daily opens from NRT |
| Hub earns trust in hard/tender hours | Hub becomes boredom mall → churn + overwhelm |
| Subscription feels like companionship | Subscription feels like feature pack |
| Rooms match human verbs | Parents think in module names again |

---

## 4. Founder recommendation

### APPROVE Entry Law as manufacturing gate before any Parent Hub blueprint

1. Ship **no** Hub entry that fails R1–R10.  
2. Auto and manual entries must name an **intention** (Help / Understand / Care / Moments) or stay on Home.  
3. Tab bar may open Hub — first frame must still be intention or age-default Care (infants), never mall.  
4. Notifications / Path / deep links: only when Boundary Law says Hub.  
5. “I’m browsing” is a **successful non-entry**.

### Blueprint (later — not now) must include

- Entry decision table (this doc) as test fixtures  
- `resolveHomeHubBoundary()` checks for any new Hub surface  
- Explicit non-entries for browse / games / dashboard / forecast  

### Do not

- Implement UI  
- Open blueprint yet  
- Add Steady as entry destination  
- Auto-open Hub after Home view  

---

## Final question

### Can AmyNest automatically know when NOT to open Parent Hub?

**YES.**

**Why:**

1. **Boundary Law is machine-checkable** — if `answerCanBeCompletedToday` and not `answerChangesHowParentThinks` → Home only (`resolveHomeHubBoundary` → `today-home`).  
2. **Browse / boredom / games / dashboard** are explicit forbidden entry reasons — block by policy, not ML.  
3. **Home already owns NRT** — if continuity/routine next-item/decide-next can name Begin, Hub must not interrupt.  
4. **Ambiguous dual claims** → `ambiguous` → force split (action Home first) — automatic non-open of Hub until understanding remains.

**What does not require magic:**

- Detecting “I’m browsing” from a tab tap: treat bare Hub open as **intention chooser**, not mall — if they dismiss without choosing, that is correct non-commitment.  
- Pushing Hub proactively: default **OFF** unless trigger matches Help/Care/Understand/Moments with high confidence (e.g. infant sleep crisis → Care; PTM calendar → Help).

**Automatic NO to Hub when:**

- NRT + Begin is sufficient  
- User is mid-routine execution  
- Entry reason ∈ {browse, points, dashboard, forecast-as-peer, “what’s new”}  
- Boundary says `today-home` or `neither`

---

## STOP

**Entry Law study complete. No blueprint. No implementation.**

File: `docs/v2/PARENT_HUB_ENTRY_LAW.md`

Await Founder approval before Parent Hub blueprint.
