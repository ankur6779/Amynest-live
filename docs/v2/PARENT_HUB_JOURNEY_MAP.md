# Parent Hub — Journey Map (Real Parent Behaviour)

**Status:** STUDY ONLY — NO IMPLEMENTATION · NO UI · NO DB CHANGES  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Journey Mapping  
**Rooms (approved):** Help · Understand · Care · Moments  

**Locks:** Steady = tone everywhere · Birth Sky ∈ Understand · Gamification forbidden · Today Home owns NRT  

**Depends on:**  
`PARENT_HUB_PRODUCT_TRUTH_AUDIT.md` · `PARENT_HUB_INFORMATION_ARCHITECTURE.md` · `PARENT_HUB_ROOM_VALIDATION.md`

---

## Governing shift

Stop thinking rooms-as-folders.

Think:

> Something happened in real life → parent opens AmyNest → one intention → one exit that continues life.

Never dead ends. Never module hunting.

### Today Home ↔ Parent Hub Boundary (Founder — Absolute)

> If the answer can be completed today, it belongs to Today Home.  
> If the answer changes how the parent thinks, it belongs to Parent Hub.  
> Never confuse action with understanding.

| Surface | Owns |
|---|---|
| **Today Home** | Action — completable today |
| **Parent Hub** | Understanding — changes how the parent thinks |

Code DNA: `TODAY_HOME_HUB_BOUNDARY_LAW` · `resolveHomeHubBoundary()`

---

## 1. Real-life triggers

### Help — “I need help.”

| Real life | Emotional charge |
|---|---|
| Child not listening / meltdown mid-errand | Urgent, ashamed |
| Bedtime war escalating | Desperate |
| Speech delay worry after a comment from school | Anxious |
| “What do I say right now?” | Stuck |
| Partner conflict about parenting | Fragile |
| PTM tomorrow and I’m unprepared | Dread |
| Scrolling guilt after yelling | Seeking repair |
| Sudden “is this normal?” panic at 11pm | Alone |

### Understand — “I want to understand.”

| Real life | Emotional charge |
|---|---|
| Quiet evening after a confusing day | Reflective |
| Milestone comparison with another parent | Uncertain |
| Want to know who my child is becoming | Curious |
| Birth / identity / meaning mood | Tender |
| “Why do they always…” pattern noticing | Seeking clarity |
| After Discovery / early days — deepen the picture | Open |
| Rainy Sunday, no crisis — just wondering | Soft |

### Care — “I need to care for them.”

| Real life | Emotional charge |
|---|---|
| Baby won’t sleep / wake window chaos | Exhausted |
| Feeding / solids / “what do I feed” | Practical stress |
| Child sick / vaccine week / doctor visit | Responsible fear |
| Growth check / weight worry | Vigilant |
| Diaper / cry / burp loop (infant day) | Operational |
| Meal planning for the week | Load-bearing |
| Co-parent handoff of care tasks | Coordinating |

### Moments — “I want a moment with them.”

| Real life | Emotional charge |
|---|---|
| Rainy afternoon, energy low | Want connection |
| Weekend morning, nowhere to be | Open |
| After conflict — repair through presence | Soft regret |
| “Need an activity” (not a curriculum) | Mild pressure |
| Travel / waiting room / low-structure time | Seeking ease |
| Story before bed (bonding, not coaching) | Warm |
| School event coming — prepare a shared moment | Anticipatory |

---

## 2. Entry journey

### Global entry (all rooms)

```
Life event
  ↓
Open AmyNest
  ↓
Today Home answers: next right thing?  (if that is enough → Begin → done)
  ↓
If life needs more than the next step → Parent Hub
  ↓
Choose intention by feeling (not by product name)
  ↓
One room
```

**Rule:** Hub entry never asks the parent to browse eight groups.  
Four intentions max — named in human language.

### Per-room entry

| Room | Entry phrase (product language) | Wrong entry |
|---|---|---|
| Help | “I need help” | “Speech Coach” / “Articles” |
| Understand | “Help me understand” | “Learning Zone” / “Astro” |
| Care | “Care for them” | “Health Zone” / “Infant module” |
| Moments | “A moment together” | “Creativity” / “Gaming” |

### Age emphasis (not separate apps)

| Cohort | Natural gravity |
|---|---|
| 0–24 months | **Care** first; Help/Understand close; Moments soft |
| 2–6 years | Moments + Help common; Care = food/health; Understand growing |
| 6+ | Understand + Help (school/PTM); Moments selective; Care thinner |

---

## 3. First thing seen

Once inside the room — **first paint**:

| Room | FIRST (≤3 seconds) | NEVER first |
|---|---|---|
| **Help** | One calm question: “What’s hard right now?” → or one clear door (Ask Amy / Speech / PTM if seasonal) | Feature grid, six learning tiles, points, Command Center |
| **Understand** | One Guidance card for this child today + optional Birth Sky / quiet growth meaning | Tip trilogy, XP, leaderboards, forecast anxiety |
| **Care** | The next care act for this child’s body/rhythm (sleep window, feed, meal, health) | Entertainment, stories mall, games |
| **Moments** | One presence offer: “Ten minutes with {name}” (story / make / play) | Curriculum warehouse, printables catalogue, rewards |

### Steady tone (every room’s first frame)

- No scores  
- No streaks  
- No “unlock”  
- No guilt  
- Soft materials consistent with Home sanctuary  

---

## 4. Last thing remembered

The ONE thing they leave with:

| Room | Leave holding |
|---|---|
| **Help** | One next action or one answered fear (“I know what to try”) |
| **Understand** | One clearer sentence about my child (“Now I see why…”) |
| **Care** | Care act done or scheduled (“Feeding / sleep / meal is handled”) |
| **Moments** | A shared moment completed or started (“We did this together”) |

If they leave with only “I browsed,” the room failed.

---

## 5. Exit path

**Never dead ends.** Every room offers a living exit:

| From | Primary exit | Secondary | Avoid |
|---|---|---|---|
| **Help** | Back to **Today Home** with NRT intact (or Begin if Help named a step) | Stay in Ask Amy thread if still talking | Dump into Learning mall |
| **Understand** | **Today Home** (understanding should sharpen tomorrow’s NRT) | Moments if “I want to try something with them now” | Paywall wall as the memory |
| **Care** | **Today Home** or continue Care loop (infant day) | Routine detail if care is a timed step | Gaming |
| **Moments** | **Today Home** (life continues) or gentle Done | Help if the moment revealed a stuck | Endless “related modules” |

### Exit grammar (product)

```
[Done for now] → Today Home
[Begin this]   → Routine / NRT execution (Home-owned)
[Ask more]     → Ask Amy (Help) — only from Help/Understand
[Another need] → Room switch by intention, not by tile grid
```

Back stack: respects entry (tab → Hub rooms → prior). Smart-back to Home when Hub was opened from Home.

---

## 6. Frequency

Engineering priority follows frequency × stakes.

| Room | Frequency | Stakes | Eng priority |
|---|---|---|---|
| **Care** (0–24m) | **Daily** (often many times) | High | P0 for infant cohort |
| **Help** | **Weekly** spikes; daily in hard seasons | Very high when hung | P0 |
| **Moments** | **Weekly** (weekends / low structure) | Medium (trust + love) | P1 |
| **Understand** | **Weekly → Monthly**; Birth Sky rarer | Medium (identity) | P1 |
| **PTM** (inside Help) | **Seasonal** | High in season | P1 seasonal |
| **Event Prep** (Moments) | **Seasonal / rare** | Medium | P2 |
| **Health Lab / deep Nutrition** | **Weekly → Monthly** | Medium | P2 as destinations |
| **Learning destinations** | **Weekly** for school age | Medium | P2 behind one Understand door |

---

## 7. Product value

| Room | Trust | Retention | Subscription | Referral | Parent confidence |
|---|---|---|---|---|---|
| **Help** | **Highest** — AmyNest shows up in crisis | Returns when life hurts | Soft → strong if help works | “They helped when I panicked” | Immediate |
| **Understand** | High — feels known | Habit of reflection | Birth Sky / guidance depth | “Finally gets my child” | Steady growth |
| **Care** | High for infants | **Daily opens** (infant) | Strong infant value | New-parent word of mouth | Competence in care |
| **Moments** | Warm trust | Soft retention (joy) | Weak direct; strong love brand | “We actually play” stories | “I’m a present parent” |

**Hub vs Home:** Home drives daily NRT completion. Hub drives trust in the hard and tender hours. Together they make subscription feel like companionship, not a feature pack.

---

## 8. Data review

Reuse before create. **Zero unnecessary tables.**

| Room | Already enough? | Reuse | Missing? | New tables? |
|---|---|---|---|---|
| **Help** | Yes for Ask Amy / Speech / PTM content | Assistant APIs, speech_*, PTM content, emotional prompts | Unified “what’s hard” intent signal (can be client UX only) | **No** |
| **Understand** | Yes for tips/articles/milestones/Birth Sky | Content packs, infant cues, `birth_sky`, quiet `learning_progress` | Single Guidance assembler (logic, not schema) | **No** |
| **Care** | **Yes** — strongest data | `infant_*`, nutrition_*, health-lab | Age-aware Care spine selector (app logic) | **No** |
| **Moments** | Yes for stories/activities/print | Existing media + activity components | One “presence offer” picker (logic) | **No** |
| Shell / Path | Yes | `parent_hub_journey`, children | Path ↔ Home NRT alignment (logic) | **No** |

**Do not create:** room_visits warehouse, points tables, new tip tables, journey_v2.  
**May stop writing:** Hub → gaming earn on section open.

---

## 9. Remove review

No remaining journey → leave Parent Hub IA:

| Item | Why no journey |
|---|---|
| Gaming Hub / Hub points | Forbidden; no human trigger worth keeping |
| Command Center / Family pulse | No “I need a dashboard” life moment in AmyNest |
| Tomorrow’s Forecast | Rare curiosity ≠ room journey |
| Generate Routine as Hub peer | Journey lives on **Today Home** |
| Quick-action chip wall | Engineering convenience, not behaviour |
| Tip trilogy as separate journeys | One Understand Guidance journey |
| Six Learning heroes | One Understand “grow skills” door max |
| Explore What’s Next dump | Anxiety, not intention |
| Amy Quick Tutor / registry ghosts | No live journey |

---

## 10. Cursor recommendation

### Apple test — would Apple create four tabs?

**No.**

Apple would create **four intentions** that appear when life asks — not a persistent equal tab strip labeled Help/Understand/Care/Moments like a filing cabinet.

**Manufacturing implication for later blueprint (not now):**

- Prefer **one Hub surface** that asks (or infers) intention, then opens a room.  
- Or four calm doors with human verbs — never eight module groups.  
- Infant: Hub may open **directly into Care** without asking.  
- Crisis copy: surface Help without making parents hunt.

### Blueprint spine (when Founder opens manufacturing)

1. Intention → Room (4).  
2. First thing / never / leave-with per §3–4.  
3. Exit always to Today Home or living continue.  
4. Frequency-ordered build: Care (infant) + Help first; Moments + Understand next.  
5. Zero new tables; kill gamification writes.

### Do not

- Implement UI now  
- Preserve mall groups under new names  
- Add Steady as a fifth intention  
- Put Birth Sky outside Understand  

---

## Final question

### Would a tired parent naturally know which room to enter, without thinking?

**YES — if named and entered by intention, not by product.**

Why:

- The four verbs match how exhausted parents already talk: help · understand · care · a moment.  
- They do **not** match Speech Coach, Olympiad, Command Center, or Gaming.  
- Age gravity (Care for infants) removes choice when choice is cruel.  
- Today Home absorbs “what should I do now?” so Hub only appears when the feeling is bigger than one next step.

**NO — if shipped as four equal technical tabs above a tile mall.**  
That reintroduces thinking. Apple would reject that costume.

**Pass condition:** Parent feels the room before they read the label.

---

## STOP

**Journey map complete. No Parent Hub implementation.**

File: `docs/v2/PARENT_HUB_JOURNEY_MAP.md`

Await Founder review before blueprint or code.
