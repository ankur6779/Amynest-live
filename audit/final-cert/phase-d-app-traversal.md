# Phase D — Full App Traversal

**Validated:** 2026-06-12T07:29:53Z (production Playwright)  
**Spec:** `playwright/specs/full-app-certification.spec.ts`  
**Report:** `audit/final-cert/full-app-cert-report.json`

## Scope

16 signed-in routes (major surfaces). Does **not** cover all 72 AppCore routes, admin, dev, dynamic slugs, or deep hub tile clicks.

## Results

| Route | Verdict | HTTP | Crash | 404 UI | Page Errors |
|-------|---------|------|-------|--------|-------------|
| /dashboard | PASS | 200 | 0 | 0 | 0 |
| /parenting-hub | PASS | 200 | 0 | 0 | 0 |
| /audio-lessons | PASS | 200 | 0 | 0 | 0 |
| /amy-coach | PASS | 200 | 0 | 0 | 0 |
| /speech-coach | PASS | 200 | 0 | 0 | 0 |
| /phonics | PASS | 200 | 0 | 0 | 0 |
| /routines | PASS | 200 | 0 | 0 | 0 |
| /insights | PASS | 200 | 0 | 0 | 0 |
| /progress | PASS | 200 | 0 | 0 | 0 |
| /games | PASS | 200 | 0 | 0 | 0 |
| /nutrition | PASS | 200 | 0 | 0 | 0 |
| /parent-profile | PASS | 200 | 0 | 0 | 0 |
| /pricing | PASS | 200 | 0 | 0 | 0 |
| /learn-with-amy | PASS | 200 | 0 | 0 | 0 |
| /study | PASS | 200 | 0 | 0 | 0 |
| /environment | PASS | 200 | 0 | 0 | 0 |

**Overall:** PASS (no crash overlay, no 404 UI)

## Console Errors (not failing spec)

- `/routines` — React hydration: nested `<button>` inside `<button>`

## Uncaught Exceptions

None recorded (`pageErrors: []` on all routes).

## Not Traversed (missing test = FAIL per board rules)

- `/talking-amy`, `/speech-coach/talk`, `/speech-coach/live-session`
- `/discovery-worlds`, `/worlds/:slug`, `/animal-world`
- `/spelling`, `/abacus`, `/olympiad`, `/life-skills`
- `/routines/generate` (Routine Generator regression)
- `/insights` Cry Insights deep-dive
- `/children/*`, `/behavior`, admin routes
- Hub tile/dialog/tab exhaustive clicks

## Audio / Regression Specs (same session family)

| Spec | Result |
|------|--------|
| audio-coverage.spec.ts | **FAIL** 3/8 features |
| audio-lessons-playback.spec.ts | **FAIL** (flaky vs coverage) |
| prod-crash-verify.spec.ts | PASS |

## Phase D Verdict

**FAIL** — Route shell traversal passes, but board requires zero uncaught exceptions **and** comprehensive click coverage. Traversal is **incomplete** (~22% of AppCore routes). No failure screenshots required for passing routes; audio failures documented in `audit/final-cert/screenshots/`.
