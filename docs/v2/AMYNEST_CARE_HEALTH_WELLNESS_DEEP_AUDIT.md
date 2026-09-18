# AmyNest Care → Health & Wellness Deep Audit

**Status:** FIXED + final verification on branch `cursor/care-health-wellness-audit-fb4f`  
**Date:** 2026-09-18  
**Scope:** Care living room → Health quiet path → Health Lab practices  
**Production:** not deployed. Live signed-in billing and device motion still require controlled production verification.

Authoritative living catalog is `HEALTH_LAB_QUIET_PATHS` in `artifacts/kidschedule/src/lib/health-lab/living-room.ts`. Game engines live in `artifacts/kidschedule/src/features/health-lab/`. Care advertising is `quietPathsForRoom("care")` filtered by `resolveQuietPathsForRoom`.

Living universe is default ON (`isHealthLabLivingV1Enabled()`). Galaxy Health Lab home (XP, shop, treasure, `calmness-meter`) is not the Care opening.

---

# Executive Summary

Care → Health & Wellness was not a set of dead click handlers. The five advertised practices already had engines, routes, and a shared immersive shell. The failures were structural:

1. Immersive practices sat **under** the mobile tab bar and Ask Amy FAB (`z-index: 100` vs tab bar `1000` / FAB `2001`).
2. Care / Health Lab listings did not reserve enough space above that chrome, so the last cards and CTAs sat behind it.
3. Child chips overflowed horizontally instead of wrapping.
4. Care advertised Health to **13+** children even though `/health-lab` filters them out (`HEALTH_LAB_MAX_AGE_MONTHS = 156`).
5. Living-mode games still passed galaxy start labels, hiding **Begin gently**.
6. Motion calibration used a full-viewport overlay with **no Exit**.

All six are fixed on this branch. Playwright E2E launches every advertised practice at 390×844, 412×915, 768×1024, 1024×1366, and 1440×900.

Classification of the original screenshot:

| Signal | Verdict |
|---|---|
| Child selector horizontal overflow | FIXED |
| Content behind bottom navigation | FIXED (scroll-to-end + tab-bar clearance) |
| Last activity unreachable | FIXED |
| Amy AI covering a CTA | FIXED while a practice is open; listing still requires scroll on short phones |
| Click does nothing / blank page | NOT REPRODUCED as a missing component. Launch works when the immersive host is above chrome. |

---

# Activity Inventory

Living Care advertises **Health** as one quiet path. That path opens Health Lab, which advertises five practices plus a recommend CTA. `calmness-meter` (Wellness Report) exists in `GAMES` / `HealthGameId` but is **not** on the living opening.

| Activity | ID | Route | Component | Before | Root Cause | Fix | After |
|---|---|---|---|---|---|---|---|
| Health (Care path) | `health-lab` | Care deepen → `/health-lab` | `RoomLivingStream` → `HealthLabZone` | Opens; last cards behind tab bar; 13+ dead end | Chrome z-index / padding; age filter missing on quiet paths | Tab-bar clearance, chip wrap, hide Health at 13+ | PASS |
| Breath & focus | `breath-control` | Health Lab in-app view `game` | `BreathControlGame` | Opens; tab bar covered Exit / hold | Immersive viewport z-index 100 | Viewport z-index 3000; hide `.app-footer` / FAB | PASS |
| Balance | `flamingo-balance` | same | `FlamingoBalanceGame` | Opens; galaxy CTA; calibration trapped | `startLabel="Start Survival"`; calibration `fixed` overlay with no Exit | Living CTA; calibration Exit | PASS |
| Stillness | `freeze-statue` | same | `FreezeStatueGame` | Same as Balance | `startLabel="Start Dancing"`; calibration overlay | Living CTA; calibration Exit | PASS |
| Attention | `reaction-time` | same | `ReactionTimeGame` | Opens; galaxy CTA | `startLabel="Launch Mission"` | Living `Begin gently` | PASS |
| Steady hands | `finger-stability` | same | `FingerStabilityGame` | Opens; galaxy CTA | `startLabel="Power Up Reactor"` | Living `Begin gently` | PASS |
| Recommend | next of the five | same | `pickNextPlayableGame` | Opens first playable | Same chrome issues | Same immersive fix | PASS |
| Wellness Report | `calmness-meter` | not advertised | `CalmnessMeterGame` | Not on living opening | Intentional — not a Care quiet path | Unchanged | NOT REPRODUCED as a Care listing bug |

Launch method for all five: `HealthLabHome` living opening → `launchGame(gameId)` → motion prep (balance / stillness) → `setView({ kind: "game", gameId })` → `HealthLabImmersiveHost` portal to `document.body`.

Required props: `onExit`, `onComplete`; flamingo / freeze also take `childId` for motion. Child/age: games are age-independent once Health Lab is eligible (24 months–12 years). Infant `<24m` sees Health Lab **preview**, not these five. Premium: Care destination card is `FeatureGate` / `hub_health_lab`; the isolated E2E fixture does not exercise the paywall. Feature flag: living Health Lab default ON. Lazy import: Health Lab page is lazy in `AppCore`; game components are static imports inside `HealthLabZone`.

---

# Broken Activities

## 1. Immersive practice covered by tab bar / Ask Amy

- **Symptom:** Practice chrome (Exit, Begin gently, hold control) untappable or visually under bottom nav. Classification **I / K**.
- **Reproduction:** Care → Health → any quiet path on a 390×844 viewport.
- **Root cause:** `.health-lab-game-viewport` was `z-index: 100`. `.app-footer` is `1000`. `#amy-fab-floating` is `2000/2001`.
- **Files:** `artifacts/kidschedule/src/index.css`, `artifacts/kidschedule/src/features/health-lab/components/health-lab-immersive-host.tsx`
- **Fix:** Viewport `z-index: 3000`. While `html.health-lab-immersive`, hide `.app-footer` and `#amy-fab-floating`.
- **Verification:** Playwright asserts `mobile-tab-bar` is hidden during every practice. Screenshot `care_health_wellness_breath-control_play.png`. **FIXED**

## 2. Care / Health Lab listing clipped by bottom chrome

- **Symptom:** Last quiet path and “Back to Today Home” sit behind tab bar + FAB. Classification **H / I**.
- **Reproduction:** Health Lab living opening at 390×844 and 768×1024 without scrolling to end.
- **Root cause:** Listing scroll containers had no tab-bar + FAB clearance. `scrollIntoViewIfNeeded` treated an overlay-covered node as visible. `overflow-x: clip` on sanctuary/living shells also forced a nested scroll box.
- **Files:** `artifacts/kidschedule/src/index.css`, `artifacts/kidschedule/src/components/hub-module-page-shell.tsx`, `artifacts/kidschedule/src/pages/parenting-hub.tsx`, `artifacts/kidschedule/src/components/health-lab/health-lab-living-room.css`, `artifacts/kidschedule/src/components/parent-hub/parent-hub-living-room.css`
- **Fix:** `.app-tabbar-content-clearance` = `10.5rem + safe-area` (2rem at `lg+`). `body.has-tabbar` `scroll-padding-bottom` matches. Quiet paths and `.hl-exit-home` get the same `scroll-margin-bottom`. Living / sanctuary `overflow-x: clip`.
- **Verification:** Viewport tests scroll to end and assert last path + exit-home sit above the tab bar. **FIXED**

## 3. Child selector horizontal overflow

- **Symptom:** Long names (e.g. Kai Montgomery-Anastasia) stretch the Care header sideways. Classification **G**.
- **Reproduction:** Multi-child Care header at ~390 width.
- **Root cause:** Child chips were a non-wrapping row without `min-w-0` / `overflow-wrap`.
- **Files:** `artifacts/kidschedule/src/components/hub-module-page-shell.tsx`, `artifacts/kidschedule/src/components/parent-hub/parent-hub-living-room.css`, `artifacts/kidschedule/src/playwright/rooms-living-fixture.tsx`
- **Fix:** Flex wrap, `min-w-0`, `max-w-full`, `overflow-wrap: anywhere` on `.ph-quiet-child-chip`.
- **Verification:** `assertNoHorizontalOverflow` at all five viewports. Screenshot `care_health_wellness_care_listing_390.png`. **FIXED**

## 4. Health advertised at 13+ then empty

- **Symptom:** Teen profile still sees Care → Health, then Health Lab empty state. Classification **M**.
- **Reproduction:** Child age ≥ 156 months.
- **Root cause:** `quietPathsForRoom("care")` always included `health-lab`. `/health-lab` already filtered `totalAgeMonths < 156`. Care did not receive `ageMonths`.
- **Files:** `artifacts/kidschedule/src/lib/parent-hub/eligibility.ts`, `artifacts/kidschedule/src/components/parent-hub/room-living-stream.tsx`, `artifacts/kidschedule/src/pages/parenting-hub.tsx`
- **Fix:** `isHealthModuleEligible`; `resolveQuietPathsForRoom` omits Health when `ageMonths >= 156`; Care stream receives `ageMonths={totalAgeMonths}`.
- **Verification:** Playwright child 4 (168 months) → Health count 0. Eligibility + rooms-acceptance unit tests. **FIXED** (age gating not weakened)

## 5. Living games showed galaxy start labels

- **Symptom:** Balance / Stillness / Attention / Steady hands started with “Start Survival”, “Start Dancing”, “Launch Mission”, “Power Up Reactor”. Classification **G**.
- **Reproduction:** Open those practices with living flag ON (default).
- **Root cause:** `HealthLabGameOnboarding` uses `startLabel ?? livingPracticeStartCta()`. Four games always passed a galaxy `startLabel`. Breath already passed `undefined` when living.
- **Files:** flamingo / freeze / reaction / finger game components
- **Fix:** `startLabel={living ? undefined : "..."}`.
- **Verification:** E2E asserts `health-lab-practice-start` text `/Begin gently/i`. **FIXED**

## 6. Motion calibration had no Exit

- **Symptom:** After Begin gently, Balance / Stillness show “HOLD DEVICE STILL” with Exit covered. Classification **K**.
- **Reproduction:** Flamingo or freeze → Begin gently on a machine without DeviceOrientation (Playwright uses simulation).
- **Root cause:** `HealthLabMotionCalibration` was `position: fixed; inset: 0; z-index: 50` with no cancel control. Game top bar is `z-20`.
- **Files:** `health-lab-motion-calibration.tsx`, flamingo / freeze games
- **Fix:** Calibration is a panel under the shared game top bar (no full-viewport overlay covering Exit). Optional `onCancel` remains if a host needs a second control.
- **Verification:** E2E still exits via `health-lab-practice-exit` on the game top bar. Screenshot `care_health_wellness_flamingo-balance_play.png`. **FIXED**

## 7. Unknown game id rendered blank

- **Symptom:** `HealthLabZone.renderGame` default returned `null`. Classification **C** if a stale id ever reached the switch.
- **Reproduction:** Not hit by the living catalog (all five ids match `GAMES`).
- **Fix:** `HealthLabGameUnavailable` fallback with Back. **FIXED** as defense in depth

---

# UI/Layout Findings

| Topic | Finding | Status |
|---|---|---|
| Mobile overflow | Sanctuary + living shells clip X; child chips wrap | FIXED |
| Bottom navigation overlap | Immersive host hides tab bar; listing uses 10.5rem clearance + scroll-margin | FIXED |
| Floating Amy AI overlap | Hidden during immersive; listing FAB sits in tab bar. Short viewports still need a scroll to expose the last listing CTA | FIXED / expected scroll |
| Scrolling | `scroll-padding-bottom` on `body.has-tabbar`; tests scroll to document end | FIXED |
| Safe-area | Clearance includes `env(safe-area-inset-bottom)` | FIXED |
| Responsive | Playwright 390, 412, 768, 1024, 1440 | PASS |
| Nested scroll | `overflow-x: clip` no longer used as the only listing scroller without Y padding | FIXED |

Health Lab listing at 390×844 is taller than the viewport. That is acceptable: the last activity is reachable by scrolling, which the E2E now asserts. Full-page screenshots still *draw* the fixed tab bar over mid-document content; that is compositor overlay, not a remaining clip after scroll-to-end.

---

# Routing Findings

| Path | Result |
|---|---|
| Care `health-lab` tile | `selectRoomLivingTile` → destination render → `HealthZoneLaunchCard` `href="/health-lab"` in production rooms. Fixture opens `HealthLabZone` directly. |
| `/health-lab` | `HealthLabPage` + `HubModulePageShell` `filterChild` age `< 156`; infant preview `< 24m` |
| In-app game view | Not a URL change. `setView({ kind: "game", gameId })` |
| Back from practice | `onExit` → `view = "home"` |
| Back from Health Lab | Living `AppLink` `/parenting-hub#tile-health-lab` (Care room with Health hash). Fixture maps `/parenting-hub` and `/dashboard` back to Care. |
| Stale routes / missing components | None. All five quiet path ids exist in `GAMES` and `renderGame`. |
| Duplicate ids | None in `HealthGameId` |

Production still uses a **two-step** Care → launch card → `/health-lab` hop (same pattern as other room destinations that are standalone routes). That is not a dead click. Nutrition embeds in-room; Health Lab is a full route because practices are immersive.

---

# Registry/Data Findings

**Authoritative living catalog:** `HEALTH_LAB_QUIET_PATHS` (5).  
**Authoritative engines:** `GAMES` + `HealthGameId` (6, including `calmness-meter`).  
**Playable set:** `PLAYABLE_GAMES` = `GAMES` minus `calmness-meter`.

No orphan living cards. No duplicate quiet-path ids. Galaxy `HealthLabWorldMap` still lists playable games when living is OFF — out of scope for Care living.

`calmness-meter` is intentionally omitted from the Care opening (`recommendHealthLabAction("calmness-meter")` falls back to breath). It is **not** hidden to paper over a bug.

---

# Age-Aware Findings

| Age | Care Health path | Health Lab surface |
|---|---|---|
| 0–23 months | Shown | Preview only (`health-lab-preview-living`). Practices do not launch. |
| 24–155 months | Shown | Full five practices. |
| ≥ 156 months (13+) | Hidden | Empty message if the route is opened directly. |

Infant preview is intentional, not a broken catalog. 13+ hiding matches the page filter. Playwright: child 1 (8m) preview; child 2 (36m) and 3 (72m) full; child 4 (168m) no Health path.

---

# Console/Network Findings

| Event | Verdict |
|---|---|
| `**/api/health-lab/**` in E2E | Mocked 200. No remaining health-lab request failures. |
| Other `/api/**` (client logs) during a long practice loop | `ERR_CONNECTION_REFUSED` without API server. Fixture now fulfills `**/api/**`. EXPECTED in this harness. |
| `/health-lab-audio/crystal-garden-dance.mp3` | **In repo** at `artifacts/kidschedule/public/health-lab-audio/crystal-garden-dance.mp3` (97010 bytes, MPEG ADTS layer III). Vite public URL `/health-lab-audio/crystal-garden-dance.mp3`. Production `https://www.amynest.in/health-lab-audio/crystal-garden-dance.mp3` HTTP 200, `content-type: audio/mpeg`, `content-length: 97010`. Care E2E now requests the real file (no empty MPEG stub). **PASS** for repo + local Vite + production static HTTP. |
| Experience photography `/experience/r1/shot-01-arrival.png` | Loads in fixture (Care hero visible). |
| Page errors during advertised launches | None after API mocks. Health-lab / health-lab-audio / `/api/` 404s and 500s: none. PASS |

Do not treat the client-log connection refusal as a Health Lab product bug. The Care E2E fixture still fulfills `**/api/**` so those refusals are not part of this run.

---

# Files Changed

## Layout / chrome

- `artifacts/kidschedule/src/index.css`
- `artifacts/kidschedule/src/components/health-lab/health-lab-living-room.css`
- `artifacts/kidschedule/src/components/parent-hub/parent-hub-living-room.css`
- `artifacts/kidschedule/src/components/hub-module-page-shell.tsx`
- `artifacts/kidschedule/src/pages/parenting-hub.tsx`

## Registry / age / launch

- `artifacts/kidschedule/src/lib/parent-hub/eligibility.ts`
- `artifacts/kidschedule/src/components/parent-hub/room-living-stream.tsx`
- `artifacts/kidschedule/src/features/health-lab/components/health-lab-zone.tsx`
- `artifacts/kidschedule/src/features/health-lab/components/health-lab-game-ui.tsx`
- `artifacts/kidschedule/src/features/health-lab/components/health-lab-onboarding.tsx`
- `artifacts/kidschedule/src/features/health-lab/components/health-lab-motion-calibration.tsx`
- `artifacts/kidschedule/src/features/health-lab/components/games/{flamingo-balance,freeze-statue,reaction-time,finger-stability}-game.tsx`

## Tests / harness

- `artifacts/kidschedule/playwright.config.care-health-wellness.ts`
- `artifacts/kidschedule/playwright-care-health-wellness.html`
- `artifacts/kidschedule/playwright/specs/care-health-wellness.spec.ts`
- `artifacts/kidschedule/src/playwright/care-health-wellness-fixture.tsx`
- `artifacts/kidschedule/src/playwright/rooms-living-fixture.tsx`
- `artifacts/kidschedule/playwright/specs/health-lab-certification*.spec.ts` (living copy alignment)
- `artifacts/kidschedule/src/lib/parent-hub/eligibility.test.ts`
- `artifacts/kidschedule/src/lib/parent-hub/rooms-acceptance.test.ts`
- `artifacts/kidschedule/src/lib/health-lab/living-room.test.ts`
- `artifacts/kidschedule/src/components/parent-hub/room-living-stream.test.tsx`
- `artifacts/kidschedule/src/lib/health-lab-entitlement-path.test.tsx`
- `artifacts/kidschedule/src/features/health-lab/crystal-garden-dance-asset.test.ts`
- `artifacts/kidschedule/vitest.config.ts` (`NODE_ENV=test` so React 19 exports `act`)
- `artifacts/kidschedule/package.json` (`test:e2e:care-health-wellness`)

GCS / TTS / audio infrastructure was not changed. Crystal garden dance is still a static `/health-lab-audio/` file reference.

---

# Tests Run

| Suite | Command | Result |
|---|---|---|
| Libs typecheck | `pnpm run typecheck:libs` (pre-commit) | PASS |
| Kidschedule `tsc` | `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @workspace/kidschedule typecheck` | PASS (8GB heap required; default OOM is a known kidschedule tsc issue) |
| Vitest `room-living-stream.test.tsx` in isolation | `pnpm exec vitest run --config vitest.config.ts src/components/parent-hub/room-living-stream.test.tsx` | **4 passed / 1 file** |
| Vitest Care / Health subset | living-room, eligibility, rooms-acceptance, room-living, room-living-stream, health-lab, crystal-garden-dance-asset, health-lab-dialog-escape, hub-visibility, health-lab-entitlement-path, premium-access-decision, free-premium-phase4-freeze, locked-block.quiet, parent-hub-room | **131 passed / 14 files** |
| Playwright Care Health Wellness | `pnpm --filter @workspace/kidschedule test:e2e:care-health-wellness` | **9 passed** (32.4s) including denied entitlement |
| API Health Lab premium matrix | `node --import tsx/esm --test src/routes/health-lab-premium.test.ts` | **2 passed**; DB HTTP 402/200 suite **SKIPPED** (`isDbIntegrationAvailable()` false) |

Full `pnpm --filter @workspace/kidschedule test` (entire Vitest package) was **not** re-run this pass. Known unrelated failures remain: some kidschedule Vitest files with Vite resolution errors; `abacus.test.ts` / `speech.test.ts` Node 20 mock issues (AGENTS.md).

---

# Test Results

Playwright `care-health-wellness.spec.ts` (Chromium, `isMobile: true` project, per-test viewports):

1. Care advertises Health and every quiet practice launches — **PASS** (11.5s). Each of the five: visible, clickable, briefing `Begin gently`, play UI, tab bar hidden, Exit returns to Health Lab. Re-open breath works. Crystal Garden MP3 HTTP 200 from Vite.
2. Denied entitlement keeps Care Health visible but does not launch practices — **PASS**. Static preview only; no quiet-path launch.
3. Child profiles change Care Health eligibility — **PASS**. Infant preview; 6-year-old full lab; 13+ Health hidden.
4. Recommend launches a real practice — **PASS**.
5. Viewport 390×844 — **PASS**
6. Viewport 412×915 — **PASS**
7. Viewport 768×1024 — **PASS**
8. Viewport 1024×1366 — **PASS**
9. Viewport 1440×900 — **PASS**

---

# Playwright Viewports

| Viewport | Horizontal overflow | Last path / exit vs tab bar | Practice hides tab bar |
|---|---|---|---|
| 390×844 | PASS | PASS (scroll-to-end) | PASS |
| 412×915 | PASS | PASS | PASS |
| 768×1024 | PASS | PASS | PASS |
| 1024×1366 | PASS | Tab bar hidden (`lg`) | n/a |
| 1440×900 | PASS | Tab bar hidden | n/a |

---

# Regression Results

| Surface | Result |
|---|---|
| Previously working Breath hold UI | PASS — balloon, altitude, hold target, Exit |
| Attention countdown | PASS |
| Steady hands crystal + Touch to Start | PASS |
| Care listing Nutrition + Health | PASS |
| Child chip switch | PASS |
| Back from practice to Health Lab | PASS |
| Back from Health Lab to Care (fixture) | PASS |
| Bottom nav hidden during practice | PASS |
| Amy FAB hidden during practice | PASS |
| 13+ Health hidden | PASS |
| Infant Health preview | PASS |

---

# Remaining Issues

| Issue | Status |
|---|---|
| Crystal Garden dance MP3 in repo, Vite public, and production HTTP 200 | PASS |
| `room-living-stream.test.tsx` standalone RTL `React.act` | FIXED (`vitest.config.ts` forces `NODE_ENV=test`; React 19 production CJS omits `act`) |
| Fixture allowed vs denied Health Lab surfaces | PASS for the isolated fixture. Live Firebase / RevenueCat signed-in subscription is **PRODUCTION VERIFICATION REQUIRED** |
| Production Care two-step launch card → `/health-lab` | Not a broken registry. **PRODUCTION VERIFICATION REQUIRED** on a real signed-in hub |
| Server Health Lab HTTP 402 vs 200 against a real DB | Wiring tests PASS. DB integration suite SKIPPED here. **PRODUCTION VERIFICATION REQUIRED** |
| Motion games on a real device (DeviceOrientation permission, calibration timing) | PRODUCTION VERIFICATION REQUIRED |
| `calmness-meter` absent from living opening | Intentional. NOT a hide-the-bug. |
| Kidschedule `tsc` OOM without 8GB heap | Pre-existing tooling. Not introduced here. |
| Full package Vitest + health-lab certification Playwright | Not claimed. Run those on CI / follow-up if needed. |

No advertised living Care Health practice is left as a blank page, dead click, or placeholder.

---

# Evidence

Playwright artifacts (final verification run):

- Care listing 390: `/opt/cursor/artifacts/care_health_wellness_care_listing_390.png`
- Breath play: `/opt/cursor/artifacts/care_health_wellness_breath-control_play.png`
- Stillness calibration with Exit: `/opt/cursor/artifacts/care_health_wellness_freeze-statue_play.png`
- Denied entitlement preview: `/opt/cursor/artifacts/care_health_wellness_entitlement_denied.png`
- Viewport sheets: `/opt/cursor/artifacts/care_health_wellness_{390x844,412x915,768x1024,1024x1366,1440x900}.png`
- Production MP3 headers: `/opt/cursor/artifacts/crystal_garden_production_http_headers.txt`

---

# Final Verification

**Date:** 2026-09-18  
**Branch:** `cursor/care-health-wellness-audit-fb4f`  
**Production:** not deployed from this pass. No GCS, Cloudflare, TTS, OpenAI, ElevenLabs, production DB, or production secrets were modified.

This implementation is ready for **controlled production verification** of live signed-in billing and device motion. It is **not** an overall product PASS while those remain unverified.

## Crystal Garden Asset

- **Status:** PASS (repo + local Vite + production static HTTP). Not a GCS object.
- **Activity:** Stillness (`freeze-statue` / Crystal Garden). Preload on onboarding/calibration; loop during the dance phase via `useCrystalGardenDanceMusic`.
- **Exact reference:** `CRYSTAL_GARDEN_DANCE_URL = "/health-lab-audio/crystal-garden-dance.mp3"` in `artifacts/kidschedule/src/features/health-lab/components/games/crystal-garden/crystal-garden-audio.ts`.
- **Source:** Vite `public/` static file `artifacts/kidschedule/public/health-lab-audio/crystal-garden-dance.mp3` (commit `0e8299f2`). Optional regenerator: `scripts/generate-crystal-garden-audio.ts` (ElevenLabs; **not run** this pass).
- **Missing-asset behavior:** `el.play().catch(() => {})` swallows autoplay (and play()) failures so the game continues without music. A true 404 still logs a browser media error. Not silent for console; gameplay continues.
- **Evidence:**
  - Local file 97010 bytes, ID3v2 + MPEG ADTS layer III 128 kbps 44.1 kHz stereo.
  - Vitest `crystal-garden-dance-asset.test.ts` asserts URL, size, MPEG header.
  - Playwright `page.request.get("/health-lab-audio/crystal-garden-dance.mp3")` → 200, `audio/mpeg`, body > 4000 bytes.
  - Read-only `HEAD https://www.amynest.in/health-lab-audio/crystal-garden-dance.mp3` → 200, `audio/mpeg`, `content-length: 97010`.

The earlier audit line “not in this checkout” was a glob miss (`**/*health-lab-audio*` matched a hook file, not the MP3). The reference was already correct; no asset was invented or replaced.

## Living Stream Test

- **Previous failure:** standalone `room-living-stream.test.tsx` → `TypeError: React.act is not a function` at RTL `render()` / `cleanup()`, stack in `react-dom/cjs/react-dom-test-utils.production.js`.
- **Root cause:** host `NODE_ENV=production`. React 19 production CJS does **not** export `act`. RTL 16 still calls `require("react").act`. This is a test-harness / environment issue, not a Care UI regression.
- **Fix:** `artifacts/kidschedule/vitest.config.ts` sets `process.env.NODE_ENV = "test"` and `test.env.NODE_ENV = "test"` before Vite resolves React. Also `dedupe: ["react", "react-dom"]`. Assertions were not weakened; the file is not skipped.
- **Standalone result:** `4 passed / 1 file`.

## Signed-in Entitlements

- **Test method:**
  - Unit: `decidePremiumRouteAccess` + AppCore / parenting-hub / health-lab route source contracts + `LockedBlock` locked vs unlocked + `HealthLabStaticFreePreview` render.
  - E2E fixture: default `data-entitlement=allow` mounts `HealthLabZone`; `?entitlement=deny` mounts `HealthLabStaticFreePreview` after Care → Health. Care still lists Health by age.
  - API: `health-lab-premium.test.ts` protection matrix (assertHealthLabPremium on reads and mutations).
- **Allowed result:** fixture launches all five practices; `flag: true` + `entitlementsResolved` → `ALLOW` → zone; unlocked `LockedBlock` has no overlay. Playwright test 1 PASS.
- **Denied result:** Care Health path remains visible; practices do not launch; static preview CTA “Continue with AmyNest”; `FREE_ENTITLEMENTS.canAccessHealthLab === false`; missing/false/timeout flags DENY. Playwright test 2 PASS.
- **Limitations (do not claim live signed-in PASS):**
  - Fixture stub auth (`playwright_user`) bypasses Firebase, Clerk, RevenueCat, and AppCore `ProtectedRoute`.
  - Production Care destination `FeatureGate` (`hub_health_lab` / `healthLabRouteOpen`) is source-contract tested, not clicked inside the real parenting hub with a billed user.
  - API DB enforcement suite SKIPPED (`isDbIntegrationAvailable()` false). HTTP 402 for free users vs 200 for premium was **not** executed against PostgreSQL in this environment.

## Final Regression

Exact commands and counts:

1. `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @workspace/kidschedule typecheck` — PASS (pre-commit).
2. `pnpm exec vitest run --config vitest.config.ts src/components/parent-hub/room-living-stream.test.tsx` — **4 passed / 1 file**.
3. Relevant Vitest subset (14 files listed in Tests Run) — **131 passed / 14 files**.
4. `pnpm --filter @workspace/kidschedule test:e2e:care-health-wellness` — **9 passed / 9 expected / 0 unexpected / 0 flaky** (32.4s).
5. `node --import tsx/esm --test src/routes/health-lab-premium.test.ts` — **2 passed**, DB HTTP suite skipped.

Playwright DOM checks (not screenshot-only): `documentElement.scrollWidth <= clientWidth + 1` at all five viewports; last quiet path and exit-home sit above the tab bar on widths under 1024; `mobile-tab-bar` hidden while a practice is open; `health-lab-practice-start` text `/Begin gently/i`; Exit returns to `health-lab-living`; 13+ Health count 0; infant preview; reopen breath.

Console / network this run: no page errors; no health-lab / health-lab-audio / `/api/` request failures or 4xx/5xx after the API mock. Crystal Garden is served, not stubbed.

## Remaining Risks

| Item | Classification |
|---|---|
| Crystal Garden MP3 repo + Vite + production static HTTP | PASS |
| Living Care → five practices launch / chrome / Begin gently / Exit / age bands / chips wrap | PASS |
| `room-living-stream.test.tsx` standalone | FIXED |
| Fixture allowed vs denied Health Lab UI | PASS |
| Live signed-in Firebase + RevenueCat entitlement | PRODUCTION VERIFICATION REQUIRED |
| Real parenting-hub FeatureGate hop to `/health-lab` | PRODUCTION VERIFICATION REQUIRED |
| Server Health Lab 402/200 against production or local DB | PRODUCTION VERIFICATION REQUIRED (DB suite skipped here) |
| DeviceOrientation / calibration on physical devices | PRODUCTION VERIFICATION REQUIRED |
| Kidschedule `tsc` default heap OOM | TEST INFRASTRUCTURE ISSUE (pre-existing; 8GB heap PASS) |

**Not overall PASS** while live signed-in billing and device motion remain unverified.
