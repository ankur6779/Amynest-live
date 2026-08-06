# P0.2 Before / After — Spatial Rhythm

**Sprint:** P0.2 Spacing only  
**Ladder:** 8 · 16 · 24 · 32 · 40 · 48 · 56 · 64  
**Not changed:** hierarchy · typography · lighting · motion · colors · surfaces · copy

---

## Violation → canonical

| Before (off-ladder) | After | Role |
|---------------------|-------|------|
| `space-y-3` (12) | `V2_SPACE.heroStack` / `sectionStack` (16) | Hero / section stacks |
| `space-y-5` (20) | structured `mt-6` + `actionPause` mt-8 | Ask Amy body → list → CTA |
| `space-y-1.5` (6) | `V2_SPACE.stack1` (8) | Mission title↔meta |
| `gap-3` (12) | `V2_SPACE.listGap` / `ctaStack` (16) | Lists · CTA pairs |
| `gap-1` (4) | `V2_SPACE[1]` (8) | Back control · icon gaps |
| `-ml-2` hang | removed | Mission back column lock |
| `px-3 py-1` (12/4) | `V2_SPACE.chipPad` (16/8) | Focus banner |
| `px-3 py-3` (12) | `V2_SPACE.rowPad` (16/16) | Complete badge · rows |
| `px-4 py-3` (16/12) | `V2_SPACE.rowPad` (16/16) | Prompt / plan / choice rows |
| `px-5 py-5` (20) | already `platePad` (24) in P0.1 | For Child plates |
| `p-5` sheet (20) | `sheetPad` (24) | Guest sheet |
| `mt-1` / `pt-1` (4) | `mt1` / `pt1` (8) | Captions · prepare |
| `mt-3` (12) | `mt2` (16) or `mt4` (32) by role | Success body · progress |
| `mt-6` before sheet actions | `actionPause` `mt-8` (32) | Body → Bloom |
| `pt-8` magic | `V2_SPACE.pt4` | Chapter separator |
| `pb-10` magic | `V2_SPACE.pb5` | Ritual bottom |
| `bottom-1` (4) | `bottom-2` (8) | Nav indicator offset |
| `gap-8`/`gap-10` shells | `V2_SHELL` chapter 48 (P0.1) | Unchanged this sprint |

---

## Screen rhythm (visual)

| Surface | Hero top | Section | CTA pause | Plate/sheet pad | Bottom breath |
|---------|----------|---------|-----------|-----------------|---------------|
| Today | heroStack 16 | chapter 48 · pt4 on Ask Amy | in-plate / section 16 | plate 24 | 64+safe |
| Ask Amy | header gap 8 | list 16 · list from support 24 | **32** to Start | row 16 | 64+safe |
| For Child | heroStack 16 | list 24 · guest pt4 | section 16 | plate 24 | 64+safe |
| Mission Play | section 16 | steps plate | shell chapter | plate 24 · pl 32 | 64+safe |
| Mission Success | panel py 40 | type mt 8/16/24 | ctaStack 16 | px 24 | 64+safe |
| Coach | heroStack 16 | ctaStack 16 | 16 pair | — | 64+safe |
| Premium | heroStack 16 | section 16 · plan list 8 | mt 8/16 | px 24 · py 24/32/40 | 64+safe |
| Account gate | heroStack 16 | ctaStack 16 | pt 8 | plate 24 | 64+safe |
| Guest sheet | sheet 24 | title→body 16 | **32** · cta 16 | sheet 24 | scrim p 16 |
| Front Door | safe-area · mt 32 | step gap 32 · list 16 | ctaStack 16 | row 16 | pb 40 |
| Nav | — | icon→label 8 | — | — | height 56 |
| Calm / Coach prepare | edge 24 · py 64 | stack 8/16 | — | row 16 | — |

---

## Out of scope (audited, not modified)

| Surface | Why |
|---------|-----|
| **Landing** | Marketing / redirect into Front Door — not a V2 shell |
| **Signup** | Legacy auth page; only consumes `V2_PREPARE_COPY` string — spacing not V2-owned |

---

## Automated

**13 files · 57 tests passed** (includes ladder role assertion).
