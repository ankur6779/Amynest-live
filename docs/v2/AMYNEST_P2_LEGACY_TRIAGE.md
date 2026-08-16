# AmyNest P2 Legacy Residue Triage

**Date:** 2026-08-16  
**Mode:** Audit + decision map only. No implementation.  
**Sources:** `docs/v2/AMYNEST_FULL_LEGACY_RESIDUE_AUDIT.md`, `docs/v2/AMYNEST_P1_LEAVE_PATH_REMEDIATION_REVIEW.md`  
**Scope:** Remaining P2/P3 inventory after P1 leave-path containment.  
**Not in scope:** P0/P1 reopen, approved living interiors, Final Apple Audit, engines, APIs, DB, flags, copy changes.

Classification used:

| Code | Meaning |
|---|---|
| **A** | MUST FIX BEFORE RELEASE |
| **B** | SHOULD FIX BEFORE APPLE |
| **C** | ACCEPTABLE P2 DEBT |
| **D** | ROLLBACK/LEGACY SAFE |
| **E** | DEAD/ORPHANED — NO USER IMPACT |

Desired outcome: **zero material legacy user experience in the normal living production journey.**  
Not desired: zero leftover code.

---

## Executive Summary

P1 accidental production escapes are cleared. FA-02 still holds. A parent who stays on Home → Today's plan → Beside you → Rooms → a manufactured interior still remains inside AmyNest.

The remaining P2 list is **not a second accidental universe**. It is a mix of:

- **Intentional Grow leaves** whose interiors were never remanufactured (`/study`, phonics Practice library).
- **URL-only bookmarks** (`/welcome`, `/environment`).
- **Approved living rooms with leftover deepen panels** (Nutrition, Health Lab grown-up notes).
- **Paywall / debug / More quiet leftovers**.
- **Dead code and system 404 voice**.

**No item is A (must fix before release).**  
**No item is a remaining P1 accidental escape.**  
**Another remediation pass is not justified** unless Apple review specifically walks Grow Quiet study, expands Phonics Practice library, or opens More → Quick help.

Accepted debt is the correct default. The leftover that can still *feel* mixed, if a parent chooses those secondary paths, is Grow → Quiet study / Sounds & letters deepen — not More catalogues, not tab-bar chrome, not Games/Rewards/Insights.

---

## P2/P3 inventory

| # | Item | Class | Production reachable | Living reachable | Normal parent | Another-product feeling |
|---|---|---|---|---|---|---|
| 1 | `/study` interior | **C** | YES | YES (Grow leave + URL) | Only if Grow “Quiet study” or typed URL | Mixed interior; not a catalogue escape |
| 2 | Phonics Practice library | **C** | YES | YES (Grow Sounds & letters) | Only if they expand `<details>` | Academy widgets behind a quiet summary |
| 3 | `/welcome` | **C** | YES (URL) | NO nav | NO | Old marketing storefront; `/begin` is the door |
| 4 | `/environment` | **C** | YES (URL) | NO nav | NO | SaaS weather dashboard; URL only |
| 5 | Nutrition deepen / More care | **C** | YES | YES | YES after living open | Living secondary care, leftover panels |
| 6 | Health Lab shop HUD | **D** | YES in rollback | NO | NO | Shop/coins HUD is `!living` only |
| 7 | Paywall next-unlocks | **C** | YES (after a gate) | YES if paywall opens | Only after a gated action | Theatre on the store, not the home |
| 8 | Debug overlay / panel | **C** | Only if armed | Overlay off in prod hosts | NO | Developer chrome, not a product |
| 9 | More → Quick help / Patterns / Recipes | **C** | YES | YES | YES if they open More | Quiet utilities; Quick help is the leftover tutor |
| 10 | Dead nav items | **E** | NO | NO | NO | None |
| 11 | Unused Astro assets | **E** | Hub astro section hidden | Birth Sky living uses cosmic art by design | NO as leftover hub | None as unused files |
| 12 | 404 voice | **C** | YES (unknown URL) | System catch-all | Only on a bad URL | Generic system, not another product |

**A count: 0. B count: 0. Implementation justified now: none.**

---

## 1. `/study` interior

**Class: C — ACCEPTABLE P2 DEBT**

| Field | Finding |
|---|---|
| Exact route | `/study` |
| Exact user path | Rooms → Understand → Grow → quiet path **Quiet study** (age ≥ 48 months) → launch card → `/study`. Direct URL still works. **Not in living More.** Not in `LIVING_DIRECT_URL_CONTAINMENT` (intentional Grow leave). |
| Production reachable? | **YES** |
| Living universe reachable? | **YES** |
| Visible to normal parent? | **Only if they choose Grow Quiet study** or type the URL. Grow recommend is Sounds (younger) or Numbers (older) — not Study. |
| Another-product feeling? | **Partial.** Header is living (“Today's growth” / “Quiet study”) + `AmyNestLeaveContinuity`. Body is still `study-zone-premium`: GraduationCap, XP popup, confetti, Trophy, `EngagementStrip`, curriculum, MODE_LABELS “Play & Learn / Basic Learning / Advanced Study”. Empty-state i18n still says “Smart Study Zone”. |
| Severity | P2 mixed leave interior. Not a P1 accidental catalogue. |
| Recommended action | **Accept.** Do not redesign Study. A later quiet first-frame wrap is optional Apple polish, not a release blocker. |
| Implementation justified? | **NO** for this order or a release gate. Full remanufacture is frozen. Containment of More `/study` already landed in P1. |

**Evidence:** `lib/grow/living-room.ts` (`Quiet study`, age ≥ 48), `components/grow/grow-living-stream.tsx`, `pages/parenting-hub.tsx` `LearningZoneLaunchCard` `href="/study"`, `pages/study.tsx` living title vs `STUDY_PAGE`, `lib/living-leave-containment.ts` (`/study` filtered from More, not redirected).

Does this materially break AmyNest? **Not on the normal journey.** It is the strongest remaining *chosen* Grow leave that still looks like study-zone. That is accepted living-leave debt.

---

## 2. Phonics Practice library

**Class: C — ACCEPTABLE P2 DEBT**

| Field | Finding |
|---|---|
| Exact route | `/phonics` (inside `PhonicsV2`) |
| Exact user path | Rooms → Understand → Grow → **Sounds & letters** (Grow recommend for age < 54 months) → launch card → `/phonics` → optional expand **Practice library** `<details>`. |
| Production reachable? | **YES** |
| Living universe reachable? | **YES** |
| Visible to normal parent? | First frame of Sounds & letters: **yes**. Practice library widgets: **only after expanding the collapsed `<details>`**. |
| Catalogue / marketplace language? | **Inside the details:** `ReadingAcademyHub` (living eyebrow becomes “Sounds & letters”; still shows level grid, Group N, books, achievements). “My level story”. `ReadingParentDashboard`. Not a paid workbook store. |
| Unlock theatre? | **P1 unlock card is contained** (“Printable practice”). Practice library is not “Unlock 15 Complete Phonics Workbook Sets”. Residual lock/achievement chrome exists inside the details. |
| Grow → Sounds still another product? | **Not on the first frame.** Expanding Practice library reopens academy widgets. |
| Severity | P2 secondary deepen. |
| Recommended action | **Accept.** Do not modify the phonics engine. Optional later: keep Practice library collapsed and quiet, or hide academy widgets when Grow living is ON. |
| Implementation justified? | **NO** now. P1 already removed the marketplace card. Extra click is enough containment for release. |

**Evidence:** `components/phonics-v2/PhonicsV2.tsx` (`<details>` / “Practice library” / `ReadingAcademyHub`), `components/phonics-learning.tsx` (`PhonicsV2` always mounted; `PhonicsDownloadCard` living branch), `lib/grow/living-room.ts` `livingGrowAcademyEyebrow()`.

---

## 3. `/welcome`

**Class: C — ACCEPTABLE P2 DEBT** (marketing bookmark; keep)

| Field | Finding |
|---|---|
| Exact route | `/welcome` → `LandingPage` |
| Exact user path | Typed URL / old bookmark only. `/` does not go here. Sign-in / sign-up do not link here. `production-door-p1.test.ts` asserts first experience no longer routes into `/welcome`, and landing contains `welcome-enter-begin` → `/begin`. |
| Production reachable? | **YES** (direct URL) |
| Living universe reachable? | **NO** from living nav / CTAs |
| Visible to normal parent? | **NO** |
| Another-product feeling? | Purple/pink storefront + store badges. Copy is still AmyNest (“Know what your child needs most today”). Not the signed-in home. |
| Second production universe? | **No for normal users.** `/begin` remains the production door. Keeping `/welcome` as marketing is acceptable. |
| Severity | P2 URL-only. |
| Recommended action | **Keep.** Do not remove `/welcome`. Do not redirect unless a later Apple pass wants bookmark hygiene. |
| Implementation justified? | **NO.** |

**Evidence:** `AppCore.tsx` `<Route path="/welcome" component={LandingPage} />`, `pages/landing.tsx`, `lib/production-door-p1.test.ts`.

---

## 4. `/environment`

**Class: C — ACCEPTABLE P2 DEBT** (URL-only internal dashboard)

| Field | Finding |
|---|---|
| Exact route | `/environment` |
| Exact user path | Typed URL only. No `href="/environment"` in production UI. Not in `NAV_ITEMS` / living More. Dashboard/routines fetch `/api/environment/context` for weather intelligence — they do **not** open this page. |
| Production reachable? | **YES** if typed (protected route) |
| Living universe reachable? | **NO** via nav/CTA |
| Visible to normal parent? | **NO** |
| Intended audience | Internal / weather-AQI intelligence surface (“Today's Environment”, “What Amy AI Considers”, Open-Meteo, risk score). Not a family room. |
| Should it remain accessible? | **Yes as rollback/internal URL.** Not a production destination. |
| Another-product feeling? | SaaS dashboard **if reached**. Unreachable in the living journey. |
| Severity | P2 URL-only. |
| Recommended action | **Leave.** Do not add to nav. Do not delete the engine. |
| Implementation justified? | **NO.** |

**Evidence:** `AppCore.tsx` `EnvironmentRoute`, `pages/environment.tsx`, grep shows no in-app `href="/environment"`.

---

## 5. Nutrition deepen / More care

**Class: C — ACCEPTABLE P2 DEBT**

| Field | Finding |
|---|---|
| Exact route | `/nutrition` |
| Exact user path | More → Nutrition, or Rooms → Care → Nutrition. Living opening is the approved Care room. Recommend / quiet paths call `onDeepen(tab)` and mount `NutritionSectionPanel` (`today` / `plan` / `learn` / `track` / `family`). **More care** is a collapsed toggle: score summary, weekly story, household board, discovery hints, growth link, disclaimer. |
| Production reachable? | **YES** |
| Living universe reachable? | **YES** |
| Visible to normal parent? | Opening: **YES**. Deepen: **YES** if they take a quiet path. More care: **only if they expand it**. |
| Living secondary care? | **YES.** Quiet paths are Care language (“Today's meal”, “Week plan”, “Notice”). `NutritionTopNav` 5-tab mall is **not** mounted when living. |
| Legacy product catalogue? | **NO.** |
| Cosmetic residue? | Deepen still renders the existing nutrition pages (meal planner chrome). More care still has score/story/household. `NutritionGrowthLink` still points at `/progress`, which **living containment redirects to `/dashboard`**. |
| One-home inconsistency? | Mild after deepen. Opening remains the approved living room. |
| Severity | P2 after deepen. |
| Recommended action | **Accept.** Do not redesign Nutrition. |
| Implementation justified? | **NO.** |

**Evidence:** `features/nutrition/layout/nutrition-layout.tsx`, `lib/nutrition/living-room.ts`, `features/nutrition/components/shared/nutrition-growth-link.tsx`, P1 `LIVING_DIRECT_URL_CONTAINMENT["/progress"]`.

---

## 6. Health Lab shop HUD

**Class: D — ROLLBACK/LEGACY SAFE**

| Field | Finding |
|---|---|
| Exact route | `/health-lab` internal view `"shop"` |
| Exact user path (living) | Rooms → Care → Health. Living `HealthLabHome` does **not** render coins/shop/XP HUD. Comment in source: “No shop / coins / XP / surprise theatre.” Living **More wellness** → **For grown-ups** (extra click) can open “See gentle progress” / “Parent insights”. Progress uses living copy (no XP/coins). Dashboard (`HealthLabDashboard`) still has leftover wellness charts if that third click is taken. Shop button exists only on the `!living` home. |
| Production living path to shop HUD? | **NO** |
| Rollback path? | **YES** — `!living` home shows coins + Open shop. |
| Visible to normal living parent? | Shop HUD: **NO**. Grown-up progress: optional, quiet. Dashboard charts: only after More wellness → grown-ups → Parent insights. |
| Another-product feeling? | Shop/coins/XP: rollback only. |
| Severity | P2 inventory item is rollback-safe. Nested dashboard is C-level deepen, not shop HUD. |
| Recommended action | **Leave FA-02 as-is.** Do not change Health Lab living opening. |
| Implementation justified? | **NO.** |

**Evidence:** `features/health-lab/components/health-lab-home.tsx` living branch vs `onOpenShop` in `!living` branch; `health-lab-zone.tsx` still registers `view === "shop"`; `health-lab-progress.tsx` living labels.

---

## 7. Paywall next-unlocks

**Class: C — ACCEPTABLE P2 DEBT**

| Field | Finding |
|---|---|
| Exact route | In-modal on `PaywallModal` (`data-testid="paywall-next-unlocks"`). Also `/pricing` storefront. |
| Exact user path | Parent hits an existing gate (quota, workbook, speech, routines, hub lock) → paywall opens → “Here's what unlocks next” grid (Unlimited AI, Weekly Reports, Health Lab, Learning, Speech, Nutrition, **Games**, Downloads, Birth Sky Stories). |
| Appears before meaningful value? | **NO.** It is secondary copy on an already-open paywall, after a gated action. |
| Violates Hard-Day Law / P0-7? | **NO.** Ask Amy / Emotional Support still use soft-continue (`ASK_AMY_SOFT_CONTINUE`). No auto-paywall on hard-day Ask Amy. Next-unlocks is not injected into those paths. |
| Unlock theatre? | **YES on the paywall itself** (emoji catalogue including Games). Not on Today / Rooms first frames. |
| Merely secondary Premium continuity? | **YES.** Function is needed; theatre is leftover. |
| P0-7 intact? | **YES.** Do not change RevenueCat, pricing, entitlements, or quotas. |
| Severity | P2 storefront theatre. |
| Recommended action | **Accept for release.** Optional later: quiet the preview to PREMIUM_VOICE without changing offers. |
| Implementation justified? | **NO** now. |

**Evidence:** `lib/paywall-next-unlocks.ts`, `components/paywall-next-unlock-preview.tsx`, `components/paywall-modal.tsx`, `lib/hard-day-monetization.ts`.

---

## 8. Debug overlay

**Class: C — ACCEPTABLE P2 DEBT** (dev/test primary; production only if explicitly armed)

| Surface | Gate | Production living parent |
|---|---|---|
| Crash `DebugOverlay` | `isCrashDebugOverlayEnabled()` = `!isProductionEnvironment()`. Production **host** forces overlay **off**. `?crashdebug=1` cannot override a production host. | **NO** |
| Boot HUD | `import.meta.env.DEV && VITE_ENABLE_BOOT_HUD === "true"` | **NO** |
| `/debug/*` `/dev/*` `/debug-parity` | `DevRouteRedirect` → `/dashboard` in production bundles | **NO** |
| Floating `DebugPanel` | `?debug=` or `localStorage.__amynest_debug === "1"` via `DebugProvider`. **Not** compile-gated. | **Only if armed** |

| Field | Finding |
|---|---|
| Exact route | Overlay is global; debug pages redirect in PROD. |
| Production reachable? | Crash overlay: **NO** on production hosts. Debug **panel**: **YES if** `?debug=1` or stale `__amynest_debug`. |
| Dev only / test only? | Crash overlay + boot HUD + debug routes: **dev/test**. Debug panel: **accidental production risk if armed**. |
| Visible to normal parent? | **NO** unless a shared debug URL or leftover localStorage. |
| Another-product feeling? | Violet “Debug” tab — developer chrome, not a second universe. |
| Severity | P2 if armed; otherwise none. |
| Recommended action | **Do not remove.** Accept. Optional later: compile-gate `DebugPanel` the same way as crash overlay. |
| Implementation justified? | **NO** yet (founder: do not remove). |

**Evidence:** `lib/runtime-crash-policy.ts`, `lib/is-dev.ts`, `contexts/debug-context.tsx`, `components/debug-panel.tsx`, `AppCore.tsx` `DevRouteRedirect`.

---

## 9. More → Quick help / Patterns / Recipes

**Class: C — ACCEPTABLE P2 DEBT**

Living More after P1: Birth Sky, Nutrition, **Quick help**, Children, **Patterns**, **Recipes**, Plans, Invite, Feedback, Account.

| Item | Route | What it is | Catalogue leftover? |
|---|---|---|---|
| Quick help | `/amy-ai-tutor` | Amy Quick Tutor: Teach / Practice / Quiz / Doubt, subject chips. Living label: “A short learning moment”. | **Leftover tutor product**, quieted in More. Distinct from drawer Amy (`/assistant`). |
| Patterns | `/behavior` | Behavior tracker (quick log, today summary, Amy insights, weekly trends). Living label: “Patterns”. | **Family utility** with leftover tracker chrome / scores. |
| Recipes | `/recipes` | Parent recipe book (CRUD). | **Household utility**, not a product mall. |

| Field | Finding |
|---|---|
| Production reachable? | **YES** via More |
| Living universe reachable? | **YES** |
| Visible to normal parent? | **YES if they open More** (intentional quiet drawer, not Home/Rooms) |
| Another-product feeling? | Quick help can. Patterns/Recipes feel like account/care leftovers, not Games/Study catalogues. |
| Severity | P2 quiet More. P1 catalogues already removed. |
| Recommended action | **Keep More quiet. Do not add replacements. Do not turn More into another catalogue.** Accept Quick help as leftover tutor. Optional Apple polish: hide `/amy-ai-tutor` the same way `/study` was hidden — only if More is walked in review. |
| Implementation justified? | **NO** as a required pass. |

**Evidence:** `lib/nav-living-ia.ts` `QUIET_COPY`, `lib/mobile-menu-config.ts` `NAV_ITEMS`, `pages/amy-ai-tutor.tsx`, `pages/behavior/index.tsx`, `pages/recipes.tsx`.

---

## 10. P3 — dead nav / Astro assets / 404 voice

### Dead navigation items — **E**

`DrawerNavItem`, `PremiumNavItem`, `groupDrawerItems` are **not imported by production UI**. Living nav is `AmynestHomeNav` + `buildLivingNavSections`. `NAV_ITEMS` Kids Control badge `Soon 🚀` is not rendered by living nav; Kids Control href is P1-contained.

No user impact. Do not clean up for aesthetics.

### Unused Astro assets — **E** (files) / Birth Sky cosmic art is **D** (intentional)

`lib/amy-astro-card-config.ts` + `/illustrations/amy-astro/*` serve the old hub astro tile. Rooms V1 does not show an astro mall section. Understand demotes Birth Sky as a quiet path; More lists Birth Sky. Birth Sky living opening still uses cosmic materials by design — that is not unused residue.

Deleting unused illustrations would not change the living journey. Do not delete assets.

### 404 voice — **C** (system) approaching **E** for identity

Catch-all `RouteFailedPage` → `AppFallbackUi`: “Something went wrong” / “We're having trouble loading this screen.” Home goes to `/dashboard`. Generic system, not living prose, **not another product**. No production identity leak.

Implementation of living-voiced 404 is **not justified**.

**Evidence:** `components/drawer-nav-item.tsx`, `components/premium-nav-item.tsx`, `lib/nav-premium-config.ts` `groupDrawerItems` (definition only), `pages/route-failed.tsx`, `components/app-fallback-ui.tsx`.

---

## Final decision answers

### 1. Any remaining P0?

**NO.** FA-02, auth, manufactured openings, P0-7, and living doors are intact.

### 2. Any remaining P1?

**NO.** Accidental production escapes from the full audit (tab bar/FAB, More Play/Learning/Insights/Progress, Games/Rewards URLs, phonics unlock theatre, speech live/talk + independent legacy switch, worksheet URL) remain contained.

### 3. Any P2 that materially damages one-home identity?

**Not in the normal living journey.**  
If a parent *chooses* Grow → Quiet study, or expands Phonics Practice library, they can still feel mixed chrome. That is accepted leave debt, not a new accidental universe.

### 4. Any legacy route reachable by normal production users?

**Intentional living leaves / quiet More only:** `/phonics`, `/study` (Grow), other Grow leaves (`/abacus`, `/spelling`, `/olympiad`, `/smart-math-tricks`), `/nutrition`, `/birth-sky`, `/amy-ai-tutor`, `/behavior`, `/recipes`, account routes.  
**Not reachable via normal nav:** `/welcome`, `/environment`, `/games`, `/rewards`, `/insights`, `/progress`, `/worksheet`, speech live/talk (living redirects).

### 5. Any premium surface violating P0-7?

**NO.** Hard-day Ask Amy / Emotional Support still soft-continue. Next-unlocks live on the paywall after a gate, not before value on hard-day paths. No RevenueCat/entitlement change is implied.

### 6. Any legacy visual universe reachable in living production?

**No accidental first-frame universe.** Rollback still has a coherent legacy universe when `VITE_FF_AMYNEST_LIVING_UNIVERSE` is `0` / `legacy`. Mixed interiors exist only after chosen deepen (study body, phonics details, nutrition panels, health dashboard third click).

### 7. Does FA-02 remain sufficient?

**YES.** Unset / `living` / `1` → living + P1 containment. `0` / `legacy` → coherent rollback. `mixed` still rejected in production. Per-module `=0` still ignored when master is living. Speech query/localStorage/remote cannot mix neon into living.

### 8. Is another remediation pass actually justified?

**NO.** Do not start another manufacturing pass. Do not redesign approved interiors. Do not run Final Apple Audit from this document.

Optional later (only if Apple review walks these paths): quiet `/study` first-frame XP/trophy; keep phonics Practice library from exposing academy widgets; hide More Quick help; quiet paywall next-unlocks copy. None of those are release blockers.

### 9. Which items should simply remain as accepted debt?

**All twelve.** Specifically accept:

- `/study` mixed interior (Grow leave)
- Phonics Practice library behind `<details>`
- `/welcome` marketing bookmark
- `/environment` URL dashboard
- Nutrition deepen / More care panels
- Health Lab shop HUD (rollback-only)
- Paywall next-unlocks theatre
- Debug panel if someone arms `?debug=`
- More Quick help / Patterns / Recipes
- Dead nav components, unused astro files, generic 404

---

## Files inspected (no files changed in product)

- `lib/living-leave-containment.ts`, `lib/nav-living-ia.ts`, `lib/grow/living-room.ts`, `lib/nutrition/living-room.ts`, `lib/hard-day-monetization.ts`, `lib/paywall-next-unlocks.ts`, `lib/runtime-crash-policy.ts`, `lib/is-dev.ts`, `lib/mobile-menu-config.ts`, `lib/parent-hub/rooms.ts`
- `pages/study.tsx`, `pages/landing.tsx`, `pages/environment.tsx`, `pages/amy-ai-tutor.tsx`, `pages/behavior/index.tsx`, `pages/recipes.tsx`, `pages/route-failed.tsx`, `pages/parenting-hub.tsx`
- `components/phonics-learning.tsx`, `components/phonics-v2/PhonicsV2.tsx`, `components/phonics-v2/academy/ReadingAcademyHub.tsx`, `components/paywall-modal.tsx`, `components/debug-panel.tsx`, `components/grow/grow-living-stream.tsx`
- `features/nutrition/layout/nutrition-layout.tsx`, `features/health-lab/components/health-lab-home.tsx`, `AppCore.tsx`

**Product files deliberately untouched in this order:** all of them. This document only.

---

STOP. Triage complete. No module. No interior redesign. No Apple audit.
