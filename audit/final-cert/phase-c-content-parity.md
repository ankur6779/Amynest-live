# Phase C — Content vs Asset Parity

**Validated:** 2026-06-12T07:46:00Z

## Static / Speakable Corpus

| Metric | Count | Evidence |
|--------|-------|----------|
| Speakable phrase corpus entries | 4,278 | `speakable-phrase-corpus.json` |
| Static audio map phrase keys | 4,434 | `static-audio-map.json` (includes phonics keys) |
| Corpus phrases missing from map | **0** | `report:static-audio-corpus` |
| Unique playback URLs in map | 4,434 | node enumeration |
| Live HTTP 200 (production) | **4,434/4,434** | `probe-static-audio-live.mjs` |

## Phonics

| Metric | Count |
|--------|-------|
| Phonics audio assets (manifest) | 1,393 |
| Missing from manifest | 0 |
| Live GCS verified | **0 (skipped)** |
| Runtime playback verified | **FAIL** |

## Spelling

| Metric | Count |
|--------|-------|
| Catalog entries | 2,645 |
| Manifest entries | 2,645 |
| Manifest/catalog mismatch | 0 |
| Live HTTP verified | **0 (not run)** |

## Rhymes

| Metric | Count |
|--------|-------|
| Registry entries | 172 |
| GCS probe OK | 168 |
| Failed/unverified | **4** |

## Story Hub (video)

| Metric | Count |
|--------|-------|
| GCS objects | 224 |
| DB rows with matching gcs_url | 224 |
| Orphan GCS | 0 |
| Orphan DB | 0 |

## Discovery Worlds (visual)

| Metric | Count |
|--------|-------|
| Required visual assets | 795 |
| Present | 795 |
| Missing | 0 |

## Infant Sleep Audio Pack

| Metric | Count |
|--------|-------|
| Manifest entries (repo) | 34 |
| Binaries in repo | **Not present** (bundled at build) |
| Production E2E | **FAIL** (infant story/poem — no infant child on demo account) |

## Orphan / Stale Findings

| Item | Severity | Detail |
|------|----------|--------|
| `discovery-world-preview.tsx` | Medium | Route defined in AppCore imports but no `<Route>` path (orphan page) |
| `not-found.tsx` | Low | Imported but catch-all uses `route-failed.tsx` |
| 4 rhymes GCS objects | High | Probe failure — stale or corrupt assets suspected |
| Dev routes in prod bundle | Critical | Debug pages ship in production JS (AppCore chunk lists debug components) |

## Parity Verdict

**FAIL** — Manifest parity looks complete in repo, but live verification gaps (rhymes 4, phonics runtime, spelling/infant sleep not HTTP-probed, infant E2E blocked) prevent certification.
