# Deploy verify loop

- **Commit pushed:** `04fcb1f9` (main)
- **Push:** https://github.com/ankur6779/Amynest-live/commit/04fcb1f9
- **Render static site:** Amynest-live-1 (`autoDeployTrigger: off` in render.yaml — manual deploy may be required)

## Attempt 1 — 2026-06-12T11:31:56Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Attempt 2 — 2026-06-12T11:33:57Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Attempt 3 — 2026-06-12T11:35:59Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Attempt 4 — 2026-06-12T11:38:01Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Attempt 5 — 2026-06-12T11:40:02Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Attempt 6 — 2026-06-12T11:42:04Z
- deploy meta: `2026-06-12-04fcb1f` (html meta: `2026-06-12-04fcb1f`)
- AppCore hash: `n/a` (baseline old: `Cdu12y8L`)
- DevRouteRedirect in bundle: 0
- **Result:** WAIT — production still on pre-fix bundle

## Summary
- Deploy not live after 6 polls (~12 min).
- **User action:** Render Dashboard → **Amynest-live-1** → Manual Deploy (latest `main` @ 04fcb1f9).
- Optional: deploy **Amynest-backend** for API rhyme registry 168.

## Attempt 7 — 2026-06-12T11:46:00Z (post-rollout verification)
- deploy meta: `2026-06-12-04fcb1f`
- AppCore hash: `Dh4PtQbE` (was `Cdu12y8L`)
- index entry: `index-CsvyOEjd.js` → `main-BOStTMs9.js`
- **CHECK1 (guest dev routes):** PASS — `/debug-parity`, `/dev/phonics-audio-preview`, `/dev/rhymes-audio-ab` → `/sign-in`, no dev UI (`AppCore-Dh4PtQbE.js`)
- **CHECK2 (phonics playback, demo@):** FAIL — `no_audio_element` (see `audit/phonics-probe-result.json`)
- **CHECK3 (infant playback):** FAIL — `sleepModuleVisible: false` in `audit/deployment-cert-probe.json`
- **CHECK4 (rhyme catalog 168):** PASS (heuristic) — `168` occurrences in live `AppCore-Dh4PtQbE.js` bundle; committed registry `count: 168`
- **CHECK5 (DevRouteRedirect in bundle):** PASS (functional) — prod routes use redirect component `tc`; symbol name minified (string count 0)

## Final certification
- **Overall:** FAIL (audio checks 2–3; strict Playwright dev-route spec expects `/dashboard` not `/sign-in`)
- **Deploy:** Live on static site after rollout; `autoDeployTrigger: off` — confirm deploy finished in Render Dashboard for **Amynest-live-1** @ `04fcb1f9`
- **Backend:** Deploy **Amynest-backend** separately if API registry must serve 168 (`autoDeployTrigger: off`)
