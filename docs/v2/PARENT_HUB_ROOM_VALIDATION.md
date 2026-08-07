# Parent Hub — Room Validation

**Status:** STUDY ONLY — NO IMPLEMENTATION  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Room Validation  
**Depends on:**  
- `PARENT_HUB_PRODUCT_TRUTH_AUDIT.md` (approved)  
- `PARENT_HUB_INFORMATION_ARCHITECTURE.md` (approved **with Founder changes**)  

**Frozen upstream:** Welcome · Signup · Child Discovery · Today Home  

---

## Founder locks (binding)

| Lock | Rule |
|---|---|
| Rooms | **Help · Understand · Care · Moments** only |
| Together | Renamed → **Moments** |
| Steady | **Not a destination** — becomes **tone of every room** |
| Birth Sky | Belongs in **Understand** |
| Gamification | **Permanently forbidden** on Parent Hub |

### Steady as tone (not a room)

Every room must feel: calm · non-judging · no score · no FOMO · exhausted-parent safe.  
Former “Steady” features are reassigned to a real room **or** removed if they only existed as gamified/dashboard pressure.

---

## Room definitions (validation lens)

| Room | Parent says | Single purpose |
|---|---|---|
| **Help** | “I need help.” | Unstick a stuck parent |
| **Understand** | “I want to understand.” | See the child more clearly |
| **Care** | “I need to care for them.” | Tend body, rhythm, feeding, health |
| **Moments** | “I want a moment with them.” | Share one human presence |

Today Home still owns today’s next right thing. Hub rooms never compete.

---

## 1. Feature → Room mapping

Every live or registered Parent Hub feature → **exactly one** room, or **none** (see §2–4).

### Help

| Feature | ID / surface | Why this room only |
|---|---|---|
| Ask Amy AI tile / header | `amy-ai` → `/assistant` | Stuck → ask |
| Emotional Support | `emotional` | Urgent “hold me / I’m failing” is help, not a fifth room |
| Speech Coach | `speech-coach` | Language anxiety = help |
| PTM Prep | `ptm-prep` | Hard parent moment — help to face it |
| Life Skills (stuck mode) | `life-skills` | **Only** when framed as “help me teach this” — see §3 merge note |

### Understand

| Feature | ID / surface | Why this room only |
|---|---|---|
| Daily Tips | `daily-tips` | Stage clarity |
| New Parent Tips | `new-parent-tips` | Stage clarity |
| Parenting Articles | `articles` | Meaning / patterns |
| Infant Amy Suggests | `infant-amy-suggests` | Guidance to understand baby |
| Infant Coaching / Baby Cues | `infant-coaching` | Read the child |
| Infant Milestones (meaning) | `infant-milestones` | Who they are becoming — **not** medical log |
| Curiosity library | `answer-to-kids-how` | “Why” understanding |
| Birth Sky / Amy Astro | `birth-sky` | **Founder lock** — identity / meaning |
| Learning progress (quiet status only) | Hub learning panel | How learning is going — **strip XP/streak theatre** |
| Smart Math / Abacus / Phonics / Spelling / Smart Study / Olympiad | Learning Zone launchers | Skill-growth understanding doors — **must collapse** (§3) |

### Care

| Feature | ID / surface | Why this room only |
|---|---|---|
| Infant Cry Insight | `infant-cry` | Body/signal care |
| Infant Sleep System | `infant-sleep` | Rhythm care |
| Infant Feeding | `infant-feeding` | Feeding care |
| Diaper / burp logging | (with feeding/cry) | Care logs |
| Infant Growth measurements | `infant-growth` | Body care tracking |
| Infant Health / vaccines | `infant-health` | Health care |
| Doctor visit report | `infant-doctor` | Care coordination |
| White noise & lullabies | `infant-sounds` | Soothing care |
| Infant Weekly Focus | `infant-weekly-focus` | Care focus of the week |
| Co-parent panel | `infant-coparent` | Care coordination (when FF on) |
| Infant Parent Wellbeing | `infant-wellbeing` | Caring for the caregiver **while** infant care — Care room, Steady **tone** |
| Nutrition Hub | `nutrition` | Food / body care (older / family) |
| Health Lab | `health-lab` | Movement / wellness care destination |

### Moments

| Feature | ID / surface | Why this room only |
|---|---|---|
| Activities & Learning nest | `activities` | Co-presence (collapse nest) |
| Infant Today’s Activities | `infant-activities` | Shared infant moment |
| Origami Studio | `origami-studio` | Make together |
| Art & Craft Videos | `art-craft` | Watch/make together |
| Printable Worksheets | `worksheets` | Quiet make-together |
| Coloring Books | `coloring-books` | Quiet make-together |
| Fun Sheets | `fun-sheets` | Quiet make-together |
| Kids Story Hub | `story-hub` | Shared story moment |
| Daily Story (inside Activities) | sub of `activities` | Same as Story — merge |
| Talking Amy | `talking-amy` | Playful presence |
| Amy Sound World / Discovery Worlds | `discovery-worlds` | Explore together |
| Event Prep | `event-prep` | Prepare a shared school **moment** |
| Audio Lessons | sub of `activities` | Shared listen moment |

### Shell / bridge (not room features)

| Feature | Mapping | Rule |
|---|---|---|
| Child selector | Shell | Always; no room |
| Hub Journey Pulse | Activation shell | Not a room; never Home NRT |
| Today’s Path | Bridge | May point into a room or Home — **not** a fifth room |
| Generate Routine tile / bottom CTA | → Today Home / Routines | **Not a Hub room feature** — remove from Hub IA (§4) |
| Quick actions chip wall | Mall chrome | Remove (§4) |

---

## 2. Orphan features

Belong to **none** of the four rooms (as Hub surfaces):

| Feature | Why orphan | Disposition |
|---|---|---|
| Gaming Hub / Gaming Rewards | Gamification — **forbidden** | Remove from Parent Hub |
| Section-visit points / `earnGamingPoints` on Hub open | Gamification | Remove mechanic from Hub |
| Command Center / Family pulse | Dashboard — no human room | Remove from Parent Hub |
| Tomorrow’s Forecast | Prediction theatre — not Help/Understand/Care/Moments | Remove from Parent Hub |
| Amy Quick Tutor | Invisible orphan | Remove dead path |
| Registry ghosts: `hub_morning_flow`, `hub_kids_control_center`, `hub_meals_tile`, `hub_ai_meal_generator`, `hub_rewards_shop` | No live tile; not a room | Purge from Hub allow-list story |
| Teacher OS i18n ghost | No section | Remove copy debt |
| Generate Routine as Hub peer tile | Owned by Today Home | Remove from Hub rooms |
| Learning XP / streak / unlock dopamine in Hub panel | Gamification | Strip from Hub; quiet status may stay under Understand |
| “Explore What’s Next” dump | Catalogue anxiety | Remove from Hub IA |

---

## 3. Merge candidates

| Merge | Survive in room | Absorb / kill |
|---|---|---|
| Daily Tips + New Parent Tips + Articles + Infant Amy Suggests | **Understand → Guidance** | Four tip products |
| Ask Amy + Emotional Support entry | **Help → Ask Amy** with calm/overwhelmed entries | Parallel emotional mini-app chrome |
| Story Hub + Daily Story (Activities) | **Moments → one Story** | Two story doors |
| Worksheets + Coloring + Fun Sheets | **Moments → one Make** | Three printables |
| Activities nest + Origami + Art + Audio Lessons + Infant activities | **Moments → one Presence** | Creativity maze |
| Six Learning Zone launchers | **Understand → one Grow skills** door (age-aware) | Six equal heroes |
| Infant Milestones meaning vs Growth measurements | **Split:** meaning → Understand; measurements → Care | Dual-belong confusion |
| Life Skills | Prefer **Moments** (practice with child); if “I’m stuck teaching” copy → Help entry only | Don’t dual-list |
| Speech Coach vs Talking Amy | Speech → **Help**; Talking Amy → **Moments** | Never same shelf |
| Nutrition vs Infant Feeding | Feeding logs → **Care** (infant); Nutrition destination → **Care** (older) — one Care food spine by age | Duplicate food malls |

---

## 4. Remove candidates

Remove from Parent Hub IA (underlying products may remain as destinations outside Hub):

| Remove from Hub | Keep product elsewhere? |
|---|---|
| Gaming Hub + all Hub points | Optional elsewhere — **never** on Hub |
| Command Center / Family pulse | No Hub surface |
| Tomorrow’s Forecast | Delay / non-Hub |
| Generate Routine Hub tiles/CTAs | Yes — Today Home Begin |
| Quick-action 9-chip wall | No |
| Amy Quick Tutor | Delete dead |
| Registry ghosts | Clean allow-list over time |
| Explore What’s Next band | No |
| XP / streak / unlock UI on Hub learning panel | Learning engine may remain; Hub shows calm status only |
| Dual Emotional + Ask Amy competing CTAs | Merge into Help |

---

## 5. Database impact

| Area | Tables / stores | Validation impact |
|---|---|---|
| Hub Journey / Path | `parent_hub_journey` | Shell/bridge — keep; not a room table |
| Feature usage | `feature_usage` + `PARENT_HUB_FEATURES` | Prune gaming/ghost IDs when manufacturing; no migration now |
| Gaming | `gaming_wallet` | Stop Hub writes for section opens; table may remain for non-Hub |
| Infant | `infant_*` | Care (+ Understand for cues/milestones meaning) — keep |
| Birth Sky | `birth_sky` | Understand door — keep schema |
| Learning progress | `learning_progress` | Understand quiet status — keep; hide gamified fields on Hub |
| Nutrition / speech / health-lab | respective | Care / Help destinations — keep |
| Tips/articles | content packs | Merge to Guidance — content only |
| Forecast | future-predictor | Orphan for Hub — API can idle |

**Study phase: zero migrations. Removals are IA disposition, not DROP TABLE.**

---

## 6. API impact

| API | Room fate |
|---|---|
| `/api/hub-journey/*` | Shell/bridge — keep |
| `/api/feature-usage/*` | Keep; stop tracking forbidden/orphan Hub features |
| `/api/gaming-rewards/*` from Hub | **Stop** for Parent Hub |
| `/api/future-predictor` | Not in four rooms — stop Hub calls |
| Infant / nutrition / speech / birth-sky / learning-progress | Keep for Care / Help / Understand / Moments doors |
| Children list | Shell |
| Assistant routes | Help |

Production risk of IA-only validation: **none** (docs only).  
Future manufacturing risk: **low** if destinations stay routed; **high** if Infant Care APIs are cut.

---

## 7. Founder recommendation

### Approve validation rules

1. **Four rooms only:** Help · Understand · Care · Moments.  
2. **Steady = tone everywhere** — never a fifth door.  
3. **Birth Sky → Understand.**  
4. **Gamification permanently out of Parent Hub.**  
5. Every surviving Hub feature maps to **exactly one** room (§1).  
6. Orphans (§2) leave Hub IA.  
7. Merges (§3) before any blueprint UI.

### Dual-belong resolutions (binding proposals)

| Feature | Decision |
|---|---|
| Emotional Support | **Help** (Steady tone) |
| Infant Parent Wellbeing | **Care** (Steady tone) |
| PTM Prep | **Help** |
| Event Prep | **Moments** |
| Milestones vs Growth | **Split** Understand / Care |
| Life Skills | **Moments** default |
| Learning Zone ×6 | Merge to **one Understand door** or leave Hub |

### Blueprint readiness

**Ready for Founder approval to open Parent Hub blueprint** — still **no implementation** until that order.

Smallest blueprint spine:

```
Help · Understand · Care · Moments
(+ Steady tone in all four)
(+ Shell: child · Path bridge · quiet Home link)
```

### Explicit non-actions

- No UI  
- No feature moves  
- No production code  
- No Child Hub  

---

## Mapping completeness check

| Source inventory | Disposition |
|---|---|
| All Today For You tiles | Mapped or orphaned |
| All Infant subsections | Mapped (Care / Understand / Moments) |
| Learning Zone | Understand (merge) |
| Birth Sky | Understand |
| Creativity | Moments (merge) |
| Stories & Communication | Help (Speech) / Moments (rest) |
| Health Zone | Care |
| Gaming | Orphan → remove |
| Parent Support | Help / Understand / Moments as above |
| Shell / Path / Generate / Quick actions | Shell, bridge, or remove |
| Registry ghosts / Quick Tutor | Orphan → remove |

**No feature left ambiguous without a §3 split/merge recommendation.**

---

## STOP

**Room validation complete. No implementation.**

File: `docs/v2/PARENT_HUB_ROOM_VALIDATION.md`

Await Founder approval before Parent Hub blueprint.
