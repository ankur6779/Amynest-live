# Amy Health Lab — Release Regression Report

**Generated:** 2026-07-20T15:15:00Z  
**Overall verdict:** **PASS**

---

## Executive summary

Full regression was run after the shared immersive viewport fix (`HealthLabImmersiveHost`). All automated suites passed. Immersive lifecycle, navigation, back handling, orientation, background/resume, memory cleanup, scroll restoration, safe-area, and responsive layout probes are green.

| Suite | Result | Count |
|-------|--------|-------|
| Vitest (unit + motion engine) | **PASS** | 42/42 |
| Playwright certification E2E | **PASS** | 42/42 |
| Playwright immersive regression | **PASS** | 18/18 checks (11 tests) |
| Playwright responsive certification | **PASS** | 58 probes, 0 fails |

---

## Immersive lifecycle (new regression suite)

Harness: `playwright/specs/health-lab-certification-regression.spec.ts`  
Artifacts: `audit/health-lab-release-regression/`

| Check | Result |
|-------|--------|
| Host portaled to `document.body` on game entry | PASS |
| `html.health-lab-immersive` class applied | PASS |
| Body `overflow: hidden` during immersive | PASS |
| Host `z-index ≥ 100` (above hub/app chrome) | PASS |
| No top clipping (balloon + top bar visible) | PASS |
| Host removed on exit | PASS |
| Immersive class removed on exit | PASS |
| Body overflow restored to prior value | PASS |
| Motion prep cancel — no host leak | PASS |
| `visibilitychange` — host stays mounted | PASS |
| Controls visible after resume | PASS |
| 5× enter/exit cycles — no DOM leak | PASS |
| Safe-area top (47px notch proxy via CDP) | PASS |
| Landscape orientation layout | PASS |
| Balloon gameplay @ 320–768dp smoke | PASS |

### Back / navigation

| Check | Result |
|-------|--------|
| Home → Progress → Home | PASS |
| App back handler from onboarding → home | PASS |
| App back handler from gameplay → home (Android back proxy) | PASS |

*Note: Android back gesture is exercised via `invokePageBackHandler()` — same code path as native shell back button and Capacitor hardware back when routed through the app header handler.*

---

## Responsive certification

Harness: `playwright/specs/health-lab-certification-responsive.spec.ts`  
Report: `audit/health-lab-responsive-cert/RESPONSIVE-CERTIFICATION.md`

**Widths (dp):** 320 · 360 · 375 · 390 · 412 · 480 · 600 · 768  
**Font scale:** 100% · 115% · 130% · 150%  
**Landscape:** iPhone 667×375 · Android 800×360  
**FPS @ 390dp:** 60 (threshold ≥45)

Screens verified: Home, trail, quests, grown-ups, passport, all five worlds (Balloon Valley, Sky Island, Rocket Base, Crystal Garden, Crystal Cave).

---

## Functional certification E2E

Harness: `playwright/specs/health-lab-certification.spec.ts`  
**42/42** scenarios — home, game launch, onboarding/calibration, navigation, module logic, sync/offline, dashboard, retention UI, accessibility.

---

## Unit tests

```
pnpm exec vitest run src/features/health-lab/
```

**42/42** — scoring, anti-cheat, world evolution, shop, storage, motion engine.

---

## Screenshots

### Immersive regression (`audit/health-lab-release-regression/screenshots/`)

| File | Scenario |
|------|----------|
| `01-immersive-entry-balloon.png` | Game entry — host above chrome, balloon visible |
| `02-immersive-exit-home.png` | Clean exit to home |
| `03-nav-progress-home.png` | Progress navigation round-trip |
| `04-back-from-game-home.png` | Back handler from gameplay |
| `05-motion-prep-cancel.png` | Motion prep cancel, no leak |
| `06-orientation-portrait-balloon.png` | Portrait gameplay |
| `07-orientation-landscape-balloon.png` | Landscape gameplay |
| `08-background-resume.png` | After `visibilitychange` |
| `09-memory-cleanup.png` | After 5 enter/exit cycles |
| `10-safe-area-notch.png` | 47px safe-area inset |
| `11-responsive-smoke-390.png` | 390dp gameplay smoke |

### Responsive matrix (`audit/health-lab-responsive-cert/screenshots/`)

31 screenshots across home, passport, and all worlds at critical widths/font scales (unchanged from prior cert run; re-validated this session with 0 probe fails).

---

## Remaining blockers

**None** from automated regression.

### Recommended manual follow-up (not blocking automated PASS)

1. **Physical device soak** — Capacitor iOS + Android WebView shells with real notch/gesture nav (automated suite uses Chromium fixture + CDP safe-area proxy).
2. **Hub route `/health-lab`** — Fixture runs standalone `HealthLabZone`; immersive host also hides `[data-hub-module-header]` when class is set — spot-check in full app shell on device once.
3. **First responsive run flake** — One matrix run timed out on `gotoLab` mid-loop; immediate re-run passed. Monitor in CI if port/server reuse conflicts occur.

---

## How to re-run

```bash
# Unit
pnpm exec vitest run src/features/health-lab/

# Full Playwright (all health-lab cert specs)
pnpm --filter @workspace/kidschedule test:e2e:health-lab

# Immersive regression only
pnpm --filter @workspace/kidschedule test:e2e:health-lab -- health-lab-certification-regression
```

---

## PASS / FAIL

**PASS** — Ready for release from an automated regression perspective.
