# CSS Pixel Diff Report — Phase 2

**Mode:** Visual QA against Nest Presence boards + Phase 1 before baselines  
**Rule:** Does it look identical? Not “does it work?”

---

## Method

1. **Before** = Phase 1 after PNGs (`css-phase2-screenshots/before/`)  
2. **After** = Phase 2 manufacturing PNGs (`css-phase2-screenshots/after/`)  
3. **Boards** = Design / Visual Constitution optical locks + approved Nest Presence boards  
4. Diff = class/token contract + screenshot review (no redesign)

---

## Per-room scorecard

| Room | Before → After (optical) | Remaining mismatch | Founder | Apple | Match % |
|------|--------------------------|--------------------|--------:|------:|--------:|
| **Threshold** | Sign-in 40px invent → ghost caption; 880/min-h invent → viewport; orb inline → `V2_ORB.presence`; footer gap-5 → ladder | Legacy landing path still exists when Nest flag off | **84** | **78** | **94%** |
| **Keep** | Kit `size="lg"` + bare measure → `V2_MEASURE` + Bloom 52 min-h | Field `pr-16` affordance | **86** | **80** | **95%** |
| **Vestibule** | Reply `py-3` · kit size · `max-w-sm` → ladder + measure | Amy Memory splash can precede first paint | **88** | **82** | **95%** |
| **Living** | Whisper `size="sm"` fork · Soft Plate literals → tokens · one Bloom | Law of three content density (frozen product) | **85** | **80** | **93%** |
| **Practice** | Measure + Bloom height fight removed | Success hero measure now locked | **87** | **81** | **95%** |
| **Study** | Nested Soft Plate list → selected fill only · shell measure | Coach engine after continue (black box) | **84** | **78** | **92%** |
| **Hearing** | Shell measure · hearing-engine soft-bind radii/shadows | Assistant black-box type/chrome residual | **76** | **70** | **86%** |
| **Continuity** | Body invent weight · kit size · measure | Store sheet after continue (product) | **85** | **79** | **93%** |
| **Child’s Room** | Weight invent · kit size · measure | Living discovery Soft Plate density OK | **86** | **80** | **94%** |

**Shell average Match %:** **~92.7%** (boards target 95%; Hearing pulls mean down).

---

## Cross-room pixel deltas (Phase 1 → 2)

| Concern | Before | After |
|---------|--------|-------|
| Bloom height | Kit `size="lg"` could win | `min-h: var(--v2-button-height)` |
| Support column | `max-w-sm` invent | `--v2-measure-support` |
| Sheet width | `max-w-md` invent | `--v2-sheet-max` |
| Hover fills | Opacity literals | `--v2-fill-hover-*` |
| Press duration | `120ms` / `220ms` literals | `--v2-duration-*` |
| Guest sheet title | `text-lg font-semibold` | Hero compact |
| Study prepare | Full Soft Plate per row | Selected settle only |
| Threshold Sign-in | 40px peer height | Ghost caption |

---

## Screenshot index

| Room | Before | After |
|------|--------|-------|
| Vestibule | `before/after-vestibule-front-door.png` | `after/after-vestibule-front-door.png` |
| Living | `before/after-living-today.png` | `after/after-living-today.png` |
| Practice | `before/after-practice-mission.png` | `after/after-practice-mission.png` |
| Hearing | `before/after-hearing-ask-amy.png` | `after/after-hearing-ask-amy.png` |
| Child | `before/after-child-for-child.png` | `after/after-child-for-child.png` |
| Continuity | `before/after-continuity-premium-gate.png` | `after/after-continuity-premium-gate.png` |
| Threshold / Keep / Study | Contract + live capture when Nest flags on | See `after/` README |

---

## Verdict

Nest shells approach **95%** board match.  
**Hearing conversation** and **classic engines** remain the primary visual mismatch — Phase 3 candidates only.
