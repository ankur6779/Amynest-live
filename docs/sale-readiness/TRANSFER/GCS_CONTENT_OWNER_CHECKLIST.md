# GCS CONTENT OWNER CHECKLIST

**Date:** 24 September 2026  
Do **not** download or migrate the bucket. Do **not** claim copyright or IAM ownership.  
Companion: `CONTENT_MIGRATION_MANIFEST.md`.

## Bucket (name only)

`amynest-audio-storage` — **VERIFIED** as configured default (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`, phonics maps, TTS store).  
Project **INFERRED**: `amynest-836ff`. IAM owner: **UNKNOWN**.

## Classification of known categories

| Category | Class | Repo / config evidence | Legal title |
|----------|-------|------------------------|-------------|
| App source, prompts, seeds | **REPOSITORY ASSET** | `lib/`, `content-engine/golden-scripts/` | **UNKNOWN** |
| Worksheet generator | **REPOSITORY ASSET** | `lib/worksheet-studio` | **UNKNOWN** |
| Coloring feature | **REPOSITORY ASSET** + possible **GCS ASSET** | `coloring-books.tsx`, coloring routes | **UNKNOWN** |
| Curiosity / stories / hub | **REPOSITORY ASSET** + **GCS ASSET** | story-hub GCS map script | **UNKNOWN** |
| Illustrations in `public/` | **REPOSITORY ASSET** | `artifacts/kidschedule/public/` | **UNKNOWN** |
| Health Lab static audio | **REPOSITORY ASSET** (some) | `public/health-lab-audio/` | **UNKNOWN** |
| Astronomy / Birth Sky | **REPOSITORY ASSET** + **UNKNOWN** DB | Feature + encryption key | **UNKNOWN** |
| Phonics / rhymes / static audio | **GCS ASSET** | `storage.googleapis.com/amynest-audio-storage/…` | **UNKNOWN** |
| TTS cache | **GCS ASSET** | `TTS_USE_GCS=true` | **UNKNOWN** |
| Reels / video catalog | **GCS ASSET** | API health paths | **UNKNOWN** |
| Generated factory media | **GCS ASSET** and/or **THIRD-PARTY ASSET** | KIE / YouTube pipeline | **UNKNOWN** |
| Open-Meteo weather | **THIRD-PARTY ASSET** | Client fetch; no store | N/A |
| Unlisted production objects | **UNKNOWN** | Owner `gsutil ls` required | **UNKNOWN** |

## Owner evidence (unchecked)

- [ ] Console screenshot: project + bucket name (no SA JSON).
- [ ] Prefix list only (audio, video, worksheet, coloring, curiosity, stories, illustrations, Health Lab, Astronomy, generated media) — **do not** commit object dumps.
- [ ] Confirm whether coloring / stories objects live in GCS vs repo.
- [ ] Counsel: first-party vs third-party vs generated-media title.

**Status:** bucket **name** known; inventory **not** done; legal title **UNKNOWN**.
