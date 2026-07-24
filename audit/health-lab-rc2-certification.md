# Amy Health Lab — RC2 Final Hardening Report

**Tag target:** `v1.0.0`  
**Audit date:** 2026-07-24  
**Scope:** RC1 blocker closure only — no new features, UI redesign, or animation work

---

## Final decision

## ✅ v1.0.0 Production Tag Recommended

All four RC1 blockers are closed with automated evidence.

---

## Blocker closure summary

| Blocker | Status | Evidence |
|---------|--------|----------|
| **1 — Escape on dialogs** | ✅ Closed | `useHealthLabDialogEscape` wired to Session Rewards, Motion Prep, Celebration, and all four victory overlays. Playwright: Escape closes motion prep → home. |
| **2 — Touch targets ≥ 48px** | ✅ Closed | Progress back, Shop equip/purchase/back, Dashboard back + range chips use `HEALTH_LAB_TOUCH_TARGET` / `min-h-[48px]`. |
| **3 — 20-minute soak** | ✅ Closed | Local artifact `audit/health-lab-rc2-soak.json` (gitignored) — 20 min, 419 cycles, heap stable (48 MB, +0 MB growth), no host leak, scroll restored, no React warnings. |
| **4 — Performance matrix (6 games)** | ✅ Closed | Local artifact `audit/health-lab-rc2-perf.json` (gitignored) — all six games + home profiled (4 s sample each). |

---

## Blocker 1 — Escape + focus restore

**Implementation:** `hooks/use-health-lab-dialog-escape.ts`

| Surface | Escape action | Focus on open |
|---------|---------------|---------------|
| Session Rewards | `onContinue` | Continue button |
| Motion Prep | `onCancel` (Back) | I'm Ready button |
| Celebration | `onDismiss` | Close button |
| Balloon / Sky / Reactor / Garden victory | `onDismiss` | Amazing button |

Unit test: `hooks/use-health-lab-dialog-escape.test.ts` — pass.

---

## Blocker 2 — Touch targets

| Control | Before | After |
|---------|--------|-------|
| Progress back | ~36px (`p-2`) | `HEALTH_LAB_TOUCH_TARGET` (48×48) |
| Shop back | partial 48px height | full touch target class |
| Shop equip / buy | 36px / 40px | 48px |
| Dashboard back + range chips | 40–48px mixed | 48px |

---

## Blocker 3 — 20-minute soak

**Harness:** `playwright/specs/health-lab-rc2-soak-perf.spec.ts`  
**Run:** `RC2_SOAK_MS=1200000` (20 minutes)

| Metric | Result |
|--------|--------|
| Duration | 20 min (1,200,000 ms) |
| Gameplay cycles | 419 (Balloon enter/hold/exit) |
| Heap start → end | 48 MB → 48 MB (**+0 MB**) |
| Immersive host leak | **0** hosts at all samples |
| Body scroll lock | Restored (`bodyOverflow` not `hidden`) |
| Active timeouts (probe) | 0 at samples |
| Active intervals (probe) | 3 (stable — motion/home timers) |
| React warnings | 0 |
| Console errors (Health Lab) | 0 (dev CORS to `startup-funnel-events` ignored) |
| Android Back (final) | `invokePageBackHandler` — no host leak |

Samples every 2 min in `audit/health-lab-rc2-soak.json`.

---

## Blocker 4 — Performance matrix

**Environment:** Playwright Chromium headless, 4 s rAF sample per screen  
**Artifact:** `audit/health-lab-rc2-perf.json`

| Game | Avg FPS | Worst FPS | JS Heap | Long tasks >50ms | Dropped frames >33ms |
|------|---------|-----------|---------|------------------|----------------------|
| Home idle | 51 | 30 | 65 MB | 0 | 35 |
| Balloon Journey | 43 | 30 | 65 MB | 0 | 66 |
| Rocket Launch | 44 | 30 | 65 MB | 0 | 65 |
| Crystal Core | 42 | 30 | 65 MB | 0 | 72 |
| Sky Island | 41 | 30 | 65 MB | 0 | 77 |
| Crystal Garden | 30 | 20 | 65 MB | 0 | 111 |
| Wellness Journey | 45 | 30 | 65 MB | 0 | 59 |

**Battery (Android) / CPU:** Not measurable in headless Playwright — marked N/A. Device sign-off on Capacitor iOS + Android WebView recommended before store submission (not a code blocker).

---

## Build & test verification

| Check | Result |
|-------|--------|
| `pnpm exec tsc --noEmit` | ✅ 0 errors |
| Health Lab unit tests | ✅ pass (incl. dialog escape) |
| Production build | ✅ pass |
| RC2 Playwright (Escape + perf + soak) | ✅ 3/3 pass |

**Re-run RC2 suite:**

```bash
cd artifacts/kidschedule
RC2_SOAK_MS=1200000 npx playwright test playwright/specs/health-lab-rc2-soak-perf.spec.ts \
  --config playwright.config.health-lab-rc2.ts
```

---

## Files changed (RC2 only)

- `hooks/use-health-lab-dialog-escape.ts` (+ test)
- `components/health-lab-session-rewards.tsx`
- `components/health-lab-motion-prep.tsx`
- `components/health-lab-celebration.tsx`
- `components/health-lab-progress.tsx`
- `components/health-lab-shop.tsx`
- `components/health-lab-dashboard.tsx`
- `components/games/*/…-effects.tsx` (4 victory overlays)
- `playwright/specs/health-lab-rc2-soak-perf.spec.ts`
- `playwright.config.health-lab-rc2.ts`

---

## Remaining blockers

**None.**

Optional post-tag (not RC blockers):

- Physical Android WebView battery/CPU profiling on a mid-range device
- Store metadata and release notes

---

## Recommendation

**Tag `v1.0.0` for production release.**

RC2 closes all RC1 accessibility, stability, soak, and profiling gates with reproducible automated evidence.
