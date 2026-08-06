# AmyNest V2 — Spatial Rhythm Audit

**Status:** Audit only — **no implementation · no redesign · no new visuals**  
**Authority:** [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) §1 spacing ladder  
**Method:** Measure current V2 presentation shells against the locked ladder. Propose After values only.

---

## Locked ladder (canonical)

| Token | px | Role |
|-------|---:|------|
| `space.1` | **8** | Tight internal gaps only |
| `space.2` | **16** | Related elements |
| `space.3` | **24** | Edge air · default inset · plate/sheet padding |
| `space.4` | **32** | Hero → action · default top pad · chapter minimum when tight |
| `space.5` | **40** | Chapter separation (minimum) |
| `space.6` | **48** | Chapter separation (preferred) |
| `space.7` | **56** | Major breath · nav content height |
| `space.8` | **64** | Ritual landings · max shell clearance unit |

**Forbidden spacing:** 4, 6, 12, 20, 28, 36, 44, 72, 80, 112, and any other off-ladder value.  
*(Type size 13 for caption is typography — not a spacing token.)*

### Tailwind → ladder (offenders → replace)

| Current class | px | Ladder? | Replace with |
|---------------|---:|:-------:|--------------|
| `gap-1` / `py-1` / `mt-1` / `pt-1` / `px-1` | 4 | ✗ | **8** |
| `space-y-1.5` | 6 | ✗ | **8** |
| `gap-3` / `space-y-3` / `px-3` / `py-3` / `mt-3` | 12 | ✗ | **8** (tight) or **16** (related) |
| `px-4` (as **edge**) | 16 | ✓ value / ✗ role | Edge → **24** |
| `gap-5` / `space-y-5` / `px-5` / `py-5` / `p-5` | 20 | ✗ | **16** or **24** |
| `pb-28` | 112 | ✗ | **64** + `env(safe-area-inset-bottom)` |
| `h-[64px]` nav content | 64 | ✓ value / ✗ vs Constitution nav **56** | Content **56** + safe-area |

---

## Global shell (all tabbed surfaces)

### G1 — Screen edge inset

| | |
|--|--|
| **Before** | `px-4` → **16** on Today, Ask Amy, For Child, Premium, Coach, Mission Play, Account gate, Calm prepare |
| **After** | `px` → **24** (`space.3`) |
| **Reason** | Constitution edge air is 24. 16 reads as SaaS density; eye never reaches the Nest column margin. |

### G2 — Top margin / safe area

| | |
|--|--|
| **Before** | Most shells: `py-8` → top **32**. Front Door: `pt-[max(1.5rem, env(safe-area-inset-top))]` → **24** floor + safe. Front Door horizontal `px-5` → **20** (off ladder). |
| **After** | Top content pad **32** (`space.4`) **or** `max(24, safe-area-inset-top)` when safe-area dominates. Horizontal always **24**. Never **20**. |
| **Reason** | One top rhythm across product. Safe-area is additive environment, not an excuse for off-ladder inset. |

### G3 — Navigation clearance (scroll pad)

| | |
|--|--|
| **Before** | `V2_SCROLL_PAD` = `pb-28` → **112**. Nav bar content `h-[64px]` + shadow. |
| **After** | Nav content height **56** (`space.7`) + bottom safe-area. Scroll pad = **64** (`space.8`) + `env(safe-area-inset-bottom)`. |
| **Reason** | 112 is arbitrary and off ladder. Clearance must equal one intentional unit above the nav instrument so the last CTA never crowds, without floating in empty void. |

### G4 — Nav internal rhythm

| | |
|--|--|
| **Before** | Icon→label `gap-1` → **4**. Tab `px-1 py-2`. Active underline `bottom-1` → **4**. |
| **After** | Icon→label **8**. Horizontal tab pad **8**. Active soft-fill (per Design Constitution) — if indicator remains during transition, offset **8** not 4. |
| **Reason** | 4px is visual tension; nav should whisper on the same ladder as the page. |

### G5 — Chapter rhythm (cross-screen)

| | |
|--|--|
| **Before** | Today `gap-10` → **40**. Ask Amy / For Child / Premium / Coach / Front Door sections often `gap-8` → **32**. |
| **After** | Major chapters **48** preferred (`space.6`); **40** minimum (`space.5`). Reserve **32** for hero→action *inside* a chapter, not between Mission and Coach. |
| **Reason** | Uneven chapter air makes Today feel like a different product than Ask Amy. One breath. |

---

## Screen audits

### 1. Today (`TodayPage` + Mission + Coach card)

#### 1.1 Top → hero cluster

| | |
|--|--|
| **Before** | Header `space-y-3` → **12** between Today label, focus chip, greeting, subline, message. Focus chip `px-3 py-1` → **12 / 4**. |
| **After** | Related text stack **16**. Chip pad **8** vertical / **16** horizontal (or drop chip chrome later — spacing only: no 4/12). |
| **Reason** | Crowded hero. 12px stitches five lines into a dense block; eye cannot land on the greeting. |

#### 1.2 Hero → Mission (CTA home)

| | |
|--|--|
| **Before** | Shell `gap-10` → **40** between header and Mission (ok as minimum). Mission internal: title stack `space-y-1.5` → **6**; plate `p-6` → **24** ✓; stack `space-y-4` → **16** ✓. Complete badge `px-3 py-3` → **12**. |
| **After** | Keep chapter ≥ **40**, prefer **48**. Title↔meta **8**. Badge pad **16** horizontal / **16** vertical (or **8** if truly tight instrument). CTA remains after body with **16** inside plate (related) — if CTA feels tight to summary, lift to **24** inside plate. |
| **Reason** | `1.5` (6) is classic off-ladder tension under the mission title. Plate padding 24 is already canonical — protect it. |

#### 1.3 Mission → Coach → Ask Amy → Premium

| | |
|--|--|
| **Before** | Equal `gap-10` (**40**) for all siblings. Ask Amy section adds `pt-8` (**32**) *plus* border — double separator. Ask Amy / Premium inner `space-y-3` → **12**. Coach card `p-5` → **20**. |
| **After** | Single chapter gap **48** — remove redundant `pt-8` when gap already separates (or keep border *or* gap, not both stacked). Inner section stacks **16**. Coach padding **24** (match Mission plate family). |
| **Reason** | Border + extra pt creates imbalanced cards and visual tension. Coach 20 vs Mission 24 reads as two systems. |

#### 1.4 CTA spacing (Mission bloom / Ask Amy entry)

| | |
|--|--|
| **Before** | Ask Amy: support copy → CTA at **12**. Mission: summary → CTA at **16** (via `space-y-4`). Bottom clearance **112**. |
| **After** | Copy → primary CTA **32** when CTA is the chapter action; **16** only when CTA sits inside Soft Plate as related. Scroll pad **64** + safe-area. |
| **Reason** | CTA too close on Ask Amy chapter. Mission in-plate 16 is acceptable; out-of-plate CTAs need hero→action pause **32**. |

**Today symptoms found:** crowded hero · uneven plate padding · double chapter separator · CTA close on Ask Amy · off-ladder chip/badge pads · clearance 112.

---

### 2. Ask Amy (`AskAmyPage`)

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Edge / top | `px-4 py-8` → **16 / 32** | **24 / 32** | Align edge to ladder role |
| Header | `gap-2` → **8** ✓ | **8** | Keep |
| Prompt section | `space-y-5` → **20** | **16** or **24** | Off ladder; 20 is arbitrary |
| Prompt list | `gap-3` → **12** | **16** | Related list items need 16; 12 crowds |
| Prompt row pad | `px-4 py-3` → **16 / 12** | **16 / 16** | Kill 12 vertical |
| Thread chrome | `px-3 py-2` → **12 / 8** | **16 / 8** | Horizontal off ladder |
| Chapters | `gap-8` → **32** | **40–48** | Screen feels tighter than Today |
| Nav clearance | `pb-28` → **112** | **64** + safe-area | Global G3 |

**Symptoms:** crowded prompt list · floating thread header pad · chapter air thinner than Today · edge 16.

---

### 3. For Child (`ForChildPage`)

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Edge / top | `px-4 py-8` → **16 / 32** | **24 / 32** | Global edge |
| Hero stack | `space-y-3` → **12** | **16** | Hero breathing |
| Section list | `gap-5` → **20** | **16** (related) or **24** (if plates should float apart) | **20** is the most SaaS-arbitrary gap in V2 |
| Section plates | `px-5 py-5` → **20** | **24** | One Soft Plate padding |
| Guest gate | `space-y-3` + `pt-8` → **12 / 32** | Stack **16**; chapter gap **48** (drop extra pt if gap handles it) | CTA too close to copy; double separator risk |
| Chapters | `gap-8` → **32** | **48** | Imbalanced vs Today |

**Symptoms:** imbalanced cards (20 pad + 20 gap) · crowded guest CTA · off-ladder everywhere in the section grid · floating equal tiles with no hierarchy air.

---

### 4. Coach Discovery (`CoachDiscoveryPage` + card + prepare)

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Empty / center states | `py-10` → **40**; header `space-y-3` → **12** | Top **40** ok; header stack **16** | Hero cluster crowd |
| Offer list | `gap-3` → **12** | **16** | Crowded choices |
| Card padding | `p-5` → **20** | **24** | Match Soft Plate lock |
| Card inner | `space-y-4` → **16** ✓ / title `space-y-2` → **8** ✓ | Keep | Already on ladder |
| CTA column | `gap-3` → **12** | Primary alone; tertiary **16** below | CTA too close to peer actions |
| Prepare progress | `gap-6 px-4 py-16` → **24 / 16 / 64** | Edge **24**; vertical ritual **64** ✓; gap **24** ✓ | Fix edge only |
| Prepare rows | `px-4 py-3` / `space-y-2` | Row pad **16 / 16**; list **8** | Kill 12 |

**Symptoms:** CTA cluster tension · card padding drift · choice list density.

---

### 5. Mission Play + Mission Success

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Play shell | `gap-8 px-4 py-8` | Chapters **40–48**; edge **24**; top **32** | Align to shell |
| Back control | `-ml-2 gap-1 px-2` → pull **8**, gap **4** | No negative pull; gap **8**; pad **8** | Floating / optical misalignment |
| Steps card | `px-5 py-4 pl-8` → **20 / 16 / 32**; `space-y-3` → **12** | Pad **24**; list **16**; indent **32** ok | Mixed 20/12 tension |
| Success shell | `gap-10 px-4 py-10 pb-28` | Edge **24**; top **40**; chapters **48**; pb **64**+safe | Clearance + edge |
| Success panel | `px-6 py-10` → **24 / 40** ✓ | Keep | On ladder |
| Success type stack | `mt-6` ✓ · `mt-2` ✓ · `mt-3` ✗ **12** · `mt-4` ✓ | Replace `mt-3` → **16** | One off-ladder hitch in an otherwise calm stack |
| Success CTAs | `gap-3` → **12** | **16** | Primary/tertiary too close |

**Symptoms:** back button float · steps card uneven pad · success CTA crowding · pb 112.

---

### 6. Premium Journey + Account gate

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Shell | `gap-8 px-4 py-8` | Edge **24**; chapters **48**; top **32** | Same product as Today |
| Header | `space-y-3` → **12** | **16** | Hero crowd |
| Continuity / states | Cards mix `px-4 py-10`, `px-4 py-8`, `px-4 py-6`, gaps **12–16**, `mt-1` **4**, `mt-2` **8**, `pt-1` **4** | Horizontal plate pad **24**; vertical **32** or **40** by state; kill **4**; related **16**; CTA `mt` **32** when chapter action | Imbalanced cards across states |
| Plan list | `gap-2` → **8** ✓ for tight list; row `py-3` → **12** | Row vertical **16** | Rows feel compressed |
| Account gate plate | `p-6` → **24** ✓; inner `space-y-5` → **20**; CTAs `gap-3 pt-2` → **12 / 8** | Inner **16** or **24**; CTA column **16**; hero→primary **32** | CTA too close; 20 off ladder |

**Symptoms:** state-to-state card padding lottery · 4px micro gaps · CTA proximity · thinner shell than Today.

---

### 7. Guest Account Sheet

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Scrim inset | `p-4` → **16** | **16** ok for scrim gutter *or* **24** to match edge — pick **16** only if sheet itself pads **24** | Avoid double-tight |
| Sheet pad | `p-5` → **20** | **24** | Sheet Glass padding lock |
| Title → body | `mt-2` → **8** | **16** | Related reading needs 16 |
| Body → actions | `mt-6` → **24** | **32** | Hero/body → action pause |
| Action stack | `gap-3` → **12** | **16** | Primary/tertiary tension |

**Symptoms:** sheet feels slightly cramped vs Constitution Soft/Sheet padding; CTA pair tight.

---

### 8. Front Door (ritual)

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Edge | `px-5` → **20** | **24** | Off-ladder edge |
| Top | `max(24, safe-area)` ✓ spirit | Keep pattern; ensure floor is **24** not 20 | Safe-area honest |
| Bottom | `pb-10` → **40** | **40** or **48** (no tab bar — ritual) | Ok on ladder; prefer **48** if CTA sits low |
| Progress → content | `mt-3` → **12**; block `mt-8` → **32** | Progress→hero **16**; hero block **32** or **40** | Kill 12 |
| Step sections | `gap-8` → **32**; title stacks mix `space-y-2/4`; lists `gap-3` → **12**; choices `px-4 py-3` | Section internal **16**; list **16**; choice pad **16/16**; hero→action **32** | Crowded choice lists |
| Worry / age tiles | Dense **12** gaps | **16** | Visual tension between peers |

**Symptoms:** unique 20px edge breaks grid alignment with rest of app · choice lists crowded · progress hitch at 12.

---

### 9. Calm loading / prepare (`V2CalmPrepare`)

| Zone | Before | After | Reason |
|------|--------|-------|--------|
| Shell | `gap-5 px-4 py-16` → **20 / 16 / 64** | Gap **16** or **24**; edge **24**; `py` **64** ✓ | 20 off ladder; edge wrong role |
| Skeleton | `space-y-3` → **12**; `pt-2` → **8** | **16** / **8** | Crowded fake content |
| Orb stack | `gap-2 py-1` → **8 / 4** | **8 / 8** | Kill 4 |

**Symptoms:** prepare state subtly off-grid vs ritual Success (`py-16` good; gap-5 bad).

---

## Measurement matrix (current → canonical)

| Measure | Dominant Before | Canonical After |
|---------|-----------------|-----------------|
| Top margins | 32 (good) / Front Door 24+safe | **32** or **max(24, safe-area)** |
| Hero spacing | **12** stacks | **16** |
| Body spacing | mix 8 / 12 / 16 / 20 | Related **16**; tight meta **8** |
| CTA spacing | **12** common; in-plate **16** | In-plate **16–24**; chapter CTA **32** |
| Card padding | **20** / **24** / **16** mix | Soft Plate **24** |
| Sheet padding | **20** | **24** |
| Navigation clearance | **112** | **64** + safe-area |
| Safe area spacing | Partial (Front Door only) | Top & bottom env insets on all shells; never replace ladder |
| Edge inset | **16** (most) / **20** (Front Door) | **24** |
| Chapter gap | **32** / **40** | **48** preferred · **40** min |

---

## Defect catalog (by symptom)

| Symptom | Where | Ladder fix |
|---------|-------|------------|
| Crowded layouts | Today hero · Ask Amy prompts · For Child tiles · Front Door choices | Replace 12/20 with 16/24; chapter → 48 |
| Floating objects | Mission Play back `-ml-2` · nav 4px gaps | Remove negative pull; use 8 |
| Uneven spacing | Today 40 vs others 32 · Coach 20 vs Mission 24 | One chapter token; one plate pad |
| CTA too close | Ask Amy chapter · sheets · Premium · Success | Body→CTA **32** outside plates |
| Hero too low | Shells with `py-8` + dense header can feel late | Keep top **32**; open hero stack to **16** (air lifts optical position) |
| Hero too high | Rare; Front Door with small top + large orb may feel top-heavy | Ensure hero→action **32–40**; avoid shrinking top below **24** |
| Imbalanced cards | For Child 20/20 · Premium state pads · Coach vs Mission | Plate pad **24**; inter-card **16** or **24** only |
| Visual tension | `space-y-1.5`, `gap-1`, `mt-1`, `pt-1`, borders + extra `pt-8` | Delete off-ladder micros; one separator language |

---

## Canonical screen recipe (target rhythm)

Use this invisible grid on every V2 surface (implementation later):

```
[ safe-area-top ]
[ 32 top pad ]
[ edge 24 | column | edge 24 ]
[ hero stack @ 16 ]
[ 32 hero → action / first plate ]
[ soft plate pad 24 ]
[ 48 chapter ]
[ … ]
[ 64 + safe-area-bottom clearance ]
[ nav content 56 + safe-area-bottom ]
```

---

## Priority (when implementation is allowed)

1. **P0 — Grid alignment:** edge **24** · kill **12 / 20 / 4 / 6** · scroll pad **64+safe** · nav height **56**  
2. **P1 — Chapter breath:** unify chapter gap to **48** (min **40**) · remove double separators  
3. **P2 — CTA pause:** chapter CTAs **32** from copy · sheet actions **32**  
4. **P3 — Plate family:** all Soft Plate / Sheet pads **24**

---

## Closing

The product does not yet breathe as one rhythm.  
Most shells share a *similar* Tailwind habit (`px-4`, `space-y-3`, `gap-8`) — that habit is systematically **off** the Design Constitution ladder.

No layouts were redesigned here.  
No visuals were created.  
After values are ladder corrections only.

**STOP.** Audit complete. No implementation.
