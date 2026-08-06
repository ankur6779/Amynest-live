# CSS Component Audit — Phase 1

**Scope:** Every V2 Nest surface under `artifacts/kidschedule/src/v2/` + Nest craft facade  
**Mode:** Audit + manufacturing note — no product redesign  
**Companion:** [`CSS_TRANSLATION_PHASE1.md`](./CSS_TRANSLATION_PHASE1.md) · [`CSS_DEBT_REPORT.md`](./CSS_DEBT_REPORT.md)

---

## Audit method

For each component: **DELETE · MERGE · WHISPER · EMPHASIZE**  
Then: consumes ONE system? Magic values? Duplicate CSS?

---

## Craft system (source)

| Module | Verdict | Notes |
|--------|---------|-------|
| `nest-presence-system.css` | **EMPHASIZE** | NEW — single CSS lock file |
| `constitution.ts` | **MERGE** | Binds CSS vars; adds `V2_LAYOUT` · `V2_MEASURE` · secondary/ghost CTA |
| `interaction.ts` | **KEEP** | Press / focus / busy — Constitution durations |
| `motion.ts` | **EMPHASIZE** | NEW Nest variants; replaces SaaS fade |
| `preparation.ts` | **DELETE** SaaS skeleton → Nest pulse |
| `lighting.ts` + `v2-lighting.css` | **KEEP** | Hour light only; imports system first |
| `nav.ts` / `finish.ts` / `hierarchy.ts` | **KEEP** | Whisper instruments |
| `index.ts` | **DELETE** experience-system re-exports |

---

## Room surfaces

| Component | Room | System? | Action | Residual |
|-----------|------|---------|--------|----------|
| `FrontDoorPage` | Vestibule | Yes | MERGE layout + motion | Step-local structure OK |
| `TodayPage` | Living | Yes | MERGE measure | Law of three content = frozen product |
| `MissionSection` | Practice entry | Yes | — | — |
| `MissionPlayPage` | Practice | Yes | MERGE measure + transition | — |
| `MissionSuccess` | Practice | Yes | Nest fade | — |
| `CoachDiscoveryPage` | Study | Yes | — | — |
| `CoachDiscoveryCard` | Study | Yes | Soft Plate | — |
| `CoachPrepareProgress` | Study | Yes | MERGE type/duration | — |
| `AskAmyPage` | Hearing | Yes | MERGE layout/measure | Assistant black-box chrome |
| `PremiumJourney` | Continuity | Yes | Nest craft | Store sheet after continue |
| `AccountRequiredGate` | Continuity | Yes | — | — |
| `ForChildPage` | Child | Yes | — | — |
| `GuestAccountRequiredSheet` | Gate | Yes | MERGE sheet motion/type | `max-w-md` sheet width OK |
| `GuestAccountCta` | Living whisper | Yes | — | — |
| `V2MobileTabBar` | Nav | Yes | Nest nav tokens | Classic tab bar still SaaS (out of Nest) |
| `V2CalmPrepare` | Shell | Yes | MERGE caption | — |
| `V2SectionSkeleton` | Shell | Yes | Nest skeleton | — |
| `V2CalmLoadingShell` | Shell | Yes | — | — |
| `sign-up` Keep | Keep | Yes | Prior Recovery | — |
| `landing` Nest path | Threshold | Partial | MERGE button height | Legacy landing branches still kit |

---

## Token coverage matrix

| Concern | Token | Consumed by rooms |
|---------|-------|-------------------|
| Typography | `V2_TYPE.*` | All Nest rooms |
| Spacing | `V2_SPACE` / `V2_SPACE_PX` | All Nest rooms |
| Soft Plate | `V2_SOFT_PLATE` / `V2_CARD` | Lists / cards |
| Sheet Glass | `V2_SHEET` | Guest sheet |
| Bloom CTA | `V2_CTA` + `V2_PRESS_PRIMARY` | Primaries |
| Orb | `V2_ORB_EMIT` | Vestibule / Hearing / Living |
| Nav | `V2_NAV_*` | `V2MobileTabBar` |
| Prepare | `V2_PREPARE_*` | Shell / Study prepare |
| Layout | `V2_LAYOUT` | Vestibule / Hearing / sheet Z |
| Measure | `V2_MEASURE.hero` | Living / Practice / Hearing |
| Motion | `V2_TRANSITION` · `fadeIn` · `fadeUp` | Animated Nest pages |

---

## Duplicated CSS removed

| Removed from Nest path | Was |
|------------------------|-----|
| Craft → `CARD_BASE` / `RADIUS` / `SCREEN_SPACING` | SaaS dual materials |
| Craft → `SKELETON_BASE` / `premium-skeleton` | SaaS shimmer |
| Craft → `MOTION_MS` / `TRANSITION` / `PRESS_FEEDBACK` | SaaS motion (Nest uses `V2_*`) |
| `heroCompact` 34px | Second hero size |
| Page `duration: 0.22` invents | Now `V2_TRANSITION.card` |
| Sheet `y: 12` | Now `V2_FADE_RISE_PX` |
| Ad-hoc `text-sm` / `text-xl` on prepare / sheet / calm | Constitution type roles |
| Magic stage `min-h-[50vh]` / `40vh` / `100dvh` | `V2_LAYOUT.*` |

---

## Shared tokens adopted (this phase)

- `--v2-type-*` · `--v2-radius-*` · `--v2-blur-*` · `--v2-fill-*` · `--v2-elevation-*` · `--v2-button-height` · `--v2-icon-nav` · `--v2-shell-max` · `--v2-space-8` (scroll clearance)
- `V2_LAYOUT` · `V2_MEASURE` · `V2_SECONDARY_CTA` · `V2_GHOST_CTA`
- Nest `fadeIn` / `fadeUp` · `.v2-prepare-skeleton`

---

## Visual consistency audit (rooms)

| Check | Result |
|-------|--------|
| Same Soft Plate radius/fill | **PASS** |
| Same Bloom height/radius | **PASS** |
| Same Sheet Glass blur/elevation | **PASS** |
| Same caption/body/hero optical | **PASS** (vars) |
| Same press scale / micro duration | **PASS** |
| Same prepare language | **PASS** |
| Classic engines match Nest | **FAIL** — debt (Assistant, learning engines) |
| Classic mobile tab bar | **FAIL** — uses experience-system (non-Nest shell) |

---

## STOP

Phase 1 audit complete. Remaining debt → [`CSS_DEBT_REPORT.md`](./CSS_DEBT_REPORT.md).
