# CONTENT MIGRATION MANIFEST

**Date:** 24 September 2026  
**Manifest only. No download or migration of production objects. No copyright claimed.**

| Source / category | Typical location | Classification | Transfer later | Notes |
|-------------------|------------------|----------------|----------------|-------|
| App source / prompts | `lib/`, `content-engine/`, API | **REPOSITORY** | Git assignment | Title UNKNOWN |
| Golden scripts / seeds | `content-engine/golden-scripts/` | **REPOSITORY** | Git | |
| Worksheets generator | `lib/worksheet-studio` | **REPOSITORY** | Git | Template license UNKNOWN |
| Coloring feature | `coloring-books.tsx`, `routes/coloring.ts` | **REPOSITORY** + possible **GCS** | Git + bucket | Art UNKNOWN |
| Curiosity / stories / hub | kidschedule routes + `map:story-hub-gcs` script | **REPOSITORY** + **GCS** | Bucket IAM | Objects not inventoried |
| Illustrations | `artifacts/kidschedule/public/` | **REPOSITORY** (some) | Git | Per-file provenance UNKNOWN |
| Health Lab static | e.g. `public/health-lab-audio/*.mp3` | **REPOSITORY** (some) | Git | Prod 200 historically for one file |
| Astronomy / Birth Sky | Feature code + encrypted DB | **REPOSITORY** + **UNKNOWN** DB | Git + key escrow | |
| Game assets | math-playground / games | **REPOSITORY** | Git | |
| Static / phonics / rhymes audio | `storage.googleapis.com/amynest-audio-storage/…` | **GCS** | Project IAM | Bucket name VERIFIED |
| TTS cache | GCS when `TTS_USE_GCS=true` | **GCS** | Same | |
| Reels / video catalog | GCS path in API health | **GCS** | Same | |
| Generated factory media | KIE / Veo / YouTube scripts | **GCS** and/or **THIRD PARTY** | New keys + bucket | Live use UNKNOWN |
| Open-Meteo weather | Client fetch | **THIRD PARTY** | None | No media store |
| Store / Firebase CDNs | Vendor | **THIRD PARTY** | Accounts | |
| Unreferenced prod objects | — | **UNKNOWN** | Inventory required | Owner `gsutil ls` |

Buyer acceptance later: authenticated audio + hub media 200 on **buyer** GCS SA. **Not done.**
