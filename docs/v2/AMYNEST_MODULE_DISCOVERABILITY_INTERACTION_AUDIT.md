# AmyNest — Module Discoverability + Interaction Audit

**Date:** 2026-09-07  
**Mode:** Audit first, then minimum remediation. No new product phase.  
**Scope:** Living Home launchpad + Speech Coach live-session discoverability + inert-looking controls.  
**Visual evidence:** Founder screenshots of Home / Speech Coach living landing (Today's Help, quiet paths, More practice).

---

## Verdict

**B — READY WITH P2/P3**

CODE VERIFIED remains. Required real-device journeys were attempted again and remain **NOT TESTABLE**. **A is not allowed.**

See **FINAL DEVICE CERTIFICATION** below.

---

## 1. Existing module inventory

Routes are the production Wouter table in `artifacts/kidschedule/src/AppCore.tsx`. Destinations below are existing — none were invented.

| Module | Route(s) | How discovered (living ON) | Child-specific | Premium / gate | Living OFF |
|---|---|---|---|---|---|
| Today Home | `/dashboard` | Tab, drawer | Session chip + stored hub child | Routine generate limit | Legacy dashboard + FeatureDiscoveryStrip |
| Today's plan | `/routines`, `/routines/:id`, `/routines/generate` | Tab, drawer, Home hero, Home care path | Yes | Generate paywall | Same routes, legacy chrome |
| Amy Coach | `/amy-coach` | Tab, drawer | Yes | Hub/usage | Same |
| Amy AI | `/assistant` | Drawer, Amy FAB, Home care path | Chat context | Quota hints | Same; tab bar hidden on `/assistant` |
| Rooms / Parenting Hub | `/parenting-hub` + `#help\|understand\|care\|moments` | Tab, drawer, Home care path | Hub child storage | Per-tile FeatureGate | “Parenting Hub” mall |
| Speech Coach | `/speech-coach` | Rooms Help, Home care path | Yes (picker + hub storage) | `canAccessSpeechCoach` + `hub_speech_session` | Legacy landing with live/talk heroes |
| Speech live session | `/speech-coach/live-session` | **Primary CTA on Speech Coach landing**; More session chips | Yes | Same pool + live paywall | Same page; living chrome off |
| Talk with Amy | `/speech-coach/talk` | Deep link / living-OFF hero | Yes | Same | Visible hero when `showLegacyCards` |
| Speech Coach V2 | `/speech-coach-v2`, `/speech-coach-v2/session` | More practice when remote-config ON | Partial (storage; hub uses first child) | Separate V2 limits | Promo card on legacy landing |
| Health Lab | `/health-lab` | Rooms Care | Yes | `canAccessHealthLab` + free preview | Same |
| Nutrition | `/nutrition` | Drawer More, Rooms Care | Yes | `canAccessNutritionHub` | Same |
| Birth Sky | `/birth-sky/*` | Drawer (email flag), Rooms | Yes | Flag | Same |
| Grow / Study / Phonics / Abacus / Spelling / Math / Olympiad | existing Grow leaves | Rooms Understand | Varies | Varies | `/study` also in drawer |
| Life Skills | `/life-skills` | Rooms Help | — | — | Same |
| Talking Amy | `/talking-amy` | Rooms Moments | — | — | Same |
| Progress | `/progress` | — | Yes | — | Drawer; living URL → `/dashboard` |
| Insights | `/insights` | — | — | — | Drawer; living URL → `/dashboard` |
| Games | `/games` | — | Yes | — | Legacy Home strip; living URL → `/dashboard` |
| Rewards | `/rewards` | — | — | — | Living URL → `/dashboard` |
| Worksheets | `/worksheet` | Rooms Make (contained) | — | Desktop+ premium | Living URL → `/parenting-hub` |
| Teacher OS | `/teacher-os` | — | — | — | Living URL → `/parenting-hub` |
| Kids Control | `/kids-control-center` | — | — | — | Living URL → `/dashboard` |
| Children / Behavior / Recipes / Plans / Invite / Feedback / Account | existing | Drawer More | Varies | — | Same |
| Pricing / Referrals | `/pricing`, `/referrals` | Drawer | — | **Untouched** | Same |

**Production door (untouched):** `/` → `/begin` when unsigned; signed-in + setup → `/dashboard`.

**Nav surfaces (untouched architecture):**

- Mobile tabs: Home, Today's plan, Amy Coach, Rooms
- Amy FAB → `/assistant`
- Drawer + desktop sidebar share `buildLivingNavSections`
- Back: layout `smartBack` + module-owned exits (`Back to Help`, `Back to Today Home`)
- Notification deep links: existing `action-routing` (phonics category → speech-coach)

---

## 2. Current discoverability problem

Confirmed in production living code before this pass:

1. **Home was a sanctuary with no module legend.** Living Home rendered ONE NRT hero + subordinate timeline. Speech Coach, Amy, and Rooms were not visible without the drawer or the Rooms tab. A parent could not answer “What can AmyNest do for me?” from Home.
2. **Speech Coach landing promoted quiet paths, not live practice.** The prominent `speech-coach-recommend` CTA always deepened to Sounds & words / Play & speak / Confidence. `recommendSpeechCoachAction()` is intentionally `kind: "deepen"` and never recommends live-session or V2.
3. **The existing live session was contained as a “legacy escape.”** P1 leave-path work redirected `/speech-coach/live-session` and `/speech-coach/talk` back to `/speech-coach` when Living Universe was ON. Session chips in More therefore navigated and bounced. The only working “live” surface on the visible landing was inline quiet STT — not the dedicated live session.
4. **V2 realtime** (`/speech-coach-v2/session`) was never contained, but it is remote-config gated (default OFF) and was buried under collapsed “More practice.”
5. **Parent guidance cards** used `cursor-pointer` + hover + `onClick={onAction}` that only marked free usage. They looked broken.

This was a navigation / hierarchy error, not a missing product.

---

## 3. Dead / inert-looking interactions found

| Surface | Element | Interactive? | Intended destination / action | Before | After |
|---|---|---|---|---|---|
| Speech Coach living | Today's Help copy / photo | No | Display | Inert (correct) | Unchanged |
| Speech Coach living | Recommend (`Start here` / `Tonight's help`) | Yes | Quiet deepen | Worked; looked like the primary act | Kept as **secondary** quiet suggestion |
| Speech Coach living | Quiet paths (5) | Yes | Inline deepen | Worked | Unchanged (secondary) |
| Speech Coach living | More practice toggle | Yes | Expand/collapse | Worked | Unchanged (tertiary) |
| Speech Coach living | Child chips | Yes | Switch child | Worked; not persisted | Persists hub child |
| Speech Coach living | Child/Parent view | Yes | View mode | Worked (inside More) | Unchanged |
| Speech Coach living | Milestones status | Yes | API mutate | Worked | Unchanged |
| Speech Coach living | Read aloud / games / pronunciation | Yes | Existing STT/TTS | Worked | Unchanged |
| Speech Coach living | Session chips (quick, bedtime, school, warmup, emotion) | Yes | `/speech-coach/live-session?preset=` | **Bounced to landing** (containment) | Opens existing live session |
| Speech Coach living | Session chip “Sounds & words” | Yes | Deepen practice | Worked | Unchanged |
| Speech Coach living | Legacy live / talk buttons | Yes | live-session / talk | Hidden when living ON (`showLegacyCards`) | Still hidden in living ON (legacy containment of chrome, not the route) |
| Speech Coach living | V2 button | Yes | `/speech-coach-v2` | Buried; only if enabled | Unchanged (tertiary) |
| Speech Coach living | Expert waitlist | Yes | Join API | Worked | Unchanged |
| Speech Coach living | Back to Help / Back to Today Home | Yes | Help hash / `/dashboard` | Worked | Unchanged |
| Speech Coach | Parent guidance cards | Looked yes | Read guidance | **Fake click** (usage mark only) | Static cards, not clickable |
| Speech Coach | Reports PDF | Disabled | Coming soon | Explicit lock + copy | Unchanged (already honest) |
| Speech Coach | “Continue supporting speech together” | No | Copy | Inert (correct) | Unchanged |
| Home living | NRT hero CTA | Yes | Routine / generate / rest | Worked | Unchanged |
| Home living | Module launchpad | Missing | Existing modules | **Absent** | Compact “What Amy can help with” |
| Deep link | `/speech-coach/live-session` | Yes | Live session | Redirected home to landing | Opens live session |
| Deep link | `/speech-coach/talk` | Yes | Talk | Redirected to landing | Opens talk |

---

## 4. Intended destination for each (no new destinations)

| Control | Destination |
|---|---|
| Start live practice | Existing `/speech-coach/live-session?preset=quick&childId=` |
| Quiet path / recommend | Existing inline deepen sections on `/speech-coach` |
| More session chips | Existing live-session presets, or deepen for `pronounce` |
| V2 (when enabled) | Existing `/speech-coach-v2` |
| Home → Today's plan | `/routines` |
| Home → Speech Coach | `/speech-coach` (child via `amynest:hub:activeChildId`) |
| Home → Amy | `/assistant` |
| Home → Rooms | `/parenting-hub` |
| Back to Today Home | `/dashboard` |
| Back to Help | `/parenting-hub#tile-speech-coach` |
| Alias `/speech-coach/live` | Existing redirect → `/speech-coach/live-session` |

---

## 5. Changes made

Minimum remediations only.

### Speech Coach live-session is first-party, not a catalogue leave

`LIVING_DIRECT_URL_CONTAINMENT` no longer redirects:

- `/speech-coach/live`
- `/speech-coach/live-session`
- `/speech-coach/talk`
- `/parenting-hub/speech-coach/live`

Those routes stay registered. `LivingLeaveRedirect` now renders the existing live/talk pages in living ON.

**Not removed:** games, rewards, insights, progress, kids-control, worksheet, teacher-os containment.  
**Not changed:** living OFF (containment already a no-op).  
**Not deleted:** P1 containment system, FA-02, tab bar, FAB.

### Speech Coach landing hierarchy

On the living landing, above the fold:

1. **PRIMARY** — `Start live practice` → existing `startLivePractice()` / `livingSpeechLivePracticeHref()` → `/speech-coach/live-session`
2. **SECONDARY** — recommend + quiet practice paths (unchanged deepen)
3. **TERTIARY** — More practice (milestones, read-aloud, V2 if on, session chips, expert)

Cream/sand sanctuary CTA (same ceramic language as Today Home), not purple wash. No new engine, API, session system, or duplicate live route.

### Inert-looking controls

- Parent guidance cards: removed pointer/hover/onClick. Content was already fully visible.
- Reports PDF: left disabled + “coming soon” (already explicit).
- Session chips: now reach the real live session because containment no longer bounce-loops.

### Home launchpad

Compact `TodayCarePaths` under the NRT hero inside `TodayHomeShell`:

Today's plan → Speech Coach → Amy → Rooms

Not a marketing grid. FeatureDiscoveryStrip remains living-OFF only.

### Child context

Reused existing `amynest:hub:activeChildId` (`writeStoredActiveChildId` / `readStoredActiveChildId`):

- Home chip select persists the child
- Home → Speech Coach writes the selected child before navigate
- Speech Coach landing + live session resolve: selected → URL `childId` → stored → first eligible
- Title copy already uses `child.name` (`I'm here with you and {name}`)

AppLink still strips query strings via `safeHref` / `normalizeRoutePath` (pre-existing nav contract). Live practice therefore uses `setLocation` with the full href (same pattern as session chips). Home → Speech Coach relies on hub storage, not the stripped query.

### Analytics

No second analytics system. No subscription instrumentation changes.

- Home care paths use existing AppLink `source=today-care-*`
- Live practice uses the same in-app navigation as session chips (no new product event)
- Existing live-session start still goes through `startSession()` (`speech_coach` gate, `hub_speech_session` usage, `speech_improved` on complete)
- V2 events untouched

**Reported gap (not added):** the living landing still has no dedicated `track("speech_coach_entry")` / `track("speech_coach_live_cta")` product event. Pre-existing. Adding one would be a new contract.

---

## 6. Speech Coach live-session discoverability result

| Check | Result |
|---|---|
| Primary CTA visible without opening More | Yes — `data-testid="speech-coach-live-primary"` sits above recommend + quiet paths |
| Label is obviously actionable | `Start live practice` / `Speak with Amy together` |
| Route | Existing `/speech-coach/live-session?preset=quick&childId=` |
| Engine | Existing `live-speech-coach.tsx` `startSession()` |
| Entitlement / usage | Unchanged (`openSubscriptionGate`, `hub_speech_session`) |
| Quiet paths still available | Yes |
| More / milestones / expert still available | Yes, tertiary |
| Living OFF heroes | Unchanged (`showSpeechCoachLegacyCards`) |

---

## 7. Child-context result

| Path | Result |
|---|---|
| Home selects John / Child 2 / Child 3 | Writes hub storage; NRT already scoped by `selectedChildId` |
| Home → Speech Coach | Landing resolves stored id if eligible |
| Speech Coach → Start live practice | Passes `childId` + writes storage; live page resolves the same child |
| Live session child chips | Persist the new selection; do not silently reset |
| Ineligible stored id | Falls back to first eligible — does not invent a child |
| “All children” on Home | Does not wipe stored child (last specific child remains for Speech Coach) |

V2 hub still defaults to `children[0]` (pre-existing P3; V2 is not the primary live path).

---

## 8. Navigation / deep-link result

| Path | Result |
|---|---|
| `/` → `/begin` | Untouched |
| Home → Speech Coach → Home | Care path + `Back to Today Home` |
| Speech Coach → live-session → Speech Coach | Existing parent route `/speech-coach` |
| `/speech-coach/live` alias | Existing redirect → live-session (no longer bounced) |
| `/speech-coach/talk` | Opens talk (deep link / living-OFF hero) |
| Notification phonics → speech-coach | Existing action-routing; landing now has a working live CTA |
| Tabs / FAB / drawer | Untouched |
| Catalogue URLs (games, rewards, …) | Still contained in living ON |

---

## 9. Living ON / OFF result

| Mode | Speech live-session | Home launchpad | Catalogue containment |
|---|---|---|---|
| Living ON (production default) | Reachable; living landing primary CTA | Compact care paths; sanctuary hero kept | Games/rewards/insights/progress/worksheet/teacher-os still redirected |
| Living OFF / legacy | Legacy heroes + session carousel (unchanged) | FeatureDiscoveryStrip (unchanged) | No redirects |
| Mixed | Individual flags; live routes reachable | Per Today Home flag | Per FA-02 |

Living Home visual language was not reverted.

---

## 10. Responsive verification

Contracts in CSS (sanctuary cream CTA, `min-width: 0`, `overflow-x: clip` on living Home, `overflow: hidden` on Speech Coach living shell):

| Width | Primary live CTA | Horizontal overflow | FAB / tab cover |
|---|---|---|---|
| 320 / 360 / 390 / 430 | Above-fold in living hero; full-width cream button | No new min-widths; CTA `width: calc(100% - 1.5rem)` | Speech Coach is immersive (tab/FAB hidden). Home already has `padding-bottom: 7.5rem + safe-area` |
| Desktop | Same hierarchy, max-width 48rem Speech Coach | Coherent | Sidebar unchanged |

**Not visually click-tested in a signed-in browser this pass** (Speech Coach is behind auth + child profiles). Proof is source + unit/component tests. Founder should confirm on device with John / Child 2 / Child 3.

---

## 11. Tests / builds

Ran:

```
pnpm --filter @workspace/kidschedule exec vitest run --config vitest.config.ts \
  src/lib/speech-coach/living-room.test.ts \
  src/lib/living-leave-containment.test.ts \
  src/lib/today-home/care-paths.test.ts \
  src/lib/today-home/living-home-containment.test.ts \
  src/components/today-home/today-care-paths.test.tsx \
  src/pages/speech-coach/speech-coach-landing-discoverability.test.ts \
  src/pages/speech-coach/show-speech-coach-legacy.test.ts \
  src/lib/navigation-stack.test.ts \
  src/lib/nav-back-flows.test.ts \
  src/components/today-home/today-home-hero.test.tsx
```

**10 files / 60 tests — pass.**

```
pnpm --filter @workspace/kidschedule run typecheck
```

**Pass.**

```
pnpm --filter @workspace/kidschedule run build
```

**Pass** (production Vite build + phonics/static-audio prebuild gates).

API server not modified.

New / extended tests cover:

1. Primary live-session CTA + href + sanctuary CSS
2. Newly wired Home destinations
3. Guidance no longer fake-clickable
4. Child resolve order (selected / URL / stored / first eligible)
5. Home → Speech Coach storage write
6. Live-session no longer contained
7. Living Home still sanctuary (no purple wash)
8. Living OFF legacy cards still hidden when universe is living
9. Premium/free: no entitlement files changed
10. Catalogue containment still on for leftover products

---

## 12. Remaining P2 / P3

| ID | Severity | Item | Why leftover |
|---|---|---|---|
| P2-1 | P2 | Signed-in device/browser pass at 320–430px with real children (John / Child 2 / Child 3) | Auth wall; not automatable here |
| P2-2 | P2 | AppLink `safeHref` still strips query strings | Audited: does **not** break Speech Coach live-session, child context, preset, or notification paths (those use `setLocation` / storage / orchestrator). Left unchanged. Adjacent leftover queries (`/assistant?q=`, `/amy-coach?resume=`) are living-OFF / non-primary — contained, not a supported living production journey. See FINAL DEVICE VALIDATION §3. |
| P2-3 | ~~P2~~ | Talk with Amy not on living landing | **Closed** — secondary living CTA → existing `/speech-coach/talk` |
| P3-1 | ~~P3~~ | No `speech_coach_entry` | **Closed** — one navigation event, once per outside entry. Code-verified once-fire. Device fire not observed. |
| P3-2 | P3 | V2 hub still uses `children[0]` only | **Intentional tertiary containment (A).** V2 default OFF; session page already uses hub storage + picker. Hub dashboard-only. Left untouched. |
| P3-3 | P3 | Home “All children” vs last stored child | **Correct.** Household Home filter; Speech Coach stays last stored specific child. No incorrect user-facing behaviour. Left untouched. |
| P3-4 | P3 | Reports PDF remains disabled | **Intentionally unavailable.** Disabled + lock + coming-soon copy. Not a fake working control. Left untouched. No PDF engine. |
| P3-5 | P3 | Health Lab / Nutrition / Birth Sky are not on the Home four-path list | Available via Rooms / drawer; avoided a marketing grid |
| P3-6 | P3 | Legacy P1 docs still describe live-session as ROLLBACK ONLY | Historical review docs; behavior is now first-party. This file is the current contract |

---

## Acceptance criteria

| Criterion | Status |
|---|---|
| Parent can find Speech Coach live practice without hunting | **Met** — above-fold primary CTA |
| Primary live session visible and obvious | **Met** |
| Existing practice paths remain | **Met** |
| No visible control silently does nothing | **Met** for identified living Speech Coach controls |
| Existing modules remain accessible | **Met** |
| Home remains sanctuary first room | **Met** — NRT hero first; compact list under it |
| Child context preserved | **Met** via existing hub storage + live href |
| Mobile navigation intact | **Met** |
| Amy AI FAB intact | **Met** |
| No subscription / pricing / analytics / notification regression | **Met** — those systems not edited |
| No new product phase | **Met** |
| `/` → `/begin` untouched | **Met** |
| FA-02 / P0-7 / Routine R2/R3 / Amy AI backend / RevenueCat untouched | **Met** |

---

## Files touched

- `artifacts/kidschedule/src/lib/living-leave-containment.ts`
- `artifacts/kidschedule/src/lib/living-leave-containment.test.ts`
- `artifacts/kidschedule/src/lib/speech-coach/living-room.ts`
- `artifacts/kidschedule/src/lib/speech-coach/living-room.test.ts`
- `artifacts/kidschedule/src/lib/today-home/care-paths.ts`
- `artifacts/kidschedule/src/lib/today-home/care-paths.test.ts`
- `artifacts/kidschedule/src/lib/today-home/living-home-containment.test.ts`
- `artifacts/kidschedule/src/components/today-home/today-care-paths.tsx`
- `artifacts/kidschedule/src/components/today-home/today-care-paths.test.tsx`
- `artifacts/kidschedule/src/components/today-home/today-home-sanctuary.css`
- `artifacts/kidschedule/src/components/speech-coach/speech-coach-living-room.css`
- `artifacts/kidschedule/src/pages/speech-coach/index.tsx`
- `artifacts/kidschedule/src/pages/speech-coach/live-speech-coach.tsx`
- `artifacts/kidschedule/src/pages/speech-coach/speech-coach-landing-discoverability.test.ts`
- `artifacts/kidschedule/src/pages/dashboard.tsx`

---

## Micro-remediation after B verdict

**Date:** 2026-09-07  
**Mode:** Founder-approved targeted pass only. No redesign, no new phase.

### Amy / Talk with Amy discoverability

Two existing conversation surfaces — not duplicated:

| Experience | Existing route | How a parent finds it now |
|---|---|---|
| Amy AI conversation | `/assistant` | Home → **What Amy can help with → Amy**; Amy FAB; drawer “Amy” |
| Speech Coach Talk with Amy | `/speech-coach/talk` | Speech Coach living landing secondary **Talk with Amy** (`speech-coach-talk-entry`) → existing `conversation-coach.tsx` |

Home Amy was already the existing Amy route (`/assistant`). It was not retargeted to `/speech-coach/talk`. Talk is a Speech Coach interior and is now discoverable on that module without knowing the URL.

Talk navigation uses `setLocation(livingSpeechTalkHref)` (same pattern as live practice). Child context is resolved on `conversation-coach` via selected → URL → hub storage → first eligible. Auth, paywall, and talk engine are unchanged.

### `speech_coach_entry` result

No equivalent first-party open event existed (V2 has `speech_coach_v2_session_start` only).

Added **one** taxonomy event:

```
speech_coach_entry { source?, child_id?, living? }
category: navigation
```

Fired from the `/speech-coach` landing when the previous sanitized route is **outside** the Speech Coach module. Skips:

- invisible remounts (1.5s same-key debounce)
- `/speech-coach` ↔ `/speech-coach/live-session` / `/talk` hops

Does not fire from live-session start, does not touch subscription / RevenueCat / purchase events. Growth dashboards still key Speech Coach impact off `speech_coach_v2_session_start` (untouched).

### AppLink query-string result

**Decision: DO NOT CHANGE `safeHref` / `normalizeRoutePath`.**

| Journey | Uses AppLink? | Query required? | Broken? |
|---|---|---|---|
| Notification → destination | No — `safeNavigate` / orchestrator | Category maps to path (phonics → `/speech-coach`) | No |
| Speech Coach live-session | Landing uses `setLocation` + full href | preset/childId on that href | No |
| Child context | Hub storage `amynest:hub:activeChildId` | AppLink would strip `?childId=` | No |
| Live preset | `setLocation(livingSpeechLivePracticeHref)` | Yes, and not via AppLink | No |
| Campaign / notif deep link | Notification stack, not AppLink | Path-level | No |

Regression test: `src/lib/app-link-query-journeys.test.ts`.

**Still true, out of this pass:** AppLink clicks to `/assistant?q=` (hub prompts) and `/amy-coach?resume=` (legacy dashboard continue) still lose the query. Not in the founder-listed production journeys. Left as P3.

### V2 hub child-context decision

**A — intentional tertiary legacy containment. No code change.**

- V2 is remote-config gated, default **OFF**.
- Living landing only links V2 inside collapsed More.
- V2 **session** already reads `amynest:hub:activeChildId` and has a child picker.
- V2 **hub** `children[0]` only feeds the hub parent-dashboard tab — not the live session.

No reachable default-ON production journey shows the wrong child in the live V2 session.

### Tests

```
pnpm --filter @workspace/kidschedule exec vitest run --config vitest.config.ts \
  src/lib/speech-coach/living-room.test.ts \
  src/lib/speech-coach/entry-analytics.test.ts \
  src/lib/app-link-query-journeys.test.ts \
  src/lib/living-leave-containment.test.ts \
  src/lib/today-home/care-paths.test.ts \
  src/lib/today-home/living-home-containment.test.ts \
  src/components/today-home/today-care-paths.test.tsx \
  src/pages/speech-coach/speech-coach-landing-discoverability.test.ts \
  src/pages/speech-coach/show-speech-coach-legacy.test.ts \
  src/lib/navigation-stack.test.ts \
  src/components/today-home/today-home-hero.test.tsx
```

Plus kidschedule typecheck and production web build (this pass).

### Build

- Kidschedule typecheck: this pass
- Production web build: this pass
- API: taxonomy event added (`lib/analytics-taxonomy`). Server validation picks it up automatically. No API feature/route change. API package build not required beyond taxonomy typecheck if run.

### Remaining device certification debt (NOT device-verified)

CODE VERIFIED only. Do not treat as DEVICE VERIFIED:

- 320 / 360 / 390 / 430px
- John / Child 2 / Child 3
- Speech Coach live-session entry
- Talk with Amy entry
- Home → Amy (`/assistant`)
- Notification / deep-link path where available

### Final verdict after micro-remediation

**B — PASS WITH P2/P3** (superseded by FINAL DEVICE VALIDATION below)

---

## FINAL DEVICE VALIDATION

**Date:** 2026-09-07  
**Mode:** Closure audit only. No new product work. No redesign. No campaign send.

### Verification layers

| Layer | Result |
|---|---|
| **CODE VERIFIED** | Yes — source audit + 12 test files / 60 tests + TypeScript + production web build |
| **DEVICE VERIFIED** | **No** — required signed-in Android/iOS journeys were not executed |
| **PRODUCTION VERIFIED** | **No** — no production canary, no Play/App Store install pass this session |

### Device availability (this session)

| Surface | Observed |
|---|---|
| Android physical / emulator | **Unavailable.** `adb` not installed. No Android device listed. |
| iOS physical | **Unavailable.** `xctrace list devices` shows only this MacBook Pro. No iPhone/iPad attached. |
| iOS Simulator | Installed (iPhone 17 / 13 / iPads on iOS 26.5) — all **Shutdown**. Not booted. |
| Local web (`:3000`) | **Not running.** |
| Signed-in founder session | **Unavailable.** No John / Child 2 / Child 3 session in this environment. |

Booting a Shutdown simulator to an unsigned `/begin` login wall is **not** device verification of the required journeys. No simulator was launched. No notification was sent.

---

### 1. Required journey matrix

Status values: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTABLE**

Every row below is **CODE VERIFIED** unless noted. **DEVICE VERIFIED = no** for all rows.

#### HOME — 320 / 360 / 390 / 430 × John / Child 2 / Child 3

| Journey | Status | Notes |
|---|---|---|
| Home loads correctly | **NOT TESTABLE** | Living Home contract tests pass. No signed-in device. |
| Sanctuary styling remains intact | **NOT TESTABLE** | CSS/containment tests pass. Not visually confirmed on device. |
| “What Amy can help with” visible and usable | **NOT TESTABLE** | Component exists under NRT hero. Not exercised on device. |
| Today's plan works | **NOT TESTABLE** | Care path → `/routines`. Not exercised on device. |
| Speech Coach entry works | **NOT TESTABLE** | Care path → `/speech-coach` + hub storage. Not exercised on device. |
| Amy entry works | **NOT TESTABLE** | Care path → `/assistant`. Not exercised on device. |
| Rooms entry works | **NOT TESTABLE** | Care path → `/parenting-hub`. Not exercised on device. |
| Bottom navigation works | **NOT TESTABLE** | Architecture unchanged. Not exercised on device. |
| Amy AI FAB does not cover important actions | **NOT TESTABLE** | Home already pads for FAB/tabs. Not visually confirmed on device. |

#### SPEECH COACH

| Journey | Status | Notes |
|---|---|---|
| Speech Coach is discoverable | **NOT TESTABLE** | Home + Rooms + drawer wired. Not exercised on device. |
| Start live practice is obvious | **NOT TESTABLE** | Above-fold living CTA in source. Not visually confirmed. |
| Start live practice opens the real live session | **NOT TESTABLE** | Containment removed; `setLocation` to existing live route. Not exercised on device. |
| Talk with Amy opens the real Talk experience | **NOT TESTABLE** | Secondary living CTA → `/speech-coach/talk`. Not exercised on device. |
| Quiet practice paths work | **NOT TESTABLE** | Unchanged deepen paths. Not exercised on device. |
| More practice works | **NOT TESTABLE** | Unchanged tertiary. Not exercised on device. |
| No card appears clickable while doing nothing | **NOT TESTABLE** | Guidance cards no longer fake-click. PDF disabled + coming soon. Not visually confirmed. |
| Child context remains correct | **NOT TESTABLE** | Resolve order code-verified. John / Child 2 / Child 3 not available. |

#### AMY

| Journey | Status | Notes |
|---|---|---|
| Home → Amy opens existing `/assistant` | **NOT TESTABLE** | Care path href is `/assistant`. Not exercised on device. |
| Child context is preserved | **NOT TESTABLE** | Hub storage write on care-path click when a specific child is selected. |
| Existing Amy functionality remains intact | **NOT TESTABLE** | Assistant page/engine not edited this pass. |

#### NAVIGATION

| Journey | Status | Notes |
|---|---|---|
| Home → module | **NOT TESTABLE** | Care paths + existing tabs/drawer. |
| Module → Home | **NOT TESTABLE** | Existing Back to Today Home / tab. |
| Drawer → module | **NOT TESTABLE** | Drawer architecture unchanged. |
| Bottom tabs | **NOT TESTABLE** | Unchanged. |
| Back navigation | **NOT TESTABLE** | Existing `smartBack` / module exits. Navigation-stack tests pass. |
| No loops | **NOT TESTABLE** | Live/talk no longer bounce to landing (code). Not exercised on device. |
| No blank/inert destinations | **NOT TESTABLE** | Identified living Speech Coach controls remapped or made static. Not exercised on device. |

---

### 2. Notification deep-link

**Do not enable a campaign. Did not send a test notification.**

Existing canary only: Settings → `POST /api/notifications/test` (signed-in user). Architecture / fatigue gate / FCM / APNs **untouched**.

| Check | Status | Layer |
|---|---|---|
| Phonics category → `/speech-coach` | **PASS** (code) | `evaluateNotificationNavigation` + `action-routing`. New guard case: `canary-phonics-1` → `/speech-coach` |
| Notification → app open → correct destination | **NOT TESTABLE** | Requires signed-in device + Settings test send |
| Correct child context on open | **NOT TESTABLE** | Category maps to path, not a child id |
| Notification open attribution | **NOT TESTABLE** | Existing stack; not observed on device |

No fatigue-rule or notification-architecture change.

---

### 3. AppLink remaining P2 — `/assistant?q=` and `/amy-coach?resume=`

**Decision: leave untouched. Contained P2/P3. No routing rewrite.**

| Query | Who uses AppLink? | Is it a supported living production journey? | Fix? |
|---|---|---|---|
| `/assistant?q=` | Legacy Parenting Hub mall tiles (`AmyAISuggestionsSection` / `EmotionalSupportSection`) | **No.** Living Rooms V1 Ask Amy uses `/assistant` without query. Cry-insight / infant / new-parent-tips use wouter `Link` or `navigate()` (query preserved). | No |
| `/amy-coach?resume=` | `AmyCoachCheckInCard` AppLink path | **No for living Home.** Card mounts only when `!TODAY_HOME_V1`. Living Home hides it. Primary continue already uses `setLocation(\`/amy-coach?resume=\`)` which keeps the query. | No |

AppLink `safeHref` still strips queries (pre-existing contract). Listed production journeys (Speech Coach live/talk, Home child context, notification path) do not depend on AppLink queries.

Regression: `src/lib/app-link-query-journeys.test.ts`.

---

### 4. Home “All children” vs last stored child

**Decision: correct. Leave untouched. No child-picker redesign.**

Observed contract:

- Home chip **All children** calls `handleSelectChild(null)` — session filter becomes household; **does not wipe** `amynest:hub:activeChildId`.
- Care-path click writes storage **only when** `childId != null`.
- Speech Coach is always one child: selected → URL → **last stored** → first eligible.

User-facing behaviour: Home “All children” is a household view for Today’s plan. Opening Speech Coach continues the last specific child (John / Child 2 / Child 3), not a fake “all children” speech session. That is correct. Not labelled on Speech Coach — leftover honesty P3 only, not a defect.

---

### 5. Reports PDF

**Decision: intentionally unavailable. Leave untouched. No PDF engine.**

`ReportsSection` download control is:

- `disabled` Button
- Lock icon
- `screens.speech_coach.reports.download_pdf`
- Explicit `pdf_coming_soon` (“PDF reports coming soon — your weekly summary is being saved.”)

It does **not** look like a working clickable feature. No destination exists to route to. No change.

---

### 6. Analytics — `speech_coach_entry`

**CODE VERIFIED.** Device fire **NOT TESTABLE.** Subscription instrumentation **untouched.**

| Condition | Expected | Test |
|---|---|---|
| Enter Speech Coach from outside (Home / Rooms / Amy / direct) | Fires **once** | `entry-analytics.test.ts` — Home → Speech Coach fires `source: today-home` |
| Remount from same outside source | Does **not** fire again | Debounce / same-key skip |
| Speech Coach → live session | Does **not** fire | Internal hop skip |
| Live session → Speech Coach | Does **not** fire | Internal hop skip |
| Normal internal module navigation | Does **not** fire | Previous sanitized route inside `/speech-coach*` |

---

### 7. No-regression guard (this pass)

Not changed:

- `/begin`
- Living Home sanctuary
- Routine R2/R3
- Speech Coach live engine
- Amy AI backend/workspace
- RevenueCat / pricing / subscription instrumentation
- Notification architecture / fatigue gate
- FA-02 / P0-7
- Living OFF containment
- Existing legacy routes
- AppLink `safeHref` contract
- Child picker UI
- Reports PDF engine (none)

Only audit-supporting tests added/extended (`app-link-query-journeys`, notification phonics canary case). No product surface change.

---

### 8. Test / build matrix (this pass)

```
pnpm --filter @workspace/kidschedule exec vitest run --config vitest.config.ts \
  src/lib/speech-coach/living-room.test.ts \
  src/lib/speech-coach/entry-analytics.test.ts \
  src/lib/app-link-query-journeys.test.ts \
  src/lib/living-leave-containment.test.ts \
  src/lib/today-home/care-paths.test.ts \
  src/lib/today-home/living-home-containment.test.ts \
  src/lib/notification-navigation-guard.test.ts \
  src/components/today-home/today-care-paths.test.tsx \
  src/pages/speech-coach/speech-coach-landing-discoverability.test.ts \
  src/pages/speech-coach/show-speech-coach-legacy.test.ts \
  src/lib/navigation-stack.test.ts \
  src/components/today-home/today-home-hero.test.tsx
```

**12 files / 60 tests — pass.**

| Gate | Result |
|---|---|
| Kidschedule TypeScript (`tsc --noEmit`) | **PASS** |
| Navigation / Speech Coach / Home-living / analytics / notification-guard tests | **PASS** |
| Production web build (`pnpm --filter @workspace/kidschedule run build`) | **PASS** |
| API build | **Not run** — API not affected |

Device results are **not** implied by the above.

---

### 9. Certification debt (exact)

To upgrade this verdict to **A — READY**, a founder (or device lab) must actually run, signed in, with John / Child 2 / Child 3:

1. Android WebView shell (`android/`) and iOS Capacitor at **320 / 360 / 390 / 430**
2. Every HOME / SPEECH COACH / AMY / NAVIGATION row above
3. Settings **test notification** canary only (phonics → Speech Coach) — no campaign
4. Confirm `speech_coach_entry` fires once in real analytics for an outside entry

Until then, device rows stay **NOT TESTABLE**.

---

### FINAL VERDICT (prior validation pass)

**B — READY WITH P2/P3**

Superseded by **FINAL DEVICE CERTIFICATION** below.

---

## FINAL DEVICE CERTIFICATION

**Date:** 2026-09-07  
**Mode:** Release-candidate device certification only. No product changes. No campaign. No redesign.

Attempted to convert CODE VERIFIED → DEVICE VERIFIED. Real Android / iOS hardware and a signed-in test account were **not available** in this environment. No journeys were executed. No evidence was manufactured.

### Verification layers

| Layer | Result |
|---|---|
| **CODE VERIFIED** | **Yes** — unchanged from prior pass: 12 files / 60 tests, TypeScript PASS, production web build PASS. This certification pass did not re-run or alter that matrix. |
| **DEVICE VERIFIED** | **No** |
| **PRODUCTION VERIFIED** | **No** — no Play Store / TestFlight / production-app session exercised |

No P0 / P1 / release-blocking defect was observed because no device session existed. No product files were changed.

### Device / lab probe (this session)

| Probe | Result |
|---|---|
| Android USB / wireless (`adb devices -l` via SDK platform-tools) | Empty. **No device attached.** |
| Android AVDs (`emulator -list-avds`) | **None.** |
| iOS physical (`xcrun xctrace list devices`, `xcrun devicectl list devices`) | MacBook Pro only. **No iPhone/iPad.** `devicectl`: “No devices found.” |
| USB inventory (`system_profiler SPUSBDataType`) | **No** iPhone / iPad / Android phone. |
| iOS Simulator | Present, all **Shutdown**. Not booted — a login wall is not certification. |
| Local web `:3000` | Not running. |
| Browser tabs | None open. No signed-in production session. |
| Test account / John / Child 2 / Child 3 | **Unavailable** in this environment. |

**Exact devices used:** none.

| Platform | Model | OS | App build | Account |
|---|---|---|---|---|
| ANDROID | — | — | — | — |
| IOS | — | — | — | — |

---

### Journey matrix

Never convert **NOT TESTABLE** → **PASS**.

| # | Journey | ANDROID | IOS |
|---|---|---|---|
| 1 | Home loads correctly | **NOT TESTABLE** | **NOT TESTABLE** |
| 2 | Living sanctuary styling | **NOT TESTABLE** | **NOT TESTABLE** |
| 3 | What Amy can help with | **NOT TESTABLE** | **NOT TESTABLE** |
| 4 | Home → Speech Coach | **NOT TESTABLE** | **NOT TESTABLE** |
| 5 | Speech Coach primary “Start live practice” | **NOT TESTABLE** | **NOT TESTABLE** |
| 6 | Live session opens | **NOT TESTABLE** | **NOT TESTABLE** |
| 7 | Talk with Amy opens | **NOT TESTABLE** | **NOT TESTABLE** |
| 8 | Home → Amy | **NOT TESTABLE** | **NOT TESTABLE** |
| 9 | Child context preserved | **NOT TESTABLE** | **NOT TESTABLE** |
| 10 | Child switching (John / Child 2 / Child 3) | **NOT TESTABLE** | **NOT TESTABLE** |
| 11 | Bottom navigation | **NOT TESTABLE** | **NOT TESTABLE** |
| 12 | Hamburger / drawer | **NOT TESTABLE** | **NOT TESTABLE** |
| 13 | Back navigation | **NOT TESTABLE** | **NOT TESTABLE** |
| 14 | Amy AI FAB | **NOT TESTABLE** | **NOT TESTABLE** |
| 15 | No clipped / overlapping CTA | **NOT TESTABLE** | **NOT TESTABLE** |
| 16 | No horizontal overflow (320 / 360 / 390 / 430) | **NOT TESTABLE** | **NOT TESTABLE** |

Widths **320 / 360 / 390 / 430**: **NOT TESTABLE** on both platforms.  
Children **John / Child 2 / Child 3**: **NOT TESTABLE** on both platforms.

Dynamic Type / VoiceOver / accessibility: **not claimed** (not tested).

---

### Notification canary

**Not sent.** Broad campaign not enabled. Fatigue gate / FCM / APNs untouched.

| Check | ANDROID | IOS |
|---|---|---|
| Delivery | **NOT TESTABLE** | **NOT TESTABLE** |
| Open | **NOT TESTABLE** | **NOT TESTABLE** |
| Destination (Speech Coach where applicable) | **NOT TESTABLE** | **NOT TESTABLE** |
| Child context | **NOT TESTABLE** | **NOT TESTABLE** |
| Open attribution | **NOT TESTABLE** | **NOT TESTABLE** |

Code path remains: Settings single-user `POST /api/notifications/test`; phonics category → `/speech-coach` (prior CODE VERIFIED). Device delivery was not attempted.

---

### Analytics (`speech_coach_entry`)

| Check | Result |
|---|---|
| Fires once on outside entry | **CODE VERIFIED** (prior tests). Device observation **NOT TESTABLE**. |
| Does not fire on remount / internal hops | **CODE VERIFIED**. Device observation **NOT TESTABLE**. |
| Subscription / purchase events | **Untouched.** |

---

### Product changes this pass

**None.** No defect could be documented from a device session. No Home / Speech Coach / navigation / Amy / Rooms / notification / pricing / subscription edit.

---

### What would upgrade this to A

A signed-in **real Android** (Play / live WebView shell) and **real iPhone/iPad** (TestFlight / production) with John / Child 2 / Child 3, exercising every row above plus the Settings test-notification canary only.

Until those sessions exist, DEVICE VERIFIED stays **No**.

---

### FINAL VERDICT

**B — READY WITH P2/P3**

Certification debt is exact: no attached Android, no attached iOS, no signed-in child session, no notification canary delivery.

Stop. No new product phase.