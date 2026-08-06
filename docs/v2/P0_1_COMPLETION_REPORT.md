# P0.1 Completion Report — Constitution Tokens

**Sprint:** Production Recovery · P0.1  
**Status:** COMPLETE — **STOP** (do not start P0.2)  
**Authority:** [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) · [`PRODUCTION_GAP_CLOSURE_PLAN.md`](./PRODUCTION_GAP_CLOSURE_PLAN.md)  
**Constraint honored:** No redesign · no features · no Brain · no routing · no architecture  
**Regression:** [`P0_1_REGRESSION_BEFORE_AFTER.md`](./P0_1_REGRESSION_BEFORE_AFTER.md)

---

## Objective

Every V2 screen consumes the same visual tokens. No screen owns magic styling.

---

## Files touched

### Created
| File | Role |
|------|------|
| `artifacts/kidschedule/src/v2/craft/constitution.ts` | Locked Design Constitution tokens |
| `artifacts/kidschedule/src/v2/craft/constitution.test.ts` | Token contract tests |
| `docs/v2/P0_1_REGRESSION_BEFORE_AFTER.md` | Before/after token contract |
| `docs/v2/P0_1_COMPLETION_REPORT.md` | This report |

### Modified (craft)
| File | Change |
|------|--------|
| `craft/index.ts` | Facade → Constitution surfaces / CTA / exports |
| `craft/interaction.ts` | Motion + press from Constitution |
| `craft/interaction.test.ts` | Updated expectations |
| `craft/finish.ts` | Scroll clearance, nav icon, elevation tokens |
| `craft/finish.test.ts` | Nav icon assertion |

### Modified (surfaces)
| File |
|------|
| `today/TodayPage.tsx` |
| `ask-amy/AskAmyPage.tsx` |
| `for-child/ForChildPage.tsx` |
| `premium/PremiumJourney.tsx` |
| `premium/AccountRequiredGate.tsx` |
| `coach-discovery/CoachDiscoveryPage.tsx` |
| `coach-discovery/CoachDiscoveryCard.tsx` |
| `coach-discovery/CoachPrepareProgress.tsx` |
| `today/mission/MissionSection.tsx` |
| `today/mission/MissionPlayPage.tsx` |
| `today/mission/MissionSuccess.tsx` |
| `front-door/FrontDoorPage.tsx` |
| `guest/GuestAccountRequiredSheet.tsx` |
| `navigation/V2MobileTabBar.tsx` |
| `shell/V2CalmPrepare.tsx` |
| `shell/v2-calm-loading.test.ts` |

---

## Tokens created

| Domain | Tokens |
|--------|--------|
| **Typography** | `V2_TYPE.hero` · `body` · `caption` · `cta` · `brandMark` |
| **Spacing** | `V2_SPACE_PX` 8→64 · `V2_SPACE.*` class map · `edgeX` · `shellY` · `chapter` · `platePad` · `sheetPad` |
| **Radius** | `V2_RADIUS.button` 26 · `plate` 28 · `field` 20 |
| **Blur** | `V2_BLUR.sheet` · `nav` (24px) |
| **Glow** | `V2_GLOW.none` · `bloom` · `orb` |
| **Elevation** | `V2_ELEVATION.none` · `plate` · `elevated` · `bloom` |
| **Surface opacity** | `V2_SURFACE_FILL.softPlate` · `sheetGlass` · `elevated` |
| **Shadow** | via elevation tokens |
| **Border** | `V2_BORDER.none` · `rim` · `hairline` |
| **Motion** | `V2_DURATION_MS` 120/220/320/480 · `V2_EASE` · `V2_FADE_RISE_PX` |
| **Button** | `V2_BUTTON` · `V2_BLOOM_CTA` · `V2_PRESS_SCALE` 0.97 |
| **Navigation** | `V2_NAV.height` · `icon` · `blur` · `iconLabelGap` |
| **Orb** | `V2_ORB.md` · `lg` · `ring` |
| **Light** | `V2_LIGHT.morning` · `evening` · `night` (ids; atmosphere classes → P1.6) |
| **Shell** | `V2_SHELL` · `V2_SHELL_RITUAL` · `V2_SCROLL_CLEARANCE` |
| **Surfaces** | `V2_SOFT_PLATE` · `V2_SHEET_GLASS` · `V2_ELEVATED_PLATE` |

Wired aliases: `V2_CARD` · `V2_CARD_SOFT` · `V2_CARD_PANEL` · `V2_SHEET` · `V2_CTA` · `V2_SCROLL_PAD`.

---

## Tokens removed / replaced (magic)

| Removed magic | Replaced by |
|---------------|-------------|
| Per-screen `px-4` / `px-5` shell edges | `V2_SPACE.edgeX` |
| Per-screen `gap-8` / `gap-10` chapters | `V2_SPACE.chapter` |
| `pb-28` | `V2_SCROLL_CLEARANCE` |
| `h-12 rounded-xl` CTA | `V2_BLOOM_CTA` |
| `h-[64px]` nav | `V2_NAV.height` |
| `gap-1` nav icon gap | `V2_NAV.iconLabelGap` |
| Ad-hoc motion 80/200/260 | Constitution 120/220/320 |
| Mixed press scales 0.98–0.99 | `0.97` |
| Literal `backdrop-blur-xl` on nav | `V2_NAV.blur` |
| `p-5` sheet / coach pad | `V2_SPACE.platePad` / `sheetPad` |
| Hardcoded orb `h-14`/`h-16` + ring | `V2_ORB.*` |
| Front Door loud wordmark class | `V2_TYPE.brandMark` |
| Duplicate shell class strings ×10 files | `V2_SHELL` / `V2_SHELL_RITUAL` |

---

## Duplicates removed

- Ten copies of `mx-auto flex w-full max-w-lg flex-col gap-* px-* py-*` → one `V2_SHELL`
- Dual easing paths (EASE_SOFT + EASE_WARM) in V2 interaction → one `V2_EASE`
- Three press scales → one `V2_PRESS_SCALE`
- Card radius/border/fill invented via `CARD_BASE` mix → Constitution radius/border/fill composition

---

## Remaining debt (not P0.1)

| Debt | Owner sprint |
|------|----------------|
| Off-ladder micros still inside some components (`space-y-3`, `mt-3`, `gap-3`, borders+pt) | **P0.2** ladder enforcement |
| Nav underline + heavy shelf shadow | **P0.5** whisper nav |
| Mission `ring-1` glow | **P0.6** single glow |
| Today Law of three / chapter peers | **P0.3** |
| For Child hollow cards | **P0.4** |
| Soft Plate fill still `bg-card` (not 6–10% yet) | Material finish with P0.6 / surfaces |
| Hairline borders still on plates | Material reduction |
| `V2_TYPE.*` not yet on every headline (selective apply) | Continue in P0.2–P1 without redesign |
| Lighting atmosphere classes for Morning/Evening/Night | **P1.6** |
| Live PNG screenshots in device dogfood | Founder dogfood pass |

---

## Regression

| Check | Result |
|-------|--------|
| Vitest (craft + V2 surfaces) | **13 files · 56 tests passed** |
| Before/after token contract | [`P0_1_REGRESSION_BEFORE_AFTER.md`](./P0_1_REGRESSION_BEFORE_AFTER.md) |
| PNG screenshots | Deferred to live dogfood (no running V2 preview in this sprint); class contract captured |

---

## Production score estimate

| Metric | Pre-P0.1 | Post-P0.1 (est.) | Delta |
|--------|---------:|-----------------:|------:|
| Overall Design | 58 | **66–68** | +8–10 |
| Consistency | 44 | **62–66** | +18–22 |
| Production Readiness | 52 | **58–60** | +6–8 |
| Apple-Level | 48 | **52–54** | +4–6 |
| Craftsmanship | 55 | **60–62** | +5–7 |

**Rationale:** P0.1 lands the token spine (Gap Plan P0-1 ~+10). Hierarchy, hollow cards, nav chrome, and multi-glow remain — those unlock the rest of the climb to ~85 (full P0).

**Verdict unchanged:** ❌ Not Ready (expected). P0.1 is foundation only.

---

## Founder checklist (P0.1 slice)

- [x] Typography tokens exist (unified consumption started)  
- [x] One button anatomy token (`V2_BLOOM_CTA`)  
- [x] Navigation height/icon/blur tokenized (chrome policy → P0.5)  
- [ ] One lighting system (ids only; atmospheres → P1.6)  
- [ ] One Nest world (background → later)  
- [x] Motion unified to Constitution family  
- [x] Surface system tokenized (Soft Plate / Sheet Glass / Elevated)  
- [x] Components canonical via craft facade  
- [ ] Visual debt removed (partial — magic shell/CTA/motion gone)  
- [ ] Constitution fully respected (token spine yes; lived hierarchy/nav/glow no)

---

## STOP

P0.1 complete.  
Do **not** start P0.2 until Founder directs.
