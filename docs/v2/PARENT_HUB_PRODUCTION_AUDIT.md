# Parent Hub — Production Audit

**Status:** PRODUCTION GATE — NO IMPLEMENTATION UNTIL FOUNDER APPROVES THIS TABLE  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Production Audit  

**Locked inputs:**  
`PARENT_HUB_CONSTITUTION.md` (APPROVED) · `PARENT_HUB_VISUAL_MANUFACTURING_STUDY.md` (APPROVED) · `PARENT_HUB_MANUFACTURING_PLAN.md`

**Frozen upstream:** Welcome · Signup · Child Discovery · Today Home  

**Law:** Exactly one disposition per module.  
**Remove / Hide from Hub ≠ DROP TABLE / delete product.** Destinations may live outside Hub.

---

## Disposition legend

| Mark | Meaning |
|---|---|
| **Keep (Room)** | Remains a distinct Hub destination in that room |
| **Merge (into X · Room)** | Absorbed into a single Hub surface; not a peer hero |
| **Move (Room)** | Distinct destination, re-homed into the Constitution room |
| **Hide** | Not shown on Hub home/rooms; product/route may remain elsewhere |
| **Remove** | Removed from Hub IA; deep links soft-resolve; no Hub chrome |

Shell items use **Keep (Shell)** / **Hide** / **Remove** — they are not rooms.

---

## Manufacturing gate

```text
This audit APPROVED
        ↓
Gate B0 Blueprint (resolves open visual questions)
        ↓
Pack 1 Room shell …
```

**Iske bina implementation start nahi hona chahiye.**

---

## 1. Master disposition table

### 1.1 Help room

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Ask Amy (`amy-ai`) | **Help** | | | | | Constitution Help core — unstick parent; portal to `/assistant`, do not rebuild chat in Hub | None | Reuse assistant APIs | Keep ask/open events; add `room=help` | Fair free ask stays; continuity may gate later — not Hub sales wall |
| Emotional Support (`emotional`) | **Help** | | | | | Crisis trust; journey-exempt today | None | Existing support content APIs | Keep; `room=help` | **Always free** on first crisis visit |
| Speech Coach (`speech-coach`) | **Help** | | | | | High-stakes language help | Keep `speech_*` | Keep speech routes | Preserve speech funnel; referrer Hub/Help | First sessions free; continuity premium — entitlements unchanged |
| PTM Prep (`ptm-prep`) | **Help** | | | | | Seasonal parent crisis with clear use moment | None | Existing PTM content | Seasonal open events; `room=help` | Journey-exempt / free in season |
| Life Skills (`life-skills`) | **Help** | | | | | Keep **only** as “help me teach this” — not a curriculum mall peer | None | Existing | `room=help`; drop vanity browses as success | Soft-lock quiet (Pack 5); no new SKU |

### 1.2 Understand room

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Guidance (new Hub surface) | **Understand** | | | | | Single meaning stream — Constitution merge target | None new | Reuse tip/article content loaders under one door | Replace tip-trilogy opens with `guidance_open` | First Guidance sentence free; depth after trust |
| Daily Tips (`daily-tips`) | | **→ Guidance · Understand** | | | | Tip trilogy overload | None | Stop separate Hub hero fetch if any | Deprecate tip-only Hub success | Absorbed into Guidance free/premium rules |
| New Parent Tips (`new-parent-tips`) | | **→ Guidance · Understand** | | | | Duplicate shelf | None | Same | Same | Same |
| Articles (`articles`) | | **→ Guidance · Understand** | | | | Library, not a third hero | None | Same | Same | Same |
| Infant Amy Suggests | | **→ Guidance · Understand** | | | | Infant tip stream folds into Guidance; Care keeps body loops | Infant suggest content stays; no DROP | Infant suggest APIs reused by Guidance | Tag `room=understand` when guidance; care acts stay Care | Free orientation; no new gate |
| Infant cues / coaching (meaning) | | | **Understand** | | | Meaning about the child ≠ Care logging | Keep `infant_*` | Reuse infant coaching read APIs | Split: meaning vs care-act events | Free to understand; plans stay Care premium rules |
| Milestone **meaning** (not measurement UI) | | | **Understand** | | | “What this means” belongs Understand; charts/log stay Care | Keep milestone tables | Reuse | Meaning views vs log events | Free meaning sentence |
| Curiosity library (`answer-to-kids-how`) | | | **Understand** | | | Helps parent see how child thinks | None | Existing curiosity APIs | `room=understand` | Sample free; library depth later |
| Birth Sky (`birth-sky`) | | | **Understand** | | | Constitution lock — ∈ Understand; not own group | Keep `birth_sky` | Keep Birth Sky routes | `referrer=parenting_hub` + `room=understand` | Entry/meaning door free; deep AI/export after trust |
| Quiet learning status (panel) | | | **Understand** | | | Status only — **no XP/streak theatre** on Hub | Keep learning tables | May thin Hub `/learning-progress` calls | Do not treat Hub XP as success | No Hub unlock theatre |
| Grow-skills door (new) | **Understand** | | | | | ≤1 door for skills growth | None | Launchers only | One `grow_door_open` | Destination entitlements unchanged |
| Smart Math (`smart-math-tricks`) | | **→ Grow door · Understand** | | | | Six equal Learning heroes forbidden | None | Keep math route | Via Grow door | Unchanged at destination |
| Abacus (`abacus`) | | **→ Grow door · Understand** | | | | Same | None | Keep route | Same | Same |
| Phonics (`phonics`) | | **→ Grow door · Understand** | | | | Same | None | Keep route | Same | Same |
| Spelling (`spelling-mastery`) | | **→ Grow door · Understand** | | | | Same | None | Keep route | Same | Same |
| Smart Study (`smart-study`) | | **→ Grow door · Understand** | | | | Same | None | Keep route | Same | Same |
| Olympiad (`olympiad`) | | **→ Grow door · Understand** | | | | Same | None | Keep route | Same | Same |

### 1.3 Care room

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Infant Care suite (shell) | **Care** | | | | | Category-defining for 0–24m; Hub may open into Care | Keep all `infant_*` | Keep infant APIs | Preserve infant analytics | Core loops free; AI plans after trust |
| Cry | **Care** | | | | | Body loop | Keep | Keep | Keep | Free core |
| Sleep | **Care** | | | | | Body loop | Keep | Keep | Keep | Free core; advanced plans premium after trust |
| Feeding (infant) | **Care** | | | | | Body loop — distinct from family Nutrition | Keep | Keep | Keep | Free core |
| Diaper / daily care logs | **Care** | | | | | Body loop | Keep | Keep | Keep | Free core |
| Growth **measurements** | **Care** | | | | | Measurement ≠ milestone meaning | Keep | Keep | Keep | Free core |
| Health / vaccines | **Care** | | | | | Care responsibility | Keep | Keep | Keep | Free reminders framing |
| Doctor | **Care** | | | | | Care | Keep | Keep | Keep | Free entry |
| Sounds (infant soothing) | **Care** | | | | | Care tool for regulation | Keep | Keep | Keep | Free core |
| Weekly focus | **Care** | | | | | Care rhythm | Keep | Keep | Keep | Free |
| Co-parent (FF) | **Care** | | | | | Care coordination when flagged | Keep | Keep | Keep | Per existing FF/entitlement |
| Parent wellbeing (infant) | **Care** | | | | | Steady tone — not a Steady room | Keep | Keep | Keep | Micro-check free |
| Nutrition (`nutrition`) | | | **Care** | | | Meals/body — Health group → Care room | Keep `nutrition_*` | Keep `/nutrition` | `room=care` | First orientation free; AI/week plans after trust |
| Health Lab (`health-lab`) | **Care** | | | | | Wellness destination under Care (not equal mall tile energy) | Keep health lab stores | Keep `/health-lab` | `room=care` | **After Care trust** — soften premium-only first impression (Pack 5); entitlements not redesigned here |

### 1.4 Moments room

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Presence (new Hub surface) | **Moments** | | | | | One “ten minutes with {name}” offer | None new | Reuse activities/audio entry points | `presence_start` | First presence free |
| Activities (`activities` + nest) | | **→ Presence · Moments** | | | | Accordion warehouse → one presence | None | Keep activity routes under Presence | Collapse nested opens | Sample free; depth later |
| Origami (`origami-studio`) | | **→ Presence · Moments** | | | | Co-play fragment | None | Keep route | Via Presence | Same |
| Art & Craft (`art-craft`) | | **→ Presence · Moments** | | | | Co-play fragment | None | Keep route | Via Presence | Same |
| Amy Sound World / audio play | | **→ Presence · Moments** | | | | Playful audio with child — not Care soothing library | None | Keep audio entry | Via Presence | Same |
| Infant activities (play) | | **→ Presence · Moments** | | | | Play ≠ Care logging; Care keeps body tools | None | Reuse | `room=moments` when play | Free first offer |
| Story (`story-hub`) | | | **Moments** | | | One Story door | None | Keep story hub | `room=moments` | Fair sample free |
| Make (new Hub surface) | **Moments** | | | | | One printables/make door | None new | Reuse worksheet APIs | `make_open` | Sample free |
| Worksheets (`worksheets`) | | **→ Make · Moments** | | | | Print trilogy | None | Keep | Via Make | Same |
| Coloring (`coloring-books`) | | **→ Make · Moments** | | | | Print trilogy | None | Keep | Via Make | Same |
| Fun Sheets (`fun-sheets`) | | **→ Make · Moments** | | | | Print trilogy | None | Keep | Via Make | Same |
| Talking Amy (`talking-amy`) | | | **Moments** | | | Shared presence / voice play | None | Keep `/talking-amy` | `room=moments` | Fair sample; continuity later |
| Discovery Worlds (`discovery-worlds`) | | | **Moments** | | | Together exploration door (collapse fake multi feature IDs) | None | Keep `/discovery-worlds` | One door event | Sample free |
| Event Prep (`event-prep`) | | | **Moments** | | | Occasional togetherness prep | None | Existing | `room=moments` | Soft continuity |

### 1.5 Shell / bridge (not rooms)

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Child selector | **Shell** | | | | | Required context | Children tables stay | Children APIs stay | Unchanged | None |
| Quiet link to Today Home | **Shell** | | | | | Exit Law / boundary | None | None | Track return-to-Home | Home NRT free forever |
| Hub Journey Pulse | **Shell** (demoted) | | | | | Activation spine — never louder than room hero; never rivals Home NRT | Keep `parent_hub_journey` | Keep `/api/hub-journey/*` | Not Hub success vanity | Soft-lock continuity — not “Unlock the Hub” sales page |
| Today’s Path | **Shell** (demoted) | | | | | Hub-scoped path only; Path may open rooms for understanding/care/presence — never Generate Routine | Keep journey | Keep hub-journey | Path→room→leave-with | Existing 3-day / calendar rules; presentation Pack 5 |
| Learning progress panel (XP/unlocks UI) | | | | **Hide on Hub home** | | XP/streak theatre forbidden on Hub; quiet status only via Understand | Engine tables stay | Stop Hub XP theatre calls when flag ON | Do not count Hub XP | No Hub gamified unlock |

### 1.6 Remove from Hub (products may live elsewhere)

| Module | Keep | Merge | Move | Hide | Remove | Reason | DB Impact | API Impact | Analytics | Premium Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| Generate Routine tile (`generate-routine`) | | | | | **from Hub** | Today Home owns Begin / NRT | None | Routine APIs stay Home-owned | Stop Hub generate CTA as Hub success | Never paywall Home Begin |
| Bottom Generate CTA | | | | | **from Hub** | Duplicate Generate chrome | None | None | Remove Hub bottom CTA events | None |
| Tomorrow’s Forecast (`tomorrow-forecast`) | | | | | **from Hub** | Clever peer tile; not an intention room; not daily habit | No DROP; predictor cache may idle | Stop Hub `/api/future-predictor` from Hub home | Do not use forecast opens as retention | None on Hub |
| Command Center / Family pulse (`command-center`) | | | | | **from Hub** | Dashboard-of-dashboards — anti-AmyNest | No DROP of reality/executive stores | Stop Hub nest fetches | Drop as Hub KPI | None |
| Gaming Rewards (`gaming-rewards`) | | | | | **from Hub** | Gamification permanently forbidden on Parent Hub | Keep `gaming_wallet` for `/games` if needed | **Stop** Hub section-earn `/api/gaming-rewards` | Gaming earn ≠ retention truth | Never sell points/unlocks on Hub |
| Hub section-visit points (`HUB_SECTION_REWARD_POINTS`) | | | | | **mechanic** | Trains mall browsing | No migration | Stop earn-on-open | Delete as success signal | Forbidden monetization theatre |
| Quick-action chip strip (9 chips) | | | | | **from Hub** | Catalog chrome; teaches browse | None | None | Remove chip CTR as Hub success | None |
| Explore What’s Next band | | | | | **from Hub** | Browse / “what’s new” forbidden entry energy | None | None | Remove | None |
| Amy Quick Tutor (`amy-quick-tutor`) | | | | | **from Hub** | Orphan — defined but not in live tile map | None | None | Prune dead IDs | None |
| Registry ghosts (`hub_morning_flow`, `hub_kids_control_center`, `hub_meals_tile`, `hub_ai_meal_generator`, `hub_rewards_shop`) | | | | | **from Hub allow-list** | Lie in `PARENT_HUB_FEATURES`; confuse manufacturing | No DROP | Prune feature-usage allow-list | Stop tracking ghosts | None |
| Teacher OS i18n tile (no section) | | | | | **dead copy** | Copy without section | None | None | None | None |
| Steady as a fifth room | | | | | **concept** | Steady = tone of every room | None | None | None | None |
| Birth Sky as own Hub group | | | | | **group chrome** | Product **Move → Understand**; group removed | None | None | See Birth Sky row | See Birth Sky row |

---

## 2. Counts (audit integrity)

| Disposition | Count (approx) | Notes |
|---|---|---|
| Keep (distinct in room/shell) | Help 5 · Understand 3 (Guidance, Birth Sky door, Grow door) · Care suite + Nutrition + Health Lab · Moments 5 (Presence, Story, Make, Talking Amy, Discovery, Event Prep) · Shell 4 | Exact UI rows set in Blueprint |
| Merge | Tip trilogy + Infant suggests → Guidance; 6 Learning → Grow; Activities/Origami/Art/audio/infant play → Presence; Worksheets/Coloring/Fun → Make | |
| Move | Nutrition→Care; Birth Sky→Understand; Story/Talking Amy/Discovery/Event Prep→Moments; curiosity→Understand; meaning slices→Understand | |
| Hide | Learning XP/unlock panel on Hub home | |
| Remove from Hub | Generate×2 · Forecast · Command Center · Gaming + points · Quick chips · Explore · orphans/ghosts · Steady-as-room · Astro group chrome | |

Every live `WEB_HUB_SECTION_TILE_IDS` id appears above.  
Infant suite enumerated. Shell + chrome enumerated.

---

## 3. Room membership (binding after approval)

| Room | Distinct Hub doors (post-merge) |
|---|---|
| **Help** | Ask Amy · Emotional Support · Speech Coach · PTM Prep · Life Skills (teach-help only) |
| **Understand** | Guidance · Birth Sky · Curiosity · quiet learning status · **one** Grow-skills door · infant meaning/cues (as secondary) |
| **Care** | Infant Care depth · Nutrition · Health Lab |
| **Moments** | Presence · Story · Make · Talking Amy · Discovery Worlds · Event Prep |
| **Shell** | Child selector · demoted Journey/Path · Home link |

---

## 4. Cross-cutting impact summary

### Database

| Action | Impact |
|---|---|
| All Keep / Move / Merge | **Zero new tables · zero DROP** for Hub IA v1 |
| Remove from Hub UI | IA only — underlying `gaming_*`, predictor, executive data may remain for other surfaces |
| Journey | **Keep** `parent_hub_journey` |

### API

| Action | Impact |
|---|---|
| Destinations Keep/Move | Routes unchanged (`/assistant`, `/speech-coach`, `/nutrition`, `/health-lab`, Birth Sky, infant, stories, games elsewhere) |
| Remove Gaming earn / Forecast / Command Center from Hub | **Stop Hub client calls** when rooms flag ON |
| Generate | Home/Routines only |
| Merges | Same APIs behind one door — no parallel microservice |

### Analytics

| Prefer | Stop treating as Hub success |
|---|---|
| `room_view` · `intention` · `leave_with` · return-to-Home · destination funnels | Section-open points · chip CTR · forecast opens · gaming earn · mall browse volume |

### Premium

| Rule | Audit consequence |
|---|---|
| Value before payment | No module becomes a Hub sales landing |
| Crisis Help free | Emotional · PTM season · first ask/speech taste |
| Care → Help → Understand → Moments | Willingness rank unchanged |
| No pricing redesign in this audit | Entitlements stay; Pack 5 quiets presentation |
| Gamification monetization | **Forbidden** — Remove points/Gaming from Hub |

---

## 5. Deep-link / Production Safety map

| Legacy `#tile-*` / entry | After audit |
|---|---|
| `#tile-amy-ai` etc. Help tiles | → Help room + destination |
| `#tile-nutrition` · infant | → Care |
| `#tile-birth-sky` | → Understand |
| `#tile-story-hub` · talking-amy · discovery | → Moments |
| `#tile-gaming-rewards` · forecast · command-center · generate-routine | Soft no-op or redirect Home/room intention — **never 404** |
| `/parenting-hub/speech-coach` etc. | Destination routes **unchanged** |

---

## 6. Founder approval checklist

- [ ] Every module has exactly one disposition  
- [ ] No fifth room (Steady = tone)  
- [ ] Birth Sky ∈ Understand  
- [ ] Gaming / points / Forecast / Command Center / Generate **removed from Hub**  
- [ ] Tip trilogy → one Guidance  
- [ ] Learning → ≤1 Grow door  
- [ ] Activities/printables → Presence / Make  
- [ ] Zero required migrations  
- [ ] Today Home still owns Begin  
- [ ] Implementation blocked until this doc is **APPROVED**

---

## Final statement

**Without this table approved, Pack 1 Room shell must not start.**

Disposition is product law for manufacturing — not a redesign sketch.

---

## STOP

**Production audit complete. No React. No CSS. No implementation.**

File: `docs/v2/PARENT_HUB_PRODUCTION_AUDIT.md`

Await Founder approval of every row.
