# CONTENT + MEDIA HANDOVER

**Date:** 24 September 2026  
Do **not** claim copyright in media unless evidenced. Code presence ≠ owned artwork.

| Category | Where it lives | Provenance | Transfer | Buyer acceptance test | Status |
|----------|----------------|------------|----------|----------------------|--------|
| Source / prompts / AI instructions | Git (`lib/`, `content-engine/`, API) | Title **UNKNOWN** (same as source) | Assignment + repo | Buyer repo contains `content-engine/` and prompt files | Title **UNKNOWN** |
| Content scripts / seeds | `content-engine/golden-scripts/`, brand files | Repo **VERIFIED** | With git | Scripts present | Title **UNKNOWN** |
| Content “database” | Postgres tables + GCS catalogs | Mixed | DB dump + GCS | Scratch restore shows catalog rows | Host **UNKNOWN** |
| Worksheets | `lib/worksheet-studio` + generated outputs | Generator **VERIFIED**; template/art license **UNKNOWN** | Assignment + review | Generate one worksheet on buyer stack | Template title **UNKNOWN** |
| Coloring books | Routes + `coloring_downloads` + assets | Feature **VERIFIED**; art **UNKNOWN** | Code + media | Open coloring route; files 200 | Art **UNKNOWN** |
| Curiosity books | Hub module / GCS | Surface **VERIFIED** in code | GCS + code | Open module; objects resolve | Objects **UNKNOWN** |
| Stories | Code + possible GCS | **INFERRED** product surface | GCS + code | Story playback | **UNKNOWN** objects |
| Videos / reels catalog | GCS path referenced (`REELS_CATALOG_V1_GCS_PATH`) | Code **VERIFIED**; objects **UNKNOWN** | GCS copy/IAM | Healthz / catalog probe | **UNKNOWN** |
| Audio / TTS cache | GCS `amynest-audio-storage` + Postgres fallback | Bucket name **VERIFIED**; object inventory **UNKNOWN** | GCP IAM or copy | `/api/healthz/audio` PASS on buyer keys | **UNKNOWN** inventory |
| Static / phonics audio | GCS URLs in tests (`storage.googleapis.com/amynest-audio-storage/…`) | Path **VERIFIED** | Same bucket | Known mp3 200 | **UNKNOWN** full set |
| Illustrations | `artifacts/kidschedule/public/` + GCS | Mixed; stock/generated **UNKNOWN** | Git + GCS | Spot-check public paths | Per-file **UNKNOWN** |
| Game assets | Repo math-playground / games | Code **VERIFIED** | Git | Play one mini-game | Media **UNKNOWN** |
| Health Lab | Repo static (e.g. `health-lab-audio/crystal-garden-dance.mp3`) + API | Some files **VERIFIED** | Git + API | File 200 + route | Remainder **UNKNOWN** |
| Astronomy / Birth Sky | Repo + encrypted DB fields | Code **VERIFIED** | Git + `BIRTH_SKY_FIELD_ENCRYPTION_KEY` escrow | Decrypt/read one field on scratch DB | Key **NOT ESCROWED** |
| Generated media (KIE / YouTube pipeline) | Content-engine; secrets `KIE_API_KEY`, `YOUTUBE_*` | Pipeline **VERIFIED** as config; live use **UNKNOWN** | New keys + GCS | Optional; not required for core app if unused | **UNKNOWN** if production-critical |
| Third-party hosted | Open-Meteo weather (no key); store/CDN | **VERIFIED** Open-Meteo in routine generate | None (public API) | Weather detect still works | N/A |

**Acceptance:** Buyer can serve authenticated TTS/static audio and hub media **without** founder GCS JSON.
**OPEN — OWNER ACTION REQUIRED**
