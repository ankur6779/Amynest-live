# Amy Health Lab — Final Certification Report

**Date:** 2026-06-14  
**Environment:** macOS, Chrome (Playwright), Vite dev server `127.0.0.1:5195`  
**Fixture:** `/playwright-health-lab.html?childId=42&childName=Riya`

---

## Step 1 — Screenshots

All screenshots saved to `audit/health-lab-certification-screenshots/`:

| # | File | Verified |
|---|------|----------|
| 1 | `01-health-lab-home.png` | ✅ Hero, quests, 6 challenge cards, styled glass UI |
| 2 | `02-onboarding-sky-island.png` | ✅ Mission briefing, instruction, duration, reward, difficulty chips |
| 3 | `03-motion-calibration.png` | ✅ "HOLD DEVICE STILL" overlay + progress bar |
| 4 | `04-sky-island-gameplay.png` | ✅ Balance ring, island scene, progress ring, debug overlay |
| 5 | `05-balloon-onboarding.png` + `05-balloon-journey-gameplay.png` | ✅ Onboarding + hold orb gameplay |
| 6 | `06-rocket-onboarding.png` + `06-rocket-launch-gameplay.png` | ✅ Onboarding + launch pad / countdown |
| 7 | `07-crystal-garden-*.png` (3 files) | ✅ Onboarding, calibration, dance/freeze UI |
| 8 | `08-crystal-core-*.png` (2 files) | ✅ Onboarding + reactor charge UI |
| 9 | `09-wellness-onboarding.png` + `09-wellness-dashboard.png` | ✅ Radial metrics, streak/badges |
| 10 | `10-success-celebration.png` | ✅ Challenge Complete + badge modal |

**Bug fixed during capture:** Playwright fixture was not importing `index.css` — UI rendered unstyled until fixed (`health-lab-fixture.tsx`).

---

## Step 2 — Manual Game Flow Findings

| Game | Starts | Instructions clear | Progress updates | Success | Failure | Console errors |
|------|--------|-------------------|------------------|---------|---------|----------------|
| Sky Island | ✅ | ✅ | ✅ Balance ring + timer | ✅ (15s) | N/A (simulated stable) | AudioContext only |
| Balloon Journey | ✅ | ✅ | ✅ Hold timer + milestones | ✅ (release finger) | ✅ short tap resets | AudioContext only |
| Rocket Launch | ✅ | ✅ | ✅ Round rail + countdown | ✅ (tap on GO) | ✅ too-early state | AudioContext only |
| Crystal Garden | ✅ | ✅ | ✅ Round rail + crystals | ✅ freeze pass | ✅ retry message | AudioContext only |
| Crystal Core | ✅ | ✅ | ✅ Charge % ring | ✅ (20s or release) | ✅ crack indicator | AudioContext only |
| Wellness Report | ✅ | ✅ | ✅ Radial charts animate | ✅ snapshot save | ✅ locked until games played | None |

**Additional findings:**
- Results screen showed **Score 0 / +0 XP** on first Sky Island completion despite session recording (+20 XP on home after dismiss). Root cause: desktop simulation triggers `flat_surface` anti-cheat flag → `scoreMultiplier: 0`. XP still awarded via quest/streak celebrations.
- Celebration queue stacks 3+ modals (badge, quest, streak) — requires multiple **Continue** taps before **Home** is reachable.
- i18n showed `{{name}}` on home until fixed — now displays `Riya's wellness playground`.

---

## Step 3 — Console Report

Captured during automated certification run (`health-lab-certification-report.json`):

| Type | Count | Details |
|------|-------|---------|
| **JavaScript errors** | 12 | `The AudioContext encountered an error from the audio device or the WebAudio renderer.` |
| **React errors** | 0 | — |
| **Warnings** | 0 | — |
| **Failed assets** | 0 | — |
| **Missing imports** | 0 | — |

**Fixes applied:**
- `health-lab-fixture.tsx` — added `import "../index.css"`
- `use-health-lab-i18n.ts` — interpolation for `{{name}}`
- `health-lab-onboarding.tsx` — removed infinite scale animation (blocked Playwright clicks)

**Remaining:** AudioContext errors are headless Chrome / CI environment limitation, not app crashes. Procedural SFX fails silently; gameplay continues.

---

## Step 4 — Motion Engine Verification

Debug overlay visible in DEV (`import.meta.env.DEV`). Recorded during Sky Island gameplay (desktop, simulated motion):

| Field | Device still (simulated) |
|-------|--------------------------|
| Tilt X | 0.000 |
| Tilt Y | 0.000 |
| Stability | 100% |
| Confidence | 7% |
| Tracking | poor |
| Sensor | healthy |
| Mode | live |

**Interpretation:** On desktop without accelerometer, simulation produces near-zero variance → high stability but low confidence (insufficient real samples). Real device testing required for production motion validation.

---

## Step 5 — Performance Measurements

Measured via `requestAnimationFrame` sampling over 3 seconds (Playwright headless Chrome):

| Game | FPS | JS Heap Used | JS Heap Total |
|------|-----|--------------|---------------|
| Sky Island | **22** | 45 MB | 58 MB |
| Balloon Journey | **20** | 45 MB | 58 MB |
| Rocket Launch | **24** | 45 MB | 58 MB |

**Note:** Headless Playwright throttles rendering. FPS **below 60 target** in this environment. Memory stable (~45 MB). Real device profiling recommended before production sign-off.

---

## Step 6 — Playwright Certification

**Result: PASS (42/42)**

```
npx playwright test playwright/specs/health-lab-certification.spec.ts \
  --config playwright.config.health-lab.ts
→ 42 passed (1.5m)
```

**Suite updates:**
- Onboarding screen assertions for all 6 games
- Calibration overlay + progress ring flows
- Fixed strict-mode locator for calibration heading
- `force: true` on animated CTA buttons
- `testMatch` includes capture spec

---

## Step 7 — Production Readiness Verdict

### ✅ Ready
- All games launch via onboarding → gameplay
- Motion calibration flow works
- Visual styling correct (after CSS import fix)
- Progress rings, balance zones, guidance text functional
- Wellness dashboard with radial charts
- 42/42 automated E2E tests pass
- No React errors, no broken imports

### ⚠️ Remaining issues (device QA required)
1. **FPS 20–24 in headless** — verify on real iOS Safari / Android Chrome/WebView
2. **Motion confidence low on desktop** — expected; real sensors needed
3. **Score 0 on results when `flat_surface` flagged** — desktop simulation; may confuse children on sim mode (should show explanation)
4. **AudioContext errors in headless** — wrap/preload audio with try/catch (non-blocking)
5. **Celebration modal stacking** — consider single combined celebration UX
6. **Physical device matrix not run** — Android Chrome, WebView, Samsung Internet, iOS Safari pending

### Verdict: **CONDITIONAL GO**

Ship after real-device motion + FPS validation. Automated certification **PASS**. Desktop evidence complete; mobile evidence pending.

---

## Artifacts

- Screenshots: `audit/health-lab-certification-screenshots/`
- Metrics JSON: `audit/health-lab-certification-report.json`
- Playwright report: `artifacts/kidschedule/playwright/health-lab-artifacts/report.json` (after CI run)
