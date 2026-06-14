# Amy Health Lab — Polish & Performance Report

**Date:** 2026-06-14  
**Phase:** Production polish (post-certification)  
**Environment:** macOS, Chrome (Playwright headless), Vite `127.0.0.1:5195`

---

## 1. Performance Audit Report

Profiled categories during gameplay (3s rAF sample per game, capture script):

| Category | Finding | Severity |
|----------|---------|----------|
| Animated starfields | Up to 50 motion.div stars per stage (breath game) | High |
| Shell particles | 24 framer-motion particles on home + during games | High |
| Film grain SVG | feTurbulence overlay on every game stage | Medium |
| Sky Island confetti | 8 animated emoji spans on success | Medium |
| Glass / backdrop-blur | Mission banners, panels, wellness cards | Medium |
| SVG progress rings | stroke-dashoffset animations each frame | Medium |
| Motion sensor React updates | setState every 50ms sample | Medium |
| Launch pad glow loops | 4 blur + 3 smoke infinite animations | Medium |
| Reactor chamber | 2 rotating borders + 6 sparkle particles | Medium |
| Amy micro-animations | Periodic scale/rotate on character | Low |

**Method:** Playwright capture spec + code audit of `health-lab-cinematic.tsx`, `health-lab-particles.tsx`, `use-motion-sensor.ts`, and all six game stages.

---

## 2. Top 10 FPS Bottlenecks (ranked)

1. **HealthLabStarfield** — dozens of infinite opacity/scale animations per game
2. **HealthLabParticles** (shell) — 24 animated divs on home overlay
3. **HealthLabFilmGrain** — SVG turbulence filter repainted each frame
4. **Motion sensor setState** — 10–20 Hz React rerenders during motion games
5. **HealthLabSkyIslandScene** — clouds, wind, glow, confetti, spring wobble combined
6. **HealthLabLaunchPad** — multiple blur glow + smoke loops (Rocket)
7. **HealthLabReactorChamber** — dual rotating rings + sparkle particles (Crystal Core)
8. **HealthLabMissionBanner** — backdrop-blur + framer entrance on every phase change
9. **HealthLabBalanceRing / ProgressRing** — SVG stroke animations
10. **Duplicate celebration UI** — in-game success phase + results + stacked modals (UX + render cost)

---

## 3. Optimizations Applied

| Change | File(s) |
|--------|---------|
| Unified session rewards (1 screen, 1 Continue) | `health-lab-session-rewards.tsx`, `health-lab-zone.tsx`, `use-health-lab-state.ts` |
| Simulation mode UX — no "Score 0" when XP granted | `session-rewards-utils.ts`, `health-lab-session-rewards.tsx` |
| Starfield cap 24 → memoized, reduced mode 8 static stars | `health-lab-cinematic.tsx` |
| Per-game star counts halved (16–20 max) | All game `*.tsx` |
| Shell particles disabled during gameplay | `health-lab-shell.tsx`, `health-lab-zone.tsx` |
| Particles 24→12 (4 reduced), React.memo | `health-lab-particles.tsx` |
| Film grain disabled (returns null) | `health-lab-cinematic.tsx` + removed from games |
| Motion UI updates throttled to 100ms | `use-motion-sensor.ts` |
| Sky Island: removed 2.5s success phase + confetti 8→4 | `flamingo-balance-game.tsx`, cinematic |
| Wellness report: one-line Amy summary, weekly insight after save | `calmness-meter-game.tsx` |
| Removed dead `health-lab-results.tsx` | deleted |
| Reward enter animation (GPU transform only) | `index.css` |

---

## 4. Before vs After Metrics

### FPS (Playwright headless, 3s rAF sample)

| Game | Before (cert) | After (polish) | Δ |
|------|---------------|----------------|---|
| Sky Island | 22 | **31** | +41% |
| Balloon Journey | 20 | **31** | +55% |
| Rocket Launch | 24 | **37** | +54% |

### JS heap (same run)

| Metric | Before | After |
|--------|--------|-------|
| usedJSHeapSize | ~45 MB | **43 MB** |

### Console (capture run)

| Type | Count |
|------|-------|
| JS errors | 12 (AudioContext headless only) |
| React errors | 0 |
| Warnings | 0 |

**Note:** Headless Chrome caps realistic FPS measurement. Target 55–60 FPS requires profiling on a mid-range Android device (WebView). Polish changes reduce concurrent animations ~50%+, which should translate proportionally on device.

---

## 5. Reward Flow Improvements

**Before:** Results screen → Badge modal → Continue → Quest modal → Continue → Streak modal → Continue → Home (4+ taps).

**After:** Single `HealthLabSessionRewards` screen showing:
- +XP earned
- Score **or** Simulation Mode panel
- New badges, quest progress, streak milestones, level-up (aggregated)
- One **Continue** → Home

Home-only surprises/treasure chest still use `HealthLabCelebration` (not post-game).

---

## 6. UX Improvements

- **Simulation clarity:** Amber "Simulation Mode" card with message: *"Motion scoring available on supported devices."*
- **Flamingo:** Immediate transition to rewards (no redundant in-game celebration)
- **Wellness report:** Concise Amy one-sentence summary; weekly insight revealed only after snapshot save
- **Buttons:** Session rewards Continue uses 48px min-height tap target
- **Progress:** Gameplay progress rings unchanged; reward screen shows tier + XP prominently

---

## 7. Accessibility Improvements

- Session rewards: `role="dialog"`, `aria-modal`, `aria-labelledby`
- Reduced motion: reward enter animation disabled via `prefers-reduced-motion`
- Starfield/particles: static fallbacks when reduced motion enabled
- Live regions retained in all games (cert test 41 PASS)
- Large tap targets on primary CTAs (48px+)

---

## 8. Code Cleanup Summary

| Removed / consolidated |
|------------------------|
| `health-lab-results.tsx` (replaced by session rewards) |
| `HealthLabFilmGrain` rendering (no-op export kept for import stability) |
| Flamingo success phase + unused Amy import |
| Film grain imports from all 6 games |
| Session completion no longer pushes `pendingCelebrations` queue |

Debug overlay remains **DEV-only** (`health-lab-debug-overlay.tsx`).

---

## 9. Remaining Non-Critical Issues

1. **AudioContext errors in headless CI** — environmental; SFX fails silently, no crash
2. **FPS on headless still ~31–37** — not representative of real devices; device profiling pending
3. **Motion confidence low on desktop simulation** — expected; debug overlay shows "poor" tracking
4. **`health-lab-results.tsx` references in old cert report** — superseded by this document
5. **Some backdrop-blur panels remain** — acceptable for polish tier; further gain needs design trade-off

---

## 10. Final Production Readiness Verdict

| Gate | Result |
|------|--------|
| Unit tests (`vitest` health-lab) | **PASS** — 37/37 |
| Playwright certification | **PASS** — 42/42 |
| Capture / metrics script | **PASS** — 1/1 |
| Reward flow consolidated | **DONE** |
| Simulation UX fixed | **DONE** |
| Performance optimizations | **DONE** (measured +41–55% FPS headless) |
| Real-device FPS 55–60 | **PENDING** — requires Android WebView profile |

### Verdict: **GO for production web release**

Ship with unified rewards and simulation messaging. Schedule a short real-device FPS pass on a mid-range Android phone before marketing "showcase quality" motion performance claims.

---

## Test Commands (reproducible)

```bash
cd artifacts/kidschedule
npx vitest run src/features/health-lab/
npx playwright test playwright/specs/health-lab-certification.spec.ts --config playwright.config.health-lab.ts
npx playwright test playwright/specs/health-lab-certification-capture.spec.ts --config playwright.config.health-lab.ts
```

Metrics output: `audit/health-lab-certification-report.json`  
Screenshots: `audit/health-lab-certification-screenshots/`
