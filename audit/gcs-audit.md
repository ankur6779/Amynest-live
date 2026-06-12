# Phase 5 — GCS Audit

**Generated:** 2026-06-11T18:45:00Z  
**Default bucket:** `amynest-audio-storage`  
**Resolver:** `scripts/lib/gcs-storage.ts`

---

## Infrastructure Status (Production)

| Probe | Result | Evidence |
|-------|--------|----------|
| `/api/healthz/audio` staticAudio.gcsProbeOk | **true** | curl 2026-06-11 |
| `/api/static-audio/health` | **ok: true** | curl 2026-06-11 |
| Bucket configured | **true** | healthz response |
| Server circuit open | **false** | healthz response |

---

## Prefix Inventory

| GCS Prefix | System | Manifest | Last Audit |
|------------|--------|----------|------------|
| `static-audio/{md5}.mp3` | Global Amy TTS | static-audio-map.json (4171+144) | check:static-audio 2026-06-11 |
| `phonics/{type}/{id}.mp3` | Phonics library | phonics-audio-map.json (1393) | check:phonics-release-gate PASS |
| `spelling/v2/{word}.mp3` | Spelling | spelling-audio-manifest.json | prebuild gate |
| `Rhymes/{title}.mp3` | Lullabies | rhymes-gcs-registry.json | 2026-06-09 audit |
| `story-hub/{driveFileId}.mp4` | Story mirror | DB + map-story-hub-gcs.ts | healthz: 3 videos |
| `content-bank/**` | Learning shards | content-bank/manifest.json | upload script |
| `animal-world/**` | Animal world | audio-manifest.json | discovery coverage 100% |
| `worlds/{world}/**` | Discovery worlds | per-world manifests | discovery-worlds-coverage.json |

---

## Verified Coverage Reports

### Discovery Worlds (2026-06-03)

Source: `artifacts/kidschedule/public/discovery-worlds-coverage.json`

| Metric | Value |
|--------|-------|
| Total assets | 795 |
| Present (GCS) | 795 |
| Missing | 0 |
| Coverage | **100%** |

### Rhymes/Lullabies (2026-06-09)

Source: `lib/rhymes-audio/audit/rhymes-gcs-audio-audit.json`

| Metric | Value |
|--------|-------|
| Files in registry | 172 |
| Probed OK | 168 |
| Failed | **4** |
| Total size | 724.6 MB |
| Avg bitrate | 320 kbps |

#### Failed assets (ffprobe errors)

1. `Rhymes/Beneath the Moss Blanket.mp3`
2. `Rhymes/Beyond the Rainbow.mp3`
3. `Rhymes/Little Star, Shine Bright.mp3`
4. `Rhymes/London Bridge (Piano Version).mp3`

### Static Audio

| Metric | Value |
|--------|-------|
| Mapped entries | 4,315 (4171 default + 144 phonics) |
| Corpus phrases | 4,159 |
| **Pending pre-gen** | **119** |
| Direct GCS client playback | **None** (API proxy only — verified) |

### Phonics

| Metric | Value |
|--------|-------|
| assetCount | 1,393 |
| Release gate | PASS |
| Public API probe `/api/phonics/sound/a.mp3` | HTTP 200 |

---

## Checks Not Fully Executed (Credential Limitation)

Full live GCS enumeration of all prefixes was **not re-run** in this audit session (requires `GOOGLE_APPLICATION_CREDENTIALS`). Findings rely on:

- Committed audit artifacts (rhymes, discovery worlds)
- Production health probes
- CI/prebuild gates

**Certification caveat:** GCS audit is **partial** — stale uploads, orphan objects, and checksum mismatches outside audited prefixes are **unverified**.

---

## MIME / Cache / Public Access

| Route | Access pattern |
|-------|----------------|
| `/api/static-audio/:hash.mp3` | Signed/proxied via API; Cloudflare edge cache |
| `/api/phonics-library/*` | Library proxy |
| `/api/worlds-library/*` | Library proxy |
| Raw `storage.googleapis.com` URLs | Avoided on client (by design) |

Cloudflare worker: `infra/cloudflare/amynest-api-proxy/` caches immutable audio at edge.

---

## Duplicate / Orphan Risk

| Risk | Status |
|------|--------|
| Rhymes at 320kbps (oversized) | 172 files; reencode report exists |
| TTS orphan cleanup cron | Scheduled Sundays (`ttsOrphanCleanupCron.ts`) |
| Manifest mismatch (static) | 119 corpus phrases ahead of map |
| Orphan uploads | **Not scanned live** |

---

## GCS Audit Score Contribution

**Infrastructure Score component: 88/100**

Deductions for: 4 failed rhyme probes, 119 static gaps, unverified full-bucket scan, story-hub mirror incomplete (3 videos).
