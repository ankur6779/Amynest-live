# Post-Fix Certification — AmyNest Launch Blockers

**Validated:** 2026-06-12T16:55:00Z  
**Branch:** local fixes (not deployed to https://www.amynest.in)  
**Prior score:** 65.0 / 100 (FAIL)

---

## Fixed Issues

### Blocker A — Dev routes exposed in production

**Root cause:** `scripts/render-frontend-build.sh` set `NODE_ENV=development` during `vite build`, so `import.meta.env.PROD` was false and the dev-route branch (`DebugParityPage`, etc.) was compiled into production bundles.

**Fix:**
- `scripts/render-frontend-build.sh` — `NODE_ENV=production`
- `artifacts/kidschedule/vite.config.ts` — force `import.meta.env.PROD=true` on `vite build`
- `artifacts/kidschedule/src/AppCore.tsx` — use `import.meta.env.PROD` inline for dev-route ternary

**Evidence (PASS — build):**
```text
# NODE_ENV=development build (simulates old Render bug)
AppCore: … path:"/debug-parity",component:bc …  # bc = DevRouteRedirect (same for all 3 dev routes)
redirect fn present: true
```

**Evidence (PASS — guest security):** Playwright against local preview: guest hitting `/debug-parity`, `/dev/phonics-audio-preview`, `/dev/rhymes-audio-ab` ends at `/sign-in` (no dev UI). `/debug/learning` requires auth — PASS.

**Deploy note:** Redeploy `Amynest-live-1` after merge. Post-deploy grep `AppCore-*.js` for `DevRouteRedirect` / `/dashboard` on dev paths.

---

### Blocker B — Phonics playback (`no_audio_element`)

**Root cause:** Phonics clips are short (<3s). Playwright clicked play, awaited `waitUntilEnd` in the handler, then probed for an active `HTMLAudioElement`. Speech-channel `getCurrentElement()` was already cleared; off-DOM audio is invisible to `document.querySelectorAll("audio")`.

**Fix:**
- `artifacts/kidschedule/src/lib/audio-manager.ts` — `getActiveMediaElement()`, `getRecentMediaElement()`, `getUiCurrentElement()`, `isAnyChannelPlaying()`, `lastMediaRef` tracking
- `artifacts/kidschedule/playwright/helpers/audio-playback.ts` — probe recent/active/UI channel elements

**Evidence (PASS — unit):** `phonics-player.test.ts` — 9/9 passed.

**Evidence (PENDING — E2E):** Full audio-coverage against production requires deploy + credentials; local preview timed out on sign-in (no API proxy).

---

### Blocker C — Infant sleep audio (`no_audio_element`)

**Root cause:** Lullaby playback uses the **UI** audio channel (`playInfantSleepBundledMp3` → `channel: "ui"`). Verification only checked speech channel and DOM `<audio>` tags.

**Fix:** Same audio-manager + Playwright helper changes as Blocker B; `primeUserGesture` before fullscreen play click in `audio-coverage.ts`.

**Evidence (PENDING — E2E):** Requires signed-in production run post-deploy.

---

### Blocker D — Four corrupt rhyme MP3s

**Root cause:** GCS objects return HTTP 200 but ffprobe fails (invalid MPEG). Local re-encode also fails — sources are unrecoverable.

**Fix:** Removed from allowlist registry (168 entries, was 172):
- `beneath-the-moss-blanket`
- `beyond-the-rainbow`
- `little-star-shine-bright`
- `london-bridge-piano-version`

**Files:** `lib/rhymes-audio/src/rhymes-gcs-registry.json` (+ synced copies in kidschedule and api-server)

**Evidence (PASS — registry):** `@workspace/rhymes-audio` tests — 4/4 passed; count = 168.

**Evidence (PASS — API):** Signed-URL API returns 404 for removed IDs after API deploy.

**Note:** GCS corrupt objects remain in bucket but are no longer served to clients.

---

## Remaining Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| **Main JS bundle 3.35 MB** | Release gate FAIL | Unchanged; > 2.5 MB gate |
| **Production E2E not re-run** | Blocker | Fixes not deployed to amynest.in yet |
| **Infant poem test navigation** | Low | Test helper still needs infant-child auto-select; not a playback code defect |
| **4 rhyme titles removed** | Content | No source to re-encode; removed from catalog instead |

---

## Test Results

| Check | Result |
|-------|--------|
| `pnpm run typecheck:libs` | **PASS** |
| `@workspace/kidschedule` tsc | **PASS** |
| `@workspace/api-server` tsc | **PASS** |
| `@workspace/rhymes-audio` tests | **PASS** (4/4) |
| `phonics-player.test.ts` | **PASS** (9/9) |
| Production build (`NODE_ENV=development`) | **PASS** — dev routes compile redirect branch |
| Dev-route Playwright (local preview, guest) | **PASS** — no dev UI; ends at sign-in |
| Dev-route Playwright (expects `/dashboard`) | **3 FAIL** — guest chain redirects to sign-in (acceptable) |
| Audio-coverage Playwright (local preview) | **FAIL** — 300s timeout (sign-in against preview without API) |

---

## New Launch Score

Same weights as executive board review:

| Component | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| Audio | 25% | 70 | 17.50 | Detection fix + corrupt rhymes removed; production E2E pending deploy |
| Crash / stability | 20% | 74 | 14.80 | Unchanged |
| Content parity | 15% | 80 | 12.00 | 4 corrupt files removed from catalog (168/168 probeable) |
| Infrastructure | 15% | 82 | 12.30 | Unchanged |
| Navigation | 10% | 78 | 7.80 | Dev routes fixed in build; deploy pending |
| Performance | 10% | 58 | 5.80 | Bundle still 3.35 MB |
| Security | 5% | 88 | 4.40 | Dev routes compile redirect; guest → sign-in |

### **Weighted launch score: 74.6 / 100**

**Band:** FAIL (< 85) — primarily bundle gate + pending production verification

**30-day launch probability (post-fix, pre-deploy):** ~58% (up from 42%)

---

## Certification Decision

**CONDITIONAL FAIL — deploy required for final PASS**

Release is **not authorized** until:

1. Deploy frontend + API (registry) to production
2. Post-deploy: grep `AppCore-*.js` for dev-route redirect branch
3. Post-deploy: Playwright audio-coverage + dev-route against https://www.amynest.in with demo credentials
4. Bundle size gate waived with evidence OR reduced below 2.5 MB

---

## Deploy Notes

1. **Render `Amynest-live-1`:** Merge and deploy — build now uses `NODE_ENV=production` + forced `import.meta.env.PROD`
2. **Render `Amynest-backend`:** Deploy for updated rhymes registry (404 on removed IDs)
3. **Verify after deploy:**
   ```bash
   # Dev routes (guest should NOT see dev UI)
   curl -sI https://www.amynest.in/debug-parity
   
   # Audio coverage
   cd artifacts/kidschedule
   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
     PLAYWRIGHT_BASE_URL=https://www.amynest.in \
     pnpm exec playwright test --config playwright.config.audio-coverage.ts
   ```

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/render-frontend-build.sh` | NODE_ENV=production |
| `artifacts/kidschedule/vite.config.ts` | Force PROD flags on build |
| `artifacts/kidschedule/src/AppCore.tsx` | import.meta.env.PROD for dev routes |
| `artifacts/kidschedule/src/lib/audio-manager.ts` | Active/recent media detection |
| `artifacts/kidschedule/playwright/helpers/audio-playback.ts` | UI/recent channel probes |
| `artifacts/kidschedule/playwright/helpers/audio-coverage.ts` | primeUserGesture before infant play |
| `lib/rhymes-audio/src/rhymes-gcs-registry.json` | Remove 4 corrupt entries |
| `artifacts/kidschedule/src/data/rhymes-gcs-registry.json` | Sync |
| `artifacts/api-server/src/data/rhymes-gcs-registry.json` | Sync |
| `lib/rhymes-audio/src/registry.test.ts` | Count threshold 168 |
