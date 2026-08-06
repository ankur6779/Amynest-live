# P0.4 Before / After — Four Materials

**Sprint:** P0.4 Materials only  
**Law:** Atmosphere · Soft Plate · Sheet Glass · Bloom  
**Not changed:** hierarchy · typography · spacing · navigation · motion · Brain · routing · features

---

## Violation → canonical

| Before | After | Material |
|--------|-------|----------|
| `bg-card` / `bg-card/95` kit fills | `bg-foreground/[0.08]` · `bg-background/85` | Soft Plate · Sheet Glass |
| Soft Plate + `backdrop-blur-[24px]` | Soft Plate **no blur** | Soft Plate |
| Soft Plate + `shadow-sm` | `shadow-none` | Soft Plate |
| Elevated + blur | Elevated Soft Plate + one shadow | Elevated (Soft Plate + lift) |
| `border-border/40` hairline | `border-foreground/[0.06]` rim | Soft Plate / Glass edge |
| `V2_CARD` hairline + `blur-sm` | `V2_SOFT_PLATE` | Soft Plate |
| Mission `ring-1 ring-primary/10` | Soft Plate settle | Soft Plate |
| Front Door gradient nest | `V2_ATMOSPHERE` | Atmosphere |
| Choice tiles `rounded-xl border bg-card` | `V2_CARD` Soft Plate | Soft Plate |
| Selected `border-primary bg-primary/5` | `softPlateSelected` denser fill | Soft Plate |
| Input `border-border bg-card` | `V2_FIELD` | Soft Plate field |
| Guest scrim blur + black/40 | `V2_ATMOSPHERE_SCRIM` | Atmosphere |
| For Child empty shelves | Removed | Atmosphere |
| `border-t` / `border-b` kit rules | Removed | Atmosphere spacing |
| Chip `bg-primary/10 rounded-xl` | `V2_CHIP` | Soft Plate pill |
| Coach prepare kit borders | Soft Plate / Atmosphere | Soft Plate |
| Skeleton `rounded-2xl` | Plate radius 28 | Soft Plate prepare |

---

## Material identity map

| Instrument | Token | Answers “What material?” |
|------------|-------|--------------------------|
| Page field | `V2_ATMOSPHERE` | Atmosphere |
| Sheet dim | `V2_ATMOSPHERE_SCRIM` | Atmosphere |
| Mission / Coach / lists / prompts | `V2_SOFT_PLATE` / `V2_CARD` / `V2_CARD_SOFT` | Soft Plate |
| Success / rare lift | `V2_ELEVATED_PLATE` / `V2_CARD_PANEL` | Soft Plate + elevation |
| Guest sheet / dialog | `V2_SHEET_GLASS` / `V2_SHEET` | Sheet Glass |
| Nav bar (P0.3) | Sheet Glass fill + blur · no shelf | Sheet Glass |
| Input | `V2_FIELD` + `V2_INPUT` | Soft Plate |
| Chip / badge | `V2_CHIP` | Soft Plate |
| Primary CTA | `V2_BLOOM_CTA` + Bloom press | Bloom |
| Selected row | Soft Plate + `softPlateSelected` | Soft Plate |

---

## Screen materials (visual)

| Surface | Field | Objects | Notes |
|---------|-------|---------|-------|
| Today | Atmosphere | Mission Soft Plate · Coach Soft Plate · focus chip Soft Plate | No separator border |
| Ask Amy | Atmosphere | Prompt Soft Plates · conversation Soft Plate | No header hairline |
| For Child | Atmosphere | *(none)* | Hollow shelves gone |
| Mission Play | Atmosphere | Steps Soft Plate | — |
| Mission Success | Atmosphere | Elevated panel | One lift |
| Guest sheet | Atmosphere scrim | Sheet Glass sheet | Blur only on sheet |
| Front Door | Atmosphere | Soft Plate choices · Soft Plate field · light progress | No fake gradient |
| Premium | Atmosphere | Soft Plate plans · Elevated success | Selection = density |
| Coach prepare | Atmosphere | Soft Plate active/done steps | Pending floats |

---

## Out of scope (audited, not redesigned)

| Item | Why |
|------|-----|
| Today peer hierarchy / Law of three | Hierarchy sprint |
| Nav whisper anatomy | Locked P0.3 — Sheet Glass fill updated via shared token only |
| Motion durations / press scale | Motion freeze |
| Type scales / spacing ladder | Frozen |
| Amy orb ring strength | Bloom presence — glow fine-tune later |
| Landing / Signup | Not V2-owned |

---

## Founder lens

| Before feel | After feel |
|-------------|------------|
| Assembled kit cards | Manufactured Soft Plate |
| Soft Plate that looked like glass | Soft Plate settles; glass rises |
| Selection as outline candy | Selection as denser plate |
| Empty shelves pretending to be places | Atmosphere honesty |
| Borders decorating chapters | Air separating chapters |
