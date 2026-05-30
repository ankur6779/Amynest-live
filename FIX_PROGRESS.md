# UX Stabilization Release — Fix Progress

**Release goal:** Eliminate perceived-quality issues without new features.  
**Baseline:** `AUDIT_REPORT.md` / `FIX_PLAN.md` (May 30, 2026)

---

## Status Summary

| # | Item | Status | Regression | Screenshots |
|---|------|--------|------------|-------------|
| 1 | Android Safe Area Bridge | ✅ Done | `pnpm run check:ux-stabilization` | See §1 |
| 2 | Persistent Tab Bar | ✅ Done | `pnpm run check:ux-stabilization` | See §2 |
| 3 | Button Primitive 44px | ✅ Done | `pnpm run check:ux-stabilization` | See §3 |
| 4 | Fixed Bottom UI Safe Area Sweep | ✅ Done | Manual + audit | See §4 |
| 5 | ChatPlatform Safe Area Padding | ✅ Done | `pnpm run check:chat-platform` | See §5 |
| 6 | Typography Floor Enforcement | ✅ Done | `pnpm run check:typography-floor` | See §6 |
| 7 | Parenting Hub Density Reduction | ✅ Done | Visual review | See §7 |
| 8 | Dashboard Density Reduction | ✅ Done | Visual review | See §8 |
| 9 | Accessibility Sweep | ✅ Done | Manual a11y spot-check | See §9 |
| 10 | Experience System Adoption | ✅ Done | `SCREEN_SPACING` on hub/dashboard | See §10 |

---

## Verification Matrix

| Platform | Method | Status |
|----------|--------|--------|
| Android | `MainActivity.kt` inset injection + CSS `--sat/--sab` | ✅ Code verified |
| iOS Capacitor | Existing `env(safe-area-inset-*)` + shared CSS vars | ✅ Compatible |
| 320px | Playwright viewport + typography floor | ✅ Script ready |
| Tablet 768px | Playwright viewport | ✅ Script ready |
| Accessibility | aria-label sweep on chrome controls | ✅ Done |

**Run full regression:**
```bash
pnpm run check:ux-stabilization
pnpm run check:typography-floor
pnpm run check:chat-platform
pnpm --filter @workspace/kidschedule exec vitest run src/lib/auth-onboarding-regression.test.ts
```

**Capture AFTER screenshots (requires dev server on :3000):**
```bash
pnpm run dev:web
pnpm --filter @workspace/kidschedule exec playwright test -c playwright.config.ts specs/ux-stabilization-screenshots.spec.ts
```

Output: `artifacts/kidschedule/playwright/artifacts/ux-stabilization/after/`

BEFORE references: audit baseline described in `AUDIT_REPORT.md` Appendix A (manual device capture pre-release).

---

## 1. Android Safe Area Bridge

**BEFORE:** Immersive WebView injected keyboard inset only; `--sab` stayed `0`; header/footer padding zeroed on Android shell.

**AFTER:**
- `android/app/src/main/kotlin/com/amynest/app/MainActivity.kt` injects `--sat`, `--sal`, `--sar`, `--sab`, `--app-bottom-clearance` from `WindowInsetsCompat` (status bars, nav bars, display cutout) while keeping edge-to-edge + gesture nav.
- `artifacts/kidschedule/src/index.css` consumes vars on headers, footers, auth scroll, scroll padding, `.safe-area-top/bottom`, `.inset-bottom-safe`.

**Screenshot targets:** dashboard tab bar clearance, sign-in CTA, phonics bottom bar (device QA).

---

## 2. Persistent Tab Bar

**BEFORE:** Tab bar visible only on `/dashboard`.

**AFTER:** `layout.tsx` uses `isTabRootRoute(location)` — tab bar on `/dashboard`, `/routines`, `/amy-coach`, `/parenting-hub`. `body.has-tabbar` scroll padding updated.

**Files:** `components/layout.tsx`, `index.css`

---

## 3. Button Primitive 44px

**BEFORE:** Default 36px, sm 32px, icon 36×36.

**AFTER:** `components/ui/button.tsx` — `min-h-11`, icon `h-11 w-11`, sm `min-h-11`.

---

## 4. Fixed Bottom UI Safe Area Sweep

**BEFORE:** Hardcoded bottom padding; several fixed elements ignored `--sab`.

**AFTER:**
- `drawer.tsx`, `sheet.tsx`, `toast.tsx`
- `subscription-pricing-sticky-cta.tsx`, `social-landing.tsx`, `paywall-modal.tsx`
- `index.css` `.bottom-controls`, `.inset-bottom-safe`, scroll-safe calc

---

## 5. ChatPlatform Safe Area Padding

**BEFORE:** Messages `paddingBottom` ignored safe area on Android Play.

**AFTER:** `chat-platform.tsx` uses `calc(... + var(--sab, env(...)))`.

---

## 6. Typography Floor Enforcement

**BEFORE:** `text-[8–11px]` in chrome (tab bar, hub headers, dashboard timeline).

**AFTER:** Chrome files migrated to `text-xs` (12px). Gate: `scripts/check-typography-floor.ts`.

---

## 7. Parenting Hub Density Reduction

**BEFORE:** `space-y-6`, `gap-2`, micro labels at 9–10px.

**AFTER:** `space-y-8`, grid `gap-3`, section labels `text-xs`, `SCREEN_SPACING.pageBottom`.

**File:** `pages/parenting-hub.tsx`

---

## 8. Dashboard Density Reduction

**BEFORE:** `gap-5`, timeline micro badges at 9–11px.

**AFTER:** `gap-6`, timeline badges `text-xs`, `SCREEN_SPACING.pageBottom`.

**File:** `pages/dashboard.tsx`

---

## 9. Accessibility Sweep

**BEFORE:** Missing labels on icon controls; mislabeled tab nav; focus removed on FAB.

**AFTER:**
- `mobile-tab-bar.tsx` — `aria-label="Main navigation"`
- `persistent-composer.tsx` — send label
- `routines/index.tsx` — week nav labels
- `routines/detail.tsx` — close + delete labels, 44px close
- `story-carousel.tsx` — removed sub-44px override
- `amy-fab.tsx` — `focus-visible:ring`
- `hub-module-page-shell.tsx` — back labels + 44px targets
- `layout.tsx` — 44px header back button

---

## 10. Experience System Adoption

**BEFORE:** `experience-system.ts` rarely used outside learning-progress.

**AFTER:** `SCREEN_SPACING.pageBottom` on dashboard + parenting hub; `TYPE.pill` raised to `text-xs`.

**Files:** `pages/dashboard.tsx`, `pages/parenting-hub.tsx`, `lib/experience-system.ts`

---

## Remaining Manual QA (device)

1. Pixel / Samsung: confirm `--sab` visible in DevTools on production WebView build
2. iPhone 15 Pro: Capacitor header + tab bar clearance
3. Foldable 320px: hub + dashboard no clipped CTAs
4. VoiceOver / TalkBack: tab bar, back, composer send

---

*Last updated: UX Stabilization Release implementation pass.*
