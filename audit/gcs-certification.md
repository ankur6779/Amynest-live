# GCS Certification — Live Audit 2026-06-12

**Verdict: FAIL** (referenced assets with playability gaps; dev surface exposure compounds risk)

## Methodology

- Ran `pnpm run map:story-hub-gcs -- --report` with live GCS credentials (2026-06-12T09:16Z)
- Cross-checked rhymes corpus from `lib/rhymes-audio/audit/rhymes-gcs-audio-audit.json` (172 files, live ffprobe run earlier today)
- Discovery Worlds coverage manifest re-read (not re-probed live — **gap**)
- Production API proxy probes for rhymes (unauthenticated → 401, expected)

## Story Hub (GCS `story-hub/`)

| Metric | Value |
|--------|-------|
| GCS objects listed | **224** |
| Valid drive-id pattern | **224 / 224** |
| Missing from bucket | **0** (sample: full listing) |
| Live playback (Parent Hub Story) | **PASS** — `/api/stories/stream/1VBU1iWLKZrCxinctWY1QRoZRJRpMX0xB` plays in Playwright |

## Rhymes (`Rhymes/*.mp3`)

| Metric | Value |
|--------|-------|
| Registry file count | **172** |
| ffprobe OK | **168** |
| ffprobe FAIL (corrupt/unplayable suspect) | **4** |

### Known failures (objects exist in GCS with bytes, ffprobe cannot parse streams)

| ID | Title | Size (bytes) | Issue |
|----|-------|--------------|-------|
| beneath-the-moss-blanket | Beneath the Moss Blanket | 137,958 | ffprobe stream parse failure |
| beyond-the-rainbow | Beyond the Rainbow | 87,096 | ffprobe stream parse failure |
| little-star-shine-bright | Little Star, Shine Bright | 140,399 | ffprobe stream parse failure |
| london-bridge-piano-version | London Bridge (Piano Version) | 100,652 | ffprobe stream parse failure |

**Impact:** ~2.3% of rhymes corpus may be unplayable on device. Users hitting these titles get silent/broken playback.

## Discovery Worlds

Manifest `discovery-worlds-coverage.json` claims 795/795 assets (100%). **Not independently live-probed in this audit** — treated as unverified; prior manifest not trusted per board rules.

## Infant Sleep Audio

34/34 manifest paths return HTTP 200 on production CDN (`/infant-sleep-audio/...`).  
**However:** Playwright infant story/poem playback **FAIL** (no audio element) — likely child-profile gating or UI regression, not missing static files.

## Static Audio (`/api/static-audio/`)

4468 unique manifest URLs probed; 4466 passed on first pass (2 HEAD timeouts).  
Retry of timeout URLs returned HTTP 200 — indicates **latency/reliability** concern, not hard 404.

## Orphans / Stale

- Story-hub report shows no title-named orphan pattern in listing (224 drive-id objects)
- Phonics/content-bank maps not separately bucket-probed (URLs resolve via API static-audio)

## Certification Decision

**FAIL** — 4 rhymes with unplayable/corrupt evidence + infant playback UI failures + discovery worlds not live-verified.

## Evidence Files

- `audit/audio-cert-final.json`
- `lib/rhymes-audio/audit/rhymes-gcs-audio-audit-summary.json`
- `artifacts/kidschedule/playwright/audio-coverage-artifacts/report.json`
- `audit/screenshots/final-cert/` (failure screenshots)
