# Art & Craft Reels — Production Architecture (Phase 1 baseline)

**Status:** Frozen production baseline (1,312 reels, ~6 GiB). No Phase 2/3 catalog expansion.

## Data flow

```
User (Web / iOS / Android)
  → GET /api/reels/videos          (Render — catalog JSON only)
  → GET /api/reels/stream/{id}     (Cloudflare Worker — video bytes)
       → GCS private bucket (amynest-audio-storage)
            reels-hub/phase1/{id}.mp4
```

Render **never** streams reel video bytes in production (`REELS_GCS_ORIGIN=1` → HTTP 410 on `/api/reels/stream/*`).

Google Drive is **not** used for Art & Craft reel catalog, playback, sync, or thumbnails.

## Source of truth

| Asset | Location |
|-------|----------|
| Catalog | `gs://amynest-audio-storage/reels-hub/phase1/catalog.v1.json` |
| Videos | `gs://amynest-audio-storage/reels-hub/phase1/artcraft-*.mp4` |
| Local snapshot | `content-bank/reels/phase1/catalog.v1.json` |

**Catalog size:** 1,312 active entries.

## Environment flags

| Service | Variable | Production value |
|---------|----------|------------------|
| Render | `REELS_GCS_ORIGIN` | `1` |
| Render | `REELS_CATALOG_GCS_PATH` | `reels-hub/phase1/catalog.v1.json` |
| Cloudflare Worker | `REELS_GCS_ORIGIN` | `1` |
| Cloudflare Worker | `REELS_CATALOG_GCS_PATH` | `reels-hub/phase1/catalog.v1.json` |
| Cloudflare Worker | `GCS_SERVICE_ACCOUNT_JSON` | Secret (storage.objects.get) |

## Health check

`GET /api/healthz/reels-catalog` — lightweight probe (no full-bucket scan):

- Catalog object exists and parses
- Entry count and schema sanity (duplicate IDs, invalid object keys)
- Sample validation: 5 catalog entries verified in GCS

## Operations scripts

```bash
# Regenerate catalog from GCS phase1 objects (dry-run)
pnpm run generate:reels-catalog -- --dry-run

# Upload catalog + certify all objects (offline ops — not used by health endpoint)
pnpm run generate:reels-catalog -- --certify

# Production stream certification (100 random samples)
pnpm run verify:reels-phase2b
```

## Rollback

To route streams through Render temporarily (not recommended):

1. Set `REELS_GCS_ORIGIN=0` on Worker and redeploy
2. Set `REELS_GCS_ORIGIN=0` on Render

Production baseline requires both flags at `1`.

## Out of scope (frozen)

- `catalog.v2.json` / multi-phase merge
- Phase 2/3 GCS uploads
- Drive mirror cron
- Drive thumbnail grid posters (UI uses neutral placeholder until poster CDN is added)
