# AmyNest P1 Leave-Path + Legacy Escape Remediation Review

**Date:** 2026-08-16  
**Mode:** Targeted containment + continuity. No full-universe remanufacture.  
**Audit source:** `docs/v2/AMYNEST_FULL_LEGACY_RESIDUE_AUDIT.md`

---

## 1. Audit findings used

The audit concluded AmyNest is one home at the door and not yet one home after leave. Production-reachable P1 escapes:

| ID | Escape | This pass |
|---|---|---|
| P1-A | Always-on mobile tab bar + Amy FAB | Suppressed when living universe is ON |
| P1-B | More → `/games` | Removed from living More; living URL → `/dashboard` |
| P1-C | `/rewards` URL / games | Living URL → `/dashboard` |
| P1-D | More → `/study` | Removed from living More; Grow leave keeps `/study` with living title + leave exits |
| P1-E | More → `/insights` `/progress` | Removed from living More; living URLs → `/dashboard` |
| P1-F | Grow → `/phonics` unlock theatre | Living workbook card; engine/entitlements unchanged |
| P1-G | Speech live/talk + query/localStorage/remote | Living ignores those switches; live/talk URLs → `/speech-coach` |
| P1-H | `/worksheet` LPS Studio | Living URL → `/parenting-hub` |
| P1-I | Leave continuity too thin | Four living IA exits |
| P1-J | Direct URL matrix | See §6 |

Kids Control Center was in living More as waitlist catalogue; it is contained with the same More/URL rule (living → `/dashboard`).

---

## 2. Exact P1 routes addressed

Contained in the living universe (routes remain for rollback):

- `/games`
- `/rewards`
- `/insights`
- `/progress`
- `/kids-control-center`
- `/worksheet`
- `/teacher-os`
- `/speech-coach/live`
- `/speech-coach/live-session`
- `/speech-coach/talk`
- `/parenting-hub/speech-coach/live`

Not redirected (Grow leave destinations):

- `/phonics` — copy/shell contained
- `/study` — removed from More; living title + leave continuity
- `/abacus` `/spelling` `/olympiad` `/smart-math-tricks` — untouched Grow leaves

---

## 3. Before / after navigation map

**Before (living More):** Birth Sky, Nutrition, Learning `/study`, Play `/games`, Quick help, Children, Progress, Insights, Patterns, Kids Control, Recipes, Plans, Invite, Feedback, Account — plus always-on tab bar + glowing Amy FAB.

**After (living More):** Birth Sky, Nutrition, Quick help, Children, Patterns, Recipes, Plans, Invite, Feedback, Account.

Primary living IA unchanged: Home, Today's plan, Beside you, Amy, Rooms (Help / Understand / Care / Moments).

Amy companion entry remains the drawer “Amy” row (`/assistant`). The glowing FAB is not mounted in living.

Rollback / mixed: previous More list and tab bar remain.

---

## 4. Legacy containment strategy

FA-02 is the only universe switch.

| Mode | Nav catalogues | Direct leftover URLs | Tab bar / FAB | Speech neon cards |
|---|---|---|---|---|
| Living (production default) | Hidden | Redirect home / rooms / speech hub | Off | Forced off |
| Mixed (dev/test) | Visible | Original pages | On when dashboard chrome | Query / localStorage / remote honored |
| Legacy rollback | Visible | Original pages | On | Honored |

No engines deleted. No assets deleted. No entitlements changed.

---

## 5. Leave continuity map

`AmyNestLeaveContinuity` now offers the living IA, not a catalogue wall:

| Exit | Route |
|---|---|
| Home | `/dashboard` |
| Today's plan | `/routines` |
| Amy (Beside you) | `/assistant` |
| Rooms | `/parenting-hub` |
| Optional continue | existing module-specific href |

Already-wired surfaces keep this component (Speech, Nutrition, Infant, Coach, Audio, Talking Amy, Amy AI, Health session complete, Birth Sky, Grow/Hub module shell, Phonics, Study living). No second leave system.

---

## 6. Deep-link escape matrix

| Route | CTA | More | Internal | Direct URL | Hash | Query | Back | Forward | Stale localStorage | Notification | Class |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/games` | none | hidden | phase2 widgets TODAY_HOME off | → `/dashboard` | n/a | n/a | history | history | n/a | same as URL | **ROLLBACK ONLY** |
| `/rewards` | none | hidden | games (also redirected) | → `/dashboard` | n/a | n/a | history | history | n/a | same | **ROLLBACK ONLY** |
| `/study` | Grow quiet study | hidden | hub launch card | page (living title) | n/a | n/a | layout back | history | n/a | same | **SAFE leave** (Grow) |
| `/insights` `/progress` | none | hidden | nutrition growth link → dashboard | → `/dashboard` | n/a | n/a | history | history | n/a | same | **ROLLBACK ONLY** |
| `/phonics` | Grow Sounds & letters | hidden | hub phonics tile | living title + quiet workbook | n/a | n/a | layout back | history | n/a | same | **SAFE leave** |
| `/speech-coach/live-session` `/talk` | legacy cards off | hidden | aliases → hub | → `/speech-coach` | n/a | ignored | history | history | ignored | same | **ROLLBACK ONLY** |
| `/worksheet` | none | hidden | none in living nav | → `/parenting-hub` | n/a | n/a | history | history | n/a | same | **INTERNAL / ROLLBACK** |
| `/speech-coach` | Help / More no | Rooms Help | yes | living hub | n/a | `speechLegacy` ignored | yes | yes | ignored | yes | **SAFE** |
| `/parenting-hub#moments` | Rooms | yes | yes | living rooms | living | n/a | yes | yes | n/a | yes | **SAFE** |

---

## 7. FA-02 compatibility

Unchanged.

- Unset / `living` / `1` → living; containment ON
- `0` / `legacy` → coherent rollback; containment OFF
- `mixed` → production still rejected
- Per-module `=0` still ignored when master is living

Speech query / localStorage / remote config can no longer mix neon chrome into a living production face.

---

## 8. Files changed

- `artifacts/kidschedule/src/lib/living-leave-containment.ts` (+ test)
- `artifacts/kidschedule/src/components/living-leave-redirect.tsx`
- `artifacts/kidschedule/src/lib/nav-living-ia.ts` (+ test)
- `artifacts/kidschedule/src/components/layout.tsx`
- `artifacts/kidschedule/src/components/layout-mobile-menu-sheet.tsx`
- `artifacts/kidschedule/src/components/premium-desktop-sidebar.tsx`
- `artifacts/kidschedule/src/AppCore.tsx`
- `artifacts/kidschedule/src/pages/speech-coach/show-speech-coach-legacy.ts` (+ test)
- `artifacts/kidschedule/src/components/phonics-learning.tsx`
- `artifacts/kidschedule/src/lib/grow/living-room.ts` (+ test)
- `artifacts/kidschedule/src/components/amy-nest-leave-continuity.tsx` (+ test)
- `artifacts/kidschedule/src/pages/study.tsx`
- `artifacts/kidschedule/src/playwright/amynest-home-nav-fixture.tsx`

---

## 9. Files deliberately untouched

Approved interiors: Health Lab living, Birth Sky, Speech living hub (except legacy-card gate), Parent Hub Rooms V1, Nutrition living, Ask Amy, Guidance, Moments, Talking Amy, Amy Coach, Amy Audio, Amy AI, Routine Generation, P0-7, FA-02 resolver, living nav architecture (IA groups reused).

Engines: games, rewards, study-zone, phonics curriculum, speech recognition, worksheet studio, teacher OS, health, birth-sky, routine.

No DB, API, RevenueCat, Firebase, auth, analytics contracts, entitlements.

---

## 10. TypeScript result

`pnpm --filter @workspace/kidschedule run typecheck` — **PASS**

---

## 11. Test result

Targeted:

- living-leave-containment, nav-living-ia, grow living-room, leave continuity, speech legacy, home nav chrome, FA-02, P0-7, Parent Hub rooms, speech adapter, routine generation client

**14 files / 64 tests PASS** (second targeted batch)  
**8 files / 47 tests PASS** (first containment batch)

Skipped known pre-existing: `parent-hub-i18n`, `routine-timeline-ui`.

---

## 12. Production build result

`pnpm --filter @workspace/kidschedule run build` — **PASS** (`✓ built in 22.51s`)

---

## 13. Mobile verification

Static/browser fixture only. Not a physical device certificate.

| Width | Fixture | Result |
|---|---|---|
| 320 | More open | No Play / Learning / Insights / Games |
| 360 | More open | same |
| 390 | More open + scrolled | Birth Sky, Nutrition, Quick help, Children, Patterns, Recipes, Plans, Invite, Feedback, Account |
| 430 | More open | same |
| 320 / 390 | Leave continuity | Home, Today's plan, Amy, Rooms, Back to rooms |

No tab bar / FAB in these fixtures (living drawer only).

---

## 14. Desktop verification

1280×800 living sidebar: Home, Today's plan, Beside you, Amy, Rooms. More does not list Play / Learning / Insights. Sign out remains quiet.

---

## 15. Blind-test results

| # | Question | Target | Result |
|---|---|---|---|
| 1 | Normal living user reach Games? | NO | **NO** — not in More; `/games` → `/dashboard` |
| 2 | Reach Rewards? | NO | **NO** — `/rewards` → `/dashboard` |
| 3 | Reach old Study catalogue accidentally? | NO | **NO via More.** Grow “Quiet study” / typed `/study` still opens study with living title (P2 interior) |
| 4 | Grow → Sounds & letters become marketplace? | NO | **NO** — unlock theatre copy gone; download remains quiet |
| 5 | Speech unexpectedly legacy chrome? | NO | **NO** — living ignores query/localStorage/remote; live/talk URLs → hub |
| 6 | `/worksheet` another application? | NO | **NO** — living URL → `/parenting-hub` |
| 7 | Insights/Progress SaaS via More? | NO | **NO** — hidden + redirected |
| 8 | More remain a catalogue? | NO | **NO for leftover products.** Quiet account/care leftovers remain |
| 9 | Leaving a room still feel like leaving AmyNest? | YES | **YES** — four living exits |
| 10 | Always find Home / plan / Beside you / Rooms? | YES | **YES** — drawer + leave continuity |
| 11 | Direct legacy URLs create a second production universe? | YES (must not) | **Contained** for the P1 URL set. `/study` and `/phonics` remain functional leaves |
| 12 | FA-02 still prevent mixed visual universes? | YES | **YES** |

---

## 16. Remaining P1 / P2 / P3

**P1 from this audit list:** none remaining as accidental production escapes.

**P2 (not this order):**

- `/study` interior is still study-zone under a living title (Grow leave)
- Phonics “Practice library” `<details>` still holds academy widgets
- `/welcome` old landing bookmark
- `/environment` dashboard URL
- Nutrition deepen / More care panels
- Health Lab shop HUD behind `!living` (living More can open progress/dashboard)
- Paywall next-unlocks theatre
- Debug overlay if armed
- More still lists Quick help / Patterns / Recipes (quiet, not P1 catalogues)

**P3:** dead `DrawerNavItem`, unused astro assets, 404 voice.

---

## 17. Rollback verification

With `VITE_FF_AMYNEST_LIVING_UNIVERSE=legacy` (or mixed in tests):

- Catalogue hrefs stay in More
- `/games` `/rewards` `/study` `/insights` `/progress` `/worksheet` `/speech-coach/talk` render original pages
- Tab bar + FAB return on dashboard chrome
- Speech query / localStorage / remote config can show neon cards
- Phonics unlock card returns when Grow living is off (legacy master forces Grow off)

STOP. Targeted remediation complete. No further module. No Apple audit.
