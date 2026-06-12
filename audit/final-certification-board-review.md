# AmyNest Release Certification Board Review

**Date:** 2026-06-12  
**Production:** https://www.amynest.in  
**Board stance:** Adversarial — prior audits (including score 84) discarded  
**Final verdict:** **FAIL**  
**Weighted Launch Score:** **58.4 / 100**  
**Certification band:** **<85 (No-Go)**

---

## Executive Summary

Live production verification on 2026-06-12 fails release certification. The deploy associated with commit `ceeb2553` **does not** redirect dev/debug routes in production — four security-sensitive surfaces remain publicly reachable. Signed-in Playwright traversal fails on `/speech-coach`, `/phonics`, and `/routines`. Audio URL coverage is 99.96% but **playback certification fails 50% of feature surfaces**. Main JavaScript chunk is **3.35 MB**, exceeding the 2.5 MB gate. Core Web Vitals were not measured.

**Launch Probability:** 22%  
**30-Day Failure Probability:** 68%  
**DAU Risk:** HIGH — phonics and infant flows are core retention surfaces

---

## Critical Issues

| # | Issue | Evidence |
|---|-------|----------|
| C1 | **Dev routes NOT redirected in production** | Playwright: `/debug-parity`, `/dev/phonics-audio-preview`, `/dev/rhymes-audio-ab` stay on dev URL after 3s. Screenshot: `audit/screenshots/final-cert/dev-route-debug-parity-no-redirect.png` |
| C2 | **`/debug/learning` publicly accessible unauthenticated** | Playwright URL remains `https://www.amynest.in/debug/learning` without sign-in redirect |
| C3 | **Phonics page unreachable in signed-in traversal** | `full-app-cert-report.json`: 90s navigation timeout on `/phonics` |
| C4 | **Speech Coach navigation timeout** | Same report — blocks coach regression path |

## High Issues

| # | Issue | Evidence |
|---|-------|----------|
| H1 | **Conversation Coach: no audio playback** | `audio-coverage report.json`: `no_audio_element`. Screenshot: `audit/screenshots/final-cert/conversation_coach.png` |
| H2 | **Phonics: no audio element after navigation** | Audio coverage FAIL — screenshot `phonics.png` |
| H3 | **Infant Story/Poem playback FAIL** | Infant poem: `infant_poem_requires_infant_child_or_fixture` + no audio element |
| H4 | **Main bundle 3.35 MB** | Live probe: `assets/main-BP5gGGAB.js` = 3,513,396 bytes (> 2.5 MB gate) |
| H5 | **4 rhymes likely corrupt in GCS** | ffprobe failures on Beneath the Moss Blanket, Beyond the Rainbow, Little Star Shine Bright, London Bridge Piano Version |
| H6 | **API fetch timeouts during traversal** | Console: `FetchTimeoutError: Request timed out after 8000ms` on onboarding/parent-profile |

## Medium Issues

| # | Issue | Evidence |
|---|-------|----------|
| M1 | **Static-audio probe timeouts (2 URLs)** | `audit/audio-cert-final.json` — retry returned 200; reliability concern |
| M2 | **Routines navigation interrupted** | Redirect loop from `/routines` → `/phonics` mid-navigation |
| M3 | **Discovery Worlds 795 assets unverified live** | Manifest claims 100%; board did not live-probe each asset |
| M4 | **Cry Insights, Talking Amy, Rhymes E2E not tested** | Phase I gaps |
| M5 | **Pricing route intermittent timeout** | Batch curl returned HTTP 000; retry returned 200 |

## Low Issues

| # | Issue | Evidence |
|---|-------|----------|
| L1 | **Speech Coach audio not advancing** | Playwright: `not_advancing`, paused at 1.15s |
| L2 | **Dashboard console fetch errors** | Non-fatal `Failed to fetch` on onboarding/parent-profile |
| L3 | **Chaos tests not run** | No slow-network/offline/memory-leak evidence |

---

## Component Scores

| Component | Weight | Score | Weighted | Notes |
|-----------|--------|-------|----------|-------|
| Audio | 25% | 68 | 17.0 | 99.96% URL coverage but 4/8 playback PASS; 4 corrupt rhymes |
| Crash / Stability | 20% | 62 | 12.4 | 3 route nav failures; API timeouts; no uncaught exceptions on passing routes |
| Content / Assets | 15% | 72 | 10.8 | Manifests populated; infant fixture gap; discovery unverified |
| Infrastructure | 15% | 78 | 11.7 | Story hub 224/224 GCS; rhymes 168/172 playable |
| Navigation | 10% | 65 | 6.5 | 13/16 major routes PASS; dev routes exposed |
| Performance | 10% | 35 | 3.5 | Bundle FAIL; LCP/CLS/INP MISSING |
| Security | 5% | 15 | 0.75 | API admin 401 OK; **client dev routes 200 FAIL** |
| **Total** | **100%** | — | **58.4** | **FAIL** |

---

## Phase-by-Phase Results

### Phase A — Production Reality
- **62 routes** curl-probed; 61 returned HTTP 200, `/pricing` timed out once (200 on retry)
- Signed-in demo account: dashboard, parenting-hub, amy-coach, audio-lessons PASS
- **FAIL:** speech-coach, phonics timeouts

### Phase B — 100% Audio Certification
- **4468** required URLs from manifests; **4466** playable (99.9552%)
- **FAIL:** 2 probe timeouts; threshold requires zero failures in adversarial mode
- Playback: Parent Hub Story, Amy Coach, Speech Coach (partial), Audio Lesson PASS
- **FAIL playback:** Conversation Coach, Infant Story, Infant Poem, Phonics

### Phase C — Content vs Asset Parity
- static-audio-map: 4434 keys
- infant-sleep manifest: 34 items (100% HTTP 200)
- rhymes registry: 172 files, 4 ffprobe failures
- phonics-audio-map + content-bank present in repo but playback broken in UI

### Phase D — Full App Traversal
- Playwright `full-app-certification.spec.ts` on production: **FAIL**
- 13 PASS / 3 FAIL / 16 total major routes

### Phase E — GCS Certification
- Story hub: 224 objects, all valid drive-id pattern
- Rhymes: 4 unplayable suspects
- See `audit/gcs-certification.md`

### Phase F — Performance
- `index-D9y3kfHX.js`: 2,671 bytes (entry)
- `AppCore-Cdu12y8L.js`: 850,179 bytes
- `main-BP5gGGAB.js`: **3,513,396 bytes — FAIL**
- LCP / CLS / INP: **MISSING** (penalty applied)

### Phase G — Security
- `/api/admin/*` → **401** (PASS)
- `/debug-parity`, `/dev/*`, `/debug/learning` → **200, no redirect** (FAIL)
- `/admin/dashboard` → 200 SPA shell (client-side gate only — acceptable for SPA but dev routes are not gated)

### Phase H — Chaos
- **NOT RUN** — slow network, offline, memory leak undocumented

### Phase I — Regression
| Feature | Result |
|---------|--------|
| Amy Coach | PASS |
| Conversation Coach | **FAIL** |
| Story Hub | PASS |
| Rhymes | Not E2E tested |
| Phonics | **FAIL** |
| Routine Generator | **FAIL** (nav) |
| Cry Insights | Not tested |
| Talking Amy | Not tested |

---

## Board Decision

**DO NOT CERTIFY FOR RELEASE.**

Minimum bar for 95+ band requires:
1. Live dev-route redirects verified on production
2. Phonics + Speech Coach navigation stable under demo account
3. 8/8 audio playback features PASS
4. Main chunk ≤ 2.5 MB or documented lazy-load strategy with measured LCP ≤ 3s
5. 4 rhymes re-encoded and ffprobe-verified
6. Core Web Vitals measured on production

---

## Artifacts Generated

| File | Purpose |
|------|---------|
| `audit/final-certification-board-review.md` | This document |
| `audit/final-certification-summary.json` | Machine-readable score |
| `audit/audio-cert-final.json` | Audio URL probe results |
| `audit/gcs-certification.md` | GCS audit |
| `audit/final-cert/production-routes-probe.json` | Route HTTP probe |
| `audit/final-cert/security-probe.txt` | Security curl log |
| `audit/final-cert/full-app-cert-report.json` | Playwright traversal |
| `audit/screenshots/final-cert/` | Failure screenshots |

---

*Certification Board — Independent adversarial review. No prior scores inherited.*
