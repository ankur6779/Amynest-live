# Amy Health Lab™ v1.0.0 — Release Notes

**Release date:** 2026-07-24  
**Git tag:** `health-lab-v1.0.0`

---

## Overview

First production release of Amy Health Lab — six kid-friendly wellness mini-games (Balloon Journey, Rocket Launch, Crystal Core, Sky Island, Crystal Garden, Wellness Journey) with XP, badges, shop, and parent wellness dashboard.

This release closes all RC1 and RC2 hardening blockers. No new gameplay features or UI redesign.

---

## Highlights

### Accessibility

- **Keyboard:** Escape dismisses Session Rewards, Motion Prep, Celebration, and victory overlays; focus returns to the prior element.
- **Touch targets:** All flagged controls meet 48×48 px minimum (Progress back, Shop, Dashboard, Celebration close, victory dismiss buttons).
- **Screen readers:** Victory overlays expose dialog semantics and labelled titles.

### Quality gates passed

| Gate | Result |
|------|--------|
| RC2 Escape regression | Pass |
| RC2 20-minute soak (419 cycles) | Pass — 0 MB heap growth, no portal leak |
| RC2 performance matrix (6 games + home) | Pass — 0 long tasks >50 ms |
| Responsive cert (320–768 dp) | Pass (prior RC) |
| Release regression (18/18) | Pass (prior RC) |
| Production build | Pass |

Machine-generated soak/perf JSON and run logs are **not** versioned; regenerate locally:

```bash
cd artifacts/kidschedule
RC2_SOAK_MS=1200000 npx playwright test playwright/specs/health-lab-rc2-soak-perf.spec.ts \
  --config playwright.config.health-lab-rc2.ts
```

---

## Deployment

1. Merge release branch to production deploy target.
2. Confirm `health_lab_progress` migration applied (see `audit/health-lab-launch-go-no-go.md`).
3. Smoke on iOS Capacitor shell and Android WebView (`https://www.amynest.in`).
4. Tag: `git tag -a health-lab-v1.0.0 -m "Amy Health Lab v1.0.0 production release"`

---

## Known limitations

- Battery and CPU profiling requires physical Android WebView device harness (N/A in headless CI).
- Dev-only CORS noise from `startup-funnel-events` during Playwright runs is ignorable.

---

## Certification

Full RC2 audit: [`audit/health-lab-rc2-certification.md`](health-lab-rc2-certification.md)

**Recommendation:** ✅ Production release approved.
