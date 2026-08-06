# P0.4 Completion Report — Four Materials

**Sprint:** Production Recovery · P0.4  
**Status:** COMPLETE — **STOP** (do not start P0.5)  
**Authority:** Design Constitution §3 · Founder Law (manufactured, not assembled)  
**Constraint honored:** Materials only — no hierarchy · typography · spacing · navigation · motion · Brain · routing · features  
**Regression:** [`P0_4_BEFORE_AFTER.md`](./P0_4_BEFORE_AFTER.md)

---

## Objective

Unify every visible surface into **one material language**.  
Only four materials may exist: **Atmosphere · Soft Plate · Sheet Glass · Bloom**.

---

## Files touched

### Craft
| File | Change |
|------|--------|
| `craft/constitution.ts` | Manufactured fills (8% / 85%) · rim ≤6% · Soft Plate no blur · Sheet Glass rise · Elevated no blur · `V2_ATMOSPHERE` / scrim · `V2_FIELD` · `V2_CHIP` |
| `craft/index.ts` | `V2_CARD` / `SOFT` / `PANEL` / `SHEET` alias Constitution materials only |
| `craft/finish.ts` | Mission/Coach weight → Soft Plate settle (ring/shadow stack removed) |
| `craft/interaction.ts` | Press/hover light fill — no kit border invent |
| `craft/preparation.ts` | Skeleton uses plate radius |
| `craft/constitution.test.ts` | P0.4 four-material contract |
| `craft/finish.test.ts` | Soft Plate settle assertion |
| `shell/v2-calm-loading.test.ts` | Material identity assertions |

### Surfaces
| File | Change |
|------|--------|
| `for-child/ForChildPage.tsx` | Hollow Soft Plate shelves removed — Atmosphere + hope + quiet save |
| `today/TodayPage.tsx` | Separator border removed · focus → Soft Plate chip |
| `today/today.test.tsx` | Mission Soft Plate (no ring) |
| `today/mission/MissionSection.tsx` | Complete badge → Soft Plate chip |
| `ask-amy/AskAmyPage.tsx` | Conversation kit divider removed |
| `guest/GuestAccountRequiredSheet.tsx` | Atmosphere scrim (no second glass blur) |
| `front-door/FrontDoorPage.tsx` | Atmosphere field · Soft Plate tiles/field · selected soft fill |
| `premium/PremiumJourney.tsx` | Selected soft fill · error Soft Plate · success orb Soft Plate + Bloom ring |
| `coach-discovery/CoachPrepareProgress.tsx` | Soft Plate steps · Atmosphere pending |

---

## Material inconsistencies removed

| Inconsistency | Resolution |
|---------------|------------|
| Soft Plate used Sheet Glass blur | Soft Plate flat — blur Sheet Glass only |
| Soft Plate / cards used `bg-card` kit fill | `bg-foreground/[0.08]` (8%) |
| Sheet Glass milky `bg-card/95` | `bg-background/85` + blur 24 |
| Elevated Plate also blurred | Elevated = Soft Plate + one shadow only |
| Kit hairline `border-border/40` | Luminous rim `foreground/[0.06]` (≤8%) |
| `V2_CARD` hairline + `backdrop-blur-sm` | Alias → Soft Plate |
| Soft Plate + `shadow-sm` stack | Flat `shadow-none` |
| Mission `ring-1 ring-primary/10` | Removed — Soft Plate settle |
| Front Door kit tiles (`rounded-xl border bg-card`) | Soft Plate · selected denser fill |
| Front Door fake gradient field | Atmosphere `bg-background` |
| Premium plan `border-primary` + `shadow-sm` | Soft Plate selected fill |
| Coach prepare kit borders / primary wash | Soft Plate / Atmosphere |
| Guest scrim `backdrop-blur-sm` + black/40 | Atmosphere scrim only (glass on sheet) |
| For Child hollow Play/Learn/Care shelves | Deleted — Atmosphere until real content |
| Decorative `border-t` / `border-b` separators | Removed |
| Chip invent (`rounded-xl bg-primary/10`) | Soft Plate `V2_CHIP` |

---

## Duplicate materials removed

| Duplicate / fifth language | Disposition |
|----------------------------|-------------|
| Kit card (`bg-card` + hard border) | Eliminated in V2 |
| Fake glass on Soft Plate (`backdrop-blur-sm`) | Eliminated |
| Outlined selection (primary border) | → Soft Plate density |
| Mission ring material | → Soft Plate |
| Hollow shelf cards (For Child) | → Atmosphere (absence) |
| Scrim-as-glass | → Atmosphere dim only |
| Gradient Atmosphere invent | → plain Atmosphere |

---

## Remaining material debt

| Debt | Why deferred |
|------|----------------|
| Amy orb `ring-8 ring-primary/5` still Bloom theater on some panels | Glow policy polish (was Gap Plan P0.6) — Bloom presence retained intentionally |
| Premium “Best value” badge copy still present | Hierarchy / Premium silhouette (P1) — not material invent |
| Secondary Button `variant="outline"` may still paint shadcn kit border under Soft Plate peer | Component kit vs craft class — monitor; press hover already Soft Plate light |
| Lighting presets Morning/Evening/Night atmosphere density | P1.6 lighting — Atmosphere token is correct; density by preset later |
| Ask Amy conversation Soft Plate still a large empty plate | Content reduction (P1) — material is Soft Plate |
| Landing / Signup non-V2 materials | Not V2 shell-owned |
| Live PNG dogfood of opacity on device | Founder dogfood |

---

## Regression

| Check | Result |
|-------|--------|
| Vitest `src/v2` | **54 files · 393 tests passed** |
| Material-focused slice | **19 files · 82 tests passed** |
| Before/after | [`P0_4_BEFORE_AFTER.md`](./P0_4_BEFORE_AFTER.md) |

---

## Estimated production score

| Metric | Post-P0.3 | Post-P0.4 (est.) | Delta |
|--------|----------:|-----------------:|------:|
| Overall Design | ~76–78 | **82–85** | +6–7 |
| Consistency | ~82–85 | **88–91** | +6 |
| Calm | — | **+4–6** | quieter field |
| Luxury / Manufactured feel | — | **+8–10** | hollow shelves gone |
| Production Readiness | ~68–71 | **74–77** | +6 |
| Apple-Level | ~60–63 | **66–70** | +6–7 |

**Rationale:** Gap Plan material + For Child hollow removal landed together under P0.4. Surfaces answer “what material?” with one of four. Remaining caps: Today Law of three / hierarchy, Ask Amy reduction, lighting presets, Premium composition.

**Verdict unchanged:** ❌ Not Ready (expected). Material language manufactured; composition hierarchy still open.

---

## Founder observations

| Law | Observation |
|-----|-------------|
| What material is this? | Soft Plate / Sheet Glass / Elevated / Atmosphere / Bloom — no fifth answer in V2 shell |
| Manufactured, not assembled | One fill · one rim · one blur family · one elevated shadow |
| No decorative surfaces | Hollow For Child shelves deleted; kit borders/separators removed |
| Shadow = elevation | Soft Plate flat; Sheet Glass / Elevated use one rise shadow only |
| Selection without decoration | Denser Soft Plate fill — never primary outline |

Surfaces should feel **cut from one material system**, not pasted from a kit.

---

## Founder checklist (P0.4 slice)

- [x] Four materials only in V2 craft  
- [x] Soft Plate opacity + rim + flat settle  
- [x] Sheet Glass blur + tint + rise  
- [x] Bloom reserved for CTA (+ Amy presence ring retained)  
- [x] Atmosphere default / scrim  
- [x] For Child hollow cards removed  
- [ ] Today Law of three / peer hierarchy  
- [ ] Lighting presets lived  
- [ ] Constitution fully lived across all product (incl. legacy)  

---

## STOP

P0.4 complete.  
Do **not** begin P0.5 until Founder directs.
