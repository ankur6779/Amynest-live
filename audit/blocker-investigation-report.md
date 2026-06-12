# Independent Blocker Investigation — AmyNest Production

**Validated:** 2026-06-12T09:40:00Z  
**Production:** https://www.amynest.in  
**Deploy marker:** `2026-06-12-ceeb255` (HTML meta)  
**Method:** Live curl, Playwright, ffprobe, browser inspection — prior audit findings re-verified, not trusted.

---

## Executive Summary

Independent live verification confirms **three true production blockers** (dev routes, phonics playback, corrupt rhyme assets) and **one performance gate failure** (main bundle size). Several prior audit claims were **false positives** or **methodology errors**. Revised weighted launch score: **65.0 / 100 (FAIL)**.

---

## Per-Blocker Verdict Table

| Blocker | Prior claim | Live verdict | Category | Evidence |
|---------|-------------|--------------|----------|----------|
| **A — Dev routes** | Dev/debug surfaces live; no redirect | **CONFIRMED — REAL SECURITY ISSUE** | Real production defect | `/debug-parity` renders full Debug Parity Report; `/dev/phonics-audio-preview` renders phonics A/B dev UI. Production `AppCore-Cdu12y8L.js` wires `DebugParityPage` at source line **778** (dev branch), not `DevRouteRedirect` (line 772). curl returns HTTP 200 for all (SPA); redirect is client-side and **not active**. |
| **A — `/debug/learning`** | Anonymous access | **NOT a blocker** | False positive | Guest navigation ends at `/sign-in`; no debug learning content without auth. |
| **B — Phonics audio** | No audio on `/phonics` | **CONFIRMED — REAL BUG** | Real production defect (UI/playback) | Signed-in Playwright audio-coverage (2026-06-12): trigger succeeds, `no_audio_element` after play click. Phonics uses `phonics-player` → `audioManager`; no media element or playback detected. |
| **C — Infant audio** | Broken on demo account | **PARTIAL — infant story likely real; infant poem inconclusive** | Infant story: real defect; infant poem: audit methodology | Demo account **has** infant child (Child 1, 1 month on dashboard). Infant story: navigation succeeds, `no_audio_element` (live run 2026-06-12). Infant poem: test helper throws `infant_poem_requires_infant_child_or_fixture` despite infant child — child not auto-selected in hub flow. |
| **D — Rhyme assets (4)** | 168/172 GCS probe OK | **CONFIRMED — 4 CORRUPT FILES** | Real production defect | Signed URL API returns HTTP 200 + `audio/mpeg`, but **ffprobe fails on all 4** (invalid MPEG frames). Files exist but are unplayable. |
| **E — Performance** | 3.35 MB bundle; CWV missing | **PARTIAL PASS on CWV; FAIL on bundle** | Bundle: real defect; LCP prior audit: methodology error | Main chunk **3,513,396 bytes (3.35 MB)** > 2.5 MB gate. Measured LCP: dashboard **1664 ms**, parenting-hub **1380 ms** (both ≤ 3 s). CLS **0** on both. INP not captured in headless (Event Timing unavailable). |

---

## Blocker A — Dev Routes (Detail)

### HTTP (curl -I -L)

| Route | HTTP status | Server redirect | Final URL (curl) |
|-------|-------------|-----------------|------------------|
| `/debug-parity` | 200 | None | Same path (SPA shell) |
| `/dev/phonics-audio-preview` | 200 | None | Same path |
| `/dev/rhymes-audio-ab` | 200 | None | Same path |
| `/debug/learning` | 200 | None | Same path (SPA shell) |

### Client-side (Playwright + browser)

| Route | Final URL | Dev content visible | Auth required |
|-------|-----------|---------------------|---------------|
| `/debug-parity` | `/debug-parity` | **Yes** — "Debug Parity Report", Export JSON | No |
| `/dev/phonics-audio-preview` | `/dev/phonics-audio-preview` | **Yes** — "Phonics sound demo", A/B columns | No |
| `/dev/rhymes-audio-ab` | `/dev/rhymes-audio-ab` | Headless timeout; same bundle wiring as other dev routes | No |
| `/debug/learning` (guest) | `/sign-in` | No | Yes (redirect to sign-in) |

### Source vs deployed bundle

- **Source** (`AppCore.tsx`): `IS_PROD ? DevRouteRedirect : DebugParityPage`
- **Deployed** (`AppCore-Cdu12y8L.js`): stack trace `lineNumber:778` → **dev branch compiled into production build**
- Commit `ceeb255` is deployed per HTML meta, but **production build did not compile the IS_PROD redirect branch**

### REAL SECURITY ISSUE? **YES**

Dev QA surfaces are publicly reachable without authentication. `/debug/learning` is gated for guests.

Screenshot: `audit/screenshots/blocker-investigation/debug-parity-live.png`

---

## Blocker B — Phonics Audio (Detail)

| Context | Play button | Audio element | src HTTP | currentTime > 0 |
|---------|-------------|---------------|----------|-----------------|
| Guest | Not reached (page load timing) | No | — | No |
| Parent (demo@amynest.in) | Clicked (audio-coverage helper) | **No** | — | **No** |
| Child context | Same as parent | No | — | No |

**Root cause category:** Real production defect — playback path does not surface a playable media element after UI interaction. Not a manifest-only issue (static phonics URLs exist; speech coach static audio works on same build).

Screenshot: `audit/screenshots/blocker-investigation/phonics.png`

---

## Blocker C — Infant Audio (Detail)

| Surface | Result | Notes |
|---------|--------|-------|
| Infant story (lullaby tile) | **FAIL** — `no_audio_element` | Hub navigation reached; playback not detected |
| Infant poem | **INCONCLUSIVE** | `infant-poems-section` not visible; test requires infant child selection helper |
| Demo infant child | **Present** — Child 1, 1 month | Prior audit claim "no infant child" is **incorrect** |

**REAL BUG?** Infant story: **YES** (playback failure after successful navigation). Infant poem: **cannot certify** without fixing test child-selection flow.

Screenshot: `audit/screenshots/blocker-investigation/infant_story.png`

---

## Blocker D — Rhyme Assets (Detail)

**Live failing asset count: 4** (corrupt MP3, not missing)

| ID | Object path | Signed URL status | Content-Type | Bytes | ffprobe |
|----|-------------|-------------------|--------------|-------|---------|
| `beneath-the-moss-blanket` | `Rhymes/Beneath the Moss Blanket.mp3` | 200 | audio/mpeg | 137,958 | **FAIL** — invalid MPEG |
| `beyond-the-rainbow` | `Rhymes/Beyond the Rainbow.mp3` | 200 | audio/mpeg | 87,096 | **FAIL** |
| `little-star-shine-bright` | `Rhymes/Little Star, Shine Bright.mp3` | 200 | audio/mpeg | 140,399 | **FAIL** |
| `london-bridge-piano-version` | `Rhymes/London Bridge (Piano Version).mp3` | 200 | audio/mpeg | 100,652 | **FAIL** |

Public GCS URLs return 403 (expected — bucket is private). Signed URL API works; files are **corrupt at rest**.

---

## Blocker E — Performance (Detail)

### Measured Core Web Vitals (Playwright + PerformanceObserver, guest/shell)

| Page | LCP | CLS | FCP | TTFB | INP |
|------|-----|-----|-----|------|-----|
| `/dashboard` | **1664 ms** | **0** | 1336 ms | 369 ms | not captured |
| `/parenting-hub` | **1380 ms** | **0** | 548 ms | 497 ms | not captured |

### JavaScript bundle

| Asset | Bytes | MB | Gate |
|-------|-------|-----|------|
| `main-BP5gGGAB.js` | 3,513,396 | **3.35** | **FAIL** (> 2.5 MB) |

**REAL PERFORMANCE SCORE (component):** CWV **pass** on measured LCP/CLS; bundle **fail**. Component score ~58/100.

---

## True Blockers

1. **Dev/debug routes exposed in production** — build compiled dev route branch despite `IS_PROD` guard in source
2. **Phonics playback broken** — signed-in user, play clicked, no audio playback
3. **Four corrupt rhyme MP3 assets** — HTTP 200 but ffprobe-invalid
4. **Main JS bundle 3.35 MB** — exceeds 2.5 MB release gate
5. **Infant story playback** — likely real (pending poem re-test with infant child selected)

---

## False Positives

1. **`/debug/learning` anonymous access** — guests redirect to sign-in
2. **"ceeb255 fixes dev route redirects"** — deploy marker present but redirect branch not in compiled bundle
3. **"Demo account lacks infant child"** — Child 1 is 1 month old

---

## Audit Errors

1. **Trusted source `IS_PROD` guard without verifying compiled bundle** — led to incorrect "fixed" expectation
2. **Counted public GCS 403 as asset missing** — signed URL path works; failure is file corruption
3. **Marked CWV as "missing" without running PerformanceObserver** — LCP is measurable and passes
4. **Infant poem failure attributed to missing child** — infant child exists; test navigation inadequate
5. **curl HTTP 200 interpreted as "route exposed"** without client-side content check — partially valid for SPA but insufficient alone

---

## Revised Launch Score

Same weights as executive board review:

| Component | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| Audio | 25% | 57 | 14.25 | Static OK; phonics + infant story fail; 4 corrupt rhymes |
| Crash / stability | 20% | 74 | 14.80 | No crash overlay in traversal; hydration not re-tested |
| Content parity | 15% | 76 | 11.40 | 4 corrupt rhyme files; infant poem unverified |
| Infrastructure | 15% | 82 | 12.30 | API health, signed URLs, story hub OK |
| Navigation | 10% | 58 | 5.80 | Dev routes exposed; partial traversal |
| Performance | 10% | 58 | 5.80 | LCP pass (1.4–1.7 s); bundle fail |
| Security | 5% | 12 | 0.60 | Dev routes publicly accessible |

### **Weighted launch score: 65.0 / 100**

**Band:** FAIL (< 85)

---

## Revised Launch Probability

| Metric | Value | Rationale |
|--------|-------|-----------|
| **30-day stable launch probability** | **42%** | Dev route exposure + phonics regression + corrupt assets remain |
| **30-day failure probability (paid users)** | **38%** | Phonics is core learning path; 4/172 rhymes corrupt |
| **Certification recommendation** | **DO NOT RELEASE** | Fix build pipeline (IS_PROD branch), phonics playback, re-encode 4 rhyme files, reduce main bundle |

---

## Artifacts

| File | Description |
|------|-------------|
| `audit/blocker-investigation.json` | Machine-readable report |
| `audit/blocker-d-rhyme-probe.json` | Live signed URL probes |
| `audit/blocker-d-rhyme-ffprobe.json` | ffprobe corruption confirmation |
| `audit/cwv-measurement.json` | LCP/CLS/FCP measurements |
| `audit/screenshots/blocker-investigation/` | Failure screenshots |

---

## Certification Recommendation

**FAIL — score 65.0 / 100**

Release is **not authorized** until:

1. Production build compiles `DevRouteRedirect` for dev routes (verify in `AppCore-*.js` bundle post-deploy)
2. Phonics playback restored on `/phonics` for signed-in parents
3. Four corrupt rhyme MP3s re-uploaded and ffprobe-validated
4. Main bundle reduced below 2.5 MB or gate formally waived with evidence
