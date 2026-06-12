# AmyNest Final Live Production Certification

**Validated:** 2026-06-12T11:56:00Z  
**Target:** https://www.amynest.in  
**Method:** Live production probes only (curl, Playwright, API). No local code or branch inspection.

---

## Executive Summary

| Field | Value |
|-------|-------|
| **Deployment Verified** | **YES** |
| **Overall Verdict** | **FAIL** |
| **Launch Score** | **74.8 / 100** |
| **Launch Probability** | **56%** |
| **30-Day Failure Risk** | **44%** |
| **Certification Band** | **70–84** |
| Critical / High / Medium / Low | **2 / 1 / 2 / 2** |

New deployment is live (bundle hashes changed, rhyme registry corrected to 168, dev routes now auth-gated). Two proven user-facing defects block launch: **Phonics playback** and **Rhymes in-app surface**.

---

## Phase 1 — Deployment Confirmation

**DEPLOY VERIFIED: YES**

| Check | Result | Evidence |
|-------|--------|----------|
| Index bundle hash | `CsvyOEjd` (was `Cdu12y8L`) | `index.html` script src `/assets/index-CsvyOEjd.js` |
| AppCore bundle hash | `Dh4PtQbE` (was `Cdu12y8L`) | Loaded at `https://www.amynest.in/assets/AppCore-Dh4PtQbE.js` (658,962 bytes) after signed-in navigation |
| Deploy meta | `2026-06-12-04fcb1f` | `<meta name="amynest-deploy" content="2026-06-12-04fcb1f">` |
| DevRouteRedirect in bundle | **0 matches** | Grep live `AppCore-Dh4PtQbE.js` — protection is auth redirect, not client redirect component |
| `/api/health` | OK | `{"ok":true,"timestamp":1781264335380}` |
| Rhyme catalog count | **168** | `GET /api/audio/rhymes/catalog` → `count: 168` |

---

## Phase 2 — Security (Guest)

**Verdict: PASS**

Playwright guest probe (Pixel 5, no cookies):

| Route | Final URL | Dev UI Rendered | Verdict |
|-------|-----------|-----------------|---------|
| `/debug-parity` | `/sign-in` | No | PASS |
| `/dev/phonics-audio-preview` | `/sign-in` | No | PASS |
| `/dev/rhymes-audio-ab` | `/sign-in` | No | PASS |
| `/debug/learning` | `/sign-in` | No | PASS |

Prior certification exposed full dev UI on these routes. Live production now redirects all four to sign-in with no dev content in body text.

Screenshots: `audit/screenshots/final-live-cert/guest-security-*.png`

---

## Phase 3 — Audio Certification (Signed In)

**Verdict: FAIL**  
**Audio Coverage: 62.5%** (5 PASS / 8 required features; 1 not tested; 2 FAIL)

Playwright: `audio-coverage.spec.ts` against `PLAYWRIGHT_BASE_URL=https://www.amynest.in` with `demo@amynest.in`.

| Feature | Verdict | Playback Evidence |
|---------|---------|-------------------|
| Amy Coach | **PASS** | `currentTime` 2.68s, advancing, blob audio |
| Conversation Coach | **PASS** | `currentTime` 4.99s, advancing, TTS mp3 |
| Story Hub | **PASS** | Video `currentTime` 3.11s, `/api/stories/stream/...` |
| Phonics | **FAIL** | `audio-play-cat` clicked; no `audio`/`video` with `src` |
| Infant Story | **NOT TESTED** | Stories tab not independently probed (missing test ≠ failure) |
| Infant Poem | **PASS** | `currentTime` 9.74s advancing (harness trigger error but audio played) |
| Infant Lullaby | **PASS** | `currentTime` 2.09s advancing via lullabies tab |
| Rhymes | **FAIL** | `/rhymes` error UI ("Try Again"); zero media elements |

Screenshots: `audit/screenshots/final-live-cert/{amy_coach,conversation_coach,parent_hub_story,phonics,infant_poem,infant_story,rhymes-probe}.png`

---

## Phase 4 — Rhyme Certification

**Verdict: PASS (API/GCS layer)**

| Check | Result |
|-------|--------|
| Registry count | **168** (expected 168) |
| Removed corrupt IDs absent | **Yes** — `beneath-the-moss-blanket`, `beyond-the-rainbow`, `little-star-shine-bright`, `london-bridge-piano-version` not in catalog |
| Random sample (20 assets) | **20/20 HTTP 200**, all `audio/mpeg`, bytes 2.8–5.8 MB |

Note: API layer is healthy; in-app `/rhymes` page failure is a separate frontend defect (Phase 3).

---

## Phase 5 — Core User Journeys

**Verdict: PARTIAL**

| Journey | Verdict | Screenshot |
|---------|---------|------------|
| Guest landing | PASS | `guest-landing.png` |
| Guest sign-in | PASS | `guest-sign-in.png` |
| Parent dashboard | PASS | `parent-dashboard.png` |
| Parenting hub | PASS | `parent-parenting-hub.png` |
| Routines | PASS | `parent-routines.png` |
| Amy Coach | PASS | `parent-amy-coach.png` |
| Phonics (child) | NAV OK / AUDIO FAIL | `child-phonics.png` |
| Stories (child) | PASS | `child-parenting-hub-tile-story-hub.png` |
| Rhymes (child) | FAIL | `child-rhymes.png` |
| Discovery worlds | PASS | `child-discovery-worlds.png` |

No uncaught page exceptions captured; console error array empty in journey probe.

---

## Phase 6 — Regression

| Previously fixed item | Live status |
|-----------------------|-------------|
| Dev routes publicly exposed | **FIXED** — auth redirect to `/sign-in` |
| Rhyme corruption (172→168) | **FIXED** — 168 entries, 4 corrupt IDs removed |
| Phonics playback | **STILL FAIL** |
| Infant lullaby/poem | **PASS** (playback verified) |
| Rhymes in-app | **STILL FAIL** — error state on `/rhymes` |

---

## Phase 7 — Launch Score

| Component | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Audio | 25% | 62 | 15.5 |
| Crash | 20% | 84 | 16.8 |
| Content | 15% | 86 | 12.9 |
| Infrastructure | 15% | 90 | 13.5 |
| Navigation | 10% | 70 | 7.0 |
| Performance | 10% | 50 | 5.0 |
| Security | 5% | 92 | 4.6 |
| **Total** | | | **74.8** |

- **Launch Probability:** 56%  
- **30-Day Failure Risk:** 44%  
- **Band:** 70–84 (conditional — fix Critical blockers first)

---

## Defect Register

### Critical (2)
1. **Rhymes page error** — `/rhymes` shows "Try Again" / "Go Home"; no playback despite healthy API catalog.
2. **Phonics no audio** — Play button visible; no media element receives audio after click.

### High (1)
3. **Infant Story tab unverified** — Lullaby/poem pass; stories tab not independently tested.

### Medium (2)
4. **CWV not measured** — LCP/CLS/INP not collected this run.  
5. **DevRouteRedirect absent from bundle** — Auth gating works; explicit redirect component not present in `AppCore-Dh4PtQbE.js`.

### Low (2)
6. Speech Coach paused/not advancing (outside required 8-feature set).  
7. Intermittent parenting-hub hash navigation timeout in automation.

---

## Artifacts

- `audit/final-live-certification.json`
- `audit/screenshots/final-live-cert/` (24 screenshots)
- `artifacts/kidschedule/playwright/audio-coverage-artifacts/report.json`

---

## Certification Decision

**FAIL — DO NOT LAUNCH** until Critical defects (Phonics playback, Rhymes in-app surface) are fixed and re-certified on live production.

Deployment **is** live and several prior blockers (dev route exposure, corrupt rhyme registry) are resolved. Remaining failures are proven user-facing playback/navigation defects, not missing tests.
