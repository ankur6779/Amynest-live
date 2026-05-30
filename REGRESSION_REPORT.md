# UX Stabilization — Visual Regression Report

**Date:** May 30, 2026  
**Baseline (pre-stabilization):** commit `9adbc508` (Android 1.4.36)  
**Current:** commit `7a04583d` (UX stabilization release)  
**Scope:** Dashboard-first symptoms; tab bar / FAB / scroll / safe-area math  
**Constraint:** Do **not** revert Android inset bridge, immersive mode, accessibility, or 44px targets.

---

## Executive Summary

The visual regression is **not** caused by the Android `MainActivity` inset injection itself. It is caused by **layout math drift** in CSS and the tab bar component:

1. **Safe-area is applied twice on the tab bar** (footer padding + inner `safe-area-bottom`), inflating bar height and creating a visible inset band.
2. **Scroll bottom padding no longer matches actual chrome height** (was `80px` tuned for 72px tab + FAB; now `72px + --sab` only).
3. **Amy FAB overhang is no longer reserved** in scroll padding (FAB sits above footer but clearance was dropped).
4. **Dashboard adds redundant bottom padding** via `SCREEN_SPACING.pageBottom` (`pb-16`) on top of scroll clearance.
5. **Android header top inset** (`--sat`) reduces first-viewport content (intended for edge-to-edge, but contributes to “less above the fold”).

All Android 15 compliance pieces can remain; fixes are **single-variable alignment** between `--tabbar-total-height`, scroll padding, and FAB positioning.

---

## Symptom → Root Cause Map

| # | Symptom | Root cause | Confidence |
|---|---------|------------|------------|
| S1 | Dashboard content behind tab bar | Scroll reserves `72 + --sab`; footer actual height is `72 + --sab + inner safe-area-bottom` | **High** |
| S2 | Amy orb overlaps primary content | Scroll lost 8px FAB fudge; FAB ~66px tall above footer not reserved | **High** |
| S3 | Tab bar feels larger | `height: auto` + footer `--sab` + inner `safe-area-bottom` stacks insets | **High** |
| S4 | Less useful first viewport | Android `--sat` on header + taller tab bar + dashboard `pb-16` | **Medium** |
| S5 | Safe-area spacing visible | Double `--sab` on tab bar creates empty band above gesture area | **High** |

---

## Issue 1 — Double safe-area on tab bar (visible band + taller bar)

### Root cause

Safe-area bottom inset is applied **twice** on the tab bar stack:

1. `.app-footer` → `padding-bottom: var(--sab, env(...))`  
2. Inner nav row → `safe-area-bottom` → `padding-bottom: max(0.75rem, var(--sab, env(...)))`

On Android Play with `--sab ≈ 48px`, total footer stack ≈ **72px nav + 48px (footer) + 48px (inner)** instead of **72 + 48**.

### Files & lines

| File | Lines | What |
|------|-------|------|
| `artifacts/kidschedule/src/index.css` | 910–917, 872–886 | `.app-footer` `padding-bottom: var(--sab)` |
| `artifacts/kidschedule/src/index.css` | 1419–1421 | `.safe-area-bottom` utility |
| `artifacts/kidschedule/src/components/mobile-tab-bar.tsx` | 47 | `safe-area-bottom` on inner flex row |

### Before (9adbc508)

```css
.app-footer {
  height: 72px;
  padding-bottom: 0;
}
/* inner row: h-[72px] pb-2 only — no safe-area class */
```

### After (7a04583d)

Footer `height: auto` + `--sab` padding **and** inner `safe-area-bottom`.

### Screenshot reference

Capture on Pixel / desktop 390px:

- `playwright/artifacts/ux-stabilization/regression/tab-bar-double-inset-after.png`
- Compare: empty band between tab labels and screen bottom; bar visually ~84–120px vs 72px

### Proposed fix

Remove `safe-area-bottom` from the inner nav row. Keep **one** `--sab` application on `.app-footer` only. Restore fixed **content** height of 72px inside footer; let `--sab` extend the footer box downward invisibly.

### Confidence: **High**

---

## Issue 2 — Scroll padding under-reserves vs actual footer height

### Root cause

`body.has-tabbar` scroll clearance:

```css
padding-bottom: calc(var(--tabbar-height, 72px) + var(--sab, env(...)));
```

This assumes tab bar total height = `72 + --sab`. Because of Issue 1, actual height is **`72 + 2×--sab`** (or `72 + --sab + 12px` on web). Scroll area ends **above** where content should stop → last cards/widgets sit **under** the tab bar.

Additionally, pre-stabilization used a flat **`80px`** bottom pad ( tuned for tab + small FAB fudge), which was **8px more** than `72px` on web even before `--sab`.

### Files & lines

| File | Lines | What |
|------|-------|------|
| `artifacts/kidschedule/src/index.css` | 633–638 | `body.has-tabbar .app-scroll` padding |
| `artifacts/kidschedule/src/index.css` | 617–627 | Default `.app-scroll` padding |
| `artifacts/kidschedule/src/components/layout.tsx` | 168–173 | `body.has-tabbar` toggle |
| `artifacts/kidschedule/src/App.tsx` | 55 | `.app-scroll.page-content` scroll root |

### Before

```css
.app-scroll { padding-bottom: 80px; }  /* all pages, always */
```

### After

```css
body.has-tabbar .app-scroll {
  padding-bottom: calc(72px + var(--sab));
}
```

### Screenshot reference

- Dashboard scrolled to bottom: timeline / rewards column clipped under tab bar
- `regression/dashboard-content-under-tabbar-after.png`

### Proposed fix

Introduce single token e.g. `--tabbar-total-height: calc(var(--tabbar-height) + var(--sab))` used by **both** `.app-footer` and scroll padding. After fixing Issue 1, align scroll to `--tabbar-total-height + var(--fab-clearance, 8px)`.

### Confidence: **High**

---

## Issue 3 — Amy FAB overhang not reserved in scroll padding

### Root cause

Amy FAB is positioned **above** the tab bar:

```css
.app-footer #amy-fab-floating {
  bottom: calc(100% + 8px);  /* floats above footer top edge */
}
```

Mascot size ≈ **58px** (+ badge). Pre-stabilization scroll used **`80px`** bottom padding (= 72 tab + **8px** intentional fudge — see comment at index.css L937).

Post-stabilization scroll uses **`72 + --sab` only** — no FAB clearance. FAB overlaps the bottom ~60–70px of dashboard content (right column widgets, journey card bottom, etc.).

### Files & lines

| File | Lines | What |
|------|-------|------|
| `artifacts/kidschedule/src/index.css` | 937–951 | FAB anchored above footer |
| `artifacts/kidschedule/src/index.css` | 633–638 | Scroll padding (missing FAB term) |
| `artifacts/kidschedule/src/components/amy-fab.tsx` | 45 | `AmyMascotLogo size={58}` |
| `artifacts/kidschedule/src/components/mobile-tab-bar.tsx` | 42 | `<AmyFab embedded />` inside footer |

Fallback rule for non-embedded FAB still uses fixed `72px`:

```css
#amy-fab-floating:not(.amy-fab-in-footer) {
  bottom: calc(72px + 8px);  /* ignores --sab */
}
```

### Screenshot reference

- Dashboard first viewport: FAB over SevenDayJourneyCard / right-column cards
- `regression/amy-fab-overlap-dashboard-after.png`

### Proposed fix

Add `--fab-overhang: 8px` (or measure mascot + gap ≈ 66px) to scroll padding on `body.has-tabbar` only:

```css
padding-bottom: calc(var(--tabbar-total-height) + var(--fab-overhang, 8px));
```

Update non-embedded FAB fallback to `calc(var(--tabbar-total-height) + 8px)`.

**Do not** move FAB or shrink mascot — adjust clearance only.

### Confidence: **High**

---

## Issue 4 — Tab bar visual height regression (`height: auto`)

### Root cause

Stabilization changed footer from **fixed 72px** to **`height: auto; min-height: 72px; padding-bottom: var(--sab)`**. Combined with Issue 1, the **visible** chrome (labels + center FAB bump) occupies more vertical space than the original design.

Center Amy Coach tab still uses `-translate-y-5` and 60×60 circle — unchanged — but the **footer box** is taller, shifting perceived weight.

### Files & lines

| File | Lines |
|------|-------|
| `artifacts/kidschedule/src/index.css` | 872–886, 910–925 |
| `artifacts/kidschedule/src/components/mobile-tab-bar.tsx` | 47, 58–67 |

### Screenshot reference

- Side-by-side tab bar crop vs 9adbc508
- `regression/tab-bar-height-before.png` / `tab-bar-height-after.png`

### Proposed fix

Keep `--sab` on footer **outside** the 72px visual row (padding on footer, fixed `h-[72px]` inner nav). Footer total height = `72 + --sab` but **visual** tab row stays 72px — matches original design.

### Confidence: **High**

---

## Issue 5 — Dashboard redundant bottom padding (`pb-16`)

### Root cause

UX stabilization added `SCREEN_SPACING.pageBottom` (`pb-16` = 64px) to dashboard wrapper **inside** the scroll area, **in addition to** `.app-scroll` bottom padding.

```tsx
// dashboard.tsx ~1396
<div className={`dashboard-page ... ${SCREEN_SPACING.pageBottom}`}>
  <div className="... pb-6 md:pb-8">
```

This creates **stacked** bottom spacing:

| Layer | Padding |
|-------|---------|
| `.app-scroll` (has-tabbar) | 72 + --sab (+ should include FAB) |
| `.dashboard-page` | pb-16 (64px) |
| Inner flex | pb-6 (24px) |

Users see **extra blank band** when scrolled to bottom (“unnecessary blank space above tab bar”) while mid-scroll content still overlaps FAB/tab due to Issues 2–3.

### Files & lines

| File | Lines |
|------|-------|
| `artifacts/kidschedule/src/pages/dashboard.tsx` | 1374, 1396–1398 |
| `artifacts/kidschedule/src/lib/experience-system.ts` | 78 (`pageBottom: "pb-16"`) |

### Screenshot reference

- Dashboard scrolled to end: large empty gap above tab bar
- `regression/dashboard-excess-bottom-padding-after.png`

### Proposed fix

Remove `SCREEN_SPACING.pageBottom` from dashboard on mobile (`md:` only if needed). Rely on `.app-scroll` clearance exclusively for tab/FAB/safe-area.

### Confidence: **High**

---

## Issue 6 — Android header `--sat` reduces first viewport (Android only)

### Root cause

Stabilization correctly added Android header top inset:

```css
html.amynest-android-shell .app-header {
  padding-top: var(--sat, env(safe-area-inset-top, 0px));
}
```

Pre-stabilization: `padding-top: 0` (content drew under status bar; non-compliant).

This **reduces** usable first-viewport height on Android by ~24–48px. Required for edge-to-edge; not a bug, but contributes to symptom S4.

### Files & lines

| File | Lines |
|------|-------|
| `artifacts/kidschedule/src/index.css` | 827–834 |

### iOS impact

**None.** iOS uses `html.amynest-native-shell:not(.amynest-android-shell)` rule unchanged.

### Proposed fix

**No revert.** Optional: reduce dashboard `padding-top: 1rem` → `0.75rem` on Android shell only if first viewport density is still tight after other fixes.

### Confidence: **Medium** (contributing factor, not primary bug)

---

## Issue 7 — `body.has-tabbar` expanded to all tab roots (behavior change)

### Root cause

Stabilization changed tab bar visibility from dashboard-only to all tab roots (`isTabRootRoute`). This is **intentional navigation fix**, not dashboard regression — but on `/routines`, `/amy-coach`, `/parenting-hub` it exposes the same padding/FAB issues where tab bar was previously hidden.

### Files & lines

| File | Lines |
|------|-------|
| `artifacts/kidschedule/src/components/layout.tsx` | 158–159, 168–173, 296 |

### Dashboard-specific?

Tab bar on dashboard existed **before and after**. Dashboard regression is from **padding math**, not tab bar presence.

### Proposed fix

Keep persistent tab bar. Apply corrected `--tabbar-total-height` scroll math globally for `body.has-tabbar`.

### Confidence: **High** (not a revert candidate)

---

## Issue 8 — ChatPlatform message padding (non-dashboard, low priority)

### Root cause

Messages area adds `--sab` to `paddingBottom` calc. Unrelated to dashboard tab bar symptoms. Correct for chat surfaces.

### Files & lines

| File | Lines |
|------|-------|
| `artifacts/kidschedule/src/components/chat-platform.tsx` | ~104–115 |

### Proposed fix

**No change** for this regression pass.

### Confidence: **N/A** for dashboard report

---

## Verification Checklist (post-patch)

| Rule | Test |
|------|------|
| No content behind tab bar | Dashboard bottom widgets fully visible above tab labels |
| No excess blank above tab bar | Scroll end: ≤8px breathing room, no 64px dead zone |
| Tab bar visual height ~72px | Measure nav row; `--sab` only below labels |
| FAB no overlap | Last dashboard card clears FAB bounding box |
| Safe-area invisible | No double band; gesture area matches system |
| Android edge-to-edge | `--sat/--sab` injected; immersive unchanged |
| iOS unchanged | Capacitor header rule untouched |

---

## Screenshot Capture Plan

```bash
pnpm run dev:web
# Manual or Playwright at 390×844 and 320×640

# Required captures (store under playwright/artifacts/ux-stabilization/regression/):
# 1. tab-bar-double-inset-after.png
# 2. dashboard-content-under-tabbar-after.png
# 3. amy-fab-overlap-dashboard-after.png
# 4. dashboard-excess-bottom-padding-after.png
# 5. tab-bar-height-before.png (git checkout 9adbc508 -- index.css mobile-tab-bar temporarily)
```

---

## What to keep (do not revert)

| Component | Reason |
|-----------|--------|
| `MainActivity.kt` inset injection (`--sat`, `--sal`, `--sar`, `--sab`) | Android 15 compliance |
| `WindowCompat.setDecorFitsSystemWindows(false)` | Edge-to-edge |
| Immersive system bars | Gesture nav |
| `isTabRootRoute` tab bar visibility | Navigation fix |
| 44px `Button` primitive | Accessibility |
| aria-label sweep | Accessibility |
| Android header `--sat` | Status bar clearance |

---

*End of regression report.*
