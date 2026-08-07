# Parent Hub Pack 3.5 — Experience Refinement Study

**Status:** STUDY ONLY — NO IMPLEMENTATION · NO REACT · NO CSS · NO TYPESCRIPT · NO PACK 4  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Pack 3.5 (Experience Refinement)  

**Approved upstream:** Pack 1 · Pack 2 · Pack 3  
**Surface studied:** Rooms V1 destinations (`destinations.ts` · `parent-hub-rooms-shell.tsx`)  
**Frozen:** Welcome · Signup · Child Discovery · Today Home  

---

## Mission

Stress-test Pack 3 **before** Pack 4 flow manufacturing.  
Find every remaining experience gap while change cost is still low.

This document does **not** rename, merge further in code, or redesign.  
It diagnoses.

---

## Previous vs Current

| Layer | Before Pack 3 | Current (Pack 3 shipped) |
|---|---|---|
| Architecture | Eight-group mall | Four rooms |
| Emotion | Accordion / admin | Living-room photography + feeling |
| Destinations | Peer product tiles / peer list rows | Constitution merges + quiet paths |
| Intention | Implicit | One question per room |
| Remaining risk | Catalog competition | **Hierarchy · naming · density · photo↔list bond · soft conceptual overlaps** |

Pack 3 solved **belonging**.  
Pack 3.5 asks whether belonging is yet **inevitable**.

---

## 1. Recommendation hierarchy

**Law tested:** Every room should have **ONE** obvious recommended destination. Two peers of equal weight = competition = decision fatigue.

| Room | Current first-in-list | Is it clearly THE recommendation? | Competing peer(s) | Verdict |
|---|---|---|---|---|
| **Help** | Ask Amy | Strong default for “stuck / what do I say” | **Emotional Support** also answers “help me right now” with equal crisis gravity | **Competes** — Ask Amy vs Emotional can split a panicking parent |
| **Understand** | Guidance | Yes for daily meaning | Birth Sky + Curiosity feel like equal “understand my child” doors; Grow sits as peer though purpose differs | **Partial** — Guidance leads list but not visually elevated; Birth Sky/Curiosity compete for “meaning” |
| **Care** | Infant Care | **Yes** for 0–24m (gravity opens Care) | For non-infant: Nutrition vs Health Lab are near-equal | **OK infant · Weak older** — no single Care recommendation for 2+ |
| **Moments** | Presence | Purpose says “ten minutes together” — correct | Story · Make · Talking Amy · Discovery Worlds · Event Prep = **five peers** after Presence | **Competes heavily** — Moments still reads as a small catalog |

### Would two recommendations compete? If yes, why?

**YES — in Help and Moments (and Understand’s meaning cluster).**

1. **Help:** Crisis parents need one door. Ask Amy and Emotional Support both claim the same emotional real estate; Speech/PTM are situational and should not be first, but the top two still force a compare.  
2. **Moments:** Presence is correct, but five additional root paths dilute “one beautiful moment.” Talking Amy / Discovery Worlds especially re-open product browsing.  
3. **Understand:** Guidance is correct, but Birth Sky’s brand weight can steal the eye from Guidance when both are equal rows.  
4. **Care (2+):** Without Infant Care, Nutrition and Health Lab are twin “care for the body” products with no recommended primacy.

**Hierarchy gap (High):** No visual/structural “recommended” treatment — list order alone is not enough for exhausted cognition.

---

## 2. Naming audit (5-second tired-parent test)

**Rule:** Do not rename in this study — only highlight.

### Help

| Name | ≤5s clear? | Note |
|---|---|---|
| Ask Amy | **Yes** | Brand + action |
| Emotional Support | **Mostly** | Slightly clinical; purpose line saves it |
| Speech Coach | **Yes** | Clear if speech is the worry |
| **PTM Prep** | **No** | Acronym opaque outside school-meeting culture |
| Life Skills | **Weak** | Sounds like curriculum warehouse, not “help me right now” |

### Understand

| Name | ≤5s clear? | Note |
|---|---|---|
| Guidance | **Yes** | Calm and clear |
| **Birth Sky** | **No** | Poetic brand; tired parent may not know what it *does* |
| Curiosity | **Weak** | Soft; purpose helps (“how your child thinks”) |
| **Grow** | **Weak** | Grow *what*? Skills? Height? Ambiguous without purpose |

### Care

| Name | ≤5s clear? | Note |
|---|---|---|
| Infant Care | **Yes** (infant cohort) | For older children, path may be absent — OK |
| Nutrition | **Yes** | |
| **Health Lab** | **Weak** | Product / SaaS residue; “lab” ≠ care language |

### Moments

| Name | ≤5s clear? | Note |
|---|---|---|
| Presence | **Weak alone** | Abstract; purpose “Ten minutes together” is the real name |
| Story | **Yes** | |
| Make | **Mostly** | Clear with purpose |
| Talking Amy | **Yes** | |
| **Discovery Worlds** | **Weak** | App-store / game lobby energy |
| Event Prep | **Mostly** | Occasional; fine if demoted |

**Unclear names to revisit later (do not rename in 3.5):**  
PTM Prep · Birth Sky · Grow · Health Lab · Presence (title vs purpose) · Discovery Worlds · Life Skills.

---

## 3. Photography continuity

**Question:** Does the hero feel connected to the destination list — or like two stacked components?

### Current structure (entered room)

```
All rooms
ROOM EYEBROW
[ Cinematic photograph ]
Feeling sentence
Intention question
"Quiet paths" label
Row
Row
Row
…
```

### Diagnosis

| Signal | Continuity |
|---|---|
| Same FE asset in ambient + hero | **Material continuity** with Welcome house — good |
| Feeling under photo | Emotional bond — good |
| Intention + “Quiet paths” + glass rows | **Layout seam** — list reads as a second UI block under a poster |
| Rows do not sit *in* the photographic space | Destinations feel attached below, not living inside the room |
| Opened module quiet slot | Third stack when expanded — can reintroduce product chrome |

**Verdict:** Photography and list still risk feeling like **two stacked components** — a beautiful hero *then* a settings list — rather than one continuous room. Ambient wash helps emotionally; composition does not yet make paths feel inevitable inside the photograph’s lower field.

**Not a Pack 4 blocker by itself** — but a High craft gap before claiming “living room complete.”

---

## 4. Density audit

| Room | Root destinations | Nested max (if all visible) | Cognitive load |
|---|---|---|---|
| Help | **5** | — | Medium — at soft ceiling |
| Understand | **4** | Guidance 3 + Grow **6** | Medium root · **High** if Grow fully expanded |
| Care | **3** | — | **Low / ideal** |
| Moments | **6** | Presence 3 + Make 3 | **High** at root |

### When does cognitive load begin?

| Root count | Parent experience |
|---|---|
| 1–3 | Calm · inevitable |
| **4** | Acceptable if one is clearly recommended |
| **5** | Soft ceiling — comparison starts |
| **6+** | Catalog relapse — especially Moments |

### Nested thresholds

| Nested members shown | Guidance |
|---|---|
| ≤3 | Comfortable (Guidance, Presence, Make) |
| 4–5 | Soft strain |
| **6 (Grow)** | High — six skill products return under one door |

### Recommendations (study only)

1. Soft max **4 root destinations** per room; Moments should aim ≤4 before Pack 4.  
2. Elevate **one recommended** so effective choice set feels like 1+rest.  
3. Grow nested: consider progressive disclosure (age-filter or “show more”) later — not Pack 4 scope unless Founder orders.  
4. Care remains the density gold standard.

---

## 5. Duplication audit

### Canonical room ownership (tile → one room)

Every Pack 3 underlying tile maps to **exactly one** destination id and **exactly one** room via `TILE_TO_ROOM` + `ROOM_DESTINATIONS`.  

**No hard IA overlap** (same tile in two rooms): **PASS.**

| Tile | Canonical room | Destination door |
|---|---|---|
| amy-ai | Help | Ask Amy |
| emotional | Help | Emotional Support |
| speech-coach | Help | Speech Coach |
| ptm-prep | Help | PTM Prep |
| life-skills | Help | Life Skills |
| daily-tips · new-parent-tips · articles | Understand | Guidance |
| birth-sky | Understand | Birth Sky |
| answer-to-kids-how | Understand | Curiosity |
| smart-math-tricks · abacus · phonics · spelling-mastery · smart-study · olympiad | Understand | Grow |
| infant-hub | Care | Infant Care |
| nutrition | Care | Nutrition |
| health-lab | Care | Health Lab |
| activities · origami-studio · art-craft | Moments | Presence |
| story-hub | Moments | Story |
| worksheets · coloring-books · fun-sheets | Moments | Make |
| talking-amy | Moments | Talking Amy |
| discovery-worlds | Moments | Discovery Worlds |
| event-prep | Moments | Event Prep |

Removed from Hub (not duplicated): generate-routine · tomorrow-forecast · command-center · gaming-rewards · amy-quick-tutor.

### Soft conceptual overlaps (not dual-homed, but compete for meaning)

| Cluster | Why it hurts |
|---|---|
| Ask Amy ↔ Emotional Support | Both “help me now” |
| Guidance ↔ Curiosity ↔ Birth Sky | Three “understand my child” flavours |
| Presence ↔ Story ↔ Talking Amy ↔ Discovery Worlds | Four “be with child” flavours |
| Infant feeding (inside Infant Care) ↔ Nutrition | Body-care boundary — Constitution-correct, still parent-confusable |
| Life Skills ↔ Grow | “Teach / skills” shadow across Help vs Understand |

**Hard duplication: none. Soft competition: several — see hierarchy.**

---

## Remaining experience gaps

1. No single **recommended** destination treatment per room.  
2. Moments root density (6).  
3. Help top-two competition (Ask Amy vs Emotional).  
4. Naming opacity: PTM · Birth Sky · Grow · Health Lab · Discovery Worlds · Presence-as-title.  
5. Hero ↔ list still stacked, not one continuous room composition.  
6. Grow expands back into six product names.  
7. Opened legacy module chrome can reintroduce storefront energy inside the quiet slot.  
8. Non-infant Care lacks a clear recommended path.  
9. Pack 4 Entry/Exit Law not yet manufactured (known — out of 3.5 scope but blocks “complete flow”).  
10. Authenticated live Hub QA still thin in this environment.

---

## Risk ranking

| Risk | Level | Why |
|---|---|---|
| Moments catalog relapse (6 roots) | **High** | Undermines “one beautiful moment” |
| No recommended destination hierarchy | **High** | Pack 3 belonging without inevitability |
| Help: Ask Amy vs Emotional competition | **High** | Crisis path must be singular |
| Hero / list stacked composition | **Medium** | Emotion leaks at the seam |
| Grow nested ×6 product names | **Medium** | Merge door reopens mall underneath |
| Unclear names (PTM, Birth Sky, Grow, Health Lab, Discovery Worlds) | **Medium** | 5-second test fails for subset |
| Soft overlaps (Presence/Story/Talking Amy/Discovery) | **Medium** | Conceptual browse |
| Legacy module chrome in quiet slot | **Medium** | Storefront returns after path open |
| Non-infant Care recommendation gap | **Low–Medium** | Cohort-specific |
| Hard tile dual-homing | **Low** | None found |
| DB/API/regression from Pack 3 IA | **Low** | Reuse-only architecture |

---

## Quick wins (low cost · still pre–Pack 4 or early Pack 4-adjacent)

*Study recommendations only — not implementation orders.*

1. Mark **one recommended path** per room (order + quiet “For now” cue) — Ask Amy *or* Emotional by state; Guidance; Infant Care / Nutrition by age; Presence.  
2. Demote Moments roots: keep Presence · Story · Make as primary; subordinate Talking Amy · Discovery Worlds · Event Prep (nest under Presence or secondary).  
3. In Help, avoid equal billing of Ask Amy + Emotional — route by state (shame/fear → Emotional; question → Ask Amy) *when Pack 4 Entry Law lands*.  
4. Show purpose line as primary text where title is weak (Presence, Grow) without renaming yet.  
5. Composition: pull destination list into the hero’s lower visual field (craft) so paths feel inside the room.

---

## Must-fix before Pack 4

Pack 4 is **Transitions** (Entry · Exit · deep links · Home handoff).  
Before opening Pack 4, Founder should lock:

1. **ONE recommended destination rule per room** (even if visual elevation is tiny).  
2. **Moments root ceiling ≤4** (which three/four stay primary).  
3. **Help crisis primacy** — Ask Amy vs Emotional: which wins when both apply, or state-split rule.  
4. Confirm soft overlaps are **accepted debt** vs must-merge further (Talking Amy / Discovery → Presence?).  

Naming renames are **not** required before Pack 4 if purpose lines remain visible — but PTM / Birth Sky / Health Lab remain parent-risk.

---

## Nice-to-have after Pack 8

- Full rename pass (PTM → school-meeting language; Health Lab → care language; Birth Sky subtitle-first; Grow → Skills / Growing).  
- Grow progressive disclosure by age.  
- Photographic composition where list lives inside the hero (not below).  
- Quiet-slot chrome stripping so opened modules never look like Hub storefront cards.  
- Authenticated device QA gallery across cohorts.

---

## Mandatory reviews

### Apple Human Interface Review

| Criterion | Verdict |
|---|---|
| Clarity | Pass at room level; **fail subset of names** |
| Deference | Room hero still primary; list weight OK; **no recommended elevation** |
| Depth | Merge nesting good; Grow depth too product-like |
| Consistency | FE materials continuous; **hero↔list seam** |
| Cognitive load | Care excellent; Moments overloaded |

**Apple would not** present six equal moment paths after a cinematic hero without a clear primary.

### Founder Review

| Question | Answer |
|---|---|
| Does Pack 3 belong? | **Yes** — destinations are of the room |
| Is it inevitable yet? | **Not fully** — hierarchy + Moments density |
| Ready for Pack 4 flows? | **Conditionally** — after must-fix locks |

### Parent Review

Tired parent at 11pm:  
- Care (infant): finds path quickly.  
- Help: may freeze between Ask Amy and Emotional Support.  
- Moments: may browse again.  
- Names PTM / Birth Sky / Health Lab may bounce.

### Information Architecture Review

| Check | Result |
|---|---|
| Four rooms only | Pass |
| One tile → one room | Pass |
| Constitution merges present | Pass |
| Soft conceptual duplicates | Fail → Medium risk |
| Recommended primary | Missing |

### Cognitive Load Review

| Room | Load |
|---|---|
| Care | Green |
| Understand | Amber (Grow expand) |
| Help | Amber (5 + top-two compete) |
| Moments | **Red** (6 roots) |

### Production Safety Review

| Check | Result |
|---|---|
| Study-only / no code in 3.5 | Required |
| Pack 3 reuse architecture | Safe |
| Kill switch | Intact |
| Freezes | Untouched |
| Pack 4 must not invent DB/API for hierarchy | Prefer presentation + Entry Law state |

---

## Final readiness score

| Dimension | Score (1–10) |
|---|---|
| Room architecture | 9 |
| Emotional photography | 8 |
| Destination belonging (merges) | 8 |
| Recommendation hierarchy | **4** |
| Naming clarity | **5** |
| Density control | **5** (Moments pulls down) |
| Photo↔list continuity | **5** |
| Duplication (hard) | 9 |
| Duplication (soft/conceptual) | 5 |
| Production safety | 9 |

### Overall Pack 3 → Pack 4 readiness: **6.5 / 10**

**Interpretation:** Safe to discuss Pack 4 **after** Founder locks the four must-fix items.  
Not yet “experience complete.” Hierarchy and Moments density are the cheapest fixes still available before flow manufacturing hardens habits.

---

## Commit SHA

`0830fb2ea42d820cf4ac9e5a7ed992c90708d785`  
Pack 3 feature baseline: `b801b396`.

---

## STOP

**Pack 3.5 refinement study complete.**  
No React. No CSS. No TypeScript. No implementation.

**Do NOT begin Pack 4 until Founder approval** of this study’s must-fix locks (and any Founder overrides).

File: `docs/v2/PARENT_HUB_PACK3_5_REFINEMENT.md`
