# Amy Health Lab — Responsive Certification Report

**Generated:** 2026-07-20T04:00:00.300Z  
**Harness:** Playwright Chromium + `/playwright-health-lab.html` fixture  
**Suite:** `playwright/specs/health-lab-certification-responsive.spec.ts`  
**Verdict:** **PASS**

---

## Devices tested

| Device / harness | Notes |
|------------------|--------|
| Chromium (Playwright) | Android-class CSS viewports (dp ≈ CSS px) |
| Font scaling | Root `html { font-size }` at 100–150% (Android font scale proxy) |

*Physical Play Store device soak is still recommended as a follow-up; this cert is rendered-layout measurement, not a handset OEM matrix.*

---

## Screen widths tested (dp)

320 · 360 · 375 · 390 · 412 · 480 · 600 · 768

## Font scaling tested

100% · 115% · 130% · 150%

## Landscape tested

- landscape-iphone (667×375)
- landscape-android (800×360)

---

## Screens verified

- Health Lab Home
- Adventure Trail
- Every World Card
- Daily Quests
- For Grown-ups
- Passport / Wellness Report
- Balloon Valley
- Sky Island
- Rocket Base
- Crystal Garden
- Crystal Cave
- Onboarding / start CTAs (via world launch probes)

**Probe count:** 58 layout measurements  
**Fail conditions checked:** word-per-line, title/mission >2 lines, content squeeze, horizontal scroll, clipped text/buttons (non-scrollable), touch targets &lt;44dp, play-area overflow, HUD past viewport

---

## Performance sample

| Metric | Result |
|--------|--------|
| Home @ 390dp rAF FPS (~2s) | **57** (threshold ≥45) |

---

## Fixes required during certification (first run → PASS)

First measurement run was **FAIL (116 issues)**. Root causes and responsive-only fixes:

1. **Rem-inflated chrome under Android font scale** — icon/CTA mins used `rem`, so 130–150% scaling crushed the text column → switched touch floors to **px/vw** clamps.
2. **Intrinsic wrap** — card row uses `flex-wrap` + body `min-width: min(100%, max(140px, 40vw))` so CTA wraps instead of squeezing text.
3. **Mission copy length** — unrestored line shortened to `Restore {world}` (presentation only).
4. **Onboarding cut-off** — mission briefing uses scrollable full-bleed stage so Start CTAs remain reachable on short viewports.

Screenshots captured after fixes: `audit/health-lab-responsive-cert/screenshots/` (**31** files).

---

## Remaining issues

_None from automated fail-condition probes (0 fails)._

---

## Before / after

| | First cert run | Final cert run |
|--|----------------|----------------|
| Verdict | FAIL | **PASS** |
| Fail count | 116 | **0** |
| Dominant codes | word_per_line, mission_over_2_lines, content_squeezed, clipped_button | — |

Artifacts:

- `audit/health-lab-responsive-cert/report.json`
- `audit/health-lab-responsive-cert/screenshots/`

---

## PASS / FAIL

# **PASS**

Re-run:

```bash
pnpm --filter @workspace/kidschedule exec playwright test \
  --config playwright.config.health-lab.ts \
  health-lab-certification-responsive.spec.ts
```
