# Minimal Patch Verification — UX Stabilization Regression Fix

**Date:** May 30, 2026  
**Baseline (regressed):** commit `7a04583d` (UX stabilization release)  
**Patch scope:** 5 surgical fixes from `MINIMAL_PATCH_PLAN.md` / `REGRESSION_REPORT.md`  
**Goal:** Keep Android 15 edge-to-edge compliance; restore pre-stabilization visual density.

---

## Patches applied

| # | Change | File(s) |
|---|--------|---------|
| 1 | Single `--sab` owner on `.app-footer`; remove inner `safe-area-bottom` | `index.css`, `mobile-tab-bar.tsx` |
| 2 | Scroll padding = `--tabbar-total-height + --fab-overhang` | `index.css` |
| 3 | Non-embedded FAB uses `--tabbar-total-height` | `index.css` |
| 4 | Remove dashboard `SCREEN_SPACING.pageBottom` (`pb-16`) | `dashboard.tsx` |
| 5 | Regression guardrails (16 checks) | `ux-stabilization-audit.ts` |

**Not reverted:** Android inset bridge, `setDecorFitsSystemWindows(false)`, immersive mode, persistent tab bar, 44px touch targets, accessibility fixes.

---

## Automated checks

| Command | Result |
|---------|--------|
| `pnpm run check:ux-stabilization` | **16/16 passed** |
| `pnpm run check:typography-floor` | **passed** (8 chrome files) |
| `pnpm run check:chat-platform` | **passed** (static gate + 7 vitest visibility tests) |

Playwright layout verification:

```bash
cd artifacts/kidschedule
LAYOUT_PATCH_PHASE=before pnpm exec playwright test -c playwright.config.layout-verify.ts
LAYOUT_PATCH_PHASE=after  pnpm exec playwright test -c playwright.config.layout-verify.ts
```

---

## Screenshots (390×844, simulated `--sab: 34px`)

### Sign-in chrome

| Phase | Path |
|-------|------|
| **Before** (7a04583d CSS) | `artifacts/kidschedule/playwright/artifacts/ux-stabilization/patch-before/390-sign-in-before.png` |
| **After** (patched CSS) | `artifacts/kidschedule/playwright/artifacts/ux-stabilization/patch-after/390-sign-in-after.png` |

### Tab bar shell simulation

| Phase | Path |
|-------|------|
| **Before** | `artifacts/kidschedule/playwright/artifacts/ux-stabilization/patch-before/390-footer-metrics-before.png` |
| **After** | `artifacts/kidschedule/playwright/artifacts/ux-stabilization/patch-after/390-footer-metrics-after.png` |

---

## Footer height comparison

Simulated Android shell (`--sab: 34px`, Playwright Pixel 5 viewport). Metrics JSON: `footer-metrics-{before,after}.json` in the same artifact folders.

| Metric | Before (7a04583d) | After (patch) | Notes |
|--------|-------------------|---------------|-------|
| Nav row height | **72px** | **72px** | After: capped via `--tabbar-visual-height` + `h-[72px]` |
| Footer `--sab` padding | **34px** | **34px** | Single owner: `.app-footer` only |
| Total footer box | **106px** | **106px** | 72 visual + 34 inset below labels |
| Inner `safe-area-bottom` | **present** | **removed** | Audit gate blocks reintroduction |
| Scroll bottom reserve | **106px** | **114px** | After restores **+8px FAB overhang** |

On production Android with larger `--sab` (~48px), pre-patch **double safe-area** on the inner tab row inflated the perceived bar and created a visible band above the gesture area (see `REGRESSION_REPORT.md` Issue 1). Post-patch, inset extends **below** the 72px visual row only.

---

## Viewport / scroll content comparison

| Concern | Before | After |
|---------|--------|-------|
| Tab-root scroll formula | `72px + --sab` | `72px + --sab + 8px` (`--fab-overhang`) |
| Dashboard wrapper padding | `pb-16` (64px) on page root | **removed** — clearance via `.app-scroll` only |
| Effective scroll end dead zone | ~106px reserve + 64px page padding stacked | **114px** reserve, no extra `pb-16` |
| FAB clearance vs cards | Under-reserved (missing 8px + overlap) | **114px** matches tab + FAB + `--sab` |

**Expected user-visible change:** Dashboard and tab-root screens show **~8px more scroll clearance for the Amy FAB** and **~64px less blank padding** at scroll end. First viewport gains primarily from the **shorter visual tab row** on device (no double inset) rather than from sign-in chrome (unchanged route).

---

## Android edge-to-edge verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `MainActivity` injects `--sat` / `--sab` / `--app-bottom-clearance` | **unchanged** | Audit check + `MainActivity.kt` ~L867 |
| `setDecorFitsSystemWindows(false)` | **unchanged** | Audit check ~L163 |
| Immersive system bars | **unchanged** | Audit check |
| `.app-footer` owns bottom inset once | **fixed** | `padding-bottom: var(--sab)` only on footer |
| Scroll respects gesture nav | **fixed** | `--tabbar-total-height` includes `--sab` |
| Visual tab row height | **restored** | 72px fixed; safe area extends outside row |

---

## iOS verification

| Requirement | Status | Notes |
|-------------|--------|-------|
| Capacitor shell / native safe areas | **unchanged** | No iOS native file edits in this patch |
| CSS fallback `env(safe-area-inset-*)` | **unchanged** | Web tokens still fall back when `--sab` is `0px` |
| Tab bar / scroll math | **improved** | Same CSS as Android web; iOS Safari uses env insets natively |
| 44px touch targets | **unchanged** | `button.tsx` audit check passes |

---

## Regression guardrails added

`scripts/ux-stabilization-audit.ts` now enforces:

- `--tabbar-visual-height` / `--tabbar-total-height` tokens exist
- `body.has-tabbar` scroll includes `--fab-overhang`
- `.app-footer` is sole `--sab` padding owner
- `.app-footer__nav` capped at visual 72px
- `mobile-tab-bar.tsx` has **no** `safe-area-bottom` on inner row
- `dashboard.tsx` has **no** `SCREEN_SPACING.pageBottom`
- Non-embedded FAB uses `--tabbar-total-height`

---

## Manual follow-up (device)

Authenticated dashboard screenshots were not captured in CI (auth required). After web deploy, spot-check on:

1. **Android Play build** — dashboard first viewport + scroll-to-bottom (FAB clears cards; no band above tab labels)
2. **iOS TestFlight** — tab roots match web scroll math via `env(safe-area-inset-bottom)`

---

## Files touched

```
artifacts/kidschedule/src/index.css
artifacts/kidschedule/src/components/mobile-tab-bar.tsx
artifacts/kidschedule/src/pages/dashboard.tsx
scripts/ux-stabilization-audit.ts
artifacts/kidschedule/playwright.config.layout-verify.ts          (new)
artifacts/kidschedule/playwright/specs/layout-patch-verify.spec.ts  (new)
artifacts/kidschedule/playwright/artifacts/ux-stabilization/        (screenshots + metrics JSON)
```
