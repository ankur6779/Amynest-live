# GCS Certification — Final Board Audit

**Validated:** 2026-06-12T07:46:00Z  
**Production:** https://www.amynest.in  
**Bucket:** `gs://amynest-audio-storage`  
**Verdict:** **FAIL**

## Story Hub

| Check | Count | Evidence |
|-------|-------|----------|
| GCS objects (`story-hub/*`) | 224 | `pnpm --filter @workspace/scripts run map:story-hub-gcs` |
| Valid drive-id filenames | 224 | script output |
| DB rows mapped | 224 | `Already correct: 224` |
| GCS without DB row | 0 | |
| DB active without GCS | 0 | |
| DB `gcs_url` null | 0 | |

**Live sample:** `GET /api/stories/stream/1VBU1iWLKZrCxinctWY1QRoZRJRpMX0xB` → HTTP 200, `video/mp4`, 22,442,722 bytes.

## Phonics

| Check | Result |
|-------|--------|
| Manifest assets | 1393 |
| Manifest gaps | 0 |
| **Live GCS verification** | **SKIPPED** (audit script) |
| **Runtime playback (production E2E)** | **FAIL** — no audio element on `/phonics` |

**Verdict:** INCOMPLETE — referenced assets not live-verified at GCS layer.

## Rhymes

| Check | Count |
|-------|-------|
| Registry entries | 172 |
| ffprobe probe OK | 168 |
| Failed | 4 |

**Failed entries (ffprobe on signed URL):**

1. `Rhymes/Beneath the Moss Blanket.mp3`
2. `Rhymes/Beyond the Rainbow.mp3`
3. `Rhymes/Little Star, Shine Bright.mp3`
4. `Rhymes/London Bridge (Piano Version).mp3`

Public GCS HEAD (unsigned) returns HTTP 403 for all four — bucket is private (expected). Failures indicate probe could not confirm playable duration; treated as **missing verification**, not confirmed present.

**Coverage:** 168/172 = **97.67%** (< 99.5% gate).

## Discovery Worlds

| Check | Result |
|-------|--------|
| Visual assets required | 795 |
| Present (local + GCS) | 795 |
| Missing | 0 |
| Coverage | **100%** |

Worlds: Animal World 312/312, Vehicles 123/123, Nature 120/120, Home 120/120, Instruments 120/120.

## Spelling Audio

| Check | Result |
|-------|--------|
| Catalog/manifest entries | 2645 |
| Manifest validation | PASS (CI) |
| Live GCS/HTTP probe | **NOT RUN** |

## Static Audio (API proxy)

Live HEAD/GET probe of all 4434 unique `/api/static-audio/*.mp3` URLs:

- **4434/4434 HTTP 200** on re-verification
- 1 transient `fetch failed` during concurrent bulk probe (re-verified OK)

## Referenced Asset Missing

| Asset class | Status |
|-------------|--------|
| Story hub videos | PASS (224/224) |
| Discovery visuals | PASS (795/795) |
| Static audio map | PASS (4434/4434 live) |
| Rhymes (4 entries) | **FAIL** — unverified/unplayable in audit |
| Phonics GCS | **FAIL** — verification skipped |
| Spelling GCS | **FAIL** — live probe missing |

## Commands Run

```bash
pnpm --filter @workspace/scripts run map:story-hub-gcs
pnpm --filter @workspace/scripts run map:story-hub-gcs -- --report
pnpm run phonics:audio:audit
pnpm run audit:rhymes-gcs-audio
pnpm run report:discovery-worlds-assets
node audit/final-cert/probe-static-audio-live.mjs
```

## Board Decision

**FAIL** — Rhymes below 99.5%, phonics/spelling lack live GCS proof, phonics runtime playback broken on production demo account traversal.
