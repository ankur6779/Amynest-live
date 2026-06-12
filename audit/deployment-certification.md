# AmyNest Production Deployment Certification

**Validated:** 2026-06-12T11:20:00Z  
**Target:** https://www.amynest.in  
**Scope:** Verify live production contains assumed code fixes (dev route gating, phonics/infant audio, rhyme registry trim, PROD bundle branch)

---

## Executive Summary

| Field | Result |
|-------|--------|
| **Overall** | **FAIL** |
| **Certification Decision** | **FAIL — FIXES NOT DEPLOYED** |
| **Deployment Score** | **8 / 100** |
| **Audio Score** | **28 / 100** |
| **Security Score** | **10 / 100** |
| **Revised Launch Score** | **51.2 / 100** |

**Bottom line:** Source fixes in `AppCore.tsx` (PROD → `DevRouteRedirect`) and the 168-entry rhyme registry are **not live**. Production still serves `AppCore-Cdu12y8L.js` with the **dev route branch** (`component:p7` / line 778). Dev surfaces, phonics playback, and rhyme registry checks all fail against certification gates.

---

## CHECK 1 — Dev Routes

**Verdict: FAIL**

| Route | curl HEAD | Playwright guest final URL | Dev UI visible? |
|-------|-----------|----------------------------|-----------------|
| `/debug-parity` | 200 (SPA shell) | `/debug-parity` | **Yes** — "Debug Parity Report" |
| `/dev/phonics-audio-preview` | 200 | `/dev/phonics-audio-preview` | **Yes** — phonics A/B dev UI |
| `/dev/rhymes-audio-ab` | 200 | `/dev/rhymes-audio-ab` | **Yes** — rhymes A/B dev UI |

- Playwright (`playwright.config.dev-routes.ts`, guest): **3/3 redirect tests failed** (expected `/dashboard`, stayed on dev path).
- `/debug/learning`: redirects to `/sign-in` for guests — **PASS**.
- curl returns HTTP 200 for all (normal SPA); **client-side routing exposes dev content** — certification FAIL.

Evidence: `audit/screenshots/final-cert/test-results/dev-route-redirect-*/test-failed-1.png`

---

## CHECK 2 — Phonics Playback

**Verdict: FAIL**

- Signed in as `demo@amynest.in` on `/phonics`.
- Play button tapped via `[data-testid^="audio-play-"]`.
- Playback probe: `no_audio_element` — no `<audio>` with `src`, play not resolved, `currentTime` never advanced.

Evidence: `audit/phonics-probe-result.json`, `audit/screenshots/deployment-cert/phonics-signed-in.png`

---

## CHECK 3 — Infant Playback

**Verdict: FAIL**

| Surface | Result | Notes |
|---------|--------|-------|
| Story | FAIL | `no_audio_element` after hub navigation |
| Poem | FAIL | `infant_poem_requires_infant_child_or_fixture` — poem section not reached |
| Lullaby | FAIL | Fullscreen sleep player opened but playback not verified; tab switch blocked by overlay |

Evidence: `audit/deployment-cert-infant.json`, screenshots under `audit/screenshots/deployment-cert/`

---

## CHECK 4 — Rhyme Registry

**Verdict: FAIL**

| Gate | Expected | Live |
|------|----------|------|
| Catalog count | 168 | **172** |
| Removed 4 IDs absent | yes | **still in catalog + signed-url API returns 200** |
| Sample rhymes playable | yes | mixed — valid samples OK; corrupt IDs fail |

**Removed IDs still live:**

- `beneath-the-moss-blanket`
- `beyond-the-rainbow`
- `little-star-shine-bright`
- `london-bridge-piano-version`

ffprobe live probe: **4/4 corrupt** (signed URL HEAD 400).  
API: `GET /api/audio/rhymes/catalog` → `{ count: 172 }`.

Evidence: `audit/blocker-d-rhyme-ffprobe.json`

---

## CHECK 5 — Build Verification

**Verdict: FAIL**

| Signal | Live production |
|--------|-----------------|
| AppCore bundle | `AppCore-Cdu12y8L.js` (849,793 bytes) — **same hash as prior failed audit** |
| `DevRouteRedirect` in bundle | **0 occurrences** |
| `/debug-parity` route wiring | `path:"/debug-parity",component:p7` — **dev branch** |
| Source map line | `AppCore.tsx lineNumber:778` — DebugParityPage, not redirect |
| Lazy dev chunk loaded | `debug-parity-1ObKuTiY.js` |
| Deploy version marker | null in sessionStorage |

Source expectation (`AppCore.tsx` L769–780):

```tsx
{import.meta.env.PROD ? (
  <Route path="/debug-parity" component={DevRouteRedirect} />
) : (
  <Route path="/debug-parity" component={DebugParityPage} />
)}
```

**Live bundle compiled the `else` (dev) branch.** Redeploy required.

Evidence: `audit/deployment-cert-probe.json`

---

## Remaining Production Defects

1. Dev/debug routes publicly render dev application content (security + navigation).
2. Production bundle not rebuilt/redeployed with `DevRouteRedirect` PROD branch.
3. Phonics audio playback broken for demo account on `/phonics`.
4. Infant story/poem/lullaby playback not certified (all probes failed).
5. Rhyme registry still 172 entries; four corrupt IDs not removed from API catalog.
6. Four rhyme MP3 objects fail ffprobe via signed URLs.

---

## Scoring Detail

### Deployment Score: 8 / 100

Fixes assumed correct in source are **not present in live production**. Only partial credit for API availability and sample rhyme URLs.

### Audio Score: 28 / 100

Phonics FAIL; infant story/poem/lullaby FAIL; 4 corrupt rhymes remain; some valid rhyme samples pass.

### Security Score: 10 / 100

Three dev routes expose full dev UI to unauthenticated guests.

### Revised Launch Score: 51.2 / 100

Same weights as prior executive/board reviews:

| Component | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Audio | 25% | 38 | 9.5 |
| Crash / stability | 20% | 74 | 14.8 |
| Content parity | 15% | 58 | 8.7 |
| Infrastructure | 15% | 72 | 10.8 |
| Navigation | 10% | 12 | 1.2 |
| Performance | 10% | 58 | 5.8 |
| Security | 5% | 8 | 0.4 |
| **Total** | | | **51.2** |

---

## Certification Decision

**FAIL — FIXES NOT DEPLOYED**

Do **not** certify this production deployment. Redeploy frontend after merge, then re-run:

```bash
PLAYWRIGHT_BASE_URL=https://www.amynest.in \
STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
pnpm --filter @workspace/kidschedule exec playwright test --config playwright.config.dev-routes.ts
```

Post-deploy: grep live `AppCore-*.js` for `DevRouteRedirect` and confirm `/api/audio/rhymes/catalog` returns `count: 168`.

---

## Artifacts

- `audit/deployment-certification.json` — machine-readable report
- `audit/deployment-cert-probe.json` — bundle + build probe
- `audit/deployment-cert-infant.json` — infant playback probe
- `audit/phonics-probe-result.json` — phonics playback probe
- `audit/blocker-d-rhyme-ffprobe.json` — corrupt rhyme ffprobe
- `audit/screenshots/deployment-cert/` — signed-in evidence screenshots
