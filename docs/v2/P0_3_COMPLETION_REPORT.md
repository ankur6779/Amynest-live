# P0.3 Completion Report — Whisper Navigation

**Sprint:** Production Recovery · P0.3  
**Status:** COMPLETE — **STOP** (do not start P0.4)  
**Authority:** Design Constitution §4 · Founder Additions (furniture, quieter)  
**Constraint honored:** Navigation only — no hierarchy · typography · spacing · lighting · motion · redesign · new features  
**Regression:** [`P0_3_BEFORE_AFTER.md`](./P0_3_BEFORE_AFTER.md)

---

## Objective

Create **one permanent navigation language**. Navigation disappears — parents notice the journey, never the chrome.

---

## Files touched

### Craft
| File | Change |
|------|--------|
| `craft/constitution.ts` | Expanded `V2_NAV` — bar, safeBottom, tabActive/Inactive, progressTrack/Fill |
| `craft/nav.ts` | **New** — `V2_NAV_BAR`, `v2NavTabClass`, `V2_NAV_BACK`, `V2_NAV_DISMISS`, progress tokens |
| `craft/index.ts` | Export whisper nav primitives |
| `craft/constitution.test.ts` | P0.3 whisper contract assertions |

### Surfaces
| File | Change |
|------|--------|
| `navigation/V2MobileTabBar.tsx` | Sheet Glass · soft-fill · labels Today/Help/Child · no underline · no shelf |
| `navigation/v2-nav.test.tsx` | Whisper labels · soft-fill · no indicator nodes |
| `ask-amy/AskAmyPage.tsx` | `V2_NAV_BACK` + icon-22 · `V2_NAV_DISMISS` exit |
| `today/mission/MissionPlayPage.tsx` | Same back anatomy (icon-only + sr-only) |
| `today/mission/MissionSuccess.tsx` | Tertiary exit → `V2_NAV_DISMISS` |
| `guest/GuestAccountRequiredSheet.tsx` | Not right now → `V2_NAV_DISMISS` |
| `coach-discovery/CoachDiscoveryPage.tsx` | Not now / back today → `V2_NAV_DISMISS` |
| `premium/AccountRequiredGate.tsx` | Back today → `V2_NAV_DISMISS` |
| `front-door/FrontDoorPage.tsx` | Progress light track/fill · skip → `V2_NAV_DISMISS` |

---

## Navigation inconsistencies removed

| Inconsistency | Resolution |
|---------------|------------|
| Underline active indicator | Removed — soft fill light only |
| Shelf shadow / hard top border on tab bar | `border-0` · `shadow-none` · Sheet Glass |
| Labels “Quick help” / “For Child” | **Help** / **Child** (personalized still `For {name}`) |
| Icon size / stroke invented per screen | `V2_NAV_ICON` (22) + `V2_ICON_STROKE` |
| Ask Amy vs Mission back anatomy | One `V2_NAV_BACK` · icon-only + accessible label |
| Ghost dismiss using ad-hoc `V2_PRESS_GHOST` | Shared `V2_NAV_DISMISS` on sheet/modal/skip exits |
| Front Door progress Bloom (`bg-primary`, `h-1.5`) | Light mist track/fill (`foreground` opacity) |
| Safe-area under bar | `pb-[env(safe-area-inset-bottom)]` on bar |
| Height magic | Content **56** (`h-14`) + safe-area |

---

## Remaining navigation debt

| Debt | Why deferred |
|------|----------------|
| Personalized tab label `For {name}` longer than “Child” | Product warmth; Constitution allows caption personalization |
| Mission Success “Back to today” still a primary/secondary CTA | Journey exit, not chrome — not forced into dismiss anatomy |
| Today Premium ghost still `V2_PRESS_GHOST` | Feature entry CTA, not nav dismiss |
| GuestAccountCta still appends `V2_PRESS_GHOST` under className | Harmless overlap when callers pass `V2_NAV_DISMISS` |
| Ask Amy / Today **content** still says “Quick help” | Content copy, not nav chrome (P1 Ask Amy reduction) |
| Desktop / `lg:hidden` — no desktop rail | Product is mobile-first whisper strip |
| Nav transitions are class/press only | Visual transition polish stays within existing motion tokens — no new motion language |
| Landing / Signup chrome | Not V2 shell-owned |

---

## Regression

| Check | Result |
|-------|--------|
| Vitest `src/v2` | **54 files · 392 tests passed** |
| Nav + constitution + today + guest sheet + ask-amy + front-door | **7 files · 35 tests** (focused slice) |
| Before/after | [`P0_3_BEFORE_AFTER.md`](./P0_3_BEFORE_AFTER.md) |

---

## Production score estimate

| Metric | Post-P0.2 | Post-P0.3 (est.) | Delta |
|--------|----------:|-----------------:|------:|
| Overall Design | ~72–74 | **76–78** | +4 |
| Consistency | ~74–78 | **82–85** | +6–8 |
| Calm | — | **+5–7** | chrome quieter |
| Production Readiness | ~64–66 | **68–71** | +4–5 |
| Apple-Level | ~56–58 | **60–63** | +4–5 |

**Rationale:** One whisper instrument for bottom · back · dismiss · progress. Soft-fill active uses light, not Bloom. Remaining caps: For Child hollow cards (P0.4), Today Law of three / hierarchy, multi-glow (P0.6), Ask Amy content reduction (P1).

**Verdict unchanged:** ❌ Not Ready (expected). Navigation furniture now holds; composition debt remains.

---

## Founder observations

Answers to Founder questions (this sprint):

| Question | Observation |
|----------|-------------|
| Can navigation become quieter? | Yes — shelf, underline, Bloom progress, long labels removed. |
| Can labels become shorter? | Yes — Help · Child (caption). Personalized first name retained when known. |
| Can active rely on light instead of color? | Yes — `bg-foreground/[0.06]` soft fill; no primary bar. |
| Can parents forget navigation exists? | Closer — furniture, not decoration. Still present as Sheet Glass whisper; success = journey focus, not chrome absence. |

Laws held:

- Navigation is furniture — never decoration.  
- No oversized pills · no floating experiments · no underline · no shelves.  
- Design Constitution frozen — no redesign outside Navigation.

---

## Founder checklist (P0.3 slice)

- [x] One whisper bottom nav  
- [x] Sheet Glass · blur 20–24 · height 56 + safe-area  
- [x] Icons 22 · caption labels  
- [x] Soft-fill active · mist inactive  
- [x] One back anatomy  
- [x] One dismiss language  
- [x] Progress as light instrument  
- [ ] For Child hollow cards → **P0.4**  
- [ ] Today Law of three / hierarchy  
- [ ] Multi-glow / Mission ring → later P0  
- [ ] Constitution fully lived across all materials  

---

## STOP

P0.3 complete.  
Do **not** begin P0.4 until Founder directs.
